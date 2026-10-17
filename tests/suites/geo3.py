# מאגר אתרים מפורסמים: שלמות הנתונים (מדינה קיימת, נקודה בתוך המדינה), חיפוש בעברית/אנגלית, וגם כשהרשת החיצונית נופלת
import json
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
errs=[]; out={}; reqs=[]
def nominatim(route):
    from urllib.parse import urlparse, parse_qs
    reqs.append(parse_qs(urlparse(route.request.url).query).get("q",[""])[0]); route.abort()
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); ctx=br.new_context(viewport={"width":1100,"height":900}); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1');localStorage.setItem('trip3d_tour','1')}catch(e){}")
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(""))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    ctx.route("https://nominatim.openstreetmap.org/**", nominatim)
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    pg.evaluate("openTool(false,'stand');$('intro').style.display='none'"); pg.wait_for_timeout(500)
    # 1. שלמות נתונים
    out["integrity"]=pg.evaluate("""()=>{const A=PLACES_ALL(),bad=[],seen={};
      A.forEach(e=>{const R=countries[e.c];if(!R){bad.push(e.en+": no country "+e.c);return}
        if(!(Math.abs(e.lat)<=90&&Math.abs(e.lon)<=180)){bad.push(e.en+": range");return}
        const B=R.map(bb),m=1.5;if(!B.some(b=>e.lon>=b[0]-m&&e.lon<=b[1]+m&&e.lat>=b[2]-m&&e.lat<=b[3]+m))bad.push(e.en+": outside "+e.c);
        const k=e.en.toLowerCase();if(seen[k])bad.push("dup "+e.en);seen[k]=1;
        if(!e.he||!/[\\u0590-\\u05ff]/.test(e.he))bad.push(e.en+": no hebrew name")});
      return{n:A.length,bad}}""")
    # 2. חיפוש מהמאגר כשהרשת החיצונית כשלה (abort)
    pg.evaluate('uxShowTab(2)'); pg.wait_for_timeout(300)
    def ask(q):
        pg.fill("#q",q); pg.click("#sb"); pg.wait_for_timeout(1500)
        return pg.evaluate("[...document.querySelectorAll('#cands button')].map(b=>b.textContent)")
    cases={"יוניברסל סטודיו":"Universal Studios Japan|יוניברסל סטודיו יפן","Universal Studios Japan":"יפן|Japan","הכותל":"הכותל","Eiffel Tower":"אייפל|Eiffel","מגדל אייפל":"אייפל","Colosseom":"קולוסיאום|Colosseum","סגרדה פמיליה":"סגרדה","taj mahal":"מהאל|Taj","פירמידות":"גיזה|Giza","היכל התרבות בקצרין":None}
    res={}
    for q,exp in cases.items(): res[q]=ask(q)
    out["res"]=res
    out["msg_after_fail"]=pg.evaluate("$('msg').textContent")
    # 3. לחיצה על תוצאה מהמאגר מוסיפה סיכה במקום הנכון
    pg.evaluate("pins=[];renderPins()"); ask("הכותל"); pg.click("#cands button"); pg.wait_for_timeout(300)
    out["pin"]=pg.evaluate("pins.map(p=>[p.name,+p.lat.toFixed(3),+p.lon.toFixed(3)])")
    # 4. שאלון (findAll) – התאמה חזקה בלי פנייה לשרת, "Paris" כן פונה לשרת
    reqs.clear(); pg.evaluate("$('cin').value='';pins=[];renderPins();W.fav='';findAll(['Eiffel Tower','Universal Studios Japan','Paris'])"); pg.wait_for_timeout(5000)
    out["findall_reqs"]=list(reqs); out["findall_pins"]=pg.evaluate("pins.map(p=>p.name)"); out["findall_msg"]=pg.evaluate("$('msg').textContent")
    # 5. אנגלית
    pg.evaluate("LANG='en'"); out["en"]=ask("Eiffel Tower")
for k,v in out.items(): print(k,str(v)[:900])
bad=[]
I=out["integrity"]
if I["n"]<300: bad.append("too few places %d"%I["n"])
# איים שאינם בצורת המדינה הגסה במפה – נקודה מחוץ לה היא צפויה (והחיפוש מזהיר על כך)
ISL=("Teide National Park","Rhodes Old Town")
I["bad"]=[b for b in I["bad"] if not b.startswith(ISL)]
if I["bad"]: bad.append("integrity: "+"; ".join(I["bad"][:12]))
for q,exp in cases.items():
    got=res[q]
    if exp is None:
        if got: bad.append("expected nothing for "+q+": "+str(got))
    elif not any(any(w in b for w in exp.split("|")) for b in got): bad.append("missing for "+q+": "+str(got))
if out["pin"]!=[["הכותל המערבי",31.777,35.234]]: bad.append("pin "+str(out["pin"]))
if out["findall_pins"]!=["Eiffel Tower","Universal Studios Japan"] or len(out["findall_reqs"])!=1 or "Paris" not in out["findall_reqs"][0]: bad.append("findAll "+str(out["findall_pins"])+str(out["findall_reqs"]))
if not out["en"] or "Eiffel Tower" not in out["en"][0]: bad.append("english "+str(out["en"]))
print("errs",errs); print("bad",bad)
