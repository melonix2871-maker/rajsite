## Goals
- Read data from your public endpoints: https://assets.antserver1.eu.org/config.json and https://assets.antserver1.eu.org/db.json
- Use a Cloudflare Worker (R2-backed) for authenticated writes (PUT) to /json/config.json and /json/db.json
- Fix config.js 404 by generating it in CI with correct URLs

## Runtime Config
- Update CI to generate `config.js` with:
  - `window.__CONFIG = { coreengine: { readConfigUrl: 'https://assets.antserver1.eu.org/config.json', readDbUrl: 'https://assets.antserver1.eu.org/db.json', writeConfigUrl: 'https://coreenginedb.meoasis2014.workers.dev/json/config.json', writeDbUrl: 'https://coreenginedb.meoasis2014.workers.dev/json/db.json' } }`
- Pages use read* URLs for GET/HEAD, write* URLs for PUT/POST; Basic auth only on write endpoints

## Page Changes
### index.html
- Fetch from `readDbUrl` and render table
- Map schema keys: support both `datecreated`/`dateupdated` and `createddate`/`updateddate` when rendering
- Keep Admin Login button; no auth needed for reading

### login.html
- Sign In: `HEAD writeDbUrl` with `Authorization: Basic base64(username:password)`; on 200 save `sessionStorage.cedb_auth` and redirect to admin
- Register (server-auth option): read `writeConfigUrl`, merge new user `{username, hash, salt, iterations}` into `auth.users`, PUT with `If-Match` and admin Basic
- Register (app-level option): alternatively write hashed user into `readDbUrl` is not possible (static) → keep server-auth path only

### admin.html
- Session guard using `sessionStorage.cedb_auth`
- Read: `GET writeDbUrl` (Worker responds with CORS + ETag)
- Write: `PUT writeDbUrl` with `If-Match` and `Authorization` (Basic)
- Update fields: set `datecreated` on create, update `dateupdated` on edit; tolerate `createddate/updateddate` on read

## CI/CD
- `.github/workflows/build.yml`: update the config generation step to emit the four URLs (read vs write)
- Deploy to gh-pages so `config.js` is published (resolves the current 404)

## Verification
- Browse `https://kwentonglasing.servebeer.com/` → banner shows `✅ config.js loaded`; index shows rows from assets `db.json`
- Login → HEAD to Worker `writeDbUrl` succeeds with valid Basic; session stored
- Admin → create/edit/delete writes succeed; ETag changes; `412` seen on concurrent mismatch

## Notes
- Direct writes to assets host are not possible; Worker provides write API, CORS, auth and ETag
- If you want JSON under your domain, later set a Worker route on `kwentonglasing.servebeer.com/json/*` by moving DNS to Cloudflare; for now use workers.dev
- Provide initial `config.json` user with PBKDF2 hash/salt/iterations to avoid relying on default fallback