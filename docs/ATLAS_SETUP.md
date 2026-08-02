# Production API and MongoDB Atlas setup

This runbook covers the FastAPI backend for the staff workspace at
`app.cswp.dev`, the MongoDB Atlas database it uses in production, and the
Railway/Render deployment path for `api.cswp.dev`.

Production auth, password resets, SEO audits, Stripe records, contact messages,
and Agiled project metadata (`client_id`, `type`) live in MongoDB. CRM contacts
and project core fields are stored in Agiled; MongoDB only holds the app-specific
linkage fields Agiled does not return.

## Architecture at a glance

| Concern | Code/config | Notes |
| --- | --- | --- |
| FastAPI app | `backend/server.py` | API routes are mounted under `/api`; `/health` is mounted at the root. |
| Hosted ASGI entrypoint | `backend/main.py` | Imports `backend.server:app` when Railway/Render use `backend/` as the service root. |
| MongoDB client | `backend/db.py` | Loads `backend/.env`, then `backend/.env.local` with override, before creating the shared Motor client. |
| Staff auth | `backend/server.py`, `backend/auth.py` | JWT auth backed by `db.users`; public registration is disabled unless explicitly enabled. |
| Local dev fallback | `backend/dev_auth.py` | File-backed users in `backend/data/dev_users.json` only when `DEV_AUTH_FALLBACK=true`. |
| Production deploy env | `deploy/api-production.env.example` | Source of truth for Railway/Render variables. |
| Production smoke test | `deploy/verify-api.sh` | Checks `/health` and verifies `/api/auth/register` returns `403`. |

## 1. Create an Atlas cluster

