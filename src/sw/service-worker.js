/* Merkwerk-Service-Worker (Vorlage; build.mjs setzt Version und Dateiliste ein und schreibt dist/sw.js).
   - Seite selbst: erst aus dem Netz, damit Updates sofort ankommen; ohne Netz aus dem Zwischenspeicher.
   - Übrige eigene Dateien: aus dem Zwischenspeicher, im Hintergrund aktualisiert.
   - Bibliotheken von jsDelivr (PDF, Word, Texterkennung, Kalender): nach dem ersten Laden auch offline verfügbar.
   - Alles andere (KI-Server, Wikipedia, Anmeldung) geht unverändert ins Netz. */
const VERSION = "__VERSION__";
const APP = "merkwerk-app-" + VERSION;
const LIBS = "merkwerk-libs-v1";
const FILES = __FILES__;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("merkwerk-app-") && k !== APP).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Bibliotheken kommen per <script> ohne CORS („opaque“, Status unbekannt); die werden trotzdem gespeichert.
async function fromNetwork(req, cacheName) {
  const res = await fetch(req);
  if (res.ok || (cacheName === LIBS && res.type === "opaque")) { const c = await caches.open(cacheName); c.put(req, res.clone()); }
  return res;
}
async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  const update = fromNetwork(req, cacheName).catch(() => null);
  return hit || (await update) || Response.error();
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate" && url.origin === location.origin) {
    e.respondWith(fromNetwork(req, APP).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match("./")));
    return;
  }
  if (url.origin === location.origin) { e.respondWith(cacheFirst(req, APP)); return; }
  if (url.hostname === "cdn.jsdelivr.net") e.respondWith(cacheFirst(req, LIBS));
});
