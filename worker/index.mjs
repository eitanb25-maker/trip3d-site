// כניסה ל-Cloudflare Workers: אותו קוד שרת כמו ב-Netlify, עם אחסון D1 וקבצים סטטיים מ-public/
import api from "../netlify/functions/api.mjs";
import share from "../netlify/functions/share.mjs";
import daily from "../netlify/functions/daily.mjs";
import weekly from "../netlify/functions/weekly.mjs";
import { store } from "../netlify/lib/lib.mjs";

const CRON_WEEKLY = "0 1 * * 1";

let _envAt = 0;
// מחזיר את המשתנים מ-process.env; כל מה שחסר נטען מהמסד (מפתח sys/env), ו-SESSION_SECRET נוצר אוטומטית אם אין
async function boot(env) {
  globalThis.__trip3dD1 = env.DB;
  // גיבוי: מוודא ש-process.env מכיל את המשתנים והסודות גם אם הדגל האוטומטי לא פעיל
  for (const [k, v] of Object.entries(env)) if (typeof v === "string" && process.env[k] === undefined) process.env[k] = v;
  if (!env.DB || Date.now() - _envAt < 60000) return;
  const st = await store();
  const saved = (await st.get("sys/env")) || {};
  for (const [k, v] of Object.entries(saved)) if (typeof v === "string" && v && !(typeof env[k] === "string" && env[k])) process.env[k] = v;
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    const a = crypto.getRandomValues(new Uint8Array(32));
    const gen = [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
    saved.SESSION_SECRET = saved.SESSION_SECRET && saved.SESSION_SECRET.length >= 16 ? saved.SESSION_SECRET : gen;
    await st.setJSON("sys/env", saved);
    process.env.SESSION_SECRET = saved.SESSION_SECRET;
  }
  _envAt = Date.now();
}

export default {
  async fetch(req, env) {
    await boot(env);
    const u = new URL(req.url);
    if (!env.DB && u.pathname.startsWith("/api/")) return new Response(JSON.stringify({ error: "חסר חיבור למסד הנתונים D1 (שם החיבור: DB). ראו README" }), { status: 500, headers: { "content-type": "application/json; charset=utf-8" } });
    if (u.pathname === "/api" || u.pathname.startsWith("/api/")) return api(req);
    if (u.pathname.startsWith("/g/")) return share(req);
    if (u.pathname === "/sitemap.xml" || u.pathname === "/robots.txt") {
      const site = (process.env.SITE_URL || u.origin).replace(/\/$/, "");
      if (u.pathname === "/robots.txt") return new Response(`User-agent: *\nDisallow: /admin.html\nDisallow: /health.html\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
      const pages = [["/", "1.0"], ["/gallery.html", "0.8"], ["/guide.html", "0.7"], ["/perks.html", "0.5"], ["/status.html", "0.3"], ["/privacy.html", "0.2"], ["/terms.html", "0.2"]];
      const day = new Date().toISOString().slice(0, 10);
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([p, pr]) => `<url><loc>${site}${p}</loc><lastmod>${day}</lastmod><priority>${pr}</priority></url>`).join("\n")}\n</urlset>\n`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
    }
    const res = await env.ASSETS.fetch(req);
    if ((res.headers.get("content-type") || "").includes("text/html")) {
      const site = (process.env.SITE_URL || u.origin).replace(/\/$/, "");
      const h = new Headers(res.headers); h.delete("content-length"); h.delete("content-encoding"); h.delete("etag");
      return new Response((await res.text()).split("%%SITE%%").join(site), { status: res.status, headers: h });
    }
    return res;
  },
  async scheduled(event, env, ctx) {
    await boot(env);
    ctx.waitUntil(event.cron === CRON_WEEKLY ? weekly() : daily());
  },
};
