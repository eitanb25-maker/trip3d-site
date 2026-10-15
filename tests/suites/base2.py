import os
import json
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
JS="""async ([shape,fm,name])=>{
 const out={};const bad=(k,d)=>{out[k]=out[k]||[];if(out[k].length<2)out[k].push(d)};
 const pip=(x,y,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
 $('far').checked=false;$('shape').value=shape;$('cin').value=name;$('cin').onchange();pins=[];$('rim').value='0';$('bh').value='3';$('gap').value='3';
 $('fm').value=fm;$('qron').checked=true;$('qrurl').value='https://photos.app.goo.gl/abcdef';$('trip').value='Trip';
 for(const rim of ['0','2']){$('rim').value=rim;
  await new Promise(r=>{update();setTimeout(r,400)});
  const OUT=outline(shape),sx=+rim?1-1.6*(+rim)/62:1,INN=OUT.map(([x,y])=>[x*sx,-6+(y+6)*sx]);let P;try{P=build()}catch(e){bad('EXC',e.message);continue}
  const key=shape+' '+fm+' rim'+rim+' '+name;
  const fl=P.filter(p=>/^5_flag/.test(p.name)&&p.geoms.length),qp=P.find(p=>p.name=='6_qr_plate'),qr=P.find(p=>p.name=='6_qr'),base=P.find(p=>p.name=='1_base');
  if(fm!='none'&&!fl.length)bad('NOFLAG',key);if(fm=='none'&&fl.length)bad('FLAG_NONE',key);
  fl.forEach(p=>p.geoms.forEach(g=>{const a=g.attributes.position.array;for(let i=0;i<a.length;i+=3)if(!pip(a[i],a[i+1],INN)){let md=1;if(md){bad('FLAG_OUT',key+' ('+a[i].toFixed(0)+','+a[i+1].toFixed(0)+')');return}}}));
  if(!qp||!qr||!qr.geoms.length)bad('NOQR',key);
  else{let bx=-1e9;base.geoms.forEach(g=>{g.computeBoundingBox();bx=Math.max(bx,g.boundingBox.max.x)});let mn=1e9,mx=-1e9;qp.geoms.forEach(g=>{g.computeBoundingBox();mn=Math.min(mn,g.boundingBox.min.x);mx=Math.max(mx,g.boundingBox.max.x)});if(mn<bx+1)bad('QR_OVERLAP',key+` plate x ${mn.toFixed(1)} base ${bx.toFixed(1)}`)}
  const z=scaleFor(P);for(const bed of ['120','150','256']){$('bed').value=bed;const z2=scaleFor(P);if(Math.max(z2.w,z2.h)*10>+bed-10+.01)bad('BEDFIT',key+' bed'+bed+' '+z2.w.toFixed(1)+'x'+z2.h.toFixed(1))}
  $('bed').value='256';
  // closed-mesh check of base+rim+flag
  try{const mc=meshCheck(P.filter(p=>/^1_|^1b_|^5_flag|^6_qr_plate/.test(p.name)));if(mc.open)bad('OPEN_EDGES',key+' '+mc.open)}catch(e){bad('meshCheck',e.message)}
 }
 return out}"""
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); ctx=br.new_context(viewport={"width":1280,"height":900})
    ctx.add_init_script("window.qrcode=function(){return{addData(){},make(){},getModuleCount:()=>25,isDark:(r,c)=>(r*7+c*3)%5<2}}"); ctx.add_init_script(stub)
    ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}"); ctx.add_init_script('setInterval(()=>{var t=document.getElementById("tourbg");t&&t.remove()},50)')
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r("/*q*/"))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500); pg.evaluate("openTool(false,'stand');$('intro').style.display='none'")
    fms=pg.evaluate("[...$('fm').options].map(o=>o.value)"); shapes=pg.evaluate("[...$('shape').options].map(o=>o.value)"); print("fm:",fms)
    agg={}
    for sh in shapes:
        for fm in fms:
            if fm in("lib","img"): continue
            for c in ["Italy","Chile","Japan"]:
                o=pg.evaluate(JS,[sh,fm,c])
                for k,v in o.items(): agg.setdefault(k,[]).append((sh,fm,c,v[:1]))
    for k,v in sorted(agg.items()): print(k,len(v),v[:3])
    print("done; errs",errs[:3]); br.close()
