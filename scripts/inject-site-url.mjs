// רץ ב-build של Netlify: מחליף %%SITE%% בכתובת האתר המלאה (נדרש לתגי Open Graph – חייבים כתובת מלאה)
import fs from "node:fs";
import path from "node:path";
const site = (process.env.SITE_URL || process.env.DEPLOY_PRIME_URL || process.env.URL || "").replace(/\/$/, "");
const dir = path.resolve("public");
let n = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".html")) continue;
  const p = path.join(dir, f), s = fs.readFileSync(p, "utf8");
  if (s.includes("%%SITE%%")) { fs.writeFileSync(p, s.split("%%SITE%%").join(site)); n++; }
}
console.log(`inject-site-url: "${site || "(relative)"}" in ${n} files`);
