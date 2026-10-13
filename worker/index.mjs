// כניסה ל-Cloudflare Workers: אותו קוד שרת כמו ב-Netlify, עם אחסון D1 וקבצים סטטיים מ-public/
import api from "../netlify/functions/api.mjs";
import share from "../netlify/functions/share.mjs";
import daily from "../netlify/functions/daily.mjs";
import weekly from "../netlify/functions/weekly.mjs";

const CRON_WEEKLY = "0 1 * * 1";

function boot(env) {
  globalThis.__trip3dD1 = env.DB;
  // גיבוי: מוודא ש-process.env מכיל את המשתנים והסודות גם אם הדגל האוטומטי לא פעיל
  for (const [k, v] of Object.entries(env)) if (typeof v === "string" && process.env[k] === undefined) process.env[k] = v;
}

export default {
  async fetch(req, env) {
    boot(env);
    const u = new URL(req.url);
    if (!env.DB && u.pathname.startsWith("/api/")) return new Response(JSON.stringify({ error: "חסר חיבור למסד הנתונים D1 (שם החיבור: DB). ראו README" }), { status: 500, headers: { "content-type": "application/json; charset=utf-8" } });
    if (u.pathname === "/api" || u.pathname.startsWith("/api/")) return api(req);
    if (u.pathname.startsWith("/g/")) return share(req);
    const res = await env.ASSETS.fetch(req);
    if ((res.headers.get("content-type") || "").includes("text/html")) {
      const site = (process.env.SITE_URL || u.origin).replace(/\/$/, "");
      const h = new Headers(res.headers); h.delete("content-length"); h.delete("content-encoding"); h.delete("etag");
      return new Response((await res.text()).split("%%SITE%%").join(site), { status: res.status, headers: h });
    }
    return res;
  },
  async scheduled(event, env, ctx) {
    boot(env);
    ctx.waitUntil(event.cron === CRON_WEEKLY ? weekly() : daily());
  },
};
