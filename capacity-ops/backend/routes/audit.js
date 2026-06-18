const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { runAudit } = require('../services/auditEngine');
const { getSupabase, isConfigured: dbConfigured } = require('../services/supabase');
const { generatePdfBuffer, renderTemplate } = require('../services/pdf');
const { sendAuditReportEmail } = require('../services/email');

const router = express.Router();

function siteUrl(req) {
  return (
    process.env.SITE_URL ||
    (req.headers['x-forwarded-proto'] && req.headers.host
      ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
      : `http://localhost:${process.env.PORT || 3000}`)
  );
}

function shareLink(req, shareToken) {
  return `${siteUrl(req)}/audit/share/${shareToken}`;
}

router.post('/submit', async (req, res) => {
  try {
    const { url, email, projectName } = req.body || {};
    if (!url?.trim() || !email?.trim()) {
      return res.status(400).json({ success: false, error: 'url and email are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'invalid email' });
    }

    const auditResult = await runAudit(url);

    if (!dbConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.',
      });
    }

    const supabase = getSupabase();
    const shareToken = uuidv4().replace(/-/g, '').slice(0, 24);

    const { data: auditRow, error: auditErr } = await supabase
      .from('audits')
      .insert({
        website_url: auditResult.url,
        overall_score: auditResult.overall_score,
        performance: auditResult.performance,
        seo: auditResult.seo,
        security: auditResult.security,
        technical: auditResult.technical,
        accessibility: auditResult.accessibility,
        issues_json: auditResult.issues_json,
        share_token: shareToken,
      })
      .select()
      .single();

    if (auditErr) throw auditErr;

    const { data: leadRow, error: leadErr } = await supabase
      .from('leads')
      .upsert(
        {
          email: email.trim().toLowerCase(),
          website_url: auditResult.url,
          audit_id: auditRow.id,
          project_name: projectName || null,
          status: 'new',
        },
        { onConflict: 'email,website_url' }
      )
      .select()
      .single();

    if (leadErr) throw leadErr;

    const link = shareLink(req, shareToken);
    let pdfBuffer = null;
    try {
      pdfBuffer = await generatePdfBuffer({ ...auditRow, website_url: auditResult.url });
    } catch (pdfErr) {
      console.warn('[pdf] generation failed:', pdfErr.message);
    }

    try {
      await sendAuditReportEmail({
        to: email.trim(),
        url: auditResult.url,
        overallScore: auditResult.overall_score,
        shareLink: link,
        pdfBuffer,
      });
    } catch (mailErr) {
      console.error('[email] send failed:', mailErr.message);
    }

    return res.json({
      success: true,
      auditId: auditRow.id,
      shareLink: link,
      shareToken,
      scores: {
        overall: auditResult.overall_score,
        performance: auditResult.performance,
        seo: auditResult.seo,
        security: auditResult.security,
        technical: auditResult.technical,
        accessibility: auditResult.accessibility,
      },
    });
  } catch (err) {
    console.error('[audit/submit]', err);
    return res.status(500).json({ success: false, error: err.message || 'Audit failed' });
  }
});

router.get('/:auditId', async (req, res) => {
  try {
    if (!dbConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('audits')
      .select('*, leads(email, project_name, status)')
      .eq('id', req.params.auditId)
      .single();
    if (error) return res.status(404).json({ error: 'Audit not found' });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/share/:shareToken', async (req, res) => {
  try {
    if (!dbConfigured()) {
      return res.status(503).send('Database not configured');
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('audits')
      .select('*')
      .eq('share_token', req.params.shareToken)
      .single();
    if (error || !data) return res.status(404).send('Audit not found');

    const html = renderTemplate(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

module.exports = router;