1. Sign in at [https://cloud.mongodb.com](https://cloud.mongodb.com).
2. **Create** -> **M0 Free** cluster, using a region close to your users.
3. **Database Access** -> add a database user with a strong password.
4. **Network Access** -> add your current IP for local setup.
   - For hosted deployments without a fixed egress IP, `0.0.0.0/0` may be
     required unless you add private networking or peering.
   - If you allow all IPs, keep the Atlas username/password strong and unique.
5. **Database** -> **Connect** -> **Drivers** -> copy the
   `mongodb+srv://...` connection string.

## 2. Configure backend environment

For local production-style testing, copy the template and fill in real values:

```bash
cp backend/.env.local.example backend/.env.local
```

For hosted deploys, paste equivalent values from
`deploy/api-production.env.example` into Railway or Render.

```env
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=seo_project_manager

# Production auth: disable file-backed fallback.
DEV_AUTH_FALLBACK=false

# Generate: python3 -c "import secrets; print(secrets.token_urlsafe(48))"
JWT_SECRET=<long-random-secret>

FRONTEND_URL=https://app.cswp.dev
CORS_ORIGINS=https://app.cswp.dev,https://chrissmithwp.com

# Staff-only app: public self-registration stays disabled.
ALLOW_PUBLIC_REGISTRATION=false

# Password reset emails.
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@chrissmithwp.com
CONTACT_TO_EMAIL=hello@chrissmithwp.com

# Agiled CRM.
USE_AGILED_CRM=true
AGILED_API_KEY=...
AGILED_API_BASE_URL=https://api.agiled.ai/public/v1
```

Keep `backend/.env` for local defaults. Secrets belong in
`backend/.env.local` locally or in the host environment UI for production.

### Environment constraints

- `DEV_AUTH_FALLBACK=false` is required for production auth. If it is left true
  while `MONGO_URL` points at Atlas, startup logs a warning and `/health`
  reports `"dev_auth_fallback": true`.
- `ALLOW_PUBLIC_REGISTRATION=false` makes `POST /api/auth/register` return
  `403`. This is the backend source of truth for staff-only access.
- `REACT_APP_ALLOW_SIGNUP=false` should also be set for the React build so the
  signup UI is hidden, but the backend flag still enforces the rule.
- `CORS_ORIGINS` is comma-separated and must include every browser origin that
  calls the API, including `https://app.cswp.dev` and any public marketing page
  using `/api/contact`.
- `JWT_SECRET` must not use the development default because existing JWTs remain
  valid until it changes.

## 3. Migrate local dev users (optional)

If you created accounts while `DEV_AUTH_FALLBACK=true`, migrate them before
turning off fallback:

```bash
cd /path/to/app
backend/.venv/bin/python scripts/migrate-dev-to-atlas.py --dry-run
backend/.venv/bin/python scripts/migrate-dev-to-atlas.py
```

Then sign in with the same email/password, or use **Forgot password** after
Resend is configured.

## 4. Create staff users

When `ALLOW_PUBLIC_REGISTRATION=false`, create staff accounts with the script
instead of the public registration endpoint:

```bash
backend/.venv/bin/python scripts/create-staff-user.py \
  --email you@chrissmithwp.com \
  --name "Chris Smith"
```

The script loads `backend/.env` and `backend/.env.local`, requires MongoDB to be
reachable, prompts securely for a password when `--password` is omitted, and
exits without modifying anything if the email already exists. Repeat it for each
team member. Clients use `portal.cswp.dev` (Hub Client), not this staff app.

## 5. Verify locally

Start the backend with production-style env values, then check:

```bash
curl http://localhost:8001/health
# Expect: "mongodb": true, "dev_auth_fallback": false,
#         "allow_public_registration": false

curl -i -X POST http://localhost:8001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"probe@example.com","name":"Probe","password":"probe123"}'
# Expect: HTTP 403

curl -X POST http://localhost:8001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"..."}'
```

`/health` returns `"status": "ok"` when MongoDB is reachable or local dev auth
fallback is enabled. In production mode (`DEV_AUTH_FALLBACK=false`), MongoDB
failure reports `"status": "degraded"` and `"mongodb": false`.

## 6. Deploy API to Railway or Render

Recommended host: **Railway** (config in `backend/railway.toml`). Alternative:
**Render** (`render.yaml` at repo root).

Both deployment paths use:

- service root: `backend`
- dependencies: `backend/requirements-prod.txt`
- ASGI app: `main:app`
- start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- health check: `/health`

### 6.1 Railway setup

1. Sign in at [railway.app](https://railway.app) -> **New Project** ->
   **Deploy from GitHub repo** -> select this repository.
2. Open the new service -> **Settings** -> set **Root Directory** to `backend`.
3. **Variables** -> paste values from `deploy/api-production.env.example`.
4. **Settings** -> **Networking** -> **Generate Domain** for a temporary
   `*.up.railway.app` URL.
5. Deploy. When green, open `https://<railway-host>/health`.
6. **Settings** -> **Networking** -> **Custom Domain** -> add `api.cswp.dev`.
7. At Spaceship DNS for `cswp.dev`, add `CNAME api -> <railway-host>` using the
   exact target Railway shows.
8. Create staff users from a local machine whose `backend/.env.local` points at
   the same Atlas database.
9. Verify production:

```bash
./deploy/verify-api.sh https://api.cswp.dev
```

### 6.2 Render alternative

1. [render.com](https://render.com) -> **New** -> **Blueprint** -> connect this
   repo. Render reads `render.yaml`.
2. Fill `sync: false` secrets when prompted (`MONGO_URL`, `AGILED_API_KEY`,
   `RESEND_*`, `CONTACT_TO_EMAIL`, `STRIPE_*`, `GOOGLE_PAGESPEED_API_KEY`).
3. Add custom domain `api.cswp.dev` in the service **Settings** and point the
   Spaceship CNAME to the Render target.

### 6.3 After the API is live

- Deploy the React app at `app.cswp.dev` with:
  - `REACT_APP_BACKEND_URL=https://api.cswp.dev`
  - `REACT_APP_ALLOW_SIGNUP=false`
- Set the Stripe webhook endpoint to
  `https://api.cswp.dev/api/webhook/stripe`.
- Run `./deploy/verify-api.sh https://api.cswp.dev` after every environment
  change that touches auth, MongoDB, or routing.

## Production checklist

- [ ] `MONGO_URL` points at Atlas and the Atlas database user can connect.
- [ ] Atlas Network Access allows the deployed host.
- [ ] `DEV_AUTH_FALLBACK=false`.
- [ ] `ALLOW_PUBLIC_REGISTRATION=false`.
- [ ] `REACT_APP_ALLOW_SIGNUP=false` in the frontend build environment.
- [ ] `JWT_SECRET` is a generated production secret, not a local default.
- [ ] `FRONTEND_URL=https://app.cswp.dev`.
- [ ] `CORS_ORIGINS` includes the app and public browser origins.
- [ ] `REACT_APP_BACKEND_URL=https://api.cswp.dev`.
- [ ] Staff users were created with `scripts/create-staff-user.py`.
- [ ] Resend is configured for password reset emails.
- [ ] Agiled API credentials are set when `USE_AGILED_CRM=true`.
- [ ] Stripe webhook points at `https://api.cswp.dev/api/webhook/stripe`.
- [ ] Marketing site links: **Client portal** -> `portal.cswp.dev`,
  **Team login** -> `app.cswp.dev/auth`.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `/health` shows `"mongodb": false` in production | Verify `MONGO_URL`, Atlas database user credentials, Atlas Network Access, and that the host env vars are on the API service. |
| `/health` shows `"dev_auth_fallback": true` | Set `DEV_AUTH_FALLBACK=false` in the deployed API environment and redeploy. |
| `/api/auth/register` does not return `403` | Set `ALLOW_PUBLIC_REGISTRATION=false`; run `deploy/verify-api.sh` again. |
| Signup link appears in the staff app | Set `REACT_APP_ALLOW_SIGNUP=false` in the frontend build env and rebuild the React app. |
| Browser requests fail with CORS errors | Add the exact browser origin to `CORS_ORIGINS`; include scheme and host. |
| `create-staff-user.py` says MongoDB is not reachable | Confirm `backend/.env.local` exists locally and points at the same Atlas cluster as production. |
| Forgot-password requests do not send email | Check `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and the `/health` `email_configured` flag. |
| Agiled clients/projects are unavailable | Check `USE_AGILED_CRM`, `AGILED_API_KEY`, and the `/health` `agiled_configured` flag. |

## Data layout

| Data | Store |
| --- | --- |
| Users, sessions, reset tokens | MongoDB |
| SEO audits, Stripe records, contact messages | MongoDB |
| Project `client_id` and `type` | MongoDB `project_meta` |
| Contacts/clients and project core fields | Agiled |
