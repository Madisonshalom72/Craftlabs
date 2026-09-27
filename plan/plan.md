# Booking → Payment · Regional Pricing · Contracts · Admin Ops

The customer-facing booking flow becomes a real quote-to-contract-to-payment pipeline. Every booking builds an itemized job list priced against a regional labor + materials rate table, generates a signed contract with terms and payment schedule, gives the contractor one bounded chance to counter, and — only after both sides sign — routes the customer to a Stripe escrow payment page. Admins get a security-gated console to hand-load contractors and override any price on the rates table.

## Who it's for
- **Homeowners** who want to see line-by-line what they're paying for and a locked total before their card is charged.
- **Contractors** who want a clean single-tap accept, one counter-offer lever, and a signed contract they can point to in a dispute.
- **The operator** (you) who needs to onboard trusted contractors manually, set correct prices for each state you launch in, and know that every button on the site actually goes somewhere.

## Core features and experience

### Customer side
- **Itemized job builder during booking.** Customer describes the job, uploads photos, and the AI Diagnostic Studio auto-suggests line items (e.g., "Replace GFCI outlet · Electrical"). Each item shows a price that is computed automatically: labor hours × the customer's state's labor rate + materials × the state's markup percentage. Customer can add, remove, and edit items before submitting; the total updates live.
- **Booking button now routes to a payment page.** After the contractor accepts (or counter-offer is agreed), the booking button changes to "Pay & fund escrow" and takes the customer straight to the Stripe Payment Element for the exact final total. Escrow flow, 10% platform fee, milestone toggle for jobs ≥ $1,500 all still apply.
- **Signed contract before charge.** A one-page contract PDF is generated at quote-acceptance time — itemized breakdown, T&C, payment schedule, escrow-hold terms, 72-hour auto-release clause, dispute process. Customer signs digitally (typed name + timestamp + IP). Contractor countersigns. Only after both signatures does the payment page unlock.
- **Manual PDF upload fallback.** If either party has a preferred contract, they can upload a signed PDF instead of the generated one; the system stores it and treats it as the source of truth. Auto-generation is skipped in that case.

