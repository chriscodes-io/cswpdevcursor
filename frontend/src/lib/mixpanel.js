/**
 * Mixpanel removed.
 *
 * This module remains as a no-op shim to avoid touching app codepaths that
 * previously imported analytics helpers.
 */

/** Canonical event names — snake_case, object + action (kept for callsites). */
export const MixpanelEvents = {
  PAGE_VIEW: 'page_view',
  SIGN_UP_COMPLETED: 'sign_up_completed',
  SIGN_IN_COMPLETED: 'sign_in_completed',
  CONTACT_FORM_SUBMITTED: 'contact_form_submitted',
  SEO_AUDIT_COMPLETED: 'seo_audit_completed',
  PAYMENT_CHECKOUT_STARTED: 'payment_checkout_started',
  PAYMENT_COMPLETED: 'payment_completed',
  CLIENT_CREATED: 'client_created',
  CLIENT_UPDATED: 'client_updated',
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  TASK_CREATED: 'task_created',
  TASK_STATUS_CHANGED: 'task_status_changed',
};

export function isMixpanelEnabled() {
  return false;
}

export function initMixpanel() {
  // no-op
}

export function track(event, properties = {}) {
  void event;
  void properties;
}

export function identifyUser(user) {
  void user;
}

export function resetUser() {
  // no-op
}

export function trackPageView(path) {
  track(MixpanelEvents.PAGE_VIEW, { path });
}
