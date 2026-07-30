const express = require('express');
const { getSupabase, isConfigured } = require('../services/supabase');
const { requireDashboardAuth } = require('../middleware/dashboardAuth');

const router = express.Router();

router.get('/', requireDashboardAuth, async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('leads')
      .select(
        `
        id, email, website_url, project_name, status, created_at, last_contacted,
        audits (
          id, overall_score, performance, seo, security, technical, accessibility,
          share_token, created_at
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return res.json({ leads: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireDashboardAuth, async (req, res) => {
  try {
    const { status, last_contacted, project_name } = req.body || {};
    const updates = {};
    if (status) updates.status = status;
    if (last_contacted !== undefined) updates.last_contacted = last_contacted;
    if (project_name !== undefined) updates.project_name = project_name;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
