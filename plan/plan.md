# Contractor Paywall, Escrow Payments & Verified Email

An AI handyman marketplace where contractors pay a $50/month subscription to work jobs, customers pay upfront into a platform-held escrow, and funds are released to the contractor once the job is confirmed complete — with a 10% platform fee taken from the payout. Email verification finally works reliably.

## Who it's for

- **Homeowners / customers** who want confidence that their money is safe until the work is actually done.
- **Contractors / craftsmen** who want a steady flow of vetted jobs, transparent payouts, and same-day cash-out options.
- **The platform operator** who wants recurring subscription revenue plus a per-job take-rate, without the operational burden of running real bank rails.

## Core features and experience

**Reliable email verification**
- Signup, password reset, and re-verify links actually arrive. Failures are surfaced to the user with a "Resend" affordance instead of vanishing into a black hole. Verification links are single-use, expire in 24 hours, and every send is logged so the admin can trace it. A "verified" badge appears on the contractor's public profile.

**Contractor $50/month paywall**
- Every new contractor account can complete profile and portfolio setup for free but cannot receive job leads, chat with customers, accept quotes, or be listed in map/search results until they hold an active subscription.
- Subscription flow: 14-day free trial → $50/month recurring on card. Cancel any time; access ends at period end. Failed payments trigger a 3-day dunning grace with retry, then downgrade to read-only.
- The paywall itself is a full-screen gate the first time a contractor tries a paid action, plus a persistent yellow banner across the dashboard when the trial is nearing its end or the subscription is past due.
- Existing contractors are grandfathered onto a first-month free comp.

**Real escrow — customer pays platform, platform pays contractor on completion**
- When a customer accepts a contractor's quote, they pay the full quoted amount immediately into the platform's Stripe balance (Payment Element: card, Apple Pay, Google Pay, Link, and US Bank ACH for jobs over $500).
- The funds sit in a "held" state visible on both the customer's and contractor's job pages ("$X held in escrow · releases on completion").
- The contractor marks the job "complete." The customer has 72 hours to approve or dispute. On approval — or automatically after 72 hours of silence — the platform runs a Stripe Transfer to the contractor's connected account for 90% of the job total, keeping the 10% platform fee.
- On dispute, the funds stay in escrow pending admin review; the admin dashboard gets a "Disputed jobs" queue with the ability to release, refund, or split. Full refunds route through Stripe's refund API back to the customer's original method.

