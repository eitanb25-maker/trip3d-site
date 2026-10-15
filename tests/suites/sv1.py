import os
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
JS="""async (tool)=>{openTool(false,tool);$('intro').style.display='none';$('cin').value='Italy';$('cin').onchange();
 const ids=SV.filter(i=>$(i)),mut=(e,k)=>{if(e.type=='checkbox')e.checked=k?true:false;else if(e.tagName=='SELECT')e.selectedIndex=k?e.options.length-1:0;else if(e.type=='color')e.value=k?'#123456':'#abcdef';else if(e.type=='range'){e.value=k?e.max:e.min}else if(e.type=='date')e.value=k?'2026-01-02':'2025-03-04';else if(e.type=='file')return;else e.value=k?'xyz'+e.id:'abc'};
 ids.forEach(i=>mut($(i),1));pins=[{lon:12,lat:42,name:'Roma',fav:true},{lon:11,lat:43,name:'Firenze'}];water={lakes:[[[10,44],[10.5,44],[10.5,44.5]]],rivers:[[[9,45],[9.5,45.2]]]};
 const snap={};ids.forEach(i=>snap[i]=$(i).type=='checkbox'?$(i).checked:$(i).value);
 const j=JSON.stringify(getProj(false));
 ids.forEach(i=>mut($(i),0));pins=[];water={lakes:[],rivers:[]};
 putProj(JSON.parse(j));const bad=[];ids.forEach(i=>{const v=$(i).type=='checkbox'?$(i).checked:$(i).value;if(v!==snap[i])bad.push(i+': '+snap[i]+' -> '+v)});
 return{n:ids.length,bad,pins:pins.length,fav:pins[0]&&pins[0].fav,lakes:water.lakes.length,rivers:water.rivers.length,tool:TOOL,len:j.length}}"""
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); ctx=br.new_context(); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}")
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(""))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    for t in ["stand","magnet","key","orn","puzzle","holder"]:
        o=pg.evaluate(JS,t); print(t,o["n"],"controls; mismatches:",o["bad"],"pins",o["pins"],o["fav"],"water",o["lakes"],o["rivers"],"tool",o["tool"],"bytes",o["len"])
    # autosave + resume
    print(pg.evaluate("(async()=>{autosave();const raw=localStorage.getItem('trip3d_p');return raw?raw.length:0})()"),errs[:3]); br.close()
