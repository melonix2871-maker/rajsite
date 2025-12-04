# GitHub Secrets Configuration

## Add These Secrets to Your GitHub Repository

Go to: **GitHub → Your Repository → Settings → Secrets and variables → Actions**

Add the following secrets by clicking "New repository secret":

### Firebase Configuration Secrets

Copy-paste each value exactly as shown (from FIREBASE_CREDENTIALS.txt):

1. **FIREBASE_API_KEY**
   - Copy from: FIREBASE_CREDENTIALS.txt

2. **FIREBASE_AUTH_DOMAIN**
   - Copy from: FIREBASE_CREDENTIALS.txt

3. **FIREBASE_PROJECT_ID**
   - Copy from: FIREBASE_CREDENTIALS.txt

4. **FIREBASE_STORAGE_BUCKET**
   - Copy from: FIREBASE_CREDENTIALS.txt

5. **FIREBASE_MESSAGING_SENDER_ID**
   - Copy from: FIREBASE_CREDENTIALS.txt

6. **FIREBASE_APP_ID**
   - Copy from: FIREBASE_CREDENTIALS.txt

### Admin User Configuration

You also need to update these existing secrets:

7. **ADMIN_USER_ID**
   - Go to Firebase Console → Authentication → Users
   - Find your admin user and copy their **uid** (usually starts with a long alphanumeric)
   - Paste it here

8. **ADMIN_USERNAME**
   - Use the email or username of your admin user (e.g., `your-email@example.com`)
   - Paste it here

### Other Secrets (Keep Unchanged)

Keep these unchanged (they should already exist):
- **PAT_TOKEN** - Your GitHub Personal Access Token
- **GIST_ID** - Your Gist ID
- **GIST_FILENAME** - The filename in your Gist (usually `records.json`)

### Optional: Remove Old Secrets

If you have these from the Clerk setup, you can delete them:
- ~~CLERK_PUBLISHABLE_KEY~~ (delete)
- ~~CLERK_SECRET_KEY~~ (delete)

---

## Quick Setup Instructions

1. Open your repo in GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. For each secret above:
   - **Name**: (exact name in bold above)
   - **Secret**: (value below it)
   - Click **"Add secret"**

---

## Verify Setup

Once all secrets are added:

1. Go to **Actions** in your GitHub repo
2. Find **"pages build and deployment"**
3. Click **"Run workflow"** to trigger a new build
4. Wait for it to complete (should take 1-2 minutes)
5. Check that it shows ✅ (success)

---

## Test the Site

After workflow completes:

1. Visit: https://kwentonglasing.servebeer.com
2. Click "Sign in"
3. Sign in with your admin account in Firebase
4. Should redirect to admin.html

**All set!**
