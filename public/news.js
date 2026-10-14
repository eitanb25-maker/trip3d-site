/* "מה חדש": כרטיס קטן שמופיע פעם אחת לכל מבקר, מתוך /news.json
   {"id":"2026-10-13","he":"...","en":"...","link":"/gallery.html"}  (id ריק או קובץ ריק = לא מוצג; שינוי id = מוצג שוב לכולם) */
(function () {
  function lang() { var l = ""; try { l = localStorage.getItem("trip3d_l") || ""; } catch (e) {} return l === "en" || document.documentElement.lang === "en" ? "en" : "he"; }
  function go() {
    fetch("/news.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (n) {
      if (!n || !n.id || !(n.he || n.en)) return;
      var id = String(n.id), seen = ""; try { seen = localStorage.getItem("trip3d_news") || ""; } catch (e) {}
      if (seen === id) return;
      var l = lang(), txt = (l === "en" ? n.en || n.he : n.he || n.en) || "", el = document.createElement("div");
      el.id = "newsbar"; el.setAttribute("role", "status"); el.dir = l === "en" ? "ltr" : "rtl";
      el.style.cssText = "position:fixed;bottom:16px;left:16px;max-width:min(340px,calc(100vw - 32px));z-index:55;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:#1d1d1b;color:#fff;font:14px/1.5 system-ui,'Segoe UI',Arial,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35);border:1px solid #3a3a36";
      var body = document.createElement("div"); body.style.flex = "1";
      var t = document.createElement("div"); t.textContent = txt; body.appendChild(t);
      function done() { try { localStorage.setItem("trip3d_news", id); } catch (e) {} el.remove(); }
      if (n.link && /^\/[^\/\\]/.test(String(n.link))) { var a = document.createElement("a"); a.href = n.link; a.textContent = l === "en" ? "See more →" : "לפרטים ←"; a.style.cssText = "color:#fdba74;font-weight:600;display:inline-block;margin-top:4px"; a.onclick = function () { try { localStorage.setItem("trip3d_news", id); } catch (e) {} }; body.appendChild(a); }
      var x = document.createElement("button"); x.type = "button"; x.textContent = "✕"; x.setAttribute("aria-label", l === "en" ? "Close" : "סגירה"); x.style.cssText = "border:0;background:transparent;color:#fff;font:inherit;cursor:pointer;padding:0 10px!important;min-width:36px;min-height:36px;width:auto!important;margin:0!important;display:inline-block!important;flex:none;box-shadow:none"; x.onclick = done;
      el.appendChild(body); el.appendChild(x);
      setTimeout(function () { var e2 = document.getElementById("newsbar"); if (e2) e2.remove(); }, 22000);
      setTimeout(function () {
        if (!document.body || document.getElementById("newsbar")) return;
        var d = document.getElementById("bl"); // העמודה התחתונה-שמאלית של האתר: הכרטיס נערם מעל הכפתורים ולא מתנגש בהם
        if (d) { el.style.position = "static"; el.style.width = "min(340px,calc(100vw - 24px))"; el.style.boxSizing = "border-box"; d.insertBefore(el, d.firstChild); } else document.body.appendChild(el);
      }, 2500);
    }).catch(function () {});
  }
  if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
})();
