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
    import sys
    tools=sys.argv[1].split(",") if len(sys.argv)>1 else ["stand","key","magnet","orn","puzzle","holder"]
    ctys=["Italy","Israel","Chile","Japan","Greece"]
    bad=[]
    for tool in tools:
        for cty in ctys:
            for multi in ([False,True] if tool=="stand" else [False]):
                pg.evaluate("localStorage.removeItem('trip3d_proj');openTool(%s,'%s');$('intro').style.display='none';$('s2').style.display='block'"%("true" if multi else "false",tool))
                if multi: pg.evaluate("W.ctys=['%s','France'];W.cty='%s'"%(cty,cty))
                else: pg.evaluate("W.cty='%s'"%cty)
                pg.evaluate("wi=ST.length-1;wr()")
                pg.evaluate("document.getElementById('wnext').click()"); pg.wait_for_timeout(3500)
                r=pg.evaluate("""(async()=>{try{const P=build();const f=await prepareFiles();const ch=f.chk||{};return {tool:TOOL,parts:P.filter(p=>p.geoms.length).map(p=>p.name).join(','),files:f.files.length,tris:ch.tris,open:ch.open,deg:ch.deg,bad:(ch.bad||[]).length,warn:(document.getElementById('warn')||{}).textContent}}catch(e){return {err:String(e&&e.message||e)}}})()""")
                tag="%s/%s%s"%(tool,cty,"+FR" if multi else "")
                flag=[]
                if r.get("err"): flag.append("ERR "+r["err"])
                else:
                    if not r["files"]: flag.append("NOFILES")
                    if r.get("open") or r.get("deg") or r.get("bad"): flag.append("MESH open=%s deg=%s bad=%s"%(r.get("open"),r.get("deg"),r.get("bad")))
                    if r["parts"]=="" : flag.append("NOPARTS")
                print(tag,"OK" if not flag else flag,r.get("tris"),(r.get("warn") or "")[:90].replace("\n"," "))
                if flag: bad.append(tag)
    print("BAD",bad); print("errs",errs)
