## Additions For Activity u0016 Security
- Ensure every request (GET/HEAD/POST/PUT/PATCH) to worker endpoints logs an activity record with method, path, status, size, user, reason. Current worker already logs these; extend new endpoints to include specific reason codes (topup_init, webhook_ok, donate, reset, etc.).
- Keep the Activity viewer in `coreenginedb/database.html`: refreshes via `/activity` (already implemented) but never shows Authorization or secret values; retain minimal payload view only.
- Remove any debug console logging of credentials across pages; confirm no `console.log` of Authorization, config, or keys.
- Maintain sanitized unauthenticated `GET/HEAD /json/config.json` and keep public assets JSON free of secrets (no `apiKeys`, no plaintext passwords).

## Pages Linking u0016 Posting
- Update `index.html` to show `Profile` and `Dashboard` links when logged in; redirect unauthenticated users from “Share it!” to `login.html`.
- Make the stories list dynamic by reading `app_/posts` and rendering content, avatars, and donation buttons.
- Add posting to `dashboard.html` to create new stories and keep them in the user’s own list.

## Admin (Stripe)
- Add settings section in `admin.html` for Stripe Publishable Key and Price IDs; save to `config.json` via authorized write (no secrets in unauthenticated view).
- Keep `SECRET_KEY` and webhook secret only as Worker environment variables, not in any public JSON.
- Add admin views for users, posts, donations, wallet ledger, and withdrawals queue.

## Activity Coverage
- Confirm activity logging on:
  - `GET/HEAD /json/config.json` (sanitized view)
  - `GET/HEAD /json/db.json`
  - `PUT/PATCH/POST /json/db.json` (ETag and reason codes)
  - `POST /wallet/topup`, `/stripe/webhook`, `/donate`, `/auth/forgot`, `/journal`, `/compact` (each with distinct reason strings)

## Assets Hygiene
- Scrub `https://assets.antserver1.eu.org/config.json` and `db.json` of any secrets or plaintext credentials; keep them strictly public-safe.

## Required Inputs
- Provide Stripe env vars in Worker (secret, webhook secret) and final price IDs for bottle/bucket/case.

## Next Implementation Steps
- Link pages and implement posting flow in `index.html` using SDK (ETag-safe writes) and login gating.
- Extend `admin.html` UI for Stripe configs and monitoring, wired to authorized config writes.
- Verify activity logs for all new endpoints and maintain no leakage in View Source/Console.

On confirmation, I’ll implement these changes and test end-to-end while preserving theme and responsiveness.