import os
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
P='<img src=x onerror="window.__x=(window.__x||0)+1"><script>window.__x=99<\\/script>'
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); ctx=br.new_context(); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}")
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(""))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:(errs.append("DIALOG "+d.message),d.dismiss()))
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    pg.evaluate("openTool(false,'stand');$('intro').style.display='none';$('cin').value='Italy';$('cin').onchange()")
    pg.evaluate("""p=>{pins=[{lon:12,lat:42,name:p},{lon:11,lat:43,name:p+'2'}];$('trip').value=p;$('tsub').value=p;renderPins();update();}""",P); pg.wait_for_timeout(500)
    # import via text, share dialog, project save
    pg.evaluate("""async p=>{$('impt').value='Roma 41.9, 12.5\\n'+p+' 43.1, 11.2';$('impb').click();await new Promise(r=>setTimeout(r,300));try{$('shc')&&$('shc').click()}catch(e){};try{openShare&&await openShare()}catch(e){};await new Promise(r=>setTimeout(r,500))}""",P)
    print("xss:",pg.evaluate("window.__x||0"),"imgs in pl:",pg.evaluate("document.querySelectorAll('#pl img, #shbox img, #cands img').length"),"scripts injected:",pg.evaluate("[...document.querySelectorAll('#pl script, #shbox script')].length"),errs[:3]); br.close()
