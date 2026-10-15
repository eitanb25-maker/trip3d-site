import os
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
JS="""([name,far])=>{const o={n:name,i:[]};$('far').checked=far;$('gap').value='3';$('cin').value=name;$('cin').onchange();
 const P=build(),pl=P.find(p=>p.name=='2a_pillars'),pipAny=(x,y)=>PR.rings.some(r=>{let c=false;for(let p=0,q=r.length-1;p<r.length;q=p++){const u=r[p],v=r[q];if((u[1]>y)!=(v[1]>y)&&x<(v[0]-u[0])*(y-u[1])/(v[1]-u[1])+u[0])c=!c}return c});
 if(!pl||!pl.geoms.length){o.i.push('no pillars');return o}
 o.cnt=pl.geoms.length;let out=0;pl.geoms.forEach(g=>{g.computeBoundingBox();const b=g.boundingBox,x=(b.min.x+b.max.x)/2,y=(b.min.y+b.max.y)/2-14;if(!pipAny(x,y))out++});
 if(out)o.i.push(out+' pillars outside land');if(o.cnt<3)o.i.push('only '+o.cnt+' pillars');return o}"""
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); ctx=br.new_context(); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}")
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(""))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500); pg.evaluate("openTool(false,'stand');$('intro').style.display='none'")
    names=pg.evaluate("Object.keys(countries)"); bad=[]
    for far in (False,True):
        for n in names:
            o=pg.evaluate(JS,[n,far])
            if o["i"]: bad.append((n,far,o["i"],o.get("cnt")))
    print("bad",len(bad)); [print(b) for b in bad[:30]]; br.close()
