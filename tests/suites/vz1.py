import os
import json
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); real=open(os.environ.get("THREE_JS","node_modules/three/build/three.min.js")).read()
ITALY=[[7.0,44.0],[8.5,44.4],[10.0,44.0],[12.3,41.9],[14.0,40.8],[15.6,38.0],[16.5,38.9],[16.0,40.0],[18.5,40.1],[16.0,41.9],[14.0,42.5],[12.4,44.2],[13.7,45.6],[12.2,45.4],[10.5,46.5],[7.0,45.9]]
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]); ctx=br.new_context(viewport={"width":1100,"height":1400})
    ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1');localStorage.setItem('trip3d_q','high')}catch(e){}"); ctx.add_init_script('setInterval(()=>{var t=document.getElementById("tourbg");t&&t.remove()},50)')
    ctx.route("**/three.js/**", lambda r: r.fulfill(status=200,content_type="application/javascript",body=real))
    ctx.route("**/cdnjs.cloudflare.com/**", lambda r: r.fulfill(status=200,content_type="application/javascript",body="/*stub*/") if "three" not in r.request.url else r.fallback())
    ctx.route("**/fonts.g*/**", lambda r: r.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1000)
    print("three",pg.evaluate("THREE.REVISION"))
    pg.evaluate("rs=>{openTool(false,'stand');$('intro').style.display='none';setCountry([rs],false);addPin(12.5,41.9,'Rome');addPin(9.2,45.4,'Milan');addPin(14.3,40.85,'Naples');$('c_base').value='#2f5d8a';$('c_land').value='#d9a441';$('c_pin').value='#c0392b';$('c_text').value='#f4f1e8';update()}",ITALY); pg.wait_for_timeout(1500)
    print("ui",pg.evaluate("[!!$('vizbox'),!!window.vizApi]"), "names",pg.evaluate("vizApi.state.names"), "zmax",pg.evaluate("vizApi.state.zmax"),"scale",pg.evaluate("vizApi.state.scale"))
    print("errs",errs[:5])
    pg.evaluate("document.getElementById('view').scrollIntoView()")
    for m in ["matte","gloss","silk","marble","wood","clear"]:
        pg.select_option("#vmat",m); pg.wait_for_timeout(500)
        print(m,pg.evaluate("[...new Set(model.children.map(c=>c.material.type))].join()"), pg.evaluate("model.children.every(c=>c.material.clippingPlanes&&c.material.clippingPlanes.length==1)"))
        pg.locator("#view").screenshot(path=f"vz_{m}.png")
    pg.select_option("#vmat","gloss")
    for f in [1000,500,150]:
        pg.evaluate("f=>{const e=$('vlay');e.value=f;e.dispatchEvent(new Event('input'))}",f); pg.wait_for_timeout(500)
        print("frac",f,pg.evaluate("$('vlayl').textContent"))
        pg.locator("#view").screenshot(path=f"vz_lay{f}.png")
    pg.evaluate("f=>{const e=$('vlay');e.value=1000;e.dispatchEvent(new Event('input'))}",0)
    pg.evaluate("auto=false"); pg.wait_for_timeout(300)
    # pick screen position of Rome pin via projection
    info=pg.evaluate("""()=>{const r=toMM(pins[0].lon,pins[0].lat);const oy=TOOL=='stand'?14:0;const g=model.children.find((c,i)=>vizApi.state.names[i]=='3_pins');g.geometry.computeBoundingBox();
      const v=new THREE.Vector3(r[0],r[1]+oy,vizApi.state.zmax*0+ (()=>{let z=0;const a=g.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){if(Math.hypot(a[i]-r[0],a[i+1]-oy-r[1])<2)z=Math.max(z,a[i+2])}return z/2+ (()=>{let m=1e9;for(let i=0;i<a.length;i+=3){if(Math.hypot(a[i]-r[0],a[i+1]-oy-r[1])<2)m=Math.min(m,a[i+2])}return m/2})()})());
      model.updateMatrixWorld(true);v.applyMatrix4(model.matrixWorld);v.project(cam);const b=document.getElementById('view').getBoundingClientRect();return {x:b.left+(v.x+1)/2*b.width,y:b.top+(1-v.y)/2*b.height,lon:pins[0].lon,lat:pins[0].lat}}""")
    print("pin screen",info)
    x0,y0=info["x"],info["y"]
    pg.mouse.move(x0,y0); pg.mouse.down(); pg.mouse.move(x0+25,y0+4,steps=5); pg.mouse.move(x0+40,y0+6,steps=5); pg.wait_for_timeout(200)
    mid=pg.evaluate("[pins[0].lon,pins[0].lat,!!model.children.find(c=>c.userData.ghost)]"); pg.mouse.up(); pg.wait_for_timeout(1200)
    after=pg.evaluate("[pins[0].lon,pins[0].lat,pins.length,!!model.children.find(c=>c.userData.ghost)]")
    print("drag: before",info["lon"],info["lat"],"mid",mid,"after",after)
    # miss: drag on empty land should rotate (no pin move)
    rot0=pg.evaluate("pivot.rotation.y"); pg.mouse.move(50,50);
    b=pg.evaluate("(()=>{const b=document.getElementById('view').getBoundingClientRect();return [b.left+10,b.top+10]})()"); pg.mouse.move(b[0],b[1]); pg.mouse.down(); pg.mouse.move(b[0]+60,b[1]+5,steps=4); pg.mouse.up()
    print("rotate on miss",rot0,pg.evaluate("pivot.rotation.y"))
    pg.locator("#view").screenshot(path="vz_after.png")
    print("errs",errs[:6])
