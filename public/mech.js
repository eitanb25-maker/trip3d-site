/* mech.js (v54): אלמנטים מכאניים
   1. מעמד שולחני בזווית (30° / 45°): כל המודל מוטה סביב הקצה הקדמי של הבסיס, ומתחתיו נבנה טריז (1c_wedge) שמודפס שטוח על השולחן.
   2. זרוע לאלמנט מרחף: עמוד בגב הבסיס, זרוע אופקית עם תמוכה באלכסון 45° (כדי שתודפס בלי תמיכות) ומוט דק שמחזיק מטוס, מצנח רחף או ענן מעל נקודה במפה.
   המודול עוטף את build / getProj / putProj ואינו משנה את הקוד הראשי.
   מבנה הנתונים: M = {tilt: 0|30|45, arm: {on, type: "plane"|"glider"|"cloud", size, h, at, yaw}}. at = אינדקס סיכה, או -1 למרכז המפה.
   המודל כולו נבנה במערכת "שטוחה" (z כלפי מעלה), הזרוע מתווספת לפני ההטיה, כך שהטיה מזיזה את הכול יחד. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };

  var M = { tilt: 0, arm: { on: false, type: "plane", size: 10, h: 18, at: -1, yaw: 25 } };
  var LIFT = 1.2;   // עובי הטריז בקצה הקדמי (מ״מ)
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };

  /* ============ עזרים ============ */
  /* מוט גלילי בין שתי נקודות תלת-ממדיות */
  function rod(a, b, r, seg) {
    var d = V(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
    var g = new THREE.CylinderGeometry(r, r, L, seg || 10);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())));
    return g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  }
  var box = function (w, h, d) { return new THREE.BoxGeometry(w, h, d); };
  var sph = function (r, sx, sy, sz) { return new THREE.SphereGeometry(r, 18, 12).scale(sx || 1, sy || 1, sz || 1); };
  var area2 = function (p) { var a = 0; for (var i = 0; i < p.length; i++) { var q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
  function boundsOf(geoms) {
    var b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    geoms.forEach(function (g) { g.computeBoundingBox(); var x = g.boundingBox; b[0] = Math.min(b[0], x.min.x); b[1] = Math.min(b[1], x.min.y); b[2] = Math.min(b[2], x.min.z); b[3] = Math.max(b[3], x.max.x); b[4] = Math.max(b[4], x.max.y); b[5] = Math.max(b[5], x.max.z); });
    return b;
  }
  /* פריזמה עם תחתית שטוחה (z=0) ופאה עליונה משופעת: poly CCW, zt(p) הגובה בכל נקודה. סגורה (watertight) */
  function slab(poly, zt) {
    var pos = [], n = poly.length, P2 = poly.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), faces = THREE.ShapeUtils.triangulateShape(P2, []);
    faces.forEach(function (f) {
      var a = poly[f[0]], b = poly[f[1]], c = poly[f[2]];
      if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0) { var t = b; b = c; c = t; }
      pos.push(a[0], a[1], zt(a), b[0], b[1], zt(b), c[0], c[1], zt(c));   // עליון, פונה למעלה
      pos.push(a[0], a[1], 0, c[0], c[1], 0, b[0], b[1], 0);            // תחתון, פונה למטה
    });
    for (var i = 0; i < n; i++) {
      var p = poly[i], q = poly[(i + 1) % n];
      pos.push(p[0], p[1], 0, q[0], q[1], 0, q[0], q[1], zt(q), p[0], p[1], 0, q[0], q[1], zt(q), p[0], p[1], zt(p));
    }
    var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3)); return g;
  }

  /* ============ 1. מעמד בזווית ============ */
  function tilt(P, deg) {
    var base = P.filter(function (p) { return p.name == "1_base"; })[0];
    if (!base || !base.geoms.length) return;
    var th = deg * Math.PI / 180, y0 = boundsOf(base.geoms)[1], c = Math.cos(th), t = Math.tan(th);
    var m = new THREE.Matrix4().makeTranslation(0, y0, LIFT).multiply(new THREE.Matrix4().makeRotationX(th)).multiply(new THREE.Matrix4().makeTranslation(0, -y0, 0));
    P.forEach(function (p) { p.geoms = p.geoms.map(function (g) { var h = g.clone(); h.applyMatrix4(m); return h; }); });
    var O = outline($("shape").value); if (area2(O) < 0) O.reverse();
    // תצורת הבסיס מלמעלה אחרי ההטיה: כיווץ ב-y בגורם cos. הטריז ממלא את המרחב מתחת לבסיס המוטה
    var poly = O.map(function (q) { return [q[0], y0 + (q[1] - y0) * c]; });
    P.splice(P.indexOf(base) + 1, 0, { name: "1c_wedge", color: base.color, geoms: [slab(poly, function (q) { return LIFT + (q[1] - y0) * t; })] });
  }

  /* ============ 2. זרוע לאלמנט מרחף ============ */
  /* האלמנט נבנה סביב הראשית; מחזיר גיאומטריות. size הוא הממד האופייני במ״מ */
  function element(type, s, yaw) {
    var g = [], r1 = Math.max(1, 0.13 * s);
    if (type == "plane") {
      g.push(new THREE.CylinderGeometry(r1 * 0.8, r1, 1.7 * s, 12).rotateZ(Math.PI / 2));          // גוף
      g.push(new THREE.ConeGeometry(r1 * 0.8, 0.35 * s, 12).rotateZ(-Math.PI / 2).translate(1.02 * s, 0, 0));   // חרטום
      g.push(box(0.5 * s, 2.1 * s, Math.max(1, 0.07 * s)).translate(0.05 * s, 0, 0));              // כנפיים
      g.push(box(0.3 * s, 0.8 * s, 1).translate(-0.78 * s, 0, 0));                                  // זנב אופקי
      g.push(box(0.35 * s, 1, 0.4 * s).translate(-0.78 * s, 0, 0.2 * s));                           // זנב אנכי
    } else if (type == "glider") {
      g.push(sph(1, 1.0 * s, 0.55 * s, 0.17 * s).translate(0, 0, 0.62 * s));                        // חופה
      var pr = Math.max(1.2, 0.1 * s);
      g.push(sph(pr).translate(0, 0, 0));                                                           // טייס
      g.push(rod([0.35 * s, 0, 0.55 * s], [0, 0, pr * 0.6], 0.7, 6), rod([-0.35 * s, 0, 0.55 * s], [0, 0, pr * 0.6], 0.7, 6));   // קווי תליה
    } else {
      [[0, 0, 0, 0.55], [0.6, 0.1, -0.05, 0.42], [-0.6, 0.05, -0.05, 0.4], [0.2, -0.3, 0.2, 0.4], [-0.25, 0.3, 0.15, 0.38]].forEach(function (c) { g.push(sph(Math.max(1, c[3] * s)).translate(c[0] * s, c[1] * s, c[2] * s)); });
    }
    var m = new THREE.Matrix4().makeRotationZ(yaw * Math.PI / 180);
    if (type == "plane") m.multiply(new THREE.Matrix4().makeRotationX(0.2));   // הטיית כנף
    return g.map(function (x) { x.applyMatrix4(m); return x; });
  }
  function backPoint() {   // הנקודה בגב הבסיס (x=0) שבה העמוד נעמד
    var O = outline($("shape").value), best = -1e9;
    for (var i = 0; i < O.length; i++) {
      var a = O[i], b = O[(i + 1) % O.length];
      if ((a[0]) * (b[0]) <= 0 && a[0] != b[0]) { var y = a[1] + (0 - a[0]) / (b[0] - a[0]) * (b[1] - a[1]); if (y > best) best = y; }
    }
    return [0, best - 4.5];
  }
  function arm(P) {
    var A = M.arm, BH = +$("bh").value, GP = +$("gap").value, LH = +$("lh").value, OY = 14, pos;
    if (A.at >= 0 && pins[A.at]) { var q = toMM(pins[A.at].lon, pins[A.at].lat); pos = [q[0], q[1] + OY]; } else pos = [0, OY];
    pos = [Math.max(-34, Math.min(34, pos[0])), Math.max(-34, Math.min(34, pos[1]))];
    var surf = BH + GP + LH + (typeof relAt == "function" ? relAt(pos[0], pos[1] - OY) : 0);
    var el = element(A.type, A.size, A.yaw), b = boundsOf(el), zEl = surf + A.h - b[2];
    el.forEach(function (g) { g.translate(pos[0], pos[1], zEl); });
    var top = b[5] + zEl, zb = top + 7, bp = backPoint(), px = bp[0], py = bp[1];
    var dx = pos[0] - px, dy = pos[1] - py, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, g = [];
    g.push(new THREE.CylinderGeometry(3.6, 3.6, 1.4, 20).rotateX(Math.PI / 2).translate(px, py, BH + 0.5));   // רגל רחבה לעמוד
    g.push(rod([px, py, BH], [px, py, zb], 1.6, 12));
    g.push(sph(1.6).translate(px, py, zb));
    if (L > 3) g.push(rod([px, py, zb], [pos[0], pos[1], zb], 1.2, 10));
    g.push(sph(1.2).translate(pos[0], pos[1], zb));
    var br = Math.min(12, L * 0.8, zb - BH - 2);
    if (br > 4) g.push(rod([px, py, zb - br], [px + ux * br, py + uy * br, zb], 1.0, 8));   // תמוכה ב-45° נגד קריסה והדפסה ללא תמיכות
    g.push(rod([pos[0], pos[1], zb], [pos[0], pos[1], top - 0.3], 0.9, 8));                  // מוט דק אל האלמנט
    var i = P.findIndex(function (p) { return p.name == "3_pins"; });
    P.splice(i < 0 ? P.length : i + 1, 0, { name: "3c_arm", color: $("c_text").value, geoms: g }, { name: "3d_hover", color: $("c_pin").value, geoms: el });
  }

  function hookBuild() {
    var ob = build;
    build = function () {
      var P = ob.apply(this, arguments);
      if (TOOL != "stand") return P;
      try { if (M.arm.on && !(window.lithoApi && lithoApi.on())) arm(P); if (M.tilt) tilt(P, M.tilt); } catch (e) { console.warn("mech", e); }
      return P;
    };
  }
  function hookProj() {
    var og = getProj, op = putProj;
    getProj = function () { var o = og.apply(this, arguments); o.mech = { tilt: M.tilt, arm: Object.assign({}, M.arm) }; return o; };
    putProj = function (o) {
      var r = op.apply(this, arguments);
      try {
        var m = o && o.mech, a = m && m.arm;
        M.tilt = m && (m.tilt == 30 || m.tilt == 45) ? m.tilt : 0;
        M.arm = { on: !!(a && a.on), type: a && ["plane", "glider", "cloud"].indexOf(a.type) >= 0 ? a.type : "plane", size: Math.max(6, Math.min(22, +(a && a.size) || 10)), h: Math.max(8, Math.min(45, +(a && a.h) || 18)), at: a && +a.at >= 0 ? Math.floor(+a.at) : -1, yaw: Math.max(-180, Math.min(180, +(a && a.yaw) || 25)) };
        paint();
      } catch (e) {}
      return r;
    };
  }

  /* ============ ממשק (לשונית 3) ============ */
  function paint() {
    var b = $("mechbox"); if (!b) return;
    var A = M.arm, stand = TOOL == "stand";
    $("mtilt").value = String(M.tilt); $("marm").checked = A.on; $("mtype").value = A.type;
    $("msize").value = A.size; $("mh").value = A.h; $("myaw").value = A.yaw;
    $("msizel").textContent = A.size + " " + Lx("מ״מ", "mm"); $("mhl").textContent = A.h + " " + Lx("מ״מ", "mm"); $("myawl").textContent = A.yaw + "°";
    var sel = $("mat"), want = ["-1"].concat(pins.map(function (p, i) { return String(i); })).join(",");
    if (sel.dataset.k != want + "|" + pins.map(function (p) { return p.name; }).join("|")) {
      sel.innerHTML = '<option value="-1">' + Lx("מרכז המפה", "Map center") + "</option>" + pins.map(function (p, i) { return '<option value="' + i + '">' + (p.name || (Lx("סיכה ", "Pin ") + (i + 1))).replace(/[<>&"]/g, "") + "</option>"; }).join("");
      sel.dataset.k = want + "|" + pins.map(function (p) { return p.name; }).join("|");
    }
    sel.value = String(A.at);
    $("mstand").style.display = stand ? "none" : "";
    ["mtilt", "marm", "mtype", "msize", "mh", "myaw", "mat"].forEach(function (id) { $(id).disabled = !stand; });
    $("marmopts").style.display = A.on ? "" : "none";
    $("mtiltinfo").textContent = M.tilt ? Lx("המודל יוטה ב-" + M.tilt + "° והטריז מודפס שטוח. החריץ ל-LED אינו זמין במעמד מוטה.", "The model is tilted " + M.tilt + "° and the wedge prints flat. The LED slot isn't available on a tilted stand.") : "";
    b.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
  }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="3"]'); if (!host || $("mechbox")) return;
    var nav = host.querySelector(".uxnav"), lab = 'style="display:inline;margin:0"';
    var slider = function (id, he, en, mn, mx, st) { return '<div style="margin-top:8px"><label for="' + id + '" ' + lab + ">" + span(he, en) + '</label> <b id="' + id + 'l"></b><input type="range" id="' + id + '" min="' + mn + '" max="' + mx + '" step="' + st + '"></div>'; };
    var d = document.createElement("div"); d.id = "mechbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("📐 אלמנטים מכאניים", "📐 Mechanical elements") + "</b>"
      + '<div id="mstand" class="hint" style="display:none">' + span("זמין במעמד בלבד.", "Available for the stand only.") + "</div>"
      + '<label for="mtilt" style="margin-top:8px">' + span("מעמד שולחני בזווית", "Angled desk stand") + '</label><select id="mtilt"><option value="0">' + Lx("שטוח", "Flat") + '</option><option value="30">30°</option><option value="45">45°</option></select><div class="hint" id="mtiltinfo"></div>'
      + '<label style="display:flex;gap:6px;align-items:center;margin-top:12px"><input type="checkbox" id="marm"> ' + span("זרוע עם אלמנט מרחף מעל המפה", "Arm with a floating element above the map") + "</label>"
      + '<div id="marmopts"><label for="mtype">' + span("האלמנט", "Element") + '</label><select id="mtype"><option value="plane">' + Lx("✈️ מטוס", "✈️ Plane") + '</option><option value="glider">' + Lx("🪂 מצנח רחף", "🪂 Paraglider") + '</option><option value="cloud">' + Lx("☁️ ענן", "☁️ Cloud") + "</option></select>"
      + '<label for="mat">' + span("מעל", "Above") + '</label><select id="mat"></select>'
      + slider("msize", "גודל", "Size", 6, 22, 1) + slider("mh", "גובה מעל המפה", "Height above the map", 8, 45, 1) + slider("myaw", "כיוון", "Heading", -180, 180, 5)
      + '<p class="hint">' + span("האלמנט הדק מודפס בצבע נפרד. מומלץ להדפיס עם תמיכות מתחת לכנפיים או לענן.", "The thin element prints as its own color. Supports under the wings or cloud are recommended.") + "</p></div>";
    host.insertBefore(d, nav || null);
    var upd = function () { paint(); update(); };
    $("mtilt").onchange = function () { M.tilt = +this.value; upd(); };
    $("marm").onchange = function () { M.arm.on = this.checked; upd(); };
    $("mtype").onchange = function () { M.arm.type = this.value; upd(); };
    $("mat").onchange = function () { M.arm.at = +this.value; upd(); };
    [["msize", "size"], ["mh", "h"], ["myaw", "yaw"]].forEach(function (x) { $(x[0]).oninput = $(x[0]).onchange = function () { M.arm[x[1]] = +this.value; upd(); }; });
    paint();
  }

  function init() {
    if (typeof THREE == "undefined" || typeof build != "function" || typeof getProj != "function") return;
    [hookBuild, hookProj, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("mech", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(paint, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    try { setInterval(paint, 2500); } catch (e) {}
    window.mechApi = { M: M, tilted: function () { return !!M.tilt && TOOL == "stand"; }, tilt: tilt, arm: arm, element: element, slab: slab };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
