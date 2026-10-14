/* cropfree.js (v51): חיתוך גבולות חופשי
   משרטטים צורה חופשית או פוליגון על המפה, והמודל נחתך לשטח שבתוכה בלבד.
   ארכיטקטורה: ה"crop" הקיים נשאר מלבן (תיבת המסגרת של הפוליגון), והקוד הראשי קורא ל-polyCrop(rings) בסוף clipAll.
   החיתוך עצמו נעשה ברסטר (Canvas) ואחריו חילוץ קווי מתאר (Marching Squares) וליטוש (RDP), ולכן הוא יציב גם לפוליגונים קעורים וצורות מסובכות. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return typeof LANG !== "undefined" && LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var msg = function (t) { var m = $("msg"); if (m) m.textContent = t; };

  /* POLY = { pts: [[lon,lat],...], key: "lon0,lat0,lon1,lat1" }  (key מקשר את הפוליגון ל-crop הנוכחי; אם ה-crop מוחלף, הפוליגון מתבטל) */
  var POLY = null, cache = { sig: "", out: null }, drawing = null;

  /* ---------- רסטר + Marching Squares ---------- */
  function simplify(pts, tol) {   // Ramer–Douglas–Peucker איטרטיבי
    var n = pts.length; if (n < 4) return pts;
    var keep = new Uint8Array(n), st = [[0, n - 1]]; keep[0] = keep[n - 1] = 1;
    while (st.length) {
      var s = st.pop(), a = pts[s[0]], b = pts[s[1]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9, mi = -1, md = 0;
      for (var i = s[0] + 1; i < s[1]; i++) { var d = Math.abs((pts[i][0] - a[0]) * dy - (pts[i][1] - a[1]) * dx) / L; if (d > md) { md = d; mi = i; } }
      if (md > tol && mi > 0) { keep[mi] = 1; st.push([s[0], mi], [mi, s[1]]); }
    }
    var o = []; for (var k = 0; k < n; k++) if (keep[k]) o.push(pts[k]);
    return o;
  }
  function sarea(r) { var a = 0; for (var i = 0; i < r.length; i++) { var p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }

  /* שדה סקלרי f (W×H, ערכים 0..255, סף 127.5) -> לולאות קווי מתאר בפיקסלים. ממשק נקי כדי שאפשר לבדוק בנפרד */
  function contours(f, W, H) {
    var T = 127.5, segs = new Map();   // מפתח נקודה -> רשימת נקודות שכנות (רשת קודקודים על צלעות התאים)
    var key = function (t, x, y) { return t + "," + x + "," + y; };
    var pos = {};   // מפתח -> [x,y] אחרי אינטרפולציה
    var at = function (x, y) { return x < 0 || y < 0 || x >= W || y >= H ? 0 : f[y * W + x]; };
    function edgePt(t, x, y) {   // t=0: צלע אופקית בין (x,y) ל-(x+1,y); t=1: אנכית בין (x,y) ל-(x,y+1)
      var k = key(t, x, y); if (pos[k]) return k;
      var a = at(x, y), b = t ? at(x, y + 1) : at(x + 1, y), u = (T - a) / ((b - a) || 1e-9);
      pos[k] = t ? [x, y + u] : [x + u, y]; return k;
    }
    function link(a, b) { if (a == b) return; (segs.get(a) || segs.set(a, []).get(a)).push(b); (segs.get(b) || segs.set(b, []).get(b)).push(a); }
    for (var y = -1; y < H; y++) for (var x = -1; x < W; x++) {
      var v0 = at(x, y) > T, v1 = at(x + 1, y) > T, v2 = at(x + 1, y + 1) > T, v3 = at(x, y + 1) > T, c = (v0 ? 1 : 0) | (v1 ? 2 : 0) | (v2 ? 4 : 0) | (v3 ? 8 : 0);
      if (c == 0 || c == 15) continue;
      var T0 = function () { return edgePt(0, x, y); }, R1 = function () { return edgePt(1, x + 1, y); }, B2 = function () { return edgePt(0, x, y + 1); }, L3 = function () { return edgePt(1, x, y); };
      switch (c) {
        case 1: case 14: link(T0(), L3()); break;
        case 2: case 13: link(T0(), R1()); break;
        case 3: case 12: link(L3(), R1()); break;
        case 4: case 11: link(R1(), B2()); break;
        case 6: case 9: link(T0(), B2()); break;
        case 7: case 8: link(L3(), B2()); break;
        case 5: link(T0(), R1()); link(L3(), B2()); break;     // אוכף: מפרידים
        case 10: link(T0(), L3()); link(R1(), B2()); break;
      }
    }
    var seen = new Set(), loops = [];
    segs.forEach(function (_, start) {
      if (seen.has(start)) return;
      var loop = [], cur = start, prev = null, guard = 0;
      while (cur != null && !seen.has(cur) && guard++ < 4e6) {
        seen.add(cur); loop.push(pos[cur]);
        var nb = segs.get(cur), nx = null;
        for (var i = 0; i < nb.length; i++) if (nb[i] != prev && !seen.has(nb[i])) { nx = nb[i]; break; }
        prev = cur; cur = nx;
      }
      if (loop.length > 3) loops.push(loop);
    });
    return loops;
  }

  function rasterClip(rings, poly, rect) {
    var lon0 = rect[0], lat0 = rect[1], lon1 = rect[2], lat1 = rect[3], dlon = lon1 - lon0, dlat = lat1 - lat0;
    var k = Math.cos(((lat0 + lat1) / 2) * Math.PI / 180), M = 1100, W, H;
    if (dlon * k >= dlat) { W = M; H = Math.max(8, Math.ceil(M * dlat / (dlon * k))); } else { H = M; W = Math.max(8, Math.ceil(M * dlon * k / dlat)); }
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d", { willReadFrequently: true }), px = function (p) { return [(p[0] - lon0) / dlon * W, (lat1 - p[1]) / dlat * H]; };
    g.fillStyle = "#000";
    rings.forEach(function (r) { g.beginPath(); r.forEach(function (p, i) { var q = px(p); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fill(); });
    g.globalCompositeOperation = "destination-in";
    g.beginPath(); poly.forEach(function (p, i) { var q = px(p); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fill();
    var d = g.getImageData(0, 0, W, H).data, f = new Float32Array(W * H);
    for (var i = 0; i < f.length; i++) f[i] = d[i * 4 + 3];
    var out = [];
    contours(f, W, H).forEach(function (L) {
      var s = simplify(L, 0.7);
      // מלמדים רק קווי מתאר חיצוניים (חורים ואיים זעירים נזרקים)
      if (s.length < 4 || Math.abs(sarea(s)) < 6) return;
      out.push(s.map(function (p) { return [lon0 + p[0] / W * dlon, lat1 - p[1] / H * dlat]; }));
    });
    // נשארים רק קווי המתאר החיצוניים: עומק הקינון (כמה לולאות מכילות אותה) חייב להיות זוגי. חורים ואיים בתוך חורים נבדקים כך
    if (out.length > 1) {
      var inside = function (pt, r) { var c = false; for (var i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > pt[1]) != (r[j][1] > pt[1]) && pt[0] < (r[j][0] - r[i][0]) * (pt[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
      out = out.filter(function (r, i) { var depth = 0; out.forEach(function (o, j) { if (j != i && inside(r[0], o)) depth++; }); return depth % 2 == 0; });
    }
    return out;
  }

  /* הנקודה שהקוד הראשי קורא לה (בסוף clipAll). עם מטמון כי pick() נקראת הרבה פעמים */
  function polyCrop(rings) {
    try {
      if (!POLY || typeof crop == "undefined" || !crop || crop.join(",") != POLY.key || !rings.length) return rings;
      var sig = POLY.key + "|" + POLY.n + "|" + rings.map(function (r) { return r.length + ":" + r[0].join() + ":" + r[r.length - 1].join(); }).join("|");
      if (cache.sig == sig) return cache.out;
      var out = rasterClip(rings, POLY.pts, crop);
      cache = { sig: sig, out: out.length ? out : rings };
      return cache.out;
    } catch (e) { console.warn("cropfree", e); return rings; }
  }

  /* ---------- ציור על המפה ---------- */
  var S_ = function () { return typeof S != "undefined" ? S : 6.5; };
  function toScreen(p) { var q = toMM(p[0], p[1]); return [260 + q[0] * S_(), 260 - q[1] * S_()]; }
  function hookDrawMap() {
    var orig = drawMap;
    drawMap = function () {
      var r = orig.apply(this, arguments);
      try {
        var pts = drawing ? drawing.pts : (POLY && crop && crop.join(",") == POLY.key ? POLY.pts : null);
        if (pts && pts.length > 1) {
          mx.save(); mx.strokeStyle = "#e11d48"; mx.lineWidth = 2; mx.setLineDash([6, 4]); mx.fillStyle = "rgba(225,29,72,.10)"; mx.globalAlpha = 1; mx.beginPath();
          pts.forEach(function (p, i) { var q = toScreen(p); if (i) mx.lineTo(q[0], q[1]); else mx.moveTo(q[0], q[1]); });
          if (!drawing) { mx.closePath(); mx.fill(); }
          mx.stroke(); mx.restore();
        }
      } catch (e) {}
      return r;
    };
  }
  function lonlat(e) { var r = mc.getBoundingClientRect(), f = 520 / r.width, X = (e.clientX - r.left) * f, Y = (e.clientY - r.top) * f; return fromMM((X - 260) / S_(), -(Y - 260) / S_()); }
  function sdist(a, b) { var p = toScreen(a), q = toScreen(b); return Math.hypot(p[0] - q[0], p[1] - q[1]); }

  function start() {
    if (drawing) return;
    drawing = { pts: [], down: false, moved: false };
    mc.style.cursor = "crosshair"; mc.style.touchAction = "none";
    $("cfdone").style.display = ""; $("cfcancel").style.display = ""; $("cfb").style.display = "none";
    msg(Lx("שרטטו על המפה: גררו לציור חופשי או לחצו להוספת קודקודים. ללחוץ 'סיום' (או לחיצה כפולה) לחיתוך.", "Draw on the map: drag for freehand or click to add corners. Press Done (or double-click) to crop."));
    try { drawMap(); } catch (e) {}
  }
  function stop() {
    drawing = null; mc.style.cursor = ""; mc.style.touchAction = "";
    $("cfdone").style.display = "none"; $("cfcancel").style.display = "none"; $("cfb").style.display = "";
    try { drawMap(); } catch (e) {}
  }
  function finish() {
    if (!drawing) return;
    var pts = drawing.pts.slice();
    // מוחקים נקודה כפולה מסוף לחיצה כפולה
    while (pts.length > 1 && sdist(pts[pts.length - 1], pts[pts.length - 2]) < 2) pts.pop();
    if (pts.length < 3) { msg(Lx("צריך לפחות 3 נקודות", "At least 3 points are needed")); return; }
    var lo = pts.map(function (p) { return p[0]; }), la = pts.map(function (p) { return p[1]; });
    var rect = [Math.min.apply(null, lo), Math.min.apply(null, la), Math.max.apply(null, lo), Math.max.apply(null, la)];
    if (rect[2] - rect[0] < 1e-4 || rect[3] - rect[1] < 1e-4) { msg(Lx("הצורה קטנה מדי", "The shape is too small")); return; }
    stop();
    setPolygon(pts, rect);
  }
  function setPolygon(pts, rect) {
    POLY = { pts: pts, key: rect.join(","), n: (POLY ? POLY.n : 0) + 1 };
    crop = rect.slice(); cache.sig = "";
    fit(); update();
    msg(Lx("הנוף נחתך לצורה שציירתם (" + pts.length + " נקודות). 'בטל חיתוך' מחזיר את כל המדינה.", "Cropped to your shape (" + pts.length + " points). 'Cancel crop' brings back the whole country."));
  }

  function onDown(e) {
    if (!drawing) return; e.stopImmediatePropagation(); e.preventDefault();
    drawing.down = true; drawing.moved = false; drawing.last = [e.clientX, e.clientY];
    try { mc.setPointerCapture(e.pointerId); } catch (x) {}
  }
  function onMove(e) {
    if (!drawing || !drawing.down) return; e.stopImmediatePropagation();
    if (Math.hypot(e.clientX - drawing.last[0], e.clientY - drawing.last[1]) < 7) return;   // דגימת ציור חופשי, לא כל פיקסל
    drawing.last = [e.clientX, e.clientY]; drawing.moved = true; drawing.pts.push(lonlat(e)); drawMap();
  }
  function onUp(e) {
    if (!drawing) return; e.stopImmediatePropagation(); drawing.down = false;
    if (!drawing.moved) { drawing.pts.push(lonlat(e)); drawMap(); }   // לחיצה: קודקוד
  }
  function onDbl(e) { if (drawing) { e.stopImmediatePropagation(); e.preventDefault(); finish(); } }
  function onKey(e) { if (!drawing) return; if (e.key == "Enter") finish(); else if (e.key == "Escape") stop(); }

  function buildUI() {
    var rgx = $("rgx"); if (!rgx || $("cfb")) return;
    var mk = function (id, t, hide) { var b = document.createElement("button"); b.type = "button"; b.id = id; b.textContent = t; if (hide) b.style.display = "none"; return b; };
    var b1 = mk("cfb", Lx("✏️ חיתוך חופשי", "✏️ Freehand crop")), b2 = mk("cfdone", Lx("✔ סיום", "✔ Done"), 1), b3 = mk("cfcancel", Lx("✕ ביטול ציור", "✕ Cancel drawing"), 1);
    rgx.parentNode.style.flexWrap = "wrap"; rgx.parentNode.append(b1, b2, b3);
    b1.onclick = start; b2.onclick = finish; b3.onclick = stop;
    mc.addEventListener("pointerdown", onDown, true); mc.addEventListener("pointermove", onMove, true); mc.addEventListener("pointerup", onUp, true); mc.addEventListener("dblclick", onDbl, true);
    document.addEventListener("keydown", onKey);
    rgx.addEventListener("click", function () { POLY = null; cache.sig = ""; });
  }
  function hookProj() {
    var og = getProj, op = putProj;
    getProj = function () { var o = og.apply(this, arguments); if (POLY && crop && crop.join(",") == POLY.key) o.cpoly = POLY.pts.map(function (p) { return [+p[0].toFixed(4), +p[1].toFixed(4)]; }); return o; };
    putProj = function (o) {
      POLY = o && o.cpoly && o.crop && o.cpoly.length > 2 ? { pts: o.cpoly, key: o.crop.join(","), n: (POLY ? POLY.n : 0) + 1 } : null; cache.sig = "";
      return op.apply(this, arguments);
    };
  }

  function init() {
    if (typeof drawMap != "function" || typeof getProj != "function" || !$("map")) return;
    [hookDrawMap, hookProj, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("cropfree", f.name, e); } });
    window.polyCrop = polyCrop;
    window.cropFreeApi = { setPolygon: setPolygon, rasterClip: rasterClip, contours: contours, simplify: simplify, poly: function () { return POLY; }, start: start, finish: finish, state: function () { return drawing; } };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
