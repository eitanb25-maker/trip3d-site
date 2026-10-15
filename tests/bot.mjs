// בדיקת הבוט: טוען את botengine.js ומוודא שכל שאלה ב-bot_cases.json מחזירה את הנושא הצפוי + שאין שאלות ללא תשובה בסט הרחב
import fs from "fs"; import vm from "vm"; import path from "path"; import { fileURLToPath } from "url";
const D = path.dirname(fileURLToPath(import.meta.url)), ctx = { console, navigator: {}, document: {}, localStorage: {} }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(D + "/../public/botengine.js", "utf8"), ctx); const B = ctx.BotEngine;
const bad = []; const cases = JSON.parse(fs.readFileSync(D + "/bot_cases.json", "utf8")).cases;
for (const [q, want] of cases) { const m = B.match(q); const got = m.hit ? B.topic(m.hit) : "NONE"; if (got !== want) bad.push(`${q} → ${got} (ציפינו ${want})`); }
const c = B.counts(); console.log(`bot cases ${cases.length - bad.length}/${cases.length} kb ${c.kb} syn ${c.syn} vocab ${c.vocab}`);
for (const b of bad) console.log("MISS " + b);
process.exit(bad.length ? 1 : 0);
