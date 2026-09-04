# Publishing CraftPulse AI to Google Play (TWA / Bubblewrap)

CraftPulse AI is a fully installable PWA. To ship it to the Play Store you'll wrap it in a
**Trusted Web Activity (TWA)** using Google's `@bubblewrap/cli` — no native code needed.

## 1. Prerequisites
- Node.js 18+ and a Java Development Kit (JDK 17)
- Android SDK CLI tools (Bubblewrap can auto-install)
- A Google Play Console developer account ($25 one-time)

## 2. Install Bubblewrap
```bash
npm install -g @bubblewrap/cli
bubblewrap doctor      # confirms JDK + Android SDK setup
```

## 3. Initialize from the CraftPulse manifest
```bash
# From an empty working directory outside /app
bubblewrap init --manifest https://fixit-ai-6.preview.emergentagent.com/manifest.json
```
Answer prompts (Bubblewrap reads most values from `manifest.json`):
- **Package name**: `ai.craftpulse.twa`
- **App name**: `CraftPulse AI`
- **Launcher name**: `CraftPulse`
- **Display mode**: `standalone`
- **Orientation**: `default`
- **Theme color**: `#F59E0B`
- **Background color**: `#0B0D11`
- **Signing key** — create one when prompted (Bubblewrap will save it to
  `./android.keystore`; back this up — Google Play requires it forever).

Alternatively use the ready-made file: `cp /app/twa-manifest.json ./twa-manifest.json && bubblewrap build`.

## 4. Build the release AAB
```bash
bubblewrap build
```
This produces `app-release-bundle.aab` and `app-release-signed.apk`.

## 5. Digital Asset Links — link the app back to the domain
1. Run `bubblewrap fingerprint` (or `keytool -list -v -keystore android.keystore -alias android`)
   and copy the **SHA-256 certificate fingerprint** (uppercase hex colon-separated).
2. Edit `/app/frontend/public/.well-known/assetlinks.json`:
   replace `REPLACE_WITH_YOUR_ANDROID_APP_SHA256_FINGERPRINT` with your fingerprint.
3. Redeploy CraftPulse. The Play Store crawler must be able to GET
   `https://fixit-ai-6.preview.emergentagent.com/.well-known/assetlinks.json` — verify with:
   ```bash
   curl -s https://fixit-ai-6.preview.emergentagent.com/.well-known/assetlinks.json
   ```

## 6. Upload to Play Console
1. Create a new app in [Play Console](https://play.google.com/console).
2. Upload `app-release-bundle.aab` to a testing track (Internal → Closed → Open → Production).
3. Google verifies your Asset Links match. Once verified, the URL bar is hidden and the app
   looks fully native.

## 7. Update flow
When you ship features, only bump `appVersionCode` in `twa-manifest.json` (Bubblewrap will
prompt) and re-run `bubblewrap build`. No new PWA code changes are required — TWA loads the
live web app on launch.

## iOS
Apple doesn't support TWA. Two options:
- Users install the PWA directly from Safari ("Share → Add to Home Screen"). The
  `InstallPrompt.jsx` component shows an iOS-specific helper.
- For a real App Store listing, wrap with **Capacitor** or **PWABuilder → iOS**.

## Push notifications
The service worker at `/service-worker.js` already handles Web Push. VAPID keys are stored
server-side in `backend/.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Android
receives web pushes through TWA without extra setup — permission is requested when the
craftsman toggles the "Enable push" chip on `/handyman`.
