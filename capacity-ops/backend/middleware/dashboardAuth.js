/**
 * Shared bearer/API-key gate for capacity-ops dashboard endpoints.
 */
function requireDashboardAuth(req, res, next) {
  const expected = process.env.DASHBOARD_API_KEY;
  if (!expected) {
    return res.status(503).json({ error: 'DASHBOARD_API_KEY not configured' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.headers['x-api-key'];
  if (token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

module.exports = { requireDashboardAuth };
