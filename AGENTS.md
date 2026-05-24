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

## One CLI (`one`)

Use the **One CLI** for third-party platform APIs (Gmail, Slack, Shopify, HubSpot, **Stripe**, GitHub, Notion, Salesforce, etc.) — 250+ integrations via one interface. Read skill: `one` (`~/.agents/skills/one/SKILL.md`).

| When | Use One |
|------|---------|
| Send email, post to Slack, Stripe/Shopify/HubSpot calls, GitHub issues, etc. | `one` skill — **not** ad-hoc curl unless One cannot do it |
| List connected platforms | `one list` (with `--agent` for JSON) |
| Discover platform actions | `one search` → `one knowledge` → `one execute` |
| New connection / login | `one add <platform>` or `one login` (user-driven setup) |

**Conventions:** Always pass `--agent` after `one` for structured JSON. Do not use One for `one init` / MCP install unless the user is setting up One itself.

**This repo:** Stripe payments in-app use the existing FastAPI `stripe_service` + webhooks; use **One** when the agent needs to call Stripe (or other services) from the shell on Chris’s connected accounts (e.g. ops, debugging, one-off API tasks).

## Lead qualification agent (Pica)

`lead-qualification-agent/` — Gmail (`Leads` label) → OpenAI score → HubSpot contact → Slack `#sales-leads`. Uses **Pica** passthrough (`PICA_SECRET` + `GMAIL_CONNECTION_KEY`, `HUBSPOT_CONNECTION_KEY`, `SLACK_CONNECTION_KEY`). Run: `cd lead-qualification-agent && npm run qualify` (or `qualify:dry`). See `lead-qualification-agent/README.md`. For new Pica tools, follow `.cursor/rules/buildkit.mdc`.
