## Goals
- Ensure login flows work reliably from your `login.html`, whether opened locally or from the canonical site, but only when contacting these allowed domains:
  - `https://coreenginedb.meoasis2014.workers.dev/auth/...`
  - `https://kwentonglasing.servebeer.com/auth/...` (optional pass‑through if you expose a proxy route)
  - `https://assets.antserver1.eu.org/auth/...` (skip if not implemented; try-next behavior)
- Fix the "redeclare block scope variable" in `coreenginedb/database.html` by isolating script scope.
- Eliminate 500s by hardening `/auth/login` to always return 401 on bad credentials, never 500.

## Frontend Changes
- `login.html`:
  - Implement allowed-bases auth client: iterate through `AUTH_BASES = [coreenginedb, servebeer, assets]` and POST to `<base>/auth/login`; stop on first success.
  - For bases without `/auth` implemented (assets), treat 404 as try-next, not an error.
  - Keep cookie-based auth; from local `file://`, fall back to storing a temporary Basic token only to bootstrap, then immediately redirect to canonical so cookies take over.
  - Ensure all endpoints and bases are obfuscated via `atob(...)`; nothing printed in console/DOM.
- `coreenginedb/database.html`:
  - Wrap entire script in a single IIFE to avoid block-scope redeclarations.
  - Use cookie session only; do not inject Authorization headers.

## Worker Changes
- `/auth/login`:
  - Wrap verification in try/catch; malformed data or mismatches yield `{ error:'bad_credentials' }` with 401.
  - Accept user passwords as plaintext, JSON string `{hash,salt,iterations}`, or direct object.
  - Superadmin: support `password_hash` or plaintext fallback as per your dataset.
- CORS:
  - Continue to allow only the three domains; echo origin plus credentials when matched.
  - No wildcard for cookies; local `file://` uses temporary Basic only for bootstrap.

## Verification
- From `https://kwentonglasing.servebeer.com/login.html`:
  - Sign in as `juniedev`, `lukiecookie`, `Tukmol1`, `Dan1`, `chapipi`, and superadmin `kwlasing_superadmin` → expect 200 and cookie set.
  - `GET /auth/session` should return `{ ok:true, role }`.
- From local `c:/.../login.html`:
  - Client tries `coreenginedb` first; on 200, redirects to canonical and uses cookie.
  - If base unsupported (assets), it tries next base.
- `coreenginedb/database.html` loads without redeclare errors and uses cookie-only auth.

## Safety
- No secrets in client; endpoints obfuscated; Worker JSON uses `X-Robots-Tag`; Activity listing omits usernames.

If you approve, I will implement the auth base fallback in the client, wrap the admin script to fix redeclarations, and harden the Worker login route, then redeploy and verify against your user list.