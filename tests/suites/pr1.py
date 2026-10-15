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
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1200)
    pg.evaluate("openTool(false,'stand');$('intro').style.display='none'"); pg.wait_for_timeout(400)
    pg.evaluate("uxShowTab(1)"); pg.click("#presetbox button[data-pid=tmb]"); pg.wait_for_timeout(1800)
    # colors: 3 colors so guide shows several groups
    pg.evaluate("$('ncol').value='5';syncPickers();$('c_base').value='#2f5d8a';$('c_land').value='#d9a441';$('c_pin').value='#c0392b';$('c_text').value='#f4f1e8';update()"); pg.wait_for_timeout(1200)
    print("ui",pg.evaluate("[!!$('accbox'),!!window.prodApi]"),errs[:3])
    A=pg.evaluate("(()=>{const a=prodApi.analyse(0.2);return {H:a.H,layers:a.layers,grams:a.grams,groups:a.groups.map(g=>[g.color,g.names.join('+'),g.l0,g.l1,+g.zmin.toFixed(2),+g.zmax.toFixed(2),g.overlap.length])}})()")
    print("analyse",json.dumps(A))
    # open guide in popup
    with ctx.expect_page() as np:
        pg.evaluate("uxShowTab(4)"); pg.click("#gdb")
    g=np.value; g.wait_for_load_state(); txt=g.inner_text("body"); print("guide len",len(txt)); print(txt[:1500].replace("\n"," | "))
    g.screenshot(path="pr_guide.png",full_page=True); g.close()
    # accessories: country shape key, then route key
    pg.evaluate("uxShowTab(4)"); pg.click("#acck"); pg.wait_for_timeout(1200)
    print("tool",pg.evaluate("TOOL"),"parts",pg.evaluate("build().filter(p=>p.geoms.length).map(p=>p.name).join()"))
    pg.evaluate("auto=false;pivot.rotation.x=1.45;pivot.rotation.y=0"); pg.wait_for_timeout(500); pg.locator("#view").screenshot(path="pr_key_country.png")
    pg.check("#accroute"); pg.wait_for_timeout(1500)
    info=pg.evaluate("""()=>{const P=build(),z=scaleFor(P);const names=P.filter(p=>p.geoms.length).map(p=>p.name);let nan=0,tris=0;P.forEach(p=>p.geoms.forEach(g=>{const a=g.attributes.position.array;tris+=a.length/9;for(let i=0;i<a.length;i++)if(!isFinite(a[i])){nan++;break}}));
      const bb=new THREE.Box3();P.forEach(p=>p.geoms.forEach(g=>{g.computeBoundingBox();bb.union(g.boundingBox)}));
      return {names,nan,tris:Math.round(tris),w:z.w,h:z.h,sc:z.sc,zmax:bb.max.z,warn:$('warn').textContent.slice(0,200),size:$('sz').textContent}}""")
    print("route key",json.dumps(info,ensure_ascii=False))
    pg.evaluate("auto=false;pivot.rotation.x=1.45;pivot.rotation.y=0"); pg.wait_for_timeout(500); pg.locator("#view").screenshot(path="pr_key_route.png")
    pg.click("#acco"); pg.wait_for_timeout(1200); print("orn",pg.evaluate("[TOOL,build().filter(p=>p.geoms.length).map(p=>p.name).join()]")); pg.locator("#view").screenshot(path="pr_orn_route.png")
    # project round trip keeps shape
    proj=pg.evaluate("JSON.stringify(getProj(false).accShape)"); print("accShape",proj)
    pg.evaluate("prodApi.ACC.shape='country'"); pg.evaluate("o=>putProj(o)",json.loads(pg.evaluate("JSON.stringify(Object.assign(getProj(false),{accShape:'route'}))"))); print("after put",pg.evaluate("prodApi.ACC.shape"))
    pg.click("#accback"); pg.wait_for_timeout(1000); print("back",pg.evaluate("TOOL"))
    # download still works with route key (prepareFiles)
    pg.click("#acck"); pg.wait_for_timeout(600)
    files=pg.evaluate("(async()=>{try{const f=await prepareFiles();return Object.keys(f||{}).concat((f&&f.length)?f.map(x=>x.name):[]).slice(0,12)}catch(e){return 'ERR '+e.message}})()"); print("files",files)
    print("errs",errs[:6])
