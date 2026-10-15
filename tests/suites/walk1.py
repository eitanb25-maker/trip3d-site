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
    pg.evaluate("localStorage.removeItem('trip3d_proj');openTool(false,'stand');$('intro').style.display='none';$('s2').style.display='block';wi=ST.findIndex(x=>x.k=='loc');wr()")
    pg.evaluate("document.getElementById('wnext').click()"); pg.wait_for_timeout(150)
    print("empty country blocked:", pg.evaluate("[ST[wi].k,document.getElementById('werr').textContent]"))
    for lang in ["he","en"]:
      pg.evaluate("setLang('%s')"%lang)
      for tool,multi in [("stand",False),("stand",True),("key",False),("magnet",False),("orn",False),("puzzle",False),("holder",False)]:
        pg.evaluate("localStorage.removeItem('trip3d_proj');openTool(%s,'%s');$('intro').style.display='none';$('s2').style.display='block';wi=0;wr()"%("true" if multi else "false",tool))
        seq=[];stuck=None
        for it in range(40):
            k=pg.evaluate("ST[wi]&&ST[wi].k")
            seq.append(k)
            if k=="loc":
                pg.evaluate("if($('wcty')&&!MULTI)$('wcty').value='Italy'")
                if multi: pg.evaluate("W.ctys=['Italy','France'];W.cty='Italy'")
                else: pg.evaluate("W.cty='Italy'")
            if k=="done": break
            before=pg.evaluate("wi")
            pg.evaluate("document.getElementById('wnext').click()"); pg.wait_for_timeout(120)
            after=pg.evaluate("wi")
            if after==before and pg.evaluate("document.getElementById('s2').style.display")!="none":
                # maybe a required choice; try picking first option
                pg.evaluate("(()=>{const o=document.querySelector('#s2 .opt, #s2 [data-v]');o&&o.click()})()"); pg.wait_for_timeout(120)
                pg.evaluate("document.getElementById('wnext').click()"); pg.wait_for_timeout(120)
                if pg.evaluate("wi")==before: stuck=k; break
        final=pg.evaluate("[wi,ST.length]")
        print(lang,tool,"multi" if multi else "","stuck="+str(stuck),"reached",seq[-1],final)
        if seq[-1]=="done":
            pg.evaluate("document.getElementById('wnext').click()"); pg.wait_for_timeout(3000)
            print("   built:",pg.evaluate("[TOOL,!!model&&model.children.length,$('cin').value]"))
    print("errs",errs)
