## Goal
Make `login.html` visually match `starter.html`/`index.html`, fully responsive for desktop and mobile, without altering existing CoreEngineDB login/registration logic.

## UI Integration
- Import shared desktop header, translation flags, and mobile header/menu markup from `starter.html`.
- Add the same footer blocks and global translation script.
- Link `./resources/css/main.css` and favicon; keep `noindex,nofollow` meta.

## Responsive Layout
- Place the existing login/register forms into `#content-block` under the hero image:
  - Centered container (`.container`) with a max-width and padding.
  - Forms stack vertically with 100% width inputs on small screens.
- Use existing responsive header (`.mobile-header`) and menu toggle.
- Add minimal inline styles (scoped) to:
  - Define a responsive card wrapper around forms (max-width ~420px, auto margins).
  - Ensure labels and inputs flow to full width below 600–768px.
  - Maintain consistent spacing and tap targets.

## Preserve Logic (No Changes)
- Session redirect (`login.html:35–39`).
- `tryLogin` including superadmin+user checks and PBKDF2 (`login.html:41–77`).
- Form submit handlers and CSRF token init (`login.html:78–119`, `login.html:122–129`).
- Remote endpoints and ETag handling.

## Implementation Steps
1. Replace the page shell of `login.html` with shared header/footer/translation markup from `starter.html`.
2. Insert a responsive content section containing the current login and registration forms; keep all element IDs and name attributes unchanged.
3. Add the mobile menu toggle script identical to `index.html` to support header responsiveness.
4. Add a small, scoped `<style>` block in `login.html` for the form wrapper to ensure mobile-first responsiveness (max-width, spacing, media queries), without touching global stylesheet.
5. Place existing `login.html` scripts at the end of `<body>` after shared scripts, preserving their selectors and behavior.

## Verification
- Desktop: header/menu/flags visible; centered login card; footer consistent.
- Mobile (<768px): mobile header shows; menu toggles; forms full-width; inputs readable; buttons tap-friendly.
- Functional: superadmin login redirects to `admin.html`; user login redirects to `index.html`; registration writes hashed password and allows login; hidden CSRF fields populated.

## Considerations
- Avoid referencing non-existent elements like `verticalNav`/`.more` in `login.html`.
- Keep `translate.ignore` classes where appropriate.
- No changes to Worker or local server code; logic remains intact.

## Deliverable
Updated `login.html` with unified, responsive UI matching the site, retaining all CoreEngineDB conditionals and functions.