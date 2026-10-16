// בדיקת שכבת השיחה של הבוט (BotEngine.converse): שאלות המשך, "עוד", כמה שאלות בהודעה, ביטחון נמוך, הקשר כלי, וגם שלא נפגע מענה ישיר.
import fs from "fs"; import zlib from "zlib"; import vm from "vm"; import path from "path"; import { fileURLToPath } from "url";
const D = path.dirname(fileURLToPath(import.meta.url)), ctx = { console, navigator: {}, document: {}, localStorage: {} }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(D + "/../public/botengine.js", "utf8"), ctx); const B = ctx.BotEngine;
B.addLex(JSON.parse(zlib.gunzipSync(fs.readFileSync(D + "/../public/botlex.bin")).toString()));
const bad = []; let n = 0; const T = (name, ok, info) => { n++; if (!ok) bad.push(name + (info ? " → " + info : "")); };
const top = (r) => (r.hit ? B.topic(r.hit) : r.type);
// 1) מענה ישיר לא משתנה (הליבה של הבוט)
{ const st = B.newDialog(), r = B.converse("איך מורידים?", st, { lang: "he" }); T("ישיר", r.type === "answer" && top(r) === B.topic(B.match("איך מורידים?").hit), top(r)); }
// 2) "עוד" נותן נושא אחר קשור, ואז נגמר בנימוס
{ const st = B.newDialog(); const a = B.converse("איך מדפיסים בחלקים", st, { lang: "he" }), b = B.converse("עוד", st, { lang: "he" });
  T("עוד: תשובה נוספת או סיום מנומס", (b.type === "answer" && b.via === "more" && top(b) !== top(a)) || (b.type === "text" && b.offer), top(b));
  const c = B.converse("תפרט", st, { lang: "he" }), d = B.converse("עוד", st, { lang: "he" }); T("עוד: לא חוזר על אותו נושא", c.type !== "answer" || top(c) !== top(a), top(c)); T("עוד: לא נתקע", d.type === "text" || d.type === "answer"); }
// 3) "עוד" בלי הקשר – לא קורס
{ const r = B.converse("עוד", B.newDialog(), { lang: "he" }); T("עוד בלי הקשר", r.type !== "answer" || !!r.hit, r.type); }
// 4) שאלת המשך
{ const st = B.newDialog(); B.converse("איך מורידים את הקובץ", st, { lang: "he" }); const r = B.converse("ומה לגבי בנייד?", st, { lang: "he" }); T("המשך: מחזיר תשובה", r.type === "answer" && !!r.hit, top(r)); }
{ const st = B.newDialog(); B.converse("איך מורידים את הקובץ", st, { lang: "he" }); const r = B.converse("what about on mobile", st, { lang: "en" }); T("המשך באנגלית", r.type === "answer" && !!r.hit, top(r)); }
// 5) כמה שאלות בהודעה אחת
{ const r = B.converse("איך מורידים את הקובץ? ואיך מקבלים עוד הורדות?", B.newDialog(), { lang: "he" }); T("שתי שאלות", r.type === "multi" && r.parts.length === 2 && r.parts.every((p) => p.hit), r.type + " " + (r.parts || []).map((p) => p.hit && B.topic(p.hit))); }
{ const r = B.converse("איך שומרים פרויקט וגם איך מקבלים עוד הורדות", B.newDialog(), { lang: "he" }); T("שתי שאלות עם 'וגם'", r.type === "multi" && r.parts.length === 2, r.type); }
// 6) ביטחון נמוך: עונים אבל מסמנים + חלופות; ו"לא" / מספר
{ const st = B.newDialog(); const qs = ["אפשר לשים שם על המודל", "מה ההבדל בין שתי הגרסאות", "איך בוחרים שפה", "יש לי בעיה עם הצבע", "איפה אני רואה את הדברים שלי", "אפשר לקבל עזרה עם השאלון"]; let low = null; for (const q of qs) { const r = B.converse(q, B.newDialog(), { lang: "he" }); if (r.lowconf) low = q; }
  T("ביטחון נמוך קיים בדוגמאות", !!low, "אין דוגמה"); if (low) { const r = B.converse(low, st, { lang: "he" }); T("ביטחון נמוך: מחזיר hit", r.type === "answer" && !!r.hit); if (r.alts.length) { const p = B.converse("1", st, { lang: "he" }); T("בחירת חלופה במספר", p.type === "answer" && p.via === "pick", p.type); const st2 = B.newDialog(); B.converse(low, st2, { lang: "he" }); const no = B.converse("לא", st2, { lang: "he" }); T("'לא' מציע חלופות", no.type === "text" && no.offer, no.type); } } }
// 7) הקשר כלי פעיל
{ const r = B.converse("איך מגדילים", B.newDialog(), { lang: "he", tool: "magnet" }); T("הקשר כלי לא קורס", ["answer", "none"].includes(r.type)); }
// 8) קלט קיצוני
for (const q of ["", " ", "?", "א".repeat(2000), "\u0000", "<script>", "עוד עוד עוד"]) { try { const r = B.converse(q, B.newDialog(), { lang: "he" }); T("קלט קיצוני: " + JSON.stringify(q).slice(0, 12), ["answer", "multi", "text", "none", "clarify"].includes(r.type), r.type); } catch (e) { T("קלט קיצוני קורס: " + JSON.stringify(q).slice(0, 12), false, e.message); } }
// 9) שאלות מחוץ לנושא נשארות בלי תשובה
{ const r = B.converse("מה מזג האוויר מחר בתל אביב", B.newDialog(), { lang: "he" }); T("מחוץ לנושא", r.type !== "answer" || B.topic(r.hit) === "מזג אוויר" || !r.hit, top(r)); }
console.log(`convo ${n - bad.length}/${n}`); for (const b of bad) console.log("MISS " + b); process.exit(bad.length ? 1 : 0);
