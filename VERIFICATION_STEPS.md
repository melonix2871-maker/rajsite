# Quick Verification Steps

Run these in your browser console at https://kwentonglasing.servebeer.com/

## 1. Check if config.js is loaded
```javascript
console.log('Config loaded:', window.__CONFIG);
```
Expected output: `{ CLERK_PUBLISHABLE_KEY: '...', ADMIN_USER_ID: '...', ADMIN_USERNAME: '...' }`
If undefined: config.js failed to load from build

## 2. Check if Clerk SDK is loaded
```javascript
console.log('Clerk available:', typeof Clerk !== 'undefined');
```
Expected: `true`

## 3. Check if records.json exists in build
```javascript
fetch('records.json').then(r => r.json()).then(console.log)
```
Expected: Array like `[{id: "...", relid: 1, ...}, ...]`
If 404: File not in Pages build

## 4. Check current Clerk session
```javascript
Clerk.load({ publishableKey: window.__CONFIG.CLERK_PUBLISHABLE_KEY }).then(() => {
  Clerk.user?.get?.().then(u => console.log('Current user:', u))
})
```
Expected: User object with id, username, email fields
If null: Not signed in

## 5. Check localStorage records
```javascript
console.log('localStorage records:', JSON.parse(localStorage.getItem('records') || 'null'))
```
Expected: Array of records or null if empty
Shows what's persisted locally

## 6. Test auth redirect on admin.html
- Go to admin.html without signing in
- Should see redirect to login.html
- If not, auth guard is not executing

## 7. Test auth redirect on db.html
- Go to db.html without signing in
- Should see redirect to login.html
- If not, auth guard is not executing

## 8. Test admin access control
- Sign in with non-admin Clerk account
- Go to admin.html
- Should redirect to index.html
- Check browser console for user ID and admin ID comparison

## 9. Verify GIST records available
On db.html after signing in as admin:
```javascript
fetch('records.json', {cache: 'no-cache'}).then(r => r.json()).then(d => {
  console.log('Gist records:', d);
  localStorage.setItem('records', JSON.stringify(d));
  console.log('Saved to localStorage');
})
```
This fetches fresh records from Gist and caches them locally

## 10. Test manual Gist update workflow
1. On db.html, modify some records
2. Click "📋 Copy JSON to Clipboard"
3. Go to GitHub repo → Actions → "Update Gist"
4. Click "Run workflow"
5. Paste JSON into `records_json` input
6. Click "Run workflow"
7. Wait for completion (check Actions log)
8. Go to Actions → "Build and Deploy Pages" → "Run workflow"
9. Wait for deployment
10. Refresh db.html
11. Records should persist

---

## Common Error Messages & Solutions

| Error | Solution |
|-------|----------|
| "Auth not configured" | Check `window.__CONFIG.CLERK_PUBLISHABLE_KEY` is set in config.js |
| "Auth error" | Check browser console for Clerk SDK errors, verify publishable key is valid |
| Records only in localStorage | This is expected! Use Actions "Update Gist" to persist to Gist |
| Can access admin.html without login | Auth guard not executing, check if config.js loaded |
| Non-admin can access admin pages | ADMIN_USER_ID or ADMIN_USERNAME don't match, check GitHub Secrets |
| 404 on config.js | File not in Pages build, check Actions "Create runtime config" step |
| 404 on records.json | Gist fetch failed in Actions, check "Fetch Gist content" step in Actions log |
| Sign-out doesn't work | Check `clerk.signOut?.()` is called, may need page refresh |

---

## Debugging with Browser DevTools

1. **F12** → Console tab
2. Run verification scripts above
3. Check for red error messages
4. Network tab: Check if /config.js, /records.json load successfully (should be 200 OK)
5. Application tab → LocalStorage → look for key `records` (shows cached data)

---

## If Everything is Still Broken

1. **Check GitHub Actions logs:**
   - Repo → Actions → Latest workflow run
   - Look for red ✗ on any step
   - Click step name to expand and see error message
   - Common issues:
     - PAT_TOKEN expired or invalid
     - GIST_ID incorrect
     - CLERK_PUBLISHABLE_KEY missing
     - Workflow step failed

2. **Check Clerk Dashboard:**
   - Verify your app is created
   - Verify Publishable Key is correct
   - Verify your user exists and has correct user ID and username

3. **Check Gist:**
   - Go to https://gist.github.com/your-username
   - Find the records.json Gist
   - Verify it has valid JSON content (should be valid array of records)

4. **Check GitHub Pages:**
   - Repo → Settings → Pages
   - Source should be "GitHub Actions"
   - Deployment should show green ✓
   - If not, check Actions build logs for errors

---

## Performance Tips

- Gist fetching happens at **build-time only** (not runtime)
- Records are cached in **localStorage** (fast offline access)
- Updates to Gist require **manual workflow trigger** (for security, no client-side PAT)
- Pages redeploy fetches fresh Gist and updates build

This keeps everything fast and secure!
