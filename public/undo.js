/* undo.js (v59): בטל / בצע שוב לטופס העריכה
   רעיון: כל מצב של הפרויקט הוא JSON אחד (getProj). אחרי כל שינוי (update) נשמרת תמונת מצב, ובטל/בצע שוב טוענים אותה חזרה (putProj).
   מבנה הנתונים: H = {stack: [json,...], i: אינדקס המצב הנוכחי, tool: הכלי של ההיסטוריה}. עד MAX מצבים; שינוי חדש אחרי "בטל" מוחק את ה"בצע שוב".
   הגבלות: תמונות שהועלו (דגל, מים, הרים) אינן חלק מההיסטוריה, כדי לא לנפח זיכרון; הן נשארות כפי שהן.
   המודול עוטף את update ו-putProj בלבד. אין שינוי בקוד הראשי. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };

  var MAX = 40, DELAY = 600;
  var H = { stack: [], i: -1, tool: null };
  var timer = 0, restoring = false, restoreTimer = 0;

  function snap() {
    var o = getProj(false);
    o.flagSrc = null;                       // תמונות לא נשמרות בהיסטוריה
    return JSON.stringify(o);
  }
  function reset(s) { H.stack = [s]; H.i = 0; H.tool = TOOL; paint(); }

  /* שומר מצב חדש אם משהו השתנה. נקרא אחרי השהיה קצרה כדי שגרירה או הקלדה ייחשבו שינוי אחד */
  function capture() {
    clearTimeout(timer); timer = 0;
    if (restoring) return;
    var s;
    try { s = snap(); } catch (e) { return; }
    if (H.i < 0 || H.tool !== TOOL) { reset(s); return; }
    if (s === H.stack[H.i]) return;
    H.stack.length = H.i + 1;               // שינוי חדש מוחק את ה"בצע שוב"
    H.stack.push(s);
    if (H.stack.length > MAX) H.stack.shift();
    H.i = H.stack.length - 1;
    paint();
  }
  function go(step) {
    if (timer) capture();                   // שינוי שממתין נשמר קודם, כדי לא לאבד אותו
    var j = H.i + step;
    if (j < 0 || j >= H.stack.length) return false;
    var o = JSON.parse(H.stack[j]);
    if (typeof flagSrc != "undefined") o.flagSrc = flagSrc;   // הדגל הנוכחי נשאר
    restoring = true; H.i = j;
    try { putProj(o); } catch (e) { console.warn("undo", e); }
    quietRestore(1500);
    paint();
    return true;
  }
  /* אחרי שחזור, כמה עדכונים מאוחרים (טעינת גופן וכד׳) עלולים לשנות מעט את ה-JSON. מחכים לשקט ואז מעדכנים את המצב הנוכחי במקום להוסיף מצב חדש */
  function quietRestore(ms) {
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(function () {
      restoring = false;
      try { if (H.i >= 0) H.stack[H.i] = snap(); } catch (e) {}
      paint();
    }, ms);
  }
  var undo = function () { return go(-1); }, redo = function () { return go(1); };

  /* ============ ממשק ============ */
  function paint() {
    var u = $("undobtn"), r = $("redobtn"); if (!u || !r) return;
    u.disabled = !(H.i > 0 || timer); r.disabled = !(H.i >= 0 && H.i < H.stack.length - 1);
    u.title = u.ariaLabel = Lx("בטל (Ctrl+Z)", "Undo (Ctrl+Z)"); r.title = r.ariaLabel = Lx("בצע שוב (Ctrl+Y)", "Redo (Ctrl+Y)");
  }
  function buildUI() {
    if ($("undobtn")) return;
    var host = document.querySelector("header .hb"); if (!host) return;
    var mk = function (id, t, fn) { var b = document.createElement("button"); b.type = "button"; b.id = id; b.textContent = t; b.onclick = fn; b.className = "undob"; return b; };
    var st = document.createElement("style");
    st.textContent = ".undob{min-width:40px;font-weight:700}.undob:disabled{opacity:.4;cursor:default}";
    document.head.appendChild(st);
    host.insertBefore(mk("redobtn", "↷", redo), host.firstChild);
    host.insertBefore(mk("undobtn", "↶", undo), host.firstChild);
    paint();
  }
  function onKey(e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    var t = e.target, tag = t && t.tagName, type = t && t.type;
    if (t && (t.isContentEditable || tag == "TEXTAREA" || (tag == "INPUT" && /^(text|search|number|email|url|tel|password|date)$/i.test(type || "text")))) return;   // בשדות טקסט נשאר הבטל של הדפדפן
    if ($("intro") && $("intro").style.display == "flex") return;
    var k = (e.key || "").toLowerCase();
    if (k == "z" && !e.shiftKey) { if (undo()) e.preventDefault(); }
    else if (k == "y" || (k == "z" && e.shiftKey)) { if (redo()) e.preventDefault(); }
  }

  /* לפני כל פעולה של המשתמש שומרים את המצב הנוכחי כנקודת מוצא, כדי שאפשר יהיה לחזור גם לשינוי הראשון */
  function pre() { if (!timer && !restoring) { try { capture(); } catch (e) {} } }
  function hook() {
    var ou = update;
    update = function () {
      var r = ou.apply(this, arguments);
      try {
        if (restoring) quietRestore(1200);
        else { clearTimeout(timer); timer = setTimeout(capture, DELAY); paint(); }
      } catch (e) {}
      return r;
    };
  }
  function init() {
    if (typeof update != "function" || typeof getProj != "function" || typeof putProj != "function") return;
    try { hook(); buildUI(); document.addEventListener("keydown", onKey);
      ["pointerdown", "focusin"].forEach(function (ev) { document.addEventListener(ev, pre, true); }); } catch (e) { console.warn("undo", e); }
    try { new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (e) {}
    window.undoApi = { H: H, undo: undo, redo: redo, capture: capture, reset: function () { reset(snap()); } };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
