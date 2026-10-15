/* assemble.js (v59): הרכבה ותלייה
   1. פינים ושקעים (Snap-Fit Pegs): המעמד והמפה מיוצאים כשני חלקים נפרדים. על המעמד עומדים פינים קטנים, ובתחתית המפה יש שקעים עיוורים
      (לא רואים אותם מלמעלה). מתאים למדפסת בצבע יחיד: מדפיסים כל חלק לבד ומחברים ביד.
   2. מגרעת תלייה (Keyhole): אוזן בגב המעמד עם חור בצורת "ביצית" לתלייה על בורג בקיר.
   מבנה הנתונים: A = {pegs: bool, key: bool, only: -1|0|1 (חלק בייצוא), pos: [[x,y],...] עמדות הפינים, zc: קנה מידה אחיד לשני החלקים}.
   עמדות הפינים נבחרות מתוך מסכת המדינה (LM) בשיטת "הנקודה הרחוקה ביותר", בלי נגיעה בקצה המדינה.
   נקודות חיבור לקוד הראשי: landG (ב-build) קורא ל-pegApi.holes כדי לחתוך שקעים בתחתית המדינה. כל השאר עוטף build / scaleFor / prepareFiles / getProj / putProj. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + Lx(he, en) + "</span>"; };

  var PEG_R = 1.5, CLR = 0.2;                     // רדיוס הפין והמרווח בשקע (מ״מ)
  var A = { pegs: false, key: false, split: false, only: -1, exporting: false, pos: null, zc: null, msg: "" };

  var stand = function () { return TOOL == "stand" && !(window.mechApi && mechApi.tilted()) && !(window.lithoApi && lithoApi.on()); };
  var pegsOn = function () { return A.pegs && stand() && !(window.fabApi && fabApi.F && fabApi.F.cut); };
  var splitOn = function () { return A.split && stand() && !(window.fabApi && fabApi.F && fabApi.F.cut); };
  /* ייצוא כשני חלקים: עם פינים (kit) או רק פיצול בלי פינים (part) */
  var kitOn = function () { return (pegsOn() && A.good && A.good.length > 1) || splitOn(); };
  var keyOn = function () { return A.key && stand(); };
  var sockDepth = function (LH) { return Math.max(0.8, LH - 0.7); };

  /* ============ עמדות הפינים ============ */
  function positions() {
    if (A.pos) return A.pos;
    var out = [], c = [], R = PEG_R + CLR + 0.5;
    var ok = function (x, y, r) {
      return [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]].every(function (d) {
        var i = Math.floor((x + d[0] + 35) / CS), j = Math.floor((y + d[1] + 35) / CS);
        return i >= 0 && j >= 0 && i < N && j < N && LM && LM[j * N + i];
      });
    };
    for (var y = -36; y <= 36; y += 2.5) for (var x = -36; x <= 36; x += 2.5) if (ok(x, y, R)) c.push([x, y]);
    if (c.length) {
      var d2 = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
      var cx = 0, cy = 0; c.forEach(function (p) { cx += p[0]; cy += p[1]; }); cx /= c.length; cy /= c.length;
      var far = function (ref) { return c.reduce(function (b, p) { return d2(p, ref) > d2(b, ref) ? p : b; }); };
      var p1 = far([cx, cy]), p2 = far(p1); out = [p1];
      if (d2(p1, p2) >= 10) out.push(p2);
      while (out.length < 4) {                  // הנקודה שרחוקה ביותר מהנבחרות
        var best = null, bd = 0;
        c.forEach(function (p) { var m = Math.min.apply(null, out.map(function (q) { return d2(p, q); })); if (m > bd) { bd = m; best = p; } });
        if (!best || bd < 12) break;
        out.push(best);
      }
    }
    A.pos = out; A.cand = c; return out;
  }
  /* נקרא מתוך landG: חורי שקע לטבעת מסוימת של המדינה */
  /* בודקים שחיתוך החור נותן רשת סגורה ונקייה (בלי קצוות פתוחים או משולשים מנוונים); חור שלא עובר נפסל */
  function clean(ring, hs) {
    try {
      var sh = new THREE.Shape(ring.map(function (p) { return new THREE.Vector2(p[0], p[1] + 14); }));
      hs.forEach(function (h) { var q = new THREE.Path(); q.absarc(h[0], h[1] + 14, h[2], 0, 2 * Math.PI, true); sh.holes.push(q); });
      var m = meshCheck([{ name: "t", geoms: [new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false })] }]);
      return !m.open && !m.deg;
    } catch (e) { return false; }
  }
  function holes(ring) {
    if (!pegsOn()) return [];
    var p = positions(); if (p.length < 2) return [];
    var c = p.filter(function (q) { return pipR(q[0], q[1], ring); }).map(function (q) { return [q[0], q[1], PEG_R + CLR]; });
    if (!c.length) return [];
    var good = c.filter(function (h) { return clean(ring, [h]); });
    while (good.length && !clean(ring, good)) good.pop();
    /* חור שנפסל: מנסים מועמד קרוב אחר באותה טבעת (עד 14 ניסיונות לכל חור) */
    c.forEach(function (h) {
      if (good.some(function (g) { return Math.hypot(g[0] - h[0], g[1] - h[1]) < 1; })) return;
      var alts = (A.cand || []).filter(function (q) { return pipR(q[0], q[1], ring) && Math.hypot(q[0] - h[0], q[1] - h[1]) <= 16 && good.every(function (g) { return Math.hypot(g[0] - q[0], g[1] - q[1]) >= 8; }); })
        .sort(function (a, b) { return Math.hypot(a[0] - h[0], a[1] - h[1]) - Math.hypot(b[0] - h[0], b[1] - h[1]); }).slice(0, 14);
      for (var i = 0; i < alts.length; i++) { var t = [alts[i][0], alts[i][1], PEG_R + CLR]; if (clean(ring, good.concat([t]))) { good.push(t); break; } }
    });
    A.good = (A.good || []).concat(good);
    return good;
  }

  /* ============ בנייה ============ */
  function bbox(P, name) {
    var b = new THREE.Box3(), any = false;
    P.forEach(function (p) { if (p.name == name) p.geoms.forEach(function (g) { g.computeBoundingBox(); b.union(g.boundingBox); any = true; }); });
    return any ? b : null;
  }
  function pegsPatch(P) {
    var BH = +$("bh").value, GP = +$("gap").value, LH = +$("lh").value, OY = 14, pos = (A.good || []).map(function (h) { return [h[0], h[1]]; });
    if (pos.length < 2) { A.msg = Lx("המדינה צרה מדי לפינים", "The country is too narrow for pegs"); return; }
    if (LH < 1.5) { A.msg = Lx("הגדילו את גובה המדינה (לפחות 1.5 מ״מ) כדי שיהיו שקעים", "Raise the country height (at least 1.5 mm) to fit sockets"); return; }
    var z0 = BH - 0.3, top = BH + GP + sockDepth(LH) - 0.2, h = top - z0, g = [];
    pos.forEach(function (p) { g.push(new THREE.CylinderGeometry(PEG_R - 0.35, PEG_R, h, 14).rotateX(Math.PI / 2).translate(p[0], p[1] + OY, z0 + h / 2)); });
    var i = P.findIndex(function (q) { return q.name == "1_base"; });
    P.splice(i < 0 ? 0 : i + 1, 0, { name: "1e_pegs", color: $("c_base").value, geoms: g });
    A.msg = "";
  }
  function keyholePoly(cx, cy) {
    var R = 4.5, hw = 2.25, L = 8, pts = [], t, a1, a2;
    for (t = 0; t <= 12; t++) { var a = Math.PI * t / 12; pts.push([cx + hw * Math.cos(a), cy + L + hw * Math.sin(a)]); }
    var yy = Math.sqrt(R * R - hw * hw);
    a1 = Math.atan2(yy, -hw); a2 = Math.atan2(yy, hw) + 2 * Math.PI;
    for (t = 0; t <= 28; t++) { var b = a1 + (a2 - a1) * t / 28; pts.push([cx + R * Math.cos(b), cy + R * Math.sin(b)]); }
    return pts;
  }
  function keyPatch(P) {
    var bb = bbox(P, "1_base"); if (!bb) return;
    var cx = (bb.min.x + bb.max.x) / 2, yM = bb.max.y, th = Math.max(bb.max.z, 2.6), hw = 10, y0 = yM - 5, y1 = yM + 19.5, r = 4;
    var sh = new THREE.Shape();
    sh.moveTo(cx - hw + r, y0); sh.lineTo(cx + hw - r, y0); sh.absarc(cx + hw - r, y0 + r, r, -Math.PI / 2, 0, false);
    sh.lineTo(cx + hw, y1 - r); sh.absarc(cx + hw - r, y1 - r, r, 0, Math.PI / 2, false);
    sh.lineTo(cx - hw + r, y1); sh.absarc(cx - hw + r, y1 - r, r, Math.PI / 2, Math.PI, false);
    sh.lineTo(cx - hw, y0 + r); sh.absarc(cx - hw + r, y0 + r, r, Math.PI, 1.5 * Math.PI, false);
    sh.holes.push(new THREE.Path(keyholePoly(cx, yM + 6.5).map(function (p) { return new THREE.Vector2(p[0], p[1]); })));
    var g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false });
    var i = P.findIndex(function (q) { return q.name == "1_base"; });
    P.splice(i < 0 ? 0 : i + 1, 0, { name: "1d_hang", color: $("c_base").value, geoms: [g] });
  }
  var isCountryPart = function (n) { return /^(2_country|2b_water|2c_relief|2d_borders|3_pins|3e_trip)/.test(n); };

  function hookBuild() {
    var ob = build;
    build = function () {
      A.pos = null; A.good = [];
      var P = ob.apply(this, arguments);
      try {
        if (pegsOn()) pegsPatch(P);
        if (keyOn()) keyPatch(P);
      } catch (e) { console.warn("assemble", e); }
      if (A.exporting && A.only >= 0 && kitOn()) {
        if (A.zc == null) A.zc = A.scaleOrig(P);
        var want = A.only == 1, BH = +$("bh").value, GP = +$("gap").value;
        var Q = P.filter(function (p) { return isCountryPart(p.name) == want; });
        if (want) Q.forEach(function (p) { p.geoms.forEach(function (g) { g.translate(0, 0, -(BH + GP)); }); });   // המפה מודפסת שטוחה על המשטח
        Q.__az = A.zc; return Q;
      }
      return P;
    };
  }
  function hookScale() {
    A.scaleOrig = scaleFor;
    scaleFor = function (P) { return P && P.__az ? P.__az : A.scaleOrig.apply(this, arguments); };
  }
  function mergeChk(a, b) {
    if (!a) return Object.assign({}, b, { bad: (b.bad || []).slice() });
    Object.keys(b).forEach(function (k) { if (typeof b[k] == "number") a[k] = (a[k] || 0) + b[k]; else if (Array.isArray(b[k])) a[k] = (a[k] || []).concat(b[k]); });
    return a;
  }
  function hookExport() {
    var op = prepareFiles;
    prepareFiles = async function () {
      if (!kitOn()) return op.apply(this, arguments);
      var files = [], first = null, chk = null, pg = pegsOn() && A.good && A.good.length > 1, pre = pg ? "kit" : "part", nm = pg ? [Lx("מעמד עם פינים", "Stand with pegs"), Lx("מפה עם שקעים", "Map with sockets")] : [Lx("מעמד", "Stand"), Lx("מדינה וסיכות", "Country and pins")];
      A.exporting = true; A.zc = null;
      try {
        for (var k = 0; k < 2; k++) {
          A.only = k;
          var r = await op.apply(this, arguments);
          if (!first) first = r;
          chk = mergeChk(chk, r.chk || {});
          r.files.forEach(function (f) { f.name = pre + (k + 1) + "_" + (k ? "map" : "stand") + "_" + f.name; f.desc = Lx("חלק " + (k + 1) + " מתוך 2 (" + nm[k] + ") – ", "Part " + (k + 1) + " of 2 (" + nm[k] + ") – ") + f.desc; files.push(f); });
        }
      } finally { A.exporting = false; A.only = -1; A.zc = null; }
      first.files = files; first.chk = chk || first.chk;
      return first;
    };
  }
  /* אזהרות הדפסה נוספות: קווי מסלול (טיולים) דקים מדי */
  function hookWarn() {
    var os = showSize;
    showSize = function (P) {
      var r = os.apply(this, arguments);
      try {
        var w = $("warn"), z = scaleFor(P), out = [];
        if (window.tripsApi && TOOL == "stand") {
          var W = { thin: 1.0, mid: 1.5, thick: 2.2 };
          tripsApi.TR().forEach(function (t) { if (t.on && W[t.w] * z.sc < 1.5) out.push(Lx("הקו \"" + t.name + "\" דק מדי (" + (W[t.w] * z.sc).toFixed(1) + " מ״מ, מינימום 1.5). בחרו קו עבה יותר", "The line \"" + t.name + "\" is too thin (" + (W[t.w] * z.sc).toFixed(1) + " mm, minimum 1.5). Pick a thicker line")); });
        }
        if (pegsOn() && A.msg) out.push(A.msg);
        if (w && out.length) {
          var ok = w.textContent.indexOf("✅") == 0;
          w.innerHTML = (ok ? "" : w.innerHTML + "<br>") + out.map(function (x) { return "⚠️ " + x; }).join("<br>");
        }
      } catch (e) {}
      return r;
    };
  }
  function hookProj() {
    var og = getProj, op = putProj;
    getProj = function () { var o = og.apply(this, arguments); if (A.pegs || A.key || A.split) o.asm = { pegs: !!A.pegs, key: !!A.key, split: !!A.split }; return o; };
    putProj = function (o) {
      var r = op.apply(this, arguments);
      try { var a = o && o.asm; A.pegs = !!(a && a.pegs); A.key = !!(a && a.key); A.split = !!(a && a.split); paint(); } catch (e) {}
      return r;
    };
  }

  /* ============ ממשק (לשונית 4) ============ */
  function paint() {
    var b = $("asmbox"); if (!b) return;
    var ok = stand(), cut = !!(window.fabApi && fabApi.F && fabApi.F.cut);
    $("asmpegs").checked = A.pegs; $("asmkey").checked = A.key; $("asmsplit").checked = A.split; $("asmsplit").disabled = !ok || cut;
    $("asmpegs").disabled = !ok || cut; $("asmkey").disabled = !ok;
    $("asmnote").textContent = !ok ? Lx("זמין במעמד שאינו מוטה ובלי מצב מפת אור.", "Available for the flat stand, without lithophane mode.")
      : cut ? Lx("פינים אינם זמינים יחד עם חיתוך לחלקים. כבו את החיתוך.", "Pegs are not available with the puzzle cut. Turn the cut off.")
      : A.split && !(A.pegs && A.good && A.good.length > 1) ? Lx("הייצוא יוציא שני חלקים: part1 (מעמד) ו-part2 (מדינה וסיכות, מונחת שטוחה).", "Export gives two parts: part1 (stand) and part2 (country and pins, laid flat).") : A.pegs ? Lx("הייצוא יוציא שני חלקים: kit1 (מעמד עם פינים) ו-kit2 (מפה עם שקעים, מונחת שטוחה). אפשר להוסיף טיפת דבק.", "Export gives two parts: kit1 (stand with pegs) and kit2 (map with sockets, laid flat). A drop of glue helps.") : "";
    b.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
  }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="4"]'); if (!host || $("asmbox")) return;
    var nav = host.querySelector(".uxnav"), d = document.createElement("div"); d.id = "asmbox"; d.className = "uxsum";
    var cb = function (id, he, en, info) { return '<label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" id="' + id + '"> ' + span(he, en) + "</label>" + (info ? '<div class="hint">' + span(info[0], info[1]) + "</div>" : ""); };
    d.innerHTML = "<b>" + span("🧩 הרכבה ותלייה", "🧩 Assembly and hanging") + "</b>"
      + cb("asmpegs", "פינים ושקעים: מעמד ומפה כשני חלקים נפרדים", "Pegs and sockets: stand and map as two separate parts", ["מתאים למדפסת בצבע אחד. כל חלק מודפס לבד ומחברים ביד.", "For single-color printers. Print each part alone and snap them together."])
      + cb("asmsplit", "פיצול: המעמד בנפרד מהמדינה והסיכות", "Split: stand separate from the country and pins", ["שני קבצים להדפסה: המעמד, והמדינה עם הסיכות והמים מונחים שטוחים. בלי פינים (אפשר לשלב עם פינים).", "Two print files: the stand, and the country with pins and water laid flat. No pegs needed (can be combined with pegs)."])
      + cb("asmkey", "מגרעת תלייה (Keyhole) בגב המעמד", "Keyhole slot on the back of the stand", ["אוזן עם חור לתלייה על בורג בקיר (ראש בורג עד 8 מ״מ).", "A tab with a keyhole for hanging on a wall screw (head up to 8 mm)."])
      + '<div id="asmnote" class="hint" role="status"></div>';
    host.insertBefore(d, nav || null);
    $("asmpegs").onchange = function () { A.pegs = this.checked; paint(); update(); };
    $("asmsplit").onchange = function () { A.split = this.checked; paint(); update(); };
    $("asmkey").onchange = function () { A.key = this.checked; paint(); update(); };
    paint();
  }

  function init() {
    if (typeof THREE == "undefined" || typeof build != "function" || typeof prepareFiles != "function" || typeof scaleFor != "function") return;
    [hookBuild, hookScale, hookExport, hookWarn, hookProj, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("assemble", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(paint, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    try { setInterval(paint, 2500); } catch (e) {}
    window.pegApi = { A: A, holes: holes, active: pegsOn, positions: positions, keyPatch: keyPatch, pegsPatch: pegsPatch };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
