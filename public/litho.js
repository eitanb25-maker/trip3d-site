/* litho.js (v55): מצב מפת אור (Lithophane Terrain)
   הופך את המעמד ללוח דק שעוביו משתנה לפי הגובה, כך שכשמאירים אותו מאחור נוצרת תמונה טופוגרפית: עבה = כהה, דק = בהיר.
   מקור הגובה: תמונת המפה הפיזית שהועלתה (שכבת ההרים), ובלעדיה מעבר רציף לפי המרחק מקו החוף (בקירוב, לא גובה אמיתי).
   סיכות הופכות לנקודות כהות, והכיתוב הרגיל של המעמד הופך לאותיות (כהות על רקע בהיר).
   המודול עוטף את build / getProj / putProj ואינו משנה את הקוד הראשי.
   מבנה הנתונים: L = {on, tmin, tmax, invert, src: "auto"|"relief"|"coast", frame, pins}; G = {nx, ny, cs, x0, y0, A: Uint8Array, T: Float32Array}
   (A = תא פעיל, T = עובי במ״מ), שמשמש גם לבניית הרשת וגם לתצוגה המקדימה. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };

  var L = { on: false, tmin: 0.8, tmax: 3.2, invert: false, src: "auto", frame: true, pins: true };
  var G = null, info = { src: "", levels: 0 };
  var OY = 14;   // הסטת המפה במעמד (כמו בקוד הראשי)

  var pip = function (poly, x, y) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) if ((poly[i][1] > y) != (poly[j][1] > y) && x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c; return c; };
  var smooth01 = function (t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

  /* מרחק (בתאי LM) מכל תא יבשה אל קו החוף, שני מעברים (chamfer) */
  function coastDist() {
    var d = new Float32Array(N * N), x, y, i, r2 = Math.SQRT2, mx = 0;
    for (i = 0; i < d.length; i++) d[i] = LM && LM[i] ? 1e9 : 0;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) { i = y * N + x; if (!d[i]) continue; var v = d[i]; if (x) v = Math.min(v, d[i - 1] + 1); if (y) { v = Math.min(v, d[i - N] + 1); if (x) v = Math.min(v, d[i - N - 1] + r2); if (x < N - 1) v = Math.min(v, d[i - N + 1] + r2); } d[i] = v; }
    for (y = N - 1; y >= 0; y--) for (x = N - 1; x >= 0; x--) { i = y * N + x; if (!d[i]) continue; var u = d[i]; if (x < N - 1) u = Math.min(u, d[i + 1] + 1); if (y < N - 1) { u = Math.min(u, d[i + N] + 1); if (x < N - 1) u = Math.min(u, d[i + N + 1] + r2); if (x) u = Math.min(u, d[i + N - 1] + r2); } d[i] = u; mx = Math.max(mx, u); }
    return { d: d, max: Math.max(1, mx) };
  }

  /* ============ בניית רשת העובי ============ */
  function makeGrid(P) {
    var O = outline($("shape").value), b = [1e9, 1e9, -1e9, -1e9];
    O.forEach(function (p) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); });
    var cs = (typeof LOWQ != "undefined" && LOWQ) ? 0.8 : 0.5, nx = Math.ceil((b[2] - b[0]) / cs), ny = Math.ceil((b[3] - b[1]) / cs);
    var g = { nx: nx, ny: ny, cs: cs, x0: b[0], y0: b[1], A: new Uint8Array(nx * ny), T: new Float32Array(nx * ny) };
    var relief = !!(LY && LY.relief && LY.relief.d) && L.src != "coast", cd = (!relief || L.src == "coast") ? coastDist() : null;
    info.src = relief ? "relief" : "coast";
    if (L.src == "relief" && !relief) info.src = "coast", cd = coastDist();
    var mode = $("rmode").value, j, i, k;
    var G0 = new Float32Array(nx * ny);   // ערך 0..1 לפני המרה לעובי
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var x = g.x0 + (i + 0.5) * cs, y = g.y0 + (j + 0.5) * cs; k = j * nx + i;
      if (!pip(O, x, y)) continue;
      g.A[k] = 1;
      var mi = Math.floor((x + 35) / 0.5), mj = Math.floor((y - OY + 35) / 0.5), v = 0;
      if (mi >= 0 && mj >= 0 && mi < N && mj < N && LM && LM[mj * N + mi] && !WM[mj * N + mi]) {
        if (relief) { var p = samp("relief", x, y - OY); v = 0.25 + 0.75 * (p ? hv(p, mode) : 0); }
        else v = 0.25 + 0.75 * smooth01(cd.d[mj * N + mi] / Math.max(6, cd.max * 0.8));
      }
      G0[k] = v;
    }
    // החלקה קלה כדי למנוע מדרגות ברורות מדי בתמונה
    var S = new Float32Array(nx * ny);
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) { k = j * nx + i; if (!g.A[k]) continue; var s = 0, c = 0; for (var a = -1; a <= 1; a++) for (var bb = -1; bb <= 1; bb++) { var ii = i + bb, jj = j + a; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; var q = jj * nx + ii; if (g.A[q]) { s += G0[q]; c++; } } S[k] = s / c; }
    if (L.pins) pins.forEach(function (p) {   // נקודת סיכה: עיגול ברדיוס 1.8 מ״מ בערך "גבוה"
      var m = toMM(p.lon, p.lat), px = m[0], py = m[1] + OY; if (Math.abs(m[0]) > 36 || Math.abs(m[1]) > 36) return;
      for (var jj = Math.max(0, Math.floor((py - 2 - g.y0) / cs)); jj <= Math.min(ny - 1, Math.floor((py + 2 - g.y0) / cs)); jj++) for (var ii = Math.max(0, Math.floor((px - 2 - g.x0) / cs)); ii <= Math.min(nx - 1, Math.floor((px + 2 - g.x0) / cs)); ii++) {
        var cx = g.x0 + (ii + 0.5) * cs - px, cy = g.y0 + (jj + 0.5) * cs - py; if (cx * cx + cy * cy <= 3.24 && g.A[jj * nx + ii]) S[jj * nx + ii] = 1;
      }
    });
    for (k = 0; k < S.length; k++) { if (!g.A[k]) continue; var gg = L.invert ? 1 - S[k] : S[k]; g.T[k] = L.tmin + (L.tmax - L.tmin) * gg; }
    // כיתוב המעמד (4_text): אותיות בצבע ההפוך לרקע שלהן
    var tp = P.filter(function (p) { return p.name == "4_text"; })[0], bg = L.invert ? L.tmax : L.tmin, fg = L.invert ? L.tmin : L.tmax;
    if (tp) tp.geoms.forEach(function (ge) {
      ge.computeBoundingBox(); var bx = ge.boundingBox;
      for (var jj = Math.max(0, Math.floor((bx.min.y - g.y0) / cs)); jj <= Math.min(ny - 1, Math.floor((bx.max.y - g.y0) / cs)); jj++) for (var ii = Math.max(0, Math.floor((bx.min.x - g.x0) / cs)); ii <= Math.min(nx - 1, Math.floor((bx.max.x - g.x0) / cs)); ii++) {
        var q = jj * nx + ii; if (!g.A[q]) continue;
        var cx = g.x0 + (ii + 0.5) * cs, cy = g.y0 + (jj + 0.5) * cs; if (cx >= bx.min.x && cx <= bx.max.x && cy >= bx.min.y && cy <= bx.max.y) g.T[q] = fg;
      }
    });
    void bg;
    var seen = {}; for (k = 0; k < g.T.length; k++) if (g.A[k]) seen[Math.round(g.T[k] / 0.1)] = 1;
    info.levels = Object.keys(seen).length;
    return g;
  }

  /* רשת סגורה (watertight): משטח עליון לפי גובה הקודקודים (ממוצע התאים הסמוכים), תחתית שטוחה, וקירות היקפיים */
  function meshFrom(g) {
    var nx = g.nx, ny = g.ny, cs = g.cs, V = new Float32Array((nx + 1) * (ny + 1)), W = new Float32Array((nx + 1) * (ny + 1)), pos = [], i, j;
    var act = function (a, b) { return a >= 0 && b >= 0 && a < nx && b < ny && g.A[b * nx + a]; };
    for (j = 0; j <= ny; j++) for (i = 0; i <= nx; i++) { var q = j * (nx + 1) + i; [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]].forEach(function (c) { if (act(c[0], c[1])) { V[q] += g.T[c[1] * nx + c[0]]; W[q]++; } }); if (W[q]) V[q] /= W[q]; }
    var X = function (a) { return g.x0 + a * cs; }, Y = function (b) { return g.y0 + b * cs; }, H = function (a, b) { return V[b * (nx + 1) + a]; };
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      if (!g.A[j * nx + i]) continue;
      var x0 = X(i), x1 = X(i + 1), y0 = Y(j), y1 = Y(j + 1), h00 = H(i, j), h10 = H(i + 1, j), h11 = H(i + 1, j + 1), h01 = H(i, j + 1);
      pos.push(x0, y0, h00, x1, y0, h10, x1, y1, h11, x0, y0, h00, x1, y1, h11, x0, y1, h01);   // עליון
      pos.push(x0, y0, 0, x1, y1, 0, x1, y0, 0, x0, y0, 0, x0, y1, 0, x1, y1, 0);              // תחתון
      if (!act(i, j - 1)) pos.push(x0, y0, 0, x1, y0, 0, x1, y0, h10, x0, y0, 0, x1, y0, h10, x0, y0, h00);    // קיר דרומי
      if (!act(i + 1, j)) pos.push(x1, y0, 0, x1, y1, 0, x1, y1, h11, x1, y0, 0, x1, y1, h11, x1, y0, h10);    // מזרחי
      if (!act(i, j + 1)) pos.push(x1, y1, 0, x0, y1, 0, x0, y1, h01, x1, y1, 0, x0, y1, h01, x1, y1, h11);    // צפוני
      if (!act(i - 1, j)) pos.push(x0, y1, 0, x0, y0, 0, x0, y0, h00, x0, y1, 0, x0, y0, h00, x0, y1, h01);    // מערבי
    }
    var geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3)); return geo;
  }
  function frameGeom(h) {
    var O = outline($("shape").value), f = 1 - 3.2 / 62, sh = new THREE.Shape(O.map(function (p) { return new THREE.Vector2(p[0], p[1]); }));
    sh.holes.push(new THREE.Path(O.map(function (p) { return new THREE.Vector2(p[0] * f, -6 + (p[1] + 6) * f); })));
    return new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
  }

  /* ============ חיווט ============ */
  function hookBuild() {
    var ob = build;
    build = function () {
      var P = ob.apply(this, arguments);
      if (!L.on || TOOL != "stand") { G = null; return P; }
      try {
        G = makeGrid(P);
        var out = [{ name: "1_base", color: $("c_land").value, geoms: [meshFrom(G)] }];
        if (L.frame) out.push({ name: "1b_rim", color: $("c_base").value, geoms: [frameGeom((L.invert ? L.tmax : L.tmax) + 0.8)] });
        P.length = 0; out.forEach(function (p) { P.push(p); });
        preview();
      } catch (e) { console.warn("litho", e); G = null; }
      return P;
    };
  }
  function hookProj() {
    var og = getProj, op = putProj;
    getProj = function () { var o = og.apply(this, arguments); o.litho = Object.assign({}, L); return o; };
    putProj = function (o) {
      var r = op.apply(this, arguments);
      try {
        var l = o && o.litho; L.on = !!(l && l.on);
        L.tmin = Math.max(0.4, Math.min(1.6, +(l && l.tmin) || 0.8)); L.tmax = Math.max(L.tmin + 0.8, Math.min(5, +(l && l.tmax) || 3.2));
        L.invert = !!(l && l.invert); L.src = l && ["auto", "relief", "coast"].indexOf(l.src) >= 0 ? l.src : "auto"; L.frame = !(l && l.frame === false); L.pins = !(l && l.pins === false);
        paint();
      } catch (e) {}
      return r;
    };
  }

  /* ============ תצוגה מקדימה: כך ייראה הלוח כשמאירים אותו מאחור ============ */
  function preview() {
    var c = $("lithoprev"); if (!c || !G) return;
    var g = c.getContext("2d"), W = c.width, H = c.height, im = g.createImageData(W, H), d = im.data, k = 0.95;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var gx = Math.floor(x / W * G.nx), gy = Math.floor((1 - y / H) * G.ny), o = (y * W + x) * 4, q = gy * G.nx + gx;
      if (G.A[q]) { var tr = Math.exp(-k * G.T[q]), a = Math.pow(tr, 0.8); d[o] = 255 * a; d[o + 1] = 226 * a; d[o + 2] = 160 * a; d[o + 3] = 255; }
      else { d[o] = d[o + 1] = d[o + 2] = 22; d[o + 3] = 255; }
    }
    g.putImageData(im, 0, 0);
    var st = $("lithoinfo"); if (st) st.textContent = (info.src == "relief" ? Lx("הגובה נלקח מתמונת המפה הפיזית שהעליתם.", "Heights come from the physical-map image you uploaded.") : Lx("לא הועלתה מפה פיזית, ולכן העובי מבוסס על המרחק מהחוף (קירוב, לא גובה אמיתי). העלו מפה פיזית בלשונית ״מדינה ומפה״ לתוצאה אמיתית.", "No physical-map image was uploaded, so thickness follows distance from the coast (an approximation, not real elevation). Upload a physical map in the 'Country & map' tab for real heights.")) + " " + Lx("עובי " + L.tmin.toFixed(1) + " עד " + L.tmax.toFixed(1) + " מ״מ, כ-" + info.levels + " רמות אפור.", "Thickness " + L.tmin.toFixed(1) + " to " + L.tmax.toFixed(1) + " mm, about " + info.levels + " gray levels.");
  }

  /* ============ ממשק (לשונית 3) ============ */
  function paint() {
    var b = $("lithobox"); if (!b) return;
    var stand = TOOL == "stand";
    $("lithoon").checked = L.on; $("ltmin").value = L.tmin; $("ltmax").value = L.tmax; $("linv").checked = L.invert; $("lsrc").value = L.src; $("lfr").checked = L.frame; $("lpn").checked = L.pins;
    $("ltminl").textContent = L.tmin.toFixed(1) + " " + Lx("מ״מ", "mm"); $("ltmaxl").textContent = L.tmax.toFixed(1) + " " + Lx("מ״מ", "mm");
    $("lithostand").style.display = stand ? "none" : "";
    ["lithoon", "ltmin", "ltmax", "linv", "lsrc", "lfr", "lpn"].forEach(function (id) { $(id).disabled = !stand; });
    $("lithoopts").style.display = L.on ? "" : "none";
    b.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
  }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="3"]'); if (!host || $("lithobox")) return;
    var nav = host.querySelector(".uxnav"), lab = 'style="display:inline;margin:0"';
    var slider = function (id, he, en, mn, mx, st) { return '<div style="margin-top:8px"><label for="' + id + '" ' + lab + ">" + span(he, en) + '</label> <b id="' + id + 'l"></b><input type="range" id="' + id + '" min="' + mn + '" max="' + mx + '" step="' + st + '"></div>'; };
    var cb = function (id, he, en) { return '<label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" id="' + id + '"> ' + span(he, en) + "</label>"; };
    var d = document.createElement("div"); d.id = "lithobox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("💡 מצב מפת אור (ליתופאן)", "💡 Light-map mode (lithophane)") + "</b>"
      + '<div id="lithostand" class="hint" style="display:none">' + span("זמין במעמד בלבד.", "Available for the stand only.") + "</div>"
      + cb("lithoon", "הפיכת המעמד ללוח שעוביו משתנה לפי הגובה", "Turn the stand into a plate whose thickness follows elevation")
      + '<div id="lithoopts">' + slider("ltmin", "עובי מינימלי (בהיר)", "Minimum thickness (bright)", 0.4, 1.6, 0.1) + slider("ltmax", "עובי מקסימלי (כהה)", "Maximum thickness (dark)", 1.6, 5, 0.1)
      + '<label for="lsrc" style="margin-top:8px">' + span("מקור הגובה", "Height source") + '</label><select id="lsrc"><option value="auto">' + Lx("אוטומטי", "Automatic") + '</option><option value="relief">' + Lx("מפה פיזית שהועלתה", "Uploaded physical map") + '</option><option value="coast">' + Lx("מרחק מהחוף", "Distance from coast") + "</option></select>"
      + cb("linv", "היפוך (גבוה = בהיר)", "Invert (high = bright)") + cb("lfr", "מסגרת היקפית", "Outer frame") + cb("lpn", "סיכות כנקודות כהות", "Pins as dark dots")
      + '<canvas id="lithoprev" width="220" height="220" style="margin-top:10px;max-width:100%;border-radius:10px;background:#111" role="img" aria-label="' + Lx("תצוגה מקדימה מוארת מאחור", "Backlit preview") + '"></canvas>'
      + '<div class="hint" id="lithoinfo"></div><p class="hint">' + span("הדפיסו בלבד בלבן או בצבע בהיר, בשכבות של 0.08 עד 0.12 מ״מ ובמילוי 100%, והאירו מאחור (לוח אור או LED). אל תצבעו בכמה צבעים.", "Print in white or a light color only, with 0.08 to 0.12 mm layers and 100% infill, and light it from behind (light box or LED). Don't use multiple colors.") + "</p></div>";
    host.insertBefore(d, nav || null);
    var upd = function () { paint(); update(); };
    $("lithoon").onchange = function () { L.on = this.checked; upd(); };
    $("ltmin").oninput = $("ltmin").onchange = function () { L.tmin = +this.value; if (L.tmax < L.tmin + 0.8) L.tmax = L.tmin + 0.8; upd(); };
    $("ltmax").oninput = $("ltmax").onchange = function () { L.tmax = Math.max(+this.value, L.tmin + 0.8); upd(); };
    $("linv").onchange = function () { L.invert = this.checked; upd(); };
    $("lfr").onchange = function () { L.frame = this.checked; upd(); };
    $("lpn").onchange = function () { L.pins = this.checked; upd(); };
    $("lsrc").onchange = function () { L.src = this.value; upd(); };
    paint();
  }

  function init() {
    if (typeof THREE == "undefined" || typeof build != "function" || typeof getProj != "function") return;
    [hookBuild, hookProj, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("litho", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(paint, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    try { setInterval(paint, 2500); } catch (e) {}
    window.lithoApi = { L: L, on: function () { return L.on && TOOL == "stand"; }, grid: function () { return G; }, makeGrid: makeGrid, meshFrom: meshFrom };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
