/**
 * Regression: GET /api/audit/:id returns lead email and must require dashboard auth.
 * Run: node --test backend/middleware/dashboardAuth.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { requireDashboardAuth } = require('./dashboardAuth');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('requireDashboardAuth', () => {
  it('returns 503 when DASHBOARD_API_KEY is unset', () => {
    const prev = process.env.DASHBOARD_API_KEY;
    delete process.env.DASHBOARD_API_KEY;
    const res = mockRes();
    let nextCalled = false;
    requireDashboardAuth({ headers: {} }, res, () => {
      nextCalled = true;
    });
    assert.equal(res.statusCode, 503);
    assert.equal(nextCalled, false);
    if (prev === undefined) delete process.env.DASHBOARD_API_KEY;
    else process.env.DASHBOARD_API_KEY = prev;
  });

  it('returns 401 for missing/wrong token', () => {
    const prev = process.env.DASHBOARD_API_KEY;
    process.env.DASHBOARD_API_KEY = 'secret-key';
    const res = mockRes();
    requireDashboardAuth({ headers: {} }, res, () => {});
    assert.equal(res.statusCode, 401);

    const res2 = mockRes();
    requireDashboardAuth({ headers: { authorization: 'Bearer wrong' } }, res2, () => {});
    assert.equal(res2.statusCode, 401);

    if (prev === undefined) delete process.env.DASHBOARD_API_KEY;
    else process.env.DASHBOARD_API_KEY = prev;
  });

  it('calls next for Bearer or x-api-key match', () => {
    const prev = process.env.DASHBOARD_API_KEY;
    process.env.DASHBOARD_API_KEY = 'secret-key';

    let next1 = false;
    requireDashboardAuth(
      { headers: { authorization: 'Bearer secret-key' } },
      mockRes(),
      () => {
        next1 = true;
      }
    );
    assert.equal(next1, true);

    let next2 = false;
    requireDashboardAuth(
      { headers: { 'x-api-key': 'secret-key' } },
      mockRes(),
      () => {
        next2 = true;
      }
    );
    assert.equal(next2, true);

    if (prev === undefined) delete process.env.DASHBOARD_API_KEY;
    else process.env.DASHBOARD_API_KEY = prev;
  });
});
