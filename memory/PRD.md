# CraftPulse AI - Product Requirements Document

## Original Problem Statement
> Need a handyman market place run by ai

## User Choices
- Both customer & handyman users (two-sided marketplace)
- AI: chat concierge + smart matching + photo diagnosis
- Model: Claude Sonnet 4.6 (via Emergent LLM key)
- Payments: Stripe test mode; promo codes enabled on both flows
- Auth: Emergent-managed Google OAuth (customers/handymen) + username/password admin
- Business rules: $1/7-day trial → $49/mo handyman subscription; $25 referral both-sides; NYC service area
- User note: "Make it unique and advanced"

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (Claude vision & chat) + stripe SDK + bcrypt + PyJWT
- **Frontend**: React 19 + React Router + Tailwind + Shadcn + Sonner + Leaflet
- **Auth**: Emergent OAuth (users) + JWT (admin, HS256, 12h)
- **Payments**: Stripe Checkout (jobs) + Stripe Subscriptions with paid-trial (Pro) + Customer Portal
- **Email**: Emergent-managed transactional (booking, trial, dunning, admin-reset) with hard guardrail gate
- **AI**: Claude Sonnet 4.6 vision, streaming chat, deterministic scored matching
- **Realtime**: SSE for private lead alerts + SSE for public map pulses + Web Push
- **SEO**: server-side sitemap.xml, robots.txt, per-page useSEO hook (title/description/OG/Twitter/canonical)

## Features Implemented

### Baseline (2026-02, first sprint)
- Landing + hero + categories + workflow + top craftsmen + CTAs
- Google OAuth + demo login for both roles
- AI Vision Diagnostic Studio with bounding boxes
- AI Repair Concierge Chat (streaming SSE)
- Neural Smart Matching (skills, rating, experience, rate, distance)
- Handyman dashboard + Stripe Checkout for booking
- SEO Category + Blog articles with editor bylines
- Craftsman Onboarding wizard with License Uploads
- Admin Review Queue with bulk approve/reject
- PWA + Web Push Notifications + TWA configs

### Subscriptions, Referrals, Live Map (2026-02, second sprint)
- Handyman Pro subscription ($1 trial → $49/mo) + Stripe Customer Portal
- Referral program ($25 both sides, monthly cap 10)
- Live Match Map at `/live` with skill filters + category icon pulses
- Landing hero live-map preview widget
- Auto-geocode signups (browser geolocation with consent, ~1 km fuzz)

### Admin Auth (2026-02, third sprint)
- Username/password admin login (`Appfactory24` / bcrypt-hashed)
- JWT session cookie (httpOnly, secure, samesite=none, 12h)
- Rate-limited login (5/15min per IP → 429)
- Forgot password → token via email + disk log
- Reset password rewrites `.env` atomically

### Email/Password Auth for Users (2026-02, fifth sprint) — this sprint
- **Signup + email verification**: `POST /api/auth/signup` creates user with bcrypt hash + `email_verified=false`; sends verify email
- **Login gated on verification**: 403 with resend prompt until email confirmed
- **Coexists with Google OAuth**: same `session_token` cookie mechanism → zero downstream changes
- **Password reset**: forgot → generic response (no enumeration) → email token → set new password → invalidates all sessions
- **Timing-safe**: bcrypt runs even for non-existent users
- **Rate limit**: 5 attempts per 15 min per IP across signup/login/forgot
- **Password hash stripped** from `/auth/me` + login responses
- **New frontend pages**: `/verify`, `/forgot`, `/reset` + rewired `/login` with Email/Google tabs
- **Signup upgrade path**: OAuth-only user can set a password to enable email login on the same account

