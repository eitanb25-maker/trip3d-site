// ספריית עזר משותפת: אחסון, הגדרות, סטטיסטיקות והתראות
import crypto from "node:crypto";

export const TOOLS = ["stand", "multi", "key", "magnet", "orn", "puzzle", "holder"];
export const DEFAULTS = {
  tools: {}, banner: "", bannerOn: false, maint: false, lang: "he",
  inviteOnly: false, dlLimit: 5, notifyDownload: true, notifyReport: true, errAlert: true, errEach: true, errThreshold: 5, blocks: [], abuseDl: 20, refBonus: 1, refMax: 5, extBackup: true, aiOn: false, aiLimit: 10, aiGlobal: 300, early: [], vip: [], galReward: 1, streakOn: true, lbOn: true,
  requireVerify: false, notifySecurity: true, autoBackup: true,
  welcomeGift: 2, challengeOn: true, challengeN: 3, challengeReward: 3, annivGift: 3, refPrizeOn: true, goalTarget: 1000, bonusSched: [], texts: {}, subsOn: false, subPlans: [
    { id: "plus", emoji: "🧳", name: "מטייל", price: "19₪ לחודש", days: 30, desc: "לכל מי שיוצר כל שבוע", items: [{ type: "credits", n: 3 }, { type: "daily", n: 5 }, { type: "projects", n: 10 }, { type: "gallery", n: 2 }] },
    { id: "pro", emoji: "🧭", name: "חוקר", price: "39₪ לחודש", days: 30, hot: true, desc: "הכול פתוח, בלי לספור הורדות", items: [{ type: "badge", n: 1, key: "clubexp" }, { type: "unlimited", n: 0 }, { type: "projects", n: 30 }, { type: "gallery", n: 5 }, { type: "early", n: 0 }] },
    { id: "pro-year", emoji: "🌍", name: "נווד עולמי", price: "349₪ לשנה", days: 365, desc: "כל מה שב'חוקר' + תג 🌍 נווד עולמי בלעדי, ומחיר של 9 חודשים בערך", items: [{ type: "badge", n: 1, key: "nomad" }, { type: "unlimited", n: 0 }, { type: "projects", n: 50 }, { type: "gallery", n: 8 }, { type: "early", n: 0 }] },
    { id: "biz", emoji: "🏢", name: "עסקים", price: "89₪ לחודש", days: 30, desc: "לעסק שמוכר או מדפיס מזכרות: הכול פתוח, נפח עבודה גדול ותג עסק", items: [{ type: "badge", n: 1, key: "business" }, { type: "unlimited", n: 0 }, { type: "projects", n: 100 }, { type: "gallery", n: 15 }, { type: "early", n: 0 }] },
  ], subPayUrl: "", subPayNote: "", goalBonus: 2, perkVerify: true, thanksReward: 2, cowBonus: 1, weekendBonus: 0, bonusWin: null, hofAuto: true,
};

export const isProd = () => !process.env.CONTEXT || process.env.CONTEXT === "production";
let _mem = null;
// שים לב: ב-Netlify אסור לשמור את חיבור האחסון בין בקשות (האישורים תקפים לבקשה אחת בלבד), לכן יוצרים אותו מחדש בכל קריאה
export async function store() {
  if (process.env.TRIP3D_MEMORY) {
    if (_mem) return _mem;
    const m = (globalThis.__trip3dMem ||= new Map());
    _mem = {
      get: async (k) => (m.has(k) ? JSON.parse(m.get(k)) : null),
      setJSON: async (k, v) => { m.set(k, JSON.stringify(v)); },
      delete: async (k) => { m.delete(k); },
      list: async (p) => [...m.keys()].filter((k) => k.startsWith(p)).sort(),
      scan: async (p, o = {}) => { let ks = [...m.keys()].filter((k) => k.startsWith(p)).sort(); if (o.desc) ks.reverse(); if (o.limit) ks = ks.slice(0, o.limit); return ks.map((k) => ({ k, v: JSON.parse(m.get(k)) })); },
      getMany: async (ks) => ks.map((k) => (m.has(k) ? JSON.parse(m.get(k)) : null)),
      deleteMany: async (ks) => { ks.forEach((k) => m.delete(k)); },
      incr: async (k, max) => { const n = m.has(k) ? +JSON.parse(m.get(k)) || 0 : 0; if (max > 0 && n >= max) return 0; m.set(k, JSON.stringify(n + 1)); return n + 1; },
    };
    return _mem;
  }
  if (globalThis.__trip3dD1) return d1store(globalThis.__trip3dD1);
  const spec = "@netlify/blobs"; // מזהה דינמי בכוונה: ב-Cloudflare לא נטען ולא נארז
  const { getStore } = await import(/* @vite-ignore */ spec);
  const s = getStore({ name: isProd() ? "trip3d" : "trip3d-staging", consistency: "strong" });
  return {
    get: (k) => s.get(k, { type: "json" }),
    setJSON: (k, v) => s.setJSON(k, v),
    delete: (k) => s.delete(k),
    list: async (p) => {
      const r = await s.list({ prefix: p });
      return (r.blobs || []).map((b) => b.key).sort();
    },
    scan: async (p, o = {}) => {
      const r = await s.list({ prefix: p });
      let ks = (r.blobs || []).map((b) => b.key).sort(); if (o.desc) ks.reverse(); if (o.limit) ks = ks.slice(0, o.limit);
      return Promise.all(ks.map(async (k) => ({ k, v: await s.get(k, { type: "json" }) })));
    },
    getMany: (ks) => Promise.all(ks.map((k) => s.get(k, { type: "json" }))),
    deleteMany: async (ks) => { await Promise.all(ks.map((k) => s.delete(k))); },
    incr: async (k, max) => { const n = +(await s.get(k, { type: "json" })) || 0; if (max > 0 && n >= max) return 0; await s.setJSON(k, n + 1); return n + 1; },
  };
}

