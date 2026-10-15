# בדיקות האתר

הרצה מקומית (מהשורש):

    npm install --no-save three@0.128.0
    pip install playwright && playwright install chromium
    python3 tests/run.py            # הכול
    python3 tests/run.py sv1 as5    # חבילות מסוימות

מה נבדק: תחביר כל קבצי ה-JS, תקינות ה-JSON, התראות השגיאה של השרת (`notify.mjs`), ו-19 חבילות דפדפן (`suites/`):
ייצוא ו-3MF, שמירה וטעינה, XSS, פינים והרכבה וגלויה (`as5`, `sp9`), בטל/בצע שוב ומובייל (`mu1`), שאלון (`wz1`) ועוד.
החבילות האיטיות (מפת אור `lt1`, מכניקה `mc1`, וכל הכלים x 5 מדינות `full1`) נמצאות ב-`slow/` ורצות עם `python3 tests/run.py --slow` (כמה דקות). אפשר להוסיף קובץ `.py` ל-`suites/`; הוא ייכשל אם הדפיס `errs [...]` לא ריק או קרס.
