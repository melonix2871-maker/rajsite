## Goals
- Use CoreEngineDB for both auth and CRUD via your remote endpoints
- Remove Firebase Auth and GitHub Gist integration
- Make `index.html`, `login.html`, `admin.html`, `db.html` work against `REMOTE_DB_CONFIG` and `REMOTE_DB_JSON`

## Runtime Config
- Generate `config.js` in CI with:
  - `window.__CONFIG = { coreengine: { configUrl: '${REMOTE_DB_CONFIG}', dbUrl: '${REMOTE_DB_JSON}' } }`
- Keep client-only config values; no secrets stored in code or repo

## Auth Model (Client → CoreEngineDB)
- Use Basic auth against CoreEngineDB (username/password) per `config.json` auth settings
- Store session token only in memory (`sessionStorage`), formatted as `Authorization: 'Basic ' + btoa(username + ':' + password)`
- For writes, include `If-Match` with last ETag to avoid conflicts

## Page Updates
### index.html
- Remove Firebase scripts and usage (`<script src="firebase-*">` and auth UI)
- Remove php-wasm pipeline and `db.html` parsing; fetch JSON directly from `coreengine.dbUrl`
- Render existing table using fetched array; keep name/country filters
- If remote read requires auth, conditionally prompt to go to `login.html`

### login.html
- Replace FirebaseUI with a simple username/password form
- On submit:
  - Try `HEAD` or `GET` on `coreengine.dbUrl` with `Authorization: Basic ...`
  - On 200, save `Authorization` to `sessionStorage` and redirect to `admin.html`
  - On 401, show error
- Keep a small `config.js` load check for diagnostics

### admin.html
- Remove Firebase guard and all Gist logic
- Guard page by presence of `Authorization` in `sessionStorage`; if missing, redirect to `login.html`
- Implement `HttpAdapter`:
  - `read`: `GET coreengine.dbUrl`, cache `ETag` in `localStorage('cedb_etag')`
  - `write`: PUT/POST `coreengine.dbUrl` with `If-Match` and `Authorization`, body is full array (pretty JSON)
- CRUD:
  - Create: `id = crypto.randomUUID()`, fill `datecreated` and `dateupdated`
  - Update: modify record, set `dateupdated`
  - Delete: filter out by `id`
- Add Logout button: clear `sessionStorage` and redirect to `login.html`

### db.html
- Mirror `admin.html`’s guard and adapter; keep the grid CRUD UI already present
- Remove Gist import/export instructions; keep client-side export/import, but writes go to CoreEngineDB

## CI/CD: `.github/workflows/build.yml`
- Remove “Fetch Gist content” step and `records.json` copy
- Remove Firebase env usage and generation
- Add a step that writes `config.js` using `REMOTE_DB_CONFIG` and `REMOTE_DB_JSON` secrets
- Keep deploy list to include `admin.html`, `db.html`, `index.html`, `login.html`, `oauth-callback.html` (optional), `CNAME`, and `config.js`

## Cleanup
- Remove Firebase/Gist script tags and code blocks from all four pages
- Fix unresolved merge conflicts (`build.js`, `README.md`); either delete `build.js` (no longer needed) or simplify to noop
- Remove php-wasm dependency in `index.html`

## Verification
- Open `https://kwentonglasing.servebeer.com/` → `index.html` loads and shows rows from `REMOTE_DB_JSON`
- Go to `login.html`, sign in with CoreEngineDB credentials → redirected to `admin.html`
- Create/Edit/Delete records in `admin.html` and `db.html` → remote JSON updates; ETag changes; no 412 conflicts on sequential edits
- Check CoreEngineDB `/activity` reflects actions (optional)

## Notes
- CoreEngineDB server must send CORS and ETag headers (present by default in `write_server.py`)
- If your remote requires API Keys or Bearer tokens, adjust header assembly accordingly (read from `config.json` or a user input field)

If this plan looks good, I’ll implement the changes across the four pages and CI, remove Firebase/Gist, and wire up CoreEngineDB auth/CRUD end-to-end.