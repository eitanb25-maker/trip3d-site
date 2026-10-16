/* example.js: דוגמה מוכנה לטיול. כפתור "טען דוגמה מוכנה" במסך הבית ובמסך ההתחלה, ו-window.exampleApi.load(key) לשימוש הטוטוריאל.
   הדוגמה ממלאת מדינה, סיכות, שם טיול, תאריכים, כיתוב משני ודגל המדינה, ופותחת את העורך עם מודל מוכן.
   מבנה הנתונים: EX[key] = {cty (שם באנגלית כמו ב-countries), trip/tsub/d1/d2 לפי שפה, pins:[{name:[he,en], lat, lon}]}.
   אין תלות בשרת. אם משהו חסר (פונקציה גלובלית של האתר) המודול מדלג בשקט ולא שובר את האתר. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var en = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, e) { return en() ? e : he; };
  var EX = {
    italy: {
      cty: "Italy", flag: "🇮🇹", name: ["איטליה", "Italy"],
      trip: ["איטליה 2026", "Italy 2026"], tsub: ["משפחת כהן", "The Cohen family"], d1: "2026-07-05", d2: "2026-07-14",
      pins: [[["רומא", "Rome"], 41.9028, 12.4964], [["פירנצה", "Florence"], 43.7696, 11.2558], [["ונציה", "Venice"], 45.4408, 12.3155], [["נאפולי", "Naples"], 40.8518, 14.2681], [["קומו", "Como"], 45.8081, 9.0852]]
    },
    georgia: {
      cty: "Georgia", flag: "🇬🇪", name: ["גאורגיה", "Georgia"],
      trip: ["גאורגיה 2026", "Georgia 2026"], tsub: ["חברים בהרים", "Friends in the mountains"], d1: "2026-09-10", d2: "2026-09-19",
      pins: [[["טביליסי", "Tbilisi"], 41.7151, 44.793], [["קזבגי", "Kazbegi"], 42.6606, 44.6433], [["מסטיה", "Mestia"], 43.045, 42.729], [["קוטאיסי", "Kutaisi"], 42.2679, 42.6946], [["בטומי", "Batumi"], 41.6439, 41.6339]]
    }
  };
  function load(key) {
    var ex = EX[key]; if (!ex) return false;
    try {
      var lg = en() ? 1 : 0;
      var cn = findC(ex.cty) || findC(ex.name[0]); if (!cn) return false;
      openTool(false, "stand");
      var it = $("intro"); if (it) it.style.display = "none";
      var hm = $("home"); if (hm) hm.style.display = "none";
      $("cin").value = cname(cn);
      setCountry(countries[cn]);
      pins = ex.pins.map(function (p) { return { lon: p[2], lat: p[1], name: p[0][lg] }; });
      $("trip").value = ex.trip[lg]; $("tsub").value = ex.tsub[lg]; $("d1").value = ex.d1; $("d2").value = ex.d2;
      $("fm").value = "lib"; $("shownames").checked = true;
      try { renderPins(); } catch (e) { }
      try { syncPickers(); } catch (e) { }
      update();
      if (typeof updD === "function" && updD.flush) updD.flush();
      var m = $("msg"); if (m) m.textContent = Lx("זו דוגמה מוכנה. אפשר לשנות כל דבר, או ללחוץ על 'מתחילים' במסך הבית כדי ליצור משלכם.", "This is a ready-made example. Change anything, or start your own from the home screen.");
      try { window.scrollTo(0, 0); } catch (e) { }
      try { window.TRACK && TRACK("example", key); } catch (e) { }
      return true;
    } catch (e) { console.warn("example", e); return false; }
  }
  function row(extra) {
    var d = document.createElement("div"); d.className = "exrow"; d.style.cssText = "margin:14px 0 4px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center" + (extra || "");
    var l = document.createElement("span"); l.className = "hint"; l.style.cssText = "flex:1 1 100%;text-align:center;margin:0;font-weight:700"; l.textContent = Lx("רוצים לראות מה אפשר? טענו דוגמה מוכנה:", "Want to see what it can do? Load a ready-made example:");
    d.appendChild(l);
    Object.keys(EX).forEach(function (k) {
      var b = document.createElement("button"); b.type = "button"; b.className = "go exbtn"; b.dataset.ex = k; b.style.cssText = "width:auto;flex:1 1 140px;max-width:240px;margin:0;padding:10px 14px";
      b.textContent = "✨ " + EX[k].flag + " " + Lx("דוגמה: " + EX[k].name[0], "Example: " + EX[k].name[1]);
      b.onclick = function () { load(k); }; d.appendChild(b);
    });
    return d;
  }
  function mount() {
    try {
      var t = $("tools"); if (t && !document.querySelector("#home .exrow")) t.parentNode.insertBefore(row(), t);
      var s = $("start"); if (s && !document.querySelector("#s1 .exrow")) s.parentNode.insertBefore(row(), s.nextSibling);
    } catch (e) { console.warn("example mount", e); }
  }
  function relabel() { try { document.querySelectorAll(".exrow").forEach(function (r) { r.remove(); }); mount(); } catch (e) { } }
  window.exampleApi = { load: load, keys: Object.keys(EX), relabel: relabel };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  try { var lg = $("lg"); if (lg) lg.addEventListener("click", function () { setTimeout(relabel, 300); }); } catch (e) { }
})();
