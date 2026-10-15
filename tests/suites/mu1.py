import os
import json
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); real=open(os.environ.get("THREE_JS","node_modules/three/build/three.min.js")).read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read(); qr=open("lib/qrcode.js").read()
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]); ctx=br.new_context(viewport={"width":390,"height":780},has_touch=True,is_mobile=True)
    ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1');localStorage.setItem('trip3d_q','high')}catch(e){}"); ctx.add_init_script('setInterval(()=>{var t=document.getElementById("tourbg");t&&t.remove()},50)')
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(real)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("/*d3*/")); ctx.route("**/qrcode*", r(qr))
    ctx.route("**/fonts.g*/**", lambda r: r.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append("C:"+m.text) if m.type=="error" else None); pg.on("dialog",lambda d:d.accept())
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    pg.evaluate("openTool(false,'stand');$('intro').style.display='none'"); pg.wait_for_timeout(500)
    pg.evaluate("$('cin').value='Italy';setCountry(countries['Italy']);"); pg.wait_for_timeout(2500)
    print("sticky",pg.evaluate("[mobileApi.active(),getComputedStyle(document.querySelector('.uxprev')).position,document.querySelector('.uxprev').getBoundingClientRect().height,document.documentElement.scrollWidth]"))
    pg.evaluate("window.scrollTo(0,900)"); pg.wait_for_timeout(500)
    print("after scroll top",pg.evaluate("document.querySelector('.uxprev').getBoundingClientRect().top"))
    pg.screenshot(path="mob1.png")
    # undo
    pg.evaluate("window.scrollTo(0,0)")
    pg.evaluate("undoApi.reset()")
    pg.evaluate("$('trip').value='AAA';$('trip').dispatchEvent(new Event('input',{bubbles:true}));update()"); pg.wait_for_timeout(900)
    pg.evaluate("$('trip').value='BBB';$('trip').dispatchEvent(new Event('input',{bubbles:true}));update()"); pg.wait_for_timeout(900)
    print("H",pg.evaluate("[undoApi.H.i,undoApi.H.stack.length,$('undobtn').disabled,$('redobtn').disabled]"))
    pg.evaluate("undoApi.undo()"); pg.wait_for_timeout(2500)
    print("after undo",pg.evaluate("[$('trip').value,undoApi.H.i,undoApi.H.stack.length]"))
    pg.keyboard.press("Control+y"); pg.wait_for_timeout(2500)
    print("after redo",pg.evaluate("[$('trip').value,undoApi.H.i,undoApi.H.stack.length]"))
    pg.evaluate("undoApi.undo()"); pg.wait_for_timeout(2500); pg.evaluate("undoApi.undo()"); pg.wait_for_timeout(2500)
    print("after 2 undo",pg.evaluate("[$('trip').value,undoApi.H.i,undoApi.H.stack.length,$('undobtn').disabled]"))
    pg.evaluate("$('lang')&&0"); 
    print("errs",errs)
