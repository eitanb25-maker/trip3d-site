// דף שיתוף ליצירה בגלריה: מחזיר תגי Open Graph (לתצוגה יפה בוואטסאפ/פייסבוק) ומעביר לגלריה
import { store } from "../lib/lib.mjs";

export const config = { path: "/g/*" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NAMES = { stand: "מזכרת עם מעמד", multi: "מזכרת מכמה מדינות", key: "מחזיק מפתחות", magnet: "מגנט למקרר", orn: "קישוט", puzzle: "פאזל", holder: "מעמד לטלפון" };

export default async (req) => {
  const u = new URL(req.url);
  const site = (process.env.SITE_URL || u.origin).replace(/\/$/, "");
  const id = decodeURIComponent(u.pathname.replace(/^\/g\//, "")).replace(/[^\w-]/g, "").slice(0, 40);
  let g = null;
  try { const st = await store(); g = await st.get("gl/" + id); } catch {}
  const ok = g && g.status === "approved";
  const title = ok ? `${g.name}${g.country ? " · " + g.country : ""} – מזכרות תלת-ממד` : "גלריית מזכרות תלת-ממד";
  const desc = ok ? `${NAMES[g.tool] || "מזכרת"} שנוצרה ב"סטודיו המזכרות"${g.author ? " על ידי " + g.author : ""}. צרו גם אתם ותדפיסו בבית!` : "יצירות תלת-ממד מהטיולים של הקהילה. צרו מזכרת משלכם!";
  const img = ok ? `${site}/api/gallery/thumb?id=${id}` : `${site}/og.png`;
  const dest = ok ? `/gallery.html#${id}` : "/gallery.html";
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="סטודיו המזכרות"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(img)}"><meta property="og:url" content="${esc(site + u.pathname)}">
<meta name="twitter:card" content="${ok ? "summary" : "summary_large_image"}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
<meta http-equiv="refresh" content="0;url=${esc(dest)}"></head><body><a href="${esc(dest)}">${esc(title)}</a><script>location.replace(${JSON.stringify(dest)})</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
};
