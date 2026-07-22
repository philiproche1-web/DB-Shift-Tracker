// Runtime cache for the app shell — doesn't precache hashed build filenames
// (Vite renames those every build), instead caches same-origin GET requests
// as they're actually used, so a driver who's opened the app before can
// still open it with no signal (garage, underground stop, etc).
const CACHE_NAME = "dbus-shell-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Roster data and API-ish JSON should stay network-first so a driver
  // online gets a fresh roster update, only falling back to cache offline.
  if (url.pathname === "/roster-data.json") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // The HTML shell must stay network-first: it references hashed JS/CSS
  // filenames that change every build, so a cache-first hit here can serve
  // a driver a stale shell pointing at assets a new deploy already deleted
  // (root cause of a real blank-screen incident on 2026-07-18). Only fall
  // back to cache when actually offline.
  if (req.mode === "navigate" || url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (app shell: index.html, hashed JS/CSS, icons): cache-first,
  // filling the cache in the background as things are fetched.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
