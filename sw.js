// Service worker: aplicația se deschide și fără internet.
// Când modifici fișierele aplicației, crește VERSION ca telefonul să ia varianta nouă.
const VERSION = "v1";
const APP = `app-${VERSION}`;
const TILES = "tiles";
const APP_FILES = [
  "./", "index.html", "style.css", "app.js", "data.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
];
const MAX_TILES = 600;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("app-") && k !== APP).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Bucăți de hartă: din cache dacă există, altfel de pe internet (și le păstrăm).
  if (url.hostname === "tile.openstreetmap.org") {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      c.put(e.request, res.clone()).then(() => trim(c));
      return res;
    }));
    return;
  }

  // Fișierele aplicației: întâi internetul (ca să vină modificările), cache dacă nu e net.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && (url.origin === location.origin || url.hostname === "cdnjs.cloudflare.com")) {
          const copy = res.clone();
          caches.open(APP).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
}
