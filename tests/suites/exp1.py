import os
import base64, io, zipfile, struct, re, json
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read(); qrl=open("lib/qrcode.js").read()
JS="""async ([tool,n,multi,name])=>{openTool(multi,tool);$('intro').style.display='none';$('ncol').value=String(n);$('far').checked=false;
 if(multi){const nm=['Italy','France','Spain'];setCountry(nm.flatMap(k=>countries[k]),false,nm.map(k=>countries[k]));multiNames=nm}else{$('cin').value=name;$('cin').onchange()}
 pins=[{lon:PR.cx,lat:PR.cy,name:'A'},{lon:PR.cx+.5,lat:PR.cy+.5,name:'B',fav:true}];$('qron').checked=(tool=='stand');$('qrurl').value='https://example.com/a';$('fm').value=tool=='stand'?'h3':'none';
 await new Promise(r=>{update();setTimeout(r,400)});
 const E=await prepareFiles();const b64=a=>{let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s)};
 return{files:E.files.map(f=>({name:f.name,desc:f.desc,data:b64(f.data)})),chk:E.chk,z:E.z,n:E.n}}"""
def stl_tris(b):
    if b[:5]==b'solid' and b'facet' in b[:400]: return ("ascii",b.count(b"facet normal"))
    n=struct.unpack("<I",b[80:84])[0]; return ("bin",n) if 84+50*n==len(b) else ("BADLEN",n)
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); ctx=br.new_context(); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}")
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(qrl))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    bad=0; tot=0
    for tool,multi in [("stand",False),("magnet",False),("key",False),("orn",False),("puzzle",False),("holder",False),("stand",True)]:
        for n in (1,2,3,4,5):
            tot+=1
            try: o=pg.evaluate(JS,[tool,n,multi,"Italy"])
            except Exception as e: print(tool,n,multi,"EXC",str(e)[:120]); bad+=1; continue
            issues=[]; names=[f["name"] for f in o["files"]]
            all_t=None; per=[]
            for f in o["files"]:
                b=base64.b64decode(f["data"])
                if f["name"].endswith(".stl"):
                    k,t=stl_tris(b)
                    if k=="BADLEN" or t==0: issues.append(f"{f['name']} {k} {t}")
                    if f["name"]=="all_in_one.stl": all_t=t
                    else: per.append(t)
                elif f["name"].endswith(".3mf"):
                    try:
                        z=zipfile.ZipFile(io.BytesIO(b)); assert z.testzip() is None
                        m=ET.fromstring(z.read("3D/3dmodel.model")); ns={"m":m.tag.split("}")[0][1:]}
                        objs=m.findall(".//m:object",ns); tr=0
                        for ob in objs:
                            nv=len(ob.findall(".//m:vertex",ns)); ts=ob.findall(".//m:triangle",ns); tr+=len(ts)
                            for t in ts:
                                for a in ("v1","v2","v3"):
                                    if int(t.get(a))>=nv or int(t.get(a))<0: raise Exception("bad index")
                        if all_t is not None and (tr>all_t or tr<all_t*0.98): issues.append(f"3mf tris {tr} != all {all_t}")
                        items=m.findall(".//m:item",ns)
                        if len(items)!=len(objs): issues.append("items!=objs")
                        if "[Content_Types].xml" not in z.namelist(): issues.append("no content types")
                    except Exception as e: issues.append("3mf "+str(e)[:60])
            if per and all_t and sum(per)!=all_t: issues.append(f"sum color files {sum(per)} != all {all_t}")
            expect=1 if n==1 else None
            if n==1 and any(x.startswith("color") for x in names): issues.append("color files at n=1")
            if n>1 and not any(x.startswith("color") for x in names) and tool!="holder": issues.append("no color files")
            if issues: bad+=1; print(tool,"multi" if multi else "",n,issues,names[:6])
    print("combos",tot,"bad",bad,"errs",errs[:3]); br.close()
