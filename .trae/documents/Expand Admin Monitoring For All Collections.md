## Monitoring Scope
- Users: list and summary (username, relid, avatar, created/updated)
- Posts: list and per-user counts; content preview and timestamps
- Donations: per-post counters (bottles/buckets/cases) and USD totals; top donors/recipients
- Wallets: balances and recent ledger entries (topups/donations)
- Withdrawals: requests with statuses (pending/approved/paid), amounts and users
- Activity: recent activity from worker `/activity` endpoint with filters (method/path/status/reason)
- Stripe: last top-up sessions (from activity), configuration (publishable key + price IDs) read-only view

## Data Sources
- Authorized `GET /json/db.json` for internal monitoring data (users/posts/wallets/donations/withdrawals)
- `GET /activity?day=YYYY-MM-DD&limit=500` for worker activity entries (method/path/status/size/user/reason)
- Authorized `GET /json/config.json` for Stripe publishable key and price IDs (no secrets)

## Admin UI Additions (admin.html)
- Add “Monitoring” tabs: Users, Posts, Donations, Wallets, Withdrawals, Activity, Stripe
- Each tab renders a table with sortable columns and a header summary (totals)
- Filters: by relid/username, collection, date (client-side)
- Keep dark/orange theme and responsive grid; reuse existing table styles

## Implementation Details
- Build a single `fetchAll()` that authorized-reads `db.json`, `config.json`, and `/activity`
- Compute:
  - Users map by `relid` and attach avatar
  - Posts list and counts per user
  - Donations totals per post and USD aggregate
  - Wallet balances from `wallet_/balance` and ledger from `wallet_/ledger`
  - Withdrawals list from `withdraw_/requests`
- Render summary cards (counts and totals) + tables for details per tab
- No secret exposure: do not show Authorization or env values; Stripe secrets remain server-side only

## Security
- Only authorized admin can access monitoring; unauthorized reads return 401
- Do not display `apiKeys`, `auth.users` hashes, or any secrets in UI
- Public pages continue reading `/json/public.db.json` only

## Verification
- Seed test data or use existing entries; validate totals match rows
- Confirm `/activity` shows recent GET/HEAD/POST/PUT with reasons (topup_init, webhook_ok, donate, unauthorized_read)
- Confirm monitoring updates after top-up, donation, posting, and withdrawals status changes

## Deliverables
- Update `admin.html` to include full monitoring tabs and data rendering
- Utility functions to compute summaries; client-side filters
- No changes to worker secrets or public JSON behavior