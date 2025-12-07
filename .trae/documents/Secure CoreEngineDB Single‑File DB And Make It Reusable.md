## Objectives
- Guarantee stability and sync across GitHub Pages, Cloudflare Workers + KV/R2, and the admin UI.
- Ensure every request is logged; prevent accidental full data deletion.
- Introduce sharding to scale concurrent writes.
- Keep the system reusable for multiple apps.

## Operational Stability
1. Single Source of Truth
- Keep `db.json` snapshot in KV (or R2). All writes go through the Worker; GitHub Pages only reads.
- Admin UI writes use ETag `If-Match`; queue auto-resolves conflicts and never overwrites.

2. Activity Capture
- Worker `/activity` already logs GET/HEAD/PUT/PATCH with status, size, user. Confirm HEAD and error paths are recorded (they are).
- Ensure admin UI viewer points to the write server origin and refreshes periodically (already done).

3. Deletion Safety
- Keep `empty_write_denied` unless `X-Allow-Empty-Write: true` and Authorization.
- Add client confirm for last-record deletion (already present) and server-side guard only for full clears.
- Optional: daily immutable backup (R2 path `snapshots/YYYY-MM-DD.json`).

## Sharding Design
1. Durable Objects (DO) Shards
- Create `DbShardDO` keyed by shard id (e.g., `collection` or day). All writes route to DO for that shard.
- DO loads latest shard snapshot, applies changes, writes back to KV/R2, emits new ETag.

2. Journal + Compaction
- DO appends each mutation to `journal/{day}/{uuid}.json` in R2.
- Nightly cron compacts journals into a single shard snapshot and rotates ETags.

3. Read Path
- Public GET reads consolidated snapshots from KV/R2; authorized clients can request shard or full views.

## Reusability For More Apps
- Extract client SDK (`coreenginedb/client.js`) with `DB`, `WriteQueue`, `HttpAdapter`.
- Apps configure via `window.__CEDB` (`snapshotUrl`, `writeUrl`, `headers`) and import the SDK.

## Cloudflare Free Tier Notes
- Workers Free handles low/moderate traffic; KV and R2 free tiers support basic storage/reads. For heavy concurrent writes, use DO (often requires paid tier) or D1.
- Conclusion: Free plans are fine for dev and small prod; scale needs paid features.

## Deliverables
- Implement DO-based shard write path (worker updates) and R2 journal.
- Add SDK and refactor admin UI to use it.
- Add backup cron and verification docs.

Proceed to implement the sharded write path, client SDK extraction, and stability/backup steps, while preserving existing behavior.