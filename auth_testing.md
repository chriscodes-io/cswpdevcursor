# Auth Testing Playbook

Reference for testing the current CSWP staff email/password auth flow.

## Architecture

- `POST /api/auth/register` creates an email/password user only when
  `ALLOW_PUBLIC_REGISTRATION=true`; production keeps this false for
  staff-only access.
- `POST /api/auth/login` returns `{access_token, user}` for valid credentials.
- The React app stores `access_token` as `authToken` in `localStorage`, then
  sends it as `Authorization: Bearer <token>` on authenticated API requests.
- `GET /api/auth/me` validates the bearer JWT and returns the current user.
- `POST /api/auth/logout` is API symmetry only; the frontend clears
  `authToken` and `currentUser` from `localStorage`.
- Password resets use `POST /api/auth/forgot-password` and
  `POST /api/auth/reset-password`; reset tokens are hashed before storage and
  expire after `PASSWORD_RESET_TTL_HOURS` (default: 1).

Source references:

- Backend routes: `backend/server.py`
- JWT dependency: `backend/auth.py`
- Reset token storage: `backend/password_reset.py`
- Frontend auth page: `frontend/src/pages/Auth.jsx`
- Frontend token handling: `frontend/src/App.jsx`, `frontend/src/lib/api.js`
- Staff-user helper: `scripts/create-staff-user.py`

## Environment modes

### Local development

`backend/.env.example` defaults to:

```env
DEV_AUTH_FALLBACK=true
ALLOW_PUBLIC_REGISTRATION=true
```

If MongoDB is unavailable and `DEV_AUTH_FALLBACK=true`, users and reset tokens
are stored under `backend/data/` for local development only. When email is not
configured in this mode, forgot-password responses include `dev_reset_url` so
the reset flow can be tested without sending an email.

The frontend signup UI is controlled separately:

```env
REACT_APP_ALLOW_SIGNUP=true
```

### Production / staff-only

Production should use MongoDB Atlas and disable both signup paths:

```env
DEV_AUTH_FALLBACK=false
ALLOW_PUBLIC_REGISTRATION=false
REACT_APP_ALLOW_SIGNUP=false
```

Create staff accounts directly in MongoDB:

```bash
backend/.venv/bin/python scripts/create-staff-user.py \
  --email you@chrissmithwp.com \
  --name "Chris Smith"
```

The script prompts for a password when `--password` is omitted.

## Manual browser checks

1. Visit `/auth`.
2. Confirm the page says "Team sign in" and no public signup link is available
   when `REACT_APP_ALLOW_SIGNUP=false`.
3. Sign in with a staff account.
4. Refresh the app; `App.jsx` should validate the stored token via
   `/api/auth/me` before showing protected routes.
5. Log out; the app should clear local auth state and return to `/auth`.
6. Use "Forgot password"; the response message should not reveal whether an
   account exists.
7. Follow the reset link from email, or use `dev_reset_url` in local fallback
   mode, then verify the new password can sign in.

## Quick backend checks

Set the deployed API base URL first:

```bash
BASE=https://api.cswp.dev
```

Health should show MongoDB connected and production auth flags disabled:

```bash
curl -sf "$BASE/health" | python3 -m json.tool
```

Expected key fields:

```json
{
  "status": "ok",
  "mongodb": true,
  "dev_auth_fallback": false,
  "allow_public_registration": false
}
```

Registration should be blocked in production:

```bash
curl -i -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"probe@example.com","name":"Probe","password":"probe123"}'
# Expect: HTTP 403
```

Login should return a JWT:

```bash
TOKEN="$(
  curl -sf -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"you@example.com","password":"..."}' |
  python3 -c "import json, sys; print(json.load(sys.stdin)['access_token'])"
)"
```

Protected user lookup should reject missing auth and accept the bearer token:

```bash
curl -i "$BASE/api/auth/me"
# Expect: HTTP 401

curl -sf "$BASE/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" |
  python3 -m json.tool
```

The deploy smoke test wraps the health and registration checks:

```bash
./deploy/verify-api.sh "$BASE"
```

## Data collections

- `users` - `{id, email, name, password_hash, created_at}`
- `password_reset_tokens` - `{token_hash, user_id, email, expires_at, used}`
- `user_sessions` - indexed legacy collection; current auth does not create
  session-cookie records.

## Common pitfalls

- `REACT_APP_ALLOW_SIGNUP` only hides/disables frontend signup. The backend
  gate is `ALLOW_PUBLIC_REGISTRATION`; keep both false for staff-only
  production.
- `DEV_AUTH_FALLBACK=false` means MongoDB must be reachable. If `/health`
  returns `"status": "degraded"` with `"mongodb": false`, login and protected
  routes will fail until Atlas connectivity or `MONGO_URL` is fixed.
- `/api/auth/me` does not read session cookies in the current implementation;
  send `Authorization: Bearer <token>`.
- Password reset emails require Resend configuration. Without Resend, local
  fallback can expose `dev_reset_url`; production should not rely on that path.
- Do not expose Mongo `_id` values in API responses; existing routes project
  with `{"_id": 0}` where user documents are returned.
