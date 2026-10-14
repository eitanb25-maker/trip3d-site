/* לשונית "מדריך" בצד: פותחת את מדריך ההדפסה בחלון צד, כולל בקשת שפה מהמנהל */
(function () {
  if (window.__gt || /\/(guide|admin)\.html/.test(location.pathname)) return; window.__gt = 1;
  function lang() { var l = ""; try { l = localStorage.getItem("trip3d_l") || ""; } catch (e) {} return l === "en" || document.documentElement.lang === "en" ? "en" : "he"; }
  function init() {
    var en = lang() === "en", rtl = !en, side = rtl ? "left" : "right";
    var st = document.createElement("style");
    st.textContent = "#gtab{position:fixed;" + side + ":0;top:42%;z-index:58;writing-mode:vertical-rl;background:linear-gradient(180deg,#c2410c,#e11d48);color:#fff;border:0;padding:14px 8px;font:700 14px system-ui,'Segoe UI',Arial,sans-serif;cursor:pointer;border-radius:" + (rtl ? "0 12px 12px 0" : "12px 0 0 12px") + ";box-shadow:0 6px 18px rgba(0,0,0,.3);width:auto;margin:0;letter-spacing:.02em;transition:padding .15s}#gtab:hover,#gtab:focus-visible{padding-" + (rtl ? "left" : "right") + ":14px}" +
      "#gdr{position:fixed;top:0;bottom:0;" + side + ":0;z-index:2147483000;width:min(460px,100vw);background:var(--card,#fff);color:var(--tx,#1d1d1b);box-shadow:0 0 40px rgba(0,0,0,.4);display:flex;flex-direction:column;transform:translateX(" + (rtl ? "-105%" : "105%") + ");transition:transform .25s ease;visibility:hidden}#gdr.on{transform:none;visibility:visible}" +
      "#gdr header{width:100%;max-width:none;box-sizing:border-box;margin:0;border-radius:0;position:static;display:flex;gap:8px;align-items:center;padding:10px 12px;background:linear-gradient(120deg,#c2410c,#7c3aed);color:#fff;font:700 15px system-ui,'Segoe UI',Arial,sans-serif}#gdr header b{flex:1}#gdr header button{width:auto;min-width:36px;min-height:36px;margin:0;padding:6px 12px;border:0;border-radius:99px;background:rgba(255,255,255,.22);color:#fff;font:600 13px system-ui,Arial,sans-serif;cursor:pointer}#gdr iframe{flex:1;border:0;width:100%;background:#fff}#gsh{position:fixed;inset:0;z-index:2147482999;background:rgba(0,0,0,.4);display:none}#gsh.on{display:block}@media(prefers-reduced-motion:reduce){#gdr{transition:none}}";
    document.head.appendChild(st);
    var tab = document.createElement("button"); tab.id = "gtab"; tab.type = "button"; tab.textContent = en ? "📖 Guide" : "📖 מדריך"; tab.setAttribute("aria-haspopup", "dialog");
    var sh = document.createElement("div"); sh.id = "gsh";
    var dr = document.createElement("aside"); dr.id = "gdr"; dr.setAttribute("role", "dialog"); dr.setAttribute("aria-label", en ? "Print guide" : "מדריך הדפסה"); dr.dir = rtl ? "rtl" : "ltr";
    var hd = document.createElement("header"), t = document.createElement("b"); t.textContent = en ? "📖 Print guide" : "📖 מדריך הדפסה";
    var lb = document.createElement("button"); lb.type = "button"; lb.textContent = en ? "🌐 Request a language" : "🌐 בקשת שפה";
    var x = document.createElement("button"); x.type = "button"; x.textContent = "✕"; x.setAttribute("aria-label", en ? "Close" : "סגירה");
    hd.append(t, lb, x);
    var fr = document.createElement("iframe"); fr.title = t.textContent;
    dr.append(hd, fr);
    function open() { if (!fr.src) fr.src = "/guide.html?embed=1"; dr.classList.add("on"); sh.classList.add("on"); x.focus(); }
    function close() { dr.classList.remove("on"); sh.classList.remove("on"); tab.focus(); }
    tab.onclick = open; x.onclick = close; sh.onclick = close;
    lb.onclick = function () { function go() { try { var e = fr.contentDocument.getElementById("lr"); if (e) { e.scrollIntoView({ behavior: "smooth" }); var i = fr.contentDocument.getElementById("lr_t"); if (i) i.focus(); } } catch (er) {} } if (!fr.src) { fr.onload = go; open(); } else go(); };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && dr.classList.contains("on")) close(); });
    window.addEventListener("message", function (e) { if (e.origin === location.origin && e.data === "gclose" && dr.classList.contains("on")) close(); });
    document.body.append(tab, sh, dr);
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
