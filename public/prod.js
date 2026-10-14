/* prod.js (v50): הנדסת מוצר והדפסה
   1. מדריך הדפסה (נפתח לחלון להדפסה או שמירה כ-PDF): הגדרות מומלצות, קבצים, ותוכנית החלפת צבע לפי שכבה
   2. מוצרים נלווים: מחזיק מפתחות או תליון מצורת המדינה או מקו המסלול
   המודול עוטף את build/getProj/putProj ואינו משנה את מעמד המזכרת הרגיל. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return typeof LANG !== "undefined" && LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var msg = function (t) { var m = $("msg"); if (m) m.textContent = t; };

  var ACC = { shape: "country", prev: null };   // shape: country | route

  /* ============ 2. מחזיק מפתחות/תליון מקו המסלול ============ */
  function routePoints() {
    var pts = [], T = window.advDebug && advDebug.trk && advDebug.trk();
    if (T && T.on !== false && T.segs && T.segs.length) {
      var seg = T.segs.reduce(function (a, b) { return b.length > a.length ? b : a; }, T.segs[0]);   // המקטע הארוך ביותר
      pts = seg.map(function (p) { return toMM(p[0], p[1]); });
    } else if (pins.length > 1) pts = pins.map(function (p) { return toMM(p.lon, p.lat); });
    return pts;
  }
  function decimate(pts, minD) {
    if (pts.length < 3) return pts.slice();
    var o = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) { var q = o[o.length - 1]; if (Math.hypot(pts[i][0] - q[0], pts[i][1] - q[1]) >= minD) o.push(pts[i]); }
    o.push(pts[pts.length - 1]);
    return o;
  }
  /* בונה את החלקים: קו המסלול כרצועה בעובי w וגובה LH, וטבעת תלייה שהקצה העליון של הקו נכנס אליה.
     הקו לא נכנס לחור הטבעת, והוא מחובר לטבעת לאורך כל רוחב הטבעת (חפיפה גדולה). */
  function routeParts(base) {
    var tool = TOOL, LH = 4, Ro = tool == "key" ? 8 : 6.5, ri = tool == "key" ? 3.4 : 2.2;
    var raw = routePoints(); if (raw.length < 2) return null;
    var xs = raw.map(function (p) { return p[0]; }), ys = raw.map(function (p) { return p[1]; });
    var m0 = Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys), 2 * Ro);
    var sc0 = (TARGET[tool] || 55) / m0, w = Math.max(2.2, 2.1 / sc0);   // עובי סופי ≥ 2 מ״מ אחרי ההקטנה
    var pts = decimate(raw, w * 0.8);
    // נקודת התלייה: הקודקוד הגבוה ביותר של הקו. הטבעת יושבת מעליו, כך שהמוצר תלוי כשהצפון למעלה
    var hi = 0; pts.forEach(function (p, i) { if (p[1] > pts[hi][1]) hi = i; });
    var e = pts[hi], d = ri + w / 2 + 0.5, cx = e[0], cy = e[1] + d;   // הקודקוד נוגע בטבעת מתחת לחור; הקו לא נכנס לחור
    var G = THREE, geoms = [];
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
      if (l < 1e-6) continue;
      geoms.push(new G.BoxGeometry(l + w * 0.6, w, LH).rotateZ(Math.atan2(dy, dx)).translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, LH / 2));
      if (i < pts.length - 1) geoms.push(new G.CylinderGeometry(w / 2, w / 2, LH, 12).rotateX(Math.PI / 2).translate(p1[0], p1[1], LH / 2));   // חיבור מעוגל בין קטעים
    }
    var sh = new G.Shape(), hl = new G.Path();
    sh.absarc(cx, cy, Ro, 0, Math.PI * 2, false); hl.absarc(cx, cy, ri, 0, Math.PI * 2, true); sh.holes.push(hl);
    var ring = new G.ExtrudeGeometry(sh, { depth: LH, bevelEnabled: false });
    var land = base.filter(function (p) { return /^2_country/.test(p.name); })[0] || base[0] || {};
    var col = land.color || "#cccccc", rep = land.rep || "land";
    return [{ name: "2_country_route", color: col, rep: rep, geoms: geoms }, { name: "2a_loop", color: col, rep: rep, geoms: [ring] }];
  }
  function hookBuild() {
    var orig = build;
    build = function () {
      var P = orig.apply(this, arguments);
      if (ACC.shape != "route" || (TOOL != "key" && TOOL != "orn")) return P;
      try {
        var R = routeParts(P);
        if (!R) return P;
        var drop = /^(2_country|2a_loop|2b_|2c_|2d_|3_|3b_|3c_|5_flag)/;
        var out = P.filter(function (p) { return !drop.test(p.name); }).concat(R);
        try { if (window.vizApi) vizApi.state.names = out.filter(function (p) { return p.geoms.length; }).map(function (p) { return p.name; }); } catch (e) {}   // מסנכרן את מיפוי הרשתות של viz.js
        return out;
      } catch (e) { console.warn("prod route", e); return P; }
    };
  }
  /* במצב "קו המסלול" הסיכות לא מודפסות, ולכן אזהרת "הסיכות דקות מדי" לא רלוונטית */
  function hookWarn() {
    var orig = showSize;
    showSize = function () {
      var r = orig.apply(this, arguments);
      try {
        var w = $("warn");
        if (w && ACC.shape == "route" && (TOOL == "key" || TOOL == "orn")) {
          var lines = w.innerHTML.split("<br>").filter(function (x) { return x.indexOf("הסיכות דקות") < 0; });
          w.innerHTML = lines.length ? lines.join("<br>") : "✅ לא זוהו בעיות הדפסה מוכרות";
        }
      } catch (e) {}
      return r;
    };
  }
  function hookProj() {
    var og = getProj, op = putProj;
    getProj = function () { var o = og.apply(this, arguments); o.accShape = ACC.shape; return o; };
    putProj = function (o) { var r = op.apply(this, arguments); try { ACC.shape = o && o.accShape == "route" ? "route" : "country"; paintAcc(); } catch (e) {} return r; };
  }

  /* ============ 1. מדריך הדפסה ============ */
  var PN = { "1_base": ["מעמד", "Stand"], "1_": ["מעמד", "Stand"], "2_country": ["מדינה", "Country"], "2a_loop": ["טבעת תלייה", "Hanging loop"], "2a_pillars": ["עמודי תמיכה", "Support pillars"], "2b_water": ["מים", "Water"], "2c_relief": ["הרים", "Relief"], "2d_borders": ["גבולות", "Borders"], "2f_frame": ["מסגרת", "Frame"],
    "3_pins": ["סיכות", "Pins"], "3b_route": ["קו מסלול", "Route line"], "3c_track": ["מסלול GPX", "GPX track"], "4_text": ["כיתוב", "Lettering"], "5_flag": ["דגל", "Flag"], "6_qr_plate": ["לוחית QR", "QR plate"], "6_qr": ["קוד QR", "QR code"] };
  function pname(n) {
    var k = Object.keys(PN).filter(function (x) { return n == x || n.indexOf(x) == 0; }).sort(function (a, b) { return b.length - a.length; })[0];
    return k ? (isEn() ? PN[k][1] : PN[k][0]) : n;
  }
  function volMm3(geoms) {
    var v = 0;
    geoms.forEach(function (ge) {
      var g = ge.index ? ge.toNonIndexed() : ge, a = g.attributes.position.array;
      for (var i = 0; i < a.length; i += 9) v += (a[i] * (a[i + 4] * a[i + 8] - a[i + 5] * a[i + 7]) - a[i + 1] * (a[i + 3] * a[i + 8] - a[i + 5] * a[i + 6]) + a[i + 2] * (a[i + 3] * a[i + 7] - a[i + 4] * a[i + 6])) / 6;
    });
    return Math.abs(v);
  }
  var TOOLN = { stand: ["מזכרת עם מעמד", "Souvenir with stand"], key: ["מחזיק מפתחות", "Keychain"], orn: ["תליון / קישוט", "Pendant / ornament"], magnet: ["מגנט למקרר", "Fridge magnet"], puzzle: ["פאזל", "Puzzle"], holder: ["מעמד לטלפון", "Phone stand"] };

  /* אוספים נתונים אמיתיים מהמודל: טווח גובה לכל חלק (לפי קנה המידה להדפסה) ומשקל משוער */
  function analyse(lh) {
    var P = build(), z = scaleFor(P), sc = z.sc, parts = [];
    P.forEach(function (p) {
      if (!p.geoms || !p.geoms.length) return;
      var mn = 1e9, mx = -1e9;
      p.geoms.forEach(function (g) { g.computeBoundingBox(); mn = Math.min(mn, g.boundingBox.min.z); mx = Math.max(mx, g.boundingBox.max.z); });
      parts.push({ name: p.name, color: String(p.color || "#cccccc").toLowerCase(), zmin: mn * sc, zmax: mx * sc, g: volMm3(p.geoms) * Math.pow(sc, 3) / 1000 * 1.24 * 0.5 });
    });
    var groups = {};
    parts.forEach(function (p) { var G = groups[p.color] = groups[p.color] || { color: p.color, names: [], zmin: 1e9, zmax: -1e9, g: 0 }; G.names.push(p.name); G.zmin = Math.min(G.zmin, p.zmin); G.zmax = Math.max(G.zmax, p.zmax); G.g += p.g; });
    var list = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return a.zmin - b.zmin || a.zmax - b.zmax; });
    list.forEach(function (G) {
      G.l0 = Math.floor(G.zmin / lh + 1e-6) + 1; G.l1 = Math.max(G.l0, Math.ceil(G.zmax / lh - 1e-6));
      var ov = function (O) { return Math.min(O.zmax, G.zmax) - Math.max(O.zmin, G.zmin); };
      G.overlap = list.filter(function (O) { return O !== G && ov(O) > 0.6; }).map(function (O) { return O.color; });   // חפיפה של עד 0.6 מ״מ (3 שכבות) נחשבת קלה
      G.minor = list.some(function (O) { return O !== G && ov(O) > 0.05 && ov(O) <= 0.6; });
    });
    var H = parts.length ? Math.max.apply(null, parts.map(function (p) { return p.zmax; })) : 0;
    return { P: P, z: z, parts: parts, groups: list, H: H, layers: Math.max(1, Math.round(H / lh)), grams: parts.reduce(function (t, p) { return t + p.g; }, 0) };
  }

  function settingsFor(tool, A) {
    var fine = tool == "key" || tool == "orn" || pins.length > 0;
    var iconWide = pins.some(function (p) { return /plane|camera|star|heart|flag/.test(p.icon || "") ; }) || /star|heart|flag|cube/.test(($("ps") && $("ps").value) || "");
    var rows = [
      [Lx("חומר", "Material"), "PLA"],
      [Lx("טמפרטורת פיית ההדפסה", "Nozzle temperature"), "200–215°C"],
      [Lx("טמפרטורת משטח", "Bed temperature"), "55–60°C"],
      [Lx("גובה שכבה (Layer Height)", "Layer height"), (tool == "key" || tool == "orn" ? "0.12–0.16" : "0.20") + " mm" + (tool == "key" || tool == "orn" ? Lx(" (פרטים קטנים)", " (small details)") : (pins.length ? Lx(" (0.12 לכיתוב ופרטי סיכות עדינים)", " (0.12 for fine lettering and pin details)") : ""))],
      [Lx("גובה שכבה ראשונה", "First layer height"), "0.20 mm"],
      [Lx("קירות (Perimeters)", "Walls"), "3"],
      [Lx("שכבות עליונות/תחתונות", "Top/bottom layers"), "4–5"],
      [Lx("מילוי (Infill)", "Infill"), tool == "holder" ? "20–25% gyroid" : (tool == "stand" ? "10–15% gyroid" : "100%" + Lx(" (חלק דק)", " (thin part)"))],
      [Lx("תמיכות (Support)", "Supports"), tool == "stand" ? (iconWide ? Lx("לא נדרשות לבסיס. לאייקונים עם ראש רחב (מטוס, מצלמה, כוכב, לב) הפעילו תמיכות Tree רק אם יש צניחה", "Not needed for the base. For wide-topped icons (plane, camera, star, heart) enable Tree supports only if sagging appears") : Lx("לא נדרשות", "Not needed")) : Lx("לא נדרשות. הדפיסו שטוח על המשטח", "Not needed. Print flat on the bed")],
      [Lx("הדבקה למשטח (Brim)", "Bed adhesion (brim)"), tool == "stand" ? Lx("לא נדרש. Brim של 3 מ״מ לעמודים דקים", "Not needed. 3 mm brim for thin pillars") : Lx("לא נדרש", "Not needed")],
      [Lx("קירור", "Cooling"), "100% " + Lx("מהשכבה השנייה", "from layer 2")],
      [Lx("מהירות קירות חיצוניים", "Outer wall speed"), "40–60 mm/s"],
      [Lx("כיוון הדפסה", "Orientation"), Lx("כפי שיוצא בקובץ (שטוח, הבסיס על המשטח)", "As exported (flat, base on the bed)")]
    ];
    if (tool == "magnet") rows.push([Lx("מגנט", "Magnet"), Lx("מדביקים את המגנט לכיס אחרי ההדפסה. אפשר לעצור בשכבה האחרונה של הכיס ולהכניס אותו להדפסה", "Glue the magnet into the pocket after printing. Or pause at the pocket's last layer and insert it mid-print")]);
    if (tool == "puzzle") rows.push([Lx("פאזל", "Puzzle"), Lx("הדפיסו את כל החלקים באותה ריצה. אם החלקים הדוקים מדי, הגדילו את המרווח בהגדרות", "Print all pieces in one run. If pieces fit too tightly, increase the gap in the settings")]);
    return rows;
  }

  function buildGuide() {
    var lh = 0.2, A = analyse(lh), z = A.z, tool = TOOL, tn = TOOLN[tool] || [tool, tool];
    var warn = ($("warn") && $("warn").textContent || "").trim(), country = ($("cin") && $("cin").value || "").trim(), title = ($("trip") && $("trip").value || "").trim();
    var hrs = A.grams / 11;
    var swatch = function (c) { return '<span class="sw" style="background:' + esc(c) + '"></span><code>' + esc(c) + "</code>"; };
    var multi = A.groups.length > 1;
    var rowsColor = A.groups.map(function (G, i) {
      var note = G.overlap.length ? Lx("חופף בגובה לצבעים אחרים: דורש מדפסת מרובת צבעים (AMS / MMU), או הדפסה נפרדת של החלק והדבקה", "Overlaps other colors in height: needs a multi-color printer (AMS / MMU), or print this part separately and glue it") : (G.minor ? Lx("כמעט נפרד בגובה (חפיפה של עד 3 שכבות): אפשר להחליף צבע ידנית, והשכבות הראשונות יהיו מעורבות", "Almost separate in height (up to 3 layers overlap): a manual color change works, the first layers may mix") : Lx("נפרד בגובה: אפשר להחליף צבע ידנית בשכבה הזו", "Separate in height: a manual color change works at this layer"));
      return "<tr><td>" + (i + 1) + "</td><td>" + swatch(G.color) + "</td><td>" + esc(G.names.map(pname).filter(function (v, k, a) { return a.indexOf(v) == k; }).join(", ")) + "</td><td>" + G.l0 + " – " + G.l1 + "</td><td>" + G.zmin.toFixed(2) + " – " + G.zmax.toFixed(2) + "</td><td>" + esc(note) + "</td></tr>";
    }).join("");
    var changes = A.groups.filter(function (G, i) { return i > 0 && !G.overlap.length; });
    var changeTxt = !multi ? Lx("המודל בצבע אחד, אין צורך בהחלפת צבע.", "Single-color model, no color change needed.")
      : changes.length ? changes.map(function (G) { return Lx("לפני שכבה ", "Before layer ") + "<b>" + G.l0 + "</b>" + Lx(": החליפו ל-", ": switch to ") + swatch(G.color); }).join("<br>")
      : Lx("כל הצבעים חופפים בגובה, ולכן החלפת צבע ידנית בשכבה אחת לא תספיק. השתמשו בקבצי ה-STL הנפרדים לכל צבע (או ב-3MF) במדפסת מרובת צבעים.", "All colors overlap in height, so a single manual color change won't be enough. Use the separate per-color STL files (or the 3MF) on a multi-color printer.");
    var rows = settingsFor(tool, A).map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>"; }).join("");
    var dir = isEn() ? "ltr" : "rtl";
    var css = "body{font-family:Rubik,Arial,sans-serif;margin:0;padding:24px;max-width:820px;margin-inline:auto;color:#1c1c1e;line-height:1.55}h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px;border-bottom:2px solid #1c1c1e;padding-bottom:4px}"
      + "table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #c9c9cf;padding:6px 8px;text-align:start;vertical-align:top}th{background:#f2f2f5;width:34%}.sw{display:inline-block;width:14px;height:14px;border:1px solid #555;vertical-align:middle;margin-inline-end:6px;border-radius:3px}"
      + ".muted{color:#555;font-size:13px}.warn{background:#fff4d6;border:1px solid #e0b100;border-radius:8px;padding:8px 10px}.bar{display:flex;gap:8px;margin-bottom:14px}button{font:inherit;padding:8px 14px;border-radius:8px;border:1px solid #1c1c1e;background:#1c1c1e;color:#fff;cursor:pointer}"
      + "@media print{.bar{display:none}body{padding:0}h2{break-after:avoid}table{break-inside:avoid}}";
    var date = new Date().toLocaleDateString(isEn() ? "en-GB" : "he-IL");
    var html = '<!doctype html><html lang="' + (isEn() ? "en" : "he") + '" dir="' + dir + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(Lx("מדריך הדפסה", "Print guide")) + " - " + esc(title || tn[isEn() ? 1 : 0]) + "</title><style>" + css + "</style></head><body>"
      + '<div class="bar"><button onclick="window.print()">' + esc(Lx("🖨️ הדפסה / שמירה כ-PDF", "🖨️ Print / Save as PDF")) + "</button></div>"
      + "<h1>" + esc(Lx("מדריך הדפסה", "Print guide")) + "</h1><div class=\"muted\">" + esc((title ? title + " · " : "") + tn[isEn() ? 1 : 0] + (country ? " · " + country : "") + " · " + date) + "</div>"
      + "<h2>" + esc(Lx("סיכום", "Summary")) + "</h2><table>"
      + "<tr><th>" + esc(Lx("מידות (אורך × רוחב × גובה)", "Size (L × W × H)")) + "</th><td>" + (z.w).toFixed(1) + " × " + (z.h).toFixed(1) + " × " + (A.H / 10).toFixed(1) + " " + esc(Lx("ס״מ", "cm")) + "</td></tr>"
      + "<tr><th>" + esc(Lx("משקל PLA משוער", "Estimated PLA weight")) + "</th><td>" + esc(Lx("כ-", "≈ ")) + Math.round(A.grams) + " " + esc(Lx("גרם", "g")) + "</td></tr>"
      + "<tr><th>" + esc(Lx("זמן הדפסה משוער", "Estimated print time")) + "</th><td>" + esc(Lx("כ-", "≈ ")) + (hrs < 1 ? Math.max(5, Math.round(hrs * 60)) + " " + Lx("דקות", "min") : hrs.toFixed(1) + " " + Lx("שעות", "h")) + "</td></tr>"
      + "<tr><th>" + esc(Lx("מספר שכבות (ב-0.2 מ״מ)", "Layers (at 0.2 mm)")) + "</th><td>" + A.layers + "</td></tr>"
      + "<tr><th>" + esc(Lx("קנה מידה להדפסה", "Print scale")) + "</th><td>" + Math.round(z.sc * 100) + "%</td></tr></table>"
      + (warn && warn.charAt(0) == "⚠" ? '<p class="warn">' + esc(warn) + "</p>" : "")
      + "<h2>" + esc(Lx("הגדרות מומלצות בסלייסר", "Recommended slicer settings")) + "</h2><table>" + rows + "</table>"
      + '<p class="muted">' + esc(Lx("ההגדרות הן נקודת פתיחה ל-PLA במדפסת FDM רגילה. התאימו לפי המדפסת והחומר שלכם.", "These are starting points for PLA on a typical FDM printer. Adjust for your printer and filament.")) + "</p>"
      + "<h2>" + esc(Lx("צבעים והחלפת צבע לפי שכבה", "Colors and color change by layer")) + "</h2>"
      + '<table style="table-layout:fixed"><tr><th style="width:5%">#</th><th style="width:16%">' + esc(Lx("צבע", "Color")) + "</th><th>" + esc(Lx("חלקים", "Parts")) + '</th><th style="width:11%">' + esc(Lx("שכבות", "Layers")) + '</th><th style="width:13%">' + esc(Lx("גובה (מ״מ)", "Height (mm)")) + '</th><th style="width:33%">' + esc(Lx("הערה", "Note")) + "</th></tr>" + rowsColor + "</table>"
      + "<h2>" + esc(Lx("החלפת צבע ידנית (Color Change)", "Manual color change")) + "</h2><p>" + changeTxt + "</p>"
      + '<p class="muted">' + esc(Lx("מספרי השכבות מחושבים משכבה ראשונה של 0.2 מ״מ ובגובה שכבה של 0.2 מ״מ ולפי הגודל המודפס בפועל. אם שיניתם גובה שכבה, חשבו מחדש לפי הגובה (מ״מ) בטבלה. בסלייסרים נהוג להוסיף את ההחלפה דרך מחוון השכבות (Insert color change / M600).", "Layer numbers assume a 0.2 mm first layer and 0.2 mm layer height at the actual printed size. If you change the layer height, recalculate from the height (mm) in the table. In most slicers you add the change from the layer slider (Insert color change / M600).")) + "</p>"
      + "<h2>" + esc(Lx("קבצים", "Files")) + "</h2><p>" + esc(Lx("מהאתר מורידים ZIP עם קובץ STL לכל צבע וקובץ 3MF מרובה צבעים. טוענים את כל קבצי ה-STL יחד בסלייסר כאובייקט אחד כדי לשמור על המיקום.", "The site downloads a ZIP with one STL per color plus a multi-color 3MF. Load all the STL files together in the slicer as one object to keep their positions.")) + "</p>"
      + '<p class="muted">' + esc(Lx("נוצר באתר סטודיו מזכרות תלת-ממד", "Generated by the 3D souvenir studio")) + "</p></body></html>";
    return html;
  }
  function openGuide() {
    var html;
    try { html = buildGuide(); } catch (e) { console.warn("guide", e); msg(Lx("לא הצלחנו להכין את המדריך, נסו שוב אחרי שהמודל נטען", "Couldn't build the guide, try again after the model has loaded")); return; }
    var w = null;
    try { w = window.open("", "_blank"); } catch (e) { w = null; }
    if (w && w.document) { w.document.open(); w.document.write(html); w.document.close(); return; }
    // חסימת חלונות קופצים: מורידים כקובץ HTML שאפשר לפתוח ולהדפיס
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" })); a.download = "print-guide.html";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    msg(Lx("החלון נחסם, ולכן המדריך ירד כקובץ. פתחו אותו והדפיסו או שמרו כ-PDF.", "The pop-up was blocked, so the guide was downloaded as a file. Open it and print or save as PDF."));
  }

  /* ============ ממשק (לשונית 4) ============ */
  function setTool(t) {
    if (!ACC.prev && TOOL != t) ACC.prev = TOOL;
    TOOL = t; try { applyTool(); } catch (e) {} try { syncPickers(); } catch (e) {} update(); paintAcc();
  }
  function paintAcc() {
    var b = $("accbox"); if (!b) return;
    var has = routePoints().length > 1, rs = $("accroute");
    if (rs) { rs.disabled = !has; rs.parentNode.style.opacity = has ? "" : ".55"; }
    if (!has && ACC.shape == "route") ACC.shape = "country";
    var sel = document.querySelector('input[name="accshape"][value="' + ACC.shape + '"]'); if (sel) sel.checked = true;
    var back = $("accback"); if (back) back.style.display = (TOOL == "key" || TOOL == "orn") ? "" : "none";
    var hint = $("acchint"); if (hint) hint.textContent = has ? "" : Lx("קו המסלול דורש ייבוא קובץ GPX או לפחות שתי נקודות ציון", "The route line needs a GPX file or at least two points");
    b.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
  }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="4"]'), sum = $("uxsum"); if (!host || !sum || $("accbox")) return;
    var d = document.createElement("div"); d.id = "accbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("🎁 מוצרים נלווים ומדריך הדפסה", "🎁 Companion products and print guide") + "</b>"
      + '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" id="gdb" style="margin:0">' + span("📄 מדריך הדפסה (PDF)", "📄 Print guide (PDF)") + "</button></div>"
      + '<div style="margin-top:10px"><span class="hint">' + span("מחזיק מפתחות או תליון מהמודל הנוכחי:", "Keychain or pendant from the current model:") + "</span>"
      + '<div class="row" style="flex-wrap:wrap;gap:12px;margin-top:6px"><label style="display:flex;gap:4px;align-items:center"><input type="radio" name="accshape" value="country" checked> ' + span("צורת המדינה", "Country shape") + "</label>"
      + '<label style="display:flex;gap:4px;align-items:center"><input type="radio" name="accshape" value="route" id="accroute"> ' + span("קו המסלול", "Route line") + "</label></div>"
      + '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" id="acck" style="margin:0">' + span("🔑 מחזיק מפתחות", "🔑 Keychain") + '</button><button type="button" id="acco" style="margin:0">' + span("📿 תליון", "📿 Pendant") + '</button><button type="button" id="accback" style="margin:0;display:none">' + span("↩ חזרה למעמד", "↩ Back to stand") + "</button></div>"
      + '<div class="hint" id="acchint"></div></div>';
    var anchor = $("advar") || sum; anchor.parentNode.insertBefore(d, anchor.nextSibling);
    $("gdb").onclick = openGuide;
    document.querySelectorAll('input[name="accshape"]').forEach(function (r) { r.onchange = function () { ACC.shape = r.value; if (TOOL == "key" || TOOL == "orn") update(); }; });
    $("acck").onclick = function () { setTool("key"); };
    $("acco").onclick = function () { setTool("orn"); };
    $("accback").onclick = function () { setTool(ACC.prev || "stand"); ACC.prev = null; };
    paintAcc();
  }

  function init() {
    if (typeof THREE == "undefined" || typeof build != "function" || typeof getProj != "function") return;
    [hookBuild, hookWarn, hookProj, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("prod", f.name, e); } });
    try { new MutationObserver(function () { setTimeout(paintAcc, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    try { setInterval(paintAcc, 3000); } catch (e) {}   // המסלול יכול להשתנות בלי אירוע (ייבוא GPX, תבנית), לכן מרעננים את מצב הכפתור
    window.prodApi = { ACC: ACC, buildGuide: buildGuide, analyse: analyse, routePoints: routePoints, routeParts: routeParts, setTool: setTool };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
