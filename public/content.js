/* content.js (v49): תוכן וקהילה
   1. ספריית אייקונים תלת-ממדיים לנקודות ציון (אייקון לכל סיכה)
   2. תבניות מסלולים מוכנות (שביל ישראל, טור דה מונבלאן, אנאפורנה, קמינו דה סנטיאגו)
   3. הצעות כיתוב ללוחית (AI כשהוא זמין, אחרת תבניות מקומיות)
   המודול עוטף את pinGeo ו-renderPins בלי לשנות את הקוד הראשי. השדה icon נשמר בפרויקט, בטיוטה ובקישור השיתוף כי הסיכות נשמרות כאובייקטים. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return typeof LANG !== "undefined" && LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };
  var msg = function (t) { var m = $("msg"); if (m) m.textContent = t; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  /* ============ 1. אייקונים ============ */
  /* "def" = לפי הבחירה הכללית "צורת סימון מיקום". האחרים קיימים כבר בקוד הראשי (ball, cone, col, cube, star, heart, flag) או נבנים כאן */
  var ICONS = [
    { id: "def",    ch: "•",  he: "לפי הגדרה כללית", en: "Use global style" },
    { id: "tent",   ch: "⛺", he: "אוהל",            en: "Tent" },
    { id: "plane",  ch: "✈",  he: "מטוס",            en: "Plane" },
    { id: "peak",   ch: "⛰", he: "פסגה",            en: "Peak" },
    { id: "camera", ch: "📷", he: "מצלמה",           en: "Camera" },
    { id: "heart",  ch: "❤",  he: "לב",              en: "Heart" },
    { id: "flag",   ch: "🚩", he: "דגל",             en: "Flag" },
    { id: "star",   ch: "⭐", he: "כוכב",            en: "Star" },
    { id: "ball",   ch: "⚪", he: "כדור",            en: "Ball" },
    { id: "cone",   ch: "📍", he: "סיכת מפה",        en: "Map pin" }
  ];
  var ID = {}; ICONS.forEach(function (i) { ID[i.id] = i; });

  /* בוני גיאומטריה. כולם מחזירים מערך גיאומטריות במרחב המודל (z למעלה), ו-k הוא קנה המידה של הסימון.
     משתמשים ב-THREE בלבד, והצורות מחוברות למוט (stem) כדי שיהיו ניתנות להדפסה. */
  function stem(x, y, z, k, h) { return new THREE.CylinderGeometry(1.1 * k, 1.1 * k, h * k, 10).rotateX(Math.PI / 2).translate(x, y, z + h * k / 2); }
  function plate(pts, d, x, y, z) { // צלליות אנכית (כמו flat בקוד הראשי)
    return new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); })), { depth: d, bevelEnabled: false }).rotateX(Math.PI / 2).translate(x, y + d / 2, z);
  }
  var BUILD = {
    tent: function (x, y, z, k) {
      return [stem(x, y, z, k, 3), plate([[-3.4 * k, 0], [3.4 * k, 0], [0, 4.8 * k]], 5 * k, x, y, z + 3 * k)];
    },
    plane: function (x, y, z, k) {
      var R = [[0, 4.6], [0.55, 3.6], [0.6, 1.4], [4.4, -0.5], [4.4, -1.5], [0.6, -0.7], [0.5, -2.8], [1.9, -3.7], [1.9, -4.4], [0, -4.0]], pts = R.slice();
      for (var i = R.length - 2; i >= 1; i--) pts.push([-R[i][0], R[i][1]]);
      var g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(function (p) { return new THREE.Vector2(p[0] * k * 0.9, p[1] * k * 0.9); })), { depth: 1.3 * k, bevelEnabled: false });
      g.translate(x, y, z + 6.5 * k);
      return [stem(x, y, z, k, 6.6), g];
    },
    peak: function (x, y, z, k) {
      return [stem(x, y, z, k, 2.5),
        new THREE.ConeGeometry(3.4 * k, 7 * k, 16).rotateX(Math.PI / 2).translate(x, y, z + 2.5 * k + 3.5 * k),
        new THREE.ConeGeometry(2.3 * k, 4.6 * k, 14).rotateX(Math.PI / 2).translate(x + 2.9 * k, y, z + 2.5 * k + 2.3 * k)];
    },
    camera: function (x, y, z, k) {
      return [stem(x, y, z, k, 5),
        new THREE.BoxGeometry(7 * k, 4.4 * k, 4 * k).translate(x, y, z + 5 * k + 2 * k),
        new THREE.BoxGeometry(2.6 * k, 2 * k, 1.2 * k).translate(x - 1.6 * k, y, z + 5 * k + 4.4 * k),
        new THREE.CylinderGeometry(1.5 * k, 1.5 * k, 2 * k, 14).translate(x, y - 3 * k, z + 5 * k + 2 * k)];
    }
  };

  var OYv = function () { try { return TOOL == "stand" ? 14 : 0; } catch (e) { return 0; } };
  /* מוצאים איזו סיכה מבקשת את הגיאומטריה לפי הקואורדינטות (build קורא ל-pinGeo פעם לכל סיכה עם x,y+OY של אותה סיכה) */
  function pinAt(x, y) {
    var oy = OYv();
    for (var i = 0; i < pins.length; i++) {
      var q = toMM(pins[i].lon, pins[i].lat);
      if (Math.abs(q[0] - x) < 1e-6 && Math.abs(q[1] + oy - y) < 1e-6) return pins[i];
    }
    return null;
  }
  function hookPinGeo() {
    var orig = pinGeo;
    pinGeo = function (t, x, y, z, k) {
      var p = pinAt(x, y);
      if (p && p.icon && p.icon != "def" && ID[p.icon] && t != "heart") t = p.icon; // "heart" מגיע מהמועדף (★) ונשאר מועדף
      return BUILD[t] ? BUILD[t](x, y, z, k) : orig.apply(this, [t, x, y, z, k]);
    };
  }
  function hookPinList() {
    var orig = renderPins;
    function decorate() {
      var L = $("pl"); if (!L) return;
      Array.prototype.forEach.call(L.children, function (row, i) {
        if (!pins[i] || row.querySelector("select.pic")) return;
        var s = document.createElement("select"); s.className = "pic"; s.style.cssText = "width:58px;padding:2px";
        s.title = Lx("אייקון לנקודה", "Icon for this point"); s.setAttribute("aria-label", s.title);
        ICONS.forEach(function (ic) { var o = document.createElement("option"); o.value = ic.id; o.textContent = ic.ch; o.title = isEn() ? ic.en : ic.he; s.appendChild(o); });
        s.value = pins[i].icon && ID[pins[i].icon] ? pins[i].icon : "def";
        s.onchange = function () { if (s.value == "def") delete pins[i].icon; else pins[i].icon = s.value; update(); };
        row.insertBefore(s, row.children[1] || null);
      });
    }
    renderPins = function () { var r = orig.apply(this, arguments); try { decorate(); } catch (e) { console.warn("content", e); } return r; };
    try { decorate(); } catch (e) {}
  }

  /* ============ 2. תבניות מסלולים ============ */
  /* הקווים מקורבים: קו ישר בין נקודות ציון ידועות (עם החלקה), לא מסלול GPS. מספרי ק״מ וגובה הם הנתונים המקובלים של המסלול.
     פורמט נקודה: [lon, lat, שם בעברית, שם באנגלית, אייקון, גובה במ׳] */
  var PRESETS = [
    { id: "int", he: "שביל ישראל", en: "Israel National Trail", sub_he: "מדן עד אילת", sub_en: "Dan to Eilat", countries: ["Israel"], crop: null, km: 1000, loop: false,
      pts: [[35.652, 33.248, "דן", "Dan", "flag", 200], [35.41, 32.99, "הר מירון", "Mt Meron", "peak", 1208], [35.55, 32.80, "הכנרת", "Sea of Galilee", "camera", -210], [35.39, 32.69, "הר תבור", "Mt Tabor", "peak", 588],
        [35.03, 32.74, "הכרמל", "Carmel", "tent", 400], [35.21, 31.78, "ירושלים", "Jerusalem", "heart", 780], [34.90, 31.61, "בית גוברין", "Beit Guvrin", "tent", 280], [35.21, 31.26, "ערד", "Arad", "tent", 600],
        [34.80, 30.61, "מצפה רמון", "Mitzpe Ramon", "peak", 850], [34.95, 29.55, "אילת", "Eilat", "flag", 0]] },
    { id: "tmb", he: "טור דה מונבלאן", en: "Tour du Mont Blanc", sub_he: "מסלול מעגלי · צרפת, איטליה, שווייץ", sub_en: "Loop trail · France, Italy, Switzerland", countries: ["France", "Italy", "Switzerland"], crop: [6.55, 45.62, 7.3, 46.12], km: 170, loop: true,
      pts: [[6.797, 45.891, "לה אוש", "Les Houches", "flag", 1010], [6.727, 45.821, "לה קונטמין", "Les Contamines", "tent", 1170], [6.723, 45.774, "קול דו בונום", "Col du Bonhomme", "peak", 2329], [6.744, 45.703, "לה שאפיה", "Les Chapieux", "tent", 1550],
        [6.825, 45.745, "קול דה לה סין", "Col de la Seigne", "peak", 2516], [6.969, 45.797, "קורמאיור", "Courmayeur", "heart", 1224], [7.08, 45.89, "גראן קול פרה", "Grand Col Ferret", "peak", 2537], [7.1, 46.0, "לה פולי", "La Fouly", "tent", 1600],
        [7.115, 46.03, "שאמפה", "Champex", "camera", 1470], [6.998, 46.056, "טריאן", "Trient", "tent", 1300], [6.957, 46.04, "קול דה באלם", "Col de Balme", "peak", 2191], [6.869, 45.924, "שמוני", "Chamonix", "heart", 1035]] },
    { id: "ann", he: "סביב אנאפורנה", en: "Annapurna Circuit", sub_he: "מסלול טרק בנפאל", sub_en: "Trek in Nepal", countries: ["Nepal"], crop: [83.5, 28.1, 84.55, 28.95], km: 160, loop: false,
      pts: [[84.375, 28.231, "בסיסאהאר", "Besisahar", "flag", 760], [84.234, 28.55, "צ׳אמה", "Chame", "tent", 2670], [84.016, 28.667, "מאנאנג", "Manang", "tent", 3540], [83.941, 28.795, "ת׳ורונג לה", "Thorong La", "peak", 5416],
        [83.872, 28.817, "מוקטינאת", "Muktinath", "camera", 3760], [83.723, 28.78, "ג׳ומסום", "Jomsom", "tent", 2720], [83.65, 28.489, "טאטופאני", "Tatopani", "tent", 1190], [83.69, 28.4, "פון היל", "Poon Hill", "camera", 3210], [83.985, 28.209, "פוקהרה", "Pokhara", "heart", 820]] },
    { id: "cam", he: "קמינו דה סנטיאגו", en: "Camino de Santiago", sub_he: "הדרך הצרפתית · ספרד", sub_en: "The French Way · Spain", countries: ["Spain"], crop: [-9.1, 42.1, -0.9, 43.2], km: 770, loop: false,
      pts: [[-1.32, 42.995, "רונסבייס", "Roncesvalles", "flag", 950], [-1.646, 42.812, "פמפלונה", "Pamplona", "tent", 450], [-2.446, 42.465, "לוגרוניו", "Logroño", "tent", 380], [-3.703, 42.343, "בורגוס", "Burgos", "camera", 860],
        [-5.571, 42.599, "ליאון", "León", "tent", 830], [-7.0, 42.708, "או סברירו", "O Cebreiro", "peak", 1300], [-8.545, 42.881, "סנטיאגו", "Santiago", "heart", 260]] }
  ];

  function catmull(pts, n) { // החלקה בין נקודות ציון (Catmull-Rom מרכזי), כדי שהקו לא יהיה פוליגון חד
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var s = 0; s < n; s++) {
        var t = s / n, t2 = t * t, t3 = t2 * t, f = function (a, b, c, d) { return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), p1[5] + (p2[5] - p1[5]) * t]);
      }
    }
    var l = pts[pts.length - 1]; out.push([l[0], l[1], l[5]]);
    return out;
  }
  function presetGpx(P) {
    var pts = P.pts.slice(); if (P.loop) pts.push(pts[0]);
    var tr = catmull(pts, 14);
    return '<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>' + esc(P.en) + "</name><trkseg>"
      + tr.map(function (p) { return '<trkpt lat="' + p[1].toFixed(5) + '" lon="' + p[0].toFixed(5) + '"><ele>' + Math.round(p[2]) + "</ele></trkpt>"; }).join("") + "</trkseg></trk></gpx>";
  }

  function applyPreset(P) {
    var names = P.countries.map(function (c) { return findC(c); });
    if (names.some(function (n) { return !n || !countries[n]; })) { msg(Lx("המדינה של התבנית לא נטענה עדיין, נסו שוב בעוד רגע", "The template's country hasn't loaded yet, try again in a moment")); return false; }
    if (pins.length && !confirm(Lx("החלפת הנקודות והמסלול הנוכחיים בתבנית \"" + P.he + "\"?", "Replace the current points and route with the \"" + P.en + "\" template?"))) return false;
    MULTI = names.length > 1;
    if (MULTI) { multiNames = names.slice(); $("cin").value = names.map(function (n) { return cname(n); }).join(", "); setCountry(names.flatMap(function (n) { return countries[n]; }), false, names.map(function (n) { return countries[n]; })); }
    else { $("cin").value = cname(names[0]); setCountry(countries[names[0]]); }
    if (P.crop) { crop = P.crop.slice(); fit(); }
    pins = P.pts.map(function (p) { return { lon: p[0], lat: p[1], name: isEn() ? p[3] : p[2], icon: p[4] }; });
    renderPins();
    if ($("shownames")) $("shownames").checked = false;   // עשרות שמות לא נכנסים על המעמד; הנקודות והאייקונים נשארים
    $("trip").value = isEn() ? P.en : P.he; $("tsub").value = isEn() ? P.sub_en : P.sub_he;
    try { advDebug.importTrack(presetGpx(P), false, { km: P.km, max: Math.max.apply(null, P.pts.map(function (p) { return p[5]; })), gain: null, min: null }); } catch (e) { console.warn("content", e); }   // נתוני המסלול הרשמיים, לא של הקו המקורב
    update();
    msg(Lx("נטענה התבנית \"" + P.he + "\". הקו מקורב ולא מסלול GPS מדויק. לדיוק מלא ייבאו קובץ GPX משלכם.", "Template \"" + P.en + "\" loaded. The line is approximate, not an exact GPS track. Import your own GPX for full accuracy."));
    return true;
  }

  function buildPresets() {
    var host = document.querySelector('.uxp[data-t="1"]'), nav = host && host.querySelector(".uxnav");
    if (!host || $("presetbox")) return;
    var d = document.createElement("div"); d.id = "presetbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("📚 תבניות מסלולים מוכנות", "📚 Ready-made route templates") + "</b>"
      + '<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">' + PRESETS.map(function (P) { return '<button type="button" data-pid="' + P.id + '" style="margin:0">' + span(P.he, P.en) + "</button>"; }).join("") + "</div>"
      + '<p class="hint">' + span("בלחיצה נטענים המדינה, נקודות הציון עם אייקונים, כותרת ומסלול מקורב. אפשר לערוך הכול אחר כך.", "One click loads the country, icon-marked waypoints, title and an approximate route. You can edit everything afterwards.") + "</p>";
    host.insertBefore(d, nav || null);
    d.querySelectorAll("button[data-pid]").forEach(function (b) {
      b.onclick = function () { var P = PRESETS.filter(function (x) { return x.id == b.dataset.pid; })[0]; if (P) applyPreset(P); };
    });
  }

  /* ============ 3. כיתוב ללוחית ============ */
  function ctx() {
    var pl = pins.map(function (p) { return (p.name || "").trim(); }).filter(Boolean), c = ($("cin") && $("cin").value || "").trim();
    return { places: pl, country: c, trip: ($("trip").value || "").trim() };
  }
  /* תבניות מקומיות (עובדות גם בלי AI ובלי התחברות) */
  function localOptions(c) {
    var o = [], pl = c.places, first = pl[0], last = pl[pl.length - 1], yr = new Date().getFullYear();
    if (c.country) o.push({ title: c.country, sub: pl.slice(0, 3).join(" · ") });
    if (pl.length > 1) o.push({ title: Lx("מ" + first + " ועד " + last, first + " to " + last), sub: (c.country ? c.country + " · " : "") + yr });
    o.push({ title: pl.length ? Lx(pl.length + " מקומות" + (c.country ? " ב" + c.country : ""), pl.length + " places" + (c.country ? " in " + c.country : "")) : Lx("הטיול שלי", "My trip"), sub: String(yr) });
    return o.filter(function (x) { return x.title; }).slice(0, 3).map(function (x) { return { title: x.title.slice(0, 28), sub: x.sub.slice(0, 40) }; });
  }
  function showOptions(opts, src) {
    var box = $("capopts"); box.innerHTML = "";
    opts.forEach(function (o) {
      var b = document.createElement("button"); b.type = "button"; b.style.cssText = "margin:0;text-align:start";
      b.textContent = o.title + (o.sub ? " | " + o.sub : "");
      b.onclick = function () { $("trip").value = o.title; $("tsub").value = o.sub || ""; update(); };
      box.appendChild(b);
    });
    var s = document.createElement("div"); s.className = "hint"; s.style.width = "100%";
    s.textContent = src == "ai" ? Lx("הוצע על ידי AI. לחצו על הצעה כדי להחיל אותה.", "Suggested by AI. Click a suggestion to apply it.") : Lx("תבניות מקומיות. התחברו כשה-AI פעיל להצעות מותאמות אישית.", "Local templates. Sign in while AI is enabled for personalised suggestions.");
    box.appendChild(s);
  }
  async function suggest() {
    var c = ctx(), btn = $("capgo");
    if (!c.places.length && !c.country) { msg(Lx("הוסיפו נקודות ציון או בחרו מדינה כדי לקבל הצעות כיתוב", "Add places or choose a country to get caption ideas")); return; }
    btn.disabled = true;
    var opts = null;
    try {
      if (typeof API != "undefined" && API.j) {
        var r = await API.j("POST", "/ai/caption", { places: c.places, country: c.country, lang: isEn() ? "en" : "he", tone: $("captone").value });
        if (r && r.options && r.options.length) opts = r.options;
      }
    } catch (e) { /* לא מחובר / AI כבוי / מכסה: ממשיכים לתבניות מקומיות */ }
    showOptions(opts || localOptions(c), opts ? "ai" : "local");
    btn.disabled = false;
  }
  function buildCaption() {
    var host = document.querySelector('.uxp[data-t="3"]'), nav = host && host.querySelector(".uxnav");
    if (!host || $("capbox")) return;
    var d = document.createElement("div"); d.id = "capbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("✨ הצעות כיתוב ללוחית", "✨ Plaque caption ideas") + "</b>"
      + '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center"><select id="captone" aria-label="' + Lx("סגנון", "Tone") + '">'
      + '<option value="warm">' + Lx("חם", "Warm") + '</option><option value="short">' + Lx("קצר", "Short") + '</option><option value="poetic">' + Lx("פיוטי", "Poetic") + '</option><option value="funny">' + Lx("מצחיק", "Funny") + "</option></select>"
      + '<button type="button" id="capgo" style="margin:0">' + span("הציעו לי כיתוב לפי הנקודות", "Suggest a caption from my points") + "</button></div>"
      + '<div class="row" id="capopts" role="status" style="flex-wrap:wrap;gap:6px;margin-top:8px"></div>';
    host.insertBefore(d, nav || null);
    $("capgo").onclick = suggest;
  }

  function relabel() {
    document.querySelectorAll("#presetbox [data-he], #capbox [data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
    document.querySelectorAll("#pl select.pic").forEach(function (s) { s.title = Lx("אייקון לנקודה", "Icon for this point"); });
  }

  function init() {
    if (typeof THREE == "undefined" || typeof pinGeo != "function" || typeof renderPins != "function") return;
    [hookPinGeo, hookPinList, buildPresets, buildCaption].forEach(function (f) { try { f(); } catch (e) { console.warn("content", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(relabel, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); var lg = $("lg"); if (lg) lg.addEventListener("click", function () { setTimeout(relabel, 120); }); } catch (e) {}
    window.contentApi = { ICONS: ICONS, PRESETS: PRESETS, applyPreset: applyPreset, presetGpx: presetGpx, localOptions: localOptions, suggest: suggest, BUILD: BUILD };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
