# טוטוריאל עם דוגמה: שלב "טענו דוגמה" טוען את המודל, ושלבי העורך מצביעים על התצוגה, הלשוניות וההורדה
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
errs=[]; out={}
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); ctx=br.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1');localStorage.setItem('trip3d_tour','1')}catch(e){}")
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(""))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.on("console",lambda m:errs.append("CONSOLE "+m.text[:120]) if m.type=="error" and "Failed to load resource" not in m.text and "net::" not in m.text else None)
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    pg.evaluate("window.__tutorial(0)"); pg.wait_for_timeout(500)
    card=lambda: pg.evaluate("(()=>{const c=document.getElementById('tutcd');return c?{h:c.querySelector('h3').textContent,n:[...c.querySelectorAll('span')].slice(-1)[0].textContent,btns:[...c.querySelectorAll('button')].map(b=>b.textContent)}:null})()")
    out["s1"]=card()
    pg.click("#tutcd button >> text=/הבא/"); pg.wait_for_timeout(500); out["s2_example"]=card()
    pg.click("#tutcd button >> text=/טענו דוגמה/"); pg.wait_for_timeout(2200); out["s3_view"]=card()
    out["loaded"]=pg.evaluate("({pins:pins.length,trip:$('trip').value})")
    for k in ("s4_tabs","s5_dl"):
        pg.click("#tutcd button >> text=/הבא/"); pg.wait_for_timeout(500); out[k]=card()
    out["rect_dl"]=pg.evaluate("(()=>{const r=document.getElementById('dl').getBoundingClientRect();const s=document.getElementById('tutsh').getBoundingClientRect();return [Math.round(r.top),Math.round(s.top),r.width>0]})()")
    out["ov"]=pg.evaluate("document.documentElement.scrollWidth>innerWidth")
    # בלי טעינת דוגמה: שלבי העורך מדולגים
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_timeout(1500); pg.evaluate("window.__tutorial(0)"); pg.wait_for_timeout(400)
    pg.click("#tutcd button >> text=/הבא/"); pg.wait_for_timeout(400); pg.click("#tutcd button >> text=/הבא/"); pg.wait_for_timeout(400); out["skip_to"]=card()
for k,v in out.items(): print(k, str(v)[:260])
bad=[]
if "דוגמה" not in out["s2_example"]["h"]: bad.append("no example step")
if out["loaded"]["pins"]!=5: bad.append("not loaded")
if "המזכרת" not in out["s3_view"]["h"]: bad.append("view step "+str(out["s3_view"]))
if "לשוניות" not in out["s4_tabs"]["h"] or "הורדה" not in out["s5_dl"]["h"]: bad.append("tabs/dl steps")
if not out["rect_dl"][2]: bad.append("dl invisible")
if "דוגמה" in out["skip_to"]["h"] or "מזכרת" in out["skip_to"]["h"] or "לשוניות" in out["skip_to"]["h"] or "הורדה להדפסה" in out["skip_to"]["h"]: bad.append("editor steps not skipped "+str(out["skip_to"]))
print("errs",errs); print("bad",bad)
