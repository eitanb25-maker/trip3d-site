// מדידת דיוק הבוט על שאלות אמיתיות: tests/data/*.tsv (שאלה<TAB>נושא צפוי). שימוש: node tests/evalq.mjs [-v]
import fs from "fs"; import zlib from "zlib"; import vm from "vm"; import path from "path"; import { fileURLToPath } from "url";
const D = path.dirname(fileURLToPath(import.meta.url)), ctx = { console, navigator: {}, document: {}, localStorage: {} }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(D + "/../public/botengine.js", "utf8"), ctx); const B = ctx.BotEngine;
B.addLex(JSON.parse(zlib.gunzipSync(fs.readFileSync(D + "/../public/botlex.bin")).toString()));
let ok = 0, n = 0; const bad = [];
for (const f of fs.readdirSync(D + "/data").filter((x) => x.endsWith(".tsv"))) for (const l of fs.readFileSync(D + "/data/" + f, "utf8").split("\n")) {
  if (!l.trim()) continue; const [q, want] = l.split("\t"); n++;
  const m = B.match(q); const got = m.hit ? B.topic(m.hit) : "NONE";
  if (want.trim().split("|").includes(got)) ok++; else bad.push(`${f}: ${q} → ${got} (צפוי: ${want})`);
}
console.log(`eval ${ok}/${n} (${(100 * ok / n).toFixed(1)}%)`);
if (process.argv.includes("-v")) for (const b of bad) console.log("MISS " + b);
