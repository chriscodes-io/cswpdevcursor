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

FRONTEND_URL=https://cswp.dev

# Password reset emails
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@cswp.dev

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
- [ ] `JWT_SECRET` rotated (not the dev default)
- [ ] `FRONTEND_URL` set to production domain
- [ ] Resend configured for password reset emails
- [ ] Atlas IP allowlist includes your host (Vercel uses dynamic IPs — use `0.0.0.0/0` with strong DB credentials, or Atlas VPC peering for stricter setups)
- [ ] Agiled API key rotated if it was ever exposed

## Data layout

| Data | Store |
|------|--------|
| Users, sessions, reset tokens | MongoDB |
| SEO audits, Stripe, contact form | MongoDB |
| Project `client_id` + `type` | MongoDB `project_meta` |
| Contacts/clients, project core fields | Agiled |
