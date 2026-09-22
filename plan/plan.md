# Plan: Subscriptions, Referrals, Live Match Map

Three features on top of the existing CraftPulse AI marketplace. Each section lists what will be built, the decisions the user needs to confirm, and the assumptions that will be made if no correction is given.

---

## 1) Stripe Subscriptions — $1 trial → monthly

### What gets built
- A subscription plan called **Handyman Pro**. Handymen can only appear in the smart-match lead feed and accept leads while their subscription is active.
- A **paid trial**: the first invoice is $1 (covering the trial window). After the trial ends, Stripe automatically charges the full monthly price on a recurring cadence.
- A new page at `/pro` (linked from the handyman dashboard) with plan details, benefits, and a “Start $1 trial” button that opens Stripe Checkout.
- A **Manage subscription** button in the handyman dashboard that opens Stripe’s Customer Portal (built-in cancel, update card, view invoices — no custom UI to maintain).
- Backend webhook handling for the full subscription lifecycle: trial started, trial ending soon, first real charge, renewals, payment failures, cancellation, expiry.
- A visible **subscription state badge** in the handyman dashboard (Trial · Active · Past Due · Canceled) and gating on the leads endpoint so lapsed handymen stop receiving new leads immediately.
- Reminder email (via existing Emergent/Resend flow, if wired — otherwise in-app banner only) when the trial is 2 days from converting.

### Decisions the user needs to confirm

**1a. Who can subscribe?**
- Assumption: **Handymen only** (Pro membership for lead access). Customers stay on pay-per-job.
- Alt: also add a customer premium tier — say so and it will be added as a second plan.

**1b. Monthly price after trial**
- Assumption: **$49 / month USD**.
- Alt: pick another amount and/or currency (EUR, GBP, INR, etc.).

**1c. Trial length**
- Assumption: **7 days for $1**.
- Alt: 14 or 30 days.

**1d. What happens the moment a subscription becomes past-due or canceled?**
- Assumption: **Immediate lead cutoff**. Handyman stays visible in search but sees a “Reactivate Pro” banner and cannot accept new leads. Existing accepted jobs are unaffected.
- Alt (soft): 3-day grace period before cutoff.

**1e. Keep the existing pay-per-job Stripe Checkout, or replace it?**
- Assumption: **Keep both**. Customers still pay per job at booking. Subscriptions are a separate revenue stream for handymen only.
- Alt: replace per-job payments with a “subscription covers everything” model (bigger UX rewrite — flag if wanted).

**1f. Tax handling**
- Assumption for the subscription product: **Stripe manages tax collection and remittance for you (+3.5% per transaction)** where eligible. If ineligible, falls back to Stripe calculating tax at checkout while the user files themselves (+0.5%).
- Alt: DIY (Stripe just processes payment, no tax help).

### Out of scope
- Multiple tiers (Pro / Elite / etc.).
- Annual plans, seat-based pricing, or team accounts.
- Proration when switching plans (only one plan exists).
- Invoicing outside Stripe’s hosted portal.

---

## 2) Referral Program

### What gets built
- Every logged-in user gets a **unique share link** (`/r/<code>`) visible in their dashboard, with one-tap copy and pre-written share text for SMS / WhatsApp / X.
- When someone new opens a referral link, the code is stored client-side and attached to their account at signup.
- Rewards are credited automatically when the **qualifying event** fires (see decision 2c). Credits are tracked in a new `credits` collection and shown as a running balance in each dashboard.
- Credits are redeemed at checkout — during job booking (for customers) or on the next subscription invoice (for handymen).
- A public leaderboard is **not** built. Referrals are private.
- Basic anti-abuse: one reward per unique referred email + IP + payment method, self-referral blocked, referrer cannot be the same user as the referred.

### Decisions the user needs to confirm

**2a. Who gets rewarded?**
- Assumption: **Both sides** — referrer and new user each receive a reward.
- Alt: referrer only.

**2b. What is the reward?**
- Assumption: **$25 account credit** applied to the next job (customer) or the next subscription invoice (handyman). Credits never expire and can stack.
- Alt A: **First job free** (up to a capped value, e.g. $150).
- Alt B: **One free month of Pro** for handymen who refer another handyman that starts a trial.
- Alt C: **Cash payout** via Stripe Connect (adds significant compliance overhead — flag if wanted).

**2c. What triggers the reward?**
- Assumption: **First completed paid job** for a referred customer, OR **trial started** for a referred handyman. Reward posts once, on the first qualifying event.
- Alt: reward on signup (higher fraud risk).

