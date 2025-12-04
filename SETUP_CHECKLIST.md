# Firebase Auth Migration - Verification Checklist

## ✅ Code Migration Complete

Use this checklist to verify and complete the Firebase Auth setup.

---

## Code Changes Verification

- [x] **login.html** - Replaced Clerk with Firebase + FirebaseUI
- [x] **admin.html** - Replaced Clerk auth guard with Firebase auth guard  
- [x] **db.html** - Replaced Clerk auth guard with Firebase auth guard
- [x] **index.html** - Replaced Clerk UI with Firebase UI
- [x] **.github/workflows/build.yml** - Updated to generate Firebase config instead of Clerk
- [x] All Clerk SDK imports removed
- [x] All Firebase SDK imports added
- [x] All Clerk property access replaced with Firebase equivalents

---

## Firebase Setup Checklist

### Phase 1: Firebase Project Creation
- [ ] Created Firebase project at https://console.firebase.google.com/
- [ ] Verified project is ready (status shows "Active")
- [ ] Web app created in Firebase Console

### Phase 2: Get Firebase Configuration
- [ ] Obtained Firebase config from Project Settings → Web App
  - [ ] `FIREBASE_API_KEY` - Retrieved ✓
  - [ ] `FIREBASE_AUTH_DOMAIN` - Retrieved ✓
  - [ ] `FIREBASE_PROJECT_ID` - Retrieved ✓
  - [ ] `FIREBASE_STORAGE_BUCKET` - Retrieved ✓
  - [ ] `FIREBASE_MESSAGING_SENDER_ID` - Retrieved ✓
  - [ ] `FIREBASE_APP_ID` - Retrieved ✓

### Phase 3: Enable Authentication Methods
- [ ] Went to Firebase → Authentication → Get Started
- [ ] Enabled "Email/Password" sign-in method
- [ ] Enabled "Google" sign-in (optional)
- [ ] Enabled "GitHub" sign-in (optional)

### Phase 4: Create Admin User in Firebase
- [ ] Created user in Firebase Authentication
- [ ] Obtained Firebase uid of admin user
- [ ] Noted email of admin user

### Phase 5: Update GitHub Secrets
- [ ] Added `FIREBASE_API_KEY` to GitHub Secrets
- [ ] Added `FIREBASE_AUTH_DOMAIN` to GitHub Secrets
- [ ] Added `FIREBASE_PROJECT_ID` to GitHub Secrets
- [ ] Added `FIREBASE_STORAGE_BUCKET` to GitHub Secrets
- [ ] Added `FIREBASE_MESSAGING_SENDER_ID` to GitHub Secrets
- [ ] Added `FIREBASE_APP_ID` to GitHub Secrets
- [ ] Updated `ADMIN_USER_ID` with Firebase uid
- [ ] Updated `ADMIN_USERNAME` with admin email
- [ ] Deleted `CLERK_PUBLISHABLE_KEY` (if exists)
- [ ] Deleted `CLERK_SECRET_KEY` (if exists)

### Phase 6: Trigger Build
- [ ] Went to GitHub → Actions
- [ ] Found "pages build and deployment" workflow
- [ ] Clicked "Run workflow"
- [ ] Waited for workflow to complete
- [ ] Verified workflow shows ✅ success

### Phase 7: Verify Deployment
- [ ] Checked config.js exists: `https://kwentonglasing.servebeer.com/config.js`
- [ ] Checked config.js contains firebase config (not Clerk)
- [ ] Verified no 404 errors in browser console

### Phase 8: Test Authentication
- [ ] Visited https://kwentonglasing.servebeer.com
- [ ] Saw "Sign in" button
- [ ] Clicked "Sign in" button
- [ ] Redirected to `/login.html`
- [ ] Saw Firebase sign-in options
- [ ] Successfully signed in with admin account
- [ ] Redirected to `/admin.html`
- [ ] Saw "Signed in as" message with admin email
- [ ] Saw form to add records

### Phase 9: Test Admin Features
- [ ] Filled in form on `/admin.html`
- [ ] Created a record successfully
- [ ] Clicked "Open Data Table"
- [ ] Saw the record in `/db.html`

### Phase 10: Test Public Pages
- [ ] Visited `/index.html`
- [ ] Saw "Signed in as [admin email]"
- [ ] Clicked "Sign out" button
- [ ] Verified sign-out worked
- [ ] Saw "Not signed in" message
- [ ] Attempted to access `/admin.html` without signing in
- [ ] Redirected to `/login.html` (auth guard working)

---

## Troubleshooting Checklist

If something isn't working, go through this:

### "Config not loaded" error
- [ ] Verify all 6 Firebase secrets are in GitHub
- [ ] Check workflow ran successfully
- [ ] Check `config.js` file exists in gh-pages branch
- [ ] Trigger workflow again manually

### "Auth not configured" on page
- [ ] Run in browser console: `console.log(window.__CONFIG)`
- [ ] Should show firebase object with 6 properties
- [ ] If undefined, config.js didn't load properly
- [ ] Check network tab to see if config.js returned 404

### Can't sign in
- [ ] Verify Firebase project exists
- [ ] Check Firebase Console → Authentication → Sign-in method
- [ ] Confirm at least "Email/Password" is enabled
- [ ] Try creating a new test user in Firebase

### "Not an admin" error
- [ ] Get admin user uid from Firebase Console → Users
- [ ] Compare with `ADMIN_USER_ID` in GitHub Secrets
- [ ] Make sure they match exactly (include uid_ prefix if present)
- [ ] Update GitHub Secret if needed
- [ ] Trigger workflow again

### Auth guard not redirecting
- [ ] Check browser console for JavaScript errors
- [ ] Verify `initFirebaseGuard()` function executed
- [ ] Check that Firebase is initialized before auth checks

### "Admin page accessible without login"
- [ ] Auth guard may have failed silently
- [ ] Open browser DevTools (F12)
- [ ] Check Console for errors
- [ ] Check that Firebase config is loaded

---

## Success Indicators

You'll know everything is working when:

1. ✅ `config.js` is served successfully (no 404)
2. ✅ `window.__CONFIG.firebase` exists in browser console
3. ✅ Login page shows Firebase sign-in UI
4. ✅ You can sign in with your admin account
5. ✅ Admin page is protected and only accessible when signed in
6. ✅ Data table shows records
7. ✅ Sign out button works
8. ✅ Public page shows signed-in status

---

## Documentation Files

Refer to these for more details:

- **FIREBASE_SETUP.md** - Step-by-step Firebase setup (read this first!)
- **MIGRATION_COMPLETE.md** - Summary of all code changes
- **build.yml** - GitHub Actions workflow (check if you need to debug)

---

## Next Steps (Optional)

Once everything is working:

1. Update old documentation that mentions Clerk:
   - `DEBUGGING_GUIDE.md`
   - `IMPLEMENTATION_SUMMARY.md`
   - `config.example.js`

2. Test with multiple users (optional)

3. Consider setting up Firebase project backup

4. Review Firebase security rules (important for production)

---

**Still stuck?** Check the browser console (F12) for detailed error messages!
