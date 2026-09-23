# CraftPulse AI — Google Play Store Listing Content

Copy-paste these fields directly into Play Console → Store presence → Main store listing.

---

## App name (30 char max)
```
CraftPulse AI — Handyman
```
*(28 chars, ✓)*

## Short description (80 char max)
```
Snap a photo. AI diagnoses the fix. Book a vetted NYC craftsman in under a minute.
```
*(80 chars, ✓)*

## Full description (4000 char max)

```
CraftPulse AI turns a photo into a booked repair.

Broken outlet? Cracked tile? Leaky faucet? Take one picture with your phone. Our AI (Claude Sonnet vision) reads the photo, identifies the exact problem with a labeled bounding box, estimates the price range, and matches you with a vetted NYC craftsman in seconds — with Stripe-backed escrow payments and a $25 signup credit for your friends.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY HOMEOWNERS USE CRAFTPULSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📸 AI DIAGNOSIS FROM A PHOTO
No more Googling "why is my ceiling leaking". Snap → analyze → know the fix.

⚡ INSTANT SMART MATCHING
Our neural ranker weighs skills, distance, rating, and rate to surface the top three pros for YOUR job.

🛡️ VERIFIED CRAFTSMEN
Every craftsman on CraftPulse passes a license check. Look for the verified badge on every profile.

💳 ESCROW-PROTECTED PAYMENTS
Pay when you book. Your money is held safely until the job is done to your satisfaction.

⭐ REAL REVIEWS
Post-job 5-star reviews from real customers — no fake bots, no paid placements.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY CRAFTSMEN USE CRAFTPULSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 REAL-TIME LEAD ALERTS
Get notified the second a matching job posts near you — via push notification, in-app SSE, and email.

📈 SMART RANKING
The better your reviews and license, the higher you rank. No pay-to-play bidding.

🗺️ LIVE MAP
See every open job across NYC in real time. Filter by trade. Never miss a lead in your neighborhood.

💼 HANDYMAN PRO — $1 TRIAL
Unlock priority matching, verified badge, and live alerts. First 7 days for $1, then $49/month. Cancel anytime.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POWERED BY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Claude Sonnet 4.6 — vision-based diagnosis + repair chat
• Stripe — PCI-compliant payments + subscriptions
• Emergent-managed transactional email
• Progressive Web App — instant loads, works offline for browsing

Built with tools, not templates.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Terms: https://craftpulse.app/terms
Privacy: https://craftpulse.app/privacy
Contact: loans24funding@gmail.com
```
*(~1780 chars, well under 4000)*

---

## App category
- **Application type**: App
- **Category**: Business
- **Tags**: Home services, Marketplace, AI Assistant

---

## Store listing contact details
- **Website**: `https://craftpulse.app`
- **Email**: `loans24funding@gmail.com`
- **External marketing name**: `CraftPulse AI`

---

## Privacy Policy (required)
- **URL**: `https://craftpulse.app/privacy`

## Terms of Service (recommended)
- **URL**: `https://craftpulse.app/terms`

---

## Content rating questionnaire — expected answers
- Violence / gore: No
- Sexual content: No
- Language: Mild only (allowed)
- Controlled substances: No
- Simulated gambling: No
- User-generated content shared with other users: **Yes** (reviews, messages between customer & pro) → moderation described in Terms
- Personal information collected: **Yes** (email, name, profile pic, optional location)
- Interactive elements: In-app purchases, User-to-user communication
- Target age group: **13+** (default), or 18+ if you're strict about payment law

Expected outcome: **Everyone** or **Teen** — safe for all major storefronts.

---

## Data safety declaration (required as of 2022)

### Data collected
| Type | Purpose | Shared with third parties? | Optional? |
|---|---|---|---|
| Name | Account, communication | Stripe (payments), matched pro | Required |
| Email | Account, verification, transactional email | Stripe, Emergent (email delivery) | Required |
| Profile photo | Display in profile & chats | Matched pro | Optional |
| Approximate location | Matching, live map | Matched pro (fuzzed ~1 km) | Optional |
| Photos uploaded to app | AI diagnosis | Anthropic (via Emergent) — used to generate diagnosis only, not for training | Required |
| Payment info | Processing | Stripe only — we never see card numbers | Required |
| Chat messages | Coordinate work | Matched pro | Required |

### Security practices
- Data is encrypted in transit (HTTPS everywhere)
- Data is encrypted at rest (managed MongoDB)
- Users can request deletion via `loans24funding@gmail.com`
- Follows Play Store's Families policy: No

---

## Screenshots — required assets

Take these on your phone (or in Chrome DevTools iPhone 14 Pro preset — 393×852):

1. **Landing hero with tour** — screenshot the animated walkthrough at Scene 2 ("AI diagnoses it") for maximum wow factor
2. **AI Diagnostic Studio** — show the bounding-box overlay + confidence badge on a real photo
3. **Smart match results** — the three pro cards with % match scores
4. **Live map** — Brooklyn zoomed in with pulses + filter chips visible
5. **Booking confirmed screen** — green check + escrow badge
6. **Handyman Pro upsell** — the "$1 for 7 days" card

Format: 1080×2400 PNG or JPEG. Minimum 2, recommended 6-8.

## Feature graphic — required (1024×500)

Suggested composition:
- Dark background matching the app (slate-950)
- Big amber "CraftPulse AI" wordmark left-aligned
- On the right: a phone mockup showing the AI-diagnosed photo with bounding box
- Tagline overlay: "Fix your home in one photo."

Build in Figma / Canva (free templates exist for "Google Play Feature Graphic 1024x500").

---

## App icon
Use `/app/frontend/public/icon-512.png` (512×512 PNG, transparent-optional).

## Adaptive icon (optional but recommended)
Use `/app/frontend/public/icon-512-maskable.png` (512×512 with safe-zone padding).

---

## Release notes template (for each new version)
```
New in this release:
- <what's new — user-facing only>
- <bug fixes>
```

Keep under 500 chars. Play Store shows this in the "What's New" section.
