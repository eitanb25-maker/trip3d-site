#!/usr/bin/env python3
"""שולח לדיסקורד סיכום ריצת בדיקות (tests/out/summary.json) + צילומי מסך (tests/out/shots). דורש DISCORD_WEBHOOK_URL; בלי הסוד – מדלג בשקט.
שימוש: python3 tests/report.py [כותרת]   (ב-CI: משתני GITHUB_* משולבים בהודעה)"""
import glob, json, os, sys, uuid, urllib.request
T = os.path.dirname(os.path.abspath(__file__)); OUT = T + "/out"
url = os.environ.get("DISCORD_WEBHOOK_URL", "")
if not url.startswith("https://discord.com/api/webhooks/") and not url.startswith("https://discordapp.com/api/webhooks/"):
    print("אין DISCORD_WEBHOOK_URL תקין – מדלג"); sys.exit(0)
try: S = json.load(open(OUT + "/summary.json", encoding="utf8"))
except Exception: S = {"passed": 0, "total": 0, "results": []}
bad = [r for r in S["results"] if not r["ok"]]
e = os.environ; run = ""
if e.get("GITHUB_RUN_ID"): run = "\n🔗 " + e.get("GITHUB_SERVER_URL", "https://github.com") + "/" + e.get("GITHUB_REPOSITORY", "") + "/actions/runs/" + e["GITHUB_RUN_ID"]
head = ("✅ " if not bad else "❌ ") + (sys.argv[1] if len(sys.argv) > 1 else "בדיקות האתר") + f": עברו {S['passed']} מתוך {S['total']}"
if e.get("GITHUB_SHA"): head += f" (commit {e['GITHUB_SHA'][:7]})"
body = head + ("\n" + "\n".join(f"• {r['name']}" + (f" – {r['detail'][:150]}" if r["detail"] else "") for r in bad[:12]) if bad else "\nכל הבדיקות עברו ✔") + run
files = sorted(glob.glob(OUT + "/shots/*.png"))[:6]
b = uuid.uuid4().hex; parts = []
parts.append(f'--{b}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n'.encode() + json.dumps({"content": body[:1900]}, ensure_ascii=False).encode() + b"\r\n")
for i, f in enumerate(files):
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="files[{i}]"; filename="{os.path.basename(f)}"\r\nContent-Type: image/png\r\n\r\n'.encode() + open(f, "rb").read() + b"\r\n")
parts.append(f"--{b}--\r\n".encode())
try:
    r = urllib.request.urlopen(urllib.request.Request(url, data=b"".join(parts), headers={"Content-Type": "multipart/form-data; boundary=" + b, "User-Agent": "trip3d-tests"}), timeout=30)
    print("נשלח לדיסקורד", r.status, len(files), "תמונות")
except Exception as ex: print("שליחה לדיסקורד נכשלה:", str(ex)[:100])
