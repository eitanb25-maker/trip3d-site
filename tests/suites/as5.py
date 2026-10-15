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
    pg.evaluate("openTool(false,'stand');$('intro').style.display='none'"); pg.wait_for_timeout(500)
    pg.evaluate("$('cin').value='Italy';setCountry(countries['Italy']);"); pg.wait_for_timeout(2500)
    pg.evaluate("$('asmpegs').checked=true;$('asmpegs').onchange.call($('asmpegs'));$('asmkey').checked=true;$('asmkey').onchange.call($('asmkey'))"); pg.wait_for_timeout(2500)
    pg.evaluate("$('gap').value='6';$('gap').onchange&&$('gap').onchange();update()"); pg.wait_for_timeout(2000)
    # top-down-ish camera
    pg.evaluate("cam.position.set(0,110,110);cam.lookAt(0,0,0);R.render(sc,cam)"); pg.wait_for_timeout(500)
    el=pg.query_selector("#view"); el.screenshot(path="asm_3d.png")
    pg.evaluate("uxShowTab(4)"); pg.wait_for_timeout(400)
    b=pg.query_selector("#asmbox"); b.scroll_into_view_if_needed(); b.screenshot(path="asm_box.png")
    p2=pg.query_selector("#postbox"); p2.screenshot(path="post_box.png")
    # postcard
    r=pg.evaluate("""(async()=>{const b=await postcardApi.png();const img=await createImageBitmap(b);return [b.size,img.width,img.height]})()"""); print("png",r)
    sv=pg.evaluate("""(async()=>{const b=postcardApi.svg();const t=await b.text();const d=new DOMParser().parseFromString(t,'image/svg+xml');return [t.length,d.querySelector('parsererror')?'ERR':'ok',d.querySelectorAll('path').length,d.querySelectorAll('circle').length]})()"""); print("svg",sv)
    open("pc.svg","w").write(pg.evaluate("postcardApi.svg().text()"))
    pg.evaluate("document.getElementById('postpng').click()"); pg.wait_for_timeout(3000); pg.query_selector("#postbox").screenshot(path="post_out.png")
    print("map canvas size after", pg.evaluate("[mc.width,mc.height]"), "errs",errs)
