/* CraftPulse AI · Service Worker (v1)
 * Strategy:
 *  - Precache the app shell so the site opens instantly on repeat visits.
 *  - Cache-first for static assets (/static/, images, fonts).
 *  - Network-first for API calls (never serve stale data).
 *  - Never cache /api/ auth, payment, or SSE endpoints.
 */

const VERSION = "cp-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const SHELL = ["/", "/blog", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) =>
      Promise.all(
        SHELL.map((u) => c.add(u).catch(() => null))
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

const isStaticAsset = (url) =>
  /\/(static|assets|icons?)\//i.test(url.pathname) ||
  /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|ttf|css|js)$/i.test(url.pathname);

const isApi = (url) => url.pathname.startsWith("/api/");
const isSse = (url) =>
  url.pathname.includes("/leads/stream") || url.pathname.includes("/ai/chat");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !isStaticAsset(url)) return;
  if (isSse(url)) return;               // never cache streams
  if (isApi(url)) {
    // Network-first for API
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(ASSET_CACHE).then((c) => c.put(req, clone));
          return res;
        })
      )
    );
    return;
  }
  // App shell (HTML) — network-first, fall back to cached shell
  event.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(req, clone));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/")))
  );
});
