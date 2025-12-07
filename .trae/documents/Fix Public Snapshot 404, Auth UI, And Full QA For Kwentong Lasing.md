## Root Causes To Address
- Public snapshot 404: Ensure `GET/HEAD /json/public.db.json` points to `db.json` and returns sanitized content, not a 404. Confirm route allowlist and key selection.
- Auth UI state: Profile/Dashboard show “Login” because `app_auth` or header UI logic isn’t firing consistently; unify login UI code and guard redirects.
- Dummy content: Remove static sample post from `index.html` to avoid confusion with dynamic feed.
- Admin completeness: Verify monitoring tabs, Stripe settings read/write, authorized reads/writes to CoreEngineDB.

## Worker Fixes
1. Public route key binding
- Set `key = 'db.json'` when `isPublicDb` so public path reads the same KV value that backs the snapshot.
- In GET/HEAD handlers, branch on `isPublicDb` to sanitize rows (posts, usernames, avatars, donations) and return 200 + ETag.
- Keep private `GET/HEAD /json/db.json` gated by Authorization with 401 on unauth.
2. Logging and CSP
- Ensure `logEvent` records `public_snapshot` reasons for public reads and `unauthorized_read` for private.
- Confirm CSP `connect-src *` allows site pages to fetch the worker.

## Client Fixes
1. Feed fallback
- `index.html` and `profile.html`: Read from `/json/public.db.json`. If a fetch returns 404 or invalid JSON, and user is authenticated, fallback to authorized `GET /json/db.json` to avoid feed breakage.
2. Auth UI consistency
- In `profile.html` and `dashboard.html`, add shared `setLoginUI()` that updates header text/link to Welcome and hides the login button when `app_auth` exists; redirect unauthenticated dashboard to `login.html`.
3. Remove dummy posts
- Delete the static sample post block from `index.html`; rely exclusively on dynamic render.
4. Posting and donations
- Ensure posting requires login; writes include Authorization + current ETag.
- Donation buttons call `/donate` and refresh counts in feed/profile.

## Admin Enhancements
1. Monitoring tabs
- Users/Posts/Donations/Wallets/Withdrawals/Activity/Stripe present and functional (authorized read).
- Add client-side filters (by username, relid, date) and sorting for tables.
2. Stripe settings
- Read/write publishable key and price IDs to worker `config.json` with `If-Match` ETag.
- Keep secrets (`sk_`, `whsec_`) in Worker environment only.

## QA Matrix
- Anonymous: public feed loads from `/json/public.db.json`; cannot post; donate prompts login.
- Authenticated user: login sets `app_auth` + `cedb_auth`; index posting works; profile shows posts; dashboard shows wallet and avatar upload.
- Superadmin: admin monitoring tabs load with authorized `db.json`; Stripe settings writable; Activity shows reads/writes and Stripe events.
- Forgot password: reset via recovery code; login succeeds with new password.
- Stripe: top-up returns Checkout URL; webhook credits wallet and logs `webhook_ok`.

## Deliverables
- Worker public route confirmed returning sanitized content.
- Clients updated with fallback and consistent auth UI; dummy post removed.
- Admin monitoring filters/sorting added; all tabs verified.
- Full test pass of login/logout/forgot, posting, donations, admin reads/writes, and activity logging.