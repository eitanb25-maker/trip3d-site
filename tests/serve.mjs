// שרת בדיקות מקומי: מגיש את public/ ואת ה-API מול אחסון בזיכרון (בלי Netlify). פורט 8099.
process.env.TRIP3D_MEMORY = "1"; process.env.SESSION_SECRET = "x".repeat(32); process.env.ADMIN_EMAIL = "boss@x.com"; process.env.ADMIN_SETUP_CODE = "setup123456";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const api = (await import("../netlify/functions/api.mjs")).default;
const lib = await import("../netlify/lib/lib.mjs");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/json" };
http.createServer(async (rq, rs) => {
  const u = new URL(rq.url, "http://localhost:8099");
  if (u.pathname.startsWith("/api/")) {
    const chunks = []; for await (const c of rq) chunks.push(c);
    const r = await api(new Request("http://localhost:8099" + rq.url, { method: rq.method, headers: Object.fromEntries(Object.entries(rq.headers).map(([k, v]) => [k, String(v)])), body: ["GET", "HEAD"].includes(rq.method) ? undefined : Buffer.concat(chunks) }));
    const h = {}; r.headers.forEach((v, k) => (h[k] = v)); const sc = r.headers.getSetCookie?.(); if (sc && sc.length) h["set-cookie"] = sc;
    rs.writeHead(r.status, h); rs.end(Buffer.from(await r.arrayBuffer())); return;
  }
  let f = path.join(PUB, u.pathname === "/" ? "index.html" : u.pathname);
  if (!fs.existsSync(f)) { rs.writeHead(404); rs.end("nf"); return; }
  let b = fs.readFileSync(f); const ext = path.extname(f);
  if (ext === ".html") b = Buffer.from(b.toString().split("%%SITE%%").join("http://localhost:8099"));
  rs.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" }); rs.end(b);
}).listen(8099, () => console.log("up"));
