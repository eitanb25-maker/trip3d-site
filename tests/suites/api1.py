# גוף בקשה לא תקין (null / מערך / מספר / מחרוזת / JSON שבור) לא יפיל נתיב ב-500
import urllib.request, urllib.error, re
src = open("../../netlify/functions/api.mjs", encoding="utf8").read()
routes = sorted(set(re.findall(r'R === "POST ([a-zA-Z0-9/_-]+)"', src)) | {"gallery/seen", "gallery/like", "gallery/comment", "gallery/follow", "gallery/submit"})
skip = re.compile(r"auth/(logout-all|delete)|admin/")
errs = []; n = 0
for r in routes:
    if skip.search(r): continue
    for b in [b"null", b"[]", b"5", b'"s"', b"{bad", b"{}"]:
        n += 1
        q = urllib.request.Request("http://localhost:8099/api/" + r, data=b, method="POST", headers={"content-type": "application/json"})
        try: c = urllib.request.urlopen(q, timeout=15).status
        except urllib.error.HTTPError as e: c = e.code
        except Exception as e: c = 0; errs.append("EXC %s %s" % (r, str(e)[:60]))
        if c >= 500 and c != 503: errs.append("%d POST /%s body=%s" % (c, r, b.decode()))
print("routes", len(routes), "requests", n)
print("errs", errs)
