# Staff Auth Testing Playbook

Reference for testing the current staff email/password auth flow. The Google
OAuth callback route documented previously is not present in the app; the active
auth surface is the JWT flow in `backend/server.py`, `backend/auth.py`, and
`frontend/src/pages/Auth.jsx`.

## Architecture

- Sign-in: `POST /api/auth/login` verifies the user's `password_hash` and
  returns `{access_token, user}`.
- Frontend storage: `frontend/src/App.jsx` writes the JWT to `localStorage`;
  `frontend/src/lib/api.js` reads it and sends it as
  `Authorization: Bearer <token>`.
- Current-user lookup: `GET /api/auth/me` decodes the bearer JWT, then loads the
  user from MongoDB. If MongoDB is unavailable and `DEV_AUTH_FALLBACK=true`, it
  can read from `backend/data/dev_users.json`.
- Registration: `POST /api/auth/register` works only when
  `ALLOW_PUBLIC_REGISTRATION=true`. Production should keep it disabled and use
  `scripts/create-staff-user.py` for staff accounts.
- Password reset: `POST /api/auth/forgot-password` always returns the same
  generic message. Tokens are hashed in `password_reset_tokens`, expire after
  `PASSWORD_RESET_TTL_HOURS` (default: 1), and are consumed by
  `POST /api/auth/reset-password`.

## Environment matrix

| Context | Backend flags | Frontend flags | Expected behavior |
| --- | --- | --- | --- |
| Local dev | `DEV_AUTH_FALLBACK=true`, `ALLOW_PUBLIC_REGISTRATION=true` | `REACT_APP_ALLOW_SIGNUP=true` | Signup, login, forgot/reset, and local file fallback are available. |
| Production staff app | `DEV_AUTH_FALLBACK=false`, `ALLOW_PUBLIC_REGISTRATION=false` | `REACT_APP_ALLOW_SIGNUP=false` | Signup UI is hidden, `/api/auth/register` returns 403, and staff users must already exist in MongoDB. |

## Manual QA flow

1. Open `/auth`.
2. Confirm the page shows **Team sign in**.
3. In production mode, confirm there is no signup toggle and the footer says
   "Need access? Contact your administrator."
4. Sign in with a staff user created by:

   ```bash
   backend/.venv/bin/python scripts/create-staff-user.py \
     --email you@chrissmithwp.com \
     --name "Chris Smith"
   ```

5. Confirm the app navigates to `/dashboard`.
6. Reload the page and confirm the session still works via the stored bearer
   token.
7. Click **Forgot password?**, submit the staff email, and confirm the generic
   success message appears.
8. Open the reset link from email, or the `dev_reset_url` returned only in local
   dev when Resend is not configured and `DEV_AUTH_FALLBACK=true`.
9. Set a new password and confirm the old password no longer works.

## Quick backend checks

Replace `https://YOUR_HOST` with the API host, for example
`https://api.cswp.dev`.

```bash
# Should return 401 without a bearer token.
curl -i https://YOUR_HOST/api/auth/me

# Production should return 403 when public registration is disabled.
curl -i -X POST https://YOUR_HOST/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa@example.com","name":"QA","password":"test123456"}'

# Login returns access_token and user.
curl -s -X POST https://YOUR_HOST/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@chrissmithwp.com","password":"REDACTED"}'

# Use the returned JWT.
curl -i https://YOUR_HOST/api/auth/me \
  -H "Authorization: Bearer $JWT"

# Forgot-password responses should not reveal whether the account exists.
curl -i -X POST https://YOUR_HOST/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@chrissmithwp.com"}'
```

## DB collections used

- `users` - `{id, email, name, password_hash, created_at}`
- `password_reset_tokens` - `{token_hash, user_id, email, expires_at, used}`
- `user_sessions` - legacy indexes may still be created in `backend/db.py`, but
  the current auth dependency does not read session cookies.

## Troubleshooting

- `403 Registration is disabled` is expected in production. Create staff users
  with `scripts/create-staff-user.py`.
- `503 Database unavailable` means MongoDB is down or `MONGO_URL` is wrong. In
  production, do not use `DEV_AUTH_FALLBACK=true` to mask this.
- `Token has expired` or `Invalid token` usually means the JWT is old, malformed,
  or signed with a different `JWT_SECRET`.
- Forgot-password succeeds but no email arrives: check `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`, and `FRONTEND_URL`.
- Frontend says the backend URL is not configured: set
  `REACT_APP_BACKEND_URL` and restart the React dev server or rebuild the app.

## Critical do-not's

- Do not enable public signup in production unless Chris explicitly approves it.
- Do not call legacy Google OAuth callback endpoints; no such auth route is
  active.
- Do not expose Mongo `_id`; API queries should keep using `{"_id": 0}`
  projections for user-facing responses.
- Do not commit real passwords, reset tokens, JWTs, or API keys in test notes.
