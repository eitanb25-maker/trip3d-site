/* terrain.js (v51): תאורת שמש וצללים + הקצנת טופוגרפיה
   1. סימולטור תאורה: זווית שמש (גובה מעל האופק וכיוון), תפאורות יום/לילה, וצללים של ההרים והסיכות.
      האור "מחובר" למודל (לא למצלמה), כך שכיוון הצל נשאר קבוע ביחס למפה כשמסובבים: צפון למעלה, כמו בטבע.
   2. סליידר הקצנה אנכית של ההרים (×0.25 עד ×3) מעל גובה ההרים שנקבע בשכבת ההרים הקיימת.
   לא משנה את קבצי ההדפסה בתצוגת התאורה; ההקצנה כן משפיעה על הגובה המודפס (היא חלק מהמודל). */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return typeof LANG !== "undefined" && LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };
  var rad = function (d) { return d * Math.PI / 180; };

  /* מצב התאורה. el: גובה מעל האופק (מעלות; שלילי = לילה), az: כיוון מהצפון עם כיוון השעון */
  var SUN = { on: false, shadows: true, el: 45, az: 135 };
  var PRESETS = [
    { id: "dawn",   he: "🌅 זריחה",  en: "🌅 Sunrise", el: 8,   az: 90 },
    { id: "noon",   he: "☀️ צהריים", en: "☀️ Noon",    el: 68,  az: 180 },
    { id: "dusk",   he: "🌇 שקיעה",  en: "🌇 Sunset",  el: 6,   az: 270 },
    { id: "night",  he: "🌙 לילה",   en: "🌙 Night",   el: -25, az: 200 }
  ];
  var DEFAULT = { pos: [60, 120, 90], ambient: 0.65, light: 0.8 };
  var ambient = null, LOW = false;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
  var WARM = [1.0, 0.6, 0.3], WHITE = [1.0, 0.96, 0.88], MOON = [0.6, 0.7, 1.0];

  /* צבע ועוצמת האור לפי הגובה: חם ועמום קרוב לאופק, לבן וחזק בצהריים, כחלחל ועמום בלילה */
  function sunLook(el) {
    if (el < 0) return { col: MOON, inten: 0.35, amb: 0.22, ambCol: [0.35, 0.42, 0.7] };
    var t = Math.min(1, el / 40);
    return { col: mix(WARM, WHITE, t), inten: lerp(0.45, 0.95, t), amb: lerp(0.42, 0.58, t), ambCol: mix([1, 0.85, 0.75], [1, 1, 1], t) };
  }
  function dirFor(el, az) {   // וקטור שמצביע אל השמש במרחב המפה (x מזרח, y צפון, z למעלה)
    var e = Math.abs(rad(el)), a = rad(az);
    return [Math.cos(e) * Math.sin(a), Math.cos(e) * Math.cos(a), Math.sin(Math.max(e, rad(2)))];
  }

  function applyLight() {
    if (typeof dl == "undefined" || typeof pivot == "undefined") return;
    if (!ambient) ambient = sc.children.filter(function (c) { return c.isAmbientLight; })[0] || null;
    if (!SUN.on) {   // חזרה לתאורה המקורית
      if (dl.parent !== sc) { if (dl.parent) dl.parent.remove(dl); sc.add(dl); }
      dl.position.set(DEFAULT.pos[0], DEFAULT.pos[1], DEFAULT.pos[2]); dl.color.setRGB(1, 1, 1); dl.intensity = DEFAULT.light; dl.castShadow = false;
      if (ambient) { ambient.color.setRGB(1, 1, 1); ambient.intensity = DEFAULT.ambient; }
      setShadows(false); return;
    }
    if (dl.parent !== pivot) { if (dl.parent) dl.parent.remove(dl); pivot.add(dl); pivot.add(dl.target); dl.target.position.set(0, 0, 0); }
    var d = dirFor(SUN.el, SUN.az), L = sunLook(SUN.el), D = 220;
    // מרחב המפה -> מרחב pivot: המודל מסובב ב-X ב-90°-, ולכן (x,y,z) הופך ל-(x,z,-y)
    dl.position.set(d[0] * D, d[2] * D, -d[1] * D);
    dl.color.setRGB(L.col[0], L.col[1], L.col[2]); dl.intensity = L.inten;
    if (ambient) { ambient.color.setRGB(L.ambCol[0], L.ambCol[1], L.ambCol[2]); ambient.intensity = L.amb; }
    setShadows(SUN.shadows && !LOW);
    if (typeof R != "undefined" && R.shadowMap) R.shadowMap.needsUpdate = true;
    paintLabel();
  }

  var shadowsOn = false;
  function setShadows(on) {
    if (typeof R == "undefined") return;
    if (on) {
      R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.shadowMap.autoUpdate = false;   // האור מחובר למודל, לכן מעדכנים רק כשמשהו משתנה
      dl.castShadow = true; var s = dl.shadow; s.mapSize.set(2048, 2048); s.bias = -0.0004; s.normalBias = 0.25;
      var c = s.camera; c.left = -110; c.right = 110; c.top = 110; c.bottom = -110; c.near = 20; c.far = 520; c.updateProjectionMatrix();
    } else { R.shadowMap.enabled = false; R.shadowMap.autoUpdate = true; dl.castShadow = false; }
    if (shadowsOn !== on) {   // שינוי מצב צללים דורש הידור מחדש של החומרים
      shadowsOn = on;
      if (typeof model != "undefined" && model) model.children.forEach(function (m) { if (m.material) m.material.needsUpdate = true; });
    }
  }
  function flagMeshes() {
    if (typeof model == "undefined" || !model) return;
    model.children.forEach(function (m) { if (m.geometry && !m.userData.ghost) { m.castShadow = true; m.receiveShadow = true; } });
  }

  /* ---------- הקצנת טופוגרפיה ---------- */
  var REX = 1;
  function hookRelief() {
    var orig = computeMasks;
    computeMasks = function () {
      var r = orig.apply(this, arguments);
      try { if (REX != 1 && typeof RH != "undefined") for (var k = 0; k < RH.length; k++) if (RH[k] > 0) RH[k] = Math.min(30, RH[k] * REX); } catch (e) {}
      return r;
    };
  }
  function hookProj() {
    var og = getProj, op = putProj;
    getProj = function () { var o = og.apply(this, arguments); if (REX != 1) o.rex = REX; if (SUN.on) o.sun = { el: SUN.el, az: SUN.az, sh: SUN.shadows }; return o; };
    putProj = function (o) {
      var r = op.apply(this, arguments);
      try {
        setRex(o && o.rex ? +o.rex : 1, true);
        if (o && o.sun) { SUN.on = true; SUN.el = +o.sun.el; SUN.az = +o.sun.az; SUN.shadows = o.sun.sh !== false; } else SUN.on = false;
        paintUI(); applyLight();
      } catch (e) {}
      return r;
    };
  }
  function setRex(v, quiet) {
    REX = Math.max(0.25, Math.min(3, +v || 1));
    var s = $("rex"); if (s) s.value = REX; var l = $("rexl"); if (l) l.textContent = "×" + REX.toFixed(2);
    if (!quiet) update();
  }

  /* ---------- ממשק ---------- */
  function compass(az) { var n = isEn() ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] : ["צפון", "צפון-מזרח", "מזרח", "דרום-מזרח", "דרום", "דרום-מערב", "מערב", "צפון-מערב"]; return n[Math.round(az / 45) % 8]; }
  function paintLabel() {
    var l = $("lsunl"); if (!l) return;
    l.textContent = SUN.el < 0 ? Lx("לילה (אור ירח) · כיוון ", "Night (moonlight) · direction ") + compass(SUN.az) : Lx("גובה שמש ", "Sun elevation ") + Math.round(SUN.el) + "° · " + Lx("כיוון ", "direction ") + compass(SUN.az);
  }
  function paintUI() {
    var on = $("lsun"); if (!on) return;
    on.checked = SUN.on; $("lel").value = SUN.el; $("laz").value = SUN.az; $("lsh").checked = SUN.shadows;
    $("lctl").style.display = SUN.on ? "" : "none"; paintLabel();
    document.querySelectorAll("#sunbox [data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
  }
  function buildUI() {
    if ($("sunbox")) return;
    var anchor = $("vizbox") || ($("vdef") && $("vdef").parentNode); if (!anchor) return;
    var d = document.createElement("div"); d.id = "sunbox"; d.className = "uxsum";
    d.innerHTML = '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="lsun"> <b>' + span("☀️ תאורת שמש וצללים", "☀️ Sun lighting and shadows") + "</b></label>"
      + '<div id="lctl" style="display:none"><div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">'
      + PRESETS.map(function (p) { return '<button type="button" data-p="' + p.id + '" style="margin:0">' + span(p.he, p.en) + "</button>"; }).join("") + "</div>"
      + '<div class="row" style="gap:8px;margin-top:8px;align-items:center"><span style="min-width:74px">' + span("גובה שמש", "Elevation") + '</span><input type="range" id="lel" min="-30" max="90" value="45" style="flex:1" aria-label="' + Lx("גובה השמש", "Sun elevation") + '"></div>'
      + '<div class="row" style="gap:8px;align-items:center"><span style="min-width:74px">' + span("כיוון", "Direction") + '</span><input type="range" id="laz" min="0" max="360" value="135" style="flex:1" aria-label="' + Lx("כיוון השמש", "Sun direction") + '"></div>'
      + '<label style="display:flex;gap:6px;align-items:center;margin-top:4px"><input type="checkbox" id="lsh" checked> ' + span("צללים", "Shadows") + "</label>"
      + '<div class="hint" id="lsunl" role="status"></div></div>';
    anchor.parentNode.insertBefore(d, anchor.nextSibling);
    $("lsun").onchange = function () { SUN.on = this.checked; paintUI(); applyLight(); };
    $("lel").oninput = function () { SUN.el = +this.value; applyLight(); };
    $("laz").oninput = function () { SUN.az = +this.value; applyLight(); };
    $("lsh").onchange = function () { SUN.shadows = this.checked; applyLight(); };
    d.querySelectorAll("button[data-p]").forEach(function (b) { b.onclick = function () { var p = PRESETS.filter(function (x) { return x.id == b.dataset.p; })[0]; SUN.el = p.el; SUN.az = p.az; paintUI(); applyLight(); }; });
    if (LOW) { $("lsh").checked = false; $("lsh").disabled = true; SUN.shadows = false; $("lsh").title = Lx("במצב מהיר הצללים כבויים", "Shadows are off in fast mode"); }
    // סליידר הקצנת טופוגרפיה לצד "גובה מרבי" של ההרים
    var rh = $("rh");
    if (rh && !$("rex")) {
      var row = document.createElement("div"); row.className = "row";
      row.innerHTML = '<span style="font-size:12px;white-space:nowrap">' + span("הקצנת גובה", "Exaggeration") + '</span><input type="range" id="rex" min="0.25" max="3" step="0.05" value="1" aria-label="' + Lx("הקצנת טופוגרפיה", "Terrain exaggeration") + '"><span id="rexl" style="font-size:12px;min-width:44px">×1.00</span>';
      rh.parentNode.parentNode.insertBefore(row, rh.parentNode.nextSibling);
      $("rex").oninput = function () { setRex(this.value); };
    }
  }

  function hookRender() {
    var orig = render;
    render = function () { var r = orig.apply(this, arguments); try { flagMeshes(); if (SUN.on && R.shadowMap) R.shadowMap.needsUpdate = true; } catch (e) {} return r; };
  }

  function init() {
    if (typeof THREE == "undefined" || typeof render != "function" || typeof dl == "undefined") return;
    try { LOW = !!LOWQ; } catch (e) {}
    [hookRender, hookRelief, hookProj, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("terrain", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(paintUI, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    window.terrainApi = { SUN: SUN, applyLight: applyLight, setRex: setRex, dirFor: dirFor, sunLook: sunLook, rex: function () { return REX; } };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