// ---------- אחסון על Cloudflare D1 (SQLite): טבלה אחת של מפתח/ערך, עם פיצול ערכים גדולים ----------
const CHUNK = 900000, CK = (k, i) => "\u0001c/" + i + "/" + k;
let _d1ready = null;
function d1store(db) {
  const init = () => (_d1ready ||= db.prepare("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)").run().catch((e) => { _d1ready = null; throw e; }));
  const rawGet = async (k) => { await init(); return db.prepare("SELECT v FROM kv WHERE k = ?1").bind(k).first("v"); };
  const rawSet = async (k, v) => { await init(); await db.prepare("INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(k, v).run(); };
  const rawDel = async (k) => { await init(); await db.prepare("DELETE FROM kv WHERE k = ?1").bind(k).run(); };
  const parseV = async (k, v) => {
    if (v.startsWith("\u0001chunks:")) { const n = +v.slice(8); let t = ""; for (let i = 0; i < n; i++) t += (await rawGet(CK(k, i))) || ""; return JSON.parse(t); }
    return JSON.parse(v);
  };
  return {
    get: async (k) => {
      const v = await rawGet(k); if (v == null) return null;
      if (v.startsWith("\u0001chunks:")) { const n = +v.slice(8); let s = ""; for (let i = 0; i < n; i++) s += (await rawGet(CK(k, i))) || ""; return JSON.parse(s); }
      return JSON.parse(v);
    },
    setJSON: async (k, val) => {
      const s = JSON.stringify(val), old = await rawGet(k);
      if (old && old.startsWith("\u0001chunks:")) { const n = +old.slice(8); for (let i = 0; i < n; i++) await rawDel(CK(k, i)); }
      if (s.length <= CHUNK) return rawSet(k, s);
      const n = Math.ceil(s.length / CHUNK);
      for (let i = 0; i < n; i++) await rawSet(CK(k, i), s.slice(i * CHUNK, (i + 1) * CHUNK));
      await rawSet(k, "\u0001chunks:" + n);
    },
    delete: async (k) => {
      const old = await rawGet(k);
      if (old && old.startsWith("\u0001chunks:")) { const n = +old.slice(8); for (let i = 0; i < n; i++) await rawDel(CK(k, i)); }
      await rawDel(k);
    },
    list: async (p) => {
      await init();
      const r = await db.prepare("SELECT k FROM kv WHERE k >= ?1 AND k < ?2 AND substr(k, 1, 1) != char(1) ORDER BY k").bind(p, p + "\uffff").all();
      return (r.results || []).map((x) => x.k);
    },
    // קריאה מרוכזת: שאילתה אחת במקום get לכל מפתח (ל-D1 החינמי יש תקרה של שאילתות לבקשה)
    scan: async (p, o = {}) => {
      await init();
      const q = "SELECT k, v FROM kv WHERE k >= ?1 AND k < ?2 AND substr(k, 1, 1) != char(1) ORDER BY k" + (o.desc ? " DESC" : "") + (o.limit ? " LIMIT " + (o.limit | 0) : "");
      const r = await db.prepare(q).bind(p, p + "\uffff").all();
      return Promise.all((r.results || []).map(async (x) => ({ k: x.k, v: await parseV(x.k, x.v) })));
    },
    deleteMany: async (ks) => { // רק לערכים קטנים (בלי פיצול): מחיקה מרוכזת
      await init();
      for (let i = 0; i < ks.length; i += 90) { const part = ks.slice(i, i + 90); await db.prepare("DELETE FROM kv WHERE k IN (" + part.map((_, j) => "?" + (j + 1)).join(",") + ")").bind(...part).run(); }
    },
    getMany: async (ks) => {
      await init();
      const out = new Map();
      for (let i = 0; i < ks.length; i += 90) {
        const part = ks.slice(i, i + 90);
        const r = await db.prepare("SELECT k, v FROM kv WHERE k IN (" + part.map((_, j) => "?" + (j + 1)).join(",") + ")").bind(...part).all();
        for (const x of r.results || []) out.set(x.k, x.v);
      }
      return Promise.all(ks.map(async (k) => (out.has(k) ? parseV(k, out.get(k)) : null)));
    },
    // מונה אטומי עם תקרה (max<=0 = בלי תקרה): מחזיר את הערך החדש, או 0 אם התקרה כבר הושגה
    incr: async (k, max) => {
      await init();
      await db.prepare("INSERT OR IGNORE INTO kv (k, v) VALUES (?1, '0')").bind(k).run();
      const r = await db.prepare("UPDATE kv SET v = CAST(CAST(v AS INTEGER) + 1 AS TEXT) WHERE k = ?1 AND (?2 <= 0 OR CAST(v AS INTEGER) < ?2)").bind(k, +max || 0).run();
      if (!(r.meta && r.meta.changes > 0)) return 0;
      return +(await rawGet(k)) || 1;
    },
  };
}

export const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
export const rid = (n = 6) => crypto.randomBytes(n).toString("hex");

export async function getSettings() {
  const st = await store();
  const s = (await st.get("settings")) || {};
  const out = { ...DEFAULTS, ...s };
  // מיגרציות חד-פעמיות על מסלולי מנוי שכבר נשמרו (כל אחת רצה פעם אחת)
  if (Array.isArray(s.subPlans)) {
    let plans = s.subPlans, dirty = false;
    // v42.1: מסלולים עם מתנת ההורדות הישנה (10/40) מקבלים את מתנת התג החדשה
    plans = plans.map((p) => {
      const old = { pro: 10, "pro-year": 40 }[p.id], it = Array.isArray(p.items) ? p.items : [];
      if (old && it.some((i) => i.type === "credits" && i.n === old) && !it.some((i) => i.type === "badge")) {
        const d = DEFAULTS.subPlans.find((x) => x.id === p.id);
        if (d) return { ...p, items: d.items, desc: p.desc === "כל מה שב'חוקר' + בונוס, ומחיר של 9 חודשים בערך" ? d.desc : p.desc };
      }
      return p;
    });
    // v44: מוסיפים את מסלול 'עסקים'
    if (!s.bizAdded) { if (!plans.some((p) => p.id === "biz") && plans.length < 4) plans = plans.concat([DEFAULTS.subPlans.find((p) => p.id === "biz")]); out.bizAdded = true; dirty = true; }
    // v45: מסירים את הטבת 'שאלות AI' ממסלולי חוקר, נווד עולמי ועסקים (ביטול תוכנית ה-AI)
    if (!s.aiPlanOff) { plans = plans.map((p) => (["pro", "pro-year", "biz"].includes(p.id) && Array.isArray(p.items) ? { ...p, items: p.items.filter((i) => i.type !== "ai"), desc: String(p.desc || "").replace(" ועוד שאלות לעוזר", "") } : p)); out.aiPlanOff = true; dirty = true; }
    out.subPlans = plans;
    if (dirty) { try { await st.setJSON("settings", { ...s, subPlans: plans, bizAdded: true, aiPlanOff: true }); } catch {} }
  }
  return out;
}

export async function bump(items) {
  // items: [[group,key,n?], ...] – מעלה מונים ביומית
  const st = await store();
  const k = "s/" + dayKey();
  const s = (await st.get(k)) || {};
  for (const [g, key, n = 1] of items) {
    s[g] = s[g] || {};
    s[g][key] = (s[g][key] || 0) + n;
  }
  await st.setJSON(k, s);
}

const URGENT_RE = /^(\[בדיקה\] )?(🚨|🛡️|🩺|⚠️|✅ התקלה)/;
export async function notify(text, file, opt = {}) {
  if (!isProd()) text = "[בדיקה] " + text;
  const tasks = [];
  const e = process.env;
  if (e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CHAT_ID) {
    if (file) {
      const fd = new FormData();
      fd.append("chat_id", e.TELEGRAM_CHAT_ID); fd.append("caption", text.slice(0, 1000));
      fd.append("document", new Blob([file.content], { type: file.mime || "text/csv" }), file.name);
      tasks.push(fetch(`https://api.telegram.org/bot${e.TELEGRAM_BOT_TOKEN}/sendDocument`, { method: "POST", body: fd }));
    } else tasks.push(fetch(`https://api.telegram.org/bot${e.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: e.TELEGRAM_CHAT_ID, text }),
    }));
  }
  if (e.DISCORD_WEBHOOK_URL)
    tasks.push(fetch(e.DISCORD_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text.slice(0, 1900) }) }));
  if (e.SLACK_WEBHOOK_URL)
    tasks.push(fetch(e.SLACK_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: text.slice(0, 3000) }) }));
  // וואטסאפ (דרך CallMeBot): רק לתקלות והתראות דחופות, כדי שלא יציפו את הטלפון
  if (e.WHATSAPP_PHONE && e.WHATSAPP_APIKEY && (opt.urgent || URGENT_RE.test(text)))
    tasks.push(fetch(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent("+" + e.WHATSAPP_PHONE)}&text=${encodeURIComponent(text.slice(0, 900))}&apikey=${encodeURIComponent(e.WHATSAPP_APIKEY)}`, { signal: AbortSignal.timeout(8000) }));
  if (e.RESEND_API_KEY && e.NOTIFY_EMAIL && !opt.noMail)
    tasks.push(fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + e.RESEND_API_KEY },
      body: JSON.stringify({ from: e.FROM_EMAIL || "onboarding@resend.dev", to: [e.NOTIFY_EMAIL], subject: text.split("\n")[0].slice(0, 90), text,
        ...(file ? { attachments: [{ filename: file.name, content: Buffer.from(file.content).toString("base64") }] } : {}) }),
    }));
  if (globalThis.__notifyHook) globalThis.__notifyHook(text, file);
  await Promise.allSettled(tasks);
}

