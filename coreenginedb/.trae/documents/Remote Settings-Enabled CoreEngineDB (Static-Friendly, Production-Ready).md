## Overview
Enable CoreEngineDB to run on static hosts (GitHub Pages, Netlify) while supporting read/write to remote JSON endpoints. Keep the current single-file UX and admin features intact, add a Settings panel to configure remote URLs, and strengthen concurrency and reliability with ETag/If‑Match, an outbox queue and graceful fallback to local storage.

## Objectives
1. Preserve current admin UI, write queue, conflict panel, filters, pagination, and auth.
2. Add Settings to configure remote snapshot and write endpoints plus headers.
3. Use remote snapshot for reads and remote write endpoint for writes when available.
4. Improve safety with ETag/If‑Match and clear conflict resolution.
5. Keep offline/local operation via IndexedDB/LocalStorage when remote is unavailable.

## User-Facing Changes
1. Settings panel in the admin UI:
   - Snapshot URL (`GET /db.json`)
   - Write URL and Method (`PUT/POST`)
   - Headers (JSON key/value)
   - Optional: multiple snapshot URLs to aggregate; per-prefix/collection write URL
   - Actions: Test Connection, Save, Reset to defaults, Export/Import settings JSON
2. Status bar additions:
   - Connection status (Connected/Unavailable/CORS error)
   - Queue count and last sync time
3. Non-blocking notifications:
   - “Your data is processing (#queueId)” → “Your data completed sync” / “Failed to sync”

## Technical Implementation
1. Settings persistence:
   - Store under `localStorage: cedb_settings`
   - Schema: `{ snapshotUrl, writeUrl, writeMethod, headers, aggregateUrls?:[], perPrefixWrite?:{[prefix]:{url,method,headers}} }`
   - Load on init; merge into `config.http` dynamically (without changing `json/config.json`)
2. Adapter override:
   - If Settings exist, `HttpAdapter` uses Settings for `read()`/`write()`
   - If write fails (network/CORS/HTTP), return error codes; caller sets outbox status
3. ETag/If‑Match:
   - On `GET snapshotUrl`, capture `ETag` (or `Last-Modified`) into `localStorage: cedb_etag`
   - On `PUT writeUrl`, send header `If-Match: <ETag>`; on `412 Precondition Failed` open conflict panel
   - After successful write, refresh snapshot and update stored `ETag`
4. Aggregation (optional, if multiple URLs configured):
   - Fetch all `aggregateUrls`, merge arrays client-side (stable by `id`, tie-break by `updateddate`)
   - Show source badges per row (optional UI tag with origin)
5. Outbox queue (existing foundation):
   - Enqueue CRUD ops (create/update/remove) with `opId` and `clientId`
   - Attempt remote write; on success mark `synced`, on conflict mark `failed` and open panel
   - Retry with backoff; show queue counts and latest status in footer
6. Fallback strategy:
   - If Settings absent or remote unavailable, operate fully on IndexedDB/LocalStorage
   - If remote read fails, show “Remote snapshot unavailable” but allow local work and queue writes for later
   - If remote write fails and local queue exists, do not lose data; allow user to export queue

## Concurrency & Safety
- Whole-file writes guarded by `ETag`/`If‑Match`; conflicts trigger the existing merge panel.
- For scale, recommend (documented) per-record ops endpoint (`POST /ops`) with idempotency keys; still publish `db.json` for simple readers. SDK supports both, prioritizing ops when available.

## Security
- Do not store secrets persistently in Settings; allow headers for short-lived tokens.
- Server must enforce RBAC; client `ensureAuth` remains UX-only.
- CORS: document required headers on remote (allow origin, methods, headers; handle preflight).

## Verification
1. Test Connection button:
   - Read snapshot (expect 200, parse JSON, record `ETag`)
   - OPTIONS/HEAD for write endpoint (confirm CORS and method allowed)
2. Functional tests:
   - CRUD with Settings on/off; outbox transitions queued→processing→synced
   - Conflict scenario: stale `ETag` returns 412; conflict panel opens; “Use Local/Remote/Merge” works
   - Offline case: remote unavailable; local edits persist to IndexedDB; queued ops retry later
3. Performance checks:
   - Large list pagination; virtualized DOM remains responsive
   - Media via URLs only; reject oversized base64 payloads

## Backwards Compatibility
- No changes to record schema.
- Defaults remain `LocalStorage` unless Settings override.
- Self-test remains functional; if Settings present, extend self-test to check remote write and conflict handling.

## Rollout Steps
1. Implement Settings UI (read/save/reset/export/import) and adapter override.
2. Add ETag capture and If‑Match header usage in HTTP writes.
3. Wire Test Connection and status bar indicators.
4. Extend outbox statuses and retries; surface queue in UI (already present, enhanced).
5. Add docs: remote server requirements, example Cloudflare/AWS recipes, schema.
6. Validate end-to-end on static hosting (GH Pages) with a sample remote JSON host that supports CORS and PUT/POST.

## Deliverables
- Updated single-file admin with Settings and safe remote read/write.
- SDK docs and examples for static deployment and remote configuration.
- Optional serverless templates (Workers/Lambda) for teams that need per-record ops + compaction.

Confirm this plan and I’ll implement it while preserving current behavior.