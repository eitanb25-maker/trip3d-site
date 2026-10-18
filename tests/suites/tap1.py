# אזורי לחיצה: תיבות סימון, כפתורי ⓘ וקישורי מסך הבית לפחות 24 פיקסלים (WCAG 2.5.8), בדסקטופ ובמובייל
import os
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
errs=[]; bad=[]
JS="""()=>{const o=[];document.querySelectorAll('input[type=checkbox],input[type=radio],.uxi,#home a').forEach(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(r.width==0||r.height==0||cs.visibility=='hidden')return;if(r.width<23.5||r.height<23.5)o.push((e.id||e.className||e.textContent.trim().slice(0,14))+' '+r.width.toFixed(1)+'x'+r.height.toFixed(1))});return o}"""
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"])
    for name,vp in (("desktop",{"width":1280,"height":800}),("mobile",{"width":390,"height":780})):
        ctx=br.new_context(viewport=vp,is_mobile=(name=="mobile"),has_touch=(name=="mobile")); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1');localStorage.setItem('trip3d_tour','1')}catch(e){}")
        def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
        ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(""))
        ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
        pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
        bad+= [name+" home "+x for x in pg.evaluate(JS)]
        pg.evaluate("openTool(false,'stand');$('intro').style.display='none';$('cin').value='Italy';$('cin').onchange()"); pg.wait_for_timeout(800)
        for t in (1,2,3,4):
            pg.evaluate("uxShowTab(%d);document.querySelectorAll('details.uxacc').forEach(d=>d.open=true)"%t); pg.wait_for_timeout(250)
            bad+= [name+" tab%d "%t+x for x in pg.evaluate(JS)]
        ctx.close()
print("small",bad[:10]); print("errs",errs); print("bad",bad[:10])
import sys
sys.exit(1 if bad or errs else 0)