export async function rangeStats(days) {
  const st = await store();
  const rows = (await st.scan("s/", { desc: true, limit: days })).reverse();
  return rows.map(({ k, v }) => ({ d: k.slice(2), ...(v || {}) }));
}

export function sumGroup(series, g) {
  const o = {};
  series.forEach((s) => Object.entries(s[g] || {}).forEach(([k, n]) => (o[k] = (o[k] || 0) + n)));
  return o;
}

export async function weeklySummary() {
  const series = await rangeStats(7);
  const t = (g) => Object.values(sumGroup(series, g)).reduce((a, b) => a + b, 0);
  const byTool = sumGroup(series, "dl");
  const countries = Object.entries(sumGroup(series, "country")).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ok = t("fbok"), bad = t("fbbad");
  return [
    "📊 דוח שבועי – מזכרות תלת-ממד",
    `פתיחות כלים: ${t("open")} · התחלות שאלון: ${t("wizstart")} · מודלים שנבנו: ${t("build")} · הורדות: ${t("dl")}`,
    `משוב הדפסה: ${ok} הצליחו, ${bad} נכשלו · שגיאות בדפדפן: ${t("error")}`,
    "משפך: " + funnelOf(series).map(([k, n]) => `${k} ${n}`).join(" → "),
    "הורדות לפי כלי: " + (Object.entries(byTool).map(([k, n]) => `${k} ${n}`).join(", ") || "—"),
    "מדינות מובילות: " + (countries.map(([k, n]) => `${k} (${n})`).join(", ") || "—"),
  ].join("\n");
}

// ---------- מייל, אבטחה והגבלת קצב ----------
export const mailEnabled = () => !!(process.env.RESEND_API_KEY && process.env.FROM_EMAIL);
export async function sendMail(to, subject, text) {
  if (!isProd() && !process.env.STAGING_MAIL) return false; // בסביבת בדיקה לא שולחים מיילים אמיתיים
  if (globalThis.__mailHook) { globalThis.__mailHook({ to, subject, text }); return mailEnabled(); }
  if (!mailEnabled()) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + process.env.RESEND_API_KEY },
      body: JSON.stringify({ from: process.env.FROM_EMAIL, to: [to], subject, text }),
    });
    return r.ok;
  } catch { return false; }
}
// בדיקת מייל למנהל: מחזיר פירוט מה השתבש (בלי לחשוף מפתחות)
export async function sendMailDetail(to, subject, text) {
  const miss = [];
  if (!process.env.RESEND_API_KEY) miss.push("RESEND_API_KEY");
  if (!process.env.FROM_EMAIL) miss.push("FROM_EMAIL");
  if (miss.length) return { ok: false, step: "config", error: "חסרים משתני סביבה: " + miss.join(", ") };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + process.env.RESEND_API_KEY },
      body: JSON.stringify({ from: process.env.FROM_EMAIL, to: [to], subject, text }),
    });
    let j = {}; try { j = await r.json(); } catch {}
    if (r.ok) return { ok: true, id: j.id || "" };
    return { ok: false, step: "resend", status: r.status, error: String(j.message || j.name || "שגיאה מ-Resend").slice(0, 300) };
  } catch (e) { return { ok: false, step: "network", error: "אין חיבור ל-Resend: " + String(e && e.message || e).slice(0, 120) }; }
}
export async function rateHit(key, limit, windowMs) {
  const st = await store();
  const k = "rl/" + key;
  const v = (await st.get(k)) || { n: 0, ts: Date.now() };
  if (Date.now() - v.ts > windowMs) { v.n = 0; v.ts = Date.now(); }
  v.n++;
  await st.setJSON(k, v);
  return v.n > limit;
}
export async function secEvent(type, detail, S) {
  const st = await store();
  await st.setJSON("z/" + Date.now() + "-" + rid(2), { ts: Date.now(), type, detail: String(detail || "").slice(0, 200) });
  if (S && S.notifySecurity) {
    const k = "n/sec_" + type, last = await st.get(k);
    if (!last || Date.now() - last.ts > 10 * 60e3) {
      await st.setJSON(k, { ts: Date.now() });
      await notify("🛡️ אירוע אבטחה: " + type + "\n" + String(detail || "").slice(0, 200));
    }
  }
}

