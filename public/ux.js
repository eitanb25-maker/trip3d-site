/* ux.js – שדרוג חוויית משתמש: לשוניות בעורך, ⓘ הסברים, מידות/משקל/זמן, ספינרים, מובייל.
   מודול עצמאי: נטען defer אחרי הסקריפט הראשי ורק עוטף פונקציות גלובליות קיימות.
   אם משהו חסר – הוא מדלג בשקט ולא שובר את האתר. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var Lx = function (he, en) { try { return typeof L_ === "function" ? L_(he, en) : he; } catch (e) { return he; } };

  /* ---------- CSS ---------- */
  var css = ""
    + ".uxtabs{display:flex;gap:6px;position:sticky;top:0;z-index:20;background:var(--bg,#fff);padding:6px 0;margin:0 0 10px;overflow-x:auto;-webkit-overflow-scrolling:touch}"
    + ".uxtabs button{flex:1 0 auto;min-height:40px;padding:6px 12px;border-radius:999px;border:1px solid var(--bd,#ccc);background:var(--card,#fff);color:inherit;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}"
    + ".uxtabs button[aria-selected=true]{background:var(--ac,#2563eb);border-color:var(--ac,#2563eb);color:#fff}"
    + "@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .uxtabs button[aria-selected=true]{color:#1b1308}}:root[data-theme=dark] .uxtabs button[aria-selected=true]{color:#1b1308}"
    + ".uxtabs button b{display:inline-block;min-width:1.4em;opacity:.8}"
    + ".uxp[hidden]{display:none!important}"
    + ".uxnav{display:flex;gap:8px;justify-content:space-between;margin-top:14px}"
    + ".uxnav button{flex:1;min-height:44px}"
    + ".uxi{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-inline-start:6px;padding:0;border-radius:50%;border:1px solid var(--bd,#999);background:transparent;color:inherit;font:700 12px/1 system-ui;cursor:help;vertical-align:middle}"
    + "@media (pointer:coarse){.uxi{width:28px;height:28px;font-size:14px}}"
    + "#uxtip{pointer-events:none;position:fixed;z-index:9999;max-width:min(300px,86vw);padding:10px 12px;border-radius:10px;background:#1f2937;color:#fff;font-size:13px;line-height:1.5;box-shadow:0 6px 24px rgba(0,0,0,.35);display:none}"
    + ".uxsum{margin:10px 0;padding:12px;border-radius:12px;border:1px solid var(--bd,#ddd);font-size:14px;line-height:1.7}"
    + ".uxsum table{width:100%;border-collapse:collapse;margin-top:6px;font-size:13px}.uxsum td{padding:2px 4px;border-top:1px solid var(--bd,#e5e5e5)}"
    + ".uxsum td:last-child{text-align:end;font-variant-numeric:tabular-nums}"
    + "@keyframes uxsp{to{transform:rotate(360deg)}}"
    + ".uxspin{position:relative;pointer-events:none;opacity:.8}"
    + ".uxspin::after{content:'';display:inline-block;width:14px;height:14px;margin-inline-start:8px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:uxsp .7s linear infinite;vertical-align:-2px}"
    + ".uxload{display:flex;align-items:center;gap:8px;padding:8px 0;font-size:14px}.uxload i{width:16px;height:16px;border:2px solid var(--ac,#2563eb);border-top-color:transparent;border-radius:50%;animation:uxsp .7s linear infinite}"
    + ".uxscroll{display:none;margin:6px 0;min-height:40px}"
    + "@media(pointer:coarse){.uxscroll{display:inline-block}}"
    + "@media(max-width:700px){"
    + "input,select,textarea{font-size:16px!important;min-height:44px}input[type=checkbox],input[type=radio]{min-height:0;width:22px;height:22px}input[type=range]{min-height:32px}"
    + "button{min-height:44px}.card{padding:12px}canvas{max-width:100%;height:auto!important;aspect-ratio:1/1}"
    + ".uxtabs{margin-inline:-4px;padding-inline:4px}.uxtabs button span{display:none}.uxtabs button[aria-selected=true] span{display:inline}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- לשוניות ---------- */
  var TABS = [
    { n: 1, he: "מדינה ומפה", en: "Country & map", ids: "bed ncol cin far rg rgx gj lh rimg rmode rh showimg alr" },
    { n: 2, he: "מקומות ומים", en: "Places & water", ids: "q sb cands cnt pl impf impt impb ps route dr dk dd dc wb wf wimg wcol eye wtol alw" },
    { n: 3, he: "עיצוב ותוכן", en: "Design & text", ids: "trip d1 d2 tsub font shownames numpins bh rim gap pcs pfr mgs shape bg c_base fm f1 f2 f3 fimg qron qrurl" },
    { n: 4, he: "תצוגה והורדה", en: "Preview & export", ids: "dl msg" }
  ];

  function tabOf(el, idTab) {
    var ids = el.querySelectorAll ? el.querySelectorAll("[id]") : [];
    if (el.id && idTab[el.id]) return idTab[el.id];
    for (var i = 0; i < ids.length; i++) if (idTab[ids[i].id]) return idTab[ids[i].id];
    return 0;
  }

  function buildTabs() {
    var card = document.querySelector("main > section.card");
    if (!card || card.dataset.uxt || !$("cin") || !$("dl")) return;
    card.dataset.uxt = "1";
    var idTab = {};
    TABS.forEach(function (t) { t.ids.split(" ").forEach(function (i) { idTab[i] = t.n; }); });
    var kids = Array.prototype.slice.call(card.children), tabs = kids.map(function (k) { return tabOf(k, idTab); });
    /* תוויות/מפרידים בלי בקר משלהם: תוויות הולכות עם הבקר הבא, השאר עם הקודם */
    for (var i = 0; i < kids.length; i++) if (!tabs[i]) {
      var lbl = kids[i].tagName == "LABEL" || kids[i].tagName == "HR";
      if (lbl) { for (var j = i + 1; j < kids.length; j++) if (tabs[j]) { tabs[i] = tabs[j]; break; } }
    }
    var last = 1;
    for (i = 0; i < kids.length; i++) { if (tabs[i]) last = tabs[i]; else tabs[i] = last; }
    /* תג שנשאר בסוף: הוא משויך ללשונית 4 (dl + msg), כל מה ש"קודם" לא יחזור אחורה */
    var panels = {}, bar = document.createElement("div");
    bar.className = "uxtabs"; bar.setAttribute("role", "tablist");
    TABS.forEach(function (t) {
      var p = document.createElement("div"); p.className = "uxp"; p.dataset.t = t.n; p.setAttribute("role", "tabpanel"); panels[t.n] = p;
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.t = t.n;
      b.innerHTML = "<b>" + t.n + "</b> <span>" + Lx(t.he, t.en) + "</span>"; b.title = Lx(t.he, t.en);
      b.onclick = function () { show(t.n, true); }; bar.appendChild(b);
    });
    card.insertBefore(bar, card.firstChild);
    kids.forEach(function (k, idx) { panels[tabs[idx]].appendChild(k); });
    TABS.forEach(function (t) {
      var p = panels[t.n], nav = document.createElement("div"); nav.className = "uxnav";
      if (t.n > 1) { var pv = document.createElement("button"); pv.type = "button"; pv.textContent = "‹ " + Lx("הקודם", "Back"); pv.onclick = function () { show(t.n - 1, true); }; nav.appendChild(pv); }
      if (t.n < 4) { var nx = document.createElement("button"); nx.type = "button"; nx.className = "go"; nx.textContent = Lx("הבא", "Next") + " ›"; nx.onclick = function () { show(t.n + 1, true); }; nav.appendChild(nx); }
      p.appendChild(nav); card.appendChild(p);
    });
    /* סיכום בלשונית 4, לפני כפתור ההורדה */
    var sum = document.createElement("div"); sum.className = "uxsum"; sum.id = "uxsum";
    sum.innerHTML = '<span class="hint">' + Lx("הסיכום יופיע אחרי שייבנה המודל.", "The summary appears once the model is built.") + "</span>";
    panels[4].insertBefore(sum, panels[4].firstChild);
    var cur = 1; try { cur = +sessionStorage.getItem("trip3d_tab") || 1; } catch (e) { }
    show(cur, false);
    function show(n, scroll) {
      cur = n;
      TABS.forEach(function (t) { panels[t.n].hidden = t.n != n; });
      Array.prototype.forEach.call(bar.children, function (b) { b.setAttribute("aria-selected", b.dataset.t == n ? "true" : "false"); });
      try { sessionStorage.setItem("trip3d_tab", String(n)); } catch (e) { }
      if (scroll) { try { bar.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { } }
      /* לשונית "מקומות" – אם הלחיצה על המפה מוסיפה סיכה, נעבור אליה כדי שיהיה ברור */
    }
    window.uxShowTab = show;
    function relabel() {
      Array.prototype.forEach.call(bar.children, function (b, i) { var t = TABS[i]; b.querySelector("span").textContent = Lx(t.he, t.en); b.title = Lx(t.he, t.en); });
      TABS.forEach(function (t) { var nv = panels[t.n].querySelector(".uxnav"); if (!nv) return; var bs = nv.querySelectorAll("button"); if (t.n > 1) bs[0].textContent = "‹ " + Lx("הקודם", "Back"); if (t.n < 4) bs[bs.length - 1].textContent = Lx("הבא", "Next") + " ›"; });
    }
    try { new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) { }
    var lg = $("lg"); if (lg) lg.addEventListener("click", function () { setTimeout(relabel, 120); setTimeout(relabel, 600); });
    /* אם הוסיפו מקום (cnt משתנה) – לא מעבירים לשונית; רק שומרים על מצב */
  }

  /* ---------- ⓘ הסברים ---------- */
  var TIPS = {
    ncol: ["כמה צבעים (או חומרים) המדפסת שלכם יכולה להדפיס בהדפסה אחת. 1 = קובץ אחד. 2–4 = קבצים נפרדים לכל צבע. 5 ומעלה = כל חלק (מעמד, מדינה, מים, כיתוב, סיכות) בקובץ משלו – מתאים ל-AMS ולמדפסות רב-צבע, וגם קובץ 3MF אחד עם כל החלקים.", "How many colors/materials your printer can print at once. 1 = one file. 2–4 = a file per color. 5+ = every part (stand, country, water, lettering, pins) in its own file – good for AMS / multi-color printers, plus one 3MF with all parts."],
    gj: ["GeoJSON הוא קובץ טקסט שמתאר צורות על מפה (למשל גבול של אזור). אם יש לכם גבול משלכם – אפשר להעלות אותו במקום לבחור מדינה.", "GeoJSON is a text file that describes shapes on a map (e.g. a region border). Upload your own instead of choosing a country."],
    impf: ["KML / KMZ הם קבצי מפה של Google (My Maps / Earth), GPX – קובץ מסלול מ-GPS, CSV – טבלה עם שם וקואורדינטות. כל המקומות שבקובץ יתווספו כסיכות.", "KML/KMZ are Google My Maps/Earth files, GPX is a GPS track, CSV is a table of names and coordinates. Every place in the file becomes a pin."],
    rimg: ["תמונת גבהים: צבעים או גווני אפור שמייצגים גובה (מפה פיזית). הכלי מתרגם אותם לגובה פיזי של הרים במודל.", "A height image: colors or grays that stand for elevation. The tool turns them into real relief height on the model."],
    rmode: ["\"מפתח הגבהים\" – איך לפרש את הצבעים בתמונה: מפה פיזית (ירוק=נמוך, חום/לבן=גבוה), או גווני אפור (בהיר=גבוה, או הפוך).", "The \"height key\" – how to read the image colors: physical map (green=low, brown/white=high) or grayscale (light=high, or inverted)."],
    rh: ["הגובה המרבי של ההרים במודל, במ״מ, אחרי ההקטנה. גבוה מדי = יותר חומר וזמן הדפסה.", "Maximum mountain height on the model, in mm. Higher = more material and print time."],
    route: ["הקו שמחבר בין הסיכות לפי הסדר. \"קו רציף\" דק ויציב להדפסה; \"מקווקו\" חוסך חומר אך פרטים קטנים יותר.", "A line joining the pins in order. Solid is sturdier to print; dashed saves material but has finer details."],
    ps: ["צורת הסימון של כל מקום. סיכה או כדור על מוט בולטים יותר; עמוד חזק יותר להדפסה.", "The marker shape for each place. Pin/ball-on-rod stands out; a column prints sturdier."],
    gap: ["המדינה מורמת על עמודים קטנים מעל המעמד – ככה הצבעים נפרדים נקי, ואפשר להדפיס כל חלק בנפרד.", "The country is raised on small pillars above the stand so colors separate cleanly and parts print individually."],
    bh: ["עובי המעמד (הבסיס). עבה יציב יותר ושוקל יותר.", "Thickness of the base. Thicker is sturdier and heavier."],
    rim: ["גימור הקצה של המעמד – חלק או מסגרת מוגבהת (נותנת מראה מוגמר).", "Edge finish of the stand – plain or a raised frame (a finished look)."],
    lh: ["כמה גבוהה המדינה מעל המעמד. \"שטוח\" חוסך חומר; \"מוגבה\" בולט יותר.", "How tall the country stands above the base. Flat saves material; raised stands out."],
    mgs: ["קוטר המגנט שיוכנס לחריץ בגב. מדדו את המגנט שברשותכם.", "Diameter of the magnet that fits into the slot at the back. Measure the one you have."],
    wtol: ["סבילות הצבע – כמה צבעים דומים לצבע הטפטפת ייחשבו מים. ערך גבוה = אזור מים רחב יותר.", "Color tolerance – how close a color must be to the dropper color to count as water. Higher = a wider water area."],
    wimg: ["תמונה של המדינה (למשל מצילום מפה) שממנה נזהה את אזורי המים לפי צבע.", "A picture of the country (e.g. a map screenshot) used to detect water areas by color."],
    qron: ["לוחית QR נפרדת שמובילה לאלבום התמונות שלכם. מודפסת בנפרד ומודבקת על המעמד.", "A separate QR plate linking to your photo album. Print it separately and stick it onto the stand."],
    bed: ["הגודל המרבי של משטח ההדפסה במדפסת שלכם. המודל יוקטן אוטומטית כדי להיכנס.", "The largest print bed of your printer. The model is scaled down automatically to fit."]
  };
  var tipEl = null;
  function ensureTip() { if (!tipEl) { tipEl = document.createElement("div"); tipEl.id = "uxtip"; tipEl.setAttribute("role", "tooltip"); document.body.appendChild(tipEl); } return tipEl; }
  function hideTip() { if (tipEl) tipEl.style.display = "none"; }
  function showTip(btn) {
    var t = ensureTip(); t.textContent = btn._tip(); t.style.display = "block";
    var r = btn.getBoundingClientRect(), w = t.offsetWidth, x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    var y = r.bottom + 8; if (y + t.offsetHeight > innerHeight - 8) y = Math.max(8, r.top - t.offsetHeight - 8);
    t.style.left = x + "px"; t.style.top = y + "px";
  }
  function addTips() {
    Object.keys(TIPS).forEach(function (id) {
      var el = $(id); if (!el || el.dataset.uxi) return; el.dataset.uxi = "1";
      /* מוצאים את התווית שמתארת את הבקר – הקודמת לו, או התווית שעוטפת אותו */
      var lab = el.closest("label") || el.previousElementSibling;
      if (!lab || lab.tagName != "LABEL") { var p = el.parentElement && el.parentElement.previousElementSibling; lab = p && p.tagName == "LABEL" ? p : null; }
      if (!lab) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "uxi"; b.textContent = "ⓘ";
      b.setAttribute("aria-label", Lx("הסבר", "Explanation"));
      b._tip = function () { return Lx(TIPS[id][0], TIPS[id][1]); };
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (tipEl && tipEl.style.display == "block" && tipEl._for == b) { hideTip(); return; } showTip(b); tipEl._for = b; });
      b.addEventListener("mouseenter", function () { showTip(b); tipEl._for = b; });
      b.addEventListener("mouseleave", hideTip);
      b.addEventListener("focus", function () { showTip(b); tipEl._for = b; });
      b.addEventListener("blur", hideTip);
      lab.appendChild(b);
    });
    if (!addTips.done) {
      addTips.done = 1;
      document.addEventListener("click", hideTip); addEventListener("scroll", hideTip, true);
      document.addEventListener("keydown", function (e) { if (e.key == "Escape") hideTip(); });
    }
  }
  window.uxAddTips = function (map) { Object.keys(map).forEach(function (k) { TIPS[k] = map[k]; }); addTips(); };

  /* ---------- מידות, משקל וזמן הדפסה (הערכה) ---------- */
  var GROUP = [["base", "מעמד", "Stand", /^(1_|6_qr)/], ["map", "מפה והרים", "Map & relief", /^(2_country|2a_|2c_|2d_|2f_)/], ["water", "מים", "Water", /^2b_/], ["text", "כיתוב ודגל", "Text & flag", /^(4_|5_flag)/], ["pins", "סיכות ומסלול", "Pins & route", /^(3_|3b_|3c_)/]];
  function volMm3(geoms) {
    var v = 0;
    geoms.forEach(function (ge) {
      var g = ge.index ? ge.toNonIndexed() : ge, a = g.attributes.position.array;
      for (var i = 0; i < a.length; i += 9) {
        v += (a[i] * (a[i + 4] * a[i + 8] - a[i + 5] * a[i + 7]) - a[i + 1] * (a[i + 3] * a[i + 8] - a[i + 5] * a[i + 6]) + a[i + 2] * (a[i + 3] * a[i + 7] - a[i + 4] * a[i + 6])) / 6;
      }
    });
    return Math.abs(v);
  }
  var FILL = 0.5 /* חלק מהנפח שבפועל מודפס (קירות + מילוי 15%) */, RHO = 1.24 /* PLA, גר׳/סמ״ק */, GPH = 11 /* גרם בשעה, הערכה גסה */;
  function fmtH(h) { return h < 1 ? Math.max(5, Math.round(h * 60)) + " " + Lx("דק׳", "min") : h.toFixed(1) + " " + Lx("שע׳", "h"); }

  /* ---------- אזהרות כיתוב ו-QR (משלימות את אזהרות האתר) ---------- */
  function lumRatio(h1, h2) {
    var L = function (h) { return [1, 3, 5].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); };
    var lum = function (h) { var c = L(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }, a = lum(h1), b = lum(h2);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  function textWarn() {
    var out = [];
    if (TOOL != "stand") return out;
    var W = 180, c = document.createElement("canvas"), g = c.getContext("2d"), fs = 26, title = $("trip").value || " ";
    do { g.font = "bold " + fs + "px " + FF(); fs--; } while (g.measureText(title).width > W - 8 && fs > 10);
    if (g.measureText(title).width > W) out.push(Lx("שם הטיול ארוך מדי ויחתך בקצוות – קצרו אותו", "The trip name is too long and will be cut off at the edges – shorten it"));
    var sub = [dt(), $("tsub").value.trim()].filter(Boolean).join(" · ");
    if (sub) {
      var f2 = 12; do { g.font = "bold " + f2 + "px " + FF(); f2--; } while (g.measureText(sub).width > W - 8 && f2 > 7);
      if (g.measureText(sub).width > W) out.push(Lx("השורה הנוספת/התאריכים ארוכים מדי ויחתכו – קצרו אותם", "The extra line/dates are too long and will be cut off – shorten them"));
      else if (f2 + 1 < 9) out.push(Lx("השורה הנוספת קטנה מאוד (קשה לקריאה) – קצרו אותה", "The extra line is very small (hard to read) – shorten it"));
    }
    if ($("shownames").checked) {
      var names = pins.map(function (p, i) { return $("numpins").checked && p.name ? (i + 1) + ". " + p.name : p.name; }).filter(Boolean);
      if (names.length) {
        g.font = "bold 13px " + FF();
        var lines = [], cur = [], wide = 0;
        names.forEach(function (n) {
          if (g.measureText(n).width > W) wide++;
          var t = cur.length ? cur.join(" · ") + " · " + n : n;
          if (g.measureText(t).width > W - 8 && cur.length) { lines.push(cur); cur = [n]; } else cur.push(n);
        });
        if (cur.length) lines.push(cur);
        var shown = lines.slice(0, sub ? 2 : 3).reduce(function (a, l) { return a + l.length; }, 0);
        if (shown < names.length) out.push(Lx((names.length - shown) + " שמות מקומות לא נכנסים על המעמד ולא יודפסו – בטלו 'הצג שמות' או הפחיתו מקומות", (names.length - shown) + " place names do not fit on the stand and won’t be printed – turn off 'show names' or use fewer places"));
        if (wide) out.push(Lx("שם מקום ארוך מדי ויחתך", "A place name is too long and will be cut off"));
      }
    }
    return out;
  }
  function qrWarn(P, z) {
    var out = [];
    if (TOOL != "stand" || !$("qron") || !$("qron").checked) return out;
    var url = $("qrurl").value.trim();
    if (!url) { out.push(Lx("סימנתם תגית QR אבל לא הוזן קישור", "QR tag is on but no link was entered")); return out; }
    var qp = null, qr = null;
    P.forEach(function (p) { if (p.name == "6_qr_plate") qp = p; if (p.name == "6_qr") qr = p; });
    if (!qp || !qp.geoms.length || !qr || !qr.geoms.length) { out.push(Lx("לא ניתן ליצור קוד QR מהקישור (ארוך מדי?). נסו קישור קצר", "Couldn’t build a QR code from the link (too long?). Try a short link")); return out; }
    var bb = new THREE.Box3(); qp.geoms.forEach(function (g) { g.computeBoundingBox(); bb.union(g.boundingBox); });
    var mod = 1.1 * z.sc;
    if (mod < 0.8) out.push(Lx("מודול ה-QR קטן (" + mod.toFixed(2) + " מ״מ) וקשה להדפסה ולסריקה – קצרו את הקישור או הגדילו את משטח ההדפסה", "The QR modules are small (" + mod.toFixed(2) + " mm) – hard to print and scan. Shorten the link or use a larger bed"));
    if (qp.color && qr.color && lumRatio(qp.color, qr.color) < 3) out.push(Lx("ניגודיות נמוכה בין לוחית ה-QR לקוד (או הדפסה בצבע אחד) – הקוד ייסרק פחות טוב. בחרו צבעי מעמד וכיתוב שונים והדפיסו ב-2 צבעים", "Low contrast between the QR plate and code (or single-color print) – it will scan less reliably. Pick different stand/text colors and print in 2 colors"));
    return out;
  }
  function puzzleWarn() {
    var out = [];
    if (TOOL != "puzzle") return out;
    var want = +$("pcs").value, got = puzzlePieces(want).length;
    if (got < want && got > 0) out.push(Lx("התקבלו " + got + " חלקים מתוך " + want + " שביקשתם (המדינה צרה מדי לחלוקה כזו). נסו פחות חלקים", "Got " + got + " pieces instead of the " + want + " you asked for (the country is too narrow for that split). Try fewer pieces"));
    return out;
  }
  function extraWarn(P, z) {
    var ex = textWarn().concat(qrWarn(P, z), puzzleWarn()), w = $("warn");
    if (!ex.length || !w) return;
    var cur = /^✅/.test(w.textContent) ? "" : w.innerHTML;
    w.innerHTML = (cur ? cur + "<br>" : "") + ex.map(function (x) { return "⚠️ " + x; }).join("<br>");
  }
  function hookSize() {
    if (typeof window.showSize !== "function" || window.showSize.__ux) return;
    var orig = window.showSize;
    var w = function (P) {
      orig.apply(this, arguments);
      try {
        var z = scaleFor(P), bb = new THREE.Box3();
        P.forEach(function (p) { p.geoms.forEach(function (g) { g.computeBoundingBox(); bb.union(g.boundingBox); }); });
        var hz = (bb.max.z - bb.min.z) * z.sc / 10;
        var sz = $("sz");
        if (sz && isFinite(hz) && hz > 0) sz.textContent = Lx("גודל בהדפסה: ", "Print size: ") + z.w.toFixed(1) + "×" + z.h.toFixed(1) + "×" + hz.toFixed(1) + " " + Lx("ס״מ (ר×ע×ג)", "cm (W×D×H)") + (z.sc < 1 && TOOL == "stand" ? Lx(" (הוקטן להתאים למשטח)", " (scaled to fit the bed)") : "");
        var rows = [], tot = 0, tris = 0;
        P.forEach(function (p) { p.geoms.forEach(function (g) { tris += g.index ? g.index.array.length / 3 : g.attributes.position.array.length / 9; }); });
        GROUP.forEach(function (gr) {
          var gs = []; P.forEach(function (p) { if (gr[3].test(p.name)) gs.push.apply(gs, p.geoms); });
          if (!gs.length) return;
          var cm3 = volMm3(gs) * Math.pow(z.sc, 3) / 1000, g = cm3 * RHO * FILL; tot += g; rows.push([Lx(gr[1], gr[2]), g]);
        });
        var s = $("uxsum"); if (!s) return;
        s.innerHTML = "<b>" + Lx("סיכום להדפסה (הערכה)", "Print summary (estimate)") + "</b><br>"
          + "📐 " + z.w.toFixed(1) + "×" + z.h.toFixed(1) + "×" + hz.toFixed(1) + " " + Lx("ס״מ (אורך × רוחב × גובה)", "cm (L × W × H)") + "<br>"
          + "🔺 " + Math.round(tris).toLocaleString() + " " + Lx("משולשים", "triangles") + "<br>"
          + "⚖️ " + Lx("כ-", "≈ ") + Math.round(tot) + " " + Lx("גרם PLA", "g PLA") + " · ⏱ " + Lx("כ-", "≈ ") + fmtH(tot / GPH)
          + "<table>" + rows.map(function (r) { return "<tr><td>" + r[0] + "</td><td>" + Math.round(r[1]) + " " + Lx("גר׳", "g") + "</td></tr>"; }).join("") + "</table>"
          + '<span class="hint">' + Lx("הערכה לפי מילוי 15% וגובה שכבה 0.2 מ״מ. הזמן והמשקל האמיתיים תלויים במדפסת ובהגדרות הסלייסר.", "Based on 15% infill and 0.2 mm layers. Real time and weight depend on your printer and slicer settings.") + "</span>";
      } catch (e) { /* הערכה היא בונוס – לא שוברים את התצוגה */ }
      try { extraWarn(P, scaleFor(P)); } catch (e) { /* אזהרות הן בונוס */ }
    };
    w.__ux = 1; window.showSize = w;
    try { if (typeof update === "function") update(); } catch (e) { }
  }

  /* ---------- ספינרים וטעינה ---------- */
  function spin(btn, msgEl, txt, fn) {
    return async function () {
      var self = this, args = arguments;
      if (btn.classList.contains("uxspin")) return;
      btn.classList.add("uxspin");
      var box = null;
      if (msgEl) { box = document.createElement("div"); box.className = "uxload"; box.innerHTML = "<i></i><span></span>"; box.lastChild.textContent = txt; msgEl.parentNode.insertBefore(box, msgEl); }
      try { return await fn.apply(self, args); }
      finally { btn.classList.remove("uxspin"); if (box && box.parentNode) box.parentNode.removeChild(box); }
    };
  }
  function hookLoaders() {
    var sb = $("sb");
    if (sb && sb.onclick && !sb.__ux) { sb.__ux = 1; sb.onclick = spin(sb, $("cands"), Lx("מחפש מקום… (יכול לקחת כמה שניות)", "Searching… (may take a few seconds)"), sb.onclick); }
    ["wb", "impb"].forEach(function (id) {
      var b = $(id); if (b && b.onclick && !b.__ux) { b.__ux = 1; b.onclick = spin(b, null, "", b.onclick); }
    });
    /* קבצים: מציגים את שכבת הטעינה לפני העיבוד הכבד, ואז מריצים את המטפל המקורי */
    var seen = new WeakSet();
    ["gj", "wf", "wimg", "rimg", "impf", "fimg"].forEach(function (id) {
      var f = $(id); if (!f) return;
      f.addEventListener("change", function (e) {
        if (seen.has(e)) return; if (!f.files || !f.files.length) return;
        e.stopImmediatePropagation();
        if (typeof setBusy === "function") setBusy(true, Lx("טוען ומעבד קובץ…", "Loading and processing the file…"));
        requestAnimationFrame(function () {
          setTimeout(function () {
            var ev = new Event("change", { bubbles: true }); seen.add(ev);
            try { f.dispatchEvent(ev); } finally { setTimeout(function () { if (typeof setBusy === "function") setBusy(false); }, 450); }
          }, 30);
        });
      }, true);
    });
  }

  /* ---------- מובייל: סיבוב מול גלילה ---------- */
  function touchToggles() {
    ["map", "view"].forEach(function (id) {
      var c = $(id); if (!c || c.dataset.uxs) return; c.dataset.uxs = "1";
      var b = document.createElement("button"); b.type = "button"; b.className = "uxscroll";
      var on = false;
      function paint() { b.textContent = on ? Lx("✋ גלילת העמוד (פעיל) – לחצו לחזור לסיבוב", "✋ Page scroll (on) – tap to rotate again") : (id == "view" ? Lx("✋ גלילה בעמוד: לחצו כדי לא לסובב", "✋ Scroll the page instead of rotating") : Lx("✋ גלילה בעמוד: לחצו כדי לא לצייר", "✋ Scroll the page instead of drawing")); c.style.touchAction = on ? "pan-y" : "none"; }
      b.onclick = function () { on = !on; paint(); }; paint();
      c.parentNode.insertBefore(b, c);
    });
  }

  function init() {
    try { buildTabs(); } catch (e) { console.warn("ux tabs", e); }
    try { addTips(); } catch (e) { console.warn("ux tips", e); }
    try { hookSize(); } catch (e) { console.warn("ux size", e); }
    try { hookLoaders(); } catch (e) { console.warn("ux loaders", e); }
    try { touchToggles(); } catch (e) { console.warn("ux touch", e); }
    /* ⓘ אחרי החלפת שפה – הטקסט נשלף בזמן הצגה, ולכן אין צורך בעדכון */
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
