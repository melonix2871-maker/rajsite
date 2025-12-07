## Issue
- GET https://coreenginedb.meoasis2014.workers.dev/json/public.db.json returns 404 (“Not found”).
- Likely cause: the worker treats the public path correctly in path guard, but `key` is set to '' for public, which may not be fully handled in HEAD/GET and could hit the 404 early depending on deployment.

## Changes
- Worker: set `key = 'db.json'` when `isPublicDb` so reads use the same storage object, then sanitize before responding.
- Worker: ensure the path allowlist includes `isPublicDb` for GET and HEAD (it already does, but we’ll recheck and keep consistent).
- Index/Profile fallback: if `public.db.json` GET fails (404), and user is authenticated, attempt authorized GET `/json/db.json` and render; otherwise show a friendly “feed unavailable” message. No secrets are exposed.

## Verification
- GET /json/public.db.json now returns sanitized posts/users/donations with 200 and ETag.
- HEAD /json/public.db.json returns ETag for the sanitized content.
- index.html/profile.html read the public snapshot; if 404, authorized users fall back to full snapshot.
- Activity captures both reads with clear reason codes.

## Security
- Sanitization remains: public snapshot only includes posts, usernames, avatars, and donations; never includes sensitive rows.
- Private reads still require Authorization; no changes to secrets or config exposure.

Proceed to implement the worker adjustment and client fallback and re-test.