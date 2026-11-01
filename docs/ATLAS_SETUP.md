# MongoDB Atlas setup

Production auth, password resets, SEO audits, Stripe records, and Agiled project metadata (`client_id`, `type`) live in MongoDB. CRM contacts and projects are stored in Agiled; MongoDB only holds the app-specific linkage fields Agiled does not return.

## 1. Create an Atlas cluster

1. Sign in at [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. **Create** → **M0 Free** cluster (any region close to your users)
3. **Database Access** → add a database user with a strong password
4. **Network Access** → add your IP (or `0.0.0.0/0` temporarily for Vercel/server deploys, then tighten)
5. **Database** → **Connect** → **Drivers** → copy the `mongodb+srv://...` connection string

## 2. Configure the backend

Copy the template and fill in real values:

```bash
cp backend/.env.local.example backend/.env.local
```

Edit `backend/.env.local`:

```env
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=seo_project_manager

# Production auth — disable file-based fallback
DEV_AUTH_FALLBACK=false

# Generate: python3 -c "import secrets; print(secrets.token_urlsafe(48))"
JWT_SECRET=<long-random-secret>

FRONTEND_URL=https://app.cswp.dev
CORS_ORIGINS=https://app.cswp.dev,https://chrissmithwp.com

# Public self-registration — false for staff-only production
ALLOW_PUBLIC_REGISTRATION=false

# Password reset emails
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@chrissmithwp.com

# Agiled (optional here if already in services/agiled/.env)
AGILED_API_KEY=...
USE_AGILED_CRM=true
```

Keep `backend/.env` for local defaults; **secrets belong in `.env.local`** (gitignored).

## 3. Migrate local dev users (optional)

If you created accounts while `DEV_AUTH_FALLBACK=true`:

```bash
cd /path/to/app
backend/.venv/bin/python scripts/migrate-dev-to-atlas.py --dry-run
backend/.venv/bin/python scripts/migrate-dev-to-atlas.py
```

Then sign in with the same email/password, or use **Forgot password** after Resend is configured.

## 3b. Create staff users (production)

When `ALLOW_PUBLIC_REGISTRATION=false`, create accounts with:

```bash
backend/.venv/bin/python scripts/create-staff-user.py \
  --email you@chrissmithwp.com \
  --name "Chris Smith"
```

Repeat for each team member. Clients use `portal.cswp.dev` (Hub Client), not this app.

## 4. Verify

```bash
curl http://localhost:8001/health
# mongodb: true, dev_auth_fallback: false

curl -X POST http://localhost:8001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"..."}'
```

## 5. Production checklist

- [ ] `DEV_AUTH_FALLBACK=false`
- [ ] `ALLOW_PUBLIC_REGISTRATION=false` (backend)
- [ ] `REACT_APP_ALLOW_SIGNUP=false` (Vercel/Netlify build env for `app.cswp.dev`)
- [ ] `JWT_SECRET` rotated (not the dev default)
- [ ] `FRONTEND_URL=https://app.cswp.dev`
- [ ] `REACT_APP_BACKEND_URL=https://api.cswp.dev`
- [ ] Staff user(s) created via `scripts/create-staff-user.py`
- [ ] Resend configured for password reset emails
- [ ] Atlas IP allowlist includes your host (Railway/Render — use `0.0.0.0/0` with strong DB credentials, or VPC peering for stricter setups)
- [ ] Agiled API key rotated if it was ever exposed
- [ ] Marketing site (`chrissmithwp.com`) links: **Client portal** → `portal.cswp.dev`, **Team login** → `app.cswp.dev/auth`

## 6. Deploy API to Railway (Phase 1)

Recommended host: **Railway** (config in `backend/railway.toml`). Alternative: **Render** (`render.yaml` at repo root).

### 6.1 Railway setup

1. Sign in at [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select this repository.
2. Open the new service → **Settings** → set **Root Directory** to `backend`.
3. **Variables** → paste values from `deploy/api-production.env.example` (use Atlas `MONGO_URL`, strong `JWT_SECRET`, Agiled + Resend keys).
4. **Settings** → **Networking** → **Generate Domain** (temporary `*.up.railway.app` URL).
5. Deploy. When green, open `https://<railway-host>/health` — expect `"mongodb": true`, `"dev_auth_fallback": false`, `"allow_public_registration": false`.
6. **Settings** → **Networking** → **Custom Domain** → add `api.cswp.dev`.
7. At **Spaceship** → DNS for `cswp.dev` → add CNAME: `api` → `<railway-host>` (Railway shows the exact target).
8. Create staff user (from your machine, with `backend/.env.local` pointing at Atlas):

```bash
backend/.venv/bin/python scripts/create-staff-user.py \
  --email you@chrissmithwp.com \
  --name "Chris Smith"
```

9. Verify production:

```bash
./deploy/verify-api.sh https://api.cswp.dev
```

### 6.2 Render alternative

1. [render.com](https://render.com) → **New** → **Blueprint** → connect repo (uses `render.yaml`).
2. Fill sync=false secrets when prompted (`MONGO_URL`, `AGILED_API_KEY`, `RESEND_*`, etc.).
3. Add custom domain `api.cswp.dev` in the service **Settings** → point Spaceship CNAME to Render.

### 6.3 After API is live

- Phase 2: deploy React app to Vercel at `app.cswp.dev` with `REACT_APP_BACKEND_URL=https://api.cswp.dev`.
- Stripe webhook: `https://api.cswp.dev/api/webhook/stripe`.

## Agiled CRM integration

The staff app can use Agiled as the source of truth for clients and projects.
This path is enabled when both conditions are true:

- `USE_AGILED_CRM=true`
- `AGILED_API_KEY` is set

When either condition is missing, the FastAPI app falls back to the legacy
Mongo-backed `clients` and `projects` collections for local development.

### Data flow

| App surface | Backend codepath | Agiled resource | MongoDB use |
|-------------|------------------|-----------------|-------------|
| `/api/clients` | `backend/server.py` + `backend/agiled_client.py` | Contacts | None in Agiled mode |
| `/api/projects` | `backend/server.py` + `backend/agiled_client.py` | Projects | `project_meta` only |
| `/api/dashboard/stats` | `backend/server.py` | Contacts + projects counts | SEO/audit stats |
| `/api/integrations/agiled/status` | `backend/server.py` | `/me` health check | None |

Agiled does not return every app-specific project field. The backend stores
`client_id` and `type` in MongoDB `project_meta`, keyed by Agiled project ID.
Production therefore needs both Agiled credentials and Atlas for complete
project records.

### Field and workflow constraints

- Client records map to Agiled contacts. The app can list, create, read, and
  update clients in Agiled mode; deleting clients through the app is not
  implemented and returns `501`.
- Project records map to Agiled projects. Deleting a project through the app
  deletes the Agiled project and removes its `project_meta` row.
- App statuses map to Agiled statuses as follows:
  - `active` -> `active`
  - `completed` -> `completed`
  - `on-hold` -> `planning`
- Agiled dates are normalized to ISO-8601 for the frontend. Date-only values
  are sent back to Agiled as `YYYY-MM-DD`.

### Backend verification

After setting the production env vars, verify the FastAPI integration:

```bash
curl https://api.cswp.dev/health
# expect: "agiled_configured": true

curl https://api.cswp.dev/api/integrations/agiled/status \
  -H "Authorization: Bearer $JWT"
# expect: configured=true, connected=true, workspace details
```

If local backend env does not include `AGILED_*` values, `backend/agiled_client.py`
also reads `services/agiled/.env` as a fallback. Prefer setting the same
production values directly on the deployed FastAPI service.

### Agiled webhook/proxy service

`services/agiled/` is a small Hono service for direct CRM proxy calls and Agiled
webhooks. It is separate from the FastAPI API used by the React app.

```bash
cd services/agiled
cp .env.example .env
npm install
npm run dev
```

Important variables:

- `PORT` — local service port; defaults to `3001`.
- `APP_URL` — public base URL used to build the webhook target. This must be
  reachable by Agiled before running webhook setup.
- `AGILED_API_BASE_URL` — defaults to `https://api.agiled.ai/public/v1`.
- `AGILED_API_KEY` — required for CRM proxy calls and webhook setup.
- `AGILED_WEBHOOK_SECRET` — required for signed webhook verification in
  production. If unset, the service logs a warning and accepts webhook payloads
  without signature verification.
- `AGILED_LEGACY_WEBHOOK_SUBSCRIPTION_ID` — optional helper for deleting the old
  `/crm` subscription during setup.

Service commands:

```bash
npm run build          # TypeScript compile check
npm start              # run dist/server.js after build
npm run setup:webhook  # create/update Agiled webhook subscription
```

`npm run setup:webhook` lists existing subscriptions, creates one for
`${APP_URL}/webhooks/agiled` if needed, prints the new secret once, and deletes
the legacy `/crm` subscription when `AGILED_LEGACY_WEBHOOK_SUBSCRIPTION_ID` is
set. Save the printed secret to `AGILED_WEBHOOK_SECRET` immediately.

Webhook endpoints:

- `POST /webhooks/agiled` — validates the signature when a secret is configured,
  parses Agiled payloads, and logs contact/account/deal/ticket events. The
  current handler does not write webhook data back to MongoDB.
- `ALL /crm` — legacy endpoint that returns `410` so old Agiled subscriptions
  stop retrying.

CRM proxy endpoints under `/api/crm` pass through to Agiled for operational
checks and scripts:

- `GET /api/crm/me`
- `GET|POST /api/crm/contacts`
- `GET|PATCH /api/crm/contacts/:contactId`
- `GET|POST /api/crm/accounts`
- `GET|PATCH /api/crm/accounts/:accountId`
- `GET|POST /api/crm/deals`
- `GET|PATCH /api/crm/deals/:dealId`
- `GET|POST /api/crm/tickets`
- `GET /api/crm/projects`
- `GET /api/crm/invoices`

For proxy `POST` calls, pass `Idempotency-Key` when the caller may retry the
same create request.

### Agiled troubleshooting

- **Clients or projects are empty in production:** check `/health` for
  `"agiled_configured": true`, confirm `USE_AGILED_CRM=true`, then call
  `/api/integrations/agiled/status` with a staff JWT to verify the Agiled key.
- **Projects show `Unknown Client` or wrong type:** confirm Atlas is reachable
  and the `project_meta` collection has rows for the Agiled project IDs.
- **Webhook setup prints a secret:** copy it immediately into
  `AGILED_WEBHOOK_SECRET`; Agiled only shows it when the subscription is
  created.
- **Webhook returns `401`:** the configured `AGILED_WEBHOOK_SECRET` does not
  match the signature Agiled is sending, or the signature header is missing.
- **Agiled still calls `/crm`:** run `npm run setup:webhook` with
  `AGILED_LEGACY_WEBHOOK_SUBSCRIPTION_ID` set, or remove the legacy subscription
  in Agiled. The app intentionally returns `410` on `/crm`.

## Data layout

| Data | Store |
|------|--------|
| Users, sessions, reset tokens | MongoDB |
| SEO audits, Stripe, contact form | MongoDB |
| Project `client_id` + `type` | MongoDB `project_meta` |
| Contacts/clients, project core fields | Agiled |
