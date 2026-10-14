/* trips.js (v56): מפת טיולים מרובה (Multi-Trip Layering)
   מציג עד 4 מסלולים מתקופות שונות על אותה מפה, כל אחד בצבע, בסגנון קו (רציף / מקווקו / נקודות), בעובי ובגובה משלו.
   מקורות: קובץ GPX או הסיכות הנוכחיות. כל מסלול הוא חלק נפרד במודל (3e_trip1..4) בצבע שלו, ומצויר גם על המפה הדו-ממדית עם מקרא.
   המודול עוטף את build / drawMap / getProj / putProj ואינו משנה את הקוד הראשי.
   מבנה הנתונים: TR = [{id, name, color, style: "solid"|"dash"|"dot", lift: 0|1|2, w: "thin"|"mid"|"thick", on, segs: [[[lon, lat], ...], ...]}] */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };
  var msg = function (t) { var m = $("msg"); if (m) m.textContent = t; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var MAX = 4, COLORS = ["#e53935", "#1e88e5", "#43a047", "#fb8c00"], WID = { thin: 1.0, mid: 1.5, thick: 2.2 };
  var TR = [], seq = 0;

  /* ============ נתונים ============ */
  function decimate(segs, max) {   // מקטין את מספר הנקודות בכל מקטע (בקפיצות שוות) כדי לשמור על קישור שיתוף ובנייה קלים
    var tot = segs.reduce(function (a, s) { return a + s.length; }, 0);
    if (tot <= max) return segs;
    var k = Math.ceil(tot / max);
    return segs.map(function (s) { var o = s.filter(function (p, i) { return i % k == 0 || i == s.length - 1; }); return o; }).filter(function (s) { return s.length > 1; });
  }
  function parseGpx(text) {
    var doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) return null;
    var segs = [], grab = function (nodes) {
      var pts = []; Array.prototype.forEach.call(nodes, function (n) { var la = parseFloat(n.getAttribute("lat")), lo = parseFloat(n.getAttribute("lon")); if (isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) pts.push([+lo.toFixed(5), +la.toFixed(5)]); });
      if (pts.length > 1) segs.push(pts);
    };
    Array.prototype.forEach.call(doc.getElementsByTagName("trkseg"), function (s) { grab(s.getElementsByTagName("trkpt")); });
    if (!segs.length) Array.prototype.forEach.call(doc.getElementsByTagName("rte"), function (s) { grab(s.getElementsByTagName("rtept")); });
    var nm = doc.getElementsByTagName("name")[0];
    return segs.length ? { segs: decimate(segs, 600), name: nm ? (nm.textContent || "").trim().slice(0, 30) : "" } : null;
  }
  function addLayer(segs, name) {
    if (TR.length >= MAX) { msg(Lx("אפשר עד " + MAX + " מסלולים", "Up to " + MAX + " trips")); return null; }
    var used = TR.map(function (t) { return t.color; }), color = COLORS.filter(function (c) { return used.indexOf(c) < 0; })[0] || COLORS[0];
    var t = { id: ++seq, name: name || (Lx("טיול ", "Trip ") + (TR.length + 1)), color: color, style: TR.length % 3 == 1 ? "dash" : TR.length % 3 == 2 ? "dot" : "solid", lift: TR.length % 3, w: "mid", on: true, segs: segs };
    TR.push(t); paint(); update(); return t;
  }
  var inMap = function (lo, la) { var m = toMM(lo, la); return Math.abs(m[0]) <= 36 && Math.abs(m[1]) <= 36; };
  function outside(t) { var n = 0, tot = 0; t.segs.forEach(function (s) { s.forEach(function (p) { tot++; if (!inMap(p[0], p[1])) n++; }); }); return { n: n, tot: tot }; }

  /* ============ בניית גיאומטריה ============ */
  function layerGeoms(t) {
    var BH = +$("bh").value, GP = +$("gap").value, LH = +$("lh").value, OY = 14, z0 = BH + GP + LH, w = WID[t.w] || 1.5, h = 0.8 + (+t.lift || 0) * 1.2, g = [], carry = 0;
    t.segs.forEach(function (s) {
      carry = 0;
      for (var i = 1; i < s.length; i++) {
        var a = toMM(s[i - 1][0], s[i - 1][1]), b = toMM(s[i][0], s[i][1]);
        if (Math.max(Math.abs(a[0]), Math.abs(a[1]), Math.abs(b[0]), Math.abs(b[1])) > 38 && (Math.abs(a[0]) > 38 || Math.abs(a[1]) > 38) && (Math.abs(b[0]) > 38 || Math.abs(b[1]) > 38)) continue;
        var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 0.05) continue;
        if (t.style == "dot") {
          var pos = carry; while (pos < L) { var k = pos / L, x = a[0] + dx * k, y = a[1] + dy * k; if (Math.abs(x) <= 36 && Math.abs(y) <= 36) { var zb = z0 + relAt(x, y); g.push(new THREE.CylinderGeometry(w * 0.7, w * 0.7, h, 10).rotateX(Math.PI / 2).translate(x, y + OY, zb + h / 2)); } pos += 2.6; }
          carry = pos - L; continue;
        }
        var n = Math.max(1, Math.ceil(L / 1.5));
        for (var j = 0; j < n; j++) {
          if (t.style == "dash" && (j % 4) >= 2) continue;
          var p0 = [a[0] + dx * j / n, a[1] + dy * j / n], p1 = [a[0] + dx * (j + 1) / n, a[1] + dy * (j + 1) / n];
          if (Math.abs(p0[0]) > 36 || Math.abs(p0[1]) > 36 || Math.abs(p1[0]) > 36 || Math.abs(p1[1]) > 36) continue;
          var zb2 = z0 + Math.max(relAt(p0[0], p0[1]), relAt(p1[0], p1[1])), ex = p1[0] - p0[0], ey = p1[1] - p0[1], l = Math.hypot(ex, ey);
          g.push(new THREE.BoxGeometry(l + 0.3, w, h).rotateZ(Math.atan2(ey, ex)).translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + OY, zb2 + h / 2));
        }
      }
    });
    return g;
  }
  function hookBuild() {
    var ob = build;
    build = function () {
      var P = ob.apply(this, arguments);
      if (TOOL != "stand" || !TR.length || (window.lithoApi && lithoApi.on())) return P;
      try {
        var i = P.findIndex(function (p) { return p.name == "3_pins"; }), add = [];
        TR.forEach(function (t, k) { if (t.on) add.push({ name: "3e_trip" + (k + 1), color: t.color, geoms: layerGeoms(t) }); });
        P.splice(i < 0 ? P.length : i + 1, 0, ...add);
      } catch (e) { console.warn("trips", e); }
      return P;
    };
  }
  /* ============ מפה דו-ממדית ומקרא ============ */
  function hookMap() {
    var od = drawMap;
    drawMap = function () {
      var r = od.apply(this, arguments);
      try {
        var vis = TR.filter(function (t) { return t.on; }); if (!vis.length) return r;
        mx.save(); mx.lineCap = "round"; mx.lineJoin = "round";
        vis.forEach(function (t) {
          mx.strokeStyle = t.color; mx.lineWidth = 1.5 * (WID[t.w] || 1.5); mx.setLineDash(t.style == "dash" ? [8, 6] : t.style == "dot" ? [1, 7] : []);
          t.segs.forEach(function (s) { mx.beginPath(); s.forEach(function (p, i) { var m = toMM(p[0], p[1]); mx[i ? "lineTo" : "moveTo"](260 + m[0] * S, 260 - m[1] * S); }); mx.stroke(); });
        });
        mx.setLineDash([]); mx.font = "bold 12px sans-serif"; mx.textBaseline = "middle";
        vis.forEach(function (t, i) { var y = 18 + i * 18; mx.fillStyle = "rgba(255,255,255,.8)"; mx.fillRect(8, y - 8, 14 + mx.measureText(t.name).width + 30, 16); mx.strokeStyle = t.color; mx.lineWidth = 3; mx.setLineDash(t.style == "dash" ? [5, 3] : t.style == "dot" ? [1, 4] : []); mx.beginPath(); mx.moveTo(12, y); mx.lineTo(34, y); mx.stroke(); mx.setLineDash([]); mx.fillStyle = "#222"; mx.textAlign = "left"; mx.fillText(t.name, 40, y); });
        mx.restore();
      } catch (e) { console.warn("trips map", e); }
      return r;
    };
  }
  function hookProj() {
    var og = getProj, op = putProj;
    getProj = function () { var o = og.apply(this, arguments); o.trips = TR.map(function (t) { return { name: t.name, color: t.color, style: t.style, lift: t.lift, w: t.w, on: t.on, segs: decimate(t.segs, 250) }; }); return o; };
    putProj = function (o) {
      var r = op.apply(this, arguments);
      try {
        TR = ((o && o.trips) || []).slice(0, MAX).map(function (t) {
          var segs = (t.segs || []).map(function (s) { return (s || []).filter(function (p) { return Array.isArray(p) && isFinite(p[0]) && isFinite(p[1]); }).map(function (p) { return [+p[0], +p[1]]; }); }).filter(function (s) { return s.length > 1; });
          return { id: ++seq, name: String(t.name || "").slice(0, 30) || Lx("טיול", "Trip"), color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : COLORS[0], style: ["solid", "dash", "dot"].indexOf(t.style) >= 0 ? t.style : "solid", lift: [0, 1, 2].indexOf(+t.lift) >= 0 ? +t.lift : 0, w: WID[t.w] ? t.w : "mid", on: t.on !== false, segs: segs };
        }).filter(function (t) { return t.segs.length; });
        paint(); drawMap();
      } catch (e) { console.warn("trips put", e); }
      return r;
    };
  }

  /* ============ ממשק (לשונית 2) ============ */
  function paint() {
    var host = $("tripsbox"); if (!host) return;
    var list = $("tripslist");
    list.innerHTML = TR.map(function (t, i) {
      var o = outside(t), warn = o.n ? '<div class="hint" style="color:#b45309">' + Lx(o.n + " מתוך " + o.tot + " נקודות מחוץ למפה הנוכחית", o.n + " of " + o.tot + " points are outside the current map") + "</div>" : "";
      var sel = function (cls, opts, val) { return '<select class="' + cls + '" data-i="' + i + '" style="width:auto;min-width:0">' + opts.map(function (x) { return '<option value="' + x[0] + '"' + (String(x[0]) == String(val) ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select>"; };
      return '<div class="trow" style="border:1px solid var(--bd,#ddd);border-radius:10px;padding:8px;margin-top:8px">'
        + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input type="color" class="tc" data-i="' + i + '" value="' + t.color + '" style="width:40px;height:34px;padding:0" aria-label="' + Lx("צבע", "Color") + '">'
        + '<input type="text" class="tn" data-i="' + i + '" value="' + esc(t.name) + '" maxlength="30" style="flex:1;min-width:90px" aria-label="' + Lx("שם המסלול", "Trip name") + '">'
        + '<label style="display:flex;gap:4px;align-items:center;margin:0"><input type="checkbox" class="to" data-i="' + i + '"' + (t.on ? " checked" : "") + "> " + Lx("הצג", "Show") + "</label>"
        + '<button type="button" class="tx" data-i="' + i + '" style="width:auto;margin:0;min-height:32px;padding:0 10px" aria-label="' + Lx("מחיקה", "Delete") + '">✕</button></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'
        + sel("ts", [["solid", Lx("קו רציף", "Solid")], ["dash", Lx("מקווקו", "Dashed")], ["dot", Lx("נקודות", "Dotted")]], t.style)
        + sel("tl", [[0, Lx("גובה נמוך", "Low")], [1, Lx("גובה בינוני", "Medium")], [2, Lx("גובה רב", "High")]], t.lift)
        + sel("tw", [["thin", Lx("דק", "Thin")], ["mid", Lx("בינוני", "Medium")], ["thick", Lx("עבה", "Thick")]], t.w) + "</div>" + warn + "</div>";
    }).join("");
    $("tripsadd").disabled = TR.length >= MAX; $("tripspins").disabled = TR.length >= MAX || pins.length < 2;
    var upd = function (fn) { return function () { var t = TR[+this.dataset.i]; if (!t) return; fn.call(this, t); drawMap(); update(); }; };
    list.querySelectorAll(".tc").forEach(function (e) { e.oninput = upd(function (t) { t.color = this.value; }); });
    list.querySelectorAll(".tn").forEach(function (e) { e.oninput = upd(function (t) { t.name = this.value.slice(0, 30); }); });
    list.querySelectorAll(".to").forEach(function (e) { e.onchange = upd(function (t) { t.on = this.checked; }); });
    list.querySelectorAll(".ts").forEach(function (e) { e.onchange = upd(function (t) { t.style = this.value; }); });
    list.querySelectorAll(".tl").forEach(function (e) { e.onchange = upd(function (t) { t.lift = +this.value; }); });
    list.querySelectorAll(".tw").forEach(function (e) { e.onchange = upd(function (t) { t.w = this.value; }); });
    list.querySelectorAll(".tx").forEach(function (e) { e.onclick = function () { TR.splice(+this.dataset.i, 1); paint(); drawMap(); update(); }; });
    host.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
  }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="2"]'); if (!host || $("tripsbox")) return;
    var nav = host.querySelector(".uxnav");
    var d = document.createElement("div"); d.id = "tripsbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("🗺️ כמה טיולים על אותה מפה", "🗺️ Several trips on one map") + "</b>"
      + '<p class="hint" style="margin:4px 0 0">' + span("מוסיפים מסלולים מתקופות שונות, וכל אחד מקבל צבע, סגנון קו וגובה משלו. כל מסלול מודפס כחלק נפרד בצבע שלו.", "Add routes from different periods, each with its own color, line style and height. Each route prints as its own part in its color.") + "</p>"
      + '<div id="tripslist"></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><label class="btn" style="display:inline-flex;align-items:center;margin:0;padding:8px 14px;border-radius:10px;background:var(--ac,#2b6cb0);color:#fff;cursor:pointer" id="tripsaddl">' + span("➕ קובץ GPX", "➕ GPX file") + '<input type="file" id="tripsadd" accept=".gpx,application/gpx+xml,text/xml,application/xml" style="display:none"></label>'
      + '<button type="button" id="tripspins" style="margin:0">' + span("➕ מהסיכות הנוכחיות", "➕ From current pins") + "</button></div>"
      + '<div class="hint" id="tripsmsg" role="status"></div>';
    host.insertBefore(d, nav || null);
    $("tripsadd").onchange = function () {
      var f = this.files && this.files[0]; this.value = ""; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { var r = parseGpx(String(rd.result)); if (!r) { $("tripsmsg").textContent = Lx("לא נמצאו נקודות בקובץ ה-GPX", "No points found in the GPX file"); return; } var t = addLayer(r.segs, r.name || f.name.replace(/\.[^.]+$/, "").slice(0, 30)); if (t) $("tripsmsg").textContent = Lx("נוסף מסלול עם " + r.segs.reduce(function (a, s) { return a + s.length; }, 0) + " נקודות", "Added a route with " + r.segs.reduce(function (a, s) { return a + s.length; }, 0) + " points"); };
      rd.onerror = function () { $("tripsmsg").textContent = Lx("קריאת הקובץ נכשלה", "Couldn't read the file"); };
      rd.readAsText(f);
    };
    $("tripspins").onclick = function () {
      if (pins.length < 2) return;
      var t = addLayer([pins.map(function (p) { return [+p.lon.toFixed(5), +p.lat.toFixed(5)]; })], Lx("הסיכות ", "Pins ") + (TR.length + 1));
      if (t) $("tripsmsg").textContent = Lx("הועתקו " + pins.length + " סיכות כמסלול. אפשר עכשיו לשנות את הסיכות למסלול הבא.", "Copied " + pins.length + " pins as a route. You can now change the pins for the next route.");
    };
    paint();
  }
  function init() {
    if (typeof THREE == "undefined" || typeof build != "function" || typeof drawMap != "function") return;
    [hookBuild, hookMap, hookProj, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("trips", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(paint, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    try { setInterval(function () { var h = $("tripsbox"); if (h && TR.length) { var n = TR.map(function (t) { return outside(t).n; }).join(","); if (n != h.dataset.o) { h.dataset.o = n; paint(); } } }, 2500); } catch (e) {}
    window.tripsApi = { TR: function () { return TR; }, parseGpx: parseGpx, addLayer: addLayer, layerGeoms: layerGeoms };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
