import os
import json
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); real=open(os.environ.get("THREE_JS","node_modules/three/build/three.min.js")).read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read(); qr=open("lib/qrcode.js").read()
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]); ctx=br.new_context(viewport={"width":1100,"height":1500})
    ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1');localStorage.setItem('trip3d_q','high')}catch(e){}"); ctx.add_init_script('setInterval(()=>{var t=document.getElementById("tourbg");t&&t.remove()},50)')
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(real)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("/*d3*/")); ctx.route("**/qrcode*", r(qr))
    ctx.route("**/fonts.g*/**", lambda r: r.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append("C:"+m.text) if m.type=="error" else None); pg.on("dialog",lambda d:d.accept())
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    import json
    import time
    pg.evaluate("openTool(false,'stand');$('intro').style.display='none'"); pg.wait_for_timeout(800)
    pg.evaluate("window.confirm=()=>true;uxShowTab(1)")
    for k in ["europe","asia","africa","namerica","samerica","oceania"]:
        t=time.time()
        ok=pg.evaluate("continentsApi.apply('%s')"%k); pg.wait_for_timeout(2500)
        r=pg.evaluate("""(async()=>{const P=build(),m=meshCheck(P),z=scaleFor(P);return {multi:MULTI,names:multiNames.length,crop:crop&&crop.join(','),cin:$('cin').value,tris:m.tris,open:m.open,deg:m.deg,w:+z.w.toFixed(1),h:+z.h.toFixed(1),sc:+z.sc.toFixed(2),warn:$('warn').textContent.slice(0,100),ms:0}})()""")
        print(k,ok,r,round(time.time()-t,1),"s")
    print("errs",errs)
