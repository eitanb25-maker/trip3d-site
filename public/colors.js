/* colors.js (v63): השוואת צבעים
   מציג את המודל הנוכחי בכל ערכות הצבע (STY מהקוד הראשי) כתמונות ממוזערות, לחיצה על תמונה מחילה את הערכה.
   אפשר לחזור לצבעים שהיו לפני ההשוואה. הממוזערות נוצרות מהמודל החי: מחליפים זמנית את חומרי הרשתות (לפי שם החלק, keyOf),
   מציירים פריים אחד, מעתיקים לקנבס קטן ומחזירים את החומרים, הכול באותה משימה, כך שהתצוגה לא מהבהבת.
   מבנה הנתונים: C = {before: צבעים לפני ההשוואה | null, thumbs: {מפתח_ערכה: dataURL}}. window.colorsApi.
   המודול אינו משנה גיאומטריה או קבצי ייצוא. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + Lx(he, en) + "</span>"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var KEYS = ["base", "land", "water", "relief", "pin", "text"], TH = 150;
  var C = { before: null, thumbs: {} };

  var pname = function (k) { var n = STY[k].n; return isEn() && typeof X != "undefined" && X[n] ? X[n] : n; };
  var cur = function () { var o = {}; KEYS.forEach(function (k) { var e = $("c_" + k); if (e) o[k] = e.value; }); return o; };
  var same = function (a, b) { return KEYS.every(function (k) { return String(a[k]).toLowerCase() == String(b[k]).toLowerCase(); }); };
  var currentKey = function () { var c = cur(); return Object.keys(STY).filter(function (k) { return same(STY[k].c, c); })[0] || ""; };

  /* ציור המודל בכל ערכה */
  function snap(pal) {
    var g = document.createElement("canvas"); g.width = g.height = TH; var x = g.getContext("2d");
    var bg = x.createRadialGradient(TH * .4, TH * .35, 0, TH / 2, TH / 2, TH * .8); bg.addColorStop(0, "#f4f1ea"); bg.addColorStop(1, "#c9c4b8");
    x.fillStyle = bg; x.fillRect(0, 0, TH, TH);
    var saved = [];
    model.children.forEach(function (m) {
      saved.push([m, m.material]);
      var k = ""; try { k = keyOf(m.userData.part || ""); } catch (e) {}
      var col = pal[k];
      if (col && m.material) m.material = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide });
    });
    try { R.render(sc, cam); x.drawImage(R.domElement, 0, 0, TH, TH); }
    finally { saved.forEach(function (p) { if (p[1] !== p[0].material) { try { p[0].material.dispose(); } catch (e) {} } p[0].material = p[1]; }); R.render(sc, cam); }
    return g.toDataURL("image/png");
  }
  function generate() {
    if (typeof model == "undefined" || !model || !model.children.length) { msg(Lx("אין עדיין מודל להצגה. בחרו מדינה ולחצו על עדכון.", "No model yet. Choose a country first.")); return false; }
    msg("");
    C.thumbs = {};
    Object.keys(STY).forEach(function (k) { C.thumbs[k] = snap(STY[k].c); });
    C.thumbs["_cur"] = snap(cur());
    paintGrid(); return true;
  }

  /* החלה / ביטול */
  function apply(k) {
    var pal = STY[k] && STY[k].c; if (!pal) return;
    if (!C.before) C.before = cur();
    setCols(pal);
  }
  function setCols(pal) {
    KEYS.forEach(function (key) { var e = $("c_" + key); if (e && pal[key]) { e.value = pal[key]; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); } });
    try { update(); } catch (e) {}
    setTimeout(function () { paintGrid(); }, 80);
  }
  function revert() { if (!C.before) return; var b = C.before; C.before = null; setCols(b); }

  /* ממשק */
  function msg(t) { var m = $("colmsg"); if (m) m.textContent = t || ""; }
  function sw(c) { return '<span class="colsw">' + KEYS.map(function (k) { return '<i style="background:' + esc(c[k]) + '"></i>'; }).join("") + "</span>"; }
  function paintGrid() {
    var g = $("colgrid"); if (!g) return;
    var ck = currentKey(), keys = Object.keys(STY);
    if (!Object.keys(C.thumbs).length) { g.innerHTML = ""; paintBtns(); return; }
    g.innerHTML = keys.map(function (k) {
      var on = k == ck;
      return '<button type="button" class="colcard' + (on ? " on" : "") + '" data-k="' + k + '" aria-pressed="' + on + '" aria-label="' + esc(pname(k)) + '"><img src="' + C.thumbs[k] + '" alt="" width="' + TH + '" height="' + TH + '"><b>' + esc(pname(k)) + "</b>" + sw(STY[k].c) + "</button>";
    }).join("")
      + (ck ? "" : '<div class="colcard on" aria-label="' + Lx("הצבעים שלכם", "Your colors") + '"><img src="' + (C.thumbs._cur || "") + '" alt="" width="' + TH + '" height="' + TH + '"><b>' + span("הצבעים שלכם", "Your colors") + "</b>" + sw(cur()) + "</div>");
    g.querySelectorAll("button[data-k]").forEach(function (b) { b.onclick = function () { apply(b.dataset.k); }; });
    paintBtns();
  }
  function paintBtns() { var r = $("colrev"); if (r) r.hidden = !C.before; }
  function paint() {
    var b = $("colbox"); if (!b) return;
    b.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
    if (Object.keys(C.thumbs).length) paintGrid();
  }
  function buildUI() {
    if ($("colbox")) return;
    var ci = $("c_base"); if (!ci) return;
    var row = ci.closest(".cols") || ci.parentNode, host = row.parentNode;
    var st = document.createElement("style");
    st.textContent = ".colgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:8px}"
      + ".colcard{margin:0;padding:6px;display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center;border:2px solid var(--bd,#ddd);border-radius:12px;background:var(--card,#fff);color:inherit;font-size:13px;cursor:pointer}"
      + "div.colcard{cursor:default}.colcard.on{border-color:var(--ac,#c2410c)}"
      + ".colcard img{width:100%;height:auto;aspect-ratio:1/1;border-radius:8px;display:block}"
      + ".colsw{display:flex;gap:2px;width:100%}.colsw i{flex:1;height:8px;border-radius:2px;border:1px solid rgba(0,0,0,.15)}";
    document.head.appendChild(st);
    var d = document.createElement("div"); d.id = "colbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("🎨 השוואת צבעים", "🎨 Compare colors") + "</b>"
      + '<div class="hint">' + span("רואים את המודל שלכם בכל ערכות הצבע. לחיצה על ערכה מחילה אותה, ואפשר לחזור לצבעים שהיו לפני.", "See your model in every color scheme. Click one to apply it; you can go back to your previous colors.") + "</div>"
      + '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" id="colgo" style="margin:0;width:auto">' + span("👀 הצג את המודל בכל הערכות", "👀 Show my model in every scheme") + '</button><button type="button" id="colrev" hidden style="margin:0;width:auto">' + span("↩ חזרה לצבעים שלי", "↩ Back to my colors") + "</button></div>"
      + '<div id="colmsg" class="hint" role="status"></div><div id="colgrid" class="colgrid"></div>';
    host.insertBefore(d, row.nextSibling);
    $("colgo").onclick = generate; $("colrev").onclick = revert;
  }
  function init() {
    if (typeof STY == "undefined" || typeof keyOf != "function" || typeof R == "undefined") return;
    try { buildUI(); } catch (e) { console.warn("colors", e); }
    try { new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (e) {}
    window.colorsApi = { C: C, generate: generate, apply: apply, revert: revert, snap: snap };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
