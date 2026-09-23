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

## Backlog (P1)
- Refactor `server.py` (2800+ lines) into `routes/` + `services/` + `models/`
- Split large React pages into sub-components
- Remove `/api/auth/demo-login` (or gate to non-prod) before real users
- Wire live Stripe keys once account activation is complete
- Rate-limit public AI endpoints (`/diagnose`, `/chat`) per IP

## Backlog (P2)
- Milestone escrow releases
- Refund UI
- Time-lapse "rewind" scrubber on `/live`
- Handyman availability toggle from map marker
- Analytics: weekly/monthly cohort retention chart
- Admin: bulk-email users (behind G5 guardrail check)
- Object Storage for hi-res job photos (currently base64)
- Real map view of handymen with clustering

## Test Coverage (iteration 6, 2026-02)
- Backend: 43/43 pytest cases pass (31 new + 12 regression from iter5)
- Frontend: 9/9 Playwright flows (admin login, dashboard, TOS, Privacy, Recover, forgot)
- Deployment: `deployment_agent` PASS (before this sprint)
