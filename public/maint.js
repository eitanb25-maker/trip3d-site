/* "עבודות תחזוקה" – נשלט מהקובץ /maintenance.json
   {"on":true,"msg":"..."}                       → תחזוקה עכשיו
   {"on":false,"warn":true,"at":"2026-10-13T08:30:00+03:00","msg":"..."}
                                                  → התראה מוקדמת עד השעה at, ואז תחזוקה (עד 12 שעות, כרשת ביטחון)
   מי שנכנס/מרענן בזמן תחזוקה רואה מסך מלא. מי שכבר באמצע עבודה רואה רק פס, בלי לאבד את מה שעשה.
   אפשר גם לשלוט מלוח הבקרה (סקירה ← תחזוקה): ההגדרה שם גוברת על הקובץ. ‏"נקה" מחזיר את השליטה לקובץ.
   לוח הבקרה מציג תמיד רק פס עליון. כניסה לבדיקה בלי המסך: ?nomaint=1 */
(function () {
  var admin = /\/admin\.html$/.test(location.pathname), first = null, overlay = null, bar = null, barKind = "", dismissed = "", last = null, tmr = null;
  var bypass = false;
  try { if (/[?&]nomaint=1/.test(location.search)) sessionStorage.setItem("nomaint", "1"); bypass = sessionStorage.getItem("nomaint") === "1"; } catch (e) {}
  function en() { var l = ""; try { l = localStorage.getItem("trip3d_l") || ""; } catch (e) {} return l === "en" || document.documentElement.lang === "en"; }
  function T(he, e2) { return en() ? e2 : he; }
  function eff(m) {
    if (!m) return { s: "off" };
    if (m.on) return { s: "on" };
    if (m.warn && m.at) { var t = +m.at || Date.parse(m.at), n = Date.now(); if (t) { if (n < t) return { s: "warn", t: t }; if (n < t + 12 * 36e5) return { s: "on" }; } }
    return { s: "off" };
  }
  function hm(t) { var d = new Date(t); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function removeBar() { if (bar) { bar.remove(); bar = null; barKind = ""; } }
  function setBar(kind, text, color) {
    if (dismissed === kind) return;
    if (!bar) {
      bar = document.createElement("div"); bar.id = "maintbar"; bar.setAttribute("role", "status"); bar.setAttribute("aria-live", "polite");
      bar.style.cssText = (admin ? "position:sticky;top:0;" : "position:fixed;left:0;right:0;bottom:0;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));") + "z-index:99998;padding:8px 14px;display:flex;gap:10px;align-items:center;justify-content:center;text-align:center;font:600 14px/1.4 system-ui,Arial,sans-serif;color:#1c1917;box-shadow:0 -2px 12px rgba(0,0,0,.25)";
      var s = document.createElement("span"); s.id = "maintbar_t"; bar.appendChild(s);
      var x = document.createElement("button"); x.type = "button"; x.textContent = "✕"; x.setAttribute("aria-label", T("סגירה", "Close"));
      x.style.cssText = "border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:2px 6px!important;width:auto!important;margin:0!important;display:inline-block!important;flex:none;box-shadow:none"; x.onclick = function () { dismissed = barKind; removeBar(); };
      bar.appendChild(x); document.body.appendChild(bar);
    }
    barKind = kind; bar.style.background = color || "#f59e0b"; bar.querySelector("#maintbar_t").textContent = text;
  }
  function showOverlay(m) {
    if (overlay) return; removeBar();
    var el = document.createElement("div"), msg = (m.msg || "").toString().slice(0, 300);
    el.id = "maint"; el.setAttribute("role", "alertdialog"); el.setAttribute("aria-live", "polite"); el.dir = en() ? "ltr" : "rtl";
    el.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font:16px/1.6 system-ui,'Segoe UI',Arial,sans-serif;background:var(--mbg,#f6f5f1);color:var(--mtx,#1d1d1b)";
    var st = document.createElement("style"); st.textContent = "@media(prefers-color-scheme:dark){#maint{--mbg:#171716;--mtx:#eeede8}}@media(prefers-reduced-motion:no-preference){#maint .g{animation:mspin 6s linear infinite}}@keyframes mspin{to{transform:rotate(360deg)}}"; document.head.appendChild(st);
    el.innerHTML = '<div style="max-width:440px"><div class="g" style="font-size:64px;display:inline-block" aria-hidden="true">⚙️</div><h1 style="margin:12px 0 6px;font-size:26px"></h1><p style="margin:0 0 8px"></p><p class="m" style="margin:0;font-weight:600"></p></div>';
    el.querySelector("h1").textContent = T("עבודות תחזוקה באתר", "Maintenance in progress");
    el.querySelector("p").textContent = T("אנחנו משפרים את האתר וחוזרים בקרוב. תודה על הסבלנות!", "We're improving the site and will be back shortly. Thanks for your patience!");
    el.querySelector(".m").textContent = msg;
    document.body.appendChild(el); document.documentElement.style.overflow = "hidden"; overlay = el;
  }
  function render() {
    var m = last, e = eff(m), msg = m && m.msg ? " – " + String(m.msg).slice(0, 200) : "";
    if (first === null) first = e.s;
    if (e.s === "on" && !bypass) {
      if (admin) setBar("on", "🛠 " + T("האתר במצב תחזוקה (המבקרים רואים מסך תחזוקה)", "Site is in maintenance (visitors see a maintenance screen)") + msg);
      else if (first === "on" || overlay) showOverlay(m);
      else setBar("on", "🛠 " + T("האתר נכנס לתחזוקה. שמרו את הפרויקט – הורדות עלולות להיעצר", "The site is entering maintenance. Save your project – downloads may stop") + msg, "#f97316");
    } else if (e.s === "warn" && !bypass) {
      var mins = Math.max(1, Math.ceil((e.t - Date.now()) / 6e4));
      setBar("warn", "⏳ " + T("האתר ייכנס לתחזוקה בעוד " + mins + " דקות (ב-" + hm(e.t) + "). שמרו את העבודה", "The site goes into maintenance in " + mins + " min (at " + hm(e.t) + "). Please save your work") + msg);
    } else {
      if (overlay) { location.reload(); return; }
      if (barKind === "on" || barKind === "warn") {
        if (barKind === "on" && !admin) { setBar("back", "✅ " + T("האתר חזר לפעול. מומלץ לרענן את הדף כדי לקבל את העדכון", "The site is back. Reload the page to get the update"), "#4ade80"); setTimeout(function () { if (barKind === "back") removeBar(); }, 30000); }
        else removeBar();
      }
      dismissed = "";
    }
  }
  function check() {
    // קודם מה שהוגדר מלוח הבקרה (/api/maint); אם לא הוגדר שם כלום – הקובץ maintenance.json
    fetch("/api/maint", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (c) {
      if (c && !c._none) { last = c; render(); return; }
      return fetch("/maintenance.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) { last = m; render(); });
    }).catch(function () {});
  }
  window.__maintCheck = check;
  function start() { check(); setInterval(check, 60000); tmr = setInterval(function () { if (last && barKind === "warn") render(); }, 15000); }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
