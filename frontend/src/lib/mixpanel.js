import mixpanel from 'mixpanel-browser';

const TOKEN = process.env.REACT_APP_MIXPANEL_TOKEN;
let initialized = false;

/** Canonical event names — snake_case, object + action */
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
  return Boolean(TOKEN);
}

export function initMixpanel() {
  if (!TOKEN || initialized) {
    return;
  }

  mixpanel.init(TOKEN, {
    debug: process.env.NODE_ENV !== 'production',
    persistence: 'localStorage',
    track_pageview: false,
  });
  mixpanel.register({ platform: 'web' });
  initialized = true;
}

export function track(event, properties = {}) {
  if (!TOKEN || !initialized) {
    return;
  }
  mixpanel.track(event, { platform: 'web', ...properties });
}

export function identifyUser(user) {
  if (!TOKEN || !initialized || !user?.id) {
    return;
  }

  mixpanel.identify(user.id);

  const profile = {};
  if (user.name) profile.$name = user.name;
  if (user.email) profile.$email = user.email;
  if (Object.keys(profile).length > 0) {
    mixpanel.people.set(profile);
  }
}

export function resetUser() {
  if (!TOKEN || !initialized) {
    return;
  }
  mixpanel.reset();
}

export function trackPageView(path) {
  track(MixpanelEvents.PAGE_VIEW, { path });
}
