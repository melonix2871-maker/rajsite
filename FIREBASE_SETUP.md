# Firebase Auth Migration - Setup Instructions

## ✅ Completed: Clerk → Firebase Auth Transition

All code has been updated to use **Firebase Authentication** instead of Clerk. Here's what you need to do:

---

## 📋 Prerequisites

1. A Google account (to create a Firebase project)
2. Access to your GitHub repository settings

---

## 🔧 Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** or **"Add project"**
3. Project name: `rajsite` (or any name you prefer)
4. Choose your region
5. Click **"Create project"** and wait for it to complete

---

## 🔐 Step 2: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (⚙️ icon, top right)
2. Scroll down to **"Your apps"** section
3. Click **"Web"** app (or create one if not present)
4. You'll see a code snippet like:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "yourproject.firebaseapp.com",
     projectId: "yourproject",
     storageBucket: "yourproject.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef..."
   };
   ```
5. **Copy each value** - you'll need them for GitHub Secrets

---

## 🔐 Step 3: Enable Authentication Methods

1. In Firebase Console, go to **Authentication** (left menu)
2. Click **"Get Started"**
3. Enable these sign-in methods:
   - **Email/Password**
   - **Google** (optional but recommended)
   - **GitHub** (optional but recommended)

---

## 🔐 Step 4: Set Admin User in Firebase

1. Go to **Authentication → Users** in Firebase Console
2. Create a test user OR use an existing one:
   - Email: `admin@example.com` (any email)
   - Password: (choose a strong password)
3. Click on the user to see their **User ID** (uid)
   - Copy this uid - you'll need it for GitHub Secrets

---

## 📝 Step 5: Update GitHub Secrets

1. Go to **GitHub → Your Repository → Settings → Secrets and variables → Actions**
2. **Remove** these secrets (Clerk):
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

3. **Add** these Firebase secrets:
   - `FIREBASE_API_KEY` = value from Firebase config
   - `FIREBASE_AUTH_DOMAIN` = value from Firebase config
   - `FIREBASE_PROJECT_ID` = value from Firebase config
   - `FIREBASE_STORAGE_BUCKET` = value from Firebase config
   - `FIREBASE_MESSAGING_SENDER_ID` = value from Firebase config
   - `FIREBASE_APP_ID` = value from Firebase config

4. **Update** these secrets:
   - `ADMIN_USER_ID` = Firebase uid of your admin user (from Step 4)
   - `ADMIN_USERNAME` = Email of your admin user (e.g., `admin@example.com`)

5. Keep these unchanged:
   - `PAT_TOKEN`
   - `GIST_ID`
   - `GIST_FILENAME` (if you have it)

---

## 🚀 Step 6: Test the Setup

1. Go to **GitHub → Actions**
2. Find the **"pages build and deployment"** workflow
3. Click **"Run workflow"** to trigger a new build
4. Wait for it to complete (should show ✅)

---

## ✅ Step 7: Test Authentication

1. Visit your site: `https://kwentonglasing.servebeer.com`
2. Click **"Sign in"** button
3. You should see Firebase sign-in options (Email, Google, GitHub)
4. Sign in with your admin account
5. You should be redirected to `/admin.html`

---

## 🐛 Troubleshooting

### "Config not loaded" error in browser console
- **Solution**: Make sure all 6 Firebase secrets are set correctly in GitHub
- Run the workflow again to regenerate `config.js`

### "Auth not configured" message on page
- **Solution**: Check that `config.js` exists at `https://kwentonglasing.servebeer.com/config.js`
- In browser console, run: `console.log(window.__CONFIG.firebase)` to verify

### Can't sign in
- **Solution**: Make sure you enabled at least one auth method in Firebase Console (Email/Password)
- Make sure your admin user exists in Firebase Authentication

### Admin page says "Not an admin"
- **Solution**: Verify `ADMIN_USER_ID` matches the Firebase uid of your user
- Get the uid from Firebase Console → Authentication → Users

---

## 📄 Code Changes Summary

All pages have been updated:

- **login.html**: Now uses FirebaseUI for sign-in
- **admin.html**: Now checks Firebase auth instead of Clerk
- **db.html**: Now checks Firebase auth for CRUD operations
- **index.html**: Now shows Firebase-authenticated user
- **.github/workflows/build.yml**: Now generates Firebase config instead of Clerk config

No Clerk code remains in the codebase.

---

## ✨ Next Steps

Once everything is working:

1. Update documentation files (optional):
   - `DEBUGGING_GUIDE.md` - mentions Clerk
   - `IMPLEMENTATION_SUMMARY.md` - mentions Clerk
   - `config.example.js` - mentions Clerk

2. Consider adding custom domain email verification for Firebasebase (optional)

3. Back up your admin credentials securely

---

**Questions?** Check the browser console for detailed error messages!
