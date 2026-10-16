# צ'אט העוזר בדפדפן אמיתי: תשובה ישירה, "עוד", שאלת המשך, כמה שאלות, ביטחון נמוך עם חלופות
import os
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); mini=open("minithree.js").read(); dm=open("lib/dm.js").read(); topo=open("lib/topo.js").read()
errs=[]; out={}
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); ctx=br.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True); ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}")
    def r(b): return lambda route: route.fulfill(status=200,content_type="application/javascript",body=b)
    ctx.route("**/three.js/**", r(mini)); ctx.route("**/datamaps*", r(dm)); ctx.route("**/topojson*", r(topo)); ctx.route("**/d3/**", r("")); ctx.route("**/qrcode*", r(""))
    ctx.route("**/fonts.g*/**", lambda route: route.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8099/?nomaint=1"); pg.wait_for_timeout(1500)
    pg.click("#aib"); pg.wait_for_timeout(800)
    def ask(q):
        n=pg.evaluate("document.querySelectorAll('#aim .ab-b').length")
        pg.fill("#aii",q); pg.keyboard.press("Enter"); pg.wait_for_timeout(700)
        return pg.evaluate("[...document.querySelectorAll('#aim .ab-b')].slice(%d).map(e=>e.textContent)"%n)
    out["direct"]=ask("איך מורידים?")
    out["more"]=ask("עוד")
    out["multi"]=ask("איך מורידים את הקובץ? ואיך מקבלים עוד הורדות?")
    out["low"]=ask("מה הטמפרטורה הנכונה לחומר")
    out["alts"]=pg.evaluate("[...document.querySelectorAll('#aim button')].map(b=>b.textContent).slice(-6)")
    out["off"]=ask("מה מזג האוויר מחר בתל אביב")
    out["overflow"]=pg.evaluate("document.documentElement.scrollWidth>innerWidth")
    pg.screenshot(path="bot2.png")
for k,v in out.items(): print(k, str(v)[:240])
print("errs",errs)
