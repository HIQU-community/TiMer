/* TiMer — service-worker.js
 * Offline support for the TiMer PWA.
 * Strategy: network-first for the HTML entry (so updates land immediately),
 * cache-first for static assets. New versions activate immediately. */

const VERSION = "timer-v1.0.0";
const CACHE = "timer-cache-" + VERSION;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./css/responsive.css",
  "./css/animations.css",
  "./js/storage.js",
  "./js/utils.js",
  "./js/sounds.js",
  "./js/speech.js",
  "./js/notify.js",
  "./js/history.js",
  "./js/stopwatch.js",
  "./js/countdown.js",
  "./js/timers.js",
  "./js/presets.js",
  "./js/settings.js",
  "./js/dashboard.js",
  "./js/voice.js",
  "./js/app.js",
  "./assets/icons/favicon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/sounds/complete.wav",
  "./assets/sounds/warning.wav",
  "./assets/sounds/tick.wav",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts etc. go to the network

  const isNavigation = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    // Network-first: fresh HTML whenever the network is available.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  // Cache-first for the app shell (css/js/icons/sounds).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
