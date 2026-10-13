// גיבוי יומי מוצפן: נשמר באחסון האתר, ואם הוגדר – גם ב-Dropbox / Webhook
import { saveAutoBackup, externalBackup, extTargets, store, alertMail, awardMonthly, awardRefMonthly, cleanupOld, dayKey, monthKey } from "../lib/lib.mjs";

export default async () => {
  try { const c = await cleanupOld(); if (Object.values(c).some(Boolean)) console.log("cleanup", JSON.stringify(c)); } catch (e) { console.error("cleanup failed", e); }
  try {
    // ביום הראשון בחודש: פרסים אוטומטיים למובילי החודש שהסתיים
    const st0 = await store(), set0 = (await st0.get("settings")) || {};
    if (set0.lbOn !== false && dayKey().endsWith("-01")) await awardMonthly(monthKey(Date.now() - 864e5));
    if (set0.refPrizeOn !== false && dayKey().endsWith("-01")) await awardRefMonthly(monthKey(Date.now() - 864e5));
  } catch (e) { console.error("monthly award failed", e); }
  try {
    const st = await store();
    const settings = (await st.get("settings")) || {};
    if (settings.autoBackup === false) return new Response("off");
    const { key, enc } = await saveAutoBackup();
    const t = extTargets();
    if ((t.dropbox || t.webhook) && settings.extBackup !== false) {
      const res = await externalBackup(enc, key);
      const failed = Object.entries(res).filter(([, v]) => v !== "ok");
      if (failed.length) await alertMail("⚠️ גיבוי חיצוני נכשל", failed.map(([k, v]) => `${k}: ${v}`).join("\n") + "\n\nהגיבוי הפנימי נשמר. בדקו את משתני הסביבה של Dropbox / Webhook.");
    }
  } catch (e) { console.error("daily backup failed", e); }
  return new Response("ok");
};

export const config = { schedule: "@daily" };
