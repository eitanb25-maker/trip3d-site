/* fab.js (v53): הנדסת הדפסה
   1. בדיקת הדפסתיות (walls / text / overhangs): סורקת את המודל, מציינת בעיות במיקום המדויק ומציגה סימונים בתצוגה התלת-ממדית.
   2. חיתוך פאזל: מחלק מודל גדול ל-2 או 4 חלקים עם חיבורי זנב-יונה (dovetail) עבור מדפסות קטנות. כל חלק יוצא כקובץ נפרד.
   3. LED: חריץ לפס LED ותעלת חיווט בתחתית המעמד.
   המודול עוטף את build / scaleFor / prepareFiles / render / getProj / putProj ואינו משנה את הקוד הראשי.
   מבנה הנתונים: P = [{name,color,geoms:[BufferGeometry]}] במילימטרים לפני הסקאלה sc, z כלפי מעלה. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };
  var msg = function (t) { var m = $("msg"); if (m) m.textContent = t; };

  /* מצב המודול. cut: 0 | 2 | 4 ; led: חריץ LED ; ledw: רוחב הפס ; ledm: מרחק החריץ מהקצה ; clr: מרווח (רוחב החיבור) */
  var F = { cut: 0, led: false, ledw: 10, ledm: 4, clr: 0.3, seams: true, exporting: false, only: -1, pieces: null, zc: null, ledNote: "", marks: null, ov: null, found: [] };
  var WALL = 0.8, TEXT = 0.7;   // מינימום קיר / קו אות במ״מ (שתי שכבות של דיזה 0.4)

  /* ============ גיאומטריה בסיסית ============ */
  var soup = function (g) { return (g.index ? g.toNonIndexed() : g).attributes.position.array; };
  var mk = function (arr) { var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arr), 3)); return g; };
  function bounds(P) {
    var b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    P.forEach(function (p) { p.geoms.forEach(function (g) { var a = soup(g); for (var i = 0; i < a.length; i += 3) for (var d = 0; d < 3; d++) { if (a[i + d] < b[d]) b[d] = a[i + d]; if (a[i + d] > b[3 + d]) b[3 + d] = a[i + d]; } }); });
    return b;
  }
  var area2 = function (p) { var a = 0; for (var i = 0; i < p.length; i++) { var q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
  var ccw = function (p) { return area2(p) < 0 ? p.slice().reverse() : p.slice(); };
  /* הזזה פנימה של מצולע קמור (CCW) במרחק d, לפי חיתוך קווי המשיק של הקצוות */
  function inset(poly, d) {
    var n = poly.length, out = [];
    for (var i = 0; i < n; i++) {
      var a = poly[(i + n - 1) % n], b = poly[i], c = poly[(i + 1) % n];
      var e1 = [b[0] - a[0], b[1] - a[1]], e2 = [c[0] - b[0], c[1] - b[1]], l1 = Math.hypot(e1[0], e1[1]) || 1, l2 = Math.hypot(e2[0], e2[1]) || 1;
      var n1 = [-e1[1] / l1, e1[0] / l1], n2 = [-e2[1] / l2, e2[0] / l2], k = Math.max(0.2, 1 + n1[0] * n2[0] + n1[1] * n2[1]);
      out.push([b[0] + d * (n1[0] + n2[0]) / k, b[1] + d * (n1[1] + n2[1]) / k]);
    }
    return out.filter(function (q, i) { var r = out[(i + out.length - 1) % out.length]; return Math.hypot(q[0] - r[0], q[1] - r[1]) > 0.02; });
  }
  /* רדיוס העקמומיות הקטן ביותר של מצולע (בקירוב, לפי המעבר בין שתי צלעות סמוכות). קשתות חדות מדי מכווצות את החריץ */
  function minRadius(p) {
    var n = p.length, best = 1e9, e = function (i) { var a = p[i % n], b = p[(i + 1) % n]; return [b[0] - a[0], b[1] - a[1]]; };
    for (var i = 0; i < n; i++) {
      var u = e(i), v = e(i + 1), lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]), ang = Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]));
      if (ang > 0.02 && ang < 2) best = Math.min(best, (lu + lv) / 2 / ang);   // קשת: אורך קשת / זווית
    }
    return best;
  }
  /* החיתוך הגבוה ביותר של הקו האנכי x עם מצולע: {y, i} כשהחיתוך על הצלע i (בין קודקוד i ל-i+1) */
  function vhit(poly, x) {
    var best = null, n = poly.length;
    for (var i = 0; i < n; i++) {
      var a = poly[i], b = poly[(i + 1) % n];
      if ((a[0] - x) * (b[0] - x) <= 0 && a[0] != b[0]) { var y = a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1]); if (!best || y > best.y) best = { y: y, i: i }; }
    }
    return best;
  }
  var shapeOf = function (pts) { return new THREE.Shape(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); })); };
  var extrude = function (pts, depth, z) { return new THREE.ExtrudeGeometry(shapeOf(pts), { depth: depth, bevelEnabled: false }).translate(0, 0, z || 0); };

  /* ============ 3. חריץ LED בתחתית המעמד ============
     השכבה התחתונה (גובה gd) מורכבת מ"אי" פנימי ומצורת C חיצונית, והחריץ ביניהם (טבעת ברוחב ledw). בגב (y חיובי) נפתחת תעלה
     ברוחב 6 מ״מ אל הקצה עבור הכבל. השכבה העליונה (BH-gd) נשארת מלאה, כך שהאור עובר דרכה כשמדפיסים בחומר שקוף. */
  function ledPatch(P) {
    F.ledNote = "";
    if (!F.led || TOOL != "stand" || (window.mechApi && mechApi.tilted())) return P;
    var bp = P.filter(function (p) { return p.name == "1_base"; })[0];
    if (!bp || bp.geoms.length != 1) return P;
    var BH = +$("bh").value, gd = Math.min(3, BH - 1.2);
    if (!(gd >= 1)) { F.ledNote = Lx("הבסיס דק מדי לחריץ (נדרש עובי 2.2 מ״מ לפחות). הגדילו את גובה הבסיס.", "The base is too thin for a slot (2.2 mm minimum). Increase the base height."); return P; }
    var O = ccw(outline($("shape").value)), bo = inset(O, F.ledm), bi = inset(O, F.ledm + F.ledw);
    if (bi.length < 6 || bo.length < 6 || area2(bi) < 150 || area2(bi) > area2(bo) || minRadius(O) < F.ledm + F.ledw + 0.5) { F.ledNote = Lx("הבסיס קטן מדי לפס ברוחב הזה. הקטינו את רוחב הפס או את המרחק מהקצה.", "The base is too small for this strip width. Reduce the width or the edge margin."); return P; }
    var wc = 6, L = vhit(O, -wc / 2), R = vhit(O, wc / 2), Lb = vhit(bo, -wc / 2), Rb = vhit(bo, wc / 2);
    if (!L || !R || !Lb || !Rb) { F.ledNote = Lx("לא ניתן לפתוח תעלת חיווט בצורה הזאת.", "Can't open a wiring channel in this shape."); return P; }
    var n = O.length, m = bo.length, C = [[-wc / 2, L.y]], k, steps = (R.i - L.i + n) % n || n;
    for (k = 1; k <= steps; k++) C.push(O[(L.i + k) % n]);
    C.push([wc / 2, R.y], [wc / 2, Rb.y]);
    var st2 = (Rb.i - Lb.i + m) % m || m;
    for (k = 0; k < st2; k++) C.push(bo[(Rb.i - k + m) % m]);
    C.push([-wc / 2, Lb.y]);
    var old = bp.geoms[0];
    try {
      bp.geoms = [extrude(O, BH - gd, gd), extrude(C, gd, 0), extrude(bi, gd, 0)];
      if (old.dispose) old.dispose();
      F.ledNote = Lx("חריץ " + F.ledw + " מ״מ בעומק " + gd + " מ״מ, ותעלת כבל בגב המעמד. הדפיסו את הבסיס בחומר שקוף או לבן כדי שהאור יעבור.", F.ledw + " mm slot, " + gd + " mm deep, with a cable channel at the back. Print the base in translucent or white filament to let the light through.");
    } catch (e) { console.warn("fab led", e); F.ledNote = Lx("בניית החריץ נכשלה", "Building the slot failed"); }
    return P;
  }

  /* ============ 2. חיתוך פאזל ============ */
  /* חותך רשת משולשים (מערך מיקומים) במישור ושומר את הצד nx*x+ny*y<=d. סוגר את החתך בכיסוי. מחזיר מערך מיקומים או null */
  function clipHalf(pos, nx, ny, d) {
    var ln = Math.hypot(nx, ny); nx /= ln; ny /= ln; d /= ln;
    var out = [], segs = [], EPS = 1e-5, i, k;
    var less = function (a, b) { return a[0] != b[0] ? a[0] < b[0] : a[1] != b[1] ? a[1] < b[1] : a[2] < b[2]; };
    function isect(a, sa, b, sb) {   // סדר קנוני של הקצוות, כדי ששני משולשים שכנים יחשבו בדיוק אותה נקודה
      if (!less(a, b)) { var t = a; a = b; b = t; t = sa; sa = sb; sb = t; }
      if (Math.abs(sa) <= EPS * 10) return a;   // נקודה כמעט על המישור: מצמידים לקודקוד כדי לא ליצור קצוות זעירים
      if (Math.abs(sb) <= EPS * 10) return b;
      var u = sa / (sa - sb);
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    }
    for (i = 0; i < pos.length; i += 9) {
      var S = [nx * pos[i] + ny * pos[i + 1] - d, nx * pos[i + 3] + ny * pos[i + 4] - d, nx * pos[i + 6] + ny * pos[i + 7] - d];
      if (S[0] <= EPS && S[1] <= EPS && S[2] <= EPS) { for (k = 0; k < 9; k++) out.push(pos[i + k]); continue; }
      if (S[0] > EPS && S[1] > EPS && S[2] > EPS) continue;
      var V = [[pos[i], pos[i + 1], pos[i + 2]], [pos[i + 3], pos[i + 4], pos[i + 5]], [pos[i + 6], pos[i + 7], pos[i + 8]]], poly = [], ex = null, en = null;
      for (k = 0; k < 3; k++) {
        var a = V[k], b = V[(k + 1) % 3], ia = S[k] <= EPS, ib = S[(k + 1) % 3] <= EPS;
        if (ia) poly.push(a);
        if (ia != ib) { var p = isect(a, S[k], b, S[(k + 1) % 3]); poly.push(p); if (ia) ex = p; else en = p; }
      }
      for (k = 1; k + 1 < poly.length; k++) {
        var A = poly[0], B = poly[k], Cc = poly[k + 1], ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2];
        var same = function (X, Y) { return Math.abs(X[0] - Y[0]) + Math.abs(X[1] - Y[1]) + Math.abs(X[2] - Y[2]) < 1e-6; };
        if (same(A, B) || same(B, Cc) || same(A, Cc)) continue;   // משולש עם קודקודים חופפים; משולש על קו ישר נשמר כי הוא משמר את הטופולוגיה
        out.push(A[0], A[1], A[2], B[0], B[1], B[2], Cc[0], Cc[1], Cc[2]);
      }
      if (ex && en && (Math.abs(ex[0] - en[0]) > 1e-9 || Math.abs(ex[1] - en[1]) > 1e-9 || Math.abs(ex[2] - en[2]) > 1e-9)) segs.push(en, ex);   // en→ex: כיוון הפוך לשפת המשולש, כך שהכיסוי סוגר את הרשת
    }
    if (!out.length) return null;
    return cap(out, segs, nx, ny);
  }
  function cap(out, segs, nx, ny) {
    var start0 = out.length;
    var key = function (p) { return Math.round(p[0] * 2e3) + "," + Math.round(p[1] * 2e3) + "," + Math.round(p[2] * 2e3); }, start = new Map(), used = [], loops = [], i;
    for (i = 0; i < segs.length; i += 2) { var kk = key(segs[i]); if (!start.has(kk)) start.set(kk, []); start.get(kk).push(i); }
    for (i = 0; i < segs.length; i += 2) {
      if (used[i]) continue;
      var loop = [], cur = i, guard = 0;
      while (cur != null && !used[cur] && guard++ < 200000) {
        used[cur] = true; loop.push(segs[cur]);
        var nxt = start.get(key(segs[cur + 1])); cur = null;
        if (nxt) for (var q = 0; q < nxt.length; q++) if (!used[nxt[q]]) { cur = nxt[q]; break; }
      }
      if (loop.length >= 3) loops.push(loop);
    }
    if (!loops.length) return out;
    var ux = -ny, uy = nx;
    var P2 = loops.map(function (l) { return l.map(function (p) { return new THREE.Vector2(p[0] * ux + p[1] * uy, p[2]); }); });
    var inside = function (pt, poly) { var c = false; for (var a = 0, b = poly.length - 1; a < poly.length; b = a++) if ((poly[a].y > pt.y) != (poly[b].y > pt.y) && pt.x < (poly[b].x - poly[a].x) * (pt.y - poly[a].y) / (poly[b].y - poly[a].y) + poly[a].x) c = !c; return c; };
    var ar = P2.map(function (p) { return Math.abs(THREE.ShapeUtils.area(p)); });
    var depth = P2.map(function (p, a) { var c = 0; P2.forEach(function (q, b) { if (a != b && ar[b] > ar[a] && inside(p[0], q)) c++; }); return c; });
    P2.forEach(function (p, a) {
      if (depth[a] % 2) return;   // חור: ייכלל עם החיצוני שלו
      var holes = [];
      P2.forEach(function (q, b) { if (depth[b] == depth[a] + 1 && inside(q[0], p)) holes.push(b); });
      var pts3 = loops[a].slice(), pts2 = p.slice();
      holes.forEach(function (b) { pts3 = pts3.concat(loops[b]); pts2 = pts2.concat(P2[b]); });
      var faces; try { faces = THREE.ShapeUtils.triangulateShape(p.slice(), holes.map(function (b) { return P2[b].slice(); })); } catch (e) { faces = []; }
      // כיוון הכיסוי נקבע לכל הצורה יחד לפי סכום הנורמלים (משולש מנוון בקצה ישר אינו יכול להכריע לבדו)
      var tri = [], sum = 0, de = new Set(), off = 0;
      [p].concat(holes.map(function (b) { return P2[b]; })).forEach(function (lp) { for (var q = 0; q < lp.length; q++) de.add((off + q) + "|" + (off + (q + 1) % lp.length)); off += lp.length; });
      faces.forEach(function (f) {
        var A = pts3[f[0]], B = pts3[f[1]], C = pts3[f[2]]; if (!A || !B || !C) return;
        var cx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]), cy = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]), cz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
        var dir = 0;
        if (Math.hypot(cx, cy, cz) < 2e-3) {   // משולש מנוון (נקודות על קו ישר): הכיוון נקבע לפי כיוון שפת הלולאה
          [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) { if (de.has(e[0] + "|" + e[1])) dir++; else if (de.has(e[1] + "|" + e[0])) dir--; });
          tri.push({ t: [A, B, C], f: f, deg: dir < 0 ? -1 : 1, dec: dir != 0 });
        } else { sum += cx * nx + cy * ny; tri.push({ t: [A, B, C], f: f, deg: 0 }); }
      });
      // משולש מנוון שהכיוון שלו לא נקבע מהלולאה: מתאימים אותו לשכנים (קצה זהה בכיוון זהה אצל שכן = צריך להפוך)
      var ne = new Set();
      tri.forEach(function (o) { if (o.deg) return; var fl = sum < 0, f = o.f, v = fl ? [f[0], f[2], f[1]] : f; ne.add(v[0] + "|" + v[1]); ne.add(v[1] + "|" + v[2]); ne.add(v[2] + "|" + v[0]); });
      tri.forEach(function (o) {
        if (o.deg && !o.dec) { var sc = 0, f = o.f; [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) { if (ne.has(e[1] + "|" + e[0])) sc++; else if (ne.has(e[0] + "|" + e[1])) sc--; }); if (sc) o.deg = sc < 0 ? -1 : 1; }
        var t = o.t, flip = o.deg ? o.deg < 0 : sum < 0; if (!flip) out.push(t[0][0], t[0][1], t[0][2], t[1][0], t[1][1], t[1][2], t[2][0], t[2][1], t[2][2]); else out.push(t[0][0], t[0][1], t[0][2], t[2][0], t[2][1], t[2][2], t[1][0], t[1][1], t[1][2]); });
    });
    fixSlivers(out, start0);
    return out;
  }
  /* משולשי כיסוי מנוונים (נקודות על קו ישר) מקבלים כיוון לפי שאר הרשת: קצה זהה בכיוון זהה אצל משולש אחר פירושו שצריך להפוך */
  function fixSlivers(out, from) {
    var k = function (i) { return Math.round(out[i] * 1e3) + "," + Math.round(out[i + 1] * 1e3) + "," + Math.round(out[i + 2] * 1e3); }, deg = [], i, e, cnt = null;
    for (i = from; i < out.length; i += 9) {
      var ux = out[i + 3] - out[i], uy = out[i + 4] - out[i + 1], uz = out[i + 5] - out[i + 2], vx = out[i + 6] - out[i], vy = out[i + 7] - out[i + 1], vz = out[i + 8] - out[i + 2];
      if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 2e-3) deg.push(i);
    }
    if (!deg.length) return;
    cnt = new Map();
    for (i = 0; i < out.length; i += 9) for (e = 0; e < 3; e++) { var key = k(i + e * 3) + ">" + k(i + ((e + 1) % 3) * 3); cnt.set(key, (cnt.get(key) || 0) + 1); }
    var drop = [];
    deg.forEach(function (i) {   // בוחרים בין להשאיר / להפוך / להסיר לפי מספר הקצוות שאינם מאוזנים (כניסה ויציאה) בשלושת הקצוות שלו
      var ks = [k(i), k(i + 3), k(i + 6)], bal = function (a, b, d) { return (cnt.get(a + ">" + b) || 0) - (cnt.get(b + ">" + a) || 0) + d; };
      var score = function (mode) {   // mode 0 = להשאיר, 1 = להפוך, 2 = להסיר
        var n = 0;
        for (var e = 0; e < 3; e++) {
          var a = ks[e], b = ks[(e + 1) % 3]; if (a == b) continue;
          var d = mode == 0 ? 0 : mode == 1 ? -2 : -1;   // הפיכה מזיזה שני צעדים (מ-a>b ל-b>a), הסרה צעד אחד
          if (bal(a, b, d) != 0) n++;
        }
        return n;
      };
      var s0 = score(0), s1 = score(1), s2 = score(2);
      if (s1 < s0 && s1 <= s2) { for (var t = 0; t < 3; t++) { var tmp = out[i + 3 + t]; out[i + 3 + t] = out[i + 6 + t]; out[i + 6 + t] = tmp; } }
      else if (s2 < s0) drop.push(i);
    });
    for (var d = drop.length - 1; d >= 0; d--) out.splice(drop[d], 9);
  }
  /* חיתוך לפי רשימת חצאי-מישורים [a,b,d] במערכת (s,l) סביב נקודה O עם כיוונים dir ו-lat */
  function clipRegion(geoms, sp, planes) {
    var res = [];
    geoms.forEach(function (g) {
      var pos = Array.from(soup(g));
      for (var i = 0; i < planes.length && pos; i++) {
        var a = planes[i][0], b = planes[i][1], nx = a * sp.dir[0] + b * sp.lat[0], ny = a * sp.dir[1] + b * sp.lat[1];
        pos = clipHalf(pos, nx, ny, planes[i][2] + nx * sp.O[0] + ny * sp.O[1]);
      }
      if (pos && pos.length >= 9) { fixSlivers(pos, 0); if (pos.length >= 9) res.push(mk(pos)); }
    });
    return res;
  }
  function tabDims(sp) { var m = (sp.w1 - sp.w0) / sp.t; return m; }
  /* A: הצד שלפני המישור + שלוחות זנב-יונה אל הצד השני. B: הצד השני בלי הכיס של השלוחות (עם מרווח) */
  function splitGeoms(geoms, sp) {
    var m = tabDims(sp), c = sp.tabs, w0 = sp.w0, t = sp.t, cl = sp.clr, A = clipRegion(geoms, sp, [[1, 0, 0]]), B = [];
    c.forEach(function (ci) { A = A.concat(clipRegion(geoms, sp, [[-1, 0, 0], [1, 0, t], [-m, 1, ci + w0], [-m, -1, -ci + w0]])); });
    var te = t + cl, w0e = w0 + cl, base = [[-1, 0, 0], [1, 0, te]];
    B = B.concat(clipRegion(geoms, sp, [[-1, 0, -te]]));
    if (!c.length) B = B.concat(clipRegion(geoms, sp, base));
    else {
      B = B.concat(clipRegion(geoms, sp, base.concat([[m, 1, c[0] - w0e]])));
      for (var i = 0; i + 1 < c.length; i++) B = B.concat(clipRegion(geoms, sp, base.concat([[m, -1, -(c[i] + w0e)], [m, 1, c[i + 1] - w0e]])));
      B = B.concat(clipRegion(geoms, sp, base.concat([[m, -1, -(c[c.length - 1] + w0e)]])));
    }
    return { A: A, B: B };
  }
  /* תכנית החיתוך לפי המימדים. ext: גבולות המודל */
  function planFor(b) {
    var cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, ex = b[3] - b[0], ey = b[4] - b[1], clr = F.clr;
    var sp = function (dir, O, ext, offs) {
      var lat = [-dir[1], dir[0]], t = Math.max(4, Math.min(8, ext / 10));
      var tabs = ext < 26 ? [0] : offs.map(function (o) { return o * ext; }).sort(function (p, q) { return p - q; });
      return { dir: dir, lat: lat, O: O, tabs: tabs, t: t, w0: t * 0.4, w1: t * 0.7, clr: clr };
    };
    if (F.cut == 4) {
      var s1 = sp([1, 0], [cx, cy], ey, [-0.25, 0.25]);
      var s2 = [sp([0, 1], [cx, cy], ex, [-0.25]), sp([0, 1], [cx, cy], ex, [0.25])];
      // לצד שמאל (A) רק שלוחה אחת ב-x שלילי, ולצד ימין (B) ב-x חיובי; הכיוון lat של dir=[0,1] הוא [-1,0], לכן הסימן מתהפך
      s2[0].tabs = ex < 26 ? [0] : [0.25 * ex]; s2[1].tabs = ex < 26 ? [0] : [-0.25 * ex];
      return { n: 4, s1: s1, s2: s2 };
    }
    if (ex >= ey) return { n: 2, s1: sp([1, 0], [cx, cy], ey, [-0.25, 0.25]) };
    return { n: 2, s1: sp([0, 1], [cx, cy], ex, [0.25, -0.25]) };
  }
  function cutAll(P) {
    var plan = planFor(bounds(P));
    var split = function (parts, sp) {
      var A = [], B = [];
      parts.forEach(function (p) { var r = splitGeoms(p.geoms, sp); A.push(Object.assign({}, p, { geoms: r.A })); B.push(Object.assign({}, p, { geoms: r.B })); });
      return [A, B];
    };
    var l1 = split(P, plan.s1), pieces = plan.n == 2 ? l1 : split(l1[0], plan.s2[0]).concat(split(l1[1], plan.s2[1]));
    pieces = pieces.map(function (pc) {
      pc = pc.filter(function (p) { return p.geoms.length; });
      var b = bounds(pc), dx = -(b[0] + b[3]) / 2, dy = -(b[1] + b[4]) / 2;
      pc.forEach(function (p) { p.geoms.forEach(function (g) { g.translate(dx, dy, 0); }); });
      return pc;
    });
    return { pieces: pieces, plan: plan };
  }
  /* סקאלה כך שכל חלק ייכנס לשולחן ההדפסה: מרחיבים זמנית את גודל השולחן ביחס לחלוקה */
  function cutScale(P, so) {
    var z0 = so(P), b = bounds(P), w = (z0.w * 10) / z0.sc, h = (z0.h * 10) / z0.sc, m = Math.max(w, h), pm = F.cut == 4 ? m / 2 : (w >= h ? Math.max(w / 2, h) : Math.max(h / 2, w));
    var bed = $("bed"), old = bed.value, f = m / pm, v = (+old - 10) * f + 10, opt = document.createElement("option");
    opt.value = v; bed.appendChild(opt); bed.value = v;
    var z1; try { z1 = so(P); } finally { bed.removeChild(opt); bed.value = old; }
    z1.pieceMax = pm * z1.sc / 10; z1.full = [w * z1.sc / 10, h * z1.sc / 10];
    return z1;
  }

  /* ============ 1. בדיקת הדפסתיות ============ */
  function dist(fg, W, H) {   // מרחק (בתאים) מכל תא ב-fg אל התא הקרוב שאינו ב-fg
    var D = new Float32Array(W * H), INF = 1e9, x, y, i, r2 = Math.SQRT2;
    for (i = 0; i < D.length; i++) D[i] = fg[i] ? INF : 0;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) { i = y * W + x; if (!D[i]) continue; var v = D[i]; if (x) v = Math.min(v, D[i - 1] + 1); if (y) { v = Math.min(v, D[i - W] + 1); if (x) v = Math.min(v, D[i - W - 1] + r2); if (x < W - 1) v = Math.min(v, D[i - W + 1] + r2); } D[i] = v; }
    for (y = H - 1; y >= 0; y--) for (x = W - 1; x >= 0; x--) { i = y * W + x; if (!D[i]) continue; var u = D[i]; if (x < W - 1) u = Math.min(u, D[i + 1] + 1); if (y < H - 1) { u = Math.min(u, D[i + W] + 1); if (x < W - 1) u = Math.min(u, D[i + W + 1] + r2); if (x) u = Math.min(u, D[i + W - 1] + r2); } D[i] = u; }
    return D;
  }
  function clusters(mask, W, H, cs, minArea, x0, y0) {
    var seen = new Uint8Array(W * H), out = [], st = [];
    for (var s = 0; s < mask.length; s++) {
      if (!mask[s] || seen[s]) continue;
      var n = 0, sx = 0, sy = 0; st.length = 0; st.push(s); seen[s] = 1;
      while (st.length) {
        var c = st.pop(), cx = c % W, cy = (c - cx) / W; n++; sx += cx; sy += cy;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; var q = ny * W + nx; if (mask[q] && !seen[q]) { seen[q] = 1; st.push(q); } }
      }
      if (n * cs * cs >= minArea) out.push({ area: n * cs * cs, x: x0 + (sx / n + 0.5) * cs, y: y0 + (sy / n + 0.5) * cs });
    }
    return out;
  }
  var nmOf = function (k) { try { return (isEn() ? NME : NMH)[k] || k; } catch (e) { return k; } };
  var pname = function (n) { return n.replace(/^\d+[a-z]?_/, "").replace(/_\d+$/, ""); };

  function analyse(P, sc) {
    var res = { issues: [], skipped: false }, tris = 0;
    P.forEach(function (p) { p.geoms.forEach(function (g) { tris += (g.index ? g.index.count : g.attributes.position.count) / 3; }); });
    if (tris > 600000) { res.skipped = true; return res; }
    var b = bounds(P);
    var groups = {};
    P.forEach(function (p) { if (p.name == "1_base") return; (groups[p.name] = groups[p.name] || []).push(p); });
    // --- קירות דקים וכיתוב קטן: הצללית מלמעלה של כל חלק, פתיחה מורפולוגית (שחיקה והרחבה) ברדיוס חצי המינימום
    Object.keys(groups).forEach(function (name) {
      var isText = /text|flag|qr/.test(name) && !/plate/.test(name), minW = isText ? TEXT : WALL, gb = bounds(groups[name]);
      if (gb[0] > gb[3]) return;
      var gx0 = gb[0] * sc - 1, gy0 = gb[1] * sc - 1, gw = (gb[3] - gb[0]) * sc + 2, gh = (gb[4] - gb[1]) * sc + 2;
      var cs = Math.max(isText ? 0.1 : 0.2, gw / 900, gh / 900), W = Math.ceil(gw / cs) + 1, H = Math.ceil(gh / cs) + 1, X0 = gx0, Y0 = gy0, r = minW / 2 / cs, mask = new Uint8Array(W * H);
      res.cell = Math.max(res.cell || 0, cs);
      groups[name].forEach(function (p) {
        p.geoms.forEach(function (g) {
          var a = soup(g);
          for (var i = 0; i < a.length; i += 9) {
            var x1 = a[i] * sc, y1 = a[i + 1] * sc, x2 = a[i + 3] * sc, y2 = a[i + 4] * sc, x3 = a[i + 6] * sc, y3 = a[i + 7] * sc, den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
            if (Math.abs(den) < 1e-9) continue;
            var ix0 = Math.max(0, Math.floor((Math.min(x1, x2, x3) - X0) / cs)), ix1 = Math.min(W - 1, Math.floor((Math.max(x1, x2, x3) - X0) / cs)), iy0 = Math.max(0, Math.floor((Math.min(y1, y2, y3) - Y0) / cs)), iy1 = Math.min(H - 1, Math.floor((Math.max(y1, y2, y3) - Y0) / cs));
            for (var iy = iy0; iy <= iy1; iy++) for (var ix = ix0; ix <= ix1; ix++) {
              var X = X0 + (ix + 0.5) * cs, Y = Y0 + (iy + 0.5) * cs, w0 = ((y2 - y3) * (X - x3) + (x3 - x2) * (Y - y3)) / den, w1 = ((y3 - y1) * (X - x3) + (x1 - x3) * (Y - y3)) / den, w2 = 1 - w0 - w1;
              if (w0 >= -0.05 && w1 >= -0.05 && w2 >= -0.05) mask[iy * W + ix] = 1;
            }
          }
        });
      });
      var d1 = dist(mask, W, H), E = new Uint8Array(W * H), i;
      for (i = 0; i < E.length; i++) E[i] = d1[i] > r + 0.5 ? 1 : 0;
      var notE = new Uint8Array(W * H); for (i = 0; i < notE.length; i++) notE[i] = E[i] ? 0 : 1;
      var d2 = dist(notE, W, H), thin = new Uint8Array(W * H);
      for (i = 0; i < thin.length; i++) thin[i] = mask[i] && !E[i] && d2[i] > r + 1.2 ? 1 : 0;
      clusters(thin, W, H, cs, 0.5, X0, Y0).sort(function (p, q) { return q.area - p.area; }).slice(0, 6).forEach(function (c) {
        res.issues.push({ kind: isText ? "text" : "wall", part: name, x: c.x / sc, y: c.y / sc, area: c.area, min: minW });
      });
    });
    // --- בליטות תלויות באוויר (overhangs) שדורשות תמיכות: משולשים הפונים למטה בשיפוע חד בלי משהו מתחתם
    var X0 = b[0] * sc, Y0 = b[1] * sc, gz = b[2] * sc, cs2 = 0.5, W2 = Math.ceil((b[3] - b[0]) * sc / cs2) + 2, H2 = Math.ceil((b[4] - b[1]) * sc / cs2) + 2, Hf = new Map(), D = [];
    P.forEach(function (p) {
      p.geoms.forEach(function (g) {
        var a = soup(g);
        for (var i = 0; i < a.length; i += 9) {
          var ux = a[i + 3] - a[i], uy = a[i + 4] - a[i + 1], uz = a[i + 5] - a[i + 2], vx = a[i + 6] - a[i], vy = a[i + 7] - a[i + 1], vz = a[i + 8] - a[i + 2];
          var cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, l = Math.hypot(cx, cy, cz); if (l < 1e-9) continue;
          var nz = cz / l, zl = Math.min(a[i + 2], a[i + 5], a[i + 8]) * sc, zh = Math.max(a[i + 2], a[i + 5], a[i + 8]) * sc;
          if (nz > 0.3) {
            var x1 = a[i] * sc, y1 = a[i + 1] * sc, x2 = a[i + 3] * sc, y2 = a[i + 4] * sc, x3 = a[i + 6] * sc, y3 = a[i + 7] * sc, den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
            if (Math.abs(den) < 1e-9) continue;
            var pz = (a[i + 2] + a[i + 5] + a[i + 8]) / 3 * sc, zr = Math.round(pz * 5) / 5;
            var jx0 = Math.max(0, Math.floor((Math.min(x1, x2, x3) - X0) / cs2)), jx1 = Math.min(W2 - 1, Math.floor((Math.max(x1, x2, x3) - X0) / cs2)), jy0 = Math.max(0, Math.floor((Math.min(y1, y2, y3) - Y0) / cs2)), jy1 = Math.min(H2 - 1, Math.floor((Math.max(y1, y2, y3) - Y0) / cs2));
            for (var jy = jy0; jy <= jy1; jy++) for (var jx = jx0; jx <= jx1; jx++) {
              var X = X0 + (jx + 0.5) * cs2, Y = Y0 + (jy + 0.5) * cs2, w0 = ((y2 - y3) * (X - x3) + (x3 - x2) * (Y - y3)) / den, w1 = ((y3 - y1) * (X - x3) + (x1 - x3) * (Y - y3)) / den, w2 = 1 - w0 - w1;
              if (w0 < -0.1 || w1 < -0.1 || w2 < -0.1) continue;
              var kk = jy * W2 + jx, Lz = Hf.get(kk); if (!Lz) { Lz = []; Hf.set(kk, Lz); } if (Lz.indexOf(zr) < 0) Lz.push(zr);
            }
          } else if (nz < -0.707 && zl > gz + 2.5 && zh > gz + 2.6) D.push([a[i] * sc, a[i + 1] * sc, a[i + 3] * sc, a[i + 4] * sc, a[i + 6] * sc, a[i + 7] * sc, zl, p.name]);
        }
      });
    });
    var om = new Uint8Array(W2 * H2), oa = new Float32Array(W2 * H2), oz = new Float32Array(W2 * H2), opn = [];
    D.forEach(function (d) {   // כל תא שמרכזו בתוך המשולש התלוי נבדק בנפרד, כך שגם מישור גדול משני משולשים נמדד נכון
      var x1 = d[0], y1 = d[1], x2 = d[2], y2 = d[3], x3 = d[4], y3 = d[5], den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
      if (Math.abs(den) < 1e-9) return;
      var jx0 = Math.max(0, Math.floor((Math.min(x1, x2, x3) - X0) / cs2)), jx1 = Math.min(W2 - 1, Math.floor((Math.max(x1, x2, x3) - X0) / cs2)), jy0 = Math.max(0, Math.floor((Math.min(y1, y2, y3) - Y0) / cs2)), jy1 = Math.min(H2 - 1, Math.floor((Math.max(y1, y2, y3) - Y0) / cs2));
      for (var jy = jy0; jy <= jy1; jy++) for (var jx = jx0; jx <= jx1; jx++) {
        var X = X0 + (jx + 0.5) * cs2, Y = Y0 + (jy + 0.5) * cs2, w0 = ((y2 - y3) * (X - x3) + (x3 - x2) * (Y - y3)) / den, w1 = ((y3 - y1) * (X - x3) + (x1 - x3) * (Y - y3)) / den, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        var Lz = Hf.get(jy * W2 + jx);
        if (Lz && Lz.some(function (z) { return z <= d[6] + 0.1 && z >= d[6] - 0.6; })) continue;
        var q = jy * W2 + jx; om[q] = 1; oa[q] = cs2 * cs2; oz[q] = Math.max(oz[q], d[6] - gz); opn[q] = d[7];
      }
    });
    var ob = new Uint8Array(W2 * H2);   // רק תאים עם שטח משמעותי
    for (var q = 0; q < om.length; q++) ob[q] = om[q] ? 1 : 0;
    var cl2 = clusters(ob, W2, H2, cs2, 10, X0, Y0);
    cl2.sort(function (p, qq) { return qq.area - p.area; }).slice(0, 8).forEach(function (c) {
      var jx = Math.floor((c.x - X0) / cs2), jy = Math.floor((c.y - Y0) / cs2), z = 0;
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) z = Math.max(z, oz[(jy + dy) * W2 + jx + dx] || 0);
      res.issues.push({ kind: "support", part: opn[jy * W2 + jx] || "", x: c.x / sc, y: c.y / sc, area: c.area, z: z });
    });
    res.stats = { tris: tris, cell: res.cell || 0.25 };
    return res;
  }
  function describe(it) {
    if (it.kind == "wall") return Lx("קיר דק מ-" + it.min + " מ״מ בחלק '" + (nmOf(pname(it.part))) + "' (כ-" + it.area.toFixed(1) + " מ״מ²). עלול לא להיווצר או להישבר. עבו אותו או הגדילו את המודל.", "Wall thinner than " + it.min + " mm in '" + nmOf(pname(it.part)) + "' (about " + it.area.toFixed(1) + " mm²). It may not print or may snap. Thicken it or scale the model up.");
    if (it.kind == "text") return Lx("כיתוב או פרט קטן מדי (קווים דקים מ-" + it.min + " מ״מ) ב'" + nmOf(pname(it.part)) + "'. קצרו את הטקסט, הגדילו את ההדפסה או השתמשו בדיזה 0.25.", "Text or detail too small (strokes thinner than " + it.min + " mm) in '" + nmOf(pname(it.part)) + "'. Shorten the text, print larger or use a 0.25 nozzle.");
    return Lx("בליטה תלויה באוויר בשיפוע חד (כ-" + it.area.toFixed(0) + " מ״מ², גובה מעל המיטה עד " + it.z.toFixed(1) + " מ״מ). נדרשות תמיכות או שינוי כיוון ההדפסה.", "Steep overhang (about " + it.area.toFixed(0) + " mm², up to " + it.z.toFixed(1) + " mm above the bed). Supports or a different orientation are needed.");
  }
  var COL = { wall: 0xff9500, text: 0xd946ef, support: 0xff3b30 };
  function overlayGroup(name) {
    if (F[name]) { try { pivot.remove(F[name]); } catch (e) {} }
    var g = new THREE.Group(); g.rotation.x = -Math.PI / 2;
    if (typeof model !== "undefined" && model) g.position.x = model.position.x;
    pivot.add(g); F[name] = g; return g;
  }
  function drawMarks(focus) {
    var g = overlayGroup("marks"), sc = F.sc || 1;
    F.found.forEach(function (it, i) {
      var r = Math.max(2.2, Math.min(9, Math.sqrt(it.area) * 0.6)) / sc;
      var m = new THREE.Mesh(new THREE.SphereGeometry(r * (focus === i ? 1.5 : 1), 16, 12), new THREE.MeshBasicMaterial({ color: COL[it.kind], transparent: true, opacity: focus === i ? 0.85 : 0.55, depthTest: false }));
      m.position.set(it.x, it.y, it.kind == "support" ? (it.z / sc * 0.5 + (F.gz || 0)) : (F.top || 0)); m.renderOrder = 999; g.add(m);
    });
  }
  function showFound() {
    var box = $("fabres"); if (!box) return;
    if (F.skipped) { box.innerHTML = '<div class="hint">' + Lx("הבדיקה דולגה (המודל גדול מאוד).", "Check skipped (very large model).") + "</div>"; return; }
    if (!F.found.length) { box.innerHTML = '<div style="color:#0a7d33;font-weight:600">✅ ' + Lx("לא נמצאו בעיות הדפסה. גודל התא בבדיקה " + (F.cell || 0.25).toFixed(2) + " מ״מ.", "No print issues found. Check resolution " + (F.cell || 0.25).toFixed(2) + " mm.") + "</div>"; return; }
    var by = { wall: 0, text: 0, support: 0 }; F.found.forEach(function (i) { by[i.kind]++; });
    box.innerHTML = '<div style="font-weight:600">⚠️ ' + Lx("נמצאו " + F.found.length + " אזורים לבדיקה", F.found.length + " areas to review") + ' <span class="hint">(' + Lx("קירות", "walls") + " " + by.wall + " · " + Lx("כיתוב", "text") + " " + by.text + " · " + Lx("תמיכות", "supports") + " " + by.support + ")</span></div>"
      + "<ol style=\"margin:6px 0 0;padding-inline-start:20px\">" + F.found.map(function (it, i) { return '<li><button type="button" class="fabgo" data-i="' + i + '" style="display:inline-block;width:auto;margin:0 0 0 6px;min-height:28px;padding:0 10px">' + Lx("הצג", "Show") + "</button> <span style=\"color:#" + COL[it.kind].toString(16).padStart(6, "0") + '">●</span> ' + describe(it) + "</li>"; }).join("") + "</ol>";
    box.querySelectorAll(".fabgo").forEach(function (b) { b.onclick = function () { drawMarks(+b.dataset.i); }; });
  }
  async function runCheck() {
    var b = $("fabrun"); if (b) b.disabled = true;
    var st = $("fabres"); if (st) st.textContent = Lx("בודק…", "Checking…");
    await new Promise(function (r) { setTimeout(r, 30); });
    try {
      var P = build(), z = scaleFor(P), r = analyse(P, z.sc), bb = bounds(P);
      F.found = r.issues; F.skipped = r.skipped; F.sc = z.sc; F.gz = bb[2]; F.top = bb[5]; F.cell = r.stats && r.stats.cell;
      showFound(); drawMarks(-1);
    } catch (e) { console.warn("fab check", e); if (st) st.textContent = Lx("הבדיקה נכשלה", "The check failed"); }
    if (b) b.disabled = false;
    return F.found;
  }

  /* ============ חיווט למערכת ============ */
  function hookBuild() {
    var ob = build;
    build = function () {
      var P = ob.apply(this, arguments);
      try { if (F.marks) { pivot.remove(F.marks); F.marks = null; } } catch (e) {}
      try { P = ledPatch(P); } catch (e) { console.warn("fab led", e); }
      if (!F.exporting) { try { F.lastB = bounds(P); F.info = F.cut && TOOL == "stand" ? cutScale(P, F.scaleOrig) : null; } catch (e) { F.info = null; } }
      if (F.exporting && F.only >= 0 && F.cut && TOOL == "stand") {
        if (!F.pieces) { var so = F.scaleOrig; F.zc = cutScale(P, so); F.pieces = cutAll(P).pieces; }
        var pc = F.pieces[F.only]; pc.__z = F.zc; return pc;
      }
      return P;
    };
  }
  function hookScale() {
    F.scaleOrig = scaleFor;
    scaleFor = function (P) { return P && P.__z ? P.__z : F.scaleOrig.apply(this, arguments); };
  }
  function hookExport() {
    var op = prepareFiles;
    prepareFiles = async function () {
      if (!F.cut || TOOL != "stand") return op.apply(this, arguments);
      var files = [], first = null, chk = null, n = F.cut;
      F.exporting = true; F.pieces = null;
      try {
        for (var k = 0; k < n; k++) {
          F.only = k;
          var r = await op.apply(this, arguments);
          if (!first) first = r;
          if (r.chk) { if (!chk) chk = Object.assign({}, r.chk, { bad: (r.chk.bad || []).slice() }); else { Object.keys(r.chk).forEach(function (key) { if (typeof r.chk[key] == "number") chk[key] = (chk[key] || 0) + r.chk[key]; else if (Array.isArray(r.chk[key])) chk[key] = (chk[key] || []).concat(r.chk[key]); }); } }
          r.files.forEach(function (f) { f.name = "piece" + (k + 1) + "_" + f.name; f.desc = Lx("חלק " + (k + 1) + " מתוך " + n + " – ", "Piece " + (k + 1) + " of " + n + " – ") + f.desc; files.push(f); });
        }
      } finally { F.exporting = false; F.only = -1; F.pieces = null; }
      first.files = files; first.chk = chk || first.chk; first.cutN = n;
      return first;
    };
  }
  function hookRender() {
    var or = render;
    render = function () { var r = or.apply(this, arguments); try { drawSeams(); paint(); } catch (e) { console.warn("fab seam", e); } return r; };
  }
  /* קווי התפר בתצוגה המקדימה: מציג איפה ייחתך המודל ואיפה החיבורים */
  function drawSeams() {
    if (F.ov) { try { pivot.remove(F.ov); } catch (e) {} F.ov = null; }
    var info = $("fabcutinfo");
    if (!F.cut || TOOL != "stand" || !F.lastB) { if (info) info.textContent = ""; return; }
    var b = F.lastB, plan = planFor(b), g = overlayGroup("ov"), zt = b[5] + 0.3, ex = b[3] - b[0], ey = b[4] - b[1];
    var line = function (pts) { var geo = new THREE.BufferGeometry().setFromPoints(pts.map(function (p) { return new THREE.Vector3(p[0], p[1], zt); })); var l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff3b30, depthTest: false })); l.renderOrder = 998; g.add(l); };
    var seam = function (sp, a, c) {   // a..c: טווח הצד הצידי (lat) של התפר
      var pt = function (s, l) { return [sp.O[0] + s * sp.dir[0] + l * sp.lat[0], sp.O[1] + s * sp.dir[1] + l * sp.lat[1]]; }, pts = [pt(0, a)];
      sp.tabs.forEach(function (ci) { pts.push(pt(0, ci - sp.w0), pt(sp.t, ci - sp.w1), pt(sp.t, ci + sp.w1), pt(0, ci + sp.w0)); });
      pts.push(pt(0, c)); line(pts);
    };
    if (plan.n == 2) { var h2 = (plan.s1.dir[0] ? ey : ex) / 2 + 2; seam(plan.s1, -h2, h2); }
    else { seam(plan.s1, -ey / 2 - 2, ey / 2 + 2); seam(plan.s2[0], 0, ex / 2 + 2); seam(plan.s2[1], -ex / 2 - 2, 0); }
    g.visible = !!F.seams;
    if (info) info.textContent = F.info ? Lx("יחולק ל-" + F.cut + " חלקים של עד כ-" + F.info.pieceMax.toFixed(1) + " ס״מ, בקנה מידה " + Math.round(F.info.sc * 100) + "%. כל חלק יוצא כקובץ נפרד.", "Will be split into " + F.cut + " pieces of up to about " + F.info.pieceMax.toFixed(1) + " cm at " + Math.round(F.info.sc * 100) + "% scale. Each piece exports as a separate file.") : "";
  }
  function hookProj() {
    var og = getProj, op = putProj;
    getProj = function () { var o = og.apply(this, arguments); o.fab = { cut: F.cut, led: F.led, ledw: F.ledw, ledm: F.ledm, clr: F.clr }; return o; };
    putProj = function (o) {
      var r = op.apply(this, arguments);
      try { var f = o && o.fab; if (f) { F.cut = f.cut == 2 || f.cut == 4 ? f.cut : 0; F.led = !!f.led; F.ledw = Math.max(5, Math.min(20, +f.ledw || 10)); F.ledm = Math.max(2, Math.min(12, +f.ledm || 4)); F.clr = Math.max(0.1, Math.min(0.8, +f.clr || 0.3)); } else { F.cut = 0; F.led = false; } paint(); } catch (e) {}
      return r;
    };
  }

  /* ============ ממשק (לשונית 4) ============ */
  function paint() {
    var b = $("fabbox"); if (!b) return;
    $("fabcut").value = String(F.cut); $("fabled").checked = F.led; $("fabledw").value = F.ledw; $("fabledm").value = F.ledm; $("fabclr").value = F.clr;
    $("fabledwl").textContent = F.ledw + " " + Lx("מ״מ", "mm"); $("fabledml").textContent = F.ledm + " " + Lx("מ״מ", "mm"); $("fabclrl").textContent = F.clr.toFixed(2) + " " + Lx("מ״מ", "mm");
    var stand = TOOL == "stand";
    $("fabstandonly").style.display = stand ? "none" : "";
    ["fabcut", "fabled", "fabledw", "fabledm", "fabclr"].forEach(function (id) { $(id).disabled = !stand; });
    var note = $("fabledinfo"); if (note) note.textContent = F.led && stand ? F.ledNote : "";
    b.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
  }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="4"]'), prev = $("accbox") || $("uxsum");
    if (!host || !prev || $("fabbox")) return;
    var rowc = 'style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap"', lab = 'style="display:inline;margin:0"';
    var slider = function (id, he, en, mn, mx, st) { return '<div style="margin-top:8px"><label for="' + id + '" ' + lab + ">" + span(he, en) + '</label> <b id="' + id + 'l"></b><input type="range" id="' + id + '" min="' + mn + '" max="' + mx + '" step="' + st + '"></div>'; };
    var d = document.createElement("div"); d.id = "fabbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("🛠️ הנדסת הדפסה", "🛠️ Print engineering") + "</b>"
      + '<div style="margin-top:8px"><button type="button" id="fabrun" style="margin:0">' + span("🔍 בדיקת הדפסתיות", "🔍 Printability check") + '</button><div class="hint">' + span("קירות דקים, כיתוב קטן ובליטות שדורשות תמיכות, עם סימון על המודל", "Thin walls, small text and overhangs needing supports, marked on the model") + '</div><div id="fabres" role="status" style="margin-top:8px;font-size:13px"></div></div>'
      + '<div id="fabstandonly" class="hint" style="margin-top:8px;display:none">' + span("החיתוך לפאזל וחריץ ה-LED זמינים במעמד בלבד.", "Puzzle cut and the LED slot are available for the stand only.") + "</div>"
      + '<div style="margin-top:12px;border-top:1px solid var(--bd,#e5e5e5);padding-top:10px"><b>' + span("🧩 חיתוך פאזל למדפסת קטנה", "🧩 Puzzle cut for small printers") + "</b>"
      + '<label for="fabcut" style="margin-top:8px">' + span("חלוקה", "Split") + '</label><select id="fabcut"><option value="0">' + Lx("בלי חיתוך", "No cut") + '</option><option value="2">' + Lx("2 חלקים", "2 pieces") + '</option><option value="4">' + Lx("4 חלקים", "4 pieces") + "</option></select>"
      + slider("fabclr", "מרווח חיבור", "Joint clearance", 0.1, 0.8, 0.05)
      + '<label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" id="fabseam" checked> ' + span("הצג קו חיתוך בתצוגה", "Show the seam in the preview") + "</label>"
      + '<div class="hint" id="fabcutinfo"></div><p class="hint">' + span("החלקים מתחברים בזנב-יונה (מחליקים מלמעלה). אם החיבור הדוק מדי הגדילו את המרווח. מומלץ להוסיף טיפת דבק.", "The pieces join with dovetails (slide in from above). If the fit is too tight, increase the clearance. A drop of glue makes it permanent.") + "</p></div>"
      + '<div style="margin-top:12px;border-top:1px solid var(--bd,#e5e5e5);padding-top:10px"><b>' + span("💡 הכנה לפס LED", "💡 LED strip prep") + "</b>"
      + '<label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" id="fabled"> ' + span("חריץ בתחתית המעמד ותעלת כבל", "Slot on the stand bottom with a cable channel") + "</label>"
      + slider("fabledw", "רוחב הפס", "Strip width", 5, 20, 1) + slider("fabledm", "מרחק מהקצה", "Edge margin", 2, 12, 1)
      + '<div class="hint" id="fabledinfo"></div></div>';
    prev.parentNode.insertBefore(d, prev.nextSibling);
    var bind = function (id, key, num, cb) { $(id).onchange = $(id).oninput = function () { F[key] = num ? +this.value : this.checked; if (key == "cut") F.cut = +this.value; paint(); update(); if (cb) cb(); }; };
    bind("fabcut", "cut", true); bind("fabclr", "clr", true); bind("fabledw", "ledw", true); bind("fabledm", "ledm", true);
    $("fabled").onchange = function () { F.led = this.checked; update(); setTimeout(paint, 300); };
    $("fabseam").onchange = function () { F.seams = this.checked; if (F.ov) F.ov.visible = F.seams; };
    $("fabrun").onclick = runCheck;
    paint();
  }

  function init() {
    if (typeof THREE == "undefined" || typeof build != "function" || typeof prepareFiles != "function" || typeof scaleFor != "function") return;
    [hookBuild, hookScale, hookExport, hookRender, hookProj, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("fab", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(paint, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    try { setInterval(function () { paint(); }, 2500); } catch (e) {}
    window.fabApi = { fixSlivers: fixSlivers, F: F, analyse: analyse, runCheck: runCheck, clipHalf: clipHalf, splitGeoms: splitGeoms, cutAll: cutAll, planFor: planFor, ledPatch: ledPatch, inset: inset, bounds: bounds };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
