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
        [T("רוצים לראות איך זה נראה? ✨", "Want to see how it looks? ✨"), T("אפשר לטעון טיול לדוגמה לאיטליה: מדינה, סיכות, כיתוב ודגל, ולראות מיד מודל תלת-ממדי מוכן. אחר כך משנים מה שרוצים.", "You can load a sample trip to Italy: country, pins, text and flag, and instantly see a finished 3D model. Then change whatever you like."), T("✨ טענו דוגמה מוכנה", "✨ Load a ready example")],
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
          var cnt = document.createElement("span"); cnt.dir = "ltr"; cnt.textContent = (i + 1) + " / " + steps.length;
          var go = document.createElement("button"); go.type = "button"; go.className = "go"; go.textContent = i === steps.length - 1 ? T("מתחילים!", "Let's go!") : T("הבא", "Next");
          go.onclick = function () { if (i === steps.length - 1) done(); else { i++; draw(); } };
          nav.append(sk, cnt, go); c.append(h, p);
          if (s[2]) { var ab = document.createElement("button"); ab.type = "button"; ab.className = "go"; ab.textContent = s[2]; ab.style.cssText = "width:100%;margin:12px 0 0";
            ab.onclick = function () { var ok = false; try { ok = window.exampleApi && exampleApi.load("italy"); } catch (e) {} if (ok) done(); else ab.textContent = T("לא הצלחנו לטעון", "Couldn't load"); }; c.append(ab); }
          c.append(nav); go.focus();
        }
        draw();
      }
      btn("exTour", "❓", T("סיור היכרות", "Quick tour"), function () { if (window.API && API.session) window.__tutorial(0); else tour(0); });
      if (!ls.g("trip3d_tour") && !ls.g("trip3d_news")) setTimeout(function () { if (!(window.API && API.session) && !document.querySelector("[role=dialog].on") && !document.getElementById("authbg") && !document.getElementById("maint")) tour(0); }, 4000);
    } catch (e) {}


  // ----- טוטוריאל בן 10 שלבים: מופיע אוטומטית בכניסה לחשבון (פעם אחת לכל חשבון), ואפשר לפתוח שוב בכפתור ❓ -----
  var TUT = [
    { sel: "#tools .tool", h: ["ברוכים הבאים, {name}! בוחרים כלי", "Welcome, {name}! Pick a tool"], t: ["זה סיור קצר. מתחילים בכלי: מזכרת עם מעמד, מכמה מדינות, מחזיק מפתחות, מגנט, קישוט, פאזל או מעמד לטלפון. אפשר לדלג בכל רגע ולפתוח שוב בכפתור ❓.", "A quick 10-step tour. It starts with the tool: souvenir with stand, multi-country, keychain, magnet, ornament, puzzle or phone stand. Skip any time and reopen it with the ❓ button."] },
    { act: ["✨ טענו דוגמה מוכנה (איטליה)", "✨ Load a ready example (Italy)"], h: ["נסו עם דוגמה מוכנה", "Try a ready-made example"], t: ["לחיצה על הכפתור טוענת טיול לדוגמה: מדינה, סיכות, שם טיול, תאריכים ודגל. תראו מיד מודל תלת-ממדי מוכן, ואז נעבור עליו יחד. אפשר לדלג וללחוץ 'הבא'.", "The button loads a sample trip: country, pins, trip name, dates and flag. You'll instantly see a finished 3D model, and we'll walk through it. You can skip it with 'Next'."] },
    { sel: "#view", ed: true, h: ["זו המזכרת בתלת-ממד", "This is your 3D souvenir"], t: ["גוררים כדי לסובב, ומתקרבים עם שתי אצבעות או גלגלת. כל שינוי בהגדרות מתעדכן כאן אחרי רגע קצר.", "Drag to rotate, pinch or scroll to zoom. Every setting change updates here after a short moment."] },
    { sel: ".uxtabs", ed: true, h: ["ארבע לשוניות להגדרות", "Four tabs of settings"], t: ["מדינה ומפה, מקומות ומים, עיצוב ותוכן (כיתוב, גופן, דגל, צבעים), ותצוגה והורדה. עוברים ביניהן כאן בלי לאבד את התצוגה.", "Country & map, places & water, design & text (text, font, flag, colors), and preview & export. Switch between them here without losing the preview."] },
    { sel: "#dl", ed: true, tab: 4, h: ["הורדה להדפסה", "Download for printing"], t: ["כאן מורידים ZIP: 3MF (הכי נוח, כל החלקים והצבעים) וגם STL. פותחים בסלייסר כמו Cura או PrusaSlicer, ומדפיסים בגודל שמוצג בחלון ההורדה.", "Here you download a ZIP: 3MF (easiest, all parts and colors) plus STL. Open it in a slicer like Cura or PrusaSlicer and print at the size shown in the download window."] },
    { h: ["מדינה ומקומות", "Country and places"], t: ["עונים על שאלון קצר: בוחרים מדינה (או כמה), מסמנים על המפה את המקומות שהייתם בהם, ואפשר גם לייבא מסלול מקובץ KML/GPX.", "Answer a short questionnaire: choose a country (or several), mark the places you visited on the map, or import a route from a KML/GPX file."] },
    { h: ["מעצבים בתלת-ממד", "Design it in 3D"], t: ["רואים את המזכרת מתעדכנת בזמן אמת: שם הטיול ותאריכים, צבעים, דגל, מים, הרים וקוד QR. אפשר לסובב ולהגדיל עם האצבע או העכבר.", "Watch the souvenir update live: trip name and dates, colors, flag, water, mountains and a QR code. Rotate and zoom with your finger or mouse."] },
    { h: ["מתאימים למדפסת", "Fit your printer"], t: ["בוחרים את גודל משטח ההדפסה שלכם והאתר מתאים את המודל אליו אוטומטית, כולל פירוק לחלקים וצבע לכל חלק.", "Pick your print bed size and the site fits the model to it automatically, split into parts with a color for each."] },
    { h: ["מורידים ומדפיסים", "Download and print"], t: ["ההורדה היא קובץ ZIP עם 3MF (מומלץ ל-Bambu, Orca ו-Prusa) וקבצי STL. יש מכסה יומית, ובונוסים והטבות מוסיפים הורדות.", "The download is a ZIP with a 3MF (best for Bambu, Orca and Prusa) and STL files. There is a daily limit, and bonuses and perks add more downloads."] },
    { sel: "#gtab", h: ["מדריך הדפסה", "Print guide"], t: ["הלשונית בצד פותחת את מדריך ההדפסה: הגדרות, חומרים ופתרון בעיות. אפשר גם לבקש שפה נוספת.", "The side tab opens the print guide: settings, materials and troubleshooting. You can also request another language."] },
    { sel: "#acct", h: ["החשבון שלי", "My account"], t: ["כאן רואים הורדות שנשארו, הטבות ותגים, מממשים קוד קופון, מזמינים חברים, ויש גם צ'אט פרטי עם מנהל האתר.", "See your remaining downloads, perks and badges, redeem a coupon code, invite friends, and chat privately with the site admin."] },
    { sel: "#bl", h: ["עזרה ודיווח", "Help and reports"], t: ["הבוט עונה על שאלות (ואפילו מחליף שפה), ואם משהו לא עובד אפשר לדווח עליו בלחיצה.", "The bot answers questions (and can even switch the language), and you can report any problem with one tap."] },
    { h: ["שומרים ומשתפים", "Save and share"], t: ["שומרים פרויקט בחשבון וממשיכים בכל מכשיר, משכפלים, ומשתפים בקישור או בכרטיס שיתוף. יצירה טובה אפשר לפרסם בגלריית הקהילה.", "Save projects to your account and continue on any device, duplicate them, and share by link or share card. Publish great ones to the community gallery."] },
    { sel: "#exb", h: ["ועוד כמה דברים", "A few more things"], t: ["כפתורים למצב כהה/בהיר, התקנה כאפליקציה והתראות, וגם עמוד ההטבות והגלריה. זהו, בהצלחה!", "Buttons for dark/light mode, installing as an app and notifications, plus the perks and gallery pages. That's it, have fun!"] }
  ];
  var tutOn = false;
  function uidKey() { return "trip3d_tut_" + ((window.API && API.session && API.session.uid) || "x"); }
  window.__tutorial = function (from) {
    if (tutOn) return; tutOn = true;
    var name = (window.API && API.session && API.session.name) || "", i = from || 0, E = en();
    var sh = document.createElement("div"); sh.id = "tutsh"; sh.style.cssText = "position:fixed;z-index:2147483100;pointer-events:none;border-radius:14px;transition:all .25s;box-shadow:0 0 0 100vmax rgba(0,0,0,.62);outline:3px solid var(--ac,#ea580c)";
    var cd = document.createElement("div"); cd.id = "tutcd"; cd.setAttribute("role", "dialog"); cd.setAttribute("aria-modal", "true"); cd.setAttribute("aria-live", "polite"); cd.dir = E ? "ltr" : "rtl";
    cd.style.cssText = "position:fixed;z-index:2147483101;width:min(400px,calc(100vw - 24px));box-sizing:border-box;background:var(--card,#fff);color:var(--tx,#1d1d1b);border-radius:18px;padding:18px 18px 14px;box-shadow:0 20px 60px rgba(0,0,0,.5);font:15px/1.6 system-ui,'Segoe UI',Arial,sans-serif;left:50%;transform:translateX(-50%)";
    document.body.append(sh, cd);
    function done() { tutOn = false; sh.remove(); cd.remove(); document.removeEventListener("keydown", key); window.removeEventListener("resize", place);
      ls.s(uidKey(), "1"); try { if (window.API && API.session && !API.session.tut) { API.session.tut = true; fetch("/api/me/tutorial", { method: "POST", credentials: "include" }); } } catch (e) {} }
    function key(e) { if (e.key === "Escape") done(); else if (e.key === "ArrowRight") go(E ? 1 : -1); else if (e.key === "ArrowLeft") go(E ? -1 : 1); }
    function edOpen() { return ["home", "intro"].every(function (id) { var e = document.getElementById(id); return !e || getComputedStyle(e).display === "none"; }); }
    function hasT(st) { if (!st.sel) return false; if (st.ed && !edOpen()) return false; if (st.tab) { var tb = document.querySelector('.uxtabs button[data-t="' + st.tab + '"]'); if (tb) tb.click(); } var el = document.querySelector(st.sel); if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; }
    function go(d) { var n = i + d; while (n >= 0 && n < TUT.length && TUT[n].ed && !hasT(TUT[n])) n += d; if (n < 0) return; if (n >= TUT.length) { done(); return; } i = n; draw(); }
    function target() { var st = TUT[i]; if (!st.sel) return null; var el = document.querySelector(st.sel); if (!el) return null; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" ? el : null; }
    function place() {
      var el = target(), vw = window.innerWidth, vh = window.innerHeight;
      if (!el) { sh.style.cssText += ";left:50%;top:50%;width:0;height:0;box-shadow:0 0 0 100vmax rgba(0,0,0,.62);outline:0"; cd.style.top = "50%"; cd.style.transform = "translate(-50%,-50%)"; cd.style.bottom = "auto"; return; }
      el.scrollIntoView({ block: "center", inline: "nearest" });
      var r = el.getBoundingClientRect(), pad = 6;
      sh.style.left = r.left - pad + "px"; sh.style.top = r.top - pad + "px"; sh.style.width = r.width + pad * 2 + "px"; sh.style.height = r.height + pad * 2 + "px"; sh.style.outline = "3px solid var(--ac,#ea580c)";
      cd.style.transform = "translateX(-50%)";
      if (r.top + r.height / 2 > vh / 2) { cd.style.top = "max(12px,env(safe-area-inset-top,0px))"; cd.style.bottom = "auto"; } else { cd.style.bottom = "max(12px,env(safe-area-inset-bottom,0px))"; cd.style.top = "auto"; }
    }
    function draw() {
      var st = TUT[i], L = E ? 1 : 0; cd.textContent = "";
      var h = document.createElement("h3"); h.style.cssText = "margin:0 0 6px;font-size:18px"; h.textContent = st.h[L].replace("{name}", name);
      var p = document.createElement("p"); p.style.margin = "0"; p.textContent = st.t[L];
      var actb = null;
      if (st.act) { actb = document.createElement("button"); actb.type = "button"; actb.textContent = st.act[L]; actb.style.cssText = "display:block;width:100%;margin:12px 0 0;border:0;border-radius:10px;padding:11px 14px;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer;background:var(--ac,#ea580c);color:#fff";
        actb.onclick = function () { var ok = false; try { ok = window.exampleApi && exampleApi.load("italy"); } catch (e) {} actb.disabled = true; actb.textContent = ok ? (E ? "✓ Loaded" : "✓ נטען") : (E ? "Couldn't load" : "לא הצלחנו לטעון"); if (ok) setTimeout(function () { go(1); }, 700); }; }
      var dots = document.createElement("div"); dots.style.cssText = "display:flex;gap:5px;justify-content:center;margin:12px 0 4px";
      TUT.forEach(function (_, k) { var d = document.createElement("span"); d.style.cssText = "width:" + (k === i ? 18 : 7) + "px;height:7px;border-radius:9px;background:" + (k === i ? "var(--ac,#ea580c)" : "var(--bd,#ccc)") + ";transition:width .2s"; dots.appendChild(d); });
      var nav = document.createElement("div"); nav.style.cssText = "display:flex;gap:8px;align-items:center";
      function b(txt, cls, fn, dis) { var x = document.createElement("button"); x.type = "button"; x.textContent = txt; x.disabled = !!dis; x.style.cssText = "border:0;border-radius:10px;padding:9px 14px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;margin:0;width:auto;" + (cls === "go" ? "background:var(--ac,#ea580c);color:#fff" : cls === "sk" ? "background:transparent;color:var(--mu,#777)" : "background:var(--bd,#e5e5e5);color:var(--tx,#222)") + (dis ? ";opacity:.4;cursor:default" : ""); x.onclick = fn; return x; }
      var cnt = document.createElement("span"); cnt.style.cssText = "flex:1;text-align:center;color:var(--mu,#777);font-size:13px;white-space:nowrap"; cnt.dir = "ltr"; cnt.textContent = (i + 1) + " / " + TUT.length;
      var last = i === TUT.length - 1;
      nav.append(b(T("דלג", "Skip"), "sk", done), b(T("הקודם", "Back"), "bk", function () { go(-1); }, i === 0), cnt, b(last ? T("סיום 🎉", "Finish 🎉") : T("הבא", "Next"), "go", function () { go(1); }));
      cd.append(h, p); if (actb) cd.append(actb); cd.append(dots, nav); place(); var gb = nav.lastChild; gb.focus({ preventScroll: true });
    }
    document.addEventListener("keydown", key); window.addEventListener("resize", place); draw();
  };
  // פתיחה אוטומטית: אחרי כניסה לחשבון שעוד לא ראה את הטוטוריאל, כשאין חלון פתוח ומסך הבית מוצג
  setInterval(function () {
    try {
      var a = window.API, u = a && a.session;
      if (!u || u.tut || tutOn || ls.g(uidKey())) return;
      if (document.getElementById("maint") || document.getElementById("tourbg")) return;
      var vis = function (id) { var e = document.getElementById(id); return e && getComputedStyle(e).display !== "none"; };
      if (vis("authm") || vis("dlg") || vis("acctm")) return;
      var hm = document.getElementById("home"); if (!hm || getComputedStyle(hm).display === "none") return;
      setTimeout(function () { var u2 = window.API && API.session; if (u2 && !u2.tut && !tutOn && !ls.g(uidKey())) window.__tutorial(0); }, 1200);
      ls.s(uidKey() + "_try", String(Date.now()));
    } catch (e) {}
  }, 2500);
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
  var NAMES = { impt: ["הדביקו רשימת מקומות לייבוא", "Paste a list of places to import"], d1: ["תאריך התחלת הטיול", "Trip start date"], d2: ["תאריך סיום הטיול", "Trip end date"], gj: ["בחירת קובץ GeoJSON", "Choose a GeoJSON file"], wf: ["בחירת קובץ GeoJSON", "Choose a GeoJSON file"], wimg: ["בחירת תמונה", "Choose an image"], rimg: ["בחירת תמונה", "Choose an image"], impf: ["בחירת קובץ מקומות לייבוא", "Choose a places file to import"], dci: ["כתיבת תגובה", "Write a comment"] };
  function a11y() {
    try {
      document.querySelectorAll("input,select,textarea,button").forEach(function (e) {
        if ((e.getAttribute("aria-label") && !e.hasAttribute("data-al") && !NAMES[e.id]) || e.getAttribute("aria-labelledby") || (e.labels && e.labels.length) || e.closest("label")) return;
        if (e.tagName === "BUTTON" && (e.textContent || "").trim()) return;
        var n = NAMES[e.id] ? T(NAMES[e.id][0], NAMES[e.id][1]) : e.title || e.placeholder || "";
        if (n) { e.setAttribute("aria-label", n); e.setAttribute("data-al", "1"); }
      });
    } catch (er) {}
  }
  var at = 0; function soon() { clearTimeout(at); at = setTimeout(a11y, 400); }
  document.addEventListener("click", soon, true); document.addEventListener("change", soon, true);
  setTimeout(a11y, 2500);
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
