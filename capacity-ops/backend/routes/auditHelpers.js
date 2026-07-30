/**
 * Pure helpers for audit submit share links and email delivery status.
 * Kept free of Express / Supabase so unit tests can load them without deps.
 */

/**
 * Public site base URL for emailed share links.
 * Never derive from request Host / X-Forwarded-* — /api/audit/submit is
 * unauthenticated and those headers are attacker-controlled (phishing vector).
 */
function resolvePublicSiteUrl(env = process.env) {
  const configured = String(env.SITE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (configured) return configured;
  return `http://localhost:${env.PORT || 3000}`;
}

function buildShareLink(baseUrl, shareToken) {
  const root = String(baseUrl || '')
    .trim()
    .replace(/\/$/, '');
  return `${root}/audit/share/${shareToken}`;
}

/**
 * Decide whether Resend delivery succeeded.
 * `{ skipped: true }` means credentials missing — must not be reported as sent.
 */
function evaluateEmailDelivery(result) {
  if (!result || result.skipped) {
    return { ok: false, reason: 'not_configured' };
  }
  return { ok: true };
}

module.exports = {
  resolvePublicSiteUrl,
  buildShareLink,
  evaluateEmailDelivery,
};
