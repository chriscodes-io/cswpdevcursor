/**
 * Regression: audit report email must not claim success when delivery failed,
 * and share links must never be built from attacker-controlled Host headers.
 * Run: node --test backend/routes/audit.email-delivery.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolvePublicSiteUrl,
  buildShareLink,
  evaluateEmailDelivery,
} = require('./auditHelpers');

describe('resolvePublicSiteUrl', () => {
  it('uses SITE_URL when configured (strip trailing slash)', () => {
    assert.equal(
      resolvePublicSiteUrl({ SITE_URL: 'https://wpaudit.pro/' }),
      'https://wpaudit.pro'
    );
  });

  it('falls back to localhost — never requires request Host', () => {
    assert.equal(resolvePublicSiteUrl({ PORT: '4000' }), 'http://localhost:4000');
    assert.equal(resolvePublicSiteUrl({}), 'http://localhost:3000');
  });
});

describe('buildShareLink', () => {
  it('builds a stable share path under the public site URL', () => {
    assert.equal(
      buildShareLink('https://wpaudit.pro', 'abc123'),
      'https://wpaudit.pro/audit/share/abc123'
    );
  });
});

describe('evaluateEmailDelivery', () => {
  it('rejects skipped / missing Resend configuration', () => {
    assert.deepEqual(evaluateEmailDelivery({ skipped: true }), {
      ok: false,
      reason: 'not_configured',
    });
    assert.deepEqual(evaluateEmailDelivery(null), {
      ok: false,
      reason: 'not_configured',
    });
    assert.deepEqual(evaluateEmailDelivery(undefined), {
      ok: false,
      reason: 'not_configured',
    });
  });

  it('accepts a successful Resend payload', () => {
    assert.deepEqual(evaluateEmailDelivery({ id: 're_123' }), { ok: true });
  });
});