### Pre-deployment Hardening (2026-02, fourth sprint) — this sprint
- **Email notifications** via Emergent-managed transactional email: booking confirmed, trial ending, payment failed (dunning), admin reset. Hard guardrail gate on every send (G1-G4). Fallback: on-disk log at `/app/memory/email_log.txt` if key unset.
- **Customer account recovery** at `/account/recover` (Google OAuth users → Google account recovery, not app-level password)
- **Terms of Service** at `/terms` + **Privacy Policy** at `/privacy` — payment-ready legal copy
- **HTTPS**: enforced by Emergent ingress (all traffic over TLS by default). All cookies flagged `secure`.
- **Trial expiry notifications**: `customer.subscription.trial_will_end` webhook fires ~3 days before conversion → email + in-app banner
- **Failed payment dunning**: Stripe auto-retry (Dashboard config) + `invoice.payment_failed` webhook → dunning email with portal link
- **Customer billing portal**: `POST /api/subscriptions/portal` opens Stripe hosted portal for cancel/update-card/invoices
- **Admin analytics** at `/admin`: customers, craftsmen, active subs, MRR, one-time revenue, jobs/week, pending licenses, past-due, referrals
- **Multi-admin RBAC**: `db.admin_users` with `owner`/`reviewer` roles; owners can add/disable admins from UI
- **Audit log**: every admin login + approve/reject + admin-user CRUD → `db.admin_audit` (viewable in UI)
- **SEO**: `useSEO` hook wired on Landing/TOS/Privacy/Recover, per-page title+description+canonical+OG+Twitter. Sitemap extended (`/live`, `/pro`, `/terms`, `/privacy`).
- **Promo/discount codes**: `allow_promotion_codes: True` on both one-time Checkout and subscription Checkout. Codes created in Stripe Dashboard auto-work.

### Media, Portfolios & Gemini AI (2026-02, sixth sprint) — this sprint
- **Leaderboard Season Reset**: `/api/referrals/leaderboard?period=monthly|all_time` with UTC calendar-month bounds. Landing tabs (This month / All-time) + live countdown badge ("Resets in Xd Yh").
- **Emergent Object Storage** via `INTEGRATION_PROXY_URL/objstore/api/v1/storage`:
  - `POST /api/uploads` (multipart, kind=portfolio|job|license|generic) → 50 MB cap, MIME whitelist (jpg/png/webp/gif/pdf), 415/413/400 rejections
  - `GET /api/files/{file_id}` → serves bytes; `license` kind is private (owner or admin JWT only)
  - `db.uploads` tracks metadata with soft-delete flag
- **Handyman Portfolio Gallery** (new tab in HandymanDashboard):
  - `POST /api/portfolio`, `GET /api/portfolio/{handyman_id}` (public), `GET /api/portfolio/me/items`, `DELETE /api/portfolio/{item_id}` (soft-deletes upload)
  - Drag-picker uploads, progress %, thumbnail grid with hover-to-remove, "AI" badge on generated images
- **Gemini AI**:
  - `POST /api/ai/image/generate` → Nano Banana (`gemini-3.1-flash-image-preview`), auto-saves to storage, optional `save_to_portfolio=true` for handymen, 20 images/user/day cap
  - `POST /api/ai/gemini/chat` → Gemini 3 Flash (`gemini-3-flash-preview`) one-shot text
  - New modules: `/app/backend/storage.py`, `/app/backend/gemini_svc.py`

## Backlog (P1)
- Refactor `server.py` (3560+ lines) into `routes/` + `services/` + `models/`
- Split large React pages into sub-components (CraftsmanOnboarding, AdminLicenses, CustomerDashboard, Login)
- Remove `/api/auth/demo-login` (or gate to non-prod) before real users
- Wire live Stripe keys once account activation is complete
- Rate-limit public AI endpoints (`/diagnose`, `/chat`) per IP
- Extract `_is_admin_bearer(authorization)` helper (currently duplicated in `download_file`)

## Backlog (P2)
- Milestone escrow releases
- Refund UI
- Time-lapse "rewind" scrubber on `/live`
- Handyman availability toggle from map marker
- Analytics: weekly/monthly cohort retention chart
- Admin: bulk-email users (behind G5 guardrail check)
- Real map view of handymen with clustering
- Auto-generate blog cover images via Nano Banana on `_run_generation`
- Job diagnosis photos: migrate from base64 (`/ai/diagnose`) to storage-backed uploads

## Test Coverage (iteration 8, 2026-02)
- Backend: 23/23 new pytest cases pass (uploads, portfolio CRUD, private license auth, Nano Banana, Gemini text, leaderboard periods) + all prior iterations regression-clean
- Frontend: Playwright verified landing leaderboard tabs + countdown, handyman Portfolio tab with upload and AI mockup UI
- Deployment: `deployment_agent` PASS (before this sprint)
