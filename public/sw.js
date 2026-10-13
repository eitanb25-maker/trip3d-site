/* Service worker: מאפשר התקנה ועבודה חלקית בלי אינטרנט. אף פעם לא נוגע ב-API. */
const V = "trip3d-v2", CORE = ["/", "/shim.js", "/manifest.webmanifest", "/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  if (u.origin === location.origin) {
    if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/g/") || u.pathname === "/maintenance.json" || u.pathname === "/maint.js" || u.pathname === "/admin.html" || u.pathname === "/health.html" || u.pathname === "/sw.js") return; // רשת בלבד
    // רשת קודם (תמיד הגרסה העדכנית), ואם אין חיבור – מהמטמון
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then((m) => m || (r.mode === "navigate" ? caches.match("/") : Response.error()))));
    return;
  }
  // ספריות חיצוניות (three.js, מפות, פונטים): מהמטמון מיד, ומתעדכן ברקע
  if (/cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u.host)) {
    e.respondWith(caches.open(V).then((c) => c.match(r).then((m) => { const f = fetch(r).then((res) => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => m); return m || f; })));
  }
});
