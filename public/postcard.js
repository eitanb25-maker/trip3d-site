/* postcard.js (v59): ייצוא גלויה דו-ממדית (PNG ברזולוציה גבוהה, ו-SVG וקטורי) של המפה והמסלול
   PNG: ציור המפה הקיים (drawMap) בקנבס גדול פי K, על רקע התצוגה ועם שם הטיול. גודל A6 לרוחב ב-300 DPI (1748×1240).
   SVG: בנוי מהנתונים עצמם (גבולות המדינה, אגמים, נחלים, סיכות, מסלול, שכבות טיולים), ולכן חד בכל הגדלה. גודל 148×105 מ״מ (יחידות של עשיריות מ״מ).
   מבנה הנתונים: PC = {url, file, fmt}. אין שינוי בקוד הראשי; המודול רק קורא ממנו (PR, pins, water, toMM, drawMap, BGS). */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + Lx(he, en) + "</span>"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var W = 1748, H = 1240, K = 3, S0 = 6.5;
  var PC = { url: "", file: null, fmt: "" };

  var bg = function () { var b = (typeof BGS != "undefined" && BGS[$("bg") ? $("bg").value : "night"]) || ["#46557a", "#11141f"]; return b; };
  var textCol = function () { return $("bg") && $("bg").value == "light" ? "#222222" : "#ffffff"; };
  var title = function () { return ($("trip") && $("trip").value || "").trim(); };
  var sub = function () { return ($("tsub") && $("tsub").value || "").trim(); };

  /* המפה בקנבס גדול: מגדילים את קנבס המפה, מציירים, מעתיקים ומחזירים */
  function snapMap(k) {
    var w0 = mc.width, h0 = mc.height, c = document.createElement("canvas");
    c.width = c.height = 520 * k;
    try { mc.width = mc.height = 520 * k; mx.scale(k, k); drawMap(); c.getContext("2d").drawImage(mc, 0, 0); }
    finally { mc.width = w0; mc.height = h0; drawMap(); }
    return c;
  }
  function png() {
    var c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d"), b = bg();
    var gr = g.createRadialGradient(W * 0.4, H * 0.35, 0, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, b[0]); gr.addColorStop(1, b[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    var t = title(), s = sub(), mapH = t || s ? H * 0.8 : H * 0.92, m = snapMap(K);
    g.drawImage(m, (W - mapH) / 2, H * 0.03, mapH, mapH);
    g.textAlign = "center"; g.fillStyle = textCol();
    var fam = ($("font") && $("font").value || "Rubik") + ",system-ui,sans-serif";
    if (t) { g.font = "700 " + Math.round(H * 0.075) + "px " + fam; g.fillText(t, W / 2, H * 0.93, W * 0.9); }
    if (s) { g.font = "400 " + Math.round(H * 0.04) + "px " + fam; g.fillText(s, W / 2, H * 0.975, W * 0.9); }
    return new Promise(function (res) { c.toBlob(res, "image/png"); });
  }

  /* ============ SVG ============ */
  function svg() {
    var o = [], b = bg(), M = 840, ox = (1480 - M) / 2, oy = 20, k = M / 520;
    var X = function (x) { return (ox + (260 + x * S0) * k).toFixed(1); }, Y = function (y) { return (oy + (260 - y * S0) * k).toFixed(1); };
    var mp = function (p) { var q = toMM(p[0], p[1]); return [X(q[0]), Y(q[1])]; };
    var pathOf = function (pts, close) { return pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join("") + (close ? "Z" : ""); };
    o.push('<svg xmlns="http://www.w3.org/2000/svg" width="148mm" height="105mm" viewBox="0 0 1480 1050" lang="' + (isEn() ? "en" : "he") + '">');
    o.push('<defs><radialGradient id="bg" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="' + esc(b[0]) + '"/><stop offset="1" stop-color="' + esc(b[1]) + '"/></radialGradient></defs>');
    o.push('<rect width="1480" height="1050" fill="url(#bg)"/>');
    var land = ($("c_land") && $("c_land").value) || "#d9a441", water = ($("c_water") && $("c_water").value) || "#4682b4", pin = ($("c_pin") && $("c_pin").value) || "#c0392b";
    (PR.rings || []).forEach(function (r) { o.push('<path d="' + pathOf(r.map(function (p) { return [X(p[0]), Y(p[1])]; }), true) + '" fill="' + esc(land) + '" stroke="rgba(0,0,0,.45)" stroke-width="2.4" stroke-linejoin="round"/>'); });
    var sm = function (r, c) { try { return smooth(r, c); } catch (e) { return r; } };
    (water.lakes || []).forEach(function (r) { if (r.length > 2) o.push('<path d="' + pathOf(sm(r, true).map(mp), true) + '" fill="' + esc(water) + '"/>'); });
    (water.rivers || []).forEach(function (r) { o.push('<path d="' + pathOf(sm(r, false).map(mp), false) + '" fill="none" stroke="' + esc(water) + '" stroke-width="' + (1.2 * S0 * k).toFixed(1) + '" stroke-linecap="round" stroke-linejoin="round"/>'); });
    if ($("route") && $("route").value != "0" && pins.length > 1) o.push('<path d="' + pathOf(pins.map(function (p) { return mp([p.lon, p.lat]); }), false) + '" fill="none" stroke="' + esc(pin) + '" stroke-width="' + (2.5 * k).toFixed(1) + '"' + ($("route").value == "2" ? ' stroke-dasharray="' + (7 * k).toFixed(0) + " " + (5 * k).toFixed(0) + '"' : "") + ' stroke-linecap="round" stroke-linejoin="round"/>');
    if (window.tripsApi) tripsApi.TR().forEach(function (t) {
      if (!t.on) return;
      var wd = { thin: 1.2, mid: 2.2, thick: 3.4 }[t.w] * k, da = t.style == "dash" ? ' stroke-dasharray="' + (7 * k).toFixed(0) + " " + (5 * k).toFixed(0) + '"' : t.style == "dot" ? ' stroke-dasharray="1 ' + (5 * k).toFixed(0) + '"' : "";
      t.segs.forEach(function (sg) { if (sg.length > 1) o.push('<path d="' + pathOf(sg.map(mp), false) + '" fill="none" stroke="' + esc(t.color) + '" stroke-width="' + wd.toFixed(1) + '"' + da + ' stroke-linecap="round" stroke-linejoin="round"/>'); });
    });
    var showNames = $("shownames") ? $("shownames").checked : false, tc = textCol();
    pins.forEach(function (p, i) {
      var q = mp([p.lon, p.lat]);
      o.push('<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (p.fav ? 11 : 8) + '" fill="' + esc(pin) + '" stroke="#ffffff" stroke-width="2.5"/>');
      if (showNames && p.name) o.push('<text x="' + (+q[0] + 14) + '" y="' + (+q[1] + 5) + '" font-size="20" font-family="sans-serif" fill="' + tc + '" stroke="rgba(0,0,0,.35)" stroke-width=".6" paint-order="stroke">' + esc(p.name) + "</text>");
    });
    var fam = esc(($("font") && $("font").value || "Rubik") + ",system-ui,sans-serif"), t = title(), s = sub();
    if (t) o.push('<text x="740" y="' + (s ? 975 : 1000) + '" text-anchor="middle" font-size="76" font-weight="700" font-family="' + fam + '" fill="' + tc + '">' + esc(t) + "</text>");
    if (s) o.push('<text x="740" y="1028" text-anchor="middle" font-size="38" font-family="' + fam + '" fill="' + tc + '">' + esc(s) + "</text>");
    o.push("</svg>");
    return new Blob([o.join("\n")], { type: "image/svg+xml" });
  }

  /* ============ ממשק (לשונית 4) ============ */
  function show(blob, name, fmt) {
    if (PC.url) URL.revokeObjectURL(PC.url);
    PC.url = URL.createObjectURL(blob); PC.file = name; PC.fmt = fmt;
    var box = $("postout"); if (!box) return;
    box.innerHTML = '<img src="' + PC.url + '" alt="" style="max-width:100%;border-radius:10px;margin-top:8px;display:block">'
      + '<a id="postdl" href="' + PC.url + '" download="' + name + '" class="btn" style="display:inline-block;margin-top:8px;padding:8px 14px;border-radius:10px;background:var(--ac,#2b6cb0);color:#fff;text-decoration:none">⬇️ ' + Lx("הורדה", "Download") + " (" + (blob.size / 1024).toFixed(0) + " KB)</a>";
  }
  function msg(t) { var m = $("postmsg"); if (m) m.textContent = t || ""; }
  async function go(fmt) {
    var bs = [$("postpng"), $("postsvg")]; bs.forEach(function (b) { if (b) b.disabled = true; });
    msg(Lx("מכין את הגלויה…", "Preparing the postcard…"));
    try {
      var blob = fmt == "png" ? await png() : svg();
      if (!blob || !blob.size) throw new Error("empty");
      show(blob, "trip3d-postcard." + fmt, fmt); msg("");
    } catch (e) { console.warn("postcard", e); msg(Lx("לא הצלחנו להכין את הגלויה. נסו שוב.", "Couldn't prepare the postcard. Try again.")); }
    finally { bs.forEach(function (b) { if (b) b.disabled = false; }); }
  }
  function paint() { var b = $("postbox"); if (b) b.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; }); }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="4"]'); if (!host || $("postbox")) return;
    var nav = host.querySelector(".uxnav"), d = document.createElement("div"); d.id = "postbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("✉️ גלויה מהמפה (דו-ממד)", "✉️ Postcard from the map (2D)") + "</b>"
      + '<div class="hint">' + span("תמונה של המפה, המסלול והסיכות להדפסה כגלויה: PNG ברזולוציה גבוהה (A6, 300 DPI) או SVG וקטורי.", "An image of the map, route and pins for printing as a postcard: high-resolution PNG (A6, 300 DPI) or vector SVG.") + "</div>"
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" id="postpng" style="margin:0;width:auto">' + span("🖼️ PNG", "🖼️ PNG") + '</button><button type="button" id="postsvg" style="margin:0;width:auto">' + span("📐 SVG", "📐 SVG") + "</button></div>"
      + '<div id="postmsg" class="hint" role="status"></div><div id="postout"></div>';
    host.insertBefore(d, nav || null);
    $("postpng").onclick = function () { go("png"); }; $("postsvg").onclick = function () { go("svg"); };
  }
  function init() {
    if (typeof drawMap != "function" || typeof PR == "undefined") return;
    try { buildUI(); } catch (e) { console.warn("postcard", e); }
    try { new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    window.postcardApi = { png: png, svg: svg, snapMap: snapMap };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
