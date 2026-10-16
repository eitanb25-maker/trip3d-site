import json,re,subprocess,collections
fix={"זמן אפקט,sunlight sim":"סימולטור שמש,sunlight sim,sun simulator","זווית גילה,angle reset,reset view":"איפוס זווית,angle reset,reset view","קצה אחיזה,grip,textured plate":"משטח מרקם,grip,textured plate","גזירה,shear,layer adhesion":"חוזק בין שכבות,layer adhesion,shear","פורט,port,usb":"חיבור usb,usb,usb port"}
terms=[]
for f in "abcd2":
    for l in open(f"terms_{f}.txt" if f!="2" else "kb2.txt",encoding="utf8"):
        l=l.strip()
        if not l: continue
        k,he,en=l.split("|")
        k=fix.get(k,k); he=he.replace("מטפחים בסדר גמור","בסדר גמור")
        terms.append((k,he,en))
# first-keyword uniqueness + existing KB
ex=subprocess.run(["node","-e",'const B=require("./engbase.cjs");console.log(JSON.stringify(B.KB.map(e=>String(e[0]).split(",")[0].replace(/^=/,"").trim().toLowerCase())))'],capture_output=True,text=True,cwd=".").stdout
existing=set(json.loads(ex))
seen=set(existing);kb=[];skip=[]
for k,he,en in terms:
    kws=[x.strip() for x in k.split(",") if x.strip()]
    kws=[("="+x if (len(x)<=3 or (re.fullmatch(r"[A-Za-z0-9 .\-+']+",x) and len(x)<=4)) and not x.startswith("=") else x) for x in kws]
    first=kws[0].lstrip("=").lower()
    if first in seen: skip.append(first); continue
    seen.add(first)
    # prefix first keyword to avoid ML topic collisions
    kws[0]=kws[0]
    kb.append([",".join(kws),he,en,"",""])
print("terms",len(terms),"kb",len(kb),"skipped",skip)
words=collections.OrderedDict();nw=0
STOP=set("עזרה,כסף,יום,שעה,שעות,דקות,דקה,ימים,בן,בת,גן,הר,מש,קורה,אפס,אפל,זבל,אתר,אתרים,עיר,ערים,ילד,ילדה,ילדים,ילדות,נכד,נכדה,נכדים,כיתה,לידה,תינוק,תינוקת,פרוזה,בלה,ליצור,קרא,פינן,פרוסהסלייסר,ענדר,אנדר,מסלול,מסלולים,חזק,חזקה,כהה,כהים,בהיר,בהירים,גבוה,גבוהה,שטוח,שטוחה,אורך,רוחב,גובה,עובי,קוטר,ממד,מידה,מידות,כלי,כלים,ראשי,תפריט,תפריטים,שבור,שבורה,קשיח,גמיש,נייר,פלסטיק,צבוע,חינם,בחינם,חינמי,זול,יקר,שקל,שקלים,דולר,דולרים,עולה,לשלם,משלם,מנה,מנות,טעות,חוזר,לחזור,נעצר,נעצרה,נכשל,נכשלה,כותרת,כותרות,אות,אותיות,שפה,שפות,כרטיס,כרטיסים,ברכה,ברכות,חיבור,חיבורים,לחבר,חידה,חידות,הצג,קבצים,מכשיר,מכשירים,מכונה,פרוסה,פרוס,פורס,חותך,חיתוך,ספורט,גוגל,אזור,אזורים,איזור,איזורים,מחוז,מחוזות,בעיה,בעיות,שגיאה,שגיאות,תקלה,תקלות,שבר,שברים,יצירה,יצירות,קהילה,סמל,סמלים,אישור,אושר,סימון,סימונים,נקודה,נקודות,מיקום,מיקומים,יעד,יעדים,גבעה,גבעות,מישור,לעזור,עוזר,שירות,פנייה,פניה,לפנות,מנהל,דיווח,לדווח,חנות,עסק,עסקי,לעסק,מכירה,מוכר,למכור,רווח,פרויקט,פרויקטים,שמור,שמורים,שמורה,ענן,בענן,טלפון,טלפונים,נייד,מגע,אצבע,אצבעות,גרירה,סיבוב,תנועה,נע,נעה,לולאה,קליפ,קליפים,סרטון,סרטונים,וידאו,וידיאו,מוגבה,מוגבהת,תבליט,תבליטים,לצבוע,צביעה,גוון,גוונים,פלטה,לאפס,איפוס,שחזור,לשחזר,נעילה,ננעל,חסום,ביטול,לבטל,בוטל,בוטלה,הקטנה,הגדלה,להגדיל,להקטין,מוקטן,מוגדל".split(","))
import itertools
for fn in ("words.txt","words2.txt","words3.txt","words4.txt"):
  try: lines=open(fn,encoding="utf8").read().split("\n")
  except FileNotFoundError: continue
  for l in lines:
    if not l.strip(): continue
    t,w=l.split("|"); ws=[x.strip() for x in w.split(",") if x.strip()]
    if fn!="words.txt": ws=[x for x in ws if x not in STOP and (" " in x or len(x)>=4)]
    cur=set(words.get(t,[])); ws=[x for x in dict.fromkeys(ws) if x not in cur]
    words.setdefault(t,[]).extend(ws); nw+=len(ws)