// ---------- דוח שבועי כקובץ, יומן פעולות וגיבויים ----------
export async function weeklyCsv(days = 7) {
  const series = await rangeStats(days);
  const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const tot = (o) => Object.values(o || {}).reduce((a, b) => a + (+b || 0), 0);
  const rows = [["תאריך", "מבקרים", "פתיחות", "התחלות שאלון", "מודלים שנבנו", "הורדות", "שגיאות"]];
  series.forEach((d) => rows.push([d.d, Object.keys(d.vis || {}).length, tot(d.open), tot(d.wizstart), tot(d.build), tot(d.dl), tot(d.error)]));
  rows.push([], ["כלי", "פתיחות", "שאלון", "נבנו", "הורדות", "הדפסה הצליחה", "הדפסה נכשלה"]);
  TOOLS.forEach((t) => rows.push([t, ...["open", "wizstart", "build", "dl", "fbok", "fbbad"].map((g) => sumGroup(series, g)[t] || 0)]));
  rows.push([], ["מדינה", "מופעים"]);
  Object.entries(sumGroup(series, "country")).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach((r) => rows.push(r));
  return "\ufeff" + rows.map((r) => r.map(q).join(",")).join("\r\n");
}
export async function audit(me, action, target, detail) {
  const st = await store();
  await st.setJSON("a/" + Date.now() + "-" + rid(2), { ts: Date.now(), by: me ? me.email : "?", action, target: String(target || "").slice(0, 80), detail: String(detail || "").slice(0, 200) });
}
const BK_PREFIXES = ["u/", "e/", "i/", "h/", "r/", "d/", "m/", "bc/", "a/", "s/", "z/", "p/", "gl/", "ga/", "gt/", "gp/", "pc/", "lb/", "lbaw/", "ch/", "pg/"];
const bkKey = () => crypto.scryptSync(process.env.BACKUP_KEY || process.env.SESSION_SECRET || "", "trip3d-backup", 32);
export function encryptBackup(obj) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", bkKey(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: data.toString("base64") };
}
export function decryptBackup(b) {
  const d = crypto.createDecipheriv("aes-256-gcm", bkKey(), Buffer.from(b.iv, "base64"));
  d.setAuthTag(Buffer.from(b.tag, "base64"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(b.data, "base64")), d.final()]).toString("utf8"));
}
export async function makeBackup() {
  const st = await store();
  const out = { v: 1, ts: Date.now(), settings: await st.get("settings"), items: {} };
  let size = 0;
  for (const p of BK_PREFIXES) for (const { k, v } of await st.scan(p)) {
    if (v === null || v === undefined) continue;
    const n = JSON.stringify(v).length;
    if (["p/", "gt/", "gp/"].includes(p) && size > 12e6) continue;
    size += n; out.items[k] = v;
  }
  return out;
}
export async function restoreBackup(b) {
  const st = await store();
  let n = 0;
  if (b.settings) await st.setJSON("settings", b.settings);
  for (const [k, v] of Object.entries(b.items || {})) { if (!BK_PREFIXES.some((p) => k.startsWith(p))) continue; await st.setJSON(k, v); n++; }
  return n;
}
// גיל הגיבוי האחרון בימים (null = אין גיבוי)
export async function lastBackupAge() {
  const st = await store(), keys = await st.list("bk/");
  if (!keys.length) return null;
  const last = keys[keys.length - 1].slice(3), t = Date.parse(last + "T12:00:00Z");
  return isNaN(t) ? null : Math.floor((Date.now() - t) / 864e5);
}
// בדיקת בריאות יומית: מחזיר רשימת בעיות (ריק = הכול תקין)
export async function dailyHealth() {
  const bad = [], e = process.env;
  try { const st = await store(), k = "health/d" + rid(3); await st.setJSON(k, { t: Date.now() }); const v = await st.get(k); await st.delete(k); if (!(v && v.t)) bad.push("האחסון לא החזיר את מה שנכתב"); } catch (x) { bad.push("שגיאת אחסון: " + String((x && x.message) || x).slice(0, 100)); }
  if (!(e.SESSION_SECRET && e.SESSION_SECRET.length >= 16)) bad.push("SESSION_SECRET חסר או קצר");
  if (!mailEnabled()) bad.push("שליחת מיילים לא מוגדרת (אימות ואיפוס סיסמה לא יישלחו)");
  try { const a = await lastBackupAge(); if (a === null) bad.push("אין גיבוי פנימי בכלל"); else if (a > 7) bad.push("הגיבוי האחרון בן " + a + " ימים"); } catch {}
  return bad;
}
// פירוט לדוח הסריקה היומית: שורות מצב (✅/⚠️) + מספרים. לעולם לא זורק שגיאה
export async function healthDetails(bad) {
  const L = [], e = process.env, ok = (c, t, f) => L.push((c ? "✅ " : "⚠️ ") + (c ? t : f || t));
  try {
    const st = await store();
    ok(!bad.some((b) => /אחסון/.test(b)), "אחסון: כתיבה וקריאה תקינות");
    ok(!!(e.SESSION_SECRET && e.SESSION_SECRET.length >= 16), "סוד התחברות מוגדר", "סוד התחברות חסר/קצר");
    ok(mailEnabled(), "שליחת מיילים מוגדרת", "שליחת מיילים לא מוגדרת");
    const a = await lastBackupAge().catch(() => null);
    ok(a !== null && a <= 7, "גיבוי אחרון: " + (a === 0 ? "היום" : a + " ימים"), a === null ? "אין גיבוי" : "גיבוי ישן: " + a + " ימים");
    try { const u = await st.scan("u/", { limit: 5000 }); L.push("👥 משתמשים רשומים: " + u.length); } catch {}
    try { const w = await st.get("n/errwin"); if (w && Date.now() - w.start < 864e5) L.push((w.n ? "🐛 שגיאות בשעה האחרונה: " + w.n : "🐛 אין שגיאות בשעה האחרונה")); } catch {}
    const ch = [["Discord", e.DISCORD_WEBHOOK_URL], ["Telegram", e.TELEGRAM_BOT_TOKEN], ["Slack", e.SLACK_WEBHOOK_URL]].filter((x) => x[1]).map((x) => x[0]);
    L.push("📣 ערוצי התראה פעילים: " + (ch.join(", ") || "אין"));
  } catch (x) { L.push("⚠️ לא ניתן היה לאסוף פירוט: " + String((x && x.message) || x).slice(0, 80)); }
  return L;
}
// תזכורות מנוי: 5 ימים לפני הסיום, ובסיום
export async function subReminders() {
  const st = await store(), now = Date.now(); let n = 0;
  for (const { v: u } of await st.scan("u/", { limit: 1000 })) {
    if (!u || !u.sub || !u.sub.until || u.blocked) continue;
    const left = Math.ceil((u.sub.until - now) / 864e5);
    if (left <= 5 && left > 0 && !u.sub.rem) {
      await addInbox(st, u.uid, "המנוי שלך מסתיים בקרוב ⏰", `מסלול ${u.sub.name} מסתיים בעוד ${left} ימים. כדי להמשיך, שלחו בקשה חדשה ב'החשבון שלי' ← מועדון המטיילים. אפשר גם לכתוב למנהל בצ'אט.`);
      u.sub.rem = true; await st.setJSON("u/" + u.uid, u); n++;
    } else if (u.sub.until <= now && !u.sub.exp) {
      await addInbox(st, u.uid, "המנוי שלך הסתיים", `מסלול ${u.sub.name} הסתיים. תודה שהייתם חלק מהמועדון! אפשר לחדש בכל רגע ב'החשבון שלי'.`);
      u.sub.exp = true; await st.setJSON("u/" + u.uid, u); n++;
    }
  }
  return n;
}
export async function saveAutoBackup() {
  const st = await store();
  const enc = encryptBackup(await makeBackup()), key = "bk/" + dayKey();
  await st.setJSON(key, enc);
  const keys = await st.list("bk/");
  for (const k of keys.slice(0, Math.max(0, keys.length - 4))) await st.delete(k);
  return { key, enc };
}


