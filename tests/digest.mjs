// סיכום יומי של הבוט לדיסקורד: שאלות שלא נענו + 👎 מה-24 שעות האחרונות; ריק אם אין; לא כולל נתונים ישנים
process.env.TRIP3D_MEMORY = "1"; process.env.SESSION_SECRET = "x".repeat(32);
import { store, botDigestText } from "../netlify/lib/lib.mjs";
const st = await store(), bad = [], now = Date.now();
if ((await botDigestText()) !== "") bad.push("צפוי ריק כשאין שימוש");
await st.setJSON("bm/a", { q: "שאלה שלא נענתה", n: 3, last: now });
await st.setJSON("bm/old", { q: "ישנה מאוד", n: 9, last: now - 5 * 864e5 });
await st.setJSON("bf/" + String(now).padStart(13, "0") + "-aa", { ts: now, q: "תשובה שלא עזרה", t: "מחיר", up: false });
await st.setJSON("bf/" + String(now).padStart(13, "0") + "-bb", { ts: now, q: "תשובה טובה", t: "להוריד", up: true });
const t = await botDigestText();
if (!t.includes("שאלה שלא נענתה (3x)")) bad.push("חסרה שאלה שלא נענתה");
if (t.includes("ישנה מאוד")) bad.push("נתון ישן נכלל");
if (!t.includes("תשובה שלא עזרה") || !t.includes("→ מחיר")) bad.push("חסר 👎");
if (t.includes("תשובה טובה")) bad.push("👍 נכלל בטעות");
if (t.length > 1900) bad.push("ארוך מדי לדיסקורד");
console.log(`digest ${bad.length ? "FAIL" : "ok"}`); for (const b of bad) console.log("MISS " + b); process.exit(bad.length ? 1 : 0);
