## Findings
- No environment secrets are embedded in client pages. We searched for `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_USER_ID`, `ASSETS_REMOTE_DB_CONFIG`, `REMOTE_DB_CONFIG`, `REMOTE_DB_JSON` and found only documentation references, not runtime code.
- Client pages do not load a `config.js` with secrets. The deployment workflow explicitly skips generating runtime config: `.github/workflows/build.yml:17-20`.
- Frontend uses fixed endpoints, not secrets: `login.html:239-243` and `admin.html:28-29` read/write to CoreEngineDB worker URLs; no secret keys are injected.
- GitHub secrets are used server-side only in the Actions workflow that updates a Gist: `.github/workflows/update_gist.yml:24-27`. These never reach the browser.

## Potential Risk
- Cloudflare worker returns `/json/config.json` on GET without auth (`cloudflare/worker.js:143-151`). If private fields like `apiKeys` are stored there, they would be publicly readable.

## Plan
1. Sanitize config GET response in worker
   - Modify `cloudflare/worker.js` to filter sensitive `auth.users` details and remove `apiKeys` from GET responses.
   - Option A: Keep a public subset (e.g., UI flags) and omit private fields.
   - Option B: Split into `public.json` and `config.json` (private) and only expose `public.json` unauthenticated.
2. Require auth for private config
   - Gate reading full `config.json` behind Authorization (`Bearer`/`Basic`/`X-API-Key`) while preserving unauthenticated access for `db.json` GET if required.
3. Verify zero secret exposure
   - Confirm no client file contains secret names using repo search.
   - Load pages and check `view-source`, DevTools console, and Network tab: ensure no `apiKeys`, `ADMIN_*`, `PAT_TOKEN`, `GIST_*` appear.
4. Regression checks
   - Validate login/register flows still read/write against worker endpoints (`login.html:296-327`) and admin write with Authorization (`admin.html:41-44, 47-74`).
   - Confirm Actions `update_gist.yml` still runs and continues to keep PAT/Gist-only server-side.

## Deliverables
- Updated worker with sanitized config responses and auth gating.
- Short verification report showing no secret traces on all pages and pages still function.

Proceed to implement the worker changes and run the verification steps?