// ---------- התראת שגיאות למייל בלבד ----------
export async function alertMail(subject, text) {
  const to = process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  if (!to) return false;
  return sendMail(to.trim(), subject, text);
}
// פותח Issue בגיטהאב עם התווית auto-fault (מפעיל את workflow התיקון). פעיל רק אם הוגדרו GITHUB_FAULT_TOKEN ו-GITHUB_REPO
export async function openFaultIssue(title, body) {
  const e = process.env;
  if (!e.GITHUB_FAULT_TOKEN || !/^[\w.-]+\/[\w.-]+$/.test(e.GITHUB_REPO || "")) return "";
  try {
    const r = await fetch(`https://api.github.com/repos/${e.GITHUB_REPO}/issues`, {
      method: "POST",
      headers: { authorization: "Bearer " + e.GITHUB_FAULT_TOKEN, accept: "application/vnd.github+json", "content-type": "application/json", "user-agent": "trip3d-site" },
      body: JSON.stringify({ title: title.slice(0, 120), body: body.slice(0, 6000), labels: ["auto-fault"] }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    return String(j.html_url || "");
  } catch { return ""; }
}
// סופר שגיאות בחלון של שעה; כשעוברים את הסף נשלח מייל אחד (לא יותר מאחד בשעה)
export async function errorSpike(S, msg, src = "browser") {
  try {
    const st = await store(), now = Date.now();
    let w = (await st.get("n/errwin")) || { start: now, n: 0, sent: 0, samples: [] };
    if (now - w.start > 3600e3) w = { start: now, n: 0, sent: 0, samples: [] };
    w.n++;
    if (w.samples.length < 5) w.samples.push(src + ": " + String(msg || "").slice(0, 200));
    const limit = Math.max(1, +S.errThreshold || 5);
    const send = !!S.errAlert && w.n >= limit && !w.sent;
    if (send) w.sent = now;
    // התראה על כל שגיאה (דיסקורד / טלגרם), בלי מייל ובלי וואטסאפ; אותה שגיאה לא נשלחת שוב תוך 10 דקות, ולכל היותר 30 בשעה
    let each = false, rep = 0;
    if (S.errEach !== false) {
      const key = String(src + ":" + String(msg || "").slice(0, 80)), seen = w.seen || (w.seen = {}), p = seen[key];
      w.each = w.each || 0;
      if (p && now - p.t < 600e3) p.n++;                                       // אותה שגיאה: סופרים ולא שולחים שוב
      else if (w.each < 30) { rep = p ? p.n : 0; seen[key] = { t: now, n: 0 }; w.each++; each = true; }
    }
    await st.setJSON("n/errwin", w);
    if (each) await notify(`🐛 שגיאה באתר (${src === "server" ? "שרת" : "דפדפן"})\n${String(msg || "").slice(0, 600)}${rep ? `\n(חזרה ${rep} פעמים מאז ההודעה הקודמת)` : ""}\n(${w.n} שגיאות בשעה האחרונה)`, undefined, { noMail: true });
    if (send) {
      await alertMail(`⚠️ ${w.n} שגיאות באתר בשעה האחרונה`, `זוהו ${w.n} שגיאות מאז ${new Date(w.start).toISOString()}.\n\nדוגמאות:\n- ${w.samples.join("\n- ")}\n\nלפרטים: לוח הבקרה ← סקירה ← שגיאות אחרונות.\n(המייל הזה נשלח פעם אחת בשעה לכל היותר. אפשר לשנות את הסף או לכבות בהגדרות.)`);
      const body = `זוהו ${w.n} שגיאות בשעה האחרונה (מאז ${new Date(w.start).toISOString()}).\n\nדוגמאות:\n- ${w.samples.join("\n- ")}`;
      const issue = await openFaultIssue(`🚨 תקלה באתר: ${w.n} שגיאות בשעה`, body);
      await notify(`🚨 תקלה באתר: ${w.n} שגיאות בשעה האחרונה\n${w.samples.slice(0, 3).join("\n")}\n(לוח בקרה ← סקירה ← שגיאות אחרונות)` + (issue ? `\n🛠️ נפתחה משימת תיקון ל-Claude: ${issue}` : ""), undefined, { noMail: true });
    }
  } catch (e) { console.error("errorSpike", e); }
}

// ---------- משפך ----------
export function funnelOf(series) {
  const t = (g) => series.reduce((n, s) => n + Object.values(s[g] || {}).reduce((a, b) => a + (+b || 0), 0), 0);
  const vis = series.reduce((n, s) => n + Object.keys(s.vis || {}).length, 0);
  const steps = [
    ["מבקרים", vis], ["פתחו כלי", t("open")], ["התחילו שאלון", t("wizstart")], ["נבנה מודל", t("build")],
    ["לחצו הורדה", t("dlclick")], ["נדרשו להתחבר", t("authview")], ["נרשמו", t("reg")], ["הורדו", t("dl")], ["שלחו משוב", t("fbok") + t("fbbad")],
  ];
  return steps;
}


// ---------- חסימות זמניות (כלים / מקומות / פעולות) ----------
export const BLOCK_FEATURES = ["download", "gallery", "register", "ai"];
export const activeBlocks = (S) => (Array.isArray(S.blocks) ? S.blocks : []).filter((b) => !b.until || b.until > Date.now());
export const findBlock = (S, type, key) => {
  const k = String(key || "").trim().toLowerCase();
  return activeBlocks(S).find((b) => b.type === type && String(b.key).trim().toLowerCase() === k) || null;
};


// ---------- גיבוי לאחסון חיצוני (Dropbox ו/או Webhook) ----------
export const extTargets = () => ({ dropbox: !!(process.env.DROPBOX_REFRESH_TOKEN && process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET), webhook: !!process.env.BACKUP_WEBHOOK_URL });
export async function externalBackup(enc, key) {
  const name = "trip3d-" + String(key).replace(/^bk\//, "") + ".json.enc", body = typeof enc === "string" ? enc : JSON.stringify(enc), res = {}, e = process.env;
  if (globalThis.__extHook) { res.hook = await globalThis.__extHook(name, body); return res; }
  if (extTargets().dropbox) {
    try {
      const tr = await fetch("https://api.dropbox.com/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", authorization: "Basic " + Buffer.from(e.DROPBOX_APP_KEY + ":" + e.DROPBOX_APP_SECRET).toString("base64") }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: e.DROPBOX_REFRESH_TOKEN }) });
      const tj = await tr.json();
      if (!tj.access_token) throw new Error("token: " + (tj.error_description || tj.error || tr.status));
      const ur = await fetch("https://content.dropboxapi.com/2/files/upload", { method: "POST", headers: { authorization: "Bearer " + tj.access_token, "content-type": "application/octet-stream", "dropbox-api-arg": JSON.stringify({ path: "/trip3d-backups/" + name, mode: "overwrite", mute: true }) }, body });
      if (!ur.ok) throw new Error("upload: " + ur.status + " " + (await ur.text()).slice(0, 150));
      res.dropbox = "ok";
    } catch (x) { res.dropbox = "error: " + String((x && x.message) || x).slice(0, 200); }
  }
  if (extTargets().webhook) {
    try {
      const r = await fetch(e.BACKUP_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json", "x-filename": name }, body: JSON.stringify({ filename: name, data: body }) });
      res.webhook = r.ok ? "ok" : "error: " + r.status;
    } catch (x) { res.webhook = "error: " + String((x && x.message) || x).slice(0, 200); }
  }
  return res;
}


// ---------- הטבות, תגים ומובילי החודש ----------
export const SUB_TYPES = ["daily", "unlimited", "projects", "gallery", "early", "credits", "ai", "badge"];
export function planItems(x) {
  let it = Array.isArray(x.items) ? x.items : x.perk ? [{ type: x.perk === "daily" ? "daily" : "unlimited", n: x.n }] : [];
  return it.filter((i) => SUB_TYPES.includes(i.type) && (i.type !== "badge" || BADGES[i.key])).map((i) => ({ type: i.type, ...(i.type === "badge" ? { key: i.key } : {}), n: i.type === "unlimited" || i.type === "early" ? 0 : i.type === "badge" ? 1 : Math.max(1, Math.min(100, Math.floor(+i.n) || 1)) })).filter((i, k, a) => a.findIndex((j) => j.type === i.type) === k);
}
export const PERK_TYPES = ["daily", "credits", "unlimited", "ai", "early", "projects", "gallery", "badge"];
export const VIP_OPTS = ["rim:2", "shape:hex", "shape:oct", "shape:oval", "ps:star", "ps:heart"];
export const TIMED_PERKS = ["daily", "unlimited", "ai", "early", "projects", "gallery"];
export const BADGES = { founder: ["🌱", "מייסד", "Founder"], printer: ["🖨️", "מדפיס", "Printer"], printer10: ["🖨️", "מדפיס מנוסה", "Seasoned printer"], member: ["💎", "חבר מועדון", "Club member"], top: ["⭐", "מטייל מוביל", "Top traveler"], maker: ["🎨", "יוצר החודש", "Maker of the month"], inviter: ["🤝", "מזמין", "Inviter"], streak: ["🔥", "רצף יצירה", "Creation streak"], publisher: ["🖼️", "מפרסם בגלריה", "Gallery publisher"], helper: ["💡", "תורם רעיונות", "Helper"], explorer: ["🧭", "חוקר השבוע", "Weekly explorer"], challenger: ["🎯", "מנצח האתגר", "Challenge winner"], countries5: ["🗺️", "חוקר עולם", "World explorer"], dl10: ["🏅", "10 הורדות", "10 downloads"], alltools: ["🛠️", "כל הכלים", "All tools"], refstar: ["👑", "מלך ההזמנות", "Invite champion"], pick: ["🌟", "יצירת השבוע", "Creation of the week"], nomad: ["🌍", "נווד עולמי", "Global nomad"], business: ["🏢", "עסק", "Business"], clubexp: ["🧭", "חוקר המועדון", "Club explorer"], };
export const activePerks = (u, type) => (u.perks || []).filter((p) => (!p.until || p.until > Date.now()) && (!type || p.type === type));
export const perkSum = (u, type) => activePerks(u, type).reduce((a, p) => a + (+p.n || 0), 0);
export const hasEarly = (u) => !!u && (u.role === "admin" || u.role === "editor" || activePerks(u, "early").length > 0);
export function perkText(p) {
  const when = p.until ? " עד " + new Date(p.until).toLocaleDateString("he-IL") : "";
  return ({
    daily: `+${p.n} הורדות ליום${when}`, credits: `${p.n} הורדות נוספות (חד-פעמיות)`, unlimited: `הורדות ללא הגבלה${when}`,
    ai: `+${p.n} שאלות ליום לעוזר ה-AI${when}`, early: `גישה מוקדמת לכלים חדשים ואלמנטים בלעדיים${when}`, projects: `+${p.n} מקומות לפרויקטים שמורים${when}`,
    gallery: `+${p.n} יצירות ממתינות בגלריה${when}`, badge: `תג: ${(BADGES[p.key] || ["", p.key])[0]} ${(BADGES[p.key] || ["", p.key])[1]}`,
  })[p.type] || p.type;
}
export async function addInbox(st, uid, subject, body, by = "system") {
  const mid = Date.now() + "-" + rid(2);
  await st.setJSON("m/" + uid + "/" + mid, { id: mid, ts: Date.now(), read: false, by, subject, body });
  if (pushEnabled()) { try { await pushUser(uid); } catch {} }
  return mid;
}
export async function givePerk(st, u, perk, subject, extra) {
  if (perk.type === "credits") u.credits = (u.credits || 0) + perk.n;
  else if (perk.type === "badge") { u.badges = Array.from(new Set([...(u.badges || []), perk.key])); }
  else u.perks = activePerks(u).concat([{ id: rid(3), type: perk.type, n: perk.n, key: perk.key || "", until: perk.until || 0, note: perk.note || "", ts: Date.now() }]).slice(-30);
  await st.setJSON("u/" + u.uid, u);
  return addInbox(st, u.uid, subject || "קיבלת הטבה 🎁", `${perkText(perk)}${perk.note ? "\n" + perk.note : ""}${extra ? "\n" + extra : ""}`);
}
// מעניק תג; מחזיר true אם התג חדש
export async function awardBadge(st, u, id, silent) {
  if (!BADGES[id] || (u.badges || []).includes(id)) return false;
  u.badges = (u.badges || []).concat([id]);
  await st.setJSON("u/" + u.uid, u);
  if (!silent) await addInbox(st, u.uid, `קיבלת תג חדש ${BADGES[id][0]}`, `התג "${BADGES[id][1]}" נוסף לפרופיל שלך ומופיע ליד שמך בגלריה.`);
  return true;
}
export const monthKey = (t = Date.now()) => dayKey(t).slice(0, 7);
export const lbScore = (e) => (e.v || 0) + 3 * (e.o || 0) + 2 * (e.l || 0);
export async function leaderboard(month) {
  const st = await store(), doc = (await st.get("lb/" + month)) || {};
  return Object.entries(doc).map(([uid, e]) => ({ uid, name: e.n || "", v: e.v || 0, o: e.o || 0, score: lbScore(e) })).filter((x) => x.score >= 5).sort((a, b) => b.score - a.score);
}
const LB_PRIZES = [5, 3, 2];
// מחלק פרסים לשלושת המובילים של חודש שהסתיים (פעם אחת לחודש)
export async function awardMonthly(month, force) {
  const st = await store();
  if (!force && (await st.get("lbaw/" + month))) return { done: false, reason: "already" };
  const top = (await leaderboard(month)).slice(0, 3), out = [];
  for (let i = 0; i < top.length; i++) {
    const u = await st.get("u/" + top[i].uid); if (!u || u.blocked) continue;
    u.credits = (u.credits || 0) + LB_PRIZES[i]; await st.setJSON("u/" + u.uid, u);
    await addInbox(st, u.uid, `🏆 מקום ${i + 1} במובילי החודש!`, `היצירות שלך בגלריה זכו לתשומת הלב הרבה ביותר ב-${month}. קיבלת ${LB_PRIZES[i]} הורדות נוספות${i === 0 ? " ותג \"יוצר החודש\"" : ""}.`);
    if (i === 0) await awardBadge(st, u, "maker", true);
    out.push({ uid: u.uid, place: i + 1, credits: LB_PRIZES[i] });
  }
  await st.setJSON("lbaw/" + month, { ts: Date.now(), winners: out });
  return { done: true, winners: out };
}

// ---------- ניקוי נתונים ישנים (רץ מדי יום) ----------
export async function cleanupOld() {
  const st = await store(), now = Date.now(), r = { rl: 0, tokens: 0, history: 0, ai: 0, feed: 0, botmiss: 0, botlog: 0, trash: 0, perklog: 0 }, CAP = 360;
  const take = (arr, key) => { const part = arr.slice(0, Math.max(0, CAP - Object.values(r).reduce((a, b) => a + b, 0))); r[key] = part.length; return part; };
  const rl = (await st.scan("rl/")).filter((x) => x.v && now - (x.v.ts || 0) > 3 * 864e5).map((x) => x.k);
  const tk = (await st.scan("t/")).filter((x) => x.v && x.v.exp && x.v.exp < now - 864e5).map((x) => x.k);
  const cut = now - 90 * 864e5;
  const hs = (await st.list("h/")).filter((k) => { const t = +k.slice(2).split("-")[0]; return t && t < cut; });
  const aiCut = dayKey(cut), ai = (await st.list("ai/")).filter((k) => k.slice(3) < aiCut);
  const fe = (await st.list("fe/")).filter((k) => +k.slice(3).split("-")[0] < now - 7 * 864e5);
  const bm = (await st.scan("bm/")).filter((x) => x.v && (x.v.last || 0) < now - 60 * 864e5).map((x) => x.k);
  const bl = [...(await st.list("bl/")), ...(await st.list("bf/"))].filter((k) => +k.slice(3).split("-")[0] < now - 45 * 864e5);
  const tr = (await st.scan("tr/")).filter((x) => x.v && (x.v.ts || 0) < now - 7 * 864e5).map((x) => x.k);
  const pg = (await st.scan("pg/")).filter((x) => x.v && (x.v.ts || 0) < now - 120 * 864e5).map((x) => x.k);
  const del = [...take(pg, "perklog"), ...take(tr, "trash"), ...take(rl, "rl"), ...take(tk, "tokens"), ...take(hs, "history"), ...take(ai, "ai"), ...take(fe, "feed"), ...take(bm, "botmiss"), ...take(bl, "botlog")];
  if (del.length) await st.deleteMany(del);
  return r;
}

// ---------- בונוס לכולם, מדינת השבוע והיכל תהילה ----------
export const ilDow = (t = Date.now()) => new Date(new Date(t).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })).getDay();
// בונוס הורדות יומי לכולם: חלון זמן מהלוח, או סוף שבוע (שישי–שבת) אוטומטי
export function bonusNow(S) {
  const now = Date.now(), w = S.bonusWin;
  if (w && w.n > 0 && w.until > now && (!w.from || w.from <= now)) return { n: w.n, label: w.label || "בונוס לכולם", until: w.until };
  const sc = (Array.isArray(S.bonusSched) ? S.bonusSched : []).find((x) => x.from <= now && x.until > now);
  if (sc) return { n: sc.n, label: sc.label || "בונוס לכולם", until: sc.until };
  if (S.weekendBonus > 0) { const d = ilDow(); if (d === 5 || d === 6) return { n: S.weekendBonus, label: "בונוס סוף שבוע", until: 0 }; }
  return null;
}
export function bonusNext(S) {
  const now = Date.now(), nx = (Array.isArray(S.bonusSched) ? S.bonusSched : []).filter((x) => x.from > now && x.from < now + 14 * 864e5).sort((a, b) => a.from - b.from)[0];
  return nx ? { from: nx.from, n: nx.n, label: nx.label || "בונוס לכולם" } : null;
}
// סופר שימוש לפי מדינה (מדינות מרובות "א+ב" נספרות לכל אחת)
export async function topCountries(days = 7) {
  const o = {}; // מפתח באותיות קטנות; שומרים את הכתיב הנפוץ ביותר
  for (const [k, n] of Object.entries(sumGroup(await rangeStats(days), "country"))) for (const c of String(k).split("+")) {
    const x = c.trim(); if (!x || x === "?") continue;
    const e = o[x.toLowerCase()] || (o[x.toLowerCase()] = { n: 0, v: {} });
    e.n += n; e.v[x] = (e.v[x] || 0) + n;
  }
  return Object.values(o).map((e) => ({ country: Object.entries(e.v).sort((a, b) => b[1] - a[1])[0][0], n: e.n })).sort((a, b) => b.n - a.n || a.country.localeCompare(b.country));
}
export const liveDoc = (d) => (d && d.until > Date.now() ? d : null);
export async function perkInfo(S) {
  const st = await store(), [cow, hof, pick, goal] = await st.getMany(["cow/current", "hof/current", "cwk/current", "sys/goal"]);
  return { subs: S.subsOn && (S.subPlans || []).length ? { plans: S.subPlans.map((p) => ({ ...p, items: planItems(p) })), payUrl: S.subPayUrl || "", payNote: S.subPayNote || "" } : null, bonus: bonusNow(S), next: bonusNext(S), texts: S.texts || {}, cow: liveDoc(cow) ? { country: cow.country, until: cow.until, bonus: S.cowBonus } : null, hof: liveDoc(hof) ? { from: hof.from, until: hof.until, top: hof.top } : null,
    pick: liveDoc(pick) ? { id: pick.id, name: pick.name, author: pick.author, country: pick.country, likes: pick.likes } : null, goal: await goalState(S, goal) };
}
// יעד קהילתי חודשי: הורדות של כל האתר; כשמגיעים אליו מופעל בונוס ל-24 שעות
export async function goalState(S, g) {
  if (!(S.goalTarget > 0)) return null;
  const mk = monthKey(), fresh = g && g.m === mk && Date.now() - g.ts < 5 * 60e3;
  if (!fresh) {
    const st = await store(), n = (await rangeStats(31)).filter((x) => x.d.startsWith(mk)).reduce((a, x) => a + Object.values(x.dl || {}).reduce((p, q) => p + q, 0), 0);
    g = { m: mk, n, ts: Date.now(), done: !!(g && g.m === mk && g.done) };
    if (n >= S.goalTarget && !g.done) {
      g.done = true;
      const raw = (await st.get("settings")) || {}, id = Date.now() + "-" + rid(2);
      raw.bonusWin = { n: S.goalBonus || 2, from: Date.now(), until: Date.now() + 864e5, label: "יעד קהילתי הושג! 🎉" };
      await st.setJSON("settings", raw);
      await st.setJSON("bc/" + id, { id, ts: Date.now(), subject: "🎉 הגענו ליעד הקהילתי!", body: `ביחד הגענו ל-${S.goalTarget} הורדות החודש. ב-24 השעות הקרובות: +${raw.bonusWin.n} הורדות ליום לכולם!`, by: "system" });
    }
    await st.setJSON("sys/goal", g);
  }
  return { n: g.n, target: S.goalTarget, done: !!g.done };
}
export const aidOf = (uid) => crypto.createHash("sha256").update((process.env.SESSION_SECRET || "") + "aid" + uid).digest("hex").slice(0, 10);
// האם מותר לחשבון לקבל הטבות: מנהל/מהימן תמיד; חשוד – לא; כשמיילים מוגדרים – רק מייל מאומת
export function canPerk(u, S) {
  if (!u) return false;
  if (u.role === "admin" || u.trusted) return true;
  if (u.sus) return false;
  return !(S.perkVerify !== false && mailEnabled() && !u.verified);
}
export async function pickCreation() {
  const st = await store(), now = Date.now(), ids = await st.getMany((await st.list("ga/")).reverse().slice(0, 300));
  const docs = (await st.getMany(ids.map((i) => "gl/" + i))).filter((g) => g && g.status === "approved" && (g.likes || 0) > 0 && g.ts > now - 30 * 864e5).sort((a, b) => (b.likes || 0) - (a.likes || 0) || b.ts - a.ts);
  if (!docs.length) return null;
  const g = docs[0], doc = { id: g.id, name: g.name, author: g.author || "", country: g.country || "", likes: g.likes, from: now, until: now + 7 * 864e5 };
  await st.setJSON("cwk/current", doc);
  const u = g.uid && (await st.get("u/" + g.uid));
  if (u && !u.blocked) { u.credits = (u.credits || 0) + 2; await st.setJSON("u/" + u.uid, u); await addInbox(st, u.uid, "🌟 היצירה שלך נבחרה ליצירת השבוע!", `"${g.name}" קיבלה הכי הרבה לייקים ומוצגת בדף הבית שבוע שלם. קיבלת 2 הורדות נוספות במתנה.`); await awardBadge(st, u, "pick", true); }
  return doc;
}
export async function publishHof(manual) {
  const st = await store(), top = (await topCountries(7)).slice(0, 3);
  if (!top.length) return { done: false, reason: "nodata" };
  const now = Date.now(), doc = { week: dayKey(now), from: now, until: now + 7 * 864e5, top, manual: !!manual };
  await st.setJSON("hof/current", doc); await st.setJSON("hof/" + doc.week, doc);
  return { done: true, doc };
}
export async function setCow(country, manual) {
  const st = await store(), now = Date.now(), doc = { country: String(country).slice(0, 40), from: now, until: now + 7 * 864e5, manual: !!manual };
  await st.setJSON("cow/current", doc); return doc;
}
// אוטומטי: מדינת השבוע = המדינה הכי פחות משומשת (מבין אלה שהיו בחודש האחרון), כדי לעודד גיוון
export async function autoCow() {
  const st = await store(), cur = await st.get("cow/current");
  if (cur && cur.manual && cur.until > Date.now()) return cur;
  const all = await topCountries(30); if (!all.length) return null;
  const pick = [...all].reverse().find((x) => !cur || x.country !== cur.country) || all[0];
  return setCow(pick.country, false);
}
export async function weeklyPerks() {
  const st = await store(), S = await getSettings(), out = {};
  if (S.hofAuto !== false) out.hof = await publishHof(false);
  out.cow = await autoCow();
  try { out.pick = await pickCreation(); } catch (e) { out.pick = String(e); }
  return out;
}

