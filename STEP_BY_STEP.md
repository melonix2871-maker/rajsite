# 📋 Step-by-Step Setup Instructions

Follow these exact steps in order.

---

## Step 1: Add Firebase Secrets to GitHub

**URL:** `https://github.com/melonix2871-maker/rajsite/settings/secrets/actions`

Or: GitHub → Your Repo → Settings → Secrets and variables → Actions

### 1.1 Add FIREBASE_API_KEY
- Click "New repository secret"
- **Name:** `FIREBASE_API_KEY`
- **Secret:** [Get from FIREBASE_CREDENTIALS.txt]
- Click "Add secret"

### 1.2 Add FIREBASE_AUTH_DOMAIN
- Click "New repository secret"
- **Name:** `FIREBASE_AUTH_DOMAIN`
- **Secret:** [Get from FIREBASE_CREDENTIALS.txt]
- Click "Add secret"

### 1.3 Add FIREBASE_PROJECT_ID
- Click "New repository secret"
- **Name:** `FIREBASE_PROJECT_ID`
- **Secret:** [Get from FIREBASE_CREDENTIALS.txt]
- Click "Add secret"

### 1.4 Add FIREBASE_STORAGE_BUCKET
- Click "New repository secret"
- **Name:** `FIREBASE_STORAGE_BUCKET`
- **Secret:** [Get from FIREBASE_CREDENTIALS.txt]
- Click "Add secret"

### 1.5 Add FIREBASE_MESSAGING_SENDER_ID
- Click "New repository secret"
- **Name:** `FIREBASE_MESSAGING_SENDER_ID`
- **Secret:** [Get from FIREBASE_CREDENTIALS.txt]
- Click "Add secret"

### 1.6 Add FIREBASE_APP_ID
- Click "New repository secret"
- **Name:** `FIREBASE_APP_ID`
- **Secret:** [Get from FIREBASE_CREDENTIALS.txt]
- Click "Add secret"

---

## Step 2: Get Your Firebase User ID

**URL:** Firebase Console → Your Project → Authentication → Users

1. Go to Firebase Console
2. Select your Firebase project
3. Click **Authentication** (left menu)
4. Click **Users**
5. Find your user (the one you want as admin)
6. Click on the user
7. Copy the **User ID** (long string)
8. Keep this copied

---

## Step 3: Update ADMIN_USER_ID Secret

**URL:** `https://github.com/melonix2871-maker/rajsite/settings/secrets/actions`

### 3.1 Find ADMIN_USER_ID Secret
- Look for existing secret named `ADMIN_USER_ID`
- If it exists, click the pencil icon to edit it
- If it doesn't exist, click "New repository secret"

### 3.2 Update the Value
- **Name:** `ADMIN_USER_ID`
- **Secret:** [Paste the User ID from Step 2]
- Click "Update secret" (or "Add secret" if new)

---

## Step 4: Update ADMIN_USERNAME Secret

**URL:** `https://github.com/melonix2871-maker/rajsite/settings/secrets/actions`

### 4.1 Find ADMIN_USERNAME Secret
- Look for existing secret named `ADMIN_USERNAME`
- If it exists, click the pencil icon to edit it
- If it doesn't exist, click "New repository secret"

### 4.2 Update the Value
- **Name:** `ADMIN_USERNAME`
- **Secret:** [Your email address, e.g., `your-email@gmail.com`]
- Click "Update secret" (or "Add secret" if new)

---

## Step 5: Verify All Secrets Are Added

**URL:** `https://github.com/melonix2871-maker/rajsite/settings/secrets/actions`

You should see:
- ✅ FIREBASE_API_KEY
- ✅ FIREBASE_AUTH_DOMAIN
- ✅ FIREBASE_PROJECT_ID
- ✅ FIREBASE_STORAGE_BUCKET
- ✅ FIREBASE_MESSAGING_SENDER_ID
- ✅ FIREBASE_APP_ID
- ✅ ADMIN_USER_ID
- ✅ ADMIN_USERNAME

Plus any others (PAT_TOKEN, GIST_ID, GIST_FILENAME, etc.)

---

## Step 6: Trigger Build

**URL:** `https://github.com/melonix2871-maker/rajsite/actions`

1. Go to **Actions** in your GitHub repo
2. Click **"pages build and deployment"** (on the left)
3. Click the **"Run workflow"** button
4. Select "main" branch (should be default)
5. Click **"Run workflow"** again
6. Wait for it to complete (1-2 minutes)
7. You should see a green ✅ checkmark

---

## Step 7: Test Your Site

1. Wait for workflow to complete (see green ✅ in Actions)
2. Go to: `https://kwentonglasing.servebeer.com`
3. Click **"Sign in"** button
4. You should see Firebase sign-in options
5. Sign in with your email address
6. Enter your password
7. You should be **redirected to admin.html**
8. You should see: **"✅ Signed in as: [your email]"**

---

## Step 8: Test Admin Features (Optional)

1. On admin.html, fill in the form:
   - **relid:** `1`
   - **prefix:** `app_`
   - **collection:** `users`
   - **metakey:** `test`
   - **metavalue:** `hello`
2. Click **"Create"**
3. You should see: **"Saved."**
4. Click **"Open Data Table"**
5. You should see your record in the table

---

## Step 9: Test Sign Out

1. Click **"Logout"** button
2. You should be redirected to login.html
3. Go to: `https://kwentonglasing.servebeer.com`
4. You should see: **"Not signed in"**
5. Trying to access admin.html should redirect to login.html

---

## ✅ Complete!

Your Firebase Auth setup is complete and working!

---

## 🐛 Troubleshooting

### "Config not loaded" in browser
- Make sure ALL 6 Firebase secrets are added
- Run workflow again

### "Auth not configured"
- Check browser console (F12)
- Run in console: `console.log(window.__CONFIG)`
- Should show firebase object

### Can't sign in
- Make sure you created a user in Firebase
- Try your email address exactly as it is in Firebase

### "Not an admin" error
- Verify ADMIN_USER_ID matches your Firebase user ID exactly
- Check ADMIN_USERNAME is your email

### Page redirects to login infinitely
- Check browser console for errors
- Verify all secrets are correct (no typos)
- Try signing out and signing back in

---

## Need Help?

Check these files:
- **QUICK_START.md** - 3-step overview
- **FIREBASE_CREDENTIALS.txt** - Copy-paste values
- **README_SETUP.md** - Full setup summary
- **SETUP_CHECKLIST.md** - Detailed checklist

---

**You got this! 🚀**
