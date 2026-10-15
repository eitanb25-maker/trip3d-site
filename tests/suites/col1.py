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
    pg.evaluate("uxShowTab(3)"); pg.wait_for_timeout(400)
    print("box in tab", pg.evaluate("document.getElementById('colbox').closest('.uxp')&&document.getElementById('colbox').closest('.uxp').dataset.t"))
    pg.evaluate("colorsApi.generate()"); pg.wait_for_timeout(500)
    print("thumbs",pg.evaluate("Object.keys(colorsApi.C.thumbs).join()"), pg.evaluate("document.querySelectorAll('.colcard').length"))
    b=pg.query_selector("#colbox"); b.scroll_into_view_if_needed(); b.screenshot(path="col_box.png")
    pg.evaluate("document.querySelector('.colcard[data-k=forest]').click()"); pg.wait_for_timeout(1500)
    print("after forest",pg.evaluate("[$('c_base').value,$('c_land').value,!document.getElementById('colrev').hidden,document.querySelector('.colcard.on b').textContent]"))
    pg.evaluate("document.getElementById('colrev').click()"); pg.wait_for_timeout(1500)
    print("after revert",pg.evaluate("[$('c_base').value,$('c_land').value,document.getElementById('colrev').hidden]"))
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(300); print("en", pg.evaluate("document.querySelector('#colbox b').textContent+' | '+document.querySelector('.colcard b').textContent"))
    # wizard style step lists 10 styles
    pg.evaluate("setLang('he');openTool(false,'stand');$('s2').style.display='block';wi=ST.findIndex(x=>x.k=='sty');wr()"); print("wiz styles",pg.evaluate("document.querySelectorAll('#s2 .sw').length"))
    print("errs",errs)
