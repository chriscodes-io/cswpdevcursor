const path = require('path');
const express = require('express');
const cors = require('cors');
const auditRoutes = require('./routes/audit');
const leadsRoutes = require('./routes/leads');

function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
      resend: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      pagespeed: Boolean(process.env.GOOGLE_PAGESPEED_API_KEY),
    });
  });

  app.use('/api/audit', auditRoutes);
  app.use('/api/leads', leadsRoutes);

  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir));

  app.get('/dashboard', (_req, res) => {
    res.sendFile(path.join(publicDir, 'dashboard.html'));
  });

  return app;
}

module.exports = { createApp };
