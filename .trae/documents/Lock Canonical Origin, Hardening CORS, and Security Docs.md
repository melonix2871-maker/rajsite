## Scope and Goals
- Use only `https://kwentonglasing.servebeer.com/login.html` for login and site entry.
- Restrict allowed origins strictly to:
  - `https://kwentonglasing.servebeer.com`
  - `https://coreenginedb.meoasis2014.workers.dev`
  - `https://assets.antserver1.eu.org`
- Prevent any sensitive data (Cloudflare config/db, Stripe secrets, superadmin credentials) from appearing in view source, console, logs, or responses.
- Add a new consolidated operational/security doc for CoreEngineDB and the app.

## Frontend Changes (per file)
- `login.html`, `index.html`, `dashboard.html`, `profile.html`, `coreenginedb/database.html`:
  - Add canonical check: if `window.location.origin !== 'https://kwentonglasing.servebeer.com'`, redirect to canonical URL.
  - Remove any storage/usage of `cedb_auth` (Basic credentials) in `sessionStorage`.
  - Ensure endpoints are obfuscated (runtime `atob(...)` or `window.__REMOTE` injection) and never logged or printed.
  - Ensure no endpoints/secrets appear in DOM or error messages.

## Worker Changes (both Workers if applicable)
- CORS: remove any lax wildcard logic; echo `Access-Control-Allow-Origin` only for the 3 allowed origins and include `Access-Control-Allow-Credentials: true`.
- `/json/config.json`: return sanitized public view unless authorized; never include `apiKeys`, Stripe config, or user auth lists.
- `/json/db.json`: superadmin-only for GET/HEAD and all writes; continue to enforce `ETag` and `If-Match`.
- `/auth/login`: return only `{ ok:true }` and set cookie; do not include user data in body.
- `/auth/session`: rely on cookie; return `{ ok:true, role }` only.
- `/activity`: sanitize listing by removing username; keep method, path, status, ip, reason, ts.
- Add `X-Robots-Tag: noindex, nofollow` to JSON responses to discourage indexing.
- Ensure Stripe secrets (`STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`) and `ADMIN_TOKEN` are used server-side only; never in responses or logs.

## Endpoint Obfuscation
- Replace raw URLs in clients with base64-decoded strings (`atob(...)`) or injected `window.__REMOTE` constants.
- Verify no raw endpoints appear in static HTML/JS.

## Documentation
- Create `.trae/documents/CoreEngineDB Operational & Security Practices.md`:
  - Features overview and origin policy.
  - Endpoint behaviors (sanitized config, public snapshot vs private db), auth flows.
  - Dos/Don'ts (client and server).
  - Troubleshooting (401/403/412) and verification steps.
  - Canonical URL usage requirement.

## Validation
- Test login and session from `https://kwentonglasing.servebeer.com/login.html` for both standard users and superadmin.
- Verify cookie-based SSO into `coreenginedb/database.html`.
- Confirm public pages do not reveal endpoints/secrets in view source.
- Confirm `/activity` output omits usernames.

## Implementation Details
- No data migration; only app/Worker code hardening.
- Keep Cloudflare secrets in dashboard as Secrets; do not move to code or Vars.
- Apply equivalent changes to both Worker deployments if you maintain more than one.

If approved, I will implement these changes across the workspace, harden the Workers, and add the documentation, then run validation steps.