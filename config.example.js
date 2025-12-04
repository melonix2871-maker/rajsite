// Copy this to `config.js` during your build/deploy step (DO NOT commit `config.js`).
window.__CONFIG = {
  // Clerk publishable key (safe for client-side)
  CLERK_PUBLISHABLE_KEY: "pk_test_replace_with_your_key",
  // Gist info (used by build workflow). Keep these in GitHub Actions secrets.
  GIST_ID: "your_gist_id",
  GIST_FILENAME: "records.json"
};
