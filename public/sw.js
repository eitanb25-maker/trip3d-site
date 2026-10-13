/* Service worker: מאפשר התקנה ועבודה חלקית בלי אינטרנט. אף פעם לא נוגע ב-API. */
const V = "trip3d-v4", CORE = ["/", "/shim.js", "/manifest.webmanifest", "/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  if (u.origin === location.origin) {
    if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/g/") || u.pathname === "/maintenance.json" || u.pathname === "/news.json" || u.pathname === "/changelog.json" || u.pathname === "/maint.js" || u.pathname === "/admin.html" || u.pathname === "/health.html" || u.pathname === "/sw.js") return; // רשת בלבד
    // רשת קודם (תמיד הגרסה העדכנית), ואם אין חיבור – מהמטמון
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then((m) => m || (r.mode === "navigate" ? caches.match("/") : Response.error()))));
    return;
  }
  // ספריות חיצוניות (three.js, מפות, פונטים): מהמטמון מיד, ומתעדכן ברקע
  if (/cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u.host)) {
    e.respondWith(caches.open(V).then((c) => c.match(r).then((m) => { const f = fetch(r).then((res) => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => m); return m || f; })));
  }
});

// התראות דחיפה: ההתראה ריקה, והטקסט נשלף מהשרת עם העוגייה של המשתמש
self.addEventListener("push", (e) => {
  e.waitUntil(fetch("/api/me/push-latest", { credentials: "include" }).then((r) => r.json()).catch(() => ({})).then((d) =>
    self.registration.showNotification(d.title || "Trip3D", { body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", data: { url: d.url || "/" }, dir: "rtl", lang: "he" })));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { const c = cs[0]; return c ? c.focus() : self.clients.openWindow((e.notification.data && e.notification.data.url) || "/"); }));
});
