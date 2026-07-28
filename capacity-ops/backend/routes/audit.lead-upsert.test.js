/**
 * Regression: re-audit must not wipe CRM lead status / project_name.
 * Run: node --test backend/routes/audit.lead-upsert.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildLeadUpsertPayload } = require('./audit');

describe('buildLeadUpsertPayload', () => {
  it('normalizes email and never includes status (preserve pipeline on conflict)', () => {
    const payload = buildLeadUpsertPayload({
      email: '  Chris@Example.com ',
      websiteUrl: 'https://example.com',
      auditId: 'audit-1',
      projectName: 'Acme',
    });

    assert.equal(payload.email, 'chris@example.com');
    assert.equal(payload.website_url, 'https://example.com');
    assert.equal(payload.audit_id, 'audit-1');
    assert.equal(payload.project_name, 'Acme');
    assert.equal('status' in payload, false);
  });

  it('omits project_name when not provided so resubmit cannot null it out', () => {
    const payload = buildLeadUpsertPayload({
      email: 'lead@example.com',
      websiteUrl: 'https://example.com',
      auditId: 'audit-2',
      projectName: null,
    });

    assert.equal('project_name' in payload, false);
    assert.equal('status' in payload, false);
  });

  it('omits empty project_name string', () => {
    const payload = buildLeadUpsertPayload({
      email: 'lead@example.com',
      websiteUrl: 'https://example.com',
      auditId: 'audit-3',
      projectName: '',
    });

    assert.equal('project_name' in payload, false);
  });
});
