<<<<<<< HEAD
#!/usr/bin/env node
/**
 * Simple build script to inject environment variables into HTML files.
 * Reads from .env.local and replaces placeholders in JS.
 */

const fs = require('fs');
const path = require('path');

// Load .env.local (optional) and allow env overrides (for CI)
const envPath = path.join(__dirname, '.env.local');
const env = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) env[key.trim()] = value.trim();
  });
}

// Prefer process.env (CI) then .env.local
const PAT_TOKEN = process.env.PAT_TOKEN || env.PAT_TOKEN || '';
const GIST_ID = process.env.GIST_ID || env.GIST_ID || '';
const GIST_FILENAME = process.env.GIST_FILENAME || env.GIST_FILENAME || 'records.json';
const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || env.CLERK_PUBLISHABLE_KEY || '';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || env.ADMIN_USER_ID || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || env.ADMIN_USERNAME || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || '';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '';

// Files to update
const files = ['admin.html', 'db.html', 'index.html', 'login.html'];
const baseDir = __dirname;

files.forEach(file => {
  const filePath = path.join(baseDir, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace placeholders with values
  content = content.replace(/const GITHUB_TOKEN = '.*?';/g, `const GITHUB_TOKEN = '${PAT_TOKEN}';`);
  content = content.replace(/const GIST_ID = '.*?';/g, `const GIST_ID = '${GIST_ID}';`);
  content = content.replace(/const GIST_FILENAME = '.*?';/g, `const GIST_FILENAME = '${GIST_FILENAME}';`);
  content = content.replace(/const CLERK_PUBLISHABLE_KEY = '.*?';/g, `const CLERK_PUBLISHABLE_KEY = '${CLERK_PUBLISHABLE_KEY}';`);
  content = content.replace(/const ADMIN_USER_ID = '.*?';/g, `const ADMIN_USER_ID = '${ADMIN_USER_ID}';`);
  content = content.replace(/const ADMIN_USERNAME = '.*?';/g, `const ADMIN_USERNAME = '${ADMIN_USERNAME}';`);
  content = content.replace(/const ADMIN_EMAIL = '.*?';/g, `const ADMIN_EMAIL = '${ADMIN_EMAIL}';`);

  if (OUTPUT_DIR) {
    const outPath = path.join(baseDir, OUTPUT_DIR);
    if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });
    fs.writeFileSync(path.join(outPath, file), content, 'utf-8');
    console.log(`✓ Wrote ${file} -> ${OUTPUT_DIR}/`);
  } else {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Updated ${file}`);
  }
});

console.log('Build complete!');
=======
#!/usr/bin/env node
/**
 * Simple build script to inject environment variables into HTML files.
 * Reads from .env.local and replaces placeholders in JS.
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
const env = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });
}

const GITHUB_TOKEN = env.GITHUB_TOKEN || '';
const GIST_ID = env.GIST_ID || '';

// Files to update
const files = ['admin.html', 'db.html', 'index.html', 'login.html'];
const baseDir = __dirname;

files.forEach(file => {
  const filePath = path.join(baseDir, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace all instances
  content = content.replace(/const GITHUB_TOKEN = '.*?';/g, `const GITHUB_TOKEN = '${GITHUB_TOKEN}';`);
  content = content.replace(/const GIST_ID = '.*?';/g, `const GIST_ID = '${GIST_ID}';`);

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Updated ${file}`);
});

console.log('Build complete!');
>>>>>>> 7e72239 (feat: migrate schema and integrate GitHub Gist API with build script)
