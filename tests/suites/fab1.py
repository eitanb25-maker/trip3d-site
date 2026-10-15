import os
import json
exec(open("pr1.py").read().split("    pg.goto")[0].replace("with sync_playwright() as p:","p=sync_playwright().start()\nif 1:") )
pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1200)
pg.evaluate("localStorage.setItem('trip3d_q','high')")
pg.evaluate("openTool(false,'stand');$('intro').style.display='none';$('cin').value='Italy';$('cin').onchange()"); pg.wait_for_timeout(1000)
pg.evaluate("addPin(12.5,41.9,'Rome');addPin(9.2,45.4,'Milan');addPin(14.3,40.85,'Naples')"); pg.wait_for_timeout(800)
print("ui",pg.evaluate("[!!$('fabbox'),!!window.fabApi]"),errs[:3])
# --- clipHalf on a closed box
r=pg.evaluate("""()=>{const g=new THREE.BoxGeometry(20,20,10).translate(0,0,5);const pos=Array.from(g.toNonIndexed().attributes.position.array);
 const out=fabApi.clipHalf(pos,1,0,3);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(out),3));
 let vol=0;const a=out;for(let i=0;i<a.length;i+=9){vol+=(a[i]*(a[i+4]*a[i+8]-a[i+5]*a[i+7])-a[i+1]*(a[i+3]*a[i+8]-a[i+5]*a[i+6])+a[i+2]*(a[i+3]*a[i+7]-a[i+4]*a[i+6]))/6}
 return {tris:out.length/9,vol,expect:(3+10)*20*10,mc:meshCheck([{name:'t',geoms:[geo]}])}}""")
print("clip box",r)
# --- LED
pg.evaluate("document.getElementById('fabled').click()"); pg.wait_for_timeout(1200)
print("led",pg.evaluate("[fabApi.F.led,fabApi.F.ledNote,build().filter(p=>p.name=='1_base')[0].geoms.length]"))
P=pg.evaluate("""()=>{const P=build();const b=P.filter(p=>p.name=='1_base')[0];return {n:b.geoms.length,mesh:meshCheck(P),vol:b.geoms.map(g=>{const a=(g.index?g.toNonIndexed():g).attributes.position.array;let v=0;for(let i=0;i<a.length;i+=9)v+=(a[i]*(a[i+4]*a[i+8]-a[i+5]*a[i+7])-a[i+1]*(a[i+3]*a[i+8]-a[i+5]*a[i+6])+a[i+2]*(a[i+3]*a[i+7]-a[i+4]*a[i+6]))/6;return +v.toFixed(0)})}}""")
print("led base",P)
pg.evaluate("auto=false;pivot.rotation.x=-1.3;pivot.rotation.y=0.0"); pg.wait_for_timeout(500); pg.locator("#view").screenshot(path="fab_led.png")
for sh in ["square","hex","oval","round","oct","circle"]:
    pg.evaluate("s=>{$('shape').value=s;$('shape').onchange&&$('shape').onchange();update()}",sh); pg.wait_for_timeout(500)
    print(sh,pg.evaluate("[fabApi.F.ledNote.slice(0,40),build().filter(p=>p.name=='1_base')[0].geoms.length,meshCheck(build()).open]"))
pg.evaluate("$('shape').value='circle';update()"); pg.wait_for_timeout(400)
# --- checker
res=pg.evaluate("fabApi.runCheck().then(r=>r.map(i=>[i.kind,i.part,+i.x.toFixed(1),+i.y.toFixed(1),+i.area.toFixed(1)]))"); print("check",res)
pg.evaluate("uxShowTab(4)"); pg.wait_for_timeout(300); print("res text",pg.evaluate("$('fabres').textContent.slice(0,300)"))
pg.evaluate("auto=false;pivot.rotation.x=0.9"); pg.wait_for_timeout(500); pg.locator("#view").screenshot(path="fab_marks.png")
# --- puzzle
for n in [2,4]:
    pg.evaluate("n=>{fabApi.F.cut=n;update()}",n); pg.wait_for_timeout(1000)
    print("cut",n,pg.evaluate("[$('fabcutinfo').textContent]"))
    out=pg.evaluate("""()=>{const t0=performance.now();const P=build();const r=fabApi.cutAll(P);const vol=pcs=>pcs.map(pc=>{let v=0;pc.forEach(p=>p.geoms.forEach(g=>{const a=(g.index?g.toNonIndexed():g).attributes.position.array;for(let i=0;i<a.length;i+=9)v+=(a[i]*(a[i+4]*a[i+8]-a[i+5]*a[i+7])-a[i+1]*(a[i+3]*a[i+8]-a[i+5]*a[i+6])+a[i+2]*(a[i+3]*a[i+7]-a[i+4]*a[i+6]))/6}));return +v.toFixed(0)});
      let tot=0;P.forEach(p=>p.geoms.forEach(g=>{const a=(g.index?g.toNonIndexed():g).attributes.position.array;for(let i=0;i<a.length;i+=9)tot+=(a[i]*(a[i+4]*a[i+8]-a[i+5]*a[i+7])-a[i+1]*(a[i+3]*a[i+8]-a[i+5]*a[i+6])+a[i+2]*(a[i+3]*a[i+7]-a[i+4]*a[i+6]))/6}));
      return {ms:Math.round(performance.now()-t0),orig:Math.round(tot),vols:vol(r.pieces),sum:vol(r.pieces).reduce((a,b)=>a+b,0),parts:r.pieces.map(pc=>pc.length),open:r.pieces.map(pc=>meshCheck(pc).open)}}""")
    print(json.dumps(out))
pg.evaluate("auto=false;pivot.rotation.x=0.9;pivot.rotation.y=0"); pg.wait_for_timeout(500); pg.locator("#view").screenshot(path="fab_seam4.png")
print("errs",errs[:5])
