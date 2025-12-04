# 🚀 Firebase Auth Setup - Quick Start

Your Firebase project is ready! Follow these 3 steps to get your site working:

---

## ✅ Step 1: Add GitHub Secrets (5 minutes)

**Go to GitHub:** Your Repo → Settings → Secrets and variables → Actions

**Add these 6 Firebase secrets:** (See GITHUB_SECRETS_SETUP.md for values)
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

**Update these 2 admin secrets:**
- `ADMIN_USER_ID` - Your Firebase user ID (from Firebase Console → Users)
- `ADMIN_USERNAME` - Your email (e.g., your-email@example.com)

**Remove (optional):**
- Delete `CLERK_PUBLISHABLE_KEY` if it exists
- Delete `CLERK_SECRET_KEY` if it exists

---

## ✅ Step 2: Get Your Firebase User ID (2 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Firebase project
3. Click **Authentication** → **Users**
4. Find your admin user (the one you'll sign in with)
5. Click on the user to see their **User ID** (long string starting with letters)
6. Copy this ID

**Update GitHub Secret `ADMIN_USER_ID` with this value**

---

## ✅ Step 3: Trigger Build & Test (5 minutes)

1. Go to **GitHub → Actions**
2. Click **"pages build and deployment"** workflow
3. Click **"Run workflow"** button
4. Wait for ✅ success (1-2 minutes)

**Test your site:**
1. Visit: https://kwentonglasing.servebeer.com
2. Click **"Sign in"** button
3. Sign in with your email (the one you used in Firebase)
4. You should see the **admin.html** page

---

## ✨ Done!

Your Firebase Auth is now live! 

**What's working:**
- ✅ Sign-in protection on admin and data pages
- ✅ Public read-only data page
- ✅ Admin-only record creation
- ✅ GitHub Pages deployment

---

## 🐛 Troubleshooting

**"Config not loaded" error?**
- Make sure ALL 6 Firebase secrets are added to GitHub
- Re-run the workflow

**"Not an admin" error?**
- Check `ADMIN_USER_ID` matches your Firebase user ID exactly
- Get it from Firebase Console → Users → click your user

**Can't sign in?**
- Make sure you created a user in Firebase Console → Authentication
- Try signing in with your email address

---

## 📖 Reference

- **GITHUB_SECRETS_SETUP.md** - Detailed secret setup instructions
- **FIREBASE_SETUP.md** - Full Firebase configuration guide
- **MIGRATION_COMPLETE.md** - What changed from Clerk to Firebase
- **SETUP_CHECKLIST.md** - Complete verification checklist

---

**Questions?** Check browser console (F12) for error messages!