### Contractor side
- **Counter-offer, capped at +20%.** When a contractor opens a booking, they see the customer's total and can either accept as-is or submit one counter with a new total. The counter is rejected server-side if it exceeds 120% of the customer's original total. Customer sees the counter and either accepts or declines; a declined counter kills the booking (contractor can't re-counter — one shot).
- **Read-only itemization on the counter form.** Contractors see the customer's line items but can only propose a new bottom-line total (with a required "why" note). They cannot silently edit individual items — that would defeat the transparency of the itemized flow.
- **Contract obligations shown before accept.** Contractor sees the exact T&C, payment schedule, and platform fee before they can accept — no hidden terms disclosed after the fact.

### Admin side
- **Security-gated admin login already exists** (`Appfactory24` root admin, rate-limited JWT with 12h expiry, `disabled=false` check). No new auth work — the existing admin console gets three new tabs.
- **Contractor Loader tab.** Admin fills a form (name, email, phone, service state, skills, license number, hourly-rate override, temp password) and creates a fully-provisioned contractor record. The contractor gets a "You've been added by an admin — set your password" email; they land on their dashboard already onboarded and approved.
- **Rates Table tab.** Admin sees a 50-row table (one row per US state) with two editable columns: **Labor $/hr** and **Materials markup %**. Edits save immediately with an audit log entry. New quotes computed from the moment of the edit onward pick up the new rates. Existing signed contracts are unaffected — they lock the rates at signing time.
- **Price Override tab.** When resolving a dispute or fixing a pricing bug, admins can adjust any un-funded quote's total (with a required reason logged to `admin_audit`). Funded/held-in-escrow quotes are read-only from this surface — dispute flow handles those.

### Deployment-readiness pass
Every button and link is walked through and confirmed to reach a live destination:
- Landing hero → live scan → diagnosis → booking builder → contractor accept → contract signing → payment page → Stripe → success page → customer dashboard.
- Contractor magic-link → dashboard → job lead → counter form → contract review → sign → mark complete → payout page.
- Admin login → contractor loader → rates table → price override → disputes queue → license queue.
- No 404 buttons. No "coming soon." No links pointing at `#`. Broken chains get a redirect or a friendly "not available yet" page.

## User flow

### Homeowner books a repair
1. Lands on `/`, taps **Start a live scan**.
2. Uploads photo → AI Diagnostic Studio flags 2–3 items.
3. Reviews the auto-generated itemized list, tweaks quantities, sees the total roll up.
4. Taps **Book** → job posted, contractor gets a match notification.
5. Contractor accepts (or counters within 20 %). Customer sees the outcome.
6. Contract PDF appears — customer reads T&C, types name to sign.
7. Contractor countersigns from their dashboard.
8. Customer's original **Book** button, still on their dashboard, becomes **Pay & fund escrow $X** and routes to the Stripe Payment Element.
9. Payment succeeds → escrow held → contractor sees "Cleared to start" push and email.
10. Work happens → contractor marks complete → 72 h auto-release fires → customer's card was already charged, contractor's Connect account gets the payout.

### Contractor accepts a lead
1. Lands on `/handyman`, sees the new lead card with the full itemized breakdown.
2. Taps **Accept** to take the job at the customer's total, or **Counter** to propose up to 120 %.
3. If counter: fills a new total + a "why" note, sees a client-side error if they exceed 120 %.
4. Signs the contract, work begins after customer's payment clears.

### Admin adds a contractor
1. Logs into `/admin` with username + password.
2. Opens the **Contractor Loader** tab, fills the form, hits **Create**.
3. New contractor lands in the seeded list, gets a welcome email, and shows up on the live map immediately.

## UI/UX feel
- **Line items look like a bill, not a form.** Each row: name, quantity, unit price, subtotal, right-aligned money in a monospace font.
- **The counter-offer form is one screen with a hard cap.** Slider or number input that visibly redlines above 120 % of the customer's total. No "review your counter" step — one click, one commit.
- **Contract signing is deliberate.** A checkbox for "I've read the terms" (required), a typed-name field that mirrors the account's legal name (required), a timestamp shown in the customer's timezone. No dark patterns; no pre-checked boxes.
- **Admin surfaces stay boring.** Tables, forms, save buttons. No hero copy, no animations. The current admin console's dark-slate palette carries.
- **Regional rates render as an editable spreadsheet.** Not a modal-per-row. Not a form. A table with in-place inputs and a save-all button.
- **Every state change is confirmed to the user.** Booking submitted → toast. Contract signed → toast. Payment held → toast. Push notifications for the async side (contractor cleared to start, customer contract needs signing).

## Implementation phases

### Phase 1 — MVP (this session)
- **Regional rates table**: seed a `pricing_rates` collection with 50 US state rows sourced from BLS-style public data (labor $/hr and materials markup %). Add `GET /api/pricing/rates` (public read) and admin-only `PUT /api/admin/pricing/rates/{state}`.
- **Itemized job payload**: extend the `jobs` collection to store `items: [{label, category, hours, materials_cost, unit_price_cents, quantity, subtotal_cents}]` and `pricing_snapshot: {state, labor_hourly_cents, materials_markup_pct}` locked at booking time. New endpoint `POST /api/jobs/{id}/items/estimate` returns the priced list from a raw item description.
- **Booking builder UI**: rework the booking flow so the customer sees line items and totals before submitting. Payment button on the customer dashboard swaps to **Pay & fund escrow $X** once the contract is countersigned.
- **Counter-offer**: `POST /api/jobs/{id}/counter` (contractor only, once per job, cap enforced at 120 % of `quoted_amount_cents`, records `counter_reason`); `POST /api/jobs/{id}/counter/{accept|decline}` for the customer's response.
- **Contract generator**: `POST /api/jobs/{id}/contract/generate` produces an HTML → PDF (via `weasyprint` or `reportlab`, whichever installs cleanly on the current Python) with items, T&C, payment terms, escrow clause. Stored in Emergent Object Storage; served via `GET /api/jobs/{id}/contract`. Digital signing: `POST /api/jobs/{id}/contract/sign` with `{typed_name, party}` records signer + timestamp + IP; both parties must sign before payment unlocks.
- **Manual contract upload**: `POST /api/jobs/{id}/contract/upload` accepts a PDF and marks `contract_source = "manual"`, skipping the generated one.
- **Admin contractor loader**: new admin tab + `POST /api/admin/contractors/create` (owner-only) that spawns a user + handyman_profile with `verification_status="approved"`, sends a "set your password" email.
- **Admin price override**: `PATCH /api/admin/jobs/{id}/pricing` (owner-only, un-funded jobs only, audit-logged).
- **T&C copy**: I draft a standard handyman-marketplace clause set (mutual arbitration, 72 h escrow auto-release, dispute process, 10 % fee acknowledgment, refund policy) into `TERMS_TEMPLATE` and inline it into the generated contract. You can edit the copy at `/app/backend/contract_terms.py` anytime — no code change needed.
- **Deployment walk-through**: every internal link and button audited via a scripted click-through (Playwright), broken destinations fixed or given a placeholder page.
- **`deployment_agent`** runs at the end. Green means ready to deploy.

### Phase 2 — post-launch polish (not this session)
- Zip-code-level rate overrides on top of the state defaults (city adjustments).
- E-signature parity with DocuSign / HelloSign so contracts hold up in court in states that require certified e-signatures.
- Counter-offer negotiation over multiple rounds instead of one shot (still capped).
- Contract templates per job category (electrical vs plumbing vs general) with category-specific safety clauses.
- The parked server split from the previous plan.

### Phase 3 — scale (later)
- Real-time labor-rate updates via a data vendor instead of manual edits.
- Multi-currency + international launch.
- Contract localization (Spanish first).

## Assumptions

Decisions made without asking, all reversible:

- **The server split is parked.** Features ship first; refactor can wait until after launch.
- **Customer + contractor both shape the itemized list.** Customer seeds it during booking (AI-assisted); contractor sees it read-only when accepting; contractor can propose a new total (not new items) via counter-offer.
- **Counter-offer cap is 20 % higher only.** Contractors can go up to 120 % but cannot undercut (that surface encourages a race to the bottom that hurts the marketplace). One shot per job.
- **Regional rates start at US state granularity (50 rows).** Zip-code precision is Phase 2. Seed data is drawn from public BLS occupation-wage tables, then admin-editable.
- **Contract PDF at quote acceptance, before payment.** Not two documents. The same PDF carries the invoice number and payment schedule so it doubles as the receipt when Stripe fires the funded event.
- **Digital signature = typed name + timestamp + IP.** Sufficient for handyman work under the U.S. E-SIGN Act. Certified e-signature (DocuSign parity) is Phase 2 for states like NY that occasionally scrutinize.
- **T&C copy is a standard template I draft.** Not legal counsel's work. You should have a lawyer review before high-volume launch; the file `contract_terms.py` is designed to be edited without code changes.
- **Only owner-role admins can create contractors and override prices.** Reviewer-role admins can see everything but not mutate.
- **Existing escrow, milestone, dispute, and Stripe flows all stay intact.** New booking flow feeds into them at the "Pay & fund escrow" step — nothing downstream changes.
- **All customer-facing prices are computed server-side.** Client sends the raw item list; server prices it against the rates snapshot; client displays but cannot mutate the pennies. Prevents tampering.
- **Rates snapshot is locked at booking time**, not at payment time. Even if the admin edits the state's rate the next day, the customer pays the number they signed for.
- **`weasyprint` is the first-choice PDF renderer** (clean CSS support, already Python-native, no headless-Chrome dependency). If it fails to install in this container, I fall back to `reportlab` with slightly plainer styling.
- **"Ready for deployment" means:** every route responds, every button routes, the existing pytest + curl smoke suite is green, testing_agent (end-to-end frontend) passes, and `deployment_agent` reports no hardcoded envs, ports, or CORS issues. The user still clicks Deploy.
