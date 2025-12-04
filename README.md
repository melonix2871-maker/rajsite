# rajsite

A lightweight web app for managing metadata records with a new schema: `id`, `relid`, `prefix`, `collection`, `metakey`, `metavalue`, `datecreated`, `dateupdated`.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Create a `.env.local` file (ignored by git) with your GitHub credentials:
```
GITHUB_TOKEN=your_github_pat_here
GIST_ID=your_gist_id_here
```

### 3. Build
Run the build script to inject environment variables into the HTML files:
```bash
node build.js
```

### 4. Serve locally
Use any static server (e.g., Python, Node, VS Code Live Server):

**Python (simple):**
```bash
python -m http.server 8000
```

**Node (http-server):**
```bash
npx http-server
```

Then open `http://localhost:8000` in your browser.

## Features

- **Admin Panel** (`admin.html`): Create new records
- **Data Table** (`db.html`): View, edit, delete records with import/export
- **Read-only View** (`index.html`): Public data view with filtering
- **Cloud Sync**: Records sync to GitHub Gist via API
- **Local Cache**: Offline persistence via localStorage

## Schema

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Unique identifier |
| `relid` | INT | Relational ID |
| `prefix` | TEXT | e.g. `app_` |
| `collection` | TEXT | Collection name |
| `metakey` | TEXT | Metadata key |
| `metavalue` | TEXT | Metadata value |
| `datecreated` | ISO Timestamp | Record creation time |
| `dateupdated` | ISO Timestamp | Last update time |

## Files

- `admin.html` - Admin form to create records
- `db.html` - Data manager (CRUD operations)
- `index.html` - Read-only public view
- `login.html` - Simple authentication
- `build.js` - Build script to inject secrets
- `.env.local` - Local environment config (not committed)

## Security Notes

- **`.env.local`** is in `.gitignore` and never committed to the repository
- Ensure your GitHub PAT has appropriate permissions (gist scope)
- For production deployments, use a backend proxy to handle authentication
