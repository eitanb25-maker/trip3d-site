/* spin.js (v56): ייצוא אנימציית סיבוב 360° (GIF / וידאו) לשיתוף ברשתות חברתיות
   GIF: מצלמים N פריימים במרווחי זווית שווים, מקבעים פלטה אחת ל-256 צבעים (median cut) ומקודדים LZW. הכול בדפדפן, בלי שרת.
   וידאו: מקליטים בזמן אמת עם MediaRecorder (WebM, או MP4 בספארי). הרקע מצויר כמו ברקע הדף, ואפשר להוסיף כותרת.
   מבנה הנתונים: S = {fmt, size, secs, title, busy, cancel}; frames = ImageData[]; פלטה = Uint8Array(768) ו-LUT של 32768 תאים (5 ביט לערוץ).
   המודול לא משנה את הקוד הראשי: משתמש ב-R / sc / cam / pivot / auto הגלובליים רק לקריאה, ומשחזר את הסיבוב בסיום. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var isEn = function () { try { return LANG == "en"; } catch (e) { return false; } };
  var Lx = function (he, en) { return isEn() ? en : he; };
  var span = function (he, en) { return '<span data-he="' + he + '" data-en="' + en + '">' + he + "</span>"; };
  var S = { fmt: "gif", size: 480, secs: 6, title: true, busy: false, cancel: false, url: null, file: null };
  var tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };
  var raf = function () { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); };
  var status = function (t) { var e = $("spinst"); if (e) e.textContent = t; };

  /* ============ צילום פריים ============ */
  function drawFrame(ctx, size) {
    var b = (typeof BGS != "undefined" && BGS[$("bg").value]) || ["#46557a", "#11141f"], cx = size / 2, cy = size * 0.38, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.796);
    g.addColorStop(0, b[0]); g.addColorStop(0.78, b[1]); g.addColorStop(1, b[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    var w = vc.width, h = vc.height, s = Math.min(w, h);
    ctx.drawImage(vc, (w - s) / 2, (h - s) / 2, s, s, 0, 0, size, size);
    if (S.title) {
      var t = ($("trip").value || "").trim(); if (t) {
        ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.font = "bold " + Math.round(size * 0.06) + "px " + (typeof FF == "function" ? FF() : "sans-serif");
        ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = size * 0.02; ctx.fillStyle = "#fff"; ctx.fillText(t, cx, size * 0.95); ctx.restore();
      }
    }
  }
  function setup() {   // עוצר סיבוב אוטומטי ומחזיר מצב קודם בסיום
    var st = { auto: auto, y: pivot.rotation.y };
    auto = false;
    return function () { pivot.rotation.y = st.y; auto = st.auto; };
  }

  /* ============ מקודד GIF ============ */
  /* פלטה מ-median cut על היסטוגרמה של 5 ביט לערוץ. מחזיר {pal: Uint8Array(768), lut: Uint8Array(32768)} */
  function palette(frames) {
    var hist = new Uint32Array(32768), f, i;
    frames.forEach(function (fr) { var d = fr.data; for (i = 0; i < d.length; i += 28) hist[(d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3)]++; });   // דגימה כל 7 פיקסלים
    var bins = []; for (i = 0; i < 32768; i++) if (hist[i]) bins.push(i);
    var box = function (list) {
      var mn = [31, 31, 31], mx = [0, 0, 0], pop = 0;
      list.forEach(function (b) { var c = [b >> 10, (b >> 5) & 31, b & 31]; for (var k = 0; k < 3; k++) { if (c[k] < mn[k]) mn[k] = c[k]; if (c[k] > mx[k]) mx[k] = c[k]; } pop += hist[b]; });
      return { list: list, rng: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], pop: pop };
    };
    var boxes = [box(bins)];
    while (boxes.length < 256) {
      var bi = -1, best = 0;
      boxes.forEach(function (b, k) { var r = Math.max(b.rng[0], b.rng[1], b.rng[2]); if (b.list.length > 1 && r > 0 && b.pop * (r + 1) > best) { best = b.pop * (r + 1); bi = k; } });
      if (bi < 0) break;
      var b = boxes[bi], ch = b.rng[0] >= b.rng[1] && b.rng[0] >= b.rng[2] ? 0 : b.rng[1] >= b.rng[2] ? 1 : 2, sh = [10, 5, 0][ch];
      b.list.sort(function (p, q) { return ((p >> sh) & 31) - ((q >> sh) & 31); });
      var half = b.pop / 2, acc = 0, cut = 0;
      for (cut = 0; cut < b.list.length - 1; cut++) { acc += hist[b.list[cut]]; if (acc >= half) break; }
      cut = Math.min(cut, b.list.length - 2);   // שני הצדדים חייבים להכיל צבע אחד לפחות
      boxes.splice(bi, 1, box(b.list.slice(0, cut + 1)), box(b.list.slice(cut + 1)));
    }
    var pal = new Uint8Array(768), lut = new Uint8Array(32768);
    boxes.forEach(function (b, k) {
      var r = 0, g = 0, bl = 0;
      b.list.forEach(function (bin) { var w = hist[bin]; r += (bin >> 10) * w; g += ((bin >> 5) & 31) * w; bl += (bin & 31) * w; lut[bin] = k; });
      pal[k * 3] = Math.round((r / b.pop) * 8 + 4); pal[k * 3 + 1] = Math.round((g / b.pop) * 8 + 4); pal[k * 3 + 2] = Math.round((bl / b.pop) * 8 + 4);
    });
    // פיקסלים שלא נדגמו: חיפוש הקרוב ביותר בפלטה פעם אחת לכל תא ריק שנתקלים בו (בזיכרון מטמון)
    return { pal: pal, lut: lut, n: boxes.length, hist: hist };
  }
  function nearest(P, r, g, b) {
    var best = 0, bd = 1e9;
    for (var k = 0; k < P.n; k++) { var dr = P.pal[k * 3] - r, dg = P.pal[k * 3 + 1] - g, db = P.pal[k * 3 + 2] - b, d = dr * dr + dg * dg + db * db; if (d < bd) { bd = d; best = k; } }
    return best;
  }
  function lzw(idx, minCode) {
    var out = [], clear = 1 << minCode, eoi = clear + 1, next = eoi + 1, size = minCode + 1, dict = new Map(), cur = 0, nbits = 0, buf = [];
    var emit = function (code) { cur |= code << nbits; nbits += size; while (nbits >= 8) { buf.push(cur & 255); cur >>= 8; nbits -= 8; } };
    emit(clear);
    var prefix = idx[0];
    for (var i = 1; i < idx.length; i++) {
      var c = idx[i], key = prefix * 256 + c, hit = dict.get(key);
      if (hit !== undefined) { prefix = hit; continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
      else { emit(clear); dict.clear(); next = eoi + 1; size = minCode + 1; }
      prefix = c;
    }
    emit(prefix); emit(eoi); if (nbits > 0) buf.push(cur & 255);
    for (var p = 0; p < buf.length; p += 255) { var n = Math.min(255, buf.length - p); out.push(n); for (var q = 0; q < n; q++) out.push(buf[p + q]); }
    out.push(0); return out;
  }
  function encodeGif(frames, size, delay, onp) {
    var P = palette(frames), out = [], w = function (v) { out.push(v & 255, (v >> 8) & 255); };
    "GIF89a".split("").forEach(function (c) { out.push(c.charCodeAt(0)); });
    w(size); w(size); out.push(0xF7, 0, 0);   // פלטה גלובלית של 256 צבעים
    for (var i = 0; i < 768; i++) out.push(P.pal[i] || 0);
    out.push(0x21, 0xFF, 11); "NETSCAPE2.0".split("").forEach(function (c) { out.push(c.charCodeAt(0)); }); out.push(3, 1, 0, 0, 0);   // לולאה אינסופית
    frames.forEach(function (fr, k) {
      var d = fr.data, idx = new Uint8Array(size * size);
      for (var p = 0, q = 0; p < d.length; p += 4, q++) {
        var bin = (d[p] >> 3) << 10 | (d[p + 1] >> 3) << 5 | (d[p + 2] >> 3);
        idx[q] = P.hist[bin] ? P.lut[bin] : nearest(P, d[p], d[p + 1], d[p + 2]);
        if (!P.hist[bin]) { P.hist[bin] = 1; P.lut[bin] = idx[q]; }
      }
      out.push(0x21, 0xF9, 4, 4, delay & 255, (delay >> 8) & 255, 0, 0);   // disposal 1, בלי שקיפות
      out.push(0x2C); w(0); w(0); w(size); w(size); out.push(0, 8);
      var z = lzw(idx, 8); for (var t = 0; t < z.length; t++) out.push(z[t]);
      if (onp) onp(k + 1, frames.length);
    });
    out.push(0x3B);
    return new Uint8Array(out);
  }

  /* ============ ייצוא ============ */
  function result(blob, name) {
    if (S.url) URL.revokeObjectURL(S.url);
    S.url = URL.createObjectURL(blob); S.file = new File([blob], name, { type: blob.type });
    var box = $("spinout"); if (!box) return;
    var vid = blob.type.indexOf("video") == 0;
    box.innerHTML = (vid ? '<video src="' + S.url + '" controls loop muted playsinline style="max-width:100%;border-radius:10px"></video>' : '<img src="' + S.url + '" alt="" style="max-width:100%;border-radius:10px">')
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><a id="spindl" href="' + S.url + '" download="' + name + '" class="btn" style="display:inline-block;padding:8px 14px;border-radius:10px;background:var(--ac,#2b6cb0);color:#fff;text-decoration:none">⬇️ ' + Lx("הורדה", "Download") + " (" + (blob.size / 1048576).toFixed(1) + " MB)</a>"
      + (navigator.canShare && navigator.canShare({ files: [S.file] }) ? '<button type="button" id="spinshare" style="margin:0">📤 ' + Lx("שיתוף", "Share") + "</button>" : "") + "</div>";
    var sb = $("spinshare"); if (sb) sb.onclick = function () { navigator.share({ files: [S.file], title: ($("trip").value || "Trip3D") }).catch(function () {}); };
  }
  async function exportGif() {
    var size = S.size, n = Math.max(12, Math.min(75, Math.round(S.secs * 12.5))), c = document.createElement("canvas"); c.width = c.height = size;
    var ctx = c.getContext("2d", { willReadFrequently: true }), restore = setup(), frames = [], y0 = pivot.rotation.y;
    try {
      for (var i = 0; i < n; i++) {
        if (S.cancel) throw new Error("cancel");
        pivot.rotation.y = y0 + 2 * Math.PI * i / n; R.render(sc, cam); drawFrame(ctx, size); frames.push(ctx.getImageData(0, 0, size, size));
        status(Lx("מצלם פריים ", "Capturing frame ") + (i + 1) + "/" + n); await tick();
      }
    } finally { restore(); }
    status(Lx("מקודד GIF…", "Encoding GIF…")); await tick();
    var bytes = encodeGif(frames, size, 8, function (k, t) { if (k % 6 == 0) status(Lx("מקודד ", "Encoding ") + k + "/" + t); });
    result(new Blob([bytes], { type: "image/gif" }), "trip3d-spin.gif");
    return { frames: n, bytes: bytes.length };
  }
  async function exportVideo() {
    if (typeof MediaRecorder == "undefined") throw new Error("nomr");
    var types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"], mime = types.filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0];
    if (!mime) throw new Error("nomr");
    var size = S.size, c = document.createElement("canvas"); c.width = c.height = size;
    var ctx = c.getContext("2d"), restore = setup(), y0 = pivot.rotation.y, chunks = [], rec = new MediaRecorder(c.captureStream(30), { mimeType: mime, videoBitsPerSecond: 4e6 });
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    var done = new Promise(function (r) { rec.onstop = r; });
    drawFrame(ctx, size); rec.start(200);
    var t0 = performance.now();
    try {
      for (;;) {
        var t = (performance.now() - t0) / 1000; if (t >= S.secs || S.cancel) break;
        pivot.rotation.y = y0 + 2 * Math.PI * t / S.secs; R.render(sc, cam); drawFrame(ctx, size);
        status(Lx("מקליט ", "Recording ") + t.toFixed(1) + "/" + S.secs + " s"); await raf();
      }
    } finally { restore(); rec.stop(); }
    await done;
    if (S.cancel) throw new Error("cancel");
    if (!chunks.length) throw new Error(Lx("הדפדפן לא החזיר וידאו. נסו GIF.", "The browser returned no video. Try GIF."));
    var ext = mime.indexOf("mp4") >= 0 ? "mp4" : "webm", blob = new Blob(chunks, { type: mime.split(";")[0] });
    result(blob, "trip3d-spin." + ext);
    return { mime: mime, bytes: blob.size };
  }
  async function run() {
    if (S.busy) return; S.busy = true; S.cancel = false;
    var go = $("spingo"), cn = $("spincancel"); if (go) go.disabled = true; if (cn) cn.style.display = "";
    var r = null;
    try { r = S.fmt == "gif" ? await exportGif() : await exportVideo(); status(Lx("מוכן.", "Done.")); }
    catch (e) { status(e.message == "cancel" ? Lx("בוטל.", "Cancelled.") : e.message == "nomr" ? Lx("הדפדפן לא תומך בהקלטת וידאו. נסו GIF.", "This browser can't record video. Try GIF.") : Lx("הייצוא נכשל: ", "Export failed: ") + e.message); }
    S.busy = false; if (go) go.disabled = false; if (cn) cn.style.display = "none";
    return r;
  }

  /* ============ ממשק (לשונית 4) ============ */
  function paint() {
    var b = $("spinbox"); if (!b) return;
    $("spinfmt").value = S.fmt; $("spinsz").value = String(S.size); $("spinsec").value = String(S.secs); $("spintitle").checked = S.title;
    b.querySelectorAll("[data-he]").forEach(function (e) { e.textContent = isEn() ? e.dataset.en : e.dataset.he; });
  }
  function buildUI() {
    var host = document.querySelector('.uxp[data-t="4"]'), prev = $("fabbox") || $("accbox") || $("uxsum"); if (!host || !prev || $("spinbox")) return;
    var d = document.createElement("div"); d.id = "spinbox"; d.className = "uxsum";
    d.innerHTML = "<b>" + span("🎬 סרטון או GIF מסתובב לרשתות חברתיות", "🎬 Spinning video or GIF for social media") + "</b>"
      + '<label for="spinfmt" style="margin-top:8px">' + span("פורמט", "Format") + '</label><select id="spinfmt"><option value="gif">GIF</option><option value="video">' + Lx("וידאו (WebM / MP4)", "Video (WebM / MP4)") + "</option></select>"
      + '<label for="spinsz">' + span("גודל", "Size") + '</label><select id="spinsz"><option value="360">360 px</option><option value="480">480 px</option><option value="720">720 px</option></select>'
      + '<label for="spinsec">' + span("משך סיבוב", "Rotation time") + '</label><select id="spinsec"><option value="4">4 s</option><option value="6">6 s</option><option value="8">8 s</option></select>'
      + '<label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" id="spintitle"> ' + span("הוספת שם הטיול", "Add the trip name") + "</label>"
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" id="spingo" style="margin:0">' + span("▶️ יצירה", "▶️ Create") + '</button><button type="button" id="spincancel" style="margin:0;display:none">' + span("ביטול", "Cancel") + "</button></div>"
      + '<div class="hint" id="spinst" role="status"></div><div id="spinout" style="margin-top:8px"></div>'
      + '<p class="hint">' + span("הסיבוב מצולם מהתצוגה התלת-ממדית שעל המסך, בצבעים ובתאורה שבחרתם. אפשר להוריד ולהעלות לאינסטגרם, טיקטוק או וואטסאפ. בווידאו יש להשאיר את הלשונית פתוחה עד הסיום.", "The spin is captured from the 3D view on screen with your colors and lighting. Download it and post it to Instagram, TikTok or WhatsApp. For video, keep this tab open until it finishes.") + "</p>";
    prev.parentNode.insertBefore(d, prev.nextSibling);
    $("spinfmt").onchange = function () { S.fmt = this.value; };
    $("spinsz").onchange = function () { S.size = +this.value; };
    $("spinsec").onchange = function () { S.secs = +this.value; };
    $("spintitle").onchange = function () { S.title = this.checked; };
    $("spingo").onclick = run; $("spincancel").onclick = function () { S.cancel = true; };
    paint();
  }
  function init() {
    if (typeof THREE == "undefined" || typeof R == "undefined" || typeof pivot == "undefined") return;
    try { buildUI(); } catch (e) { console.warn("spin", e); }
    try { new MutationObserver(function () { setTimeout(paint, 50); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] }); } catch (e) {}
    window.spinApi = { palette: palette, S: S, exportGif: exportGif, exportVideo: exportVideo, encodeGif: encodeGif, run: run };
  }
  if (document.readyState == "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
