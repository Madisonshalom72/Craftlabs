# CraftPulse AI - Product Requirements Document

## Original Problem Statement
> Need a handyman market place run by ai

## User Choices
- Both customer & handyman users (two-sided marketplace)
- AI: chat concierge + smart matching + photo diagnosis (all)
- Model: Claude Sonnet (via Emergent LLM key)
- Payments: Stripe (test mode, keys rotated 2026-02)
- Auth: Emergent-managed Google social login (+ demo bypass)
- User note: "Make it unique and advanced"

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (Claude Sonnet 4.6 vision & chat) + stripe SDK
- **Frontend**: React 19 + React Router + Tailwind + Shadcn UI + Sonner + Leaflet
- **Auth**: Emergent OAuth (`/auth/session`), session cookies, demo login bypass
- **Payments**: Stripe one-time Checkout (jobs) + Stripe Subscriptions (Handyman Pro $1 trial → $49/mo)
- **AI**: Claude Sonnet 4.6 vision for photo diagnosis, streaming chat concierge, deterministic scored matching
- **Realtime**: SSE for lead alerts (private) + SSE for map pulses (public) + Web Push

## Features Implemented

### Baseline (2026-02, first sprint)
- Landing page: hero, categories, workflow, top craftsmen, CTAs
- Google OAuth + demo login for both roles
- AI Vision Diagnostic Studio with bounding boxes
- AI Repair Concierge Chat (streaming SSE)
- Neural Smart Matching (skills, rating, experience, rate, distance)
- Job posting from diagnosis
- Handyman dashboard: profile, live leads, accept/decline, availability
- Stripe Checkout for booking (4 one-time tiers)
- SEO Category pages + auto-generated Blog articles + editor bylines
- Craftsman Onboarding wizard with License Uploads
- Admin Review Queue with bulk approve/reject
- PWA + Web Push Notifications + TWA configs

### Subscriptions, Referrals, Live Map (2026-02, this sprint)
- **Handyman Pro subscription**: $1 for 7-day trial, then $49/mo recurring
  - Stripe Checkout Session with `trial_period_days=7`; $1 one-off invoice item attached to first invoice
  - Stripe Customer Portal for manage/cancel/update card
  - Webhook lifecycle: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
  - Lead gating: `POST /api/jobs/{id}/accept` returns 402 for handymen without active Pro
  - `/pro` page + `/pro/success` polling page
  - Subscription badge + upsell banner + past-due banner on `/handyman`
- **Referral Program**: $25 credit to both sides, monthly cap 10
  - Every user gets a deterministic `CP<6char>` code
  - `/r/<code>` route captures code in localStorage; attached on next auth
  - Credits awarded on qualifying event: first paid job (customer) or trial start (handyman)
  - ReferralPanel component with copy-link + SMS/WhatsApp/X share on both dashboards
- **Live Match Map** at `/live` (public):
  - Leaflet + OpenStreetMap tiles (no API key required)
  - 12 handyman avatar pins with fuzzed (~1km) NYC borough coords
  - Recent jobs (15 min) rendered as pulsing amber circles
  - Public SSE stream `/api/map/stream` broadcasts new jobs in real-time

## Backlog (P1)
- Handyman KYC/license verification badge flow → DONE
- Refactor `server.py` (2100+ lines) into modules: `routes/`, `models/`, `services/`
- Split large React pages (CustomerDashboard, HandymanDashboard, AdminLicenses) into sub-components
- Missing useEffect dependency warnings in AdminLicenses.jsx line 78

## Backlog (P2)
- Object Storage for hi-res job photos (currently base64)
- Real map view of handymen with clustering
- Multi-photo uploads per job
- Milestone escrow releases
- Refund UI
- Tiered referral rewards (bigger for 10th referral)
- Landing page live-map preview widget (moved from this sprint's scope)
- Trial-ending-in-2-days email via Resend (currently in-app banner only)

## Test Coverage (iteration 5, 2026-02)
- Backend: 12/12 pytest cases pass (Stripe subs, referrals, map endpoints, gating)
- Frontend: 7/7 Playwright flows pass (/pro, /live, /r/:code, banners, referral copy)
- Deployment: `deployment_agent` PASS
