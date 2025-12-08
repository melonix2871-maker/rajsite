## Facts
- Only `https://coreenginedb.meoasis2014.workers.dev` serves `/auth/*`. GitHub Pages (`kwentonglasing.servebeer.com`) cannot serve `/auth/*` and returns 404/405. The assets bucket also does not serve `/auth/*` and blocks CORS.
- Your login page currently tries all three bases. Results you saw match this: 401 on Worker (credentials mismatch), 405 on GitHub Pages (no route), and CORS failure on assets.

## Changes
- Update `login.html` to call only the Worker base for auth (`/auth/login`, `/auth/session`). Keep allowed origins as-is, but don’t attempt `/auth` on non-Worker domains.
- Improve login error messaging to distinguish between bad credentials vs unreachable base.
- Admin console (`coreenginedb/database.html`): wrap inline JS in a single IIFE to avoid any block-scope redeclaration if scripts are ever injected twice.

## Worker Status
- `/auth/login` already hardened to return 401 instead of 500 on malformed/unknown password formats.
- Supports superadmin plaintext fallback and user passwords as plaintext, JSON strings `{hash,salt,iterations}`, and direct objects.

## Validation
- Test from `https://kwentonglasing.servebeer.com/login.html` using sample accounts (juniedev, lukiecookie, Tukmol1, Dan1, chapipi, and superadmin). Expect 200 on Worker `/auth/login`, `{ ok:true, role }` on `/auth/session`, and role-based redirects.

## Safety
- No sensitive data is exposed; endpoints remain obfuscated; Worker CORS stays limited to your three origins; Activity omits usernames; JSON has `X-Robots-Tag`.

I’ll implement the login change (Worker-only), wrap admin script with an IIFE, and adjust messages, then redeploy and verify against your dataset.