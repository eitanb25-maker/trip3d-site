# דוגמה מוכנה: כפתורים במסך הבית ובמסך ההתחלה טוענים מדינה, סיכות, כיתוב ודגל; ללא שגיאות; גם באנגלית
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
    out["home_buttons"]=pg.evaluate("[...document.querySelectorAll('#home .exbtn')].map(b=>b.textContent)")
    pg.click("#home .exbtn[data-ex=italy]"); pg.wait_for_timeout(1200)
    st=lambda: pg.evaluate("({cin:$('cin').value,trip:$('trip').value,tsub:$('tsub').value,pins:pins.length,names:pins.map(p=>p.name).join(','),fm:$('fm').value,intro:getComputedStyle($('intro')).display,home:getComputedStyle($('home')).display,view:$('view').getBoundingClientRect().height>50,ov:document.documentElement.scrollWidth>innerWidth})")
    out["italy"]=st()
    pg.evaluate("openTool(false,'stand')"); pg.wait_for_timeout(300)
    pg.evaluate("$('home').style.display='';$('intro').style.display='none'"); pg.wait_for_timeout(200)
    pg.evaluate("exampleApi.load('georgia')"); pg.wait_for_timeout(1200); out["georgia"]=st()
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(500)
    pg.evaluate("exampleApi.relabel();exampleApi.load('italy')"); pg.wait_for_timeout(1200); out["italy_en"]=st()
    out["intro_btns"]=pg.evaluate("document.querySelectorAll('#s1 .exbtn').length")
    out["debounce"]=pg.evaluate("""()=>{let n=0;const o=window.update;return typeof updD==='function'&&typeof updD.flush==='function'}""")
for k,v in out.items(): print(k, str(v)[:300])
bad=[]
it=out["italy"]
if it["pins"]!=5 or "Italy" not in it["cin"] and "איטליה" not in it["cin"]: bad.append("italy "+str(it))
if it["intro"]!="none" or it["home"]!="none" or not it["view"]: bad.append("editor not shown "+str(it))
if it["fm"]!="lib" or not it["trip"] or not it["tsub"]: bad.append("fields")
g=out["georgia"]
if g["pins"]!=5: bad.append("georgia "+str(g))
if out["italy_en"]["trip"]!="Italy 2026": bad.append("en "+str(out["italy_en"]))
if len(out["home_buttons"])!=2 or out["intro_btns"]<2: bad.append("buttons")
if not out["debounce"]: bad.append("updD missing")
print("errs",errs); print("bad",bad)