**2d. Any cap per user?**
- Assumption: **10 successful referrals per user per month**, then throttled.
- Alt: no cap / different number.

### Out of scope
- Tiered rewards (bigger reward for the 10th referral, etc.).
- Time-limited campaigns or seasonal promo codes.
- Attribution across devices without the link click (no fingerprinting).
- Payouts to bank accounts (would need Stripe Connect + KYC).

---

## 3) Instant Match Map — live nearby craftsmen with pulse animation

### What gets built
- A new **Live Map** view at `/live` (also embedded on the landing page as a smaller preview widget).
- The map plots:
  - Active handymen currently marked “Available” (small avatar pin).
  - Recently posted jobs (last 15 min), with a **pulse ring animation** radiating outward at the job’s location.
  - The current user’s own location (if permission granted; otherwise defaults to a city-level view).
- When a new job is posted anywhere on the visible map, the pin drops in real time with the pulse animation. Powered by the existing SSE channel (already used for lead alerts) — no new infra.
- Clicking a handyman pin shows a card (name, avatar, rating, top skills, distance) and a **View profile** / **Message** CTA.
- Clicking a job pulse (public info only) shows category and rough location — no personal details.
- **Privacy**: handyman and job coordinates are **fuzzed to a ~1 km radius** so exact home addresses are never exposed. Fuzz seed is stable per user, so a pin doesn’t “jitter” between refreshes.

### Decisions the user needs to confirm

**3a. Map provider**
- Assumption: **Leaflet + OpenStreetMap tiles** (free, no API key, decent styling). Zero cost, works everywhere.
- Alt A: **Mapbox GL** — nicer visuals, custom dark theme to match the app; free up to 50k loads/month, user provides an access token.
- Alt B: **Google Maps** — most familiar UX; user provides an API key and pays after 28k loads/month.

**3b. Where does the map appear?**
- Assumption: **Both** — a dedicated `/live` page (full-screen) and a compact preview widget on the landing page hero.
- Alt: dedicated page only, or landing widget only.

**3c. Public or logged-in only?**
- Assumption: **Public** — visitors can see the map and pulses (great for conversion / SEO). Clicking through to profiles requires login.
- Alt: fully behind auth.

**3d. What triggers a pulse animation?**
- Assumption: **New job posts** ripple outward for ~4 seconds. Handyman “now available” toggles do **not** pulse (would create too much noise).
- Alt: pulse both events.

**3e. What if handymen have no lat/lng today?**
- The existing schema stores service-area text, not coordinates. Assumption: **geocode existing handymen once** using their service-area string (via a free Nominatim call). New signups will collect precise location via browser geolocation with consent.
- Alt: ask every existing handyman to re-enter their service area on next login (more accurate, higher friction).

### Out of scope
- Routing / turn-by-turn directions.
- Live GPS tracking of handymen en route to a job.
- Heatmaps of demand.
- Clustering algorithms beyond Leaflet’s default marker cluster plugin.

---

## Cross-cutting notes

- All three features respect the existing role model (customer / handyman / admin).
- Nothing here changes the login flow, the AI diagnostic studio, the SEO blog, or the admin license queue.
- No new third-party accounts are required unless the user chooses Mapbox (3a) or Google Maps (3a) or cash-payout referrals (2b Alt C).
- Existing Stripe test keys already in the environment cover the subscription work. Going live is a separate key flip, not part of this build.

---

## Summary of decisions needed from user

| # | Question | Default if silent |
|---|---|---|
| 1a | Who subscribes? | Handymen only |
| 1b | Monthly price | $49 USD |
| 1c | Trial length | 7 days for $1 |
| 1d | Lapse behavior | Immediate lead cutoff |
| 1e | Keep pay-per-job? | Keep both |
| 1f | Tax handling | Stripe managed (+3.5%) |
| 2a | Who gets rewarded? | Both sides |
| 2b | Reward | $25 credit |
| 2c | Trigger | First paid job / trial start |
| 2d | Cap | 10 per month |
| 3a | Map provider | Leaflet + OSM (free) |
| 3b | Map placement | Dedicated page + landing widget |
| 3c | Public or auth? | Public |
| 3d | Pulse trigger | New jobs only |
| 3e | Handyman coords | Auto-geocode existing, browser geo for new |

Confirm the defaults, override any of them, or say “go” to accept everything as-is.
