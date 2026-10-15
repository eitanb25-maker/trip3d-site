import os
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); B="http://localhost:8099"
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"])
    for name,vw in [("d",(1280,900)),("m",(390,844))]:
        ctx=br.new_context(viewport={"width":vw[0],"height":vw[1]},locale="he-IL",has_touch=(name=="m"),is_mobile=(name=="m")); ctx.add_init_script(stub); ctx.add_init_script('setInterval(()=>{var t=document.getElementById("tourbg");t&&t.remove()},50)')
        ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}")
        ctx.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200,content_type="text/css",body=""))
        pg=ctx.new_page(); errs=[]
        pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m:errs.append(m.text) if m.type=="error" and "Failed to load" not in m.text and "net::" not in m.text else None)
        pg.goto(B+"/?nomaint=1"); pg.wait_for_timeout(1200)
        pg.evaluate("openTool(false,'stand')"); pg.wait_for_timeout(500)
        pg.evaluate("document.getElementById('intro').style.display='none'"); pg.wait_for_timeout(600); pg.evaluate("document.querySelectorAll('#tourbg,#tourbox,.tour').forEach(e=>e.remove())")
        r=pg.evaluate("""()=>{const o={};o.tabs=document.querySelectorAll('.uxtabs button').length;o.panels=[...document.querySelectorAll('.uxp')].map(p=>p.children.length);
          const where=id=>{const e=document.getElementById(id);const p=e&&e.closest('.uxp');return p?p.dataset.t:null};
          o.w={};['cin','rimg','q','pl','wimg','trip','shape','c_base','fm','dl','msg','impf','wf','qron'].forEach(i=>o.w[i]=where(i));
          o.tips=document.querySelectorAll('.uxi').length;o.sum=!!document.getElementById('uxsum');return o}""")
        print(name,r)
        for t in [2,3,4,1]:
            pg.click(f".uxtabs button[data-t='{t}']"); pg.wait_for_timeout(150)
            vis=pg.evaluate("[...document.querySelectorAll('.uxp')].filter(p=>!p.hidden).map(p=>p.dataset.t)")
            assert vis==[str(t)],vis
        pg.click(".uxtabs button[data-t='1']")
        pg.hover(".uxi"); pg.wait_for_timeout(200); print("tip:",pg.evaluate("document.getElementById('uxtip').innerText.slice(0,40)+'|'+getComputedStyle(document.getElementById('uxtip')).display"))
        pg.screenshot(path=f"ux49_{name}_1.png")
        pg.click(".uxtabs button[data-t='4']"); pg.screenshot(path=f"ux49_{name}_4.png")
        # EN
        pg.evaluate("document.getElementById('lg').click()"); pg.wait_for_timeout(600)
        print("EN tabs:",pg.evaluate("[...document.querySelectorAll('.uxtabs button')].map(b=>b.innerText)"), pg.evaluate("document.querySelector('.uxp[data-t=\"1\"] label').innerText"))
        # search spinner
        pg.evaluate("uxShowTab(2)"); pg.fill("#q","Rome"); pg.click("#sb"); pg.wait_for_timeout(100)
        print("spin:",pg.evaluate("document.getElementById('sb').className+'|'+!!document.querySelector('.uxload')"))
        pg.wait_for_timeout(1500); print("after:",pg.evaluate("document.getElementById('sb').className+'|'+!!document.querySelector('.uxload')"))
        # share + autosave still ok
        print("hscroll:",pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        print("errs",errs[:5]); ctx.close()
    br.close()
