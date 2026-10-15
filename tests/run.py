#!/usr/bin/env python3
"""הרצת כל בדיקות האתר: בדיקות סטטיות, התראות השרת, וחבילות הדפדפן (Playwright) מול שרת מקומי.
הרצה:  python3 tests/run.py [שם_חבילה ...]     (בלי שמות: הכול)
דרישות: node, pip install playwright && playwright install chromium, npm i --no-save three@0.128.0 (או THREE_JS=נתיב ל-three.min.js).
חבילה נכשלת אם הסקריפט קרס, אם נמצא Traceback, או אם הודפסה רשימת שגיאות שאינה ריקה (errs [...]).
שגיאות רשת חיצוניות (ERR_TUNNEL / ERR_NAME / ERR_INTERNET / 404 של משאבים חיצוניים) אינן נחשבות כשל. הפלט המלא נשמר ב-tests/out/."""
import glob, json, os, re, subprocess, sys, time, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
T = os.path.join(ROOT, "tests")
OUT = os.path.join(T, "out"); os.makedirs(OUT, exist_ok=True)
EXTERNAL = re.compile(r"ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET|ERR_CONNECTION|ERR_PROXY|net::ERR_ABORTED")
fails = []

def step(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ((" – " + detail) if detail and not ok else ""))
    if not ok: fails.append(name)

def static():
    bad = []
    for f in glob.glob(ROOT + "/public/*.js") + glob.glob(ROOT + "/netlify/**/*.mjs", recursive=True) + glob.glob(ROOT + "/netlify/plugins/*/index.js"):
        r = subprocess.run(["node", "--check", f], capture_output=True, text=True)
        if r.returncode: bad.append(os.path.relpath(f, ROOT) + ": " + r.stderr.strip().splitlines()[-1][:120])
    step("node --check (כל קבצי ה-JS)", not bad, "; ".join(bad))
    bad = []
    for f in glob.glob(ROOT + "/public/*.json"):
        try: json.load(open(f, encoding="utf8"))
        except Exception as e: bad.append(os.path.basename(f) + ": " + str(e)[:80])
    step("JSON תקין (public/*.json)", not bad, "; ".join(bad))
    m = json.load(open(ROOT + "/public/maintenance.json"))
    if m.get("on") or m.get("warn"): print("NOTE maintenance.json דלוק (תקין בדחיפות ביניים; ב-commit האחרון חייב להיות on=false): " + json.dumps(m, ensure_ascii=False))

def notify():
    r = subprocess.run(["node", os.path.join(T, "notify.mjs")], capture_output=True, text=True, cwd=T)
    step("התראות שגיאה (נשלחות, מסוננות כפילויות, ניתנות לכיבוי)", r.returncode == 0 and "2 [" in r.stdout and "after off 2" in r.stdout, (r.stdout + r.stderr)[-300:])

def suites(only):
    srv = subprocess.Popen(["node", os.path.join(T, "serve.mjs")], cwd=T, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(40):
            try: urllib.request.urlopen("http://localhost:8099/", timeout=1); break
            except Exception: time.sleep(0.25)
        for f in sorted(glob.glob(T + "/suites/*.py")):
            n = os.path.basename(f)[:-3]
            if only and n not in only: continue
            try: r = subprocess.run([sys.executable, f], capture_output=True, text=True, cwd=T + "/suites", timeout=240)
            except subprocess.TimeoutExpired: step("דפדפן: " + n, False, "חריגת זמן"); continue
            out = r.stdout + "\n" + r.stderr
            open(os.path.join(OUT, n + ".log"), "w", encoding="utf8").write(out)
            bad = []
            if r.returncode: bad.append("קריסה (קוד %d)" % r.returncode)
            if "Traceback" in out: bad.append("Traceback")
            for m in re.finditer(r"errs\s*(\[.*\])", out):
                items = [x for x in re.findall(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"", m.group(1)) if any(x)]
                real = [a or b for a, b in items if not EXTERNAL.search(a or b)]
                if real: bad.append("שגיאות: " + "; ".join(real)[:200])
            step("דפדפן: " + n, not bad, " | ".join(bad))
    finally:
        srv.terminate()

if __name__ == "__main__":
    only = sys.argv[1:]
    if not only: static(); notify()
    suites(only)
    print("\n%d נכשלו" % len(fails) if fails else "\nהכול עבר")
    sys.exit(1 if fails else 0)
