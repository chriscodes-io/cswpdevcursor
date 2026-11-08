# Staff auth testing runbook

Reference for the current staff email/password authentication flow. The old
Emergent/Google OAuth path is no longer implemented; there is no
`/api/auth/google/session` endpoint in the current backend.

## Architecture

- Frontend auth UI lives in `frontend/src/pages/Auth.jsx`.
  - `REACT_APP_ALLOW_SIGNUP=true` exposes sign-up for local testing.
  - Any other value hides sign-up and shows the staff sign-in copy.
- Frontend API calls live in `frontend/src/lib/api.js`.
  - `POST /api/auth/login` returns `{access_token, token_type, user}`.
  - The token is stored in `localStorage` and sent as
    `Authorization: Bearer <token>`.
- Backend auth endpoints live in `backend/server.py`.
  - `POST /api/auth/register` is gated by `ALLOW_PUBLIC_REGISTRATION`.
  - `POST /api/auth/login` verifies email/password against MongoDB, or the
    dev file fallback when enabled.
  - `GET /api/auth/me` requires a Bearer JWT and returns the user without
    `password_hash`.
  - `POST /api/auth/logout` is a client-side symmetry endpoint; JWT logout is
    not server-side invalidation.
- JWT helpers live in `backend/auth.py`.
  - Tokens use `HS256` with `JWT_SECRET`.
  - Expiry is 7 days.

## Production setup

Production is staff-only:

```env
DEV_AUTH_FALLBACK=false
ALLOW_PUBLIC_REGISTRATION=false
REACT_APP_ALLOW_SIGNUP=false
FRONTEND_URL=https://app.cswp.dev
CORS_ORIGINS=https://app.cswp.dev,https://chrissmithwp.com
```

Create staff users directly in MongoDB Atlas:

```bash
backend/.venv/bin/python scripts/create-staff-user.py \
  --email you@chrissmithwp.com \
  --name "Chris Smith"
```

The script prompts for a password when `--password` is omitted, validates the
minimum 6-character length, and exits if the email already exists.

## Password reset flow

- Request: `POST /api/auth/forgot-password` with `{ "email": "..." }`.
- Response is always generic so unknown emails are not disclosed.
- Token generation/storage lives in `backend/password_reset.py`.
  - Raw tokens are never stored; the database stores `sha256(token)`.
  - Tokens are single-use and expire after `PASSWORD_RESET_TTL_HOURS`
    (default: `1`).
  - MongoDB expiry depends on `ensure_indexes()` creating the
    `password_reset_tokens.expires_at` TTL index.
- Email delivery uses `send_password_reset` from `backend/email_service.py`.
- Reset URL is built from `FRONTEND_URL` as `/auth/reset?token=<token>`.
- In local dev only, when email is not configured and `DEV_AUTH_FALLBACK=true`,
  the API includes `dev_reset_url` in the response for manual testing.

## Manual browser test

1. Start the backend with `REACT_APP_BACKEND_URL` pointing at it from the
   frontend environment.
2. Visit `/auth`.
3. Sign in with a staff account.
4. Confirm navigation to the app succeeds and `localStorage.authToken` exists.
5. Refresh the page; authenticated API calls should still send the Bearer token.
6. Use **Forgot password?** and confirm:
   - The request succeeds for existing and unknown emails.
   - A delivered reset link opens `/auth/reset?token=...`.
   - Passwords shorter than 6 characters are rejected.
   - A successful reset returns to sign-in and the new password works.

## Quick backend checks

```bash
# Should be 401 with no token.
curl -i "$API_URL/api/auth/me"

# Login and capture the token.
TOKEN="$(
  curl -s "$API_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"you@example.com","password":"..."}' |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])'
)"

# Should return the current user.
curl -i "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"

# Should be 403 in staff-only production.
curl -i "$API_URL/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"new@example.com","name":"New User","password":"secret123"}'
```

## Storage

- MongoDB `users`: `id`, `email`, `name`, `password_hash`, `created_at`.
- MongoDB `password_reset_tokens`: `token_hash`, `user_id`, `email`,
  `expires_at`, `used`.
- Local dev fallback files under `backend/data/`:
  - `dev_users.json`
  - `dev_reset_tokens.json`

## Common failures

- `403 Registration is disabled` from `/api/auth/register`: expected when
  `ALLOW_PUBLIC_REGISTRATION=false`.
- `503 Database unavailable`: MongoDB is unreachable and
  `DEV_AUTH_FALLBACK=false`; fix `MONGO_URL`/Atlas access or enable the local
  fallback for development only.
- `Token has expired` or `Invalid token`: sign in again; tokens expire after
  7 days and are signed with the active `JWT_SECRET`.
- Password reset email not received: verify `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`, and `FRONTEND_URL`; in local fallback mode check for
  `dev_reset_url`.
- Frontend sign-up visible in production: rebuild with
  `REACT_APP_ALLOW_SIGNUP=false`. The backend gate is still authoritative.
