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

## 7. Phase 1 API operating runbook

Phase 1 runs the FastAPI backend as a staff-only API. The backend must start from the `backend/` service root and serve `main:app`; `backend/main.py` adds the repo root to `sys.path` and imports `backend.server:app` for Railway/Render.

### Expected production auth state

| Layer | Setting | Expected production value | Why |
|------|---------|---------------------------|-----|
| Backend | `DEV_AUTH_FALLBACK` | `false` | Disables file-backed local users in `backend/data/` |
| Backend | `ALLOW_PUBLIC_REGISTRATION` | `false` | Makes `POST /api/auth/register` return 403 |
| Frontend build | `REACT_APP_ALLOW_SIGNUP` | `false` | Hides the signup UI for `app.cswp.dev` |
| Frontend build | `REACT_APP_BACKEND_URL` | `https://api.cswp.dev` | Sends dashboard API calls to the deployed backend |

The backend remains the source of truth: even if a stale frontend build shows signup, production registration is still blocked when `ALLOW_PUBLIC_REGISTRATION=false`.

### Health checks

Use the smoke test after every deploy or env change:

```bash
./deploy/verify-api.sh https://api.cswp.dev
```

The script verifies:

1. `GET /health` responds.
2. `mongodb` is `true`.
3. `dev_auth_fallback` is `false`.
4. `allow_public_registration` is `false`.
5. `POST /api/auth/register` returns `403`.

`GET /health` also reports optional integrations:

| Field | Meaning |
|-------|---------|
| `agiled_configured` | `AGILED_API_KEY` is available to the backend |
| `email_configured` | `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set |
| `stripe_configured` | Stripe API configuration is present |

### Staff account operations

Create staff accounts from a trusted machine with `backend/.env.local` pointing at the production Atlas database:

```bash
backend/.venv/bin/python scripts/create-staff-user.py \
  --email you@chrissmithwp.com \
  --name "Chris Smith"
```

The script prompts for a password when `--password` is omitted, rejects passwords shorter than 6 characters, and exits without changing anything if the email already exists.

Password resets use `/api/auth/forgot-password` and `/api/auth/reset-password`. Reset tokens are hashed before storage, expire after 1 hour by default, and require Resend to deliver emails in production.

## 8. Troubleshooting

| Symptom | Likely cause | Check / fix |
|---------|--------------|-------------|
| `/health` returns `"mongodb": false` with `"status": "degraded"` | Atlas is unreachable from the host | Verify `MONGO_URL`, Atlas database credentials, and Atlas Network Access allowlist. Railway/Render often need `0.0.0.0/0` unless stricter networking is configured. |
| `/health` returns `"dev_auth_fallback": true` in production | Production env did not override the local default | Set `DEV_AUTH_FALLBACK=false` in the host env and redeploy. Do not rely on `backend/.env` for production. |
| `/health` returns `"allow_public_registration": true` | Staff-only registration is not enforced | Set `ALLOW_PUBLIC_REGISTRATION=false` and rerun `./deploy/verify-api.sh`. |
| Signup link still appears on `app.cswp.dev` | Frontend was built with signup enabled | Set `REACT_APP_ALLOW_SIGNUP=false` in the frontend host build env and rebuild the frontend. |
| Browser blocks dashboard API calls with CORS errors | Frontend origin is missing from backend CORS config | Include the exact origin in `CORS_ORIGINS`, for example `https://app.cswp.dev,https://chrissmithwp.com`. |
| Password reset request succeeds but no email arrives | Resend is not configured or the sender is not verified | Check `/health` for `"email_configured": true`, then verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. |
| Staff creation script cannot connect | Local shell is not loading Atlas env values | Copy `backend/.env.local.example` to `backend/.env.local`, fill `MONGO_URL`, and rerun the script from the repo root. |

## Data layout

| Data | Store |
|------|--------|
| Users, sessions, reset tokens | MongoDB |
| SEO audits, Stripe, contact form | MongoDB |
| Project `client_id` + `type` | MongoDB `project_meta` |
| Contacts/clients, project core fields | Agiled |