// ---------- אתגר שבועי, דירוג הזמנות ----------
export const weekKey = (t = Date.now()) => dayKey(t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5);
export async function refBoard(month) {
  const st = await store(), doc = (await st.get("rfm/" + month)) || {};
  return Object.entries(doc).map(([uid, e]) => ({ uid, name: e.n || "", n: e.c || 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
}
const REF_PRIZES = [5, 3, 2];
export async function awardRefMonthly(month, force) {
  const st = await store();
  if (!force && (await st.get("rfaw/" + month))) return { done: false, reason: "already" };
  const top = (await refBoard(month)).slice(0, 3), out = [];
  for (let i = 0; i < top.length; i++) {
    const u = await st.get("u/" + top[i].uid); if (!u || u.blocked) continue;
    u.credits = (u.credits || 0) + REF_PRIZES[i]; await st.setJSON("u/" + u.uid, u);
    await addInbox(st, u.uid, `👑 מקום ${i + 1} במזמינים של ${month}`, `הזמנת הכי הרבה חברים שהורידו קובץ. קיבלת ${REF_PRIZES[i]} הורדות נוספות${i === 0 ? " ותג \"מלך ההזמנות\"" : ""}.`);
    if (i === 0) await awardBadge(st, u, "refstar", true);
    out.push({ uid: u.uid, place: i + 1, credits: REF_PRIZES[i] });
  }
  await st.setJSON("rfaw/" + month, { ts: Date.now(), winners: out });
  return { done: true, winners: out };
}
// דוח שבועי להשוואה בלוח הבקרה + שימור משתמשים
export async function weekReport() {
  const ser = await rangeStats(14), now = Date.now(), c7 = dayKey(now - 7 * 864e5), c14 = dayKey(now - 14 * 864e5);
  const cur = ser.filter((x) => x.d > c7), prev = ser.filter((x) => x.d > c14 && x.d <= c7);
  const t = (a, g) => Object.values(sumGroup(a, g)).reduce((x, y) => x + y, 0);
  const pack = (a) => ({ reg: t(a, "reg"), dl: t(a, "dl"), fbok: t(a, "fbok"), fbbad: t(a, "fbbad"), perks: sumGroup(a, "perk"), tools: sumGroup(a, "dl") });
  const st = await store(), users = (await st.scan("u/", { limit: 600 })).map((x) => x.v).filter((u) => u && !u.blocked);
  const dayOf = (t2) => dayKey(t2), coh = users.filter((u) => u.created && u.created < now - 8 * 864e5 && u.created > now - 30 * 864e5 && u.dlTotal > 0);
  const retained = coh.filter((u) => Object.keys(u.dlHist || {}).some((d) => d >= dayKey(u.created + 7 * 864e5)));
  const active7 = users.filter((u) => Object.keys(u.dlHist || {}).some((d) => d > c7)).length;
  return { cur: pack(cur), prev: pack(prev), retention: { cohort: coh.length, retained: retained.length, active7, users: users.length } };
}

// ---------- בוט העזרה: שאלות שלא נענו ותשובות נלמדות ----------
const STOP = new Set("מה איך למה איפה האם אני אתם אתה את אנחנו יש אפשר של עם לא זה זאת על כל גם או אבל רק עוד כמו אם אז הוא היא הם הן the how what why can you are and for with this that does not have from your my is it to of in on a an i do".split(" "));
export const normQ = (q) => String(q || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export const qHash = (q) => crypto.createHash("sha1").update(normQ(q)).digest("hex").slice(0, 12);
export function extractKeywords(q) {
  return Array.from(new Set(normQ(q).split(" ").map((w) => w.replace(/^ה+(?=.{3})/, "")).filter((w) => w.length >= 3 && !STOP.has(w)))).slice(0, 8).join(" ");
}
export async function feed(text) {
  try { const st = await store(); await st.setJSON("fe/" + Date.now() + "-" + rid(2), { ts: Date.now(), text: String(text).slice(0, 160) }); } catch (e) { /* לא קריטי */ }
}

// שאלות שהבוט לא ידע לענות עליהן בשבוע האחרון (נכנס לדוח השבועי)
export async function botMissText() {
  const st = await store(), cut = Date.now() - 7 * 864e5;
  const rows = (await st.scan("bm/", { limit: 300 })).map((x) => x.v).filter((v) => v && (v.last || 0) > cut).sort((a, b) => b.n - a.n).slice(0, 10);
  if (!rows.length) return "";
  return "\n\n🤖 שאלות שהבוט לא ידע לענות עליהן השבוע:\n" + rows.map((r) => `• ${r.q} (${r.n}x)`).join("\n") + "\n(ללמד אותו: לוח בקרה ← בוט)";
}

// סיכום יומי של השימוש בבוט: שאלות שלא נענו + תשובות שקיבלו 👎 ב-24 השעות האחרונות (ריק אם לא היה כלום)
export async function botDigestText(hours = 24) {
  const st = await store(), cut = Date.now() - hours * 3600e3;
  const miss = (await st.scan("bm/", { limit: 300 })).map((x) => x.v).filter((v) => v && (v.last || 0) > cut).sort((a, b) => b.n - a.n).slice(0, 10);
  const down = (await st.scan("bf/", { limit: 300 })).map((x) => x.v).filter((v) => v && v.up === false && (v.ts || 0) > cut).slice(-10);
  if (!miss.length && !down.length) return "";
  let t = "🤖 הבוט ב-" + hours + " השעות האחרונות:";
  if (miss.length) t += "\n❓ לא ידע לענות:\n" + miss.map((r) => `• ${String(r.q).slice(0, 120)} (${r.n}x)`).join("\n");
  if (down.length) t += "\n👎 תשובות שלא עזרו:\n" + down.map((r) => `• ${String(r.q).slice(0, 100)} → ${r.t || "ללא נושא"}`).join("\n");
  return t + "\n(ללמד אותו: לוח בקרה ← בוט, או לבקש ממני לשפר)";
}

// ---------- התראות דחיפה (Web Push, בלי תוכן; ה-Service Worker שולף את הטקסט בעצמו) ----------
export const pushEnabled = () => !!(process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE);
const b64u = (buf) => Buffer.from(buf).toString("base64url");
async function vapidJwt(aud) {
  const pub = Buffer.from(process.env.VAPID_PUBLIC, "base64url");
  const jwk = { kty: "EC", crv: "P-256", d: process.env.VAPID_PRIVATE, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), ext: true };
  const key = await globalThis.crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" })), pay = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:" + (process.env.ADMIN_EMAIL || "admin@example.com") }));
  const sig = await globalThis.crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, Buffer.from(head + "." + pay));
  return head + "." + pay + "." + b64u(sig);
}
// שולח התראה ריקה למכשירים של משתמש; מחזיר כמה נשלחו. מכשירים שפג תוקפם נמחקים.
export async function pushUser(uid) {
  if (!pushEnabled()) return 0;
  const st = await store(), u = await st.get("u/" + uid);
  if (!u || !(u.push || []).length || u.blocked) return 0;
  let ok = 0; const keep = [];
  for (const s of u.push) {
    try {
      const aud = new URL(s.endpoint).origin;
      const r = await fetch(s.endpoint, { signal: AbortSignal.timeout(4000), method: "POST", headers: { authorization: `vapid t=${await vapidJwt(aud)}, k=${process.env.VAPID_PUBLIC}`, ttl: "86400", "content-length": "0" } });
      if (r.status === 404 || r.status === 410) continue;
      if (r.ok) ok++;
      keep.push(s);
    } catch { keep.push(s); }
  }
  if (keep.length !== u.push.length) { u.push = keep; await st.setJSON("u/" + uid, u); }
  return ok;
}

