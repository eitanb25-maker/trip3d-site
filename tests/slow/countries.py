import json, os, sys, time
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open(os.environ.get("THREE_JS","node_modules/three/build/three.min.js")).read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
TOOLS=sys.argv[1].split(",") if len(sys.argv)>1 else ["stand","magnet","key","orn","puzzle","holder"]
JS="""async ([name,tool])=>{
 const out={name,tool,issues:[]};const t0=performance.now();
 try{
  openTool(false,tool);$('far').checked=window.__FAR||false;$('intro').style.display='none';if(tool=='puzzle'){try{PZ=null}catch(e){}}
  $('cin').value=name;$('cin').onchange();
  const n=findC(name);if(!n){out.issues.push('findC fails');return out}
  const P=build();const z=scaleFor(P);
  if(!(z.sc>0&&isFinite(z.sc)&&z.w>0&&z.h>0))out.issues.push('bad scale '+z.sc+' '+z.w+'x'+z.h);
  let tris=0,nan=0,mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9,cn=0;
  P.forEach(p=>p.geoms.forEach(g=>{const a=g.attributes.position.array;for(let i=0;i<a.length;i++)if(!isFinite(a[i])){nan++;break}tris+=a.length/9;
    if(/^2_country|^2a_loop/.test(p.name)){cn++;g.computeBoundingBox();const b=g.boundingBox;mnx=Math.min(mnx,b.min.x);mxx=Math.max(mxx,b.max.x);mny=Math.min(mny,b.min.y);mxy=Math.max(mxy,b.max.y)}}));
  out.tris=Math.round(tris);out.w=+z.w.toFixed(1);out.h=+z.h.toFixed(1);out.sc=+z.sc.toFixed(2);
  if(nan)out.issues.push('NaN in '+nan+' geoms');
  if(tool!='holder'){ if(!cn)out.issues.push('no country geometry'); else if(mxx-mnx<1.5||mxy-mny<1.5)out.issues.push('country tiny '+(mxx-mnx).toFixed(2)+'x'+(mxy-mny).toFixed(2)+'mm');
    if(mxx-mnx>75||mxy-mny>90)out.issues.push('country oversize '+(mxx-mnx).toFixed(0)+'x'+(mxy-mny).toFixed(0)); }
  if(tris>400000)out.issues.push('heavy '+Math.round(tris));
  try{showSize(P)}catch(e){out.issues.push('showSize: '+e.message)}
  out.warn=$('warn').textContent.startsWith('⚠')?$('warn').textContent.slice(0,120):'';
  if(tool=='stand'||tool=='key'){const mc=meshCheck(P);out.open=mc.open;out.deg=mc.deg}
 }catch(e){out.issues.push('EXC '+e.message)}
 out.ms=Math.round(performance.now()-t0);if(out.ms>8000)out.issues.push('slow '+out.ms+'ms');return out}"""
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]); ctx=br.new_context(viewport={"width":1280,"height":900}); ctx.add_init_script(stub)
    ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}"); ctx.add_init_script('setInterval(()=>{var t=document.getElementById("tourbg");t&&t.remove()},50)')
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("/*d3*/")); ctx.route("**/qrcode*", r("/*q*/"))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    pg.evaluate('window.__FAR='+('true' if __import__('os').environ.get('FAR') else 'false'))
    names=pg.evaluate("Object.keys(countries)"); res=[]; t=time.time()
    for tool in TOOLS:
        for i,n in enumerate(names):
            try: res.append(pg.evaluate(JS,[n,tool]))
            except Exception as e: res.append({"name":n,"tool":tool,"issues":["PW "+str(e)[:100]]})
        print(tool,"done",round(time.time()-t),"s",flush=True)
    json.dump(res,open("../out/countries_%s%s.json"%("_".join(TOOLS),"_far" if os.environ.get("FAR") else ""),"w"),ensure_ascii=False)
    bad=[x for x in res if x["issues"]]; print("total",len(res),"with issues",len(bad)); 
    for x in bad[:60]: print(x["tool"],x["name"],x["issues"])
    print("pageerrors",errs[:5]); br.close()
