# חלון ההורדה: הסבר על הפורמטים (3MF/STL, אין OBJ), גודל פיזי וקנה מידה 100%, בעברית ובאנגלית
import os
from playwright.sync_api import sync_playwright
real=open(os.environ["THREE_JS"]).read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read(); qr=open("lib/qrcode.js").read()
errs=[]; out={}
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    ctx=br.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True,service_workers="block"); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1');localStorage.setItem('trip3d_tour','1')}catch(e){}")
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(real)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("/*d3*/")); ctx.route("**/qrcode*", r(qr))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    pg.evaluate("exampleApi.load('georgia')"); pg.wait_for_timeout(2500)
    out["meshes"]=pg.evaluate("typeof scene!=='undefined'?scene.children.length:-1")
    pg.evaluate("uxShowTab(4)"); pg.wait_for_timeout(300); pg.evaluate("document.getElementById('dl').click()"); pg.wait_for_timeout(5000)
    out["dbox"]=pg.evaluate("document.getElementById('dbox').innerText")
    pg.evaluate("document.querySelector('#dbox .fmthelp')&&document.querySelector('#dbox .fmthelp').scrollIntoView()"); pg.wait_for_timeout(300)
    pg.screenshot(path="fmt_m.png")
    out["ov"]=pg.evaluate("document.documentElement.scrollWidth>innerWidth")
print(out["dbox"][:900]); print("meshes",out["meshes"],"ov",out["ov"]); print("errs",errs)
t=out["dbox"]; bad=[]
for w in ["3MF","STL","OBJ","100%","Cura","PrusaSlicer","מ״מ"]:
    if w not in t: bad.append("missing "+w)
if out["ov"]: bad.append("overflow")
print("bad",bad)
