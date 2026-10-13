import re,sys
T='/mnt/user-data/outputs/trip3d_template.html'
s=open(T,encoding='utf-8').read()
def rep(a,b,cnt=1):
    global s
    assert a in s,'missing: '+a[:80]
    s=s.replace(a,b,cnt)
# ללא מנגנון הפרסום העצמי של Claude
rep('%%CFG%%','{}');rep('%%TPL%%','')
# סקריפט התקשורת לפני שאר הספריות
rep('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js','<script src="/shim.js"></script>\n<script src="/maint.js" defer></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js')
# ניטור משפך
rep('$("start").onclick=()=>{$("s1").style.display="none";$("s2").style.display="block";wi=0;wr()};','$("start").onclick=()=>{$("s1").style.display="none";$("s2").style.display="block";wi=0;wr();window.TRACK&&TRACK("wizstart")};')
rep('if(MULTI){multiNames=[...W.ctys];','window.TRACK&&TRACK("build",MULTI?W.ctys.join("+"):W.cty);if(MULTI){multiNames=[...W.ctys];')
# שער ההורדה: התחברות באתר (לא חשבון Claude)
a=s.index('(signed?"":`<div class="gate">');b=s.index('</div>`)',a)+len('</div>`)')
s=s[:a]+'''(signed?"":`<div class="gate">${L_("🔒 כדי להוריד צריך להתחבר (פעם אחת, בחינם). ההורדה נרשמת כדי לשמור על מכסה הוגנת לכולם.","🔒 Sign in to download (once, free). Downloads are logged to keep a fair quota for everyone.")}<br><button class="go" id="gatelogin" style="margin:8px 0 0;padding:6px 14px">${L_("התחברות / הרשמה","Sign in / Sign up")}</button></div>`)'''+s[b:]
rep('$("dlg").style.display="flex";$("dno").onclick=closeDlg;','$("dlg").style.display="flex";$("dno").onclick=closeDlg;if($("gatelogin"))$("gatelogin").onclick=()=>{closeDlg();authOpen("login")};',1)
# הורדה: מכסה בשרת במקום רישום ב-db
a=s.index('if(!(await statHit("dl",MULTI?"multi":TOOL))){');b=s.index('closeDlg();return}',a)+len('closeDlg();return}')
s=s[:a]+'{const r=await API.download(MULTI?"multi":TOOL,curCountry());if(!r.ok){m.textContent=r.msg;closeDlg();return}}'+s[b:]
s=s.replace('כדי להוריד יש להתחבר לחשבון Claude.','כדי להוריד צריך להתחבר.').replace('You must sign in to Claude to download.','Sign in to download.')
# הודעת הבית
s=s.replace('🔒 הורדת הקבצים מחייבת התחברות לחשבון Claude (כדי שבעל האתר יוכל לעקוב אחרי השימוש).','🔒 הורדת הקבצים דורשת התחברות (חינם, פעם אחת).')
s=s.replace('🔒 Downloading files requires signing in to Claude (so the site owner can track usage).','🔒 Downloading files requires signing in (free, once).')
# כתובת השיתוף = האתר עצמו
s=re.sub(r'const SHARE_BASE="[^"]*";','const SHARE_BASE=location.origin+location.pathname;',s)

# שורת מכסה + קישור למדריך בחלון ההורדה
rep('<p class="hint">${L_("הקבצים יישמרו יחד בקובץ ZIP אחד.","The files are saved together in one ZIP file.")}</p>','<p class="hint">${L_("הקבצים יישמרו יחד בקובץ ZIP אחד.","The files are saved together in one ZIP file.")}</p>${window.quotaHtml?quotaHtml():""}<p class="hint"><a href="/guide.html" target="_blank" rel="noopener" style="color:var(--ac);font-weight:700">${L_("📖 מדריך הדפסה: איך פותחים את הקבצים בסלייסר","📖 Print guide: how to open the files in your slicer")}</a></p>')
# התחברות מתוך חלון ההורדה: לזכור להמשיך להורדה אחרי הכניסה
rep('if($("gatelogin"))$("gatelogin").onclick=()=>{closeDlg();authOpen("login")};','if($("gatelogin"))$("gatelogin").onclick=()=>{try{localStorage.setItem("trip3d_dl",String(Date.now()))}catch(e){}closeDlg();authOpen("login")};')
# התאמות נוספות
open('/tmp/_tpl_checked.html','w').write(s)
ov=open('/mnt/user-data/outputs/netlify-site/build/override.js',encoding='utf-8').read()
i=s.rindex('</script>')
s=s[:i]+'\n'+ov+'\n'+s[i:]
s=s.replace('<title>מחולל מזכרת תלת-ממד לטיול</title>','''<title>מחולל מזכרת תלת-ממד לטיול</title>\n<meta name="description" content="מחולל מזכרות תלת-ממד: בוחרים מדינה, מסמנים מקומות ומקבלים קבצי הדפסה.">
<meta name="theme-color" content="#1e1b4b"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="מזכרות"><link rel="canonical" href="%%SITE%%/">
<meta property="og:type" content="website"><meta property="og:site_name" content="סטודיו המזכרות"><meta property="og:locale" content="he_IL"><meta property="og:url" content="%%SITE%%/">
<meta property="og:title" content="סטודיו המזכרות – מזכרת תלת-ממד מהטיול"><meta property="og:description" content="בוחרים מדינה, מסמנים את המקומות שהייתם בהם, ומורידים קובץ להדפסה תלת-ממדית בבית. חינם.">
<meta property="og:image" content="%%SITE%%/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="סטודיו המזכרות – מזכרת תלת-ממד מהטיול"><meta name="twitter:description" content="בוחרים מדינה, מסמנים מקומות ומקבלים קבצי הדפסה."><meta name="twitter:image" content="%%SITE%%/og.png">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ctext y=%27.9em%27 font-size=%2790%27%3E%F0%9F%8C%8D%3C/text%3E%3C/svg%3E">''',1)
open('/mnt/user-data/outputs/netlify-site/public/index.html','w',encoding='utf-8').write(s)
open('/tmp/a.js','w').write(s.split('<script>')[-1].split('</script>')[0])
print('built',len(s))
