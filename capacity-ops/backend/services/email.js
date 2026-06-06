const { Resend } = require('resend');

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function sendAuditReportEmail({ to, url, overallScore, shareLink, pdfBuffer }) {
  if (!isConfigured()) {
    console.warn('[email] Resend not configured — skipping send to', to);
    return { skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL;
  const subject = `Your WordPress Health Report — ${overallScore}/100`;

  const html = `
    <p>Hi,</p>
    <p>Your WordPress health audit for <strong>${escapeHtml(url)}</strong> is ready.</p>
    <p><strong>Overall score: ${overallScore}/100</strong></p>
    <p>Your full PDF report is attached. You can also view results online:</p>
    <p><a href="${shareLink}">${shareLink}</a></p>
    <p>— Chris Smith, Technical SEO</p>
  `;

  const payload = {
    from,
    to: [to],
    subject,
    html,
    attachments: pdfBuffer
      ? [
          {
            filename: 'wordpress-health-report.pdf',
            content: pdfBuffer.toString('base64'),
          },
        ]
      : undefined,
  };

  const { data, error } = await resend.emails.send(payload);
  if (error) throw new Error(error.message || 'Resend send failed');
  return data;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendAuditReportEmail, isConfigured };
