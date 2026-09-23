# Custom Domain + TWA Publishing Guide

**Target production domain:** `craftpulse.app`
**Android package name:** `ai.craftpulse.twa`
**Play Store listing name:** CraftPulse AI

---

## Part 1 — Wire the custom domain

### 1a. Deploy the app on Emergent
1. Click **Deploy** in the top-right of your Emergent chat UI.
2. Wait ~2 minutes. Emergent will give you a `*.emergentagent.com` URL (e.g. `craftpulse-live.emergentagent.com`). Copy it — you'll need it in step 1c.

### 1b. Point DNS at Emergent
Add these records at your registrar (Cloudflare / Namecheap / Google Domains / GoDaddy — same pattern everywhere):

| Type   | Host / Name | Value                                    | TTL   |
|--------|-------------|------------------------------------------|-------|
| CNAME  | `@` (or blank)     | `<your-emergent-deployed-url>` (from 1a) | Auto  |
| CNAME  | `www`       | `<your-emergent-deployed-url>` (from 1a) | Auto  |

**Cloudflare users**: turn OFF the orange cloud (proxy) for CraftPulse — Emergent handles TLS/certs directly, and Cloudflare's proxy will break some cookies.

Verify with:
```bash
dig craftpulse.app +short          # should return an emergentagent.com host
curl -I https://craftpulse.app     # should return 200 within 10 min of DNS propagation
```

### 1c. Point the app at the new domain
In Emergent → app secrets, set (or update):
```
FRONTEND_URL=https://craftpulse.app
```
Redeploy. This one env var switches: Stripe redirect URLs, email links (verify, reset, dunning, admin reset), Customer Portal return URLs, and admin-reset links. No code changes needed.

### 1d. Update Google OAuth + Stripe redirect allowlists
- **Google (Emergent-managed)**: nothing to do — Emergent's OAuth flow uses the `redirect` query param and accepts your own domain automatically.
- **Stripe → Customer Portal → Configuration**: add `https://craftpulse.app/handyman` to the "Return URL" allowlist.
- **Stripe → Webhooks**: create/update the endpoint URL to `https://craftpulse.app/api/stripe/webhook`. Copy the new `whsec_...` secret into `STRIPE_WEBHOOK_SECRET` env var.

---

## Part 2 — Package as an Android TWA (Trusted Web Activity)

A TWA is a thin Android wrapper around your PWA. Once installed, users see your web app in a fullscreen shell that looks identical to a native app. Google Play Store loves them.

### 2a. Prerequisites (one-time, on your local machine)
- **Node.js 18+**
- **Java 17** (Play Store requires it — install via `brew install --cask temurin@17` or `sdkman install java 17.0.11-tem`)
- **Android Studio** (needed once, to generate/sign the AAB — install from https://developer.android.com/studio)
- **Bubblewrap CLI** (Google's official TWA generator):
  ```bash
  npm install -g @bubblewrap/cli
  ```

### 2b. Initialize the TWA project
Run from anywhere (creates a `craftpulse-twa/` folder):
```bash
bubblewrap init --manifest="https://craftpulse.app/manifest.json"
```
When prompted:
- **Application package name** → `ai.craftpulse.twa` (already in `twa-manifest.json` — accept default)
- **Application name** → `CraftPulse AI`
- **Launcher name** → `CraftPulse`
- **Display mode** → `standalone`
- **Orientation** → `portrait`
- **Status bar color** → `#0B0D11`
- **Theme color** → `#F59E0B`
- **Signing key** → let Bubblewrap generate a new keystore (safest). It'll ask for a keystore password + key password. **Save both in a password manager — losing them means you can never update the app on Play Store again.**

### 2c. Build the AAB (release bundle for Play Store)
```bash
cd craftpulse-twa
bubblewrap build
```
Output: `app-release-bundle.aab` in the current folder. This is what you upload to Play Store.

### 2d. Get the SHA-256 fingerprint & upload `assetlinks.json`
After `bubblewrap build`, run:
```bash
bubblewrap fingerprint
```
It prints:
```
SHA-256 Fingerprint: AB:CD:EF:...:12:34
```

Copy that value, then edit `/app/frontend/public/.well-known/assetlinks.json`:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "ai.craftpulse.twa",
      "sha256_cert_fingerprints": [
        "AB:CD:EF:...:12:34"   ← paste the value from bubblewrap fingerprint
      ]
    }
  }
]
```
Commit + redeploy. Verify it's live:
```bash
curl -s https://craftpulse.app/.well-known/assetlinks.json | python -m json.tool
```
This file **must** be reachable at the exact path `/.well-known/assetlinks.json` over HTTPS with the correct MIME type, otherwise Android will show the browser URL bar inside the TWA (a bad look for a "native" app).

---

## Part 3 — Publish to Google Play Store

### 3a. Google Play Console account
- Register at https://play.google.com/console (**$25 one-time fee**, personal identity verification takes 1-2 days).
- Complete the Developer Distribution Agreement.
- Set up your payments profile.

### 3b. Create the app listing
1. Play Console → **Create app** → fill in:
   - App name: `CraftPulse AI`
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free
2. Check the required declarations (target audience, ads, government app, etc.).

### 3c. Complete the store listing (all fields required to publish)

Copy-paste the content from `PLAY_STORE_LISTING.md` into these Play Console fields:
- **App name** (30 chars)
- **Short description** (80 chars)
- **Full description** (4000 chars)
- **App icon** (512×512 PNG) — use `/app/frontend/public/icon-512.png`
- **Feature graphic** (1024×500) — you'll need to create this in Figma / Canva
- **Phone screenshots** (min 2, max 8) — take from your live site with the tour open, dashboard, live map, diagnostic result
- **App category** → Business
- **Content rating** → answer the questionnaire (should score "Everyone")
- **Privacy Policy URL** → `https://craftpulse.app/privacy`
- **Data safety** → declare: names, emails, photos, location (optional), payment info via Stripe
- **Contact email** → `loans24funding@gmail.com`

