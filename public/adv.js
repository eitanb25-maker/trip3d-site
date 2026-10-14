/* adv.js – תכונות מתקדמות: מסלול GPX (טראק) + סטטיסטיקה, רמת פירוט הרשת, ייצוא GLB/USDZ ל-AR.
   נטען defer אחרי ux.js. עוטף פונקציות גלובליות קיימות (build, drawMap, getProj, putProj) ולא משנה את הקוד המקורי.
   כל חלק עטוף ב-try – תקלה כאן לא שוברת את העורך. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return typeof LANG !== "undefined" && LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var msg = function (t) { var m = $("msg"); if (m) m.textContent = t; };
  var tick = function () { return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 30); }); }); };

  /* ============ 1. מסלול GPX ============ */
  var TRK = null; /* {n, segs:[[[lon,lat],...]], st:{km,max,min,gain,n,hrs}, w, on, ins} */

  function hav(a, b) {
    var R = 6371, r = Math.PI / 180, dl = (b[1] - a[1]) * r, dn = (b[0] - a[0]) * r;
    var x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dn / 2) * Math.sin(dn / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function stats(segs) {
    var km = 0, n = 0, max = null, min = null, gain = 0, t0 = null, t1 = null;
    segs.forEach(function (s) {
      var ref = null;
      s.forEach(function (p, i) {
        n++;
        if (i) km += hav(s[i - 1], p);
        if (p[2] != null) {
          if (max === null || p[2] > max) max = p[2];
          if (min === null || p[2] < min) min = p[2];
          if (ref === null) ref = p[2]; else if (p[2] - ref >= 3) { gain += p[2] - ref; ref = p[2]; } else if (ref - p[2] >= 3) ref = p[2];
        }
        if (p[3] != null) { if (t0 === null) t0 = p[3]; t1 = p[3]; }
      });
    });
    return { km: km, max: max, min: min, gain: max === null ? null : gain, n: n, hrs: t0 !== null && t1 > t0 ? (t1 - t0) / 36e5 : null };
  }
  function parseTrack(text) {
    var d = new DOMParser().parseFromString(text, "text/xml");
    if (d.querySelector("parsererror")) throw new Error("xml");
    var segs = [], rd = function (nodes, sel) {
      var s = [];
      nodes.querySelectorAll(sel).forEach(function (p) {
        var la = +p.getAttribute("lat"), lo = +p.getAttribute("lon");
        if (!isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return;
        var e = p.querySelector("ele"), t = p.querySelector("time"), ev = e ? parseFloat(e.textContent) : NaN, tv = t ? Date.parse(t.textContent) : NaN;
        s.push([lo, la, isFinite(ev) ? ev : null, isFinite(tv) ? tv : null]);
      });
      if (s.length > 1) segs.push(s);
    };
    d.querySelectorAll("trkseg").forEach(function (sg) { rd(sg, "trkpt"); });
    if (!segs.length) d.querySelectorAll("rte").forEach(function (r) { rd(r, "rtept"); });
    if (!segs.length) throw new Error("none");
    var nm = d.querySelector("trk > name") || d.querySelector("metadata > name") || d.querySelector("rte > name");
    return { n: nm ? nm.textContent.trim() : "", segs: segs };
  }
  /* פשטות Douglas-Peucker איטרטיבית (במעלות, עם תיקון קו רוחב) */
  function rdp(pts, tol) {
    var n = pts.length; if (n < 3) return pts.slice();
    var k = Math.cos(pts[0][1] * Math.PI / 180), keep = new Uint8Array(n), st = [[0, n - 1]]; keep[0] = keep[n - 1] = 1;
    while (st.length) {
      var r = st.pop(), a = pts[r[0]], b = pts[r[1]], dx = (b[0] - a[0]) * k, dy = b[1] - a[1], L = Math.hypot(dx, dy), mx = -1, mi = -1;
      for (var i = r[0] + 1; i < r[1]; i++) {
        var px = (pts[i][0] - a[0]) * k, py = pts[i][1] - a[1];
        var d = L ? Math.abs(dx * py - dy * px) / L : Math.hypot(px, py);
        if (d > mx) { mx = d; mi = i; }
      }
      if (mx > tol) { keep[mi] = 1; st.push([r[0], mi], [mi, r[1]]); }
    }
    return pts.filter(function (p, i) { return keep[i]; });
  }
  function thin(segs, cap) {
    var tol = 0.00008, out;
    for (var it = 0; it < 12; it++) {
      out = segs.map(function (s) { return rdp(s, tol).map(function (p) { return [+p[0].toFixed(5), +p[1].toFixed(5)]; }); });
      if (out.reduce(function (a, s) { return a + s.length; }, 0) <= cap) break;
      tol *= 1.8;
    }
    return out;
  }
  function fmtStats() {
    if (!TRK) return "";
    var s = TRK.st, o = s.km.toFixed(1) + " " + Lx("ק״מ", "km");
    if (s.max != null) o += " · " + Lx("שיא ", "peak ") + Math.round(s.max).toLocaleString("en-US") + " " + Lx("מ׳", "m");
    return o;
  }
  function importTrack(text, fromTrkInput) {
    var t;
    try { t = parseTrack(text); } catch (e) { if (fromTrkInput) msg(Lx("לא נמצא מסלול בקובץ (צריך קובץ GPX עם נקודות מסלול)", "No track found (needs a GPX file with track points)")); return false; }
    var st = stats(t.segs);
    TRK = { n: t.n, segs: thin(t.segs, 1500), st: st, w: TRK ? TRK.w : "1.2", on: true, ins: TRK ? TRK.ins : "" };
    paint();
    var warn = "";
    try {
      var B = pick(raw).map(bb), c = TRK.segs[0][Math.floor(TRK.segs[0].length / 2)];
      if (B.length && !B.some(function (b) { return c[0] >= b[0] - 1 && c[0] <= b[1] + 1 && c[1] >= b[2] - 1 && c[1] <= b[3] + 1; })) warn = " " + Lx("(המסלול מחוץ למדינה שנבחרה – בחרו את המדינה הנכונה)", "(the track is outside the selected country – pick the right one)");
    } catch (e) { }
    msg(Lx("המסלול נטען: ", "Track loaded: ") + fmtStats() + warn);
    if ($("trkst") && $("trkst").checked) applyStatsText();
    safeUpdate();
    return true;
  }
  function safeUpdate() { try { if (typeof update === "function") update(); } catch (e) { } }

  /* שורת הסטטיסטיקה על הלוחית: נכתבת לשדה "שורה נוספת" ומוסרת בדיוק כשכבה */
  function stripIns(v) {
    if (TRK && TRK.ins) { v = v.split(" · " + TRK.ins).join("").split(TRK.ins + " · ").join("").split(TRK.ins).join(""); }
    return v.trim();
  }
  function applyStatsText() {
    var el = $("tsub"); if (!el) return;
    var v = stripIns(el.value), on = $("trkst") && $("trkst").checked && TRK;
    if (on) { TRK.ins = fmtStats(); v = v ? v + " · " + TRK.ins : TRK.ins; }
    else if (TRK) TRK.ins = "";
    el.value = v;
  }

  /* ---- ממשק (לשונית 2) ---- */
  function span(he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="2"]'), nav = host && host.querySelector(".uxnav");
    if (!host || $("trkbox")) return;
    var box = document.createElement("div"); box.id = "trkbox";
    box.innerHTML = '<hr><label>' + span("מסלול GPX (Strava / Garmin / Wikiloc)", "GPX track (Strava / Garmin / Wikiloc)") + '</label>'
      + '<input type="file" id="trkf" accept=".gpx,application/gpx+xml,text/xml">'
      + '<div id="trkinfo" class="uxsum" style="display:none"></div>'
      + '<div id="trkctl" style="display:none"><label>' + span("עובי קו המסלול", "Track line thickness") + '</label><select id="trkw"><option value="0.8">' + span("דק", "Thin") + '</option><option value="1.2" selected>' + span("רגיל", "Normal") + '</option><option value="1.8">' + span("עבה", "Thick") + '</option></select>'
      + '<label><input type="checkbox" id="trkon" checked> ' + span("הצג את המסלול על המודל", "Show the track on the model") + '</label>'
      + '<label><input type="checkbox" id="trkst"> ' + span("חרוט את הסטטיסטיקה (מרחק ושיא גובה) בשורה הנוספת על הלוחית", "Engrave the stats (distance and peak) on the plate’s extra line") + '</label>'
      + '<button type="button" id="trkx">' + span("🗑 הסר מסלול", "🗑 Remove track") + '</button></div>'
      + '<p class="hint">' + span("המסלול נבנה כקו מוגבה על המדינה, בצבע הסיכות, כחלק נפרד בקבצי ההורדה. המרחק והגובה מחושבים מקובץ ה-GPX (גובה אם הוקלט בו).", "The track is built as a raised line on the country, in the pin color, as its own part in the download. Distance and elevation come from the GPX file (elevation only if recorded).") + '</p>';
    host.insertBefore(box, nav);
    $("trkf").onchange = function () { var f = this.files[0]; if (!f) return; f.text().then(function (t) { importTrack(t, true); }); this.value = ""; };
    $("trkw").onchange = function () { if (TRK) { TRK.w = this.value; safeUpdate(); } };
    $("trkon").onchange = function () { if (TRK) { TRK.on = this.checked; safeUpdate(); } };
    $("trkst").onchange = function () { applyStatsText(); safeUpdate(); };
    $("trkx").onclick = function () { stripIns($("tsub").value); var v = stripIns($("tsub").value); $("tsub").value = v; TRK = null; paint(); safeUpdate(); msg(Lx("המסלול הוסר", "Track removed")); };
    if (window.uxAddTips) window.uxAddTips({
      trkw: ["עובי הקו של המסלול על המודל. קו דק (0.8 מ״מ) מפורט אבל עדין להדפסה; עבה יציב יותר.", "Line thickness of the track on the model. Thin (0.8 mm) is detailed but delicate to print; thick is sturdier."],
      trkf: ["GPX הוא קובץ מסלול מ-GPS (Strava, Garmin, Wikiloc ועוד): נקודות עם קו אורך/רוחב, ולפעמים גובה וזמן.", "GPX is a GPS track file (Strava, Garmin, Wikiloc…): points with latitude/longitude and often elevation and time."]
    });
  }
  function paint() {
    var info = $("trkinfo"), ctl = $("trkctl"); if (!info) return;
    info.style.display = ctl.style.display = TRK ? "" : "none";
    if (!TRK) return;
    var s = TRK.st;
    info.innerHTML = "<b>" + (TRK.n ? TRK.n + " · " : "") + Lx("סטטיסטיקת מסלול", "Track stats") + "</b><br>"
      + "📏 " + s.km.toFixed(2) + " " + Lx("ק״מ", "km") + " · " + s.n.toLocaleString("en-US") + " " + Lx("נקודות", "points") + "<br>"
      + (s.max != null ? "⛰ " + Lx("שיא גובה: ", "Peak: ") + Math.round(s.max).toLocaleString("en-US") + " " + Lx("מ׳", "m") + " · " + Lx("נמוך: ", "low: ") + Math.round(s.min).toLocaleString("en-US") + " " + Lx("מ׳", "m") + " · " + Lx("עלייה מצטברת: ", "gain: ") + Math.round(s.gain).toLocaleString("en-US") + " " + Lx("מ׳", "m") + "<br>" : "<span class='hint'>" + Lx("אין נתוני גובה בקובץ", "No elevation data in the file") + "</span><br>")
      + (s.hrs != null ? "⏱ " + (s.hrs < 1 ? Math.round(s.hrs * 60) + " " + Lx("דק׳", "min") : s.hrs.toFixed(1) + " " + Lx("שע׳", "h")) : "");
    $("trkw").value = TRK.w; $("trkon").checked = TRK.on !== false; $("trkst").checked = !!TRK.ins;
  }
  function relabel() {
    document.querySelectorAll("#trkbox [data-he], #advar [data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
    if (TRK) { paint(); if ($("trkst").checked) { applyStatsText(); safeUpdate(); } }
  }

  /* ---- בניית הגיאומטריה ---- */
  var WIDTHS = { "0.8": 0.8, "1.2": 1.2, "1.8": 1.8 };
  function trackGeoms() {
    var small = TOOL != "stand", BH = small ? 0 : +$("bh").value, LH = small ? (TOOL == "magnet" ? 5.4 : TOOL == "puzzle" ? 3 : 4) : +$("lh").value, GP = small ? 0 : +$("gap").value, OY = small ? 0 : 14;
    var w = WIDTHS[TRK.w] || 1.2, minD = Math.max(0.15, meshEps() * 3), g = [], T = THREE;
    TRK.segs.forEach(function (s) {
      var q = [];
      s.forEach(function (p) { var m = toMM(p[0], p[1]); if (!isFinite(m[0]) || !isFinite(m[1])) return; var l = q[q.length - 1]; if (!l || Math.hypot(m[0] - l[0], m[1] - l[1]) >= minD) q.push(m); });
      var ok = function (m) { return Math.abs(m[0]) <= 36 && Math.abs(m[1]) <= 36; };
      q.forEach(function (m, i) {
        if (!ok(m)) return;
        var z = relAt(m[0], m[1]) + BH + GP + LH;
        g.push(new T.CylinderGeometry(w / 2, w / 2, 0.8, 8).rotateX(Math.PI / 2).translate(m[0], m[1] + OY, z + 0.4));
        if (i && ok(q[i - 1])) {
          var a = q[i - 1], dx = m[0] - a[0], dy = m[1] - a[1], l = Math.hypot(dx, dy), z2 = Math.max(relAt(a[0], a[1]), relAt(m[0], m[1])) + BH + GP + LH;
          if (l > 0) g.push(new T.BoxGeometry(l, w, 0.8).rotateZ(Math.atan2(dy, dx)).translate((a[0] + m[0]) / 2, (a[1] + m[1]) / 2 + OY, z2 + 0.4));
        }
      });
    });
    return g;
  }
  function hookBuild() {
    if (typeof build !== "function" || build.__adv) return;
    var ob = build;
    var nb = function () {
      var P = ob.apply(this, arguments);
      try {
        if (TRK && TRK.on !== false && TOOL != "holder" && TOOL != "puzzle" && PR && PR.s) {
          var geoms = trackGeoms();
          if (geoms.length) {
            var p = { name: "3c_track", color: $("c_pin").value, geoms: geoms }, nn = NC();
            p.rep = repK(keyOf(p.name)); p.color = $("c_" + p.rep).value; P.push(p);
          }
        }
      } catch (e) { console.warn("adv track", e); }
      return P;
    };
    nb.__adv = 1; build = nb; /* eslint-disable-line no-global-assign */
    try { NMH.track = "מסלול GPX"; NME.track = "GPX track"; } catch (e) { }
  }
  function hookMap() {
    if (typeof drawMap !== "function" || drawMap.__adv) return;
    var od = drawMap;
    var nd = function () {
      od.apply(this, arguments);
      try {
        if (!TRK || TRK.on === false || !PR || !PR.s) return;
        mx.save(); mx.strokeStyle = $("c_pin").value; mx.lineWidth = 2.2; mx.lineJoin = mx.lineCap = "round"; mx.setLineDash([]);
        TRK.segs.forEach(function (s) { mx.beginPath(); s.forEach(function (p, i) { var m = toMM(p[0], p[1]); mx[i ? "lineTo" : "moveTo"](260 + m[0] * S, 260 - m[1] * S); }); mx.stroke(); });
        mx.restore();
      } catch (e) { }
    };
    nd.__adv = 1; drawMap = nd; /* eslint-disable-line no-global-assign */
  }
  function hookProj() {
    if (typeof getProj === "function" && !getProj.__adv) {
      var og = getProj;
      var ng = function () { var o = og.apply(this, arguments); try { if (TRK) o.trk = { n: TRK.n, segs: TRK.segs, st: TRK.st, w: TRK.w, on: TRK.on, ins: TRK.ins }; } catch (e) { } return o; };
      ng.__adv = 1; getProj = ng; /* eslint-disable-line no-global-assign */
    }
    if (typeof putProj === "function" && !putProj.__adv) {
      var op = putProj;
      var np = function (o) {
        try { TRK = o && o.trk && o.trk.segs && o.trk.segs.length ? { n: o.trk.n || "", segs: o.trk.segs, st: o.trk.st || stats(o.trk.segs), w: o.trk.w || "1.2", on: o.trk.on !== false, ins: o.trk.ins || "" } : null; paint(); } catch (e) { TRK = null; }
        return op.apply(this, arguments);
      };
      np.__adv = 1; putProj = np; /* eslint-disable-line no-global-assign */
    }
  }
  function hookImport() {
    var b = $("impb"); if (!b || b.__adv) return; b.__adv = 1;
    b.addEventListener("click", function () {
      var f = $("impf") && $("impf").files[0];
      if (f && /\.gpx$/i.test(f.name)) f.text().then(function (t) { if (/<trkpt/i.test(t)) importTrack(t, false); });
    }, true);
  }

  /* ============ 2. רמת פירוט הרשת ============ */
  var EPS = { low: 0.45, med: 0.1, high: 0.03 };
  window.meshEps = function () {
    var s = $("mq"), v = s ? s.value : "auto";
    if (EPS[v]) return EPS[v];
    try { return LOWQ ? 0.35 : 0.1; } catch (e) { return 0.1; }
  };
  function buildMesh() {
    var host = document.querySelector('.uxp[data-t="1"]'), nav = host && host.querySelector(".uxnav");
    if (!host || $("mq")) return;
    var wrap = document.createDocumentFragment(), lb = document.createElement("label"), sel = document.createElement("select");
    lb.innerHTML = span("רמת פירוט הרשת (מצולעים)", "Mesh detail (polygons)");
    sel.id = "mq";
    sel.innerHTML = '<option value="auto">' + span("אוטומטי (לפי המכשיר)", "Auto (by device)") + '</option><option value="low">' + span("נמוכה – מהיר, קובץ קטן", "Low – fast, small file") + '</option><option value="med">' + span("בינונית", "Medium") + '</option><option value="high">' + span("גבוהה – פירוט מרבי, איטי", "High – max detail, slower") + "</option>";
    wrap.appendChild(lb); wrap.appendChild(sel);
    var far = $("far"), anchor = far ? far.closest("label") : null;
    if (anchor && anchor.parentNode == host) host.insertBefore(wrap, anchor.nextSibling); else host.insertBefore(wrap, nav);
    try { if (SV.indexOf("mq") < 0) SV.push("mq"); } catch (e) { }
    sel.onchange = function () { try { fit(); update(); } catch (e) { } };
    if (window.uxAddTips) window.uxAddTips({ mq: ["כמה נקודות יש בקו המתאר של המדינה. נמוכה = מהיר יותר בתצוגה וקובץ קטן (טוב למכשירים חלשים); גבוהה = חוף חלק ומפורט יותר להדפסה, אבל טעינה איטית וקבצים גדולים. הסיכות והמים לא מושפעים.", "How many points the country outline has. Low = faster preview and a smaller file (good for weak devices); High = a smoother, more detailed coastline for printing, but slower and larger files. Pins and water are unaffected."] });
  }

  /* ============ 3. AR: GLB / USDZ ============ */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  var hex2lin = function (h) { return [1, 3, 5].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); };
  var hex2srgb = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; }); };

  /* מלחים קודקודים עם אותו נורמל (שומר קצוות חדים, מקטין קובץ). מחזיר מטרים, ציר Y למעלה, ממורכז על הרצפה. */
  function collect(P, sc) {
    var bb = new THREE.Box3();
    P.forEach(function (p) { p.geoms.forEach(function (g) { g.computeBoundingBox(); bb.union(g.boundingBox); }); });
    var cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, z0 = bb.min.z, out = [], tris = 0;
    P.forEach(function (p) {
      if (!p.geoms.length) return;
      var map = new Map(), pos = [], nor = [], idx = [];
      p.geoms.forEach(function (ge) {
        var g = ge.index ? ge.toNonIndexed() : ge, a = g.attributes.position.array;
        for (var i = 0; i < a.length; i += 9) {
          var ux = a[i + 3] - a[i], uy = a[i + 4] - a[i + 1], uz = a[i + 5] - a[i + 2], vx = a[i + 6] - a[i], vy = a[i + 7] - a[i + 1], vz = a[i + 8] - a[i + 2];
          var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
          if (!l) continue; nx /= l; ny /= l; nz /= l;
          var nk = Math.round(nx * 10) + "," + Math.round(ny * 10) + "," + Math.round(nz * 10);
          for (var k = 0; k < 3; k++) {
            var x = (a[i + k * 3] - cx) * sc, y = (a[i + k * 3 + 1] - cy) * sc, z = (a[i + k * 3 + 2] - z0) * sc;
            var key = Math.round(x * 100) + "," + Math.round(y * 100) + "," + Math.round(z * 100) + "," + nk, id = map.get(key);
            if (id === undefined) { id = pos.length / 3; map.set(key, id); pos.push(x * 0.001, z * 0.001, -y * 0.001); nor.push(nx, nz, -ny); }
            idx.push(id);
          }
          tris++;
        }
      });
      if (idx.length) out.push({ name: p.name.replace(/[^A-Za-z0-9_]/g, "_"), color: p.color || "#cccccc", pos: pos, nor: nor, idx: idx });
    });
    return { meshes: out, tris: tris };
  }

  function glb(meshes) {
    var chunks = [], bv = [], ac = [], ms = [], nd = [], mt = [], off = 0;
    var push = function (arr, target) { var buf = arr.buffer, pad = (4 - (arr.byteLength % 4)) % 4; chunks.push(new Uint8Array(buf)); if (pad) chunks.push(new Uint8Array(pad)); bv.push({ buffer: 0, byteOffset: off, byteLength: arr.byteLength, target: target }); off += arr.byteLength + pad; return bv.length - 1; };
    meshes.forEach(function (m, i) {
      var P = new Float32Array(m.pos), N = new Float32Array(m.nor), I = new Uint32Array(m.idx), mn = [1e9, 1e9, 1e9], mxv = [-1e9, -1e9, -1e9];
      for (var j = 0; j < P.length; j += 3) for (var k = 0; k < 3; k++) { if (P[j + k] < mn[k]) mn[k] = P[j + k]; if (P[j + k] > mxv[k]) mxv[k] = P[j + k]; }
      var a0 = ac.length; ac.push({ bufferView: push(P, 34962), componentType: 5126, count: P.length / 3, type: "VEC3", min: mn, max: mxv });
      ac.push({ bufferView: push(N, 34962), componentType: 5126, count: N.length / 3, type: "VEC3" });
      ac.push({ bufferView: push(I, 34963), componentType: 5125, count: I.length, type: "SCALAR" });
      var c = hex2lin(m.color); mt.push({ name: m.name, pbrMetallicRoughness: { baseColorFactor: [c[0], c[1], c[2], 1], metallicFactor: 0, roughnessFactor: 0.65 }, doubleSided: true });
      ms.push({ name: m.name, primitives: [{ attributes: { POSITION: a0, NORMAL: a0 + 1 }, indices: a0 + 2, material: i, mode: 4 }] }); nd.push({ mesh: i, name: m.name });
    });
    var json = JSON.stringify({ asset: { version: "2.0", generator: "Trip3D Studio" }, scene: 0, scenes: [{ nodes: nd.map(function (_, i) { return i; }) }], nodes: nd, meshes: ms, materials: mt, accessors: ac, bufferViews: bv, buffers: [{ byteLength: off }] });
    var jb = new TextEncoder().encode(json), jp = (4 - (jb.length % 4)) % 4, jl = jb.length + jp, total = 12 + 8 + jl + 8 + off, out = new Uint8Array(total), dv = new DataView(out.buffer), p = 0;
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); out.set(jb, 20); for (var q = 0; q < jp; q++) out[20 + jb.length + q] = 32;
    p = 20 + jl; dv.setUint32(p, off, true); dv.setUint32(p + 4, 0x004E4942, true); p += 8;
    chunks.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }

  function usda(meshes) {
    var f = function (v) { return (+v.toFixed(5)).toString(); }, o = ['#usda 1.0\n(\n    defaultPrim = "Root"\n    metersPerUnit = 1\n    upAxis = "Y"\n)\n\ndef Xform "Root"\n{\n'];
    meshes.forEach(function (m, i) {
      var pts = [], nrm = [], cnt = [], c = hex2srgb(m.color);
      for (var j = 0; j < m.pos.length; j += 3) { pts.push("(" + f(m.pos[j]) + "," + f(m.pos[j + 1]) + "," + f(m.pos[j + 2]) + ")"); nrm.push("(" + f(m.nor[j]) + "," + f(m.nor[j + 1]) + "," + f(m.nor[j + 2]) + ")"); }
      for (var t = 0; t < m.idx.length / 3; t++) cnt.push(3);
      o.push('    def Mesh "m' + i + "_" + m.name + '" (\n        prepend apiSchemas = ["MaterialBindingAPI"]\n    )\n    {\n        int[] faceVertexCounts = [' + cnt.join(",") + ']\n        int[] faceVertexIndices = [' + m.idx.join(",") + ']\n        point3f[] points = [' + pts.join(",") + ']\n        normal3f[] normals = [' + nrm.join(",") + '] (\n            interpolation = "vertex"\n        )\n        color3f[] primvars:displayColor = [(' + c.map(f).join(",") + ')]\n        uniform token subdivisionScheme = "none"\n        rel material:binding = </Root/Materials/M' + i + '>\n    }\n');
    });
    o.push('    def Scope "Materials"\n    {\n');
    meshes.forEach(function (m, i) {
      var c = hex2srgb(m.color).map(function (v) { return v.toFixed(4); }).join(",");
      o.push('        def Material "M' + i + '"\n        {\n            token outputs:surface.connect = </Root/Materials/M' + i + '/PBR.outputs:surface>\n            def Shader "PBR"\n            {\n                uniform token info:id = "UsdPreviewSurface"\n                color3f inputs:diffuseColor = (' + c + ')\n                float inputs:metallic = 0\n                float inputs:roughness = 0.65\n                token outputs:surface\n            }\n        }\n');
    });
    o.push("    }\n}\n");
    return o.join("");
  }
  /* USDZ = ZIP ללא דחיסה, כשתחילת כל קובץ מיושרת ל-64 בתים */
  function usdz(name, bytes) {
    var nm = new TextEncoder().encode(name), base = 30 + nm.length, ex = base % 64 ? 64 - (base % 64) : 0;
    if (ex && ex < 4) ex += 64;
    var crc = crc32(bytes), lh = new Uint8Array(base + ex), dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0x21, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, bytes.length, true); dv.setUint32(22, bytes.length, true); dv.setUint16(26, nm.length, true); dv.setUint16(28, ex, true);
    lh.set(nm, 30); if (ex) { dv.setUint16(30 + nm.length, 0x1986, true); dv.setUint16(32 + nm.length, ex - 4, true); }
    var cd = new Uint8Array(46 + nm.length), cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true); cv.setUint16(28, nm.length, true); cv.setUint32(42, 0, true); cd.set(nm, 46);
    var eo = new Uint8Array(22), ev = new DataView(eo.buffer), cdOff = lh.length + bytes.length;
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, 1, true); ev.setUint16(10, 1, true); ev.setUint32(12, cd.length, true); ev.setUint32(16, cdOff, true);
    var out = new Uint8Array(cdOff + cd.length + 22); out.set(lh, 0); out.set(bytes, lh.length); out.set(cd, cdOff); out.set(eo, cdOff + cd.length);
    return out;
  }

  var MAXTRI = 400000;
  async function makeAR(kind) {
    /* כמו הורדה רגילה: דורש התחברות ונספר במכסת ההורדות, כי הקובץ מכיל את המודל המלא */
    var m = $("msg");
    if (typeof myId === "function" && !(await myId())) { msg(Lx("כדי להוריד צריך להתחבר (חינם, פעם אחת).", "Sign in to download (free, once).")); try { authOpen("login"); } catch (e) { } return; }
    try { var r = await API.download(MULTI ? "multi" : TOOL, curCountry()); if (!r.ok) { msg(r.msg); return; } } catch (e) { msg(Lx("שגיאה באימות ההורדה", "Download check failed")); return; }
    setBusy(true, Lx("בונה קובץ AR…", "Building the AR file…")); await tick();
    try {
      var P = build(), z = scaleFor(P), c = collect(P, z.sc);
      if (c.tris > MAXTRI) { setBusy(false); msg(Lx("המודל גדול מדי ל-AR (" + c.tris.toLocaleString() + " משולשים). הקטינו את 'רמת פירוט הרשת' ל'נמוכה' ונסו שוב.", "The model is too big for AR (" + c.tris.toLocaleString() + " triangles). Set 'Mesh detail' to Low and retry.")); return; }
      var data, name, type;
      if (kind == "glb") { data = glb(c.meshes); name = "trip3d.glb"; type = "model/gltf-binary"; }
      else { data = usdz("model.usda", new TextEncoder().encode(usda(c.meshes))); name = "trip3d.usdz"; type = "model/vnd.usdz+zip"; }
      setBusy(false);
      if (kind == "ar") { /* לא בשימוש כאן */ }
      return { data: data, name: name, type: type, tris: c.tris };
    } catch (e) { setBusy(false); console.warn("adv ar", e); msg(Lx("שגיאה בבניית קובץ ה-AR", "Error building the AR file")); }
  }
  async function saveFile(res) {
    try { var d = await claude.use("downloads"); if (!d) { msg(Lx("ההורדה לא זמינה בתצוגה הזו", "Download isn't available in this view")); return; } await d.save({ filename: res.name, data: res.data }); msg(Lx("נשמר: ", "Saved: ") + res.name + " (" + Math.round(res.data.length / 1024).toLocaleString() + " KB)"); }
    catch (e) { msg(e && e.code == "declined" ? Lx("ההורדה בוטלה", "Download cancelled") : Lx("שגיאה בהורדה", "Download error")); }
  }
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform == "MacIntel" && navigator.maxTouchPoints > 1);
  function openAR(res) {
    var url = URL.createObjectURL(new Blob([res.data], { type: res.type })), a = document.createElement("a"), im = document.createElement("img");
    a.rel = "ar"; a.href = url; im.width = im.height = 1; im.alt = ""; a.appendChild(im); a.style.cssText = "position:fixed;left:-9px;top:0;width:1px;height:1px;opacity:0"; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 60000);
    msg(Lx("פותח את ה-AR… אם לא נפתח, הורידו USDZ ופתחו ב'קבצים'.", "Opening AR… if it doesn't open, download the USDZ and open it from Files."));
  }
  function buildAR() {
    var host = document.querySelector('.uxp[data-t="4"]'), sum = $("uxsum"); if (!host || !sum || $("advar")) return;
    var d = document.createElement("div"); d.id = "advar"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("📱 מציאות רבודה (AR) וקבצי 3D", "📱 Augmented reality (AR) and 3D files") + "</b>"
      + '<div class="row" style="flex-wrap:wrap;margin-top:8px">' + (IOS ? '<button type="button" id="arv" class="go" style="margin:0">' + span("📱 צפייה ב-AR", "📱 View in AR") + "</button>" : "")
      + '<button type="button" id="arg" style="margin:0">' + span("⬇ GLB", "⬇ GLB") + '</button><button type="button" id="aru" style="margin:0">' + span("⬇ USDZ", "⬇ USDZ") + "</button></div>"
      + '<p class="hint">' + span("USDZ נפתח ב-AR Quick Look באייפון/אייפד, ו-GLB נפתח בצופי 3D (אנדרואיד, Windows, Blender). המודל בגודל האמיתי כפי שיודפס. כל קובץ נספר כהורדה.", "USDZ opens in AR Quick Look on iPhone/iPad, and GLB opens in 3D viewers (Android, Windows, Blender). The model is at its real printed size. Each file counts as a download.") + "</p>";
    sum.parentNode.insertBefore(d, sum.nextSibling);
    var busy = false, run = function (kind, fn) { return async function () { if (busy) return; busy = true; try { var r = await makeAR(kind == "ar" ? "usdz" : kind); if (r) fn(r); } finally { busy = false; } }; };
    $("arg").onclick = run("glb", saveFile); $("aru").onclick = run("usdz", saveFile); if ($("arv")) $("arv").onclick = run("ar", openAR);
  }

  /* ============ אתחול ============ */
  function init() {
    [hookBuild, hookMap, hookProj, buildUI, hookImport, buildMesh, buildAR].forEach(function (f) { try { f(); } catch (e) { console.warn("adv", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(relabel, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); var lg = $("lg"); if (lg) lg.addEventListener("click", function () { setTimeout(relabel, 150); setTimeout(relabel, 700); }); } catch (e) { }
    window.advDebug = { importTrack: importTrack, stats: stats, parseTrack: parseTrack, collect: collect, glb: glb, usda: usda, usdz: usdz, trk: function () { return TRK; } };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
