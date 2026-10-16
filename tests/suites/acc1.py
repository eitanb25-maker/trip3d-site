# אקורדיונים: כל לשונית מחולקת לנושאים; פתיחה/סגירה במקלדת; שדה סגור נפתח בפוקוס; כל הבקרים נשארים במקומם
import os, json
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
errs=[]; out={}
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"])
    for mob in (True,False):
        ctx=br.new_context(viewport={"width":390 if mob else 1280,"height":844 if mob else 900},is_mobile=mob,has_touch=mob); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1');localStorage.setItem('trip3d_tour','1')}catch(e){}")
        def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
        ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(""))
        ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
        pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
        pg.evaluate("exampleApi.load('italy')"); pg.wait_for_timeout(1500)
        k="m" if mob else "d"
        out[k+"_groups"]=pg.evaluate("""[1,2,3].map(n=>{const p=document.querySelector('.uxp[data-t="'+n+'"]');return [...p.querySelectorAll(':scope > details.uxacc')].map(d=>d.dataset.k+':'+(d.open?'open':'closed')+':'+d.querySelectorAll('[id]').length)})""")
        # כל הבקרים עדיין קיימים בלשוניות
        out[k+"_ids"]=pg.evaluate("['cin','bed','ncol','trip','tsub','font','fm','f1','shape','bh','q','pl','wb','rmode','qron','qrurl','dl'].filter(i=>!document.getElementById(i))")
        # סגירה/פתיחה במקלדת
        pg.evaluate("uxShowTab(3)"); pg.wait_for_timeout(200)
        pg.focus("details.uxacc[data-k=txt] > summary"); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
        out[k+"_kb_closed"]=pg.evaluate("!document.querySelector('details.uxacc[data-k=txt]').open")
        pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
        out[k+"_kb_open"]=pg.evaluate("document.querySelector('details.uxacc[data-k=txt]').open")
        # פוקוס בתוך קבוצה סגורה פותח אותה
        pg.evaluate("document.querySelector('details.uxacc[data-k=qr]').open=false"); pg.evaluate("document.getElementById('qrurl').focus()"); pg.wait_for_timeout(200)
        out[k+"_focus_opens"]=pg.evaluate("document.querySelector('details.uxacc[data-k=qr]').open")
        # שינוי בשדה בתוך אקורדיון עדיין מעדכן את המודל (debounce)
        pg.evaluate("document.querySelector('details.uxacc[data-k=txt]').open=true"); pg.fill("#trip","בדיקה"); pg.wait_for_timeout(500)
        out[k+"_trip_state"]=pg.evaluate("getProj(false).f.trip")
        out[k+"_ov"]=pg.evaluate("document.documentElement.scrollWidth>innerWidth")
        pg.evaluate("uxShowTab(3)"); pg.evaluate("document.querySelector('details.uxacc[data-k=txt]').scrollIntoView()"); pg.wait_for_timeout(300)
        pg.screenshot(path="acc_%s.png"%k)
        ctx.close()
for k,v in out.items(): print(k, str(v)[:200])
bad=[]
for k in "md":
    g=out[k+"_groups"]
    if [len(x) for x in g]!=[2,2,3]: bad.append(k+" groups "+str(g))
    if out[k+"_ids"]: bad.append(k+" missing ids "+str(out[k+"_ids"]))
    if not out[k+"_kb_closed"] or not out[k+"_kb_open"] or not out[k+"_focus_opens"]: bad.append(k+" kb/focus")
    if out[k+"_trip_state"]!="בדיקה": bad.append(k+" trip not applied")
    if out[k+"_ov"]: bad.append(k+" overflow")
print("errs",errs); print("bad",bad)
