// Classique OS - Trợ lý: khung chat cố định, đồ thị Lark Base, quả cầu, giọng nói (Chỉ chữ / Chữ + giọng / Rảnh tay).
(() => {
  const PHIEN = "mac-dinh";
  let GIONG = { che_do: "chu_giong", ngat_loi: true, ngon_ngu_nghe: "vi-VN" };

  // ---------- quả cầu (lớn ở trang Trợ lý, nhỏ ở khung chat) ----------
  function cau(tt, chu, phu) {
    window.LoiAI?.trangThai({ nghe: "nghe", nghi: "nghi", noi: "noi", loi: "loi" }[tt] || "cho");
    SONG.tt = tt || "";
    const c = chu || (GIONG.che_do === "ranh_tay" ? "RẢNH TAY · ĐANG CHỜ" : "SẴN SÀNG");
    $("#orb-st").textContent = c; const a = $("#ai-st"); if (a) a.textContent = c;
    $("#orb-sub").textContent = phu ?? (GIONG.che_do === "ranh_tay" ? "Cứ nói, nói xong em tự gửi" : "Giữ phím Cách để nói");
  }
  // sóng âm thanh dưới lõi: theo giọng đọc thật khi đang nói, sóng giả lập khi đang nghe/nghĩ
  const SONG = { tt: "", phan_tich: null, du_lieu: null };
  let songTruoc = 0;
  (function veSong(ms) {
    requestAnimationFrame(veSong);
    if (document.hidden || ms - songTruoc < 40) return; songTruoc = ms;
    const cv = $("#song"); if (!cv || !cv.offsetParent) return;
    const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1, ctx = cv.getContext("2d");
    if (cv.width !== (r.width * d | 0)) { cv.width = r.width * d; cv.height = r.height * d; }
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
    const n = 64, w = r.width / n, mid = r.height / 2, t = performance.now() / 1000;
    let mang = null;
    const an = SONG.live || SONG.phan_tich;
    if (SONG.tt === "noi" && an) { SONG.du_lieu = SONG.du_lieu || new Uint8Array(128); an.getByteFrequencyData(SONG.du_lieu); mang = SONG.du_lieu; }
    let tong = 0;
    for (let i = 0; i < n; i++) {
      let v;
      if (mang) v = mang[Math.floor(i / n * mang.length * .7)] / 255;
      else if (SONG.tt === "nghe") v = .25 + .55 * Math.abs(Math.sin(t * 7 + i * .6) * Math.sin(t * 3.1 + i * .23));
      else if (SONG.tt === "nghi") v = .12 + .2 * Math.abs(Math.sin(t * 4 - i * .35));
      else v = .04 + .03 * Math.sin(t * 2 + i * .4);
      tong += v;
      const cao = Math.max(2, v * r.height * .92), g = ctx.createLinearGradient(0, mid - cao / 2, 0, mid + cao / 2);
      g.addColorStop(0, "rgba(255,79,216,.9)"); g.addColorStop(.5, "rgba(63,232,255,1)"); g.addColorStop(1, "rgba(184,107,255,.9)");
      ctx.fillStyle = g;
      ctx.fillRect(i * w + w * .3, mid - cao / 2, w * .4, cao);
    }
    if (SONG.tt === "noi") window.LoiAI?.am(Math.min(1, tong / n * 2.2));
  })();
  // ---------- đồ thị Lark Base ----------
  const st = { nut: [], canh: [], map: {}, mau: {}, an: new Set(), nong: {}, cam: { x: 0, y: 0, k: 1 }, nhiet: 1, keo: null, tren: null, tam: {} };
  const cv = $("#graph"), ctx = cv.getContext("2d"); let W = 0, H = 0; const DPR = window.devicePixelRatio || 1;
  function coGian() { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); canVe = true; }
  window.addEventListener("resize", coGian);
  window.veDoThiLai = () => setTimeout(coGian, 40);
  async function taiDoThi() {
    try {
      st.nut = []; st.canh = []; st.map = {}; st.mau = {}; st.tam = {}; st.an = new Set(); st.nhiet = 1;
      const d = await api("/api/do-thi"), he = [...new Set(d.nut.map(n => n.phan_he))];
      const bang = ["#3fe8ff", "#b86bff", "#ff4fd8", "#3dffb0", "#ffb547", "#5aa2ff", "#ff7a7a", "#e9c98f", "#9af3ff", "#c9a6ff", "#7dffcf", "#ffd27a"];
      he.forEach((h, i) => { st.mau[h] = bang[i % bang.length]; const a = i / he.length * Math.PI * 2; st.tam[h] = { x: Math.cos(a) * 270, y: Math.sin(a) * 190 }; });
      st.nut = d.nut.map(n => ({ ...n, x: st.tam[n.phan_he].x + (Math.random() - .5) * 80, y: st.tam[n.phan_he].y + (Math.random() - .5) * 80, vx: 0, vy: 0, r: 4.5 + Math.min(15, Math.sqrt(n.so_dong || 4) * .85) }));
      doiVe(); st.map = Object.fromEntries(st.nut.map(n => [n.id, n])); st.canh = d.canh.filter(c => st.map[c.tu] && st.map[c.toi]);
      $("#legend").innerHTML = he.map(h => `<span data-h="${esc(h)}"><i style="background:${st.mau[h]}"></i>${esc(h)}</span>`).join("");
      $("#legend").onclick = e => { const s = e.target.closest("[data-h]"); if (!s) return; st.an.has(s.dataset.h) ? st.an.delete(s.dataset.h) : st.an.add(s.dataset.h); s.classList.toggle("off"); doiVe(); };
    } catch (e) {}
  }
  function buoc() {
    const N = st.nut, a = st.nhiet; if (a < .003) return;
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) { const p = N[i], q = N[j]; let dx = q.x - p.x, dy = q.y - p.y; const d2 = dx * dx + dy * dy + .01, f = 2600 / d2 * a, d = Math.sqrt(d2); dx /= d; dy /= d; p.vx -= dx * f; p.vy -= dy * f; q.vx += dx * f; q.vy += dy * f; }
    for (const c of st.canh) { const p = st.map[c.tu], q = st.map[c.toi], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, f = (d - 90) * .004 * a; p.vx += dx / d * f; p.vy += dy / d * f; q.vx -= dx / d * f; q.vy -= dy / d * f; }
    for (const n of N) { const t = st.tam[n.phan_he]; n.vx += (t.x - n.x) * .006 * a - n.x * .0012 * a; n.vy += (t.y - n.y) * .006 * a - n.y * .0012 * a; if (n !== st.keo) { n.x += n.vx; n.y += n.vy; } n.vx *= .82; n.vy *= .82; }
    st.nhiet *= .985;
  }
  const raMan = n => ({ x: W / 2 + (n.x + st.cam.x) * st.cam.k, y: H / 2 - 50 + (n.y + st.cam.y) * st.cam.k });
  // Vẽ lại CHỈ khi có thay đổi (đồ thị đang chạy lực, đang kéo/rê, có nút đang sáng), tối đa 30 khung/giây.
  // Bộ não New Brain ~180 nút / 540 cạnh: vẽ 60 khung/giây kèm shadowBlur từng nút làm cả trang (và ChatGPT Live) giật.
  let veTruoc = 0, canVe = true;
  const doiVe = () => { canVe = true; };
  function ve(t) {
    requestAnimationFrame(ve);
    if (document.hidden || !$("#p-troly").classList.contains("on") || !cv.offsetParent) return;
    if (t - veTruoc < 33) return;
    const now = performance.now(), dangSang = Object.values(st.nong).some(v => v > now);
    if (!canVe && st.nhiet < .003 && !st.keo && !dangSang) return;
    veTruoc = t; canVe = false;
    buoc(); ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(150,225,255,.13)"; ctx.beginPath();
    const noi = [];
    for (const c of st.canh) { const p = st.map[c.tu], q = st.map[c.toi]; if (st.an.has(p.phan_he) || st.an.has(q.phan_he)) continue;
      const nong = Math.max(st.nong[c.tu] || 0, st.nong[c.toi] || 0) > now, tren = st.tren && (st.tren === p || st.tren === q);
      if (nong || tren) { noi.push([p, q, nong]); continue; }
      const a = raMan(p), b = raMan(q); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    for (const [p, q, nong] of noi) { const a = raMan(p), b = raMan(q); ctx.strokeStyle = nong ? "rgba(255,226,170,.85)" : "rgba(150,225,255,.75)"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.font = "500 11px 'Be Vietnam Pro'"; ctx.textAlign = "center";
    for (const n of st.nut) { const s = raMan(n), an = st.an.has(n.phan_he), r = n.r * st.cam.k, hn = (st.nong[n.id] || 0) - now;
      if (s.x < -30 || s.y < -30 || s.x > W + 30 || s.y > H + 30) continue;
      if (hn > 0) { const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 5); g.addColorStop(0, `rgba(255,226,170,${.55 * hn / 3500})`); g.addColorStop(1, "rgba(255,226,170,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r * 5, 0, 7); ctx.fill(); }
      ctx.globalAlpha = an ? .12 : 1; ctx.fillStyle = st.mau[n.phan_he];
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 7); ctx.fill();
      if (!an && (r > 11 || st.tren === n || hn > 0)) { ctx.fillStyle = hn > 0 ? "#fff3dc" : "rgba(239,231,218,.8)"; ctx.fillText(n.ten.length > 28 ? n.ten.slice(0, 27) + "…" : n.ten, s.x, s.y + r + 13); }
      ctx.globalAlpha = 1; }
  }
  function nutTai(x, y) { let best = null, bd = 1e9; for (const n of st.nut) { const s = raMan(n), d = Math.hypot(s.x - x, s.y - y); if (d < Math.max(10, n.r * st.cam.k + 4) && d < bd) { bd = d; best = n; } } return best; }
  let keoNen = null, daKeo = false;
  cv.addEventListener("mousedown", e => { const n = nutTai(e.offsetX, e.offsetY); daKeo = false; if (n) st.keo = n; else keoNen = { x: e.clientX, y: e.clientY, cx: st.cam.x, cy: st.cam.y }; });
  window.addEventListener("mouseup", () => { st.keo = null; keoNen = null; });
  cv.addEventListener("mousemove", e => { doiVe();
    if (st.keo) { daKeo = true; st.keo.x = (e.offsetX - W / 2) / st.cam.k - st.cam.x; st.keo.y = (e.offsetY - H / 2 + 50) / st.cam.k - st.cam.y; st.nhiet = Math.max(st.nhiet, .3); return; }
    if (keoNen) { daKeo = true; st.cam.x = keoNen.cx + (e.clientX - keoNen.x) / st.cam.k; st.cam.y = keoNen.cy + (e.clientY - keoNen.y) / st.cam.k; return; }
    const n = nutTai(e.offsetX, e.offsetY), tip = $("#tip"); st.tren = n;
    if (n) { tip.style.display = "block"; tip.style.left = e.offsetX + 14 + "px"; tip.style.top = e.offsetY + 10 + "px"; tip.innerHTML = `<b>${esc(n.ten)}</b><br><span class="meta">${esc(n.phu || n.phan_he)}</span><br><span class="meta">Bấm để nhờ trợ lý tóm tắt</span>`; cv.style.cursor = "pointer"; }
    else { tip.style.display = "none"; cv.style.cursor = "grab"; }
  });
  cv.addEventListener("click", e => { if (daKeo) return; const n = nutTai(e.offsetX, e.offsetY); if (n) gui(`Tóm tắt nhanh trang "${n.ten}" trong bộ não (tệp ${n.id}): nội dung chính và điểm đáng chú ý.`); });
  cv.addEventListener("wheel", e => { e.preventDefault(); doiVe(); st.cam.k = Math.min(3, Math.max(.4, st.cam.k * (e.deltaY < 0 ? 1.1 : .9))); }, { passive: false });
  const chieuSang = b => { if (b) { st.nong[b] = performance.now() + 3500; doiVe(); } };

  // ---------- hội thoại ----------
  const log = $("#log");
  function md(s) { let out = "", ul = false;
    for (let l of esc(s).split("\n")) { l = l.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
      const m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/); if (m) { if (!ul) { out += "<ul>"; ul = true; } out += `<li>${m[1]}</li>`; continue; }
      if (ul) { out += "</ul>"; ul = false; } if (l.trim()) out += `<p>${l}</p>`; }
    return out + (ul ? "</ul>" : ""); }
  const cuon = () => log.scrollTop = log.scrollHeight;
  function theDx(dx) {
    const el = document.createElement("div"); el.className = "dx";
    el.innerHTML = `<h4>Đề xuất · ${esc(dx.tieu_de)}</h4><div class="why">${esc(dx.ly_do)}</div><table>${Object.entries(dx.hien).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${dx.cu && k in dx.cu && dx.cu[k] !== v ? `<span class="old">${esc(dx.cu[k] || "(trống)")}</span>` : ""}${esc(v || "(trống)")}</td></tr>`).join("")}</table>
      <div class="act"><button class="btn gold" data-v="duyet">Duyệt và chạy</button><button class="btn" data-v="bo">Bỏ</button></div><div class="meta st"></div>`;
    el.querySelector(".act").onclick = async e => { const v = e.target.closest("[data-v]")?.dataset.v; if (!v) return; el.querySelectorAll("button").forEach(b => b.disabled = true);
      try { const r = await api(`/api/de-xuat/${dx.id}/${v}`, { method: "POST" }); el.querySelector(".st").innerHTML = r.trang_thai === "da_ghi" ? '<span style="color:var(--ok)">✓ Đã chạy</span>' : "Đã bỏ"; el.querySelector(".act").remove(); if (r.trang_thai === "da_ghi") chieuSang(dx.bang); }
      catch (err) { el.querySelector(".st").innerHTML = `<span class="err">${esc(err.message)}</span>`; el.querySelectorAll("button").forEach(b => b.disabled = false); } };
    return el;
  }
  // ================= HỘI THOẠI + GIỌNG NÓI (kiểu gọi điện) =================
  // Đọc TỪNG CÂU ngay khi câu đó viết xong (không chờ hết câu trả lời), tải sẵn câu kế trong lúc đọc câu hiện tại.
  // Chế độ "Trò chuyện" (ranh_tay): mic nghe liên tục; anh dứt lời ~0,7 giây là gửi; em nói "Dạ" ngay rồi trả lời;
  // anh nói chen là em im. Giọng phát qua AudioContext mở khoá ở cú chạm đầu (trình duyệt chặn Audio.play() muộn).
  let dangChay = false, huy = null;
  let ac = null, nguon = null, am = null;
  const HANG = { ds: [], dangPhat: false, the: 0, cauHienTai: "" };      // hàng đợi câu cần đọc
  const DEM = {};                                                        // câu đệm ("Dạ") đã giải mã sẵn
  function moKhoa() {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
    } catch (e) {}
  }
  ["pointerdown", "keydown", "touchend"].forEach(ev => window.addEventListener(ev, moKhoa, { passive: true }));
  const sachDoc = chu => chu.replace(/\*\*/g, "").replace(/[`#>|*_]/g, "").replace(/^\s*[-•]\s+/gm, "")
    .replace(/(\d)\.(\d{1,2})(?!\d)/g, "$1,$2")        // 318.7 → 318,7 để giọng Việt đọc "phẩy" (giữ 1.000.000)
    .replace(/\s-\s/g, ", ").replace(/\s+/g, " ").trim();
  async function layAm(chu) {
    const r = await fetch("/api/tts?chu_doc=" + encodeURIComponent(sachDoc(chu).slice(0, 600)));
    if (!r.ok) throw new Error("TTS lỗi");
    return ac.decodeAudioData(await r.arrayBuffer());
  }
  function boPhanTich() {
    if (!SONG.phan_tich) { SONG.phan_tich = ac.createAnalyser(); SONG.phan_tich.fftSize = 256; SONG.du_lieu = new Uint8Array(SONG.phan_tich.frequencyBinCount); SONG.phan_tich.connect(ac.destination); }
    return SONG.phan_tich;
  }
  function phatBuffer(buf) {
    return new Promise(res => { try { nguon && nguon.stop(); } catch (e) {}
      nguon = ac.createBufferSource(); nguon.buffer = buf; nguon.connect(boPhanTich()); nguon.onended = () => { nguon = null; res(); }; nguon.start(0); });
  }
  function dungDoc() {
    HANG.the++; HANG.ds = []; HANG.dangPhat = false; HANG.cauHienTai = "";
    try { nguon && nguon.stop(); } catch (e) {} nguon = null;
    if (am) { am.pause(); am = null; }
    if (!dangChay) cau(GIONG.che_do === "ranh_tay" && dangNghe ? "nghe" : "", GIONG.che_do === "ranh_tay" && dangNghe ? "ĐANG NGHE ANH" : "");
  }
  function themCau(chu) {                     // đưa một câu vào hàng đọc, tải âm thanh ngay (song song)
    chu = sachDoc(chu); if (!chu || !ac || GIONG.che_do === "chu") return;
    HANG.ds.push({ chu, am: layAm(chu).catch(() => null) });
    if (!HANG.dangPhat) chayHang();
  }
  async function chayHang() {
    const the = HANG.the; HANG.dangPhat = true;
    while (HANG.ds.length && the === HANG.the) {
      const x = HANG.ds.shift(), buf = await x.am;
      if (the !== HANG.the) return;
      if (!buf) continue;
      HANG.cauHienTai = x.chu; cau("noi", "ĐANG NÓI", GIONG.ngat_loi ? "Nói chen để ngắt" : "");
      await phatBuffer(buf);
    }
    if (the === HANG.the) { HANG.dangPhat = false; HANG.cauHienTai = ""; if (!dangChay) cau(GIONG.che_do === "ranh_tay" ? "nghe" : "", GIONG.che_do === "ranh_tay" ? "ĐANG NGHE ANH" : ""); }
  }
  async function noiDem() {                    // "Dạ" ngay khi anh dứt lời: lấp khoảng lặng lúc em nghĩ
    if (!ac || GIONG.che_do === "chu") return;
    const ds = ["Dạ.", "Dạ, để em xem.", "Vâng anh."], k = ds[Math.floor(Math.random() * ds.length)];
    try { DEM[k] = DEM[k] || await layAm(k); if (!HANG.dangPhat && dangChay) await phatBuffer(DEM[k]); } catch (e) {}
  }
  function napDem() { if (ac) ["Dạ.", "Dạ, để em xem.", "Vâng anh."].forEach(k => { if (!DEM[k]) layAm(k).then(b => DEM[k] = b).catch(() => {}); }); }

  // tách câu khi chữ đang chảy về: gặp . ! ? … hoặc xuống dòng thì đọc ngay phần đó
  function tachCau(buf, het) {
    const ra = []; let i;
    while ((i = buf.search(/[.!?…](\s|$)|\n/)) >= 0) {
      const c = buf.slice(0, i + 1).trim(); buf = buf.slice(i + 1);
      if (c.replace(/[\s.!?…-]/g, "").length > 1) ra.push(c);
    }
    if (het && buf.trim().length > 1) { ra.push(buf.trim()); buf = ""; }
    return [ra, buf];
  }

  async function gui(q, { giong = false } = {}) {
    q = (q || "").trim(); if (!q) return;
    if (dangChay && huy) { huy.abort(); }                 // câu mới cắt câu đang chạy
    dungDoc(); dangChay = true; const ctl = huy = new AbortController();
    log.insertAdjacentHTML("beforeend", `<div class="m me">${esc(q)}</div>`);
    const bot = document.createElement("div"); bot.className = "m bot"; bot.innerHTML = '<div class="tools"></div><div class="txt"><p class="meta">Em đang nghe...</p></div>'; log.appendChild(bot); cuon();
    const tools = bot.querySelector(".tools"), txt = bot.querySelector(".txt"); let chu = "", loi = "", choDoc = "";
    const docTung = GIONG.che_do !== "chu";
    cau("nghi", "ĐANG SUY NGHĨ", "");
    if (giong) noiDem();
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal, body: JSON.stringify({ cau: q, phien: PHIEN, giong }) });
      if (r.status === 401) { location.href = "/dang-nhap"; return; }
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "";
      while (true) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
        while ((i = buf.indexOf("\n\n")) >= 0) { const khoi = buf.slice(0, i); buf = buf.slice(i + 2); if (!khoi.startsWith("data: ")) continue; const ev = JSON.parse(khoi.slice(6));
          if (ev.t === "chu") { chu += ev.text; txt.innerHTML = md(chu); if (!HANG.dangPhat) cau("nghi", "ĐANG TRẢ LỜI", "");
            if (docTung) { choDoc += ev.text; const [ds, con] = tachCau(choDoc, false); choDoc = con; ds.forEach(themCau); } }
          else if (ev.t === "luot") { if (chu && !chu.endsWith("\n")) { chu += "\n\n"; choDoc += "\n"; } }
          else if (ev.t === "cong_cu") { tools.insertAdjacentHTML("beforeend", `<div class="tool">⟡ ${esc(ev.ten)}${ev.ten_bang ? " · " + esc(ev.ten_bang) : ""}</div>`); if (!HANG.dangPhat) cau("nghi", "ĐANG GỌI " + ev.ten.toUpperCase(), ev.ten_bang || ""); chieuSang(ev.bang); }
          else if (ev.t === "xong_cong_cu") { const l = tools.querySelector(".tool:not(.done)"); if (l) l.classList.add("done"); }
          else if (ev.t === "de_xuat") bot.after(theDx(ev.dx));
          else if (ev.t === "loi") loi = ev.text;
          cuon(); } }
    } catch (e) { if (e.name !== "AbortError") loi = e.message; else { txt.innerHTML = md(chu || "(đã ngắt)"); dangChay = false; return; } }
    if (docTung) { const [ds] = tachCau(choDoc, true); ds.forEach(themCau); }
    if (!chu && !loi) loi = "Không nhận được câu trả lời.";
    if (loi) { txt.innerHTML = (chu ? md(chu) : "") + `<p class="err">${esc(loi)}</p>`; cau("loi", "LỖI", loi.slice(0, 80)); setTimeout(() => cau(), 6000); }
    else {
      const nut = document.createElement("button"); nut.className = "nghe"; nut.textContent = "🔊 Nghe lại"; nut.onclick = () => { moKhoa(); dungDoc(); tachCau(chu, true)[0].forEach(themCau); }; bot.appendChild(nut);
      if (docTung && !ac) { nut.classList.add("nhac"); nut.textContent = "🔊 Bấm để nghe"; }
      if (!HANG.dangPhat) cau(GIONG.che_do === "ranh_tay" ? "nghe" : "", GIONG.che_do === "ranh_tay" ? "ĐANG NGHE ANH" : "");
    }
    tools.querySelectorAll(".tool").forEach(t => t.classList.add("done")); if (huy === ctl) { dangChay = false; huy = null; } cuon();
  }
  window.guiTroLy = q => gui(q);
  $("#composer").onsubmit = e => { e.preventDefault(); const v = $("#inp").value; $("#inp").value = ""; gui(v); };
  $("#inp").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#composer").requestSubmit(); } });
  $("#inp").addEventListener("input", e => { e.target.style.height = "auto"; e.target.style.height = Math.min(140, e.target.scrollHeight) + "px"; });
  log.addEventListener("click", e => { const li = e.target.closest("[data-q]"); if (li) gui(li.dataset.q); });
  const gioiThieu = log.innerHTML;
  // tải lại trang không mất hội thoại: vẽ lại các lượt đã lưu ở máy chủ
  api(`/api/lich-su?phien=${PHIEN}`).then(ds => {
    if (!ds.length) return;
    log.innerHTML = `<div class="meta" style="text-align:center;margin:4px 0 10px">· Hội thoại đang tiếp tục · bấm ＋ để mở hội thoại mới ·</div>` +
      ds.map(x => x.vai === "me" ? `<div class="m me">${x.che_do !== "chu" ? "🎙 " : ""}${esc(x.noi_dung)}</div>` : `<div class="m bot"><div class="txt">${md(x.noi_dung)}</div></div>`).join("");
    cuon();
  }).catch(() => {});
  $("#new-chat").onclick = async () => { await api("/api/phien-moi", { method: "POST", body: JSON.stringify({ phien: PHIEN }) }); log.innerHTML = gioiThieu; toast("Đã mở hội thoại mới."); };
  window.capNhatBadge = async () => { try { const m = (await api("/api/models")).dang_dung, ten = { claude: "Claude", codex: "ChatGPT", openrouter: "OpenRouter", openai: "OpenAI API", anthropic: "Anthropic API", gemini: "Gemini", groq: "Groq", ollama: "Ollama" }[m.engine] || m.engine;
    $("#badge").textContent = `${ten} · ${m.model}`; const c = $("#st-engine"); if (c) c.textContent = ten; } catch (e) {} };

  // ---------- nghe ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let nhan = null, dangNghe = false, coChu = "", henGui = null, muonNghe = false;
  const bo = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  function laTiengVong(t) {                    // micro bắt lại giọng em từ loa: phần lớn từ trùng câu em đang đọc thì bỏ
    if (!HANG.cauHienTai) return false;
    const a = bo(t), b = new Set(bo(HANG.cauHienTai)); if (!a.length) return true;
    return a.filter(w => b.has(w)).length / a.length > .5;
  }
  function batNghe(lienTuc = false) {
    if (!SR) { toast("Trình duyệt này không nhận giọng nói. Dùng Chrome (máy tính, Android) hoặc Safari iPhone mới."); return; }
    if (dangNghe) return; if (!lienTuc) dungDoc();
    muonNghe = lienTuc;
    nhan = new SR(); nhan.lang = GIONG.ngon_ngu_nghe || "vi-VN"; nhan.interimResults = true; nhan.continuous = lienTuc; coChu = "";
    nhan.onresult = e => {
      let tam = ""; for (let i = e.resultIndex; i < e.results.length; i++) tam += e.results[i][0].transcript;
      if (lienTuc) {
        if ((HANG.dangPhat || nguon) && (laTiengVong(tam) || bo(tam).length < 2)) return;   // tiếng vọng / tiếng động
        if ((HANG.dangPhat || nguon || dangChay) && GIONG.ngat_loi) { dungDoc(); if (huy) { huy.abort(); dangChay = false; } }   // anh nói chen: em im
        $("#inp").value = tam; cau("nghe", "ĐANG NGHE ANH", tam.slice(-60));
        clearTimeout(henGui);
        if ([...e.results].at(-1).isFinal) henGui = setTimeout(() => { const q = $("#inp").value.trim(); $("#inp").value = ""; if (q) gui(q, { giong: true }); }, 650);
      } else { coChu = [...e.results].map(r => r[0].transcript).join(""); $("#inp").value = coChu; }
    };
    nhan.onend = () => { dangNghe = false; $("#mic").classList.remove("on");
      if (muonNghe && GIONG.che_do === "ranh_tay") { setTimeout(() => { if (GIONG.che_do === "ranh_tay" && muonNghe) batNghe(true); }, 250); return; }
      if (!lienTuc) { cau(); if (coChu.trim()) { $("#inp").value = ""; gui(coChu, { giong: true }); } } };
    nhan.onerror = e => { if (e.error === "not-allowed") { muonNghe = false; toast("Anh cho phép dùng micro để trò chuyện nhé (cần HTTPS)."); }
      else if (e.error !== "no-speech" && e.error !== "aborted") toast("Mic: " + e.error); };
    try { nhan.start(); } catch (e) { return; }
    dangNghe = true; $("#mic").classList.add("on");
    if (!lienTuc) cau("nghe", "ĐANG NGHE", "Nói xong thả phím / bấm mic"); else if (!dangChay && !HANG.dangPhat) cau("nghe", "ĐANG NGHE ANH", "Cứ nói tự nhiên, em đáp ngay");
  }
  function tatNghe() { muonNghe = false; if (nhan && dangNghe) nhan.stop(); }
  $("#mic").onclick = () => { moKhoa(); if (GIONG.che_do === "live") { LIVE.pc ? dungLive() : batLive(); return; } if (GIONG.che_do === "ranh_tay") { dangNghe ? datCheDo("chu_giong") : batTroChuyen(); return; } dangNghe ? tatNghe() : batNghe(); };
  const dangGo = () => ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
  window.addEventListener("keydown", e => { if (e.code === "Space" && !e.repeat && !dangGo() && !["ranh_tay", "live"].includes(GIONG.che_do)) { e.preventDefault(); moKhoa(); batNghe(); } });
  window.addEventListener("keyup", e => { if (e.code === "Space" && !dangGo() && dangNghe && GIONG.che_do !== "ranh_tay") { e.preventDefault(); tatNghe(); } });


  // ================= CHATGPT LIVE =================
  // Giọng thật của ChatGPT qua WebRTC: âm thanh đi thẳng trình duyệt ↔ OpenAI, máy chủ chỉ chuyển SDP và nghe transcript.
  // Câu cần số liệu thì ChatGPT giao việc, bộ não chính (Claude + công cụ Lark...) làm, ChatGPT đọc lại kết quả.
  const LIVE = { pc: null, id: "", es: null, mic: null, audio: null, anh: null, em: null, emChu: "", viec: null };
  function dungLive(lyDo) {
    const id = LIVE.id;
    try { LIVE.es && LIVE.es.close(); } catch (e) {}
    try { LIVE.pc && LIVE.pc.close(); } catch (e) {}
    try { LIVE.mic && LIVE.mic.getTracks().forEach(t => t.stop()); } catch (e) {}
    if (LIVE.audio) { LIVE.audio.srcObject = null; }
    Object.assign(LIVE, { pc: null, id: "", es: null, mic: null, anh: null, em: null, emChu: "", viec: null }); SONG.live = null;
    if (id) fetch("/api/live/dung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
    $("#mic").classList.remove("on");
    cau("", lyDo || (GIONG.che_do === "live" ? "CHATGPT LIVE · ĐÃ TẮT" : ""), GIONG.che_do === "live" ? "Bấm mic để gọi lại" : undefined);
  }
  async function batLive() {
    if (LIVE.pc) return;
    moKhoa(); dungDoc(); tatNghe();
    cau("nghi", "ĐANG GỌI CHATGPT LIVE", "Đang mở micro và kết nối");
    try {
      LIVE.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const pc = LIVE.pc = new RTCPeerConnection();
      LIVE.mic.getTracks().forEach(t => pc.addTrack(t, LIVE.mic));
      // Lời anh nói về THẲNG trình duyệt qua kênh dữ liệu (input_transcript.added, từng từ), không qua máy chủ (đo 05/10)
      const dc = pc.createDataChannel("oai-events"); let cuoiMs = -1e9;
      dc.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; }
        if (m.type !== "input_transcript.added") return; const t = m.item?.text || "", bd = m.start_ms || 0;
        if (!LIVE.anh || bd - cuoiMs > 1600) { LIVE.anh = document.createElement("div"); LIVE.anh.className = "m me"; LIVE.anh.dataset.chu = ""; log.appendChild(LIVE.anh); }
        LIVE.anh.dataset.chu += t; LIVE.anh.textContent = "🎙 " + LIVE.anh.dataset.chu.trim(); cuoiMs = m.end_ms || bd; cuon(); };
      LIVE.audio = LIVE.audio || Object.assign(new Audio(), { autoplay: true });
      pc.ontrack = e => { const sm = e.streams[0]; LIVE.audio.srcObject = sm; LIVE.audio.play().catch(() => {});
        try { if (ac) { const a = ac.createAnalyser(); a.fftSize = 256; ac.createMediaStreamSource(sm).connect(a); SONG.live = a; } } catch (err) {} };
      pc.onconnectionstatechange = () => { if (["failed", "disconnected"].includes(pc.connectionState) && LIVE.pc === pc) { toast("Mất kết nối ChatGPT Live."); dungLive(); } };
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      const r = await api("/api/live/bat-dau", { method: "POST", body: JSON.stringify({ sdp: offer.sdp, phien: PHIEN }) });
      if (LIVE.pc !== pc) return;
      LIVE.id = r.id;
      await pc.setRemoteDescription({ type: "answer", sdp: r.sdp });
      LIVE.es = new EventSource(`/api/live/su-kien?id=${r.id}`);
      LIVE.es.onmessage = e => suKienLive(JSON.parse(e.data));
      LIVE.es.onerror = () => { if (LIVE.es && LIVE.es.readyState === 2) dungLive(); };
      $("#mic").classList.add("on");
      cau("nghe", "CHATGPT LIVE · ĐANG NGHE", "Cứ nói tự nhiên, nói chen là em dừng");
    } catch (e) {
      dungLive("LỖI CHATGPT LIVE");
      const t = e.name === "NotAllowedError" ? "Anh cho phép dùng micro nhé (cần HTTPS)." : e.message;
      log.insertAdjacentHTML("beforeend", `<div class="m bot"><p class="err">ChatGPT Live chưa gọi được: ${esc(t)}</p></div>`); cuon();
      toast("ChatGPT Live: " + t);
    }
  }
  function suKienLive(ev) {
    if (ev.t === "anh") {
      if (!LIVE.anh) { LIVE.anh = document.createElement("div"); LIVE.anh.className = "m me"; log.appendChild(LIVE.anh); }
      LIVE.anh.textContent = "🎙 " + ev.text; cau("nghe", "ĐANG NGHE ANH", ev.text.slice(-60));
      if (ev.xong) LIVE.anh = null;
    } else if (ev.t === "em") {
      if (!LIVE.em) { LIVE.em = document.createElement("div"); LIVE.em.className = "m bot"; LIVE.em.innerHTML = '<div class="txt"></div>'; log.appendChild(LIVE.em); LIVE.emChu = ""; }
      LIVE.emChu += ev.text; LIVE.em.querySelector(".txt").innerHTML = md(LIVE.emChu); cau("noi", "ĐANG NÓI", "");
    } else if (ev.t === "em_xong") {
      LIVE.em = null; LIVE.emChu = ""; cau(LIVE.viec ? "nghi" : "nghe", LIVE.viec ? "BỘ NÃO ĐANG LÀM" : "CHATGPT LIVE · ĐANG NGHE", "");
    } else if (ev.t === "giao_viec") {
      const b = LIVE.viec = document.createElement("div"); b.className = "m bot";
      b.innerHTML = `<div class="tools"><div class="tool">⟡ Giao việc · ${esc(ev.text.slice(0, 120))}</div></div><div class="txt"><p class="meta">Bộ não chính đang tra...</p></div>`;
      log.appendChild(b); cau("nghi", "BỘ NÃO ĐANG LÀM", ev.text.slice(0, 60));
    } else if (ev.t === "cong_cu") {
      LIVE.viec?.querySelector(".tools").insertAdjacentHTML("beforeend", `<div class="tool">⟡ ${esc(ev.ten)}${ev.ten_bang ? " · " + esc(ev.ten_bang) : ""}</div>`);
      cau("nghi", "ĐANG GỌI " + ev.ten.toUpperCase(), ev.ten_bang || ""); chieuSang(ev.bang);
    } else if (ev.t === "de_xuat") { log.appendChild(theDx(ev.dx));
    } else if (ev.t === "ket_qua") {
      const b = LIVE.viec; if (b) { b.querySelector(".txt").innerHTML = md(ev.text); b.querySelectorAll(".tool").forEach(t => t.classList.add("done")); }
      LIVE.viec = null;
    } else if (ev.t === "loi") {
      log.insertAdjacentHTML("beforeend", `<div class="m bot"><p class="err">${esc(ev.text)}</p></div>`);
    } else if (ev.t === "het") { if (LIVE.pc) dungLive(); }
    cuon();
  }

  function batTroChuyen() {                   // vào cuộc trò chuyện: mở sẵn phiên Claude nhanh + nạp câu đệm + mic liên tục
    moKhoa(); napDem();
    fetch("/api/chat/khoi-dong", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phien: PHIEN, giong: true }) }).catch(() => {});
    if (!dangNghe) batNghe(true);
  }
  function veCheDo() { $("#mode").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.m === GIONG.che_do)); }
  async function datCheDo(m) {
    const cu = GIONG.che_do; GIONG = await api("/api/giong", { method: "POST", body: JSON.stringify({ che_do: m }) }); veCheDo();
    if (cu === "live" && m !== "live") dungLive();
    if (cu === "ranh_tay" && m !== "ranh_tay") tatNghe();
    if (m === "chu") dungDoc();
    cau(m === "ranh_tay" ? "nghe" : "", m === "ranh_tay" ? "ĐANG NGHE ANH" : "");
    if (m === "ranh_tay") batTroChuyen();
    if (m === "live") batLive();
    toast({ chu: "Chỉ trả lời bằng chữ", chu_giong: "Trả lời bằng chữ và tự đọc", ranh_tay: "Trò chuyện: anh cứ nói, em đáp ngay bằng giọng", live: "ChatGPT Live: gọi bằng giọng thật của ChatGPT" }[m]);
  }
  $("#mode").onclick = e => { const b = e.target.closest("[data-m]"); if (b) { moKhoa(); datCheDo(b.dataset.m); } };
  window.apDungGiong = g => { const cu = GIONG.che_do; GIONG = g; veCheDo(); if (cu === "live" && g.che_do !== "live") dungLive(); cau(); };

  // trình duyệt không cho bật mic khi chưa chạm: tải trang ở chế độ Trò chuyện thì chờ cú chạm đầu rồi mới nghe
  api("/api/giong").then(g => { GIONG = g.cai_dat; veCheDo(); cau();
    if (GIONG.che_do === "ranh_tay") { cau("", "CHẠM ĐỂ BẮT ĐẦU TRÒ CHUYỆN", "Trình duyệt cần một cú chạm để mở micro");
      const mo = () => { window.removeEventListener("pointerdown", mo); batTroChuyen(); }; window.addEventListener("pointerdown", mo); }
    if (GIONG.che_do === "live") cau("", "CHATGPT LIVE · SẴN SÀNG", "Bấm mic để gọi"); }).catch(() => {});

  if (window.LoiAI) { LoiAI.gan($("#loi-lon")); LoiAI.gan($("#loi-chat")); }
  window.taiLaiDoThi = taiDoThi;
  window.capNhatBadge(); coGian(); taiDoThi(); requestAnimationFrame(ve);
})();
