# source/ הוא ארכיון היסטורי, לא מקור האמת

`public/index.html` הוא הקובץ שנערך ישירות מאז גרסה 47 לפחות (גרסאות 48 עד 61 נכתבו בו ובמודולים `public/*.js`).
התבנית `trip3d_template.html` והסקריפט `make_standalone.py` **ישנים ולא כוללים** את התכונות האחרונות (למשל `pegApi`, `ONLYOTHER`, `mechApi`, מודול undo).
**אין לבנות מחדש את `index.html` מהתבנית**: זה ימחק תכונות. עורכים את `public/index.html` ואת המודולים ישירות, ובודקים עם `python3 tests/run.py`.
