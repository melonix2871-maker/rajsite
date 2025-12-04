# Clerk Auth + GitHub Gist Integration - Debugging Guide

## Architecture Overview

This is a static site deployed to GitHub Pages with:
- **Auth**: Clerk (client-side SDK with publishable key)
- **Storage**: GitHub Gist (records.json) read at build-time, persisted manually via Actions
- **Config**: Generated at build-time in `config.js` with secrets (CLERK_PUBLISHABLE_KEY, ADMIN_USER_ID, ADMIN_USERNAME)
- **Data Schema**: id, relid, prefix, collection, metakey, metavalue, datecreated, dateupdated

---

## Key Files & What They Do

| File | Purpose |
|------|---------|
| `index.html` | Public page, shows logged-in user, displays read-only data table |
| `login.html` | Clerk sign-in page, redirects to admin.html on success |
| `admin.html` | Admin form to create records, requires ADMIN_USER_ID + ADMIN_USERNAME match |
| `db.html` | Data table with full CRUD, requires admin auth, export/import/copy JSON |
| `config.js` | **Generated at build-time** with secrets (not in repo) |
| `.github/workflows/build.yml` | Fetches Gist, generates config.js, deploys Pages |
| `.github/workflows/update_gist.yml` | Manual workflow to update Gist from JSON |

---

## Common Issues & How to Debug

### Issue 1: Clerk Auth Not Working (Pages Accessible Without Login)

**Symptoms:**
- Admin/db pages are accessible without signing in
- Redirect to login.html is not happening
- "Auth not configured" error appears

**Root Causes:**
1. `config.js` is not being loaded before Clerk SDK
2. `config.js` is not being generated at build-time
3. `window.__CONFIG` is undefined when guard code runs
4. CLERK_PUBLISHABLE_KEY secret is not set in GitHub

**How to Debug:**

1. **Check if config.js exists and loads:**
   ```bash
   # Open browser DevTools Console on https://kwentonglasing.servebeer.com/
   # Run:
   console.log(window.__CONFIG)
   ```
   - Should print: `{ CLERK_PUBLISHABLE_KEY: '...', ADMIN_USER_ID: '...', ADMIN_USERNAME: '...' }`
   - If undefined, config.js failed to load

2. **Verify config.js is being served:**
   ```bash
   # In browser:
   fetch('/config.js').then(r => r.text()).then(console.log)
   ```
   - Should show JavaScript code
   - If 404, file is not in build output

3. **Check GitHub Actions build:**
   - Go to GitHub repo → Actions → "Build and Deploy Pages"
   - Look for step "Create runtime config (client-safe)"
   - Should show the echo command that creates config.js
   - If failed or missing, config.js was never created

4. **Verify GitHub Secrets are set:**
   - Repo Settings → Secrets and variables → Actions
   - Should have: `CLERK_PUBLISHABLE_KEY`, `ADMIN_USER_ID`, `ADMIN_USERNAME`
   - If missing, build step won't have values to inject

5. **Check Clerk SDK initialization in browser console:**
   ```bash
   # In browser console on admin.html:
   # Should see messages from our guard functions:
   console.log("Checking Clerk...")
   # Then either:
   # - Redirect to login.html (auth guard worked)
   # - Show "✅ Signed in as: ..." (auth passed, user is admin)
   # - Redirect to index.html (auth passed, but not admin)
   ```

---

### Issue 2: Data Only Saving to localStorage, Not Gist

**Symptoms:**
- Data persists within same browser session
- Data disappears after clearing localStorage
- No data appears in Gist
- "Use Actions Update Gist" warning appears

**Root Cause:**
- This is intentional! Client-side cannot directly write to Gist securely
- PAT token must stay server-side only
- Manual workflow is required

**Solution:**

1. **Export data from db.html:**
   - Go to db.html → "📋 Copy JSON to Clipboard" button
   - JSON is now in clipboard

2. **Update Gist via Actions workflow:**
   - Go to GitHub repo → Actions → "Update Gist"
   - Click "Run workflow" → paste JSON into `records_json` input
   - Click "Run workflow"
   - Workflow updates the Gist with new records

3. **Redeploy Pages to fetch updated Gist:**
   - Go to Actions → "Build and Deploy Pages"
   - Click "Run workflow" → "Run workflow"
   - Workflow fetches latest Gist, generates new config.js, deploys to Pages
   - Pages now has fresh data

---

### Issue 3: Admin-Only Access Not Enforced

**Symptoms:**
- Both admin and non-admin users can access admin.html / db.html
- Guard doesn't redirect non-admins to index.html
- User ID or username comparison not working

**Root Causes:**
1. Clerk guard code not executing (auth init failed)
2. User ID/username comparison logic broken
3. ADMIN_USER_ID or ADMIN_USERNAME secrets not set correctly

**How to Debug:**

1. **Check what user IDs are being used:**
   ```bash
   # In browser console on admin.html/db.html:
   # Add this to the guard function:
   console.log("User ID:", uid)
   console.log("User Name:", uname)
   console.log("Allowed ID:", allowedId)
   console.log("Allowed Name:", allowedName)
   ```
   - Compare values carefully (case-sensitive!)
   - IDs should match exactly

2. **Get your Clerk user ID:**
   - Sign in with your Clerk account
   - Go to Clerk Dashboard → Users → find your user
   - Copy the User ID (e.g., "user_1234567...")

3. **Get your Clerk username:**
   - Clerk Dashboard → User details → Username field
   - Must be exactly as stored in Clerk

