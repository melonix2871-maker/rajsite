## Root Cause
- The Worker’s `/auth/login` accepts app user credentials only if:
  - `app_/users:password_hash` contains a PBKDF2 hash; or
  - `app_/users:password` is a plaintext password.
- Your `login.html` registration stores a PBKDF2 object under `app_/users:password` (JSON with `{hash,salt,iterations}`), not `password_hash`.
- Current Worker treats `password` as plaintext, so hashed JSON under `password` fails, returning 401.

## Proposed Changes
### Update handleAuthLogin (upload Worker)
- File: `c:\Users\meoas\Desktop\upload\coreenginedb\worker.js`
- Location: app user verification logic in `handleAuthLogin` around `handleAuthLogin` (lines ~690–699).
- Change:
  - Keep existing `password_hash` handling.
  - Extend `password` check to:
    - If `password.metavalue` parses as JSON and includes `{ hash, salt, iterations }`, compute PBKDF2 and compare via timing-safe equality.
    - Else, treat `password.metavalue` as plaintext and compare directly.

### Update checkAuth helper (Basic header fallback)
- File: same Worker file, function `checkAuth` (lines ~526–536).
- Change:
  - Mirror the above logic for `app_/users:password` so Basic-auth reads/writes also succeed when password is stored as JSON hash.

### No changes to CSRF/CORS
- `/auth/login` remains CSRF-free.
- CORS stays restricted to your three origins with credentials enabled.

## Acceptance Criteria
- POST `/auth/login` with credentials for a user whose password is stored as JSON `{hash,salt,iterations}` under `app_/users:password` returns `200` and sets `cedb_session`.
- `GET /auth/session` returns `{ ok:true }` with cookie.
- Superadmin gating continues to work on `GET/HEAD/PUT/PATCH/DELETE /json/db.json`.

## Verification Steps
1. HEAD `json/db.json` to confirm ETag works.
2. Register or ensure a user with `app_/users:password` holding JSON hash.
3. POST `/auth/login` with that username/password → expect `200` and `Set-Cookie`.
4. GET `/auth/session` with cookie → `{ ok:true }`.
5. From `coreenginedb/database.html`, session should pass and writes succeed for superadmin only.

## Rollback Safety
- Changes are additive: they only add support for hashed JSON under `metakey: "password"`. Existing `password_hash` and plaintext flows remain intact.

Please confirm and I’ll implement the updates and redeploy.