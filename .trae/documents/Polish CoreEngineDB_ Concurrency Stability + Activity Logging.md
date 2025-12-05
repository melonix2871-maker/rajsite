## Stability Review (Current)
- Worker uses ETag based on SHA-256 of current object. PUT/POST optionally send `If-Match`; on mismatch returns 412.
- Validates JSON before writing: `db.json` must be an array, `config.json` must be an object; writes are pretty-printed.
- Denies accidental clearing: for `db.json`, if previous length > 0 and new length == 0, rejects unless `X-Allow-Empty-Write: true`.
- Console write queue re-reads after write and checksum-verifies content; maintains a local queue and lock to avoid multi-tab conflicts.

## Identified Gaps
- Writes without `If-Match` still succeed (last write wins), allowing overwrite in rare misconfigured clients.
- Activity endpoint is not implemented; console’s Activity tab currently shows 404 or empty; requests are not recorded.
- Activity persistence should avoid race conditions and large-object append complexity.
- Cross-origin security: CSRF is relaxed for authenticated writes; origin allowlist is not enforced.

## Enhancements (No Code Yet)
1. Require `If-Match` for all mutating requests
- Enforce on the Worker: reject PUT/POST without `If-Match` (400 `missing_if_match`).
- Rationale: forces clients to perform HEAD and prevents accidental last-write-wins.

2. Implement Activity Logging
- Write per-event records to R2 under `activity/YYYY/MM/DD/<uuid>.json` (object-per-event) to avoid append races.
- Record fields: `ts`, `method`, `path`, `status`, `size`, `user` (Basic username or `apikey`), `ip` (if available via `req.headers.get('cf-connecting-ip')`), and `reason`.
- Log on all handled routes: GET, HEAD, PUT, POST for `config.json` and `db.json`.
- Provide `GET /activity` endpoint:
  - Accepts optional `?day=YYYY-MM-DD` and `?limit=N`.
  - Lists objects by prefix for the selected day, reads them, returns an array sorted by `ts`.
  - Default: last 24h capped to `limit` (e.g., 500).

3. Harden JSON Validation
- Keep strict type checks; add a `maxSize` guard (e.g., 2–5 MB) to prevent oversized payloads.
- Reject non-UTF8 or invalid `createddate/updateddate` formats (optional).

4. Origin Allowlist (Optional)
- Set `Access-Control-Allow-Origin` only to `https://kwentonglasing.servebeer.com` and your GitHub Pages domain.
- Maintain permissive mode for now; plan migration to allowlist when testing completes.

## App Integration (No Code Yet)
- Console Activity Tab: keep existing fetch to `<worker-origin>/activity`; it will render once the endpoint is present.
- Ensure all writes already send `If-Match`; reads continue from assets; writes go to Worker.
- Admin and registration: minimal headers (`Content-Type`, `If-Match`, plus `Authorization` or `X-API-Key`).

## Verification
- Concurrency: run two clients; client A HEAD→ETag1; client B writes→ETag2; client A PUT with `If-Match: ETag1` gets 412; A refreshes and retries → 200.
- Activity: perform GET/HEAD/PUT; `GET /activity?day=<today>` shows entries with accurate method/path/status/user.
- Size limits: attempt oversized PUT; receive 413-like custom error.

## Next Steps
- I will implement Worker changes for `If-Match` required, activity logging per-event, and new `/activity` endpoint.
- I will leave assets reads unchanged; no app code changes needed except optionally surfacing activity filters (day, limit).