// ---------- אימות דו-שלבי (TOTP, תואם Google Authenticator) ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function totpSecret() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(20)); let bits = "", out = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}
function b32dec(s) {
  let bits = ""; for (const c of String(s).toUpperCase().replace(/=+$/, "")) { const i = B32.indexOf(c); if (i >= 0) bits += i.toString(2).padStart(5, "0"); }
  const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
export function totpAt(secret, t = Date.now()) {
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = crypto.createHmac("sha1", b32dec(secret)).update(ctr).digest(), o = h[19] & 15;
  return String(((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6).padStart(6, "0");
}
// מחזיר את מספר "חלון הזמן" שהתאים (או 0), כדי שאפשר יהיה למנוע שימוש חוזר באותו קוד
export const totpOk = (secret, code) => { const c = String(code || "").replace(/\s/g, ""); if (!/^\d{6}$/.test(c)) return 0; for (const d of [-1, 0, 1]) { const t = Date.now() + d * 30000; if (totpAt(secret, t) === c) return Math.floor(t / 30000); } return 0; };

// ---------- תזכורת עדינה לפרויקט שנשמר ולא נפתח ----------
export async function projectNudges(max = 40) {
  const st = await store(), now = Date.now(); let n = 0;
  for (const { v: u } of await st.scan("u/", { limit: 1000 })) {
    if (n >= max) break;
    if (!u || u.blocked || !u.last || u.mailOk === false) continue;
    const idle = (now - u.last) / 864e5;
    if (idle < 7 || idle > 45 || (u.nudge && now - u.nudge < 30 * 864e5)) continue;
    const ps = await st.list("p/" + u.uid + "/");
    if (!ps.length) continue;
    await addInbox(st, u.uid, "הפרויקט שלך מחכה לך 🧩", `שמרת ${ps.length === 1 ? "פרויקט" : ps.length + " פרויקטים"} בגלריה האישית ועוד לא חזרת אליו. אפשר להמשיך בדיוק מאיפה שעצרת: 'הגלריה שלי' ← פתיחה.`);
    u.nudge = now; await st.setJSON("u/" + u.uid, u); n++;
  }
  return n;
}