HP=["מה זה {n}","איפה {n}","יש {n}","תסביר על {n}","עזרה עם {n}","שאלה על {n}","בעיה עם {n}","לא הבנתי {n}","איך עובד {n}","מה לגבי {n}"]
EP=["what is {n}","where is {n}","help with {n}","problem with {n}","how does {n} work","question about {n}"]
phr=collections.OrderedDict();np=0;seenp=set()
i=0
for l in open("phr.txt",encoding="utf8"):
    t,ns=l.rstrip("\n").split("|")
    for n in ns.split(","):
        n=n.strip()
        for j in range(3):
            p=HP[(i+j*3)%len(HP)].format(n=n); 
            if p not in seenp: seenp.add(p); phr.setdefault(t,[]).append(p); np+=1
        i+=1
for l in open("phr_en.txt",encoding="utf8"):
    t,ns=l.rstrip("\n").split("|")
    for n in ns.split(","):
        n=n.strip()
        for j in range(2):
            p=EP[(i+j*2)%len(EP)].format(n=n)
            if p not in seenp: seenp.add(p); phr.setdefault(t,[]).append(p); np+=1
        i+=1
print("words",nw,"phrases",np)
syn=[[t,",".join(w)] for t,w in words.items()]+[[t,",".join(p)] for t,p in phr.items()]
import gzip
PT=["מה זה {n}","איפה {n}","יש {n}","תסביר על {n}","עזרה עם {n}","שאלה על {n}","בעיה עם {n}","לא הבנתי {n}","איך עובד {n}","מה לגבי {n}","רוצה לדעת על {n}","אפשר לשאול על {n}"]
tpl=[[t,",".join(w)] for t,w in words.items() if w]
kbx=[]
for l in open("kbx.txt",encoding="utf8"):
    l=l.strip()
    if l and not l.startswith("#"):
        t,k=l.split("|"); ks=[x.strip() for x in k.split(",") if x.strip()]
        ks=[("="+x if len(x)<=3 and not x.startswith("=") else x) for x in ks]  # מילים קצרות = מילה שלמה בלבד
        kbx.append([t.strip(),",".join(ks)])
data={"kbx":kbx,"kb":kb,"syn":syn,"tpl":tpl,"pt":PT,"ptn":6,"pre":["ה","ו","ב","ל","מ","כ","ש","וה","שה","לה","מה","וב","ול","כש"],"suf":["ים","ות","ת","י","ו","ך","נו","כם","ם"]}
raw=json.dumps(data,ensure_ascii=False,separators=(",",":")).encode()
gz=gzip.compress(raw,9)
open("../../public/botlex.bin","wb").write(gz)
print(len(raw),len(gz))
