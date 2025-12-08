# CoreEngineDB Operational & Security Practices

## Canonical Origin
- Use only `https://kwentonglasing.servebeer.com` for all site pages.
- Frontend pages redirect to canonical if opened from any other origin.

## Allowed Origins
- `https://kwentonglasing.servebeer.com`
- `https://coreenginedb.meoasis2014.workers.dev`
- `https://assets.antserver1.eu.org`
- Worker echoes `Access-Control-Allow-Origin` only for these and enables credentials for cookie auth.

## Endpoints
- Public snapshot: `GET /json/public.db.json` (sanitized rows only).
- Config: `GET/HEAD /json/config.json` sanitized unless authorized; ETag exposed.
- Private DB: `GET/HEAD/PUT/PATCH/POST/DELETE /json/db.json` requires superadmin; ETag + If-Match enforced.
- Auth: `POST /auth/login` issues cookie; `GET /auth/session` validates cookie; no user data returned.
- Activity: `GET /activity` lists sanitized events without usernames.

## Credentials
- Superadmin: `coreenginedb_/superuser` id=1 + `password_hash` (PBKDF2 SHA-256).
- Users: `app_/users` username + either `password_hash` or JSON `{hash,salt,iterations}` under `metakey: "password"`.
- No Basic credentials stored client-side; cookie session only.

## Security and Privacy
- No secrets or usernames in responses or logs.
- `X-Robots-Tag: noindex, nofollow` on JSON to discourage indexing.
- Stripe secrets used server-side only; never exposed.
- Timing-safe comparisons; rate limiting on login and selected routes.

## Client Practices
- Obfuscate endpoints via runtime decoding (`atob(...)`) or injected `window.__REMOTE`.
- Do not print endpoints or credentials in console or DOM.
- Always open `https://kwentonglasing.servebeer.com/login.html` for login.

## Troubleshooting
- 401 unauthorized: check cookie session (use canonical origin) and credentials.
- 403 forbidden: missing CSRF when not using cookie auth, or not superadmin on private DB.
- 412 precondition_failed: refresh ETag (HEAD) and retry write.

## Verification
- Login as user and superadmin from canonical URL; expect `{ ok:true }` and cookie.
- `GET /auth/session` returns `{ ok:true, role }`.
- Public pages show no secrets in view source; `/activity` omits usernames.

