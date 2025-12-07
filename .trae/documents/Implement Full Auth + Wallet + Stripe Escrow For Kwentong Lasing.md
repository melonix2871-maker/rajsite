## Scope
- Complete user auth (login, logout, registration, forgot password via recovery code; no email/OTP yet).
- Wallet + Stripe escrow (top-up, webhook credit, donation flow for bottle/bucket/case).
- Themed UI pages using existing dark/orange layout, fonts, and responsiveness.
- Avatar upload: client-side resize to 128×128, Base64 storage in CoreEngineDB.

## Design Consistency
- Use `resources/css/main.css` palette (#222, #f58b01/#f16d00, #ffe497) and fonts (Comic Neue/Comic Relief).
- Preserve header/footer, hero, cabinet, stories card styles; respect media queries for ≤1024/768/600.

## Data Model (CoreEngineDB)
- users: username, password_hash (PBKDF2), recovery_hash, avatar (data URL), created/updated.
- posts: id, relid (user), content, created/updated.
- donations: counters per post (bottles/buckets/cases/total).
- wallet_balance + wallet_ledger per user (topups/donations).

## Worker Endpoints
- POST /wallet/topup → Stripe Checkout (server-side secret).
- POST /stripe/webhook → verify signature, credit balance.
- POST /donate → transfer wallet balance and update donation counters.
- POST /auth/forgot → verify recovery code and update password.
- (Existing) /json/db.json writes with ETag, rate limit, size/schema validation, sanitized config reads.

## Pages To Add
- dashboard.html (auth): wallet balance/top-up, ledger, avatar upload, user posts.
- profile.html (public): avatar, posts, donation totals; buy-beer buttons.
- post creation (modal or posts.html) with current UI components.

## Frontend Integration
- Use `coreenginedb/client.js` SDK; queue with ETag; activity viewer remains.
- Index/starter: load posts, wire donation buttons; match theme classes.
- Login: add Forgot Password using recovery code (no email/OTP).
- Avatar upload: file → canvas resize → WebP/JPEG Base64 → save; preview and limits enforced.

## Verification
- End-to-end flows: register → login → top-up → donate → profile updates; forgot password; avatar upload.
- Network checks: Stripe webhook credits, no secrets leaked; activity logs for all endpoints.
- UI checks: desktop/mobile responsiveness and theme fidelity.

## Deliverables
- New pages and components styled with `main.css`.
- Worker endpoints for wallet/donate/forgot/webhook.
- SDK usage and documentation with test steps.

Proceed to implement these pages and endpoints while preserving the current theme and stability. 