4. **Update GitHub Secrets:**
   - Repo Settings → Secrets → Edit
   - Set `ADMIN_USER_ID` = your actual user ID
   - Set `ADMIN_USERNAME` = your actual username
   - **Important:** Must match Clerk exactly!

5. **Redeploy Pages to inject new values:**
   - Go to Actions → "Build and Deploy Pages"
   - Run workflow to regenerate config.js with new admin IDs

---

### Issue 4: Sign-Out Not Working

**Symptoms:**
- "Sign out" button exists but doesn't sign out
- Page doesn't redirect after clicking sign-out
- Still able to access admin/db pages after signing out

**Root Cause:**
- `clerk.signOut?.()` may not be completing
- No redirect or page refresh after sign-out

**How to Debug:**

1. **Check Clerk signOut is implemented:**
   - All pages call `clerk.signOut?.()` before redirecting
   - Look at login.html, admin.html, db.html sign-out handlers

2. **Add logging to sign-out:**
   ```javascript
   // Replace sign-out handler with:
   document.getElementById('logout').addEventListener('click', async () => {
     console.log("Sign-out clicked");
     try {
       console.log("Calling clerk.signOut...");
       await clerk.signOut?.();
       console.log("signOut complete, redirecting...");
     } catch(e) {
       console.error("signOut error:", e);
     }
     window.location.href = 'login.html';
   });
   ```

3. **Test in Clerk Dashboard:**
   - Go to Clerk Dashboard → check if session ends after sign-out

---

## Records.json Fetching (cloudLoad)

**How it works:**
1. At build-time, GitHub Actions fetches Gist and writes `records.json` to `site/` directory
2. At runtime, `cloudLoad()` does `fetch('records.json')` to load records
3. Records are cached in localStorage as backup

**To debug cloudLoad:**
```javascript
// In browser console:
fetch('records.json').then(r => r.json()).then(console.log)
```
- Should show array of records
- If 404, file is not in Pages build output (check Actions log)
- If empty `[]`, Gist has no data (check Gist content)

---

## Testing Checklist

- [ ] Visit https://kwentonglasing.servebeer.com/ → see public page
- [ ] Click "Sign in" → Clerk sign-in modal appears
- [ ] Sign in with your Clerk account → redirected to admin.html
- [ ] If not admin: should be redirected to index.html
- [ ] If admin: should see "✅ Signed in as: [username]" and form
- [ ] Create a record → data appears in table and localStorage
- [ ] Export JSON → JSON file downloads
- [ ] Copy JSON → JSON goes to clipboard
- [ ] Go to GitHub Actions "Update Gist" → run workflow → paste JSON → success
- [ ] Go to Actions "Build and Deploy Pages" → run → wait for completion
- [ ] Refresh page → records persist (fetched from Gist via cloudLoad)
- [ ] Click "Sign out" → redirected to login.html
- [ ] Try accessing admin.html without signing in → redirected to login.html

---

## Quick Reference: Secrets to Set

In GitHub repo Settings → Secrets and variables → Actions:

```
PAT_TOKEN = <your GitHub Personal Access Token with gist scope>
GIST_ID = <Gist ID from URL: https://gist.github.com/username/GIST_ID>
GIST_FILENAME = records.json
CLERK_PUBLISHABLE_KEY = <from Clerk Dashboard>
ADMIN_USER_ID = <your Clerk user ID>
ADMIN_USERNAME = <your Clerk username>
```

---

## Quick Reference: Clerk Setup

1. Go to https://clerk.com
2. Create a new app
3. Go to API Keys section
4. Copy `CLERK_PUBLISHABLE_KEY` (public key, safe to expose in config.js)
5. Set in GitHub Secret `CLERK_PUBLISHABLE_KEY`

---

## What Changed in This Session

**Fixed:**
1. ✅ db.html was corrupted (old puter.js code mixed in) → Replaced with clean implementation
2. ✅ admin.html auth guard improved → Better error messages, proper async handling
3. ✅ login.html auth init → Better error messages, proper async flow
4. ✅ db.html auth guard → Matches admin.html pattern, better UI feedback
5. ✅ All pages → config.js loaded before Clerk SDK in correct order

**What's Now Expected to Work:**
- Clerk sign-in flow on login.html
- Admin-only access control on admin.html and db.html
- CRUD operations with localStorage persistence
- Records.json fetching from Gist at build-time
- Manual Gist updates via GitHub Actions workflow

**Still Manual (By Design):**
- Gist persistence requires: Copy JSON → Actions Update Gist → Actions Build Deploy
- This keeps PAT token server-side only (secure)

---

## Next Steps to Verify Everything Works

1. **Push changes to main branch**
   - GitHub Actions will build and deploy automatically

2. **Check Actions logs:**
   - Click ✓ or ✗ on latest commit
   - Verify "Create runtime config" step succeeded
   - Verify "Deploy to GitHub Pages" step succeeded

3. **Test live:**
   - Visit https://kwentonglasing.servebeer.com/
   - Follow testing checklist above

4. **If still broken:**
   - Open browser DevTools Console (F12)
   - Look for error messages
   - Check if `window.__CONFIG` is loaded
   - Check if Clerk SDK loaded properly
   - Run fetch('/config.js') to verify file exists

5. **If Gist not updating:**
   - Try Actions "Update Gist" workflow manually
   - Paste valid JSON: `[{"id":"...","relid":1,"prefix":"app","collection":"test","metakey":"key","metavalue":"value","datecreated":"2025-01-01T00:00:00Z","dateupdated":"2025-01-01T00:00:00Z"}]`
   - Check Gist content updated

Good luck! 🚀
