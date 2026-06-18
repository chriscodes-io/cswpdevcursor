const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../templates/audit-report.html');

function renderTemplate(audit) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const issues = audit.issues_json || {};
  const issueSections = ['performance', 'seo', 'security', 'technical', 'accessibility']
    .map((key) => {
      const list = issues[key] || [];
      if (!list.length) return '';
      const items = list
        .map(
          (i) =>
            `<li><strong>${escapeHtml(i.title)}</strong> (${i.severity}) — ${escapeHtml(i.detail || '')}</li>`
        )
        .join('');
      return `<h3>${capitalize(key)}</h3><ul>${items}</ul>`;
    })
    .join('');

  return template
    .replace(/\{\{url\}\}/g, escapeHtml(audit.website_url || audit.url || ''))
    .replace(/\{\{overall_score\}\}/g, String(audit.overall_score ?? 0))
    .replace(/\{\{performance\}\}/g, String(audit.performance ?? 0))
    .replace(/\{\{seo\}\}/g, String(audit.seo ?? 0))
    .replace(/\{\{security\}\}/g, String(audit.security ?? 0))
    .replace(/\{\{technical\}\}/g, String(audit.technical ?? 0))
    .replace(/\{\{accessibility\}\}/g, String(audit.accessibility ?? 0))
    .replace(/\{\{generated_at\}\}/g, new Date().toISOString().slice(0, 10))
    .replace(/\{\{issues_html\}\}/g, issueSections || '<p>No critical issues detected in this scan.</p>');
}

async function generatePdfBuffer(audit) {
  const html = renderTemplate(audit);

  const isNetlify = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
  let browser;

  try {
    if (isNetlify) {
      const chromium = require('@sparticuz/chromium');
      const puppeteer = require('puppeteer-core');
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      try {
        const puppeteer = require('puppeteer-core');
        const executablePath =
          process.env.PUPPETEER_EXECUTABLE_PATH ||
          (process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : undefined);
        if (!executablePath) throw new Error('no chrome');
        browser = await puppeteer.launch({
          executablePath,
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      } catch {
        return null;
      }
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { generatePdfBuffer, renderTemplate };
