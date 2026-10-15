// בדיקת הודעות הדיסקורד מול fetch מדומה: תוסף הפריסה (הצלחה/כישלון) ותוכן הודעת הפריסה. אין קריאה אמיתית לרשת.
import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
const D = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const sent = []; globalThis.fetch = async (u, o) => { sent.push({ u, body: JSON.parse(o.body) }); return { ok: true, status: 204 }; };
process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc"; process.env.CONTEXT = "production"; process.env.COMMIT_REF = "abcdef1234"; process.env.DEPLOY_URL = "https://x.netlify.app";
process.chdir(path.join(D, ".."));
const plug = require(path.join(D, "../netlify/plugins/discord-deploy/index.js"));
await plug.onSuccess(); await plug.onError({});
process.env.DISCORD_WEBHOOK_URL = "https://evil.example.com/hook"; await plug.onSuccess();
const bad = [];
if (sent.length !== 2) bad.push("צפינו ל-2 הודעות (הצלחה וכישלון; כתובת לא תקינה לא נשלחת), נשלחו " + sent.length);
else {
  if (!/🚀/.test(sent[0].body.content) || !/v\d+/.test(sent[0].body.content)) bad.push("הודעת הצלחה בלי גרסה: " + sent[0].body.content.slice(0, 80));
  if (!/abcdef1/.test(sent[0].body.content)) bad.push("חסר commit בהודעה");
  if (!/❌/.test(sent[1].body.content)) bad.push("הודעת כישלון חסרה");
  if (sent.some((s) => s.body.content.length > 1900)) bad.push("הודעה ארוכה מדי לדיסקורד");
}
console.log(`discord messages ${sent.length}`); for (const b of bad) console.log("MISS " + b); process.exit(bad.length ? 1 : 0);
