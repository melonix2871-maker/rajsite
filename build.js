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
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN || '';
const GIST_ID = process.env.GIST_ID || env.GIST_ID || '';
const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || env.CLERK_PUBLISHABLE_KEY || '';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '';

// Files to update
const files = ['admin.html', 'db.html', 'index.html', 'login.html'];
const baseDir = __dirname;

files.forEach(file => {
  const filePath = path.join(baseDir, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace placeholders with values
  content = content.replace(/const GITHUB_TOKEN = '.*?';/g, `const GITHUB_TOKEN = '${GITHUB_TOKEN}';`);
  content = content.replace(/const GIST_ID = '.*?';/g, `const GIST_ID = '${GIST_ID}';`);
  content = content.replace(/const CLERK_PUBLISHABLE_KEY = '.*?';/g, `const CLERK_PUBLISHABLE_KEY = '${CLERK_PUBLISHABLE_KEY}';`);
  content = content.replace(/const ADMIN_EMAIL = '.*?';/g, `const ADMIN_EMAIL = '${process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || ''}';`);

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
