/* geo.js (v52): אוטומציה וחילוץ נתונים
   1. הוספת סיכות ומסלול מתמונות: קוראים את ה-EXIF (GPS ותאריך) מקבצי JPEG בדפדפן. התמונות לא עולות לשום שרת.
   2. שם מקום אוטומטי (Reverse Geocoding): לחיצה על המפה מזהה את שם המקום בעברית ובאנגלית דרך OpenStreetMap Nominatim.
   המודול עוטף את addPin ו-renderPins ולא משנה את הקוד הראשי. השדה pin.names = {he,en} נשמר בפרויקט. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return typeof LANG !== "undefined" && LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };
  var msg = function (t) { var m = $("msg"); if (m) m.textContent = t; };
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ============ 1. EXIF ============ */
  /* מחזיר {lat, lon, alt, date} או null. תומך ב-JPEG (APP1/Exif) בשני סדרי הבתים. לא תומך ב-HEIC */
  function parseExif(buf) {
    var dv = new DataView(buf), n = dv.byteLength;
    if (n < 12 || dv.getUint16(0) != 0xFFD8) return null;
    var off = 2;
    while (off + 4 < n) {
      var marker = dv.getUint16(off);
      if ((marker & 0xFF00) != 0xFF00) return null;
      if (marker == 0xFFDA) return null;   // תחילת נתוני התמונה: אין EXIF
      var size = dv.getUint16(off + 2);
      if (marker == 0xFFE1 && off + 10 <= n && dv.getUint32(off + 4) == 0x45786966 && dv.getUint16(off + 8) == 0) return readTiff(dv, off + 10, Math.min(n, off + 2 + size));
      off += 2 + size;
    }
    return null;
  }
  function readTiff(dv, t, end) {
    var le = dv.getUint16(t) == 0x4949, u16 = function (o) { return dv.getUint16(o, le); }, u32 = function (o) { return dv.getUint32(o, le); };
    if (u16(t + 2) != 42) return null;
    var typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    function readIFD(o) {   // אובייקט {tag: {type,count,pos}} עם pos = היכן הערך נמצא
      var out = {};
      if (o < 0 || t + o + 2 > end) return out;
      var cnt = u16(t + o);
      for (var i = 0; i < cnt; i++) {
        var e = t + o + 2 + i * 12; if (e + 12 > end) break;
        var type = u16(e + 2), count = u32(e + 4), sz = (typeSize[type] || 1) * count;
        out[u16(e)] = { type: type, count: count, pos: sz <= 4 ? e + 8 : t + u32(e + 8) };
      }
      return out;
    }
    function rat(pos, i) { var d = u32(pos + i * 8 + 4); return d ? u32(pos + i * 8) / d : 0; }
    function str(f) { if (!f) return ""; var s = ""; for (var i = 0; i < f.count - 1 && f.pos + i < end; i++) s += String.fromCharCode(dv.getUint8(f.pos + i)); return s; }
    var ifd0 = readIFD(u32(t + 4)), res = { lat: null, lon: null, alt: null, date: null };
    if (ifd0[0x8769]) { var ex = readIFD(u32(ifd0[0x8769].pos)); if (ex[0x9003]) res.date = str(ex[0x9003]); else if (ex[0x9004]) res.date = str(ex[0x9004]); }
    if (!res.date && ifd0[0x0132]) res.date = str(ifd0[0x0132]);
    if (ifd0[0x8825]) {
      var g = readIFD(u32(ifd0[0x8825].pos));
      var dms = function (f) { if (!f || f.count < 3 || f.type != 5) return null; var v = rat(f.pos, 0) + rat(f.pos, 1) / 60 + rat(f.pos, 2) / 3600; return isFinite(v) ? v : null; };
      var la = dms(g[2]), lo = dms(g[4]);
      if (la !== null && lo !== null) {
        res.lat = str(g[1]).charAt(0) == "S" ? -la : la; res.lon = str(g[3]).charAt(0) == "W" ? -lo : lo;
        if (g[6] && g[6].type == 5) { res.alt = rat(g[6].pos, 0); if (g[5] && dv.getUint8(g[5].pos) == 1) res.alt = -res.alt; }
      }
    }
    if (res.lat !== null && (Math.abs(res.lat) > 90 || Math.abs(res.lon) > 180 || (res.lat === 0 && res.lon === 0))) { res.lat = res.lon = null; }   // 0,0 הוא ערך ברירת מחדל שגוי של חלק מהמכשירים
    return res;
  }
  function exifTime(s) { var m = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/.exec(s || ""); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null; }
  function km(a, b) { var r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r, x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) * Math.sin(dn / 2); return 12742 * Math.asin(Math.sqrt(x)); }

  /* מקבץ תמונות לנקודות: ממיין לפי זמן, ממזג תמונות קרובות (עד mergeKm) לסיכה אחת */
  function toPoints(items, mergeKm) {
    var withGps = items.filter(function (x) { return x.lat != null; }).sort(function (a, b) { return (a.t == null ? 1e18 : a.t) - (b.t == null ? 1e18 : b.t); });
    var pts = [];
    withGps.forEach(function (x) {
      var near = pts.filter(function (p) { return km(p, x) <= mergeKm; })[0];
      if (near) { near.n++; return; }
      pts.push({ lat: x.lat, lon: x.lon, t: x.t, n: 1, file: x.name });
    });
    return pts;
  }
  function inCountryAt(lon, lat) {   // איזו מדינה מכילה את הנקודה (לבחירה אוטומטית)
    var found = null;
    Object.keys(countries).some(function (name) {
      return countries[name].some(function (r) {
        var b = bb(r); if (lon < b[0] || lon > b[1] || lat < b[2] || lat > b[3]) return false;
        var c = false; for (var i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > lat) != (r[j][1] > lat) && lon < (r[j][0] - r[i][0]) * (lat - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
        if (c) found = name; return c;
      });
    });
    return found;
  }
  function fmtDate(t) { if (t == null) return ""; var d = new Date(t); return ("0" + d.getUTCDate()).slice(-2) + "." + ("0" + (d.getUTCMonth() + 1)).slice(-2); }

  async function importPhotos(files) {
    var list = Array.prototype.slice.call(files || []).slice(0, 200), items = [], noGps = 0, heic = 0, bad = 0;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (/heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)) { heic++; continue; }
      try {
        var info = parseExif(await f.slice(0, 262144).arrayBuffer());
        if (!info || info.lat == null) { noGps++; continue; }
        items.push({ name: f.name, lat: info.lat, lon: info.lon, t: exifTime(info.date) });
      } catch (e) { bad++; }
    }
    var pts = toPoints(items, 0.3).slice(0, 40);
    if (!pts.length) { setStatus(Lx("לא נמצא מיקום באף תמונה", "No location found in any photo") + extra(noGps, heic, bad)); return { added: 0 }; }
    // אם אף נקודה לא נופלת על המפה הנוכחית, בוחרים את המדינה של התמונה הראשונה
    var onModel = function (p) { var q = toMM(p.lon, p.lat); return Math.abs(q[0]) <= 36 && Math.abs(q[1]) <= 36; }, switched = "";
    if (!pts.some(onModel) && !MULTI) {
      var cn = inCountryAt(pts[0].lon, pts[0].lat);
      if (cn && countries[cn]) { $("cin").value = cname(cn); setCountry(countries[cn]); switched = " " + Lx("נבחרה המדינה " + cname(cn) + ".", "Country set to " + cname(cn) + "."); }
    }
    var first = pins.length;
    pts.forEach(function (p, i) {
      var nm = (fmtDate(p.t) ? fmtDate(p.t) + " · " : "") + Lx("תמונה ", "Photo ") + (i + 1);
      pins.push({ lon: +p.lon.toFixed(5), lat: +p.lat.toFixed(5), name: nm, auto: true });
    });
    if (pts.length > 1 && $("route") && $("route").value == "0") $("route").value = "1";   // קו מסלול בין הסיכות לפי סדר הצילום
    renderPins(); update();
    var off = pts.filter(function (p) { return !onModel(p); }).length;
    setStatus(Lx("נוספו ", "Added ") + pts.length + (pts.length > 1 ? Lx(" סיכות (לפי סדר הצילום) וקו מסלול.", " pins (in shooting order) and a route line.") : Lx(" סיכה.", " pin.")) + switched + (off ? " " + Lx(off + " מחוץ למפה הנוכחית.", off + " outside the current map.") : "") + extra(noGps, heic, bad));
    if (autoOn()) { for (var k = first; k < pins.length && k < first + 40; k++) queueName(pins[k], true); }
    return { added: pts.length, noGps: noGps, heic: heic };
  }
  function extra(noGps, heic, bad) {
    var s = ""; if (noGps) s += " " + Lx(noGps + " תמונות בלי מיקום.", noGps + " photos without location.");
    if (heic) s += " " + Lx(heic + " קבצי HEIC לא נתמכים, המירו ל-JPEG.", heic + " HEIC files are unsupported, convert to JPEG.");
    if (bad) s += " " + Lx(bad + " קבצים לא נקראו.", bad + " files couldn't be read.");
    return s;
  }
  function setStatus(t) { var e = $("exifst"); if (e) e.textContent = t; msg(t); }

  /* ============ 2. Reverse Geocoding ============ */
  var cache = new Map(), queue = [], busy = false, last = 0;
  var autoOn = function () { var c = $("rgauto"); return c ? c.checked : store.get("trip3d_rgauto") != "0"; };
  var isDefault = function (n) { return /^(מקום|Place) \d+$/.test(n || "") || /(תמונה|Photo) \d+$/.test(n || ""); };

  async function lookup(lat, lon) {
    var key = lat.toFixed(3) + "," + lon.toFixed(3);
    if (cache.has(key)) return cache.get(key);
    var wait = last + 1100 - Date.now(); if (wait > 0) await new Promise(function (r) { setTimeout(r, wait); });   // מדיניות Nominatim: עד בקשה אחת בשנייה
    last = Date.now();
    var r = await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&namedetails=1&addressdetails=1&lat=" + lat + "&lon=" + lon + "&accept-language=he,en", { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("rg " + r.status);
    var j = await r.json(), a = j.address || {}, nd = j.namedetails || {};
    var generic = j.name || a.city || a.town || a.village || a.hamlet || a.suburb || a.municipality || a.county || a.state || "";
    var out = { he: nd["name:he"] || (/[֐-׿]/.test(generic) ? generic : ""), en: nd["name:en"] || (/^[\x00-\x7f]*$/.test(generic) ? generic : ""), any: generic, country: a.country || "" };
    if (!out.he && !out.en && !out.any) out = null;
    cache.set(key, out); return out;
  }
  function applyNames(p, nm, force) {
    if (!nm) return false;
    p.names = { he: nm.he || "", en: nm.en || "" };
    var want = isEn() ? (nm.en || nm.he || nm.any) : (nm.he || nm.en || nm.any);
    if (want && (force || isDefault(p.name))) { p.name = want; p.auto = false; }
    return true;
  }
  function queueName(p, quiet) { queue.push({ p: p, quiet: quiet }); pump(); }
  async function pump() {
    if (busy) return; busy = true;
    while (queue.length) {
      var job = queue.shift(), p = job.p;
      if (pins.indexOf(p) < 0) continue;
      try {
        var nm = await lookup(p.lat, p.lon);
        if (nm) { applyNames(p, nm, !!job.force); try { renderPins(); update(); } catch (e) {} hint(Lx("זוהה: ", "Detected: ") + [nm.he, nm.en].filter(Boolean).join(" / ") + (queue.length ? " · " + Lx("נותרו ", "") + queue.length : "")); }
        else if (!job.quiet) hint(Lx("לא נמצא שם למקום הזה", "No name found for this place"));
      } catch (e) { if (!job.quiet) hint(Lx("לא ניתן לזהות שם כרגע (אין חיבור לשירות המפות)", "Couldn't detect a name right now (map service unreachable)")); queue.length = 0; }
    }
    busy = false;
  }
  function hint(t) { var e = $("rghint"); if (e) e.textContent = t; }

  function hookAddPin() {
    var orig = addPin;
    addPin = function (lon, lat, name) {
      var r = orig.apply(this, arguments);
      try { var p = pins[pins.length - 1]; if (p && autoOn() && isDefault(name)) queueName(p, false); } catch (e) {}
      return r;
    };
  }
  function hookPinList() {
    var orig = renderPins;
    function decorate() {
      var L = $("pl"); if (!L) return;
      Array.prototype.forEach.call(L.children, function (row, i) {
        var p = pins[i]; if (!p || row.querySelector("button.pgeo")) return;
        var b = document.createElement("button"); b.type = "button"; b.className = "pgeo"; b.textContent = "🌐";
        var both = p.names && p.names.he && p.names.en;
        b.title = both ? Lx("החלפה בין שם בעברית לאנגלית", "Switch between Hebrew and English name") : Lx("זיהוי שם המקום (עברית ואנגלית)", "Detect the place name (Hebrew and English)");
        b.setAttribute("aria-label", b.title);
        b.onclick = function () {
          if (both) { p.name = p.name == p.names.he ? p.names.en : p.names.he; renderPins(); update(); return; }
          hint(Lx("מזהה…", "Detecting…")); queue.push({ p: p, force: true, quiet: false }); pump();
        };
        row.insertBefore(b, row.children[1] || null);
      });
    }
    renderPins = function () { var r = orig.apply(this, arguments); try { decorate(); } catch (e) { console.warn("geo", e); } return r; };
    try { decorate(); } catch (e) {}
  }

  function buildUI() {
    var host = document.querySelector('.uxp[data-t="2"]'), nav = host && host.querySelector(".uxnav");
    if (!host || $("exifbox")) return;
    var d = document.createElement("div"); d.id = "exifbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("📷 סיכות ומסלול מתמונות", "📷 Pins and route from photos") + "</b>"
      + '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px"><input type="file" id="exiff" accept="image/jpeg,image/*" multiple aria-label="' + Lx("תמונות מהטיול", "Trip photos") + '"></div>'
      + '<p class="hint">' + span("המיקום נקרא מתוך התמונות בדפדפן שלכם והתמונות לא עולות לשום מקום. נתמך JPEG עם מיקום (לא HEIC).", "Location is read from the photos in your browser and the photos are never uploaded. JPEG with location is supported (not HEIC).") + "</p>"
      + '<div class="hint" id="exifst" role="status"></div>'
      + '<label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" id="rgauto"> ' + span("זיהוי שם מקום אוטומטי בלחיצה על המפה", "Detect place names automatically when you click the map") + "</label>"
      + '<p class="hint">' + span("הזיהוי שולח את הקואורדינטות של הנקודה לשירות OpenStreetMap (Nominatim). כבו אותו כדי לא לשלוח.", "Detection sends the point's coordinates to OpenStreetMap (Nominatim). Turn it off to send nothing.") + '</p><div class="hint" id="rghint" role="status"></div>';
    host.insertBefore(d, nav || null);
    $("rgauto").checked = store.get("trip3d_rgauto") != "0";
    $("rgauto").onchange = function () { store.set("trip3d_rgauto", this.checked ? "1" : "0"); };
    $("exiff").onchange = function () { var f = this.files; if (f && f.length) importPhotos(f); this.value = ""; };
  }
  function relabel() { document.querySelectorAll("#exifbox [data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; }); }

  function init() {
    if (typeof addPin != "function" || typeof renderPins != "function") return;
    [hookAddPin, hookPinList, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("geo", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(relabel, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    window.geoApi = { parseExif: parseExif, importPhotos: importPhotos, toPoints: toPoints, lookup: lookup, inCountryAt: inCountryAt, applyNames: applyNames, queueName: queueName, cache: cache };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
