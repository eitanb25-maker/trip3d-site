import os
import json
exec(open("pr1.py").read().split("    pg.goto")[0].replace("with sync_playwright() as p:","p=sync_playwright().start()\nif 1:") )
pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1200)
pg.evaluate("localStorage.setItem('trip3d_q','high')")
pg.evaluate("openTool(false,'stand');$('intro').style.display='none';$('cin').value='Italy';$('cin').onchange()"); pg.wait_for_timeout(1000)
pg.evaluate("addPin(12.5,41.9,'Rome');addPin(9.2,45.4,'Milan');$('trip').value='Italy';update()"); pg.wait_for_timeout(800)
pg.evaluate("uxShowTab(3)")
print("ui",pg.evaluate("[!!$('lithobox'),!!window.lithoApi]"),errs[:3])
def info(tag):
    r=pg.evaluate("""()=>{const t0=performance.now();const P=build();const ms=Math.round(performance.now()-t0);const m=meshCheck(P);const g=lithoApi.grid();return {ms,parts:P.filter(p=>p.geoms.length).map(p=>p.name).join(),open:m.open,deg:m.deg,tris:m.tris,sc:scaleFor(P).sc.toFixed(2),T:g&&[Math.min(...g.T.filter((v,i)=>g.A[i])),Math.max(...g.T)],txt:$('lithoinfo').textContent.slice(0,60)}}""")
    print(tag,json.dumps(r,ensure_ascii=False))
pg.check("#lithoon"); pg.wait_for_timeout(1500); info("coast")
pg.locator("#lithoprev").screenshot(path="lt_prev_coast.png")
# relief image
img=pg.evaluate("""()=>{const c=document.createElement('canvas');c.width=c.height=300;const g=c.getContext('2d');const gr=g.createRadialGradient(150,120,5,150,150,150);gr.addColorStop(0,'#fff');gr.addColorStop(1,'#000');g.fillStyle=gr;g.fillRect(0,0,300,300);return c.toDataURL('image/png')}""")
pg.evaluate("u=>{loadLayerURL('relief',u);$('rmode').value='gray';update()}",img); pg.wait_for_timeout(1800); info("relief")
pg.locator("#lithoprev").screenshot(path="lt_prev_relief.png")
pg.check("#linv"); pg.wait_for_timeout(1200); info("invert"); pg.locator("#lithoprev").screenshot(path="lt_prev_inv.png")
pg.uncheck("#linv"); pg.wait_for_timeout(800)
pg.evaluate("auto=false;pivot.rotation.x=0.8;pivot.rotation.y=0.3"); pg.wait_for_timeout(700); pg.locator("#view").screenshot(path="lt_3d.png")
r=pg.evaluate("""async()=>{const t0=performance.now();const r=await prepareFiles();return {ms:Math.round(performance.now()-t0),files:r.files.map(f=>[f.name,f.data.byteLength||f.data.length]),chk:r.chk}}""")
print(json.dumps(r)[:600])
for sh in ["square","hex","oval","round"]:
    pg.evaluate("s=>{$('shape').value=s;update()}",sh); pg.wait_for_timeout(900); info(sh)
pg.evaluate("$('shape').value='circle';update()")
print("proj",pg.evaluate("JSON.stringify(getProj(false).litho)"))
pg.evaluate("mechApi.M.tilt=30;mechApi.M.arm.on=true;fabApi.F.led=true;update()"); pg.wait_for_timeout(1200); info("litho+tilt+arm+led")
print("errs",errs[:5])
