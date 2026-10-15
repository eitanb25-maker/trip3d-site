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
    for tool,multi in [("stand",False),("stand",True),("key",False),("magnet",False),("orn",False),("puzzle",False),("holder",False)]:
        pg.evaluate("openTool(%s,'%s')"%("true" if multi else "false",tool)); 
        print(tool,"multi" if multi else "", pg.evaluate("ST.map(x=>x.k).join(',')"))
    # full wizard run for stand with tilt+arm
    pg.evaluate("openTool(false,'stand')"); pg.evaluate("$('intro').style.display='none'")
    pg.evaluate("W.cty='Italy';W.tilt=30;W.arm='glider';W.mode='full'")
    pg.evaluate("$('s2').style.display='block'")
    # jump to summary
    pg.evaluate("wi=ST.length-1;wr()"); print("summary:",pg.evaluate("[...document.querySelectorAll('#s2 .rc')].map(r=>r.innerText.replace(/\\n/g,'=')).join(' | ')"))
    pg.evaluate("document.getElementById('wnext').click()"); pg.wait_for_timeout(3500)
    print("mech",pg.evaluate("JSON.stringify(mechApi.M)"), pg.evaluate("$('mtilt').value+' '+$('marm').checked+' '+$('mtype').value"))
    print("parts",pg.evaluate("build().map(p=>p.name).join(',')"))
    # other tools summaries
    for tool in ["puzzle","magnet","key","holder"]:
        pg.evaluate("openTool(false,'%s')"%tool); pg.evaluate("W.cty='Italy';wi=ST.length-1;$('s2').style.display='block';wr()")
        print(tool,"summary:",pg.evaluate("[...document.querySelectorAll('#s2 .rc b')].map(r=>r.innerText).join(' | ')"))
    # english
    pg.evaluate("setLang('en');openTool(false,'stand');$('s2').style.display='block';W.cty='Italy';wi=ST.findIndex(x=>x.k=='tilt');wr()"); print("en tilt:",pg.evaluate("$('s2').innerText.replace(/\\n/g,' / ')")[:200])
    pg.evaluate("wi=ST.findIndex(x=>x.k=='arm');wr()"); print("en arm:",pg.evaluate("$('s2').innerText.replace(/\\n/g,' / ')")[:200])
    print("errs",errs)
