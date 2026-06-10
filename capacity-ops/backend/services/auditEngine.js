const dns = require('dns').promises;
const net = require('net');
const cheerio = require('cheerio');

const PAGESPEED_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

function isBlockedHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return normalized === 'localhost' || normalized.endsWith('.localhost');
}

function isBlockedIpv4(ip) {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version !== 6) return true;

  const normalized = ip.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    return isBlockedIpv4(normalized.replace('::ffff:', ''));
  }
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab][0-9a-f]:/.test(normalized) ||
    normalized.startsWith('ff')
  );
}

function normalizeUrl(input) {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs can be audited');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL credentials are not allowed');
  }
  return parsed.href;
}

async function assertPublicAuditUrl(rawUrl) {
  const href = normalizeUrl(rawUrl);
  const parsed = new URL(href);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

  if (isBlockedHostname(hostname)) {
    throw new Error('Private or internal URLs cannot be audited');
  }

  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error('Private or internal URLs cannot be audited');
    }
    return href;
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedIp(address))) {
    throw new Error('Private or internal URLs cannot be audited');
  }

  return href;
}

async function readResponseText(res, url) {
  const contentLength = Number(res.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
    throw new Error(`Response too large fetching ${url}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    const html = await res.text();
    if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
      throw new Error(`Response too large fetching ${url}`);
    }
    return html;
  }

  const decoder = new TextDecoder();
  let bytes = 0;
  let html = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_HTML_BYTES) {
      throw new Error(`Response too large fetching ${url}`);
    }
    html += decoder.decode(value, { stream: true });
  }
  html += decoder.decode();
  return html;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let currentUrl = await assertPublicAuditUrl(url);
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CapacityOps-Audit/1.0 (+https://chrissmith.dev)' },
        redirect: 'manual',
      });

      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        currentUrl = await assertPublicAuditUrl(new URL(res.headers.get('location'), currentUrl).href);
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${currentUrl}`);
      }
      const html = await readResponseText(res, currentUrl);
      return { html, finalUrl: res.url || currentUrl };
    }
    throw new Error('Too many redirects fetching URL');
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPageSpeed(url, strategy = 'mobile') {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!key) return null;

  const qs = new URLSearchParams({ url, strategy, key });
  ['performance', 'seo', 'accessibility', 'best-practices'].forEach((c) => qs.append('category', c));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`${PAGESPEED_ENDPOINT}?${qs}`, { signal: controller.signal });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function scoreFromPsi(psi) {
  if (!psi?.lighthouseResult?.categories) return null;
  const c = psi.lighthouseResult.categories;
  return {
    performance: Math.round((c.performance?.score ?? 0) * 100),
    seo: Math.round((c.seo?.score ?? 0) * 100),
    accessibility: Math.round((c.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((c['best-practices']?.score ?? 0) * 100),
  };
}

function analyzeHtml(html, url) {
  const $ = cheerio.load(html);
  const issues = { performance: [], seo: [], security: [], technical: [], accessibility: [] };

  const title = $('title').first().text().trim();
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1Count = $('h1').length;
  const imgs = $('img');
  const imgsMissingAlt = imgs.filter((_, el) => !$(el).attr('alt')).length;
  const isHttps = url.startsWith('https://');
  const hasWp = /wp-content|wp-includes|wordpress/i.test(html);
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const canonical = $('link[rel="canonical"]').attr('href');

  let seo = 85;
  if (!title) {
    seo -= 25;
    issues.seo.push({ severity: 'high', title: 'Missing page title', detail: 'Add a unique <title> tag.' });
  } else if (title.length < 30 || title.length > 60) {
    seo -= 8;
    issues.seo.push({ severity: 'medium', title: 'Title length', detail: `Title is ${title.length} characters (aim for 30–60).` });
  }
  if (!metaDesc) {
    seo -= 15;
    issues.seo.push({ severity: 'medium', title: 'Missing meta description', detail: 'Add a meta description for SERP snippets.' });
  }
  if (h1Count === 0) {
    seo -= 12;
    issues.seo.push({ severity: 'high', title: 'No H1 heading', detail: 'Each page should have one primary H1.' });
  } else if (h1Count > 1) {
    seo -= 6;
    issues.seo.push({ severity: 'low', title: 'Multiple H1 tags', detail: `Found ${h1Count} H1 elements.` });
  }
  if (!canonical) {
    seo -= 5;
    issues.technical.push({ severity: 'low', title: 'No canonical URL', detail: 'Consider a canonical link to avoid duplicate content.' });
  }

  let accessibility = 80;
  if (imgs.length && imgsMissingAlt > 0) {
    accessibility -= Math.min(25, imgsMissingAlt * 3);
    issues.accessibility.push({
      severity: imgsMissingAlt > 3 ? 'high' : 'medium',
      title: 'Images missing alt text',
      detail: `${imgsMissingAlt} of ${imgs.length} images lack alt attributes.`,
    });
  }
  if (!hasViewport) {
    accessibility -= 15;
    issues.accessibility.push({ severity: 'high', title: 'Missing viewport meta', detail: 'Required for mobile-friendly rendering.' });
  }

  let security = isHttps ? 88 : 45;
  if (!isHttps) {
    issues.security.push({ severity: 'critical', title: 'Site not served over HTTPS', detail: 'Migrate to HTTPS for security and SEO.' });
  }

  let technical = 82;
  if (hasWp) technical += 3;

  return {
    seo: clamp(seo),
    accessibility: clamp(accessibility),
    security: clamp(security),
    technical: clamp(technical),
    issues,
    meta: { title, metaDesc, h1Count, isHttps, hasWp, canonical },
  };
}

function basicPerformanceScore(html) {
  const kb = Buffer.byteLength(html, 'utf8') / 1024;
  let score = 78;
  if (kb > 500) score -= 15;
  else if (kb > 250) score -= 8;
  return clamp(score);
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function runAudit(rawUrl) {
  const url = await assertPublicAuditUrl(rawUrl);
  const { html, finalUrl } = await fetchHtml(url);
  const htmlAnalysis = analyzeHtml(html, finalUrl);

  let performance = basicPerformanceScore(html);
  let psiScores = null;
  const psi = await fetchPageSpeed(finalUrl);
  if (psi) {
    psiScores = scoreFromPsi(psi);
    if (psiScores?.performance != null) performance = psiScores.performance;
    if (psiScores?.seo != null) htmlAnalysis.seo = Math.round((htmlAnalysis.seo + psiScores.seo) / 2);
    if (psiScores?.accessibility != null) {
      htmlAnalysis.accessibility = Math.round((htmlAnalysis.accessibility + psiScores.accessibility) / 2);
    }
    if (psiScores?.bestPractices != null) {
      htmlAnalysis.security = Math.round((htmlAnalysis.security + psiScores.bestPractices) / 2);
    }
  } else {
    htmlAnalysis.issues.performance.push({
      severity: 'low',
      title: 'PageSpeed API not configured',
      detail: 'Set GOOGLE_PAGESPEED_API_KEY for Lighthouse-based performance scoring.',
    });
  }

  const overall = clamp(
    performance * 0.25 +
      htmlAnalysis.seo * 0.25 +
      htmlAnalysis.security * 0.2 +
      htmlAnalysis.technical * 0.15 +
      htmlAnalysis.accessibility * 0.15
  );

  return {
    url: finalUrl,
    overall_score: overall,
    performance,
    seo: htmlAnalysis.seo,
    security: htmlAnalysis.security,
    technical: htmlAnalysis.technical,
    accessibility: htmlAnalysis.accessibility,
    issues_json: htmlAnalysis.issues,
    meta: htmlAnalysis.meta,
    source: psiScores ? 'pagespeed+html' : 'html-fallback',
  };
}

module.exports = { runAudit, normalizeUrl, assertPublicAuditUrl, fetchHtml };
