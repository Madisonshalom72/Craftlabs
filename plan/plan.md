# Rename: CraftPulse AI → Handy Fix AI

## Goal
Rebrand the product name everywhere the current name "CraftPulse AI" (or "CraftPulse") appears — user-visible surfaces and internal metadata — to "Handy Fix AI".

## Scope (what will change)

### User-visible
- Landing page (hero, headings, footer, meta title/description)
- All page titles and SEO tags (`<title>`, OG, Twitter cards)
- Auth pages (login/signup/verify/forgot/reset copy)
- Dashboards (customer, handyman, admin) — greetings, empty states, toasts
- Email templates (booking, trial, dunning, admin reset)
- Legal pages (Terms of Service, Privacy Policy) — product name references
- Blog article bylines / signatures if they reference the brand
- Onboarding walkthrough modal copy
- Referral leaderboard copy
- Live map header
- PWA manifest (`short_name`, `name`, `description`)
- Play-store listing doc (`PLAY_STORE_LISTING.md`) and TWA publishing doc

### Non-visible
- Browser tab title, favicon alt text
- `<meta>` og:site_name, twitter:site
- Structured data (JSON-LD Organization / WebSite)
- Robots.txt / sitemap.xml `<publisher>` fields
- README, PRD, changelogs (documentation only)
- Backend log tags / greeting strings in prompts sent to LLMs (e.g. "You are CraftPulse AI...")

## Out of scope (unless flipped by user)
- **Domain**: staying on `craftpulse.app`. The domain won't be changed as part of this rename. If a new domain is desired (e.g. `handyfix.ai`), that's a separate task involving DNS, TWA `assetlinks.json`, Stripe redirect URLs, and email `From:` addresses.
- **Internal code identifiers**: file names, class names, MongoDB collection names, storage path prefix (`craftpulse/...`), env-var names, git repo name. Renaming these adds risk (storage migration, breaking deployments) for zero user value.
- **Existing uploaded files** already stored under `craftpulse/{kind}/...` — remain in place; new uploads can adopt the new prefix if the user wants (see decisions).
- **Logo / colors / typography** — untouched unless requested.
- **Legal entity name** in Terms/Privacy — kept as-is; only the product name is swapped. If the legal entity should also change, that needs explicit confirmation.

## Decisions the user needs to make

1. **Exact wording and casing**
   - Displayed as **"Handy Fix AI"** (three words, spaces) — assumed default.
   - Alternatives: "HandyFix AI" (two words) or "HandyFixAI" (single token).
   - This affects branding, PWA short_name (which needs ≤12 chars — "Handy Fix AI" fits), and how it reads in headlines.

2. **Storage path prefix for new uploads** (`craftpulse/portfolio/...`)
   - Keep `craftpulse/` prefix so existing files keep working (assumed default).
   - Or switch new uploads to `handyfix/` prefix (existing files stay accessible; the app just writes to a new folder going forward).

3. **Legal entity in Terms / Privacy**
   - Keep the legal entity name unchanged (assumed default) — only the product name gets swapped.
   - Or replace it too (user must supply the new legal name).

4. **Email `From:` display name**
   - Change `From:` display from "CraftPulse AI" → "Handy Fix AI" (assumed default). The sending address/domain stays the same until the domain rename happens.

5. **Auto-generated blog content**
   - Existing blog article bodies that mention "CraftPulse" get a one-pass find/replace in the database (assumed default), so old articles read correctly.
   - Or leave stored content untouched and only rebrand the site chrome around it.

## Assumptions (unless overridden)
- Casing: **"Handy Fix AI"** (three words).
- Domain, logo, colors, code identifiers, storage prefix, and legal entity all stay as they are.
- New product name should replace every user-visible instance of "CraftPulse" and "CraftPulse AI" — including the phrase inside LLM system prompts so AI replies self-identify correctly.

## Risks
- **LLM system prompts** referencing the old brand ("You are CraftPulse AI…") will need updating in multiple places to avoid the assistant contradicting the new brand in conversation.
- **Cached PWA / service worker** may keep serving the old app name to returning users until the SW updates on next visit. This is transient and self-heals.
- **Search-indexed pages** (Google/Bing) will still show "CraftPulse AI" until re-crawled. No action needed; will refresh naturally.

## Acceptance
- No occurrence of "CraftPulse" appears anywhere on any rendered page, email, PWA install prompt, or admin screen.
- Browser tab, share preview (OG), and PWA install card all show "Handy Fix AI".
- AI assistant introduces itself as "Handy Fix AI" in chat/diagnose flows.
- Existing users' data, sessions, uploads, subscriptions, and referral codes remain intact.