### 3d. Upload the AAB
1. Play Console → **Production** → **Create new release**.
2. Upload `app-release-bundle.aab`.
3. Set release notes: `Initial release — CraftPulse AI marketplace with AI diagnosis, live pro matching, and Stripe-secured booking.`
4. Save → **Send for review**.

Review typically takes **1-7 days** for a first submission.

### 3e. After approval
- Your app appears at `https://play.google.com/store/apps/details?id=ai.craftpulse.twa`
- Add a "Get it on Google Play" badge to your landing page hero
- Every future update: `bubblewrap update && bubblewrap build` → upload new AAB → new version code auto-bumps

---

## Quick reference — file inventory

| File | Purpose | Domain baked in? |
|---|---|---|
| `frontend/public/manifest.json` | PWA manifest (source of truth for Bubblewrap) | No (relative paths) |
| `frontend/public/.well-known/assetlinks.json` | Android → domain trust link | Yes — needs SHA-256 |
| `frontend/public/robots.txt` | SEO indexing rules | Yes — `craftpulse.app` |
| `frontend/public/index.html` | Base HTML, OG tags, canonical | Yes — `craftpulse.app` |
| `backend/.env` FRONTEND_URL | Runtime URL for redirects/emails | Env var — set to `https://craftpulse.app` after DNS cutover |
| `backend/server.py` `/api/sitemap.xml` | Dynamic sitemap | No — reads Host header at request time |
| `TWA_PUBLISHING.md` | This guide | Yes |
| `PLAY_STORE_LISTING.md` | Copy-paste content for store fields | Yes |

---

## Go-live checklist (in order)

- [ ] Domain purchased at registrar of your choice
- [ ] Emergent → **Deploy** clicked; deployed URL captured
- [ ] DNS CNAME added (`@` + `www` → deployed URL)
- [ ] `dig craftpulse.app` returns the emergent host
- [ ] `curl -I https://craftpulse.app` returns 200
- [ ] `FRONTEND_URL=https://craftpulse.app` set in Emergent secrets → redeploy
- [ ] Stripe → Portal return URL allowlist updated
- [ ] Stripe → Webhook endpoint recreated at new domain → `STRIPE_WEBHOOK_SECRET` refreshed
- [ ] Local: `bubblewrap init` → `bubblewrap build`
- [ ] SHA-256 fingerprint pasted into `assetlinks.json` → redeploy
- [ ] `curl https://craftpulse.app/.well-known/assetlinks.json` returns your JSON
- [ ] Play Console account created + verified
- [ ] Store listing fields completed
- [ ] AAB uploaded → sent for review
- [ ] Approval received → app live in Play Store
- [ ] Add "Get it on Google Play" badge to landing hero

**If your actual domain is `craftspulse.app` (with the extra "s")**: run `grep -rl "craftpulse.app" /app | xargs sed -i 's/craftpulse.app/craftspulse.app/g'` and you're done.
