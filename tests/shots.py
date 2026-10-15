#!/usr/bin/env python3
"""צילומי מסך של המסכים המרכזיים (מחשב + נייד) מול השרת המקומי -> tests/out/shots/*.png. משמש את דוח הדיסקורד."""
import os, sys
from playwright.sync_api import sync_playwright
T = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(T, "out", "shots"); os.makedirs(OUT, exist_ok=True)
os.chdir(T + "/suites"); stub = open("stub.js").read(); B = "http://localhost:8099"
STEPS = [("home", None), ("stand", "openTool(false,'stand')"), ("wizard", "openTool(false,'stand');wr&&0")]
with sync_playwright() as p:
    br = p.chromium.launch(args=["--no-sandbox"])
    for tag, vw, mob in [("desktop", (1280, 800), False), ("mobile", (390, 844), True)]:
        ctx = br.new_context(viewport={"width": vw[0], "height": vw[1]}, locale="he-IL", has_touch=mob, is_mobile=mob)
        ctx.add_init_script(stub); ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}")
        ctx.add_init_script('setInterval(()=>{document.querySelectorAll("#tourbg,#tourbox,.tour").forEach(e=>e.remove())},50)')
        ctx.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
        pg = ctx.new_page()
        try:
            pg.goto(B + "/?nomaint=1"); pg.wait_for_timeout(1500)
            pg.screenshot(path=f"{OUT}/{tag}_1_home.png")
            pg.evaluate("openTool(false,'stand')"); pg.wait_for_timeout(600)
            pg.evaluate("var i=document.getElementById('intro');i&&(i.style.display='none')"); pg.wait_for_timeout(900)
            pg.screenshot(path=f"{OUT}/{tag}_2_tool.png")
        except Exception as e: print("shots", tag, "failed:", str(e)[:120], file=sys.stderr)
        ctx.close()
    br.close()
print(sorted(os.listdir(OUT)))
