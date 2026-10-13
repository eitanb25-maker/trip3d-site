// תרגום לאנגלית של הודעות שרת שמוצגות למשתמש (שגיאות, מתנות, הערות). נבחר לפי הכותרת x-lang: en
import { BADGES } from "./lib.mjs";
const MAP = {
  "נדרשת התחברות": "Please sign in", "כדי לממש קודים צריך לאמת את כתובת המייל": "Verify your email to redeem codes",
  "יותר מדי ניסיונות. נסו שוב בעוד שעה": "Too many attempts. Try again in an hour", "הקוד לא תקף או שפג תוקפו": "This code is invalid or has expired",
  "כבר מימשתם את הקוד הזה": "You already redeemed this code", "שגיאה בטופס": "Form error", "כתובת מייל לא תקינה": "Invalid email address",
  "הסיסמה צריכה להיות באורך 8 תווים לפחות": "Password must be at least 8 characters", "יש לאשר את תנאי השימוש ומדיניות הפרטיות": "Please accept the terms of use and privacy policy",
  "נסו שוב בעוד רגע": "Try again in a moment", "לא ניתן להירשם עם כתובת מייל זמנית": "Temporary email addresses can't be used",
  "יותר מדי הרשמות מהכתובת הזו. נסו שוב מאוחר יותר": "Too many sign-ups from this address. Try again later", "בדיקת האנושיות נכשלה": "Human check failed",
  "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות": "Too many attempts. Try again in a few minutes", "כבר קיים משתמש עם המייל הזה": "An account with this email already exists",
  "האתר סגור להרשמה בלי קוד הזמנה תקף": "Sign-up requires a valid invite code", "יותר מדי ניסיונות מהכתובת הזו": "Too many attempts from this address",
  "מייל או סיסמה שגויים": "Wrong email or password", "החשבון חסום": "This account is blocked", "התחברות עם Google לא הוגדרה": "Google sign-in isn't set up",
  "ההתחברות עם Google נכשלה": "Google sign-in failed", "שליחת מיילים לא הוגדרה באתר": "Email sending isn't set up", "אפשר לבקש עד 3 מיילים בשעה": "You can request up to 3 emails per hour",
  "יותר מדי בקשות. נסו שוב מאוחר יותר": "Too many requests. Try again later", "הקישור לא תקף או שפג תוקפו": "This link is invalid or has expired", "הקישור לא תקף": "This link is invalid",
  "סיסמה שגויה": "Wrong password", "יש להקליד את כתובת המייל לאישור": "Type your email address to confirm", "אי אפשר למחוק את המנהל האחרון": "The last admin can't be deleted",
  "אין חשבון עם המייל הזה. להרשמה סמנו את אישור תנאי השימוש ומדיניות הפרטיות": "No account with this email. To sign up, accept the terms and privacy policy",
  "שליחת המייל נכשלה. נסו שוב מאוחר יותר": "Sending the email failed. Try again later", "כדי להוריד צריך להתחבר": "Sign in to download", "האתר בתחזוקה": "The site is under maintenance",
  "כדי להוריד צריך לאמת את כתובת המייל": "Verify your email to download", "הכלי הזה פתוח כרגע רק למשתמשים עם גישה מוקדמת": "This tool is currently open to early-access users only",
  "הגעת למכסת ההורדות היומית": "You reached the daily download limit", "כדי לשלוח מתנות צריך לאמת את כתובת המייל": "Verify your email to send gifts",
  "אפשר לנסות לשלוח מתנה עד 5 פעמים ביום": "You can try to send a gift up to 5 times a day", "לא נמצא משתמש רשום עם המייל הזה (החבר צריך קודם להירשם לאתר)": "No registered user with this email (your friend needs to sign up first)",
  "החבר צריך קודם לאמת את כתובת המייל שלו": "Your friend needs to verify their email first", "אי אפשר להחזיר מתנה לחבר שנתן לך מתנה השבוע": "You can't gift back to a friend who gifted you this week",
  "החבר כבר קיבל השבוע את מספר המתנות המקסימלי": "Your friend already received the maximum number of gifts this week", "אין לכם הורדה פנויה לתת במתנה": "You have no spare download to give",
  "לא נמצאה הורדה למשוב": "No download found for feedback", "כתבו הודעה": "Write a message", "אפשר לשלוח עד 5 דיווחים בשעה": "You can send up to 5 reports per hour", "כתבו כמה מילים": "Write a few words",
  "אפשר לשלוח עד 5 הצעות בשעה": "You can send up to 5 suggestions per hour", "כדי לדבר עם העוזר צריך להתחבר": "Sign in to talk to the assistant", "העוזר לא פעיל כרגע": "The assistant is off right now",
  "כתבו שאלה": "Write a question", "הגעת למגבלת השאלות היומית לעוזר. אפשר לנסות שוב מחר.": "You reached the daily assistant question limit. Try again tomorrow.",
  "העוזר הגיע למכסה היומית של האתר. נסו שוב מחר.": "The assistant reached the site's daily limit. Try again tomorrow.", "העוזר לא זמין כרגע, נסו שוב בעוד רגע": "The assistant is unavailable, try again in a moment",
  "העוזר לא זמין כרגע": "The assistant is unavailable right now", "לא התקבלה תשובה, נסו שוב": "No answer received, try again", "כדי לתת לייק צריך להתחבר": "Sign in to like creations",
  "יותר מדי לייקים בשעה האחרונה": "Too many likes in the last hour", "לא נמצא": "Not found", "כדי להגיב צריך להתחבר": "Sign in to comment", "כדי להגיב צריך לאמת את כתובת המייל": "Verify your email to comment",
  "אפשר לכתוב עד 10 תגובות בשעה": "You can write up to 10 comments per hour", "כתבו תגובה קצרה": "Write a short comment", "אי אפשר לשים קישורים או כתובות בתגובה": "Links and addresses aren't allowed in comments",
  "כדי לעקוב צריך להתחבר": "Sign in to follow creators", "יותר מדי פעולות, נסו שוב מאוחר יותר": "Too many actions, try again later", "יוצר לא תקין": "Invalid creator", "אפשר לעקוב אחרי עד 50 יוצרים": "You can follow up to 50 creators",
  "אין תמונה": "No image", "תמונה לא תקינה": "Invalid image", "אפשר לשלוח עד 5 יצירות ביום": "You can submit up to 5 creations a day", "אין הרשאה": "Not allowed",
  "אמתו את כתובת המייל כדי לקבל מתנות והטבות (נשלח אליכם קישור)": "Verify your email to receive gifts and perks (we sent you a link)",
  "כדי להוריד צריך לאמת את כתובת המייל": "Verify your email to download",
};
const RULES = [
  [/^(\d+) הורדות מתנת פתיחה$/, (m) => `${m[1]} welcome-gift downloads`],
  [/^(\d+) הורדות על מדינת השבוע \((.*)\)$/, (m) => `${m[1]} downloads for the country of the week (${m[2]})`],
  [/^(\d+) הורדות על האתגר השבועי 🎯$/, (m) => `${m[1]} downloads for the weekly challenge 🎯`],
  [/^תג חדש: (.*)$/, (m) => "New badge: " + m[1].split(", ").map((x) => { const e = Object.values(BADGES).find((b) => x.endsWith(b[1])); return e ? e[0] + " " + e[2] : x; }).join(", ")],
  [/^יש לך כבר (\d+) יצירות שממתינות לאישור$/, (m) => `You already have ${m[1]} creations awaiting approval`],
  [/^הגעת למגבלת (\d+) פרויקטים$/, (m) => `You reached the limit of ${m[1]} projects`],
  [/^\+(\d+) הורדות ליום(.*)$/, (m) => `+${m[1]} downloads per day${m[2].replace(" עד ", " until ")}`],
  [/^(\d+) הורדות נוספות \(חד-פעמיות\)$/, (m) => `${m[1]} extra downloads (one-time)`],
  [/^הורדות ללא הגבלה(.*)$/, (m) => `Unlimited downloads${m[1].replace(" עד ", " until ")}`],
  [/^\+(\d+) שאלות ליום לעוזר ה-AI(.*)$/, (m) => `+${m[1]} AI assistant questions per day${m[2].replace(" עד ", " until ")}`],
  [/^גישה מוקדמת לכלים חדשים ואלמנטים בלעדיים(.*)$/, (m) => `Early access to new tools and exclusive elements${m[1].replace(" עד ", " until ")}`],
  [/^\+(\d+) מקומות לפרויקטים שמורים(.*)$/, (m) => `+${m[1]} saved-project slots${m[2].replace(" עד ", " until ")}`],
  [/^\+(\d+) יצירות ממתינות בגלריה(.*)$/, (m) => `+${m[1]} pending gallery submissions${m[2].replace(" עד ", " until ")}`],
  [/^תג: (.*)$/, (m) => { const e = Object.values(BADGES).find((b) => m[1].endsWith(b[1])); return "Badge: " + (e ? e[0] + " " + e[2] : m[1]); }],
];
export function trEn(s) {
  if (typeof s !== "string") return s;
  if (MAP[s]) return MAP[s];
  for (const [re, fn] of RULES) { const m = re.exec(s); if (m) return fn(m); }
  return s;
}
export function trBody(d) {
  if (!d || typeof d !== "object") return d;
  for (const k of ["error", "note", "text"]) if (typeof d[k] === "string") d[k] = trEn(d[k]);
  if (Array.isArray(d.gifts)) d.gifts = d.gifts.map(trEn);
  return d;
}
