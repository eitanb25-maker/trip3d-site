// בדיקת הבוט: טוען את botengine.js ומוודא שכל שאלה ב-bot_cases.json מחזירה את הנושא הצפוי + שאין שאלות ללא תשובה בסט הרחב
import fs from "fs"; import vm from "vm"; import path from "path"; import { fileURLToPath } from "url";
const D = path.dirname(fileURLToPath(import.meta.url)), ctx = { console, navigator: {}, document: {}, localStorage: {} }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ["botengine.js", "botlex.js"]) vm.runInContext(fs.readFileSync(D + "/../public/" + f, "utf8"), ctx); const B = ctx.BotEngine;
const bad = []; const cases = JSON.parse(fs.readFileSync(D + "/bot_cases.json", "utf8")).cases;
for (const [q, want] of cases) { const m = B.match(q); const got = m.hit ? B.topic(m.hit) : "NONE"; if (got !== want) bad.push(`${q} → ${got} (ציפינו ${want})`); }
const c = B.counts(); console.log(`bot cases ${cases.length - bad.length}/${cases.length} kb ${c.kb} syn ${c.syn} vocab ${c.vocab}`);
for (const b of bad) console.log("MISS " + b);

// ---- אלפביתים: כל אות בכל שפה נתמכת עוברת נרמול יציב, וזיהוי השפה והתיקון למקלדת שגויה עובדים ----
const ALPHA = {
  he: "אבגדהוזחטיכךלמםנןסעפףצץקרשת",
  ar: "ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيپچژگکی",
  ru: "абвгдеёжзийклмнопрстуфхцчшщъыьэюяіїєґ",
  en: "abcdefghijklmnopqrstuvwxyz",
  es: "áéíóúüñ¿¡",
};
const bad2 = [];
for (const [lang, letters] of Object.entries(ALPHA)) {
  for (const ch of letters) {
    const n = B.norm(ch).trim(), n2 = B.norm(n).trim();
    if (n !== n2) bad2.push(`נרמול לא יציב: ${ch} → ${n} → ${n2}`);
  }
  const probe = lang === "es" ? "¿dónde está mi país?" : letters.slice(0, 8);
  const want = lang === "es" ? "es" : lang;
  const got = B.detect(probe);
  if (got !== want && !(lang === "en" && got === "en")) bad2.push(`זיהוי שפה: ${lang} → ${got}`);
}
for (const [a, b] of [["שלום", "akuo"], ["הורדה", "vursv"], ["סיסמה", "xhxnv"]]) { /* מקלדת עברית */ if (!B.layoutAlts(b).some((x) => B.norm(x).trim() === B.norm(a).trim())) bad2.push(`מקלדת שגויה: ${b} ↛ ${a}`); }
if (B.norm("שלום") !== B.norm("שלומ")) bad2.push("אותיות סופיות לא מנורמלות");
console.log(`alphabets ${bad2.length ? "FAIL" : "ok"}`); for (const b of bad2) console.log("MISS " + b);
const lc = B.counts(); if (lc.kb < 500 || lc.vocab < 5000) { bad2.push(`אוצר מילים קטן מהצפוי: ${JSON.stringify(lc)}`); console.log("MISS " + bad2[bad2.length - 1]); }
if (bad2.length) bad.push(...bad2);
process.exit(bad.length ? 1 : 0);
