CoreEngineDB overview

- Purpose: single‑file JSON datastore with safe public snapshot and authenticated writes
- Pages: index (feed + donations), profile (user posts + totals), dashboard (avatar + wallet + top‑up), admin console (full CRUD), admin.html (lightweight admin monitor)
- Worker: Cloudflare Worker provides sanitized reads, authenticated writes, Stripe integration, activity logs

KL App features

- Feed (Home): lists posts with avatars, donation counts, and buy‑beer actions
- Profile: shows a user’s posts, per‑post totals, and avatar; supports donations
- Dashboard: avatar upload (client‑side resize), wallet balance, recent ledger, Stripe top‑up via Worker
- Auth UI: session stored in `sessionStorage` (`app_auth`, `cedb_auth` headers for Worker)
- Timestamps: rendered as relative (e.g., 2m ago) with readable fallback everywhere

Data model

- Record fields: id, relid, prefix, collection, metakey, metavalue, createddate, updateddate
- Prefixes: app_ (site data), wallet_ (balances/ledger), donate_ (per‑post donations), coreenginedb_ (superuser), etc.
- Public snapshot: filters to safe rows only (posts, app_/users username + avatar, donate_/post)

Endpoints (Worker)

- GET /json/public.db.json: public snapshot (sanitized)
- GET/HEAD /json/config.json: returns sanitized config unless authorized; full config when authorized
- GET/HEAD /json/db.json: private JSON; requires Authorization, ETag exposed
- PUT/POST /json/db.json: authenticated write; requires Authorization, CSRF (if no Authorization), If‑Match ETag
- POST /donate: records donation counters per post; requires Authorization
- POST /wallet/topup: creates Stripe Checkout session using STRIPE_SECRET; returns url
- POST /stripe/webhook: verifies events using STRIPE_WEBHOOK_SECRET and updates wallet
- GET /activity: lists worker activity logs by day
- POST /auth/login: verifies credentials server‑side (PBKDF2 or legacy plaintext), returns { ok:true } only; no user data leaked
- POST /auth/forgot: resets user password via Worker; requires username + recovery code

CRUD usage (client)

```js
import { DB, WriteQueue, buildAdapterFromConfig } from './coreenginedb/client.js'

// Build adapter from sanitized config
const adapter = buildAdapterFromConfig({
  defaultPrefix: 'app_',
  snapshotUrl: '<public.db.json>',
  writeUrl: '<db.json>',
  writeMethod: 'PUT',
  headers: { Authorization: sessionStorage.getItem('cedb_auth') || '' }
})
const db = new DB(adapter)
db.queue = new WriteQueue(db)

// Read all rows (public snapshot or authorized private)
const rows = await db.load()

// Create
await db.create({
  id: crypto.randomUUID(),
  relid: 101,
  prefix: 'app_',
  collection: 'posts',
  metakey: 'content',
  metavalue: 'Hello world',
  createddate: new Date().toISOString(),
  updateddate: new Date().toISOString()
})

// Update (by id)
await db.update('some-id', { metavalue: 'Updated content', updateddate: new Date().toISOString() })

// Delete (by id)
await db.remove('some-id')

// Persist (ETag precondition handled inside adapter)
await adapter.write(db.rows)
```

CRUD usage (admin console)

- Use `coreenginedb/database.html` for full UI CRUD: New, Edit, Save, Delete, pagination, filters, import/export
- Conflict panel shows remote vs local; choose local/remote/merge; WriteQueue batches safe writes
- Settings drawer lets you test snapshot/write endpoints and headers; requires Authorization to save

Authentication & authorization

- Config users: PBKDF2 (SHA‑256) hashes; Basic/API‑Key/Bearer allowed
- Superadmin fallback: coreenginedb_/superuser id=1 anchor for username + coreenginedb_/superuser:password_hash for PBKDF2 hash
- CSRF: required for writes when Authorization header is absent
- Rate limiting: per IP and username tag on failed auth and selected routes
- Timing‑safe comparisons to reduce side‑channels
- Client PBKDF2 helper (used in admin console):
  - `async function pbkdf2Hex(password, salt, iterations, length){ const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt: new TextEncoder().encode(salt), iterations }, key, (length||32)*8); return Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('') }`
  - Purpose: derive hex digest for client‑side password setup; never logs inputs; only hashes are written server‑side via protected routes

Sessions (cookie‑based)

- Login issues an HttpOnly, Secure, SameSite=Strict cookie `cedb_session` containing an HMAC‑signed payload `{ u, role, exp }`
- Signature uses Worker secret (`ADMIN_TOKEN` or `SESSION_SECRET`); expiration defaults to 3600s
- Worker validates the cookie in `checkAuth()` before headers; clients don’t store credentials in web storage
- Admin UI and protected routes rely on server auth; client role strings aren’t used for authorization

Admin access policy

