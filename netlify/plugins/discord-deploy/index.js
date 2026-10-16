/* תוסף בנייה מקומי: אחרי כל עדכון (פריסה) נשלחת הודעה לדיסקורד עם הגרסה ושינויים, ואם הבנייה נכשלה נשלחת הודעת כישלון.
   משתמש ב-DISCORD_WEBHOOK_URL. כל שגיאה בתוסף נבלעת, כדי שהודעה שנכשלה לעולם לא תכשיל את הפריסה. */
const fs = require("fs");

function latest() {
  try {
    const d = JSON.parse(fs.readFileSync("public/changelog.json", "utf8")), v = (d.versions || [])[0];
    if (v) return `${v.v}: ${v.title}\n` + (v.items || []).slice(0, 6).map((x) => "• " + x).join("\n");
  } catch (e) {}
  return "";
}
function subject() {
  try { return require("child_process").execSync("git log -1 --pretty=%s", { encoding: "utf8", timeout: 3000 }).trim().slice(0, 200); } catch (e) { return ""; }
}
async function send(text) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url || !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url)) return;
  try { await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text.slice(0, 1900) }) }); } catch (e) { console.log("discord-deploy: send failed"); }
}
const ctx = () => [process.env.CONTEXT || "", process.env.BRANCH ? "ענף " + process.env.BRANCH : "", process.env.COMMIT_REF ? "commit " + String(process.env.COMMIT_REF).slice(0, 7) : ""].filter(Boolean).join(" · ");

module.exports = {
  onSuccess: async ({ utils } = {}) => { await send(`🚀 עדכון עלה לאתר (${ctx()})${subject() ? "\n📝 " + subject() : ""}\n${latest()}${process.env.URL ? "\n🌐 " + process.env.URL : ""}${process.env.DEPLOY_URL ? "\n" + process.env.DEPLOY_URL : ""}`); },
  onError: async ({ utils } = {}) => { await send(`❌ עדכון נכשל בבנייה (${ctx()})\nהאתר ממשיך עם הגרסה הקודמת. פרטים בלוח Netlify ← Deploys.`); },
};
