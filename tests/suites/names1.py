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
    r=pg.evaluate("""(()=>{const ks=Object.keys(countries),out={n:ks.length,noHE:[],dupHE:[],noFlag:[],emptyRings:[],tinyAll:[],heNoLat:[],names:{}};const seen={};
      ks.forEach(k=>{const h=HE[k];if(!h)out.noHE.push(k);else{if(seen[h])out.dupHE.push([h,seen[h],k]);seen[h]=k}
        try{if(typeof FLG=='function'&&!FLG(k))out.noFlag.push(k)}catch(e){}
        const rings=countries[k];if(!rings||!rings.length)out.emptyRings.push(k);
        else{let mx=0;rings.forEach(r=>{if(r.length>mx)mx=r.length});if(mx<4)out.tinyAll.push(k)}
        if(h&&/[A-Za-z]/.test(h))out.heNoLat.push([k,h])});
      return out})()""")
    for k,v in r.items():
        print(k, (len(v) if isinstance(v,list) else v), (v[:60] if isinstance(v,list) else ""))
    print("errs",errs+(["כל מדינה חייבת שם בעברית, חסר: "+", ".join(r["noHE"])] if r["noHE"] else [])+(["שמות עבריים כפולים"] if r["dupHE"] else []))
