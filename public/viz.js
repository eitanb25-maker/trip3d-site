/* viz.js (v48): ויזואליזציה מתקדמת בתצוגה המקדימה
   1. חומרי PBR (מט, מבריק, משי, שיש, עץ, שקוף)
   2. סימולציית בנאי שכבות (חיתוך לפי גובה, כמו בסלייסר)
   3. גרירת סיכות ישירות על המודל התלת-ממדי
   המודול נטען אחרי הסקריפט הראשי, עוטף את render/build/showSize ולא משנה את הגיאומטריה או את קבצי הייצוא. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return typeof LANG !== "undefined" && LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- מצב ---------- */
  var ST = {
    mat: "matte",       // מפתח ב-MATS
    frac: 1,            // 0..1 – כמה מהגובה נבנה
    lh: 0.2,            // גובה שכבה (מ״מ) להצגת מספר שכבה
    zmax: 0,            // גובה המודל ביחידות המודל (לפני קנה מידה)
    scale: 1,           // יחס הקטנה להדפסה (scaleFor)
    names: [],          // שמות החלקים לפי סדר הרשתות ב-model
    drag: true          // גרירת סיכות פעילה
  };
  var plane = null, localPlane = null, envTex = null, texCache = {}, matCache = {}, playT = 0;

  /* ---------- 1. חומרים ---------- */
  /* rough/metal/clear: פרמטרי PBR; tex: שם מרקם פרוצדורלי; alpha: שקיפות */
  var MATS = {
    matte:  { he: "PLA מט",          en: "Matte PLA" },
    gloss:  { he: "מבריק",           en: "Glossy",        rough: 0.16, metal: 0.0, clear: 1 },
    silk:   { he: "משי (Silk)",      en: "Silk",          rough: 0.30, metal: 0.55 },
    marble: { he: "שיש",             en: "Marble",        rough: 0.35, metal: 0.0, clear: 0.6, tex: "marble" },
    wood:   { he: "עץ",              en: "Wood",          rough: 0.75, metal: 0.0, tex: "wood" },
    clear:  { he: "שקוף",            en: "Translucent",   rough: 0.08, metal: 0.0, clear: 1, alpha: 0.5 }
  };

  /* מרקם פרוצדורלי בגווני אפור בהיר; צבע החלק מוכפל עליו ולכן הצבע שבחר המשתמש נשמר */
  function makeTexture(kind) {
    if (texCache[kind]) return texCache[kind];
    var c = document.createElement("canvas"), W = 256; c.width = c.height = W;
    var g = c.getContext("2d"), seed = kind == "wood" ? 7 : 3;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    if (kind == "wood") {
      g.fillStyle = "#e6d3b8"; g.fillRect(0, 0, W, W);
      for (var y = 0; y < W; y++) {
        var v = 0.5 + 0.5 * Math.sin(y * 0.55 + Math.sin(y * 0.09) * 3) * Math.sin(y * 0.13 + 1);
        g.fillStyle = "rgba(90,55,25," + (0.06 + 0.2 * v * v).toFixed(3) + ")"; g.fillRect(0, y, W, 1);
      }
      for (var i = 0; i < 90; i++) { g.fillStyle = "rgba(80,50,20," + (0.04 + rnd() * 0.08).toFixed(3) + ")"; g.fillRect(rnd() * W, rnd() * W, 8 + rnd() * 60, 1); }
    } else {
      g.fillStyle = "#f2f2f2"; g.fillRect(0, 0, W, W);
      for (var n = 0; n < 7; n++) {
        var x = rnd() * W, yy = rnd() * W, a = rnd() * Math.PI * 2;
        g.strokeStyle = "rgba(90,95,105," + (0.15 + rnd() * 0.25).toFixed(2) + ")"; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); g.moveTo(x, yy);
        for (var s = 0; s < 40; s++) { a += (rnd() - 0.5) * 0.9; x += Math.cos(a) * 8; yy += Math.sin(a) * 8; g.lineTo(x, yy); }
        g.stroke();
      }
    }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    texCache[kind] = t; return t;
  }

  /* מרקם סביבה פשוט (שיפוע + "חלונות") כדי שמתכת וברק יהיו מציאותיים */
  function ensureEnv() {
    if (envTex || typeof THREE.PMREMGenerator == "undefined") return envTex;
    try {
      var c = document.createElement("canvas"); c.width = 256; c.height = 128;
      var g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, "#8d9bb5"); gr.addColorStop(0.5, "#b9bcc2"); gr.addColorStop(1, "#3d3a35");
      g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
      g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(30, 20, 40, 26); g.fillRect(150, 14, 50, 30);
      var t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
      var pm = new THREE.PMREMGenerator(R); envTex = pm.fromEquirectangular(t).texture; pm.dispose && pm.dispose(); t.dispose && t.dispose();
    } catch (e) { envTex = null; }
    return envTex;
  }

  /* UV לפי כיוון הפאה הדומיננטי (מיפוי טריפלנרי פשוט) – לגיאומטריה אין UV משלה */
  function ensureUV(geo) {
    if (geo.attributes.uv) return;
    var p = geo.attributes.position.array, n = p.length / 3, uv = new Float32Array(n * 2), K = 1 / 40;
    for (var i = 0; i + 2 < n; i += 3) {
      var ax = p[(i + 1) * 3] - p[i * 3], ay = p[(i + 1) * 3 + 1] - p[i * 3 + 1], az = p[(i + 1) * 3 + 2] - p[i * 3 + 2],
          bx = p[(i + 2) * 3] - p[i * 3], by = p[(i + 2) * 3 + 1] - p[i * 3 + 1], bz = p[(i + 2) * 3 + 2] - p[i * 3 + 2],
          nx = Math.abs(ay * bz - az * by), ny = Math.abs(az * bx - ax * bz), nz = Math.abs(ax * by - ay * bx);
      for (var k = 0; k < 3; k++) {
        var o = (i + k) * 3, x = p[o], y = p[o + 1], z = p[o + 2], u, v;
        if (nz >= nx && nz >= ny) { u = x; v = y; } else if (nx >= ny) { u = y; v = z; } else { u = x; v = z; }
        uv[(i + k) * 2] = u * K; uv[(i + k) * 2 + 1] = v * K;
      }
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  }

  function clipList() { return plane ? [plane] : []; }

  function matFor(mode, color) {
    var key = mode + "|" + color, d = MATS[mode];
    if (matCache[key]) return matCache[key];
    var m;
    if (mode == "matte" || !d) m = new THREE.MeshLambertMaterial({ color: color, side: THREE.DoubleSide });
    else {
      var P = { color: color, roughness: d.rough, metalness: d.metal || 0, side: THREE.DoubleSide };
      if (d.tex) { P.map = makeTexture(d.tex); }
      if (d.alpha) { P.transparent = true; P.opacity = d.alpha; P.depthWrite = false; }
      m = d.clear && THREE.MeshPhysicalMaterial ? new THREE.MeshPhysicalMaterial(Object.assign(P, { clearcoat: d.clear, clearcoatRoughness: 0.08 })) : new THREE.MeshStandardMaterial(P);
      var e = ensureEnv(); if (e) { m.envMap = e; m.envMapIntensity = mode == "silk" ? 0.7 : mode == "gloss" || mode == "clear" ? 0.45 : 0.25; }
    }
    matCache[key] = m; return m;
  }

  function applyMaterials() {
    if (typeof model == "undefined" || !model) return;
    model.children.forEach(function (mesh) {
      if (!mesh.geometry || mesh.userData.ghost) return;
      var orig = mesh.userData.origMat || (mesh.userData.origMat = mesh.material), col = orig.color && orig.color.getHex ? orig.color.getHex() : (orig.color || 0xcccccc);
      if (ST.mat != "matte" && MATS[ST.mat].tex) ensureUV(mesh.geometry);
      mesh.material = matFor(ST.mat, col);
      mesh.material.clippingPlanes = clipList();
    });
  }

  /* ---------- 2. בנאי שכבות ---------- */
  function measure() {
    var z = 0;
    if (typeof model != "undefined" && model) model.children.forEach(function (m) {
      if (!m.geometry || m.userData.ghost) return;
      var g = m.geometry; if (!g.boundingBox && g.computeBoundingBox) g.computeBoundingBox();
      if (g.boundingBox) z = Math.max(z, g.boundingBox.max.z);
    });
    ST.zmax = z;
  }
  function layerInfo() {
    var H = ST.zmax * ST.scale, total = Math.max(1, Math.round(H / ST.lh)), cur = Math.max(0, Math.min(total, Math.round(ST.frac * total)));
    return { total: total, cur: cur, heightMM: H, curMM: ST.frac * H };
  }
  function updatePlane() {
    if (typeof model == "undefined" || !model || !plane) return;
    // חיתוך במרחב המודל (z למעלה): שומרים נקודות עם z <= h; ממירים למרחב העולם בכל פריים כי המשתמש מסובב את המודל
    var h = ST.frac >= 0.999 ? ST.zmax + 10 : ST.zmax * ST.frac;
    localPlane.constant = h;
    model.updateMatrixWorld(true);
    plane.copy(localPlane).applyMatrix4(model.matrixWorld);
  }
  function paintLayerLabel() {
    var el = $("vlayl"); if (!el) return;
    var i = layerInfo();
    el.textContent = i.cur >= i.total ? Lx("הושלם: ", "Complete: ") + i.total + Lx(" שכבות", " layers") + " · " + i.heightMM.toFixed(1) + Lx(" מ״מ", " mm")
      : Lx("שכבה ", "Layer ") + i.cur + Lx(" מתוך ", " of ") + i.total + " · " + i.curMM.toFixed(1) + Lx(" מ״מ", " mm");
  }

  /* ---------- 3. גרירת סיכות ---------- */
  var ray = null, ndc = null, dragIdx = -1, ghost = null, dragMoved = false, rafPending = false, lastEv = null;
  function oy() { try { return TOOL == "stand" ? 14 : 0; } catch (e) { return 0; } }
  function castAt(e, wantPins) {
    if (!ray) { ray = new THREE.Raycaster(); ndc = new THREE.Vector2(); }
    var vc = $("view"), r = vc.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    model.updateMatrixWorld(true);
    var objs = model.children.filter(function (m, i) {
      if (!m.geometry || m.userData.ghost) return false;
      var k = ""; try { k = keyOf(ST.names[i] || ""); } catch (x) {}
      return wantPins ? ST.names[i] == "3_pins" : (k == "base" || k == "land" || k == "relief" || k == "water");
    });
    var hit = ray.intersectObjects(objs, false)[0];
    if (!hit) return null;
    var lp = model.worldToLocal(hit.point.clone());
    return { x: lp.x, y: lp.y - oy(), z: lp.z, point: lp };
  }
  function nearestPin(mx, my) {
    var best = -1, bd = 1e9, lim = 7;
    pins.forEach(function (p, i) {
      var q = toMM(p.lon, p.lat), d = Math.hypot(q[0] - mx, q[1] - my);
      if (d < bd) { bd = d; best = i; }
    });
    return bd <= lim ? best : -1;
  }
  function onDown(e) {
    if (!ST.drag || e.button > 0 || typeof model == "undefined" || !model || !pins.length) return;
    var vc = $("view"), h;
    try { h = castAt(e, true); } catch (x) { return; }
    if (!h) return;
    var i = nearestPin(h.x, h.y);
    if (i < 0) return;
    e.stopImmediatePropagation(); e.preventDefault();
    dragIdx = i; dragMoved = false; auto = false;
    try { vc.setPointerCapture(e.pointerId); } catch (x) {}
    if (!ghost) { ghost = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd400 })); ghost.userData.ghost = true; }
    model.add(ghost); ghost.position.set(h.point.x, h.point.y, h.point.z + 2);
    vc.style.cursor = "grabbing";
  }
  function moveTo(e) {
    rafPending = false; if (dragIdx < 0 || !lastEv) return;
    var h; try { h = castAt(lastEv, false); } catch (x) { return; }
    if (!h || Math.abs(h.x) > 36 || Math.abs(h.y) > 36) return;
    var ll = fromMM(h.x, h.y);
    pins[dragIdx].lon = ll[0]; pins[dragIdx].lat = ll[1]; dragMoved = true;
    ghost.position.set(h.point.x, h.point.y, h.point.z + 2);
    try { drawMap(); } catch (x) {}
  }
  function onMove(e) {
    var vc = $("view");
    if (dragIdx < 0) {
      // סמן "יד" כשמרחפים מעל סיכה (בדיקה עדינה: רק כשיש סיכות וגרירה פעילה)
      return;
    }
    e.stopImmediatePropagation(); lastEv = e;
    if (!rafPending) { rafPending = true; requestAnimationFrame(moveTo); }
  }
  function onUp(e) {
    if (dragIdx < 0) return;
    e.stopImmediatePropagation();
    var vc = $("view"); vc.style.cursor = "";
    try { vc.releasePointerCapture(e.pointerId); } catch (x) {}
    if (ghost && model) model.remove(ghost);
    var moved = dragMoved; dragIdx = -1; dragMoved = false;
    if (moved) { try { renderPins(); } catch (x) {} update(); }
  }

  /* ---------- ממשק ---------- */
  function buildUI() {
    var vdef = $("vdef"); if (!vdef || $("vizbox")) return;
    var row = vdef.parentNode, d = document.createElement("div"); d.id = "vizbox"; d.className = "uxsum";
    var opts = Object.keys(MATS).map(function (k) { return '<option value="' + k + '" data-he="' + MATS[k].he + '" data-en="' + MATS[k].en + '">' + MATS[k].he + "</option>"; }).join("");
    d.innerHTML = "<b>" + span("🎨 חומר ושכבות", "🎨 Material and layers") + "</b>"
      + '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px"><label for="vmat">' + span("גימור:", "Finish:") + '</label><select id="vmat">' + opts + "</select></div>"
      + '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center"><button type="button" id="vplay" style="margin:0">▶ ' + span("הדמיית הדפסה", "Print simulation") + "</button>"
      + '<input type="range" id="vlay" min="0" max="1000" value="1000" style="flex:1;min-width:140px" aria-label="' + Lx("התקדמות ההדפסה", "Print progress") + '">'
      + '<select id="vlh" aria-label="' + Lx("גובה שכבה", "Layer height") + '"><option value="0.12">0.12</option><option value="0.16">0.16</option><option value="0.2" selected>0.2</option><option value="0.28">0.28</option></select></div>'
      + '<div class="hint" id="vlayl" role="status"></div>'
      + '<label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="vdrag" checked> ' + span("גרירת סיכות על המודל (לחצו על סיכה וגררו)", "Drag pins on the model (press a pin and drag)") + "</label>";
    row.parentNode.insertBefore(d, row.nextSibling);
    var low = false; try { low = !!LOWQ; } catch (e) {}
    $("vmat").onchange = function () { ST.mat = this.value; store.set("trip3d_vmat", ST.mat); sceneEnv(); applyMaterials(); };
    $("vlay").oninput = function () { ST.frac = this.value / 1000; paintLayerLabel(); };
    $("vlh").onchange = function () { ST.lh = +this.value; paintLayerLabel(); };
    $("vdrag").onchange = function () { ST.drag = this.checked; };
    $("vplay").onclick = togglePlay;
    var saved = store.get("trip3d_vmat"); if (saved && MATS[saved]) { ST.mat = saved; $("vmat").value = saved; }
    if (low) { $("vmat").disabled = true; $("vmat").title = Lx("במצב מהיר הגימורים כבויים", "Finishes are off in fast mode"); ST.mat = "matte"; $("vmat").value = "matte"; }
    var vc = $("view"); vc.addEventListener("pointerdown", onDown, true); vc.addEventListener("pointermove", onMove, true); vc.addEventListener("pointerup", onUp, true); vc.addEventListener("pointercancel", onUp, true);
    paintLayerLabel();
  }
  function relabel() {
    document.querySelectorAll("#vizbox [data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
    paintLayerLabel();
  }
  function togglePlay() {
    var b = $("vplay");
    if (playT) { clearInterval(playT); playT = 0; b.firstChild.nodeValue = "▶ "; return; }
    if (ST.frac >= 0.999) { ST.frac = 0; $("vlay").value = 0; }
    b.firstChild.nodeValue = "⏸ ";
    playT = setInterval(function () {
      ST.frac = Math.min(1, ST.frac + 1 / 220); $("vlay").value = Math.round(ST.frac * 1000); paintLayerLabel();
      if (ST.frac >= 1) { clearInterval(playT); playT = 0; b.firstChild.nodeValue = "▶ "; }
    }, 40);
  }
  function sceneEnv() { try { sc.environment = ST.mat == "matte" ? null : ensureEnv(); } catch (e) {} }

  /* ---------- חיבור לאתר ---------- */
  function hooks() {
    if (typeof THREE == "undefined" || typeof render != "function") return false;
    plane = new THREE.Plane(); localPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6);
    try { R.localClippingEnabled = true; } catch (e) {}
    var ob = build, os = showSize, orr = render;
    build = function () { var P = ob.apply(this, arguments); try { ST.names = P.filter(function (p) { return p.geoms.length; }).map(function (p) { return p.name; }); } catch (e) {} return P; };
    showSize = function (P) { try { ST.scale = scaleFor(P).sc; } catch (e) {} return os.apply(this, arguments); };
    render = function () {
      var r = orr.apply(this, arguments);
      try { model.children.forEach(function (m, i) { m.userData.part = ST.names[i]; }); measure(); sceneEnv(); applyMaterials(); paintLayerLabel(); } catch (e) { console.warn("viz", e); }
      return r;
    };
    var rr = R.render.bind(R);
    R.render = function (s, c) { try { updatePlane(); } catch (e) {} return rr(s, c); };
    return true;
  }

  function init() {
    try { if (!hooks()) return; buildUI(); } catch (e) { console.warn("viz", e); return; }
    try { new MutationObserver(function () { setTimeout(relabel, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); var lg = $("lg"); if (lg) lg.addEventListener("click", function () { setTimeout(relabel, 120); }); } catch (e) {}
    window.vizApi = { state: ST, layerInfo: layerInfo, setMat: function (k) { if (MATS[k]) { ST.mat = k; sceneEnv(); applyMaterials(); } }, setFrac: function (f) { ST.frac = f; paintLayerLabel(); }, mats: MATS, nearestPin: nearestPin, castAt: castAt, matFor: matFor };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
