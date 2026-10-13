// דוח שבועי אוטומטי + גיבוי מוצפן (רץ פעם בשבוע)
import { weeklySummary, weeklyCsv, notify, saveAutoBackup, store } from "../lib/lib.mjs";

export default async () => {
  const csv = await weeklyCsv(7);
  await notify(await weeklySummary(), { name: "weekly-report.csv", content: csv, mime: "text/csv" });
  try {
    const { key, enc } = await saveAutoBackup();
    if (process.env.NOTIFY_EMAIL || process.env.TELEGRAM_BOT_TOKEN || globalThis.__notifyHook) {
      const st = await store();
      const settings = (await st.get("settings")) || {};
      if (settings.autoBackup !== false) await notify("💾 גיבוי שבועי מוצפן נשמר (" + key + "). הקובץ מצורף במייל. לשחזור: לוח בקרה ← גיבויים.", { name: "backup-" + key.slice(3) + ".enc.json", content: JSON.stringify(enc), mime: "application/json" });
    }
  } catch (e) { console.error("backup failed", e); }
  return new Response("ok");
};

export const config = { schedule: "@weekly" };