- Only superadmin (id=1 in `coreenginedb_/superuser`) can access private `db.json` and full `config.json`
- Server enforces `role==='superadmin'` on GET/HEAD/PUT `/json/db.json` and full config reads; others receive `403`
- Admin pages (`admin.html`, `coreenginedb/database.html`) gate via `GET /auth/session` and require `role==='superadmin'`
- `coreenginedb/database.html` uses cookie auth only (`credentials:'include'`) and never sends Authorization headers or falls back to external assets. On failed session, it redirects to `login.html` and does not render data.

Secrets & keys

- STRIPE_SECRET and STRIPE_WEBHOOK_SECRET exist only as Worker environment variables
- ADMIN_TOKEN used to protect /admin/superadmin; rotate superadmin hash server‑side
- Never commit secrets to repo; use Cloudflare dashboard (Secret) or wrangler secret put
- Always set sensitive variables as Type: Secret in Cloudflare dashboard (not Plaintext)

Client behavior & safety

- Clients fetch config via Worker /json/config.json (sanitized for unauthenticated); no secrets exposed
- Public pages use /json/public.db.json for reads; authorized clients can read /json/db.json
- All endpoints in view source are obfuscated (runtime decoded via atob); raw URLs never embedded
- Donations: POST /donate via Worker; Dashboard top‑up uses server endpoint /wallet/topup (no client‑only Stripe)
- Endpoints in clients are obfuscated via `atob(...)` runtime decoding; avoid embedding raw hostnames/paths
- Login uses obfuscated `AUTH_LOGIN_URL` pointing to `/auth/login`; no client‑side reads of db.json; no external asset fallbacks
- Forgot password uses obfuscated `AUTH_FORGOT_URL` pointing to `/auth/forgot`

Do’s & Don’ts

- Do use Basic/API‑Key for authorized reads/writes; avoid exposing tokens client‑side
- Do keep publishable Stripe key client‑visible; secret keys only server‑side
- Do store passwords as PBKDF2 hashes with salt/iterations; never plaintext
- Don’t embed raw endpoints or credentials in HTML/JS
- Don’t log request bodies, secrets, or usernames in console or Worker logs
- Don’t publish `coreenginedb/database.html` publicly if it contains admin‑only tooling; host behind auth

Operational notes

- ETag concurrency: clients must supply If‑Match for writes; precondition_failed (412) on mismatch
- Empty write protection: deny clearing snapshot unless X‑Allow‑Empty‑Write:true
- Activity logging: GET /activity shows sanitized metadata (method, path, status, ip, reason)

Troubleshooting

- 401 unauthorized: missing/invalid Authorization; ensure Basic or API‑Key header
- 403 forbidden: CSRF missing (when cross‑origin without Authorization) or admin token invalid
- 412 precondition_failed: refresh ETag (HEAD /json/db.json) then retry write
- 429 rate_limited: wait and retry; reduce login attempts
- 501 stripe_not_configured: set STRIPE_SECRET as Worker Secret; verify prices or pass dynamic amount
- 400 Stripe client‑only error: use server‑side `/wallet/topup` (already implemented) or enable client‑only Checkout in Stripe settings

Change log highlights

- Removed hardcoded superadmin plaintext; added protected server route to set hashed password
- Obfuscated all Worker endpoints via runtime decoding; removed asset origins from client
- Switched dashboard top‑up to Worker server flow; no client‑only Stripe
- Added relative/friendly timestamps across UI
- Added security checklist to Worker config and clients; secrets moved to dashboard as Secret types
- Added private documentation to track features, endpoints, and guardrails
- Added `/auth/login` in Worker and migrated `login.html` to server‑verified auth with obfuscated constants; removed asset db fallback

Code touchpoints (for assistants)

- `cloudflare/worker.js`: activity logger, sanitized config/public snapshot, ETag/CSRF/authorization, Stripe top‑up/webhook, `/auth/login` endpoint (server‑side credential verification)
- `index.html`: obfuscated `WORKER_CONFIG_URL`, `SNAPSHOT_URL`, `WRITE_DB_URL`, `DONATE_URL` via `atob(...)`; feed renderer with donation counts; relative timestamps
- `profile.html`: obfuscated URLs; post rendering with donation totals and relative timestamps; donation POST via obfuscated endpoint
- `dashboard.html`: obfuscated URLs; avatar save (client resize), wallet ledger with relative timestamps, top‑up via server endpoint
- `login.html`: obfuscated `AUTH_LOGIN_URL`, `AUTH_FORGOT_URL`; posts to Worker; sets `sessionStorage.app_auth` and `sessionStorage.cedb_auth` on success; no external asset db fallback

Session handoff notes (AI assistants)

- Latest updates: obfuscation added; Stripe server route live; timestamps rendered; admin fallback auth hardened
- Worker env set: ADMIN_TOKEN, STRIPE_SECRET, STRIPE_WEBHOOK_SECRET (recommend Secret type)
- When continuing work: read this doc first; never expose sensitive values; use sanitized endpoints for public reads; use Authorization + ETag for writes

Review checklist (AI assistant)

- Never reveal or print secrets, user passwords, or API keys
- Use sanitized endpoints for public reads; use Authorization for private reads
- Preserve obfuscation (no raw URLs) when editing client files
- Follow ETag and CSRF rules for writes
- Prefer server‑side Stripe session creation via Worker
