/* תוספות לאתר: מצב כהה/בהיר ידני, סיור היכרות, התקנה כאפליקציה והתראות דחיפה.
   כל חלק עטוף ב-try כדי שתקלה בו לא תפגע בשאר האתר. */
(function () {
  if (window.__ex || /\/(guide|admin)\.html/.test(location.pathname)) return; window.__ex = 1;
  var ls = { g: function (k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }, s: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function en() { var l = ls.g("trip3d_l"); return l === "en" || document.documentElement.lang === "en"; }
  var T = function (he, e) { return en() ? e : he; };

  // ----- מצב כהה/בהיר: אוטומטי לפי המכשיר, ואפשר לקבוע ידנית -----
  function applyTheme(v) { if (v === "dark" || v === "light") document.documentElement.setAttribute("data-theme", v); else document.documentElement.removeAttribute("data-theme"); }
  applyTheme(ls.g("trip3d_theme"));
  function curTheme() { var t = document.documentElement.getAttribute("data-theme"); return t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }

  // כניסה עם אימות דו-שלבי (מנהל שהפעיל אותו): מבקש קוד ומנסה שוב
  try {
    if (window.API && API.j) {
      var _j = API.j;
      API.j = function (m, p, b) {
        var self = this;
        return _j.call(self, m, p, b).catch(function (e) {
          if (p === "/auth/login" && e && e.data && e.data.need2fa) {
            var c = window.prompt(T("הזינו את קוד האימות הדו-שלבי (6 ספרות) מהאפליקציה", "Enter your 6-digit two-factor code"));
            if (c) return _j.call(self, m, p, Object.assign({}, b, { code: c }));
          }
          throw e;
        });
      };
    }
  } catch (e) {}

  function init() {
    var css = document.createElement("style");
    css.textContent = "#exb{position:fixed;bottom:64px;right:14px;z-index:54;display:flex;flex-direction:column;gap:8px;align-items:center}" +
      "#exb button{width:40px;height:40px;border-radius:50%;border:1px solid var(--bd,#ddd);background:var(--card,#fff);color:var(--tx,#1d1d1b);font-size:18px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.18);line-height:1;padding:0}" +
      "#exb button:hover{transform:scale(1.08)}#exb button:focus-visible{outline:3px solid var(--ac,#ea580c);outline-offset:2px}" +
      "#tourbg{position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}" +
      "#tourc{background:var(--card,#fff);color:var(--tx,#1d1d1b);border-radius:18px;max-width:380px;width:100%;padding:22px 22px 16px;box-shadow:0 20px 60px rgba(0,0,0,.45);font:15px/1.6 system-ui,'Segoe UI',Arial,sans-serif}" +
      "#tourc h3{margin:0 0 6px;font-size:19px}#tourc .tn{display:flex;gap:8px;margin-top:14px;align-items:center}#tourc .tn span{flex:1;color:var(--mu,#777);font-size:13px;text-align:center;white-space:nowrap}" +
      "#tourc button{border:0;border-radius:10px;padding:9px 16px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer}#tourc .go{background:var(--ac,#ea580c);color:#fff}#tourc .sk{background:transparent;color:var(--mu,#777)}" +
      "#exMore{display:none}" +
      "@media(max-width:600px){#exMore{display:block!important}#exb button{width:36px;height:36px;font-size:16px}#exb button:not(#exMore){display:none}#exb.open button:not(#exMore){display:block}#home h1{margin-top:38px}}";
    css.textContent += "#gtab{z-index:28!important}#bl{bottom:calc(max(12px,env(safe-area-inset-bottom,0px)) + var(--ckh,0px))!important}#adbtn{bottom:calc(12px + var(--ckh,0px))!important}#exb{bottom:calc(" + (en() ? 14 : 64) + "px + var(--ckh,0px))!important}";
    document.head.appendChild(css);
    // מרים את הכפתורים הצפים מעל הודעת העוגיות, כדי שלא יסתירו אותה
    setInterval(function () { var c = document.getElementById("ckn"), v = c ? c.offsetHeight + 8 : 0; if (v !== window.__ckh) { window.__ckh = v; document.documentElement.style.setProperty("--ckh", v + "px"); } }, 700);
    var box = document.createElement("div"); box.id = "exb"; document.body.appendChild(box);
    var more = document.createElement("button"); more.type = "button"; more.id = "exMore"; more.textContent = "⋯"; more.title = T("עוד", "More"); more.setAttribute("aria-label", T("עוד כפתורים", "More buttons")); more.setAttribute("aria-expanded", "false");
    more.onclick = function () { var o = box.classList.toggle("open"); more.setAttribute("aria-expanded", o ? "true" : "false"); more.textContent = o ? "✕" : "⋯"; };
    box.appendChild(more);
    function btn(id, ic, label, fn) { var b = document.createElement("button"); b.type = "button"; b.id = id; b.textContent = ic; b.title = label; b.setAttribute("aria-label", label); b.onclick = fn; box.insertBefore(b, more); return b; }

    try {
      var tb = btn("exTheme", curTheme() === "dark" ? "☀️" : "🌙", T("מצב כהה/בהיר", "Dark / light mode"), function () {
        var n = curTheme() === "dark" ? "light" : "dark"; applyTheme(n); ls.s("trip3d_theme", n); tb.textContent = n === "dark" ? "☀️" : "🌙";
      });
    } catch (e) {}

    // ----- סיור היכרות -----
    try {
      var steps = [
        [T("ברוכים הבאים לסטודיו 👋", "Welcome to the studio 👋"), T("בכמה צעדים קצרים תקבלו קבצי הדפסה של מזכרת מהטיול. הכול בחינם.", "In a few short steps you'll get print-ready files of a souvenir from your trip. It's free.")],
        [T("1. בוחרים כלי ומדינה", "1. Pick a tool and a country"), T("מזכרת עם מעמד, מחזיק מפתחות, מגנט, קישוט ועוד. מתחילים בלחיצה על הכלי שאתם אוהבים.", "A souvenir with stand, keychain, magnet, ornament and more. Start by tapping the tool you like.")],
        [T("2. מסמנים מקומות ומעצבים", "2. Mark places and design"), T("מוסיפים סיכות, שם טיול, תאריכים וצבעים, ורואים הכול בתלת-ממד תוך כדי.", "Add pins, a trip name, dates and colors, and watch it all update in 3D.")],
        [T("3. מורידים ומדפיסים", "3. Download and print"), T("ההורדה דורשת התחברות חד-פעמית וחינמית (אפשר גם עם גוגל). קבצים מוכנים ל-Bambu, Orca, Prusa ו-Cura. כפתור ה-📖 בצד מסביר הכול.", "Downloading needs a one-time free sign-in (Google works too). Files are ready for Bambu, Orca, Prusa and Cura. The 📖 tab on the side explains everything.")],
      ];
      var i = 0;
      function tour(from) {
        if (document.getElementById("tourbg")) return; i = from || 0;
        var bg = document.createElement("div"); bg.id = "tourbg"; bg.dir = en() ? "ltr" : "rtl";
        var c = document.createElement("div"); c.id = "tourc"; c.setAttribute("role", "dialog"); c.setAttribute("aria-modal", "true"); bg.appendChild(c); document.body.appendChild(bg);
        function done() { ls.s("trip3d_tour", "1"); bg.remove(); document.removeEventListener("keydown", key); }
        function key(e) { if (e.key === "Escape") done(); }
        document.addEventListener("keydown", key);
        function draw() {
          var s = steps[i]; c.textContent = "";
          var h = document.createElement("h3"); h.textContent = s[0]; var p = document.createElement("p"); p.textContent = s[1]; p.style.margin = "0";
          var nav = document.createElement("div"); nav.className = "tn";
          var sk = document.createElement("button"); sk.type = "button"; sk.className = "sk"; sk.textContent = T("דלג", "Skip"); sk.onclick = done;
          var cnt = document.createElement("span"); cnt.textContent = (i + 1) + " / " + steps.length;
          var go = document.createElement("button"); go.type = "button"; go.className = "go"; go.textContent = i === steps.length - 1 ? T("מתחילים!", "Let's go!") : T("הבא", "Next");
          go.onclick = function () { if (i === steps.length - 1) done(); else { i++; draw(); } };
          nav.append(sk, cnt, go); c.append(h, p, nav); go.focus();
        }
        draw();
      }
      btn("exTour", "❓", T("סיור היכרות", "Quick tour"), function () { tour(0); });
      if (!ls.g("trip3d_tour") && !ls.g("trip3d_news")) setTimeout(function () { if (!document.querySelector("[role=dialog].on") && !document.getElementById("authbg") && !document.getElementById("maint")) tour(0); }, 4000);
    } catch (e) {}

    // ----- התקנה כאפליקציה -----
    try {
      var dp = null, ib = null;
      window.addEventListener("beforeinstallprompt", function (e) {
        e.preventDefault(); dp = e;
        if (!ib) ib = btn("exInst", "⬇️", T("התקנה כאפליקציה", "Install as app"), function () { if (!dp) return; dp.prompt(); dp.userChoice.finally(function () { dp = null; if (ib) { ib.remove(); ib = null; } }); });
      });
      window.addEventListener("appinstalled", function () { if (ib) { ib.remove(); ib = null; } });
    } catch (e) {}

    // ----- התראות דחיפה (רק אם הוגדרו מפתחות VAPID בשרת והמשתמש מחובר) -----
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
      fetch("/api/push/key").then(function (r) { return r.json(); }).then(function (k) {
        if (!k.key) return;
        fetch("/api/me", { credentials: "include" }).then(function (r) { return r.json(); }).then(function (m) {
          if (!m.user) return;
          function u8(b) { var p = "=".repeat((4 - b.length % 4) % 4), s = atob((b + p).replace(/-/g, "+").replace(/_/g, "/")), a = new Uint8Array(s.length); for (var j = 0; j < s.length; j++) a[j] = s.charCodeAt(j); return a; }
          navigator.serviceWorker.ready.then(function (reg) {
            reg.pushManager.getSubscription().then(function (sub) {
              var pb = btn("exPush", sub ? "🔔" : "🔕", T("התראות על הודעות חדשות", "Notifications for new messages"), function () {
                if (sub) { sub.unsubscribe().then(function () { sub = null; pb.textContent = "🔕"; fetch("/api/me/push", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ off: true }) }); }); return; }
                Notification.requestPermission().then(function (perm) {
                  if (perm !== "granted") return;
                  reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(k.key) }).then(function (s2) {
                    sub = s2; pb.textContent = "🔔";
                    fetch("/api/me/push", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ sub: s2.toJSON() }) });
                  }).catch(function () {});
                });
              });
            });
          });
        });
      }).catch(function () {});
    } catch (e) {}
  }
  // ----- נגישות: שם נגיש לשדות וכפתורים שאין להם (קוראי מסך) -----
  var NAMES = { d1: ["תאריך התחלת הטיול", "Trip start date"], d2: ["תאריך סיום הטיול", "Trip end date"], gj: ["בחירת קובץ GeoJSON", "Choose a GeoJSON file"], wf: ["בחירת קובץ GeoJSON", "Choose a GeoJSON file"], wimg: ["בחירת תמונה", "Choose an image"], rimg: ["בחירת תמונה", "Choose an image"], impf: ["בחירת קובץ מקומות לייבוא", "Choose a places file to import"], dci: ["כתיבת תגובה", "Write a comment"] };
  function a11y() {
    try {
      document.querySelectorAll("input,select,textarea,button").forEach(function (e) {
        if (e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || (e.labels && e.labels.length) || e.closest("label")) return;
        if (e.tagName === "BUTTON" && (e.textContent || "").trim()) return;
        var n = NAMES[e.id] ? T(NAMES[e.id][0], NAMES[e.id][1]) : e.title || e.placeholder || "";
        if (n) e.setAttribute("aria-label", n);
      });
    } catch (er) {}
  }
  var at = 0; function soon() { clearTimeout(at); at = setTimeout(a11y, 400); }
  document.addEventListener("click", soon, true); document.addEventListener("change", soon, true);
  setTimeout(a11y, 2500);
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
