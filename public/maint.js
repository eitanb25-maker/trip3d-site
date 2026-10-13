/* הודעת "עבודות תחזוקה": נקבעת מהקובץ /maintenance.json ({"on":true,"msg":"..."}).
   באתר ובגלריה – מסך מלא; בלוח הבקרה – פס עליון בלבד (כדי שאפשר להמשיך לנהל).
   כניסה זמנית בלי המסך (לבדיקה): הוסיפו ?nomaint=1 לכתובת. */
(function () {
  var shown = false, admin = /\/admin\.html$/.test(location.pathname);
  try { if (/[?&]nomaint=1/.test(location.search)) sessionStorage.setItem("nomaint", "1"); } catch (e) {}
  var bypass = false; try { bypass = sessionStorage.getItem("nomaint") === "1"; } catch (e) {}
  function en() { var l = ""; try { l = localStorage.getItem("trip3d_l") || ""; } catch (e) {} return l === "en" || document.documentElement.lang === "en"; }
  function show(m) {
    if (shown) return; shown = true;
    var e = en(), el = document.createElement("div");
    var t1 = e ? "Maintenance in progress" : "עבודות תחזוקה באתר", t2 = e ? "We're improving the site and will be back shortly. Thanks for your patience!" : "אנחנו משפרים את האתר וחוזרים בקרוב. תודה על הסבלנות!";
    var msg = (m.msg || "").toString().slice(0, 300);
    el.id = "maint"; el.setAttribute("role", admin ? "status" : "alertdialog"); el.setAttribute("aria-live", "polite");
    if (admin) {
      el.style.cssText = "position:sticky;top:0;z-index:99999;padding:8px 14px;text-align:center;font:600 14px system-ui,Arial,sans-serif;background:#f59e0b;color:#1c1917";
      el.textContent = "🛠 " + t1 + (msg ? " – " + msg : "") + (e ? " (visitors see a maintenance screen)" : " (המבקרים רואים מסך תחזוקה)");
      document.body.insertBefore(el, document.body.firstChild);
    } else {
      el.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font:16px/1.6 system-ui,'Segoe UI',Arial,sans-serif;background:var(--mbg,#f6f5f1);color:var(--mtx,#1d1d1b)";
      var st = document.createElement("style"); st.textContent = "@media(prefers-color-scheme:dark){#maint{--mbg:#171716;--mtx:#eeede8}}@media(prefers-reduced-motion:no-preference){#maint .g{animation:mspin 6s linear infinite}}@keyframes mspin{to{transform:rotate(360deg)}}"; document.head.appendChild(st);
      el.dir = e ? "ltr" : "rtl";
      el.innerHTML = '<div style="max-width:440px"><div class="g" style="font-size:64px;display:inline-block" aria-hidden="true">⚙️</div><h1 style="margin:12px 0 6px;font-size:26px"></h1><p style="margin:0 0 8px"></p><p class="m" style="margin:0;font-weight:600"></p></div>';
      el.querySelector("h1").textContent = t1; el.querySelector("p").textContent = t2; el.querySelector(".m").textContent = msg;
      document.body.appendChild(el); document.documentElement.style.overflow = "hidden";
    }
  }
  function check() {
    fetch("/maintenance.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
      if (!m) return;
      if (m.on && !bypass) show(m);
      else if (shown) location.reload();
    }).catch(function () {});
  }
  if (document.body) check(); else document.addEventListener("DOMContentLoaded", check);
  setInterval(check, 60000);
})();
