/* mobile.js (v59): פריסת מובייל לעורך
   במסך צר ובאנכי: הקנבס התלת-ממדי (עם כפתורי המבט) קבוע בחלק העליון של המסך, והבקרים נגללים מתחתיו.
   כך רואים את התוצאה בזמן שמשנים הגדרות, בלי לגלול למטה ולמעלה.
   הפתרון הוא CSS בלבד (position: sticky + order) ולכן אין גלילה מקוננת (שמפריעה במסכי מגע). כפתור 📌 מאפשר לבטל את הקיבוע, והבחירה נשמרת.
   גובה הכרטיס נמדד ומועבר כמשתנה --uxph כדי שסרגל הלשוניות ידבק מתחתיו.
   מבנה הנתונים: מחלקה uxst על html (קיבוע פעיל), localStorage.trip3d_stick = "0" לביטול. window.mobileApi.
   המודול אינו נוגע בקוד הראשי. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var KEY = "trip3d_stick";
  var Q = "(max-width:1000px) and (orientation:portrait) and (min-height:520px)";

  function pref() { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } }
  function save(v) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} }

  /* כרטיס הקיבוע הוא עטיפה נפרדת (#uxstk) שמכילה רק את הקנבס ואת כפתורי המבט.
     שאר תוכן כרטיס התצוגה (למשל פקדי חומר ושכבות) נשאר במקומו וניגלל כרגיל. */
  var CSS =
    "@media " + Q + "{"
    + "html.uxst main{display:flex;flex-direction:column;gap:10px;padding-top:0}"
    + "html.uxst main>#uxstk{order:-1;position:sticky;top:0;z-index:30;padding:6px 10px 8px;margin:0 -8px;border-radius:0 0 16px 16px;box-shadow:0 8px 20px rgba(0,0,0,.28)}"
    + "html.uxst #uxstk #view{display:block;width:min(100%,calc(46vh - 56px));width:min(100%,calc(46dvh - 56px));height:auto;aspect-ratio:1/1;margin:0 auto}"
    + "html.uxst #uxstk .row{margin:6px 0 0;justify-content:center;flex-wrap:wrap}"
    + "html.uxst #uxstk .row button{min-height:34px;padding:4px 10px;font-size:13px}"
    + "html.uxst .uxtabs{top:var(--uxph,46vh)}"
    + "}"
    + "#uxstk{display:none}html.uxst #uxstk.on{display:block}"
    + ".uxpin{display:none;min-width:40px}@media (max-width:1000px) and (orientation:portrait) and (min-height:520px){.uxpin{display:inline-block}}";

  var M = { sec: null, wrap: null, mk: {} };
  function mount() {
    var v = $("view"); if (!v) return false;
    var card = v.closest("section"); if (!card) return false;
    M.sec = card;
    if (!$("mobcss")) { var st = document.createElement("style"); st.id = "mobcss"; st.textContent = CSS; document.head.appendChild(st); }
    var row = card.querySelector(".row");
    if (row && !$("uxpinb")) {
      var b = document.createElement("button"); b.type = "button"; b.id = "uxpinb"; b.className = "uxpin";
      b.onclick = function () { api.set(!api.on()); };
      row.appendChild(b);
    }
    return true;
  }
  /* מעבירים את הקנבס והשורה לעטיפה כשהמצב פעיל, ומחזירים למקומם המקורי כשלא */
  function relocate() {
    if (!M.sec) return;
    var want = api.active(), v = $("view"), row = M.sec.querySelector(".row") || (M.wrap && M.wrap.querySelector(".row"));
    if (want && !M.wrap) {
      var w = document.createElement("div"); w.id = "uxstk"; w.className = "card uxprev on";
      M.sec.parentNode.insertBefore(w, M.sec);
      [["v", v], ["r", row]].forEach(function (p) { if (!p[1]) return; var m = document.createComment("uxstk-" + p[0]); p[1].parentNode.insertBefore(m, p[1]); M.mk[p[0]] = m; w.appendChild(p[1]); });
      M.wrap = w;
    } else if (!want && M.wrap) {
      [["v", v], ["r", row]].forEach(function (p) { var m = M.mk[p[0]]; if (p[1] && m && m.parentNode) { m.parentNode.insertBefore(p[1], m); m.remove(); } });
      M.wrap.remove(); M.wrap = null; M.mk = {};
    }
  }
  function paint() {
    var b = $("uxpinb"); if (!b) return;
    var on = document.documentElement.classList.contains("uxst");
    b.textContent = on ? "📌" : "📍";
    b.title = b.ariaLabel = on ? Lx("ביטול קיבוע התצוגה", "Unpin the preview") : Lx("קיבוע התצוגה למעלה", "Pin the preview to the top");
    b.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function measure() {
    var c = M.wrap; if (!c) { document.documentElement.style.setProperty("--uxph", "0px"); return; }
    document.documentElement.style.setProperty("--uxph", Math.round(c.getBoundingClientRect().height) + "px");
  }
  var api = {
    on: function () { return document.documentElement.classList.contains("uxst"); },
    set: function (v) { document.documentElement.classList.toggle("uxst", !!v); save(!!v); relocate(); paint(); measure(); },
    active: function () { return api.on() && window.matchMedia(Q).matches; }
  };

  function init() {
    if (!mount()) return;
    document.documentElement.classList.toggle("uxst", pref());
    var mq = window.matchMedia(Q), re = function () { relocate(); paint(); measure(); };
    re();
    try { mq.addEventListener("change", re); } catch (e) { try { mq.addListener(re); } catch (e2) {} }
    try { new ResizeObserver(measure).observe(document.querySelector("main") || document.body); } catch (e) { setInterval(measure, 1000); }
    window.addEventListener("resize", function () { relocate(); measure(); }); window.addEventListener("orientationchange", function () { setTimeout(re, 250); });
    try { new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (e) {}
    window.mobileApi = api;
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
