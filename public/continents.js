/* continents.js (v66): מפות יבשות
   כל יבשת היא "כמה מדינות" (המצב הקיים של כמה מדינות על מעמד אחד) עם חיתוך (crop) לאזור היבשת, כדי שחלקים רחוקים (אי באוקיינוס, מזרח רוסיה) לא יכווצו את המפה.
   מבנה הנתונים: CONT = [{k, he, en, e, crop: [מערב, דרום, מזרח, צפון], m: [שמות מדינות כפי שהן ב-countries]}].
   הפעלה: continentsApi.apply(k) (בעורך), כפתורי יבשות בלשונית 1, ושבב יחיד בשאלון של כמה מדינות (במקום עשרות שבבי מדינות).
   זיהוי יבשת: אם רשימת המדינות הנוכחית (multiNames) זהה בדיוק לרשימת יבשת, החיתוך מוחל אוטומטית (גם בטעינת פרויקט שמור).
   המודול עוטף setCountry, renderChips ו-addPresets בלבד. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + Lx(he, en) + "</span>"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var CONT = [
    { k: "europe", he: "אירופה", en: "Europe", e: "🏰", crop: [-25, 34, 45, 72], m: ["Albania", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Lithuania", "Luxembourg", "Macedonia", "Moldova", "Montenegro", "Netherlands", "Norway", "Poland", "Portugal", "Republic of Serbia", "Romania", "Russia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Turkey", "Ukraine", "United Kingdom"] },
    { k: "asia", he: "אסיה", en: "Asia", e: "🏯", crop: [25, -11, 146, 78], m: ["Afghanistan", "Armenia", "Azerbaijan", "Bangladesh", "Bhutan", "Brunei", "Cambodia", "China", "East Timor", "Georgia", "India", "Indonesia", "Iran", "Iraq", "Israel", "Japan", "Jordan", "Kazakhstan", "Kuwait", "Kyrgyzstan", "Laos", "Lebanon", "Malaysia", "Mongolia", "Myanmar", "Nepal", "North Korea", "Oman", "Pakistan", "Philippines", "Qatar", "Russia", "Saudi Arabia", "South Korea", "Sri Lanka", "Syria", "Taiwan", "Tajikistan", "Thailand", "Turkey", "Turkmenistan", "United Arab Emirates", "Uzbekistan", "Vietnam", "Yemen"] },
    { k: "africa", he: "אפריקה", en: "Africa", e: "🦁", crop: [-20, -36, 52, 38], m: ["Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cameroon", "Central African Republic", "Chad", "Democratic Republic of the Congo", "Republic of the Congo", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea Bissau", "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "Senegal", "Sierra Leone", "Somalia", "Somaliland", "South Africa", "South Sudan", "Sudan", "Swaziland", "Togo", "Tunisia", "Uganda", "United Republic of Tanzania", "Western Sahara", "Zambia", "Zimbabwe"] },
    { k: "namerica", he: "צפון אמריקה", en: "North America", e: "🗽", crop: [-170, 7, -12, 84], m: ["Belize", "Canada", "Costa Rica", "Cuba", "Dominican Republic", "El Salvador", "Greenland", "Guatemala", "Haiti", "Honduras", "Jamaica", "Mexico", "Nicaragua", "Panama", "Puerto Rico", "The Bahamas", "Trinidad and Tobago", "United States of America"] },
    { k: "samerica", he: "דרום אמריקה", en: "South America", e: "🌎", crop: [-82, -56, -34, 13], m: ["Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Falkland Islands", "French Guiana", "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela"] },
    { k: "oceania", he: "אוקיאניה", en: "Oceania", e: "🦘", crop: [110, -48, 180, -1], m: ["Australia", "Fiji", "New Caledonia", "New Zealand", "Papua New Guinea", "Solomon Islands", "Vanuatu"] }
  ];
  var sig = function (a) { return a.slice().sort().join("|"); };
  var byK = function (k) { return CONT.filter(function (c) { return c.k == k; })[0]; };
  var cn = function (c) { return isEn() ? c.en : c.he; };
  var members = function (c) { return c.m.filter(function (n) { return countries[n]; }); };
  var matchNames = function (names) { var s = sig(names || []); return CONT.filter(function (c) { return sig(members(c)) == s; })[0] || null; };

  /* זיהוי יבשת בכל טעינה של כמה מדינות: מחיל חיתוך ושם */
  function hookSetCountry() {
    var o = setCountry;
    setCountry = function (rs, keep, g) {
      var r = o.apply(this, arguments);
      try {
        var c = g && MULTI && matchNames(multiNames);
        if (c) {
          if (!crop) { crop = c.crop.slice(); fit(); update(); }
          var ci = $("cin"); if (ci) ci.value = c.e + " " + cn(c);
        }
      } catch (e) { console.warn("continents", e); }
      return r;
    };
  }

  /* בשאלון: שבב אחד ליבשת במקום עשרות שבבי מדינות */
  function hookChips() {
    var o = renderChips;
    renderChips = function () {
      var r = o.apply(this, arguments);
      try {
        var c = matchNames(W.ctys), box = $("chips");
        if (c && box) box.innerHTML = '<span class="chip">' + c.e + " " + esc(cn(c)) + " (" + members(c).length + " " + Lx("מדינות", "countries") + ')<b data-rm="all">✕</b></span>';
      } catch (e) {}
      return r;
    };
  }
  /* בשורת הסיכום של השאלון מציגים את שם היבשת במקום רשימת עשרות מדינות */
  function hookSummary() {
    var o = wr;
    wr = function () {
      var r = o.apply(this, arguments);
      try {
        var c = MULTI && matchNames(W.ctys);
        if (c) {
          var all = W.ctys.map(cname_).join(", ");
          document.querySelectorAll("#s2 .rc *").forEach(function (e) { if (!e.children.length && e.textContent.trim() == all) e.textContent = c.e + " " + cn(c) + " (" + W.ctys.length + ")"; });
        }
      } catch (e) {}
      return r;
    };
  }
  var cname_ = function (n) { try { return cname(n); } catch (e) { return n; } };
  function hookPresets() {
    var o = addPresets;
    addPresets = function () {
      var r = o.apply(this, arguments);
      try {
        var d = $("presets"); if (!d || d.querySelector("[data-cont]")) return r;
        var lb = document.createElement("div"); lb.className = "hint"; lb.style.width = "100%"; lb.textContent = Lx("או יבשת שלמה:", "Or a whole continent:"); d.append(lb);
        CONT.forEach(function (c) {
          var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.dataset.cont = c.k;
          b.style.cssText = "cursor:pointer;border:1px solid var(--bd);background:var(--card);color:inherit;font:inherit";
          b.textContent = c.e + " " + cn(c);
          b.onclick = function () { W.ctys = members(c); renderChips(); var e = $("werr"); if (e) e.textContent = ""; };
          d.append(b);
        });
      } catch (e) { console.warn("continents", e); }
      return r;
    };
  }
  /* הסרת השבב "כל היבשת" מנקה את הרשימה (המאזין הקיים מסיר לפי אינדקס מספרי) */
  function hookRemove() {
    document.addEventListener("click", function (e) {
      var t = e.target; if (t && t.dataset && t.dataset.rm == "all") { W.ctys = []; renderChips(); e.stopImmediatePropagation(); }
    }, true);
  }

  /* בעורך */
  function apply(k) {
    var c = byK(k); if (!c) return false;
    if (TOOL != "stand") { msg(Lx("מפת יבשת זמינה במעמד. עברו לכלי מעמד.", "A continent map needs the stand tool. Switch to the stand.")); return false; }
    var names = members(c);
    if (names.length < 2) { msg(Lx("נתוני המדינות לא נטענו עדיין, נסו שוב בעוד רגע", "Country data hasn't loaded yet, try again in a moment")); return false; }
    if (pins.length && !confirm(Lx("החלפת הנקודות הנוכחיות במפת " + c.he + "?", "Replace the current points with the map of " + c.en + "?"))) return false;
    MULTI = true; multiNames = names.slice();
    setCountry(names.flatMap(function (n) { return countries[n]; }), false, names.map(function (n) { return countries[n]; }));
    msg(Lx("נטענה מפת " + c.he + " (" + names.length + " מדינות). אפשר להוסיף נקודות ולערוך הכול.", "Loaded the map of " + c.en + " (" + names.length + " countries). Add points and edit as usual."));
    return true;
  }
  function msg(t) { var m = $("contmsg"); if (m) m.textContent = t || ""; }
  function paint() { var b = $("contbox"); if (!b) return; b.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; }); b.querySelectorAll("button[data-k]").forEach(function (x) { var c = byK(x.dataset.k); x.textContent = c.e + " " + cn(c); }); }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="1"]'); if (!host || $("contbox")) return;
    var nav = host.querySelector(".uxnav"), d = document.createElement("div"); d.id = "contbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("🌍 מפת יבשת", "🌍 Continent map") + "</b>"
      + '<div class="hint">' + span("כל המדינות של יבשת על מעמד אחד. אפשר להוסיף נקודות ומסלול כרגיל. מתאים למעמד; ההדפסה גדולה ומפורטת פחות.", "All the countries of a continent on one stand. Add points and a route as usual. For the stand tool; the print is larger and less detailed.") + "</div>"
      + '<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">' + CONT.map(function (c) { return '<button type="button" data-k="' + c.k + '" style="margin:0;width:auto">' + c.e + " " + esc(cn(c)) + "</button>"; }).join("") + "</div>"
      + '<div id="contmsg" class="hint" role="status"></div>';
    host.insertBefore(d, nav || null);
    d.querySelectorAll("button[data-k]").forEach(function (b) { b.onclick = function () { apply(b.dataset.k); }; });
  }
  function init() {
    if (typeof setCountry != "function" || typeof renderChips != "function" || typeof addPresets != "function" || typeof wr != "function" || typeof W == "undefined") return;
    [hookSetCountry, hookChips, hookSummary, hookPresets, hookRemove, buildUI].forEach(function (f) { try { f(); } catch (e) { console.warn("continents", f.name, e); } });
    try { new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (e) {}
    window.continentsApi = { CONT: CONT, apply: apply, match: matchNames };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
