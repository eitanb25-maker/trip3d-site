/* שכבת תקשורת עם השרת + התאמה לדפדפן רגיל (במקום Claude) */
window.STAND = true;
window.API = {
  cfg: {}, me: { user: null }, session: null,
  sid: (() => { try { let s = sessionStorage.getItem("trip3d_sid"); if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("trip3d_sid", s); } return s; } catch (e) { return "x" + Math.random(); } })(),
  async j(method, path, body) {
    let r;
    try { r = await fetch("/api" + path, { method, headers: { "content-type": "application/json", "x-lang": (typeof LANG !== "undefined" && LANG === "en") ? "en" : "he" }, credentials: "same-origin", body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { throw Object.assign(new Error("אין חיבור לשרת. בדקו את האינטרנט ונסו שוב."), { status: 0 }); }
    const ct = r.headers.get("content-type") || "";
    let d = {}; if (ct.includes("json")) { try { d = await r.json(); } catch (e) {} }
    if (!r.ok || !ct.includes("json")) {
      const msg = d.error || (r.status === 404 || !ct.includes("json") ? "השרת של האתר לא פעיל (Netlify Functions). פתחו את /health.html כדי לראות מה חסר." : "שגיאה " + r.status);
      throw Object.assign(new Error(msg), { status: r.status, data: d });
    }
    return d;
  },
  async init() {
    try { this.cfg = await this.j("GET", "/config"); } catch (e) { this.cfg = {}; }
    await this.refresh();
  },
  async refresh() {
    try { this.me = await this.j("GET", "/me"); this.session = this.me.user; } catch (e) { this.me = { user: null }; this.session = null; }
  },
  staff() { return !!(this.session && (this.session.role === "admin" || this.session.role === "editor")); },
  event(type, tool, country) {
    try { fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, tool, country, sid: this.sid }), keepalive: true }).catch(() => {}); } catch (e) {}
  },
};
window.claude = {
  use: async (n) => {
    if (n === "downloads") return {
      save: async ({ filename, data }) => {
        const blob = data instanceof Blob ? data : new Blob([data]);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      },
    };
    if (n === "user") return {
      isOwner: async () => !!(API.session && API.session.role === "admin"),
      canEdit: async () => API.staff(),
      id: async () => (API.session ? API.session.uid : null),
      profiles: async () => ({}),
    };
    return null; // sample / db / artifact לא קיימים מחוץ ל-Claude
  },
};
window.TRACK = (type, country) => API.event(type, (typeof MULTI !== "undefined" && MULTI) ? "multi" : (typeof TOOL !== "undefined" ? TOOL : "stand"), country);
(() => { let n = 0; window.addEventListener("error", (e) => { if (n++ < 5) fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "error", msg: String(e.message || "").slice(0, 280), url: location.pathname, sid: API.sid }), keepalive: true }).catch(() => {}); }); })();
