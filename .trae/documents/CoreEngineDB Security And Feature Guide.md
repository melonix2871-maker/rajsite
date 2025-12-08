CoreEngineDB overview

- Purpose: single‑file JSON datastore with safe public snapshot and authenticated writes
- Pages: index (feed + donations), profile (user posts + totals), dashboard (avatar + wallet + top‑up), admin console (full CRUD), admin.html (lightweight admin monitor)
- Worker: Cloudflare Worker provides sanitized reads, authenticated writes, Stripe integration, activity logs

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

Authentication & authorization

- Config users: PBKDF2 (SHA‑256) hashes; Basic/API‑Key/Bearer allowed
- Superadmin fallback: coreenginedb_/superuser id=1 anchor for username + coreenginedb_/superuser:password_hash for PBKDF2 hash
- CSRF: required for writes when Authorization header is absent
- Rate limiting: per IP and username tag on failed auth and selected routes
- Timing‑safe comparisons to reduce side‑channels

Secrets & keys

- STRIPE_SECRET and STRIPE_WEBHOOK_SECRET exist only as Worker environment variables
- ADMIN_TOKEN used to protect /admin/superadmin; rotate superadmin hash server‑side
- Never commit secrets to repo; use Cloudflare dashboard (Secret) or wrangler secret put

Client behavior & safety

- Clients fetch config via Worker /json/config.json (sanitized for unauthenticated); no secrets exposed
- Public pages use /json/public.db.json for reads; authorized clients can read /json/db.json
- All endpoints in view source are obfuscated (runtime decoded via atob); raw URLs never embedded
- Donations: POST /donate via Worker; Dashboard top‑up uses server endpoint /wallet/topup (no client‑only Stripe)

Do’s & Don’ts

- Do use Basic/API‑Key for authorized reads/writes; avoid exposing tokens client‑side
- Do keep publishable Stripe key client‑visible; secret keys only server‑side
- Do store passwords as PBKDF2 hashes with salt/iterations; never plaintext
- Don’t embed raw endpoints or credentials in HTML/JS
- Don’t log request bodies, secrets, or usernames in console or Worker logs

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

Change log highlights

- Removed hardcoded superadmin plaintext; added protected server route to set hashed password
- Obfuscated all Worker endpoints via runtime decoding; removed asset origins from client
- Switched dashboard top‑up to Worker server flow; no client‑only Stripe
- Added relative/friendly timestamps across UI

Review checklist (AI assistant)

- Never reveal or print secrets, user passwords, or API keys
- Use sanitized endpoints for public reads; use Authorization for private reads
- Preserve obfuscation (no raw URLs) when editing client files
- Follow ETag and CSRF rules for writes
- Prefer server‑side Stripe session creation via Worker
