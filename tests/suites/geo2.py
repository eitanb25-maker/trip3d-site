# חיפוש מקומות: מדינה שנבחרה היא רק העדפה (חיפוש חוזר בלי המדינה), אזהרה כשהמקום מחוץ למדינה, ודוח ברור בשאלון ההתחלה
import json
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
errs=[]; out={}; reqs=[]
USJ=[{"name":"Universal Studios Japan","display_name":"Universal Studios Japan, Osaka, Japan","lat":"34.6654","lon":"135.4323"}]
def nominatim(route):
    from urllib.parse import urlparse, parse_qs
    q=parse_qs(urlparse(route.request.url).query).get("q",[""])[0]; reqs.append(q)
    body=USJ if ("Universal" in q and "Israel" not in q and "ישראל" not in q) else ([{"name":"Tel Aviv","display_name":"Tel Aviv, Israel","lat":"32.0853","lon":"34.7818"}] if "Tel Aviv" in q else [])
    route.fulfill(status=200,content_type="application/json",headers={"access-control-allow-origin":"*"},body=json.dumps(body))
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); ctx=br.new_context(viewport={"width":1100,"height":900}); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1');localStorage.setItem('trip3d_tour','1')}catch(e){}")
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(""))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    ctx.route("https://nominatim.openstreetmap.org/**", nominatim)
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    pg.evaluate("openTool(false,'stand');$('intro').style.display='none';$('cin').value='Israel';$('cin').onchange()"); pg.wait_for_timeout(800)
    pg.evaluate('uxShowTab(2)'); pg.wait_for_timeout(300); pg.fill("#q","Universal Studios"); pg.click("#sb"); pg.wait_for_timeout(3500)
    out["cands"]=pg.evaluate("[...document.querySelectorAll('#cands button')].map(b=>b.textContent)")
    out["reqs"]=list(reqs)
    pg.click("#cands button"); pg.wait_for_timeout(300)
    out["msg_click"]=pg.evaluate("$('msg').textContent"); out["pins"]=pg.evaluate("pins.length")
    # שאלון: מקום מחוץ למדינה + מקום שלא קיים + מקום תקין
    pg.evaluate("pins=[];renderPins();W.fav='';findAll(['Universal Studios','Tel Aviv','xyzzy nowhere'])"); pg.wait_for_timeout(9000)
    out["findall"]=pg.evaluate("$('msg').textContent"); out["pins2"]=pg.evaluate("pins.map(p=>p.name)")
for k,v in out.items(): print(k,str(v)[:400])
bad=[]
if not out["cands"] or "מחוץ למדינה" not in out["cands"][0]: bad.append("no outside flag")
if len(out["reqs"])<2 or any(("Israel" in q or "ישראל" in q) for q in out["reqs"][1:2]): bad.append("no fallback without country "+str(out["reqs"]))
if "לא יוצג על המפה" not in out["msg_click"]: bad.append("no click warning")
if out["pins2"]!=["Tel Aviv"]: bad.append("findAll pins "+str(out["pins2"]))
if "Universal Studios" not in out["findall"] or "מחוץ למדינה" not in out["findall"] or "xyzzy nowhere" not in out["findall"]: bad.append("findAll report")
print("errs",errs); print("bad",bad)
