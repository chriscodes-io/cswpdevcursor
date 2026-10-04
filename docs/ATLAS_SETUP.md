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

## Data layout

| Data | Store |
|------|--------|
| Users, sessions, reset tokens | MongoDB |
| SEO audits, Stripe, contact form | MongoDB |
| Project `client_id` + `type` | MongoDB `project_meta` |
| Contacts/clients, project core fields | Agiled |

## Agiled CRM mode

The backend uses Agiled as the source of truth for CRM contacts and project
records when both of these are true:

- `USE_AGILED_CRM=true`
- `AGILED_API_KEY` is set

If either condition is missing, `/api/clients` and `/api/projects` fall back to
the MongoDB `clients` and `projects` collections. Production should set the
Agiled variables directly on the API host; local development can also reuse
`services/agiled/.env` because `backend/agiled_client.py` loads it when the
backend `.env.local` has no Agiled key.

### API behavior

| App endpoint | Agiled object | MongoDB dependency |
|--------------|---------------|--------------------|
| `GET/POST/PUT /api/clients` | Contacts | None in Agiled mode |
| `DELETE /api/clients/{id}` | Not implemented | Returns `501`; delete contacts in Agiled |
| `GET/POST/PUT/DELETE /api/projects` | Projects | `project_meta` stores app-only fields |
| `GET /api/integrations/agiled/status` | `/me` health check | Auth required |

Project `client_id` and `type` are not returned by Agiled in the shape this app
needs, so the backend writes them to MongoDB `project_meta` using the Agiled
project ID as `project_id`. This means:

- `GET /api/projects?client_id=...` can only filter Agiled projects that have a
  matching `project_meta` row.
- Creating or updating a project in the app keeps `project_meta` in sync.
- Deleting a project through the app deletes both the Agiled project and its
  `project_meta` row.
- Use `scripts/migrate-dev-to-atlas.py` if local `backend/data/project_meta.json`
  records need to be copied into Atlas.

### Field mapping constraints

- Client create/update maps app fields to Agiled contact fields:
  `name -> first_name/last_name`, `email`, `phone`, `company -> company_name`,
  `website`, and `notes`.
- Client status is displayed from Agiled contact status. The app does not keep a
  separate MongoDB client status while Agiled mode is active.
- Project statuses are translated:
  - app `active` -> Agiled `active`
  - app `completed` -> Agiled `completed`
  - app `on-hold` -> Agiled `planning`
  - Agiled `planning`, `in_progress`, or `active` -> app `active`
  - Agiled `on_hold` or `cancelled` -> app `on-hold`
- Project `start_date` and `deadline` are sent to Agiled as dates
  (`YYYY-MM-DD`). Agiled date responses are normalized back to ISO datetimes.

### Verification and troubleshooting

Check the API health response after deploy:

```bash
curl https://api.cswp.dev/health
# expect: "agiled_configured": true
```

Check the authenticated Agiled connection:

```bash
curl https://api.cswp.dev/api/integrations/agiled/status \
  -H "Authorization: Bearer $JWT"
```

Common failure modes:

- `{"configured": false}` from `/api/integrations/agiled/status` means
  `AGILED_API_KEY` is missing in the API runtime.
- A `502` detail containing `Agiled API unreachable` means the backend could not
  reach Agiled within the configured HTTP timeout.
- A 4xx/5xx from Agiled is passed through as the FastAPI response status with a
  generic `Agiled API <method> <path> failed...` detail; reproduce against
  Agiled directly when the upstream error payload is needed.
- Missing projects for a client filter usually means the Agiled project exists
  but the MongoDB `project_meta` linkage row was never created or migrated.
