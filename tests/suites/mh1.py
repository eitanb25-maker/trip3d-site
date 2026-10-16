# מובייל: כרטיס התצוגה הנדבק (#uxstk) לא מוצג מעל מסך הבית; תחתית מסך הבית ניתנת ללחיצה (קישורים וצ'קבוקסים לא קטנים מדי)
import os
from playwright.sync_api import sync_playwright
stub=open("stub.js").read(); B="http://localhost:8099"
bad=[]
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"])
    ctx=br.new_context(viewport={"width":360,"height":740},locale="he-IL",has_touch=True,is_mobile=True); ctx.add_init_script(stub)
    ctx.add_init_script("try{localStorage.setItem('trip3d_ck','1')}catch(e){}"); ctx.add_init_script('setInterval(()=>{document.querySelectorAll("#tourbg,#tourbox,.tour").forEach(e=>e.remove())},50)')
    ctx.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200,content_type="text/css",body=""))
    pg=ctx.new_page(); pg.goto(B+"/?nomaint=1"); pg.wait_for_timeout(1500)
    # בכל נקודה במסך הבית, האלמנט העליון חייב להיות חלק מ-#home או מכפתורים צפים – לא כרטיס התצוגה
    r=pg.evaluate("""()=>{const out=[];for(const y of [150,300,450,600,700]){const e=document.elementFromPoint(180,y);if(e&&e.closest('#uxstk'))out.push(y)}
      const small=[...document.querySelectorAll('#home a')].filter(a=>{const r=a.getBoundingClientRect();return a.offsetParent&&r.height>0&&r.height<24}).map(a=>a.textContent.trim().slice(0,20));return {over:out,small}}""")
    if r["over"]: bad.append("כרטיס התצוגה מוצג מעל מסך הבית בגבהים %s"%r["over"])
    if r["small"]: bad.append("קישורים קטנים מדי בלחיצה בנייד: %s"%r["small"])
    pg.evaluate("openTool(false,'stand');var i=document.getElementById('intro');i&&(i.style.display='none')"); pg.wait_for_timeout(1200)
    r=pg.evaluate("()=>{const e=document.getElementById('uxstk');return e&&getComputedStyle(e).display!='none'&&e.getBoundingClientRect().width>0}")
    if not r: bad.append("כרטיס התצוגה הנדבק לא מוצג בתוך הכלי")
    # כל ארבע הלשוניות של הכלי נכנסות במסך הצר (באג ישן: width:100% הכלליים הרחיב כל לשונית ל-324px)
    r=pg.evaluate("[...document.querySelectorAll('.uxtabs button')].map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right)]})")
    if len(r)!=4 or any(a<-1 or b>361 for a,b in r): bad.append("לשוניות הכלי יוצאות מהמסך בנייד: %s"%r)
    br.close()
assert not bad, "; ".join(bad)
print("OK")
