import os
import json
exec(open("pr1.py").read().split("    pg.goto")[0].replace("with sync_playwright() as p:","p=sync_playwright().start()\nif 1:") )
pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1200)
pg.evaluate("localStorage.setItem('trip3d_q','high')")
pg.evaluate("openTool(false,'stand');$('intro').style.display='none';$('cin').value='Italy';$('cin').onchange()"); pg.wait_for_timeout(1000)
pg.evaluate("$('c_base').value='#2f5d8a';$('c_land').value='#d9a441';$('ncol').value='5';syncPickers();addPin(12.5,41.9,'Rome');addPin(9.2,45.4,'Milan')"); pg.wait_for_timeout(800)
print("ui",pg.evaluate("[!!$('mechbox'),!!window.mechApi]"),errs[:3])
def info(tag):
    r=pg.evaluate("""()=>{const P=build();const m=meshCheck(P);return {parts:P.filter(p=>p.geoms.length).map(p=>p.name).join(),open:m.open,deg:m.deg,tris:m.tris,sc:scaleFor(P).sc.toFixed(2)}}""")
    print(tag,json.dumps(r))
def shot(n,rx=0.5,ry=0.4):
    pg.evaluate("([a,b])=>{auto=false;pivot.rotation.x=a;pivot.rotation.y=b}",[rx,ry]); pg.wait_for_timeout(600); pg.locator("#view").screenshot(path=n)
pg.evaluate("uxShowTab(3)");info("flat")
for t in [30,45]:
    pg.select_option("#mtilt",str(t)); pg.wait_for_timeout(900); info("tilt%d"%t)
    pg.evaluate("auto=false;pivot.rotation.x=0.15;pivot.rotation.y=1.2"); pg.wait_for_timeout(600); pg.locator("#view").screenshot(path="mc_tilt%d_side.png"%t)
shot("mc_tilt45.png",0.5,0.4)
pg.select_option("#mtilt","0")
for ty in ["plane","glider","cloud"]:
    pg.check("#marm"); pg.select_option("#mtype",ty); pg.wait_for_timeout(900); info("arm "+ty); shot("mc_arm_%s.png"%ty,0.35,0.5)
pg.select_option("#mtilt","30"); pg.wait_for_timeout(900); info("arm+tilt30"); shot("mc_arm_tilt.png",0.4,0.6)
for sh in ["square","hex","oval","oct","round"]:
    pg.evaluate("s=>{$('shape').value=s;update()}",sh); pg.wait_for_timeout(500); info(sh)
print("proj",pg.evaluate("JSON.stringify(getProj(false).mech)"))
print("errs",errs[:5])