**Contractor payouts**
- Every contractor connects a Stripe Connect Express account during onboarding (KYC handled by Stripe). Standard payouts land in a linked bank account in 2 business days at no cost.
- Optional: **Instant Payout to Debit Card** — one-tap "Cash out now" on the earnings dashboard sends the balance to a linked debit card in ~30 minutes for a 1% fee (Stripe passes this through; platform doesn't upcharge).
- Earnings dashboard shows: available balance, in-escrow (jobs not yet released), lifetime earned, platform fees paid, plus per-transaction breakdown.

**Fee model**
- Customer sees the price the contractor quoted (e.g. $200). Nothing is added on top.
- Contractor receives $180. Platform keeps $20. Every quote screen and receipt shows this split clearly so no one is surprised.

**Payment methods matrix**
- **Customer paying into escrow:** Card, Apple Pay, Google Pay, Link, and US Bank ACH (ACH offered only on jobs ≥ $500 due to 3–5 day settlement).
- **Contractor receiving payout:** Bank account (via Stripe Connect, standard 2-day payout) and Instant Payout to debit card.

## User flow

**Contractor onboarding (paywall path)**
1. Sign up → verify email (link arrives; if it doesn't, "Resend" button is one click away).
2. Complete profile, add portfolio, upload license/insurance.
3. Prompted to start 14-day free trial. Card captured, no charge yet.
4. During onboarding they also complete Stripe Connect Express (one redirect to Stripe, back to app on finish).
5. Dashboard unlocks. Leads start flowing. Trial banner counts down.
6. On day 14 the card is charged $50. Recurring monthly from that point.

**Customer books, pays escrow, contractor completes**
1. Customer posts job → AI matches contractors → picks one → accepts quote ($200).
2. Payment Element opens. Customer picks card / Apple Pay / bank. Charge succeeds. Job status becomes "Funded — contractor scheduled."
3. Contractor does the work, taps "Mark complete" with optional photos.
4. Customer sees "Approve payment" prompt on the job page and in an email. They can approve, request revision, or dispute.
5. On approval (or 72 h auto-approve) the platform transfers $180 to the contractor's Connect account and records the $20 platform fee.
6. Contractor sees the payout land in their available balance, can cash out standard (free, 2 days) or instant (1% fee, ~30 min).

**Dispute path**
1. Customer clicks Dispute → picks a reason → adds notes/photos.
2. Contractor is notified, funds stay held.
3. Admin sees the dispute, contacts both parties, and resolves: release, refund, or partial. Every action is logged.

## UI/UX feel

- The escrow status and 10% split are shown plainly on every quote, receipt, and job card — no hidden fees, no surprises. A small "How escrow works" popover explains the flow on first view.
- The contractor's earnings dashboard reads like a modern fintech app: big available balance number, "Cash out" primary button, ledger below.
- Paywall gate is friendly, not aggressive — one hero line ("Unlock leads — free for 14 days"), one CTA, plus the ability to keep exploring the app in read-only mode.
- Email templates match the Craft Master Labs brand: dark header, amber accent, clear single call-to-action button.

## Implementation phases

**Phase 1 — MVP (built now)**
- Fix email verification: reliable send with retry, "Resend" endpoint and button, admin log of every send, single-use tokens with 24 h TTL, verified badge on profile.
- Contractor $50/month subscription via Stripe Billing with 14-day trial. Paywall gate + dashboard banner + read-only downgrade on lapse. First month free for existing contractors.
- Stripe Connect Express onboarding for every contractor, wired into the existing onboarding wizard.
- Payment Element on the customer's "Accept quote" screen: card, Apple Pay, Google Pay, Link, and US Bank ACH (ACH gated to jobs ≥ $500).
- Escrow lifecycle: charge on accept → funds in platform balance → contractor completes → customer approves (or 72 h auto-approve) → Transfer 90% to contractor, retain 10% fee.
- Contractor earnings dashboard: available balance, in-escrow, lifetime earned, fee ledger. Standard payout (free, 2 day) enabled by default. Instant Payout button that calls Stripe's instant payout API for 1% fee.
- Full-refund path on dispute-resolved-in-customer-favor and on admin action.

**Phase 2 — hardening & polish**
- Dispute admin console with structured resolution flow (release / refund / partial split, with attached notes and audit trail).
- Milestone escrow: jobs over a threshold ($1500+) can be split into up to 3 milestone releases, each independently funded and approved.
- 1099-K reporting export for contractors and platform, tied to Stripe's tax reports.
- Contractor tax settings surface (W-9 collection routed through Stripe).
- Configurable per-category fee (e.g. 8% for licensed trades, 12% for handyman jobs) — controllable in admin only, still defaulting to a flat 10%.

**Phase 3 — expansion**
- Subscription tiers (Basic $50, Pro $99 with priority placement and lower 7% fee, Team $199 with sub-accounts).
- Annual plan with a 2-month discount.
- Referral: contractors who refer other contractors get 1 month free per successful subscription.
- PayPal payout rail as an alternative to bank/debit for contractors in unsupported regions.
- International currency support beyond USD (EUR, GBP, CAD) with per-country payout rails.

## Assumptions

- **Currency and market:** USD only, US-based operations. International expansion is Phase 3.
- **Trial length:** 14 days. First-month-free comp applies to any contractor account created before this feature ships.
- **Fee rate:** flat 10% off the top of every completed job. Not configurable per contractor.
- **Auto-approve window:** 72 hours of customer silence after "mark complete" → funds release automatically. Emails and in-app nudges at 24 h and 48 h.
- **Dispute freeze:** as long as a dispute is open, funds stay in the platform balance. Nothing is released or refunded until an admin resolves it. Admin resolution is a manual action; no algorithmic dispute engine in Phase 1.
- **ACH threshold:** US Bank ACH is offered only on jobs of $500 or more, because settlement takes 3–5 business days and the contractor waits on funds landing before the escrow clock starts.
- **Payment authentication:** all card payments run through Stripe Radar and 3D Secure where the issuer requires it. No custom fraud rules in Phase 1.
- **Stripe account:** the platform uses the existing claimable Stripe sandbox for testing. Live keys are swapped on deploy after the operator claims the sandbox and completes KYC.
- **Refunds:** full refunds routed to the customer's original payment method. Partial refunds available via admin action only in Phase 1.
- **Existing contractor subscription code:** the current $1-trial-to-$49-per-month plan is replaced by this $50-per-month-with-14-day-trial plan. Any contractor already on the old plan is migrated to the new price at their next renewal with a 30-day advance notice email.
- **Email provider:** Resend (already integrated). The reliability fix is about correctness of our code paths, not a provider swap. Sends are logged in Mongo and shown in the admin audit view.
- **Existing "referral credits" system:** untouched. Credits still apply against job invoices before the escrow charge runs.
- **Legal:** the Terms of Service and payment disclosures are updated to reflect the new $50/mo plan, the 10% fee, the 72 h auto-approve, and the escrow-held-by-platform structure. No change to the underlying legal entity.
