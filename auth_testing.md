# Emergent Google Auth Testing Playbook

Reference document for testing the Emergent-managed Google OAuth integration.
The current implementation runs ALONGSIDE existing email/password JWT auth
(dual auth) - localStorage migration is deferred to a future cleanup.

## Architecture (current)

- Email/password → `POST /api/auth/login` → returns `access_token` (JWT) →
  frontend stores in `localStorage` → sent as `Authorization: Bearer <token>`.
- Google OAuth → redirect to `https://auth.emergentagent.com/?redirect=<our url>` →
  user returns to `{redirect}#session_id=<id>` → frontend posts the id to
  `POST /api/auth/google/session` (header `X-Session-ID`) → backend calls
  Emergent `/auth/v1/env/oauth/session-data`, upserts user in `users`, stores
  the returned `session_token` in `user_sessions` with 7-day expiry, sets a
  httpOnly cookie, and returns `{access_token, user}` so frontend reuses the
  existing login flow.
- `get_current_user` reads cookie first, falls back to `Authorization: Bearer`
  (works with either Emergent session_token from cookie OR our local JWT).

## Test Account

- Test user (email/password): `test@seoaudit.com` / `test123456` — see
  `/app/memory/test_credentials.md`.
- Google test accounts: provisioned via Emergent during real OAuth flow; no
  fixed test identity at the moment.

## Manual Test Flow

1. Visit `/auth`. Click **Continue with Google**.
2. Browser redirects to `https://auth.emergentagent.com/?redirect=<origin>/dashboard`.
3. Complete Google login.
4. Browser lands back at `/dashboard#session_id=...`.
5. `App.jsx` detects the fragment, mounts `AuthCallback`, which POSTs the
   session_id to `/api/auth/google/session` and on success navigates to
   `/dashboard` cleanly (hash removed).
6. `/api/auth/me` should return user data using the session cookie.

## Quick Backend Checks (curl)

```bash
# Should 401 (no auth)
curl -i https://YOUR_HOST/api/auth/me

# With JWT (legacy email/pw flow)
curl -i https://YOUR_HOST/api/auth/me -H "Authorization: Bearer $JWT"

# With session cookie (after Google login)
curl -i https://YOUR_HOST/api/auth/me --cookie "session_token=$ST"
```

## DB collections used

- `users` — `{id, email, name, password_hash?, google_id?, picture?, created_at}`
- `user_sessions` — `{user_id, session_token, expires_at, created_at}`

## Critical do-not's

- DO NOT hardcode the redirect URL — always derive from `window.location.origin`.
- DO NOT call Emergent's `/session-data` endpoint from the frontend — only backend.
- DO NOT use FastAPI `HTTPAuthorizationCredentials` dependency — breaks cookie auth.
- DO NOT expose Mongo `_id` — always `{"_id": 0}` projection.
