# Agent notes — Chris Smith Technical SEO app

## Stack

- **Frontend:** React 18 (CRA + CRACO), React Router, shadcn/ui, Tailwind
- **Backend:** FastAPI, MongoDB (Motor)
- **Analytics:** Mixpanel (`mixpanel-browser` + optional Python `mixpanel`)

## Mixpanel

| Item | Detail |
|------|--------|
| Client SDK | `mixpanel-browser` |
| Client token | `REACT_APP_MIXPANEL_TOKEN` in `frontend/.env.local` (CRA also reads `.env`) |
| Server token | `MIXPANEL_TOKEN` in `backend/.env.local` (optional, same project) |
| Init | `frontend/src/lib/mixpanel.js` → `initMixpanel()` from `frontend/src/index.js` |
| Server helper | `backend/analytics.py` → `track_event()` |
| Wrapper | Import `track`, `identifyUser`, `resetUser`, `trackPageView`, `MixpanelEvents` from `@/lib/mixpanel` |
| Identity | `identifyUser` after login / validated session; `resetUser` on logout |
| Session | `App.jsx` calls `authAPI.getMe()` on load before trusting localStorage |
| Consent | Australia-only — no consent gate |

### Event catalog

| Event | Where |
|-------|--------|
| `page_view` | `App.jsx` `PageViewTracker` |
| `sign_up_completed` | `Auth.jsx` |
| `sign_in_completed` | `Auth.jsx` |
| `contact_form_submitted` | `LandingPage.jsx` |
| `client_created` / `client_updated` | `Clients.jsx` |
| `project_created` / `project_updated` | `ProjectModal.jsx` |
| `task_created` / `task_status_changed` | `Tasks.jsx` |
| `seo_audit_completed` | `SEOAudit.jsx` + `server.py` (use `$insert_id`) |
| `payment_checkout_started` | `Projects.jsx` + `server.py` |
| `payment_completed` | `Projects.jsx` poll + `server.py` Stripe webhook |

### Conventions

- Names: `snake_case`, object + action (`MixpanelEvents` constants in `mixpanel.js`)
- Always include meaningful IDs (`project_id`, `client_id`, etc.) as properties
- Use `$insert_id` when client and server both track the same action
- Do not send passwords, tokens, or full message bodies

### Auth files

- `frontend/src/App.jsx`, `Auth.jsx`, `lib/api.js`
