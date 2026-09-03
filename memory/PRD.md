# CraftPulse AI - Product Requirements Document

## Original Problem Statement
> Need a handyman market place run by ai

## User Choices
- Both customer & handyman users (two-sided marketplace)
- AI: chat concierge + smart matching + photo diagnosis (all)
- Model: Claude Sonnet (via Emergent LLM key)
- Payments: Stripe (claimable sandbox, Flow A)
- Auth: Emergent-managed Google social login (+ demo bypass)
- User note: "Make it unique and advanced"

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (Claude Sonnet 4.6 vision & chat) + stripe SDK
- **Frontend**: React 19 + React Router + Tailwind + Shadcn UI + Sonner
- **Auth**: Emergent OAuth (`/auth/session`), session cookies, demo login bypass
- **Payments**: Stripe Flow A (claimable sandbox) with catalog of 4 service tiers + webhook + polling
- **AI**: Claude Sonnet 4.6 vision for photo diagnosis (structured JSON), streaming chat concierge, deterministic scored matching

## Features Implemented (2026-02)
- Landing page: hero, categories, workflow, top craftsmen, CTAs
- Google OAuth + demo login for both roles
- AI Vision Diagnostic Studio: upload/sample photo → issue, severity meter, parts, tools, price range, tier
- AI Repair Concierge Chat (streaming SSE)
- Neural Smart Matching (skills, rating, experience, rate)
- Job posting from diagnosis
- Handyman dashboard: profile studio, live leads with match %, accept/decline, availability toggle
- Stripe Checkout for booking (4 tiers: quick_fix $75, standard $150, major $325, emergency $500)
- Payment success/cancel pages with status polling
- Webhook syncs job to `paid` and assigns handyman

## Backlog (P1)
- Real-time notifications (websockets) for new leads
- Handyman reviews & ratings from customers
- Photo bounding-box overlay from Vision AI
- Object Storage for hi-res job photos (currently base64)
- Real map view of handymen (currently text service area)
- Multi-photo uploads per job

## Backlog (P2)
- Handyman KYC/license verification badge flow
- In-app chat between customer & assigned craftsman
- Milestone escrow releases (currently single-payment)
- Refund UI
