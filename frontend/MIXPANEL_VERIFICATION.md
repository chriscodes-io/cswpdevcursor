# Mixpanel verification checklist

## Setup

1. `frontend/.env`: `REACT_APP_MIXPANEL_TOKEN=...`
2. `backend/.env` (optional): `MIXPANEL_TOKEN=...` — same token for server-side events
3. `cd frontend && npm start`
4. Mixpanel → **Live View**

## Events (client)

| Event | How to trigger |
|-------|----------------|
| `page_view` | Navigate any route |
| `sign_up_completed` | Email register or new Google user |
| `sign_in_completed` | Email login or returning Google user |
| `contact_form_submitted` | Landing page contact form |
| `client_created` | Clients → add client |
| `client_updated` | Clients → edit client |
| `project_created` | Projects → new project |
| `project_updated` | Projects → edit project |
| `task_created` | Tasks → new task |
| `task_status_changed` | Tasks → drag card to another column |
| `seo_audit_completed` | SEO Audit → run audit |
| `payment_checkout_started` | Projects → pay (Stripe) |
| `payment_completed` | Return from Stripe after payment |

## Events (server — requires `MIXPANEL_TOKEN`)

| Event | How to trigger |
|-------|----------------|
| `seo_audit_completed` | Run audit (deduped with client via `$insert_id`) |
| `payment_checkout_started` | Start checkout (deduped with client) |
| `payment_completed` | Stripe webhook marks paid (authoritative) |

## Identity

- Log in → profile should show `$email` / `$name`
- Log out → new anonymous `distinct_id` on public pages
