// Classique OS - khung chung, Điều hành, Store, Kết nối, Models, Cài đặt.
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function api(path, opt = {}) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opt });
  if (r.status === 401 && !path.startsWith("/api/dang-nhap")) { location.href = "/dang-nhap"; throw new Error("Hết phiên"); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || ("Lỗi " + r.status));
  return d;
}
function toast(t) { const e = $("#toast"); e.textContent = t; e.classList.add("show"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("show"), 3200); }
const tien = v => { v = Number(v) || 0; const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + " tỷ";
  if (a >= 1e6) return (v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr";
  return v.toLocaleString("vi-VN"); };
const so = v => (Number(v) || 0).toLocaleString("vi-VN");
const usd = v => "$" + (Number(v) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const ngayVN = s => { if (!s) return ""; const [y, m, d] = s.split("-"); return `${+d}/${+m}`; };
function xh(p, sau = "tuần trước") {
  if (p == null) return `<span class="trend flat">mới</span><span>chưa có kỳ trước</span>`;
  const c = p > 0.5 ? "" : p < -0.5 ? "down" : "flat";
  return `<span class="trend ${c}">${p > 0 ? "↗ +" : p < 0 ? "↘ " : ""}${p.toLocaleString("vi-VN")}%</span><span>so ${sau}</span>`;
}

// ---------- biểu đồ SVG ----------
function bieuDoVung(diem, { h = 260, dinhDang = tien, mau = "#3fe8ff" } = {}) {
  const W = 480, H = h, L = 52, R = 18, T = 26, B = 28, n = diem.length;
  if (!n) return '<div class="empty">Chưa có dữ liệu</div>';
  const max = Math.max(...diem.map(p => p.y), 1) * 1.15;
  const X = i => L + (W - L - R) * (n === 1 ? 0.5 : i / (n - 1)), Y = v => T + (H - T - B) * (1 - v / max);
  const pts = diem.map((p, i) => [X(i), Y(p.y)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[i], [x2, y2] = pts[i + 1], [x3, y3] = pts[Math.min(n - 1, i + 2)];
    const k = (y, a, b) => Math.min(Math.max(y, Math.min(a, b)), Math.max(a, b));   // kẹp: không lượn quá 2 điểm kề
    d += ` C${x1 + (x2 - x0) / 6},${k(y1 + (y2 - y0) / 6, y1, y2)} ${x2 - (x3 - x1) / 6},${k(y2 - (y3 - y1) / 6, y1, y2)} ${x2},${y2}`; }
  const id = "g" + Math.random().toString(36).slice(2, 7), ticks = [0, .25, .5, .75, 1].map(f => max / 1.15 * f);
  const buoc = Math.max(1, Math.ceil(n / 5)), cuoi = pts[n - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${mau}" stop-opacity=".45"/><stop offset="1" stop-color="${mau}" stop-opacity="0"/></linearGradient>
    <filter id="${id}f"><feGaussianBlur stdDeviation="3"/></filter></defs>
    ${ticks.map(v => `<line class="grid-l" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${dinhDang(v)}</text>`).join("")}
    <path d="${d} L${cuoi[0]},${H - B} L${pts[0][0]},${H - B} Z" fill="url(#${id})"/>
    <path d="${d}" stroke="${mau}" stroke-width="5" fill="none" opacity=".35" filter="url(#${id}f)"/>
    <path d="${d}" stroke="#c9f8ff" stroke-width="2.2" fill="none"/>
    ${diem.map((p, i) => i % buoc === 0 || i === n - 1 ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(p.x)}</text>` : "").join("")}
    <circle cx="${cuoi[0]}" cy="${cuoi[1]}" r="5" fill="#fff" stroke="${mau}" stroke-width="2.5"/>
    <rect x="${Math.min(cuoi[0] - 36, W - R - 74)}" y="${Math.max(2, cuoi[1] - 30)}" width="74" height="20" rx="4" fill="#3fe8ff"/>
    <text x="${Math.min(cuoi[0], W - R - 37)}" y="${Math.max(2, cuoi[1] - 30) + 14}" text-anchor="middle" style="fill:#04121e;font-weight:700">${dinhDang(diem[n - 1].y)}</text></svg>`;
}
const MAU_VANG = ["#3fe8ff", "#b86bff", "#ff4fd8", "#3dffb0", "#5aa2ff", "#ffc45c", "#7ff4ff", "#d29bff"];
function bieuDoTron(items, dinhDang = tien) {
  const tong = items.reduce((s, x) => s + x.v, 0);
  if (!tong) return '<div class="empty">Chưa có dữ liệu</div>';
  const R = 70, r = 44, cx = 110, cy = 100; let a = -Math.PI / 2, out = "";
  items.forEach((x, i) => { const g = x.v / tong * Math.PI * 2; if (g <= 0) return; const a2 = a + g - 0.0001, lon = g > Math.PI ? 1 : 0;
    const p = (rad, ang) => `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
    out += `<path d="M${p(R, a)} A${R},${R} 0 ${lon} 1 ${p(R, a2)} L${p(r, a2)} A${r},${r} 0 ${lon} 0 ${p(r, a)} Z" fill="${MAU_VANG[i % 8]}" stroke="#071322" stroke-width="2"/>`;
    const m = a + g / 2; if (g > 0.25) out += `<text x="${cx + (R + r) / 2 * Math.cos(m)}" y="${cy + (R + r) / 2 * Math.sin(m) + 4}" text-anchor="middle" style="fill:#04121e;font-weight:700;font-size:11px">${Math.round(x.v / tong * 100)}%</text>`;
    a += g; });
  return `<div class="donut"><svg class="chart" viewBox="20 20 180 160">${out}</svg>
    <div class="lg">${items.map((x, i) => `<div class="li"><span class="dot" style="background:${MAU_VANG[i % 8]}"></span><span class="t">${esc(x.ten)}</span><span class="r">${dinhDang(x.v)} · ${Math.round(x.v / tong * 100)}%</span></div>`).join("")}</div></div>`;
}
function thanhNgang(items, dinhDang = so) {
  const max = Math.max(...items.map(x => x.v), 1);
  return items.length ? items.map(x => `<div class="hbar"><span class="n" title="${esc(x.ten)}">${esc(x.ten)}</span><div class="bar-line"><i style="width:${Math.max(2, x.v / max * 100)}%"></i></div><span class="v">${dinhDang(x.v)}</span></div>`).join("") : '<div class="empty">Chưa có dữ liệu</div>';
}
function dongHo(gt, tong) {
  const p = tong ? Math.min(1, gt / tong) : 0, R = 92, cx = 120, cy = 112, a0 = Math.PI, a1 = Math.PI + Math.PI * p;
  const P = a => `${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`, id = "dh" + Math.random().toString(36).slice(2, 6);
  return `<svg class="chart" viewBox="0 0 240 150" style="max-width:340px;margin:auto"><defs><linearGradient id="${id}"><stop offset="0" stop-color="#3fe8ff"/><stop offset="1" stop-color="#b86bff"/></linearGradient>
    <filter id="${id}f"><feGaussianBlur stdDeviation="4"/></filter></defs>
    <path d="M${P(a0)} A${R},${R} 0 0 1 ${P(2 * Math.PI)}" stroke="rgba(63,232,255,.12)" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M${P(a0)} A${R},${R} 0 0 1 ${P(a1)}" stroke="url(#${id})" stroke-width="16" fill="none" stroke-linecap="round" filter="url(#${id}f)" opacity=".7"/>
    <path d="M${P(a0)} A${R},${R} 0 0 1 ${P(a1)}" stroke="url(#${id})" stroke-width="12" fill="none" stroke-linecap="round"/>
    <text x="${cx}" y="${cy - 8}" text-anchor="middle" style="fill:#fff;font:700 30px 'Exo 2'">${so(gt)}<tspan style="fill:#8ba6bd;font-size:20px"> / ${so(tong)}</tspan></text></svg>`;
}
const tuNhom = (g, k = "tien", lay = 8) => Object.entries(g || {}).map(([ten, v]) => ({ ten, v: v[k] || 0 })).filter(x => x.v).slice(0, lay);
const theKpi = (lbl, val, sub) => `<div class="card kpi"><div class="lbl">${lbl}</div><div class="val">${val}</div><div class="sub">${sub}</div></div>`;
const the = (tieuDe, noiDung, cls = "") => `<div class="card ${cls}"><h3>${tieuDe}</h3>${noiDung}</div>`;

// ---------- điều hướng ----------
const DH = { d: null, meta: null, tab: "tong" };
function moTrang(p) {
  document.querySelectorAll("#rail>button, #tabbar>button").forEach(b => b.classList.toggle("on", b.dataset.p === p));
  document.body.className = document.body.className.replace(/\bp-\S+/g, "").trim() + " p-" + p;
  document.querySelectorAll(".page").forEach(x => x.classList.toggle("on", x.id === "p-" + p));
  ({ dieuhanh: taiDieuHanh, store: veStore, ketnoi: veKetNoi, models: veModels, caidat: veCaiDat, nao: () => veNao($("#nao-trang")) }[p] || (() => {}))();
  if (p === "troly" && window.veDoThiLai) window.veDoThiLai();
}
$("#rail").addEventListener("click", e => { const h = e.target.closest("[data-href]"); if (h) { location.href = h.dataset.href; return; } const b = e.target.closest("[data-p]"); if (b) moTrang(b.dataset.p); });
$("#tabbar").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) moTrang(b.dataset.p); });
$("#ai-tg").onclick = () => {
  const ai = $("#ai");
  if (document.body.classList.contains("p-caidat")) { ai.classList.toggle("mo-tay"); ai.classList.remove("dong"); }   // ở Cài đặt khung bị ẩn sẵn
  else ai.classList.toggle("dong");
  setTimeout(() => window.veDoThiLai?.(), 300); };
$("#dang-xuat").onclick = async () => { await api("/api/dang-xuat", { method: "POST" }); location.href = "/dang-nhap"; };
$("#d-close").onclick = () => $("#drawer").classList.remove("open");
let TOI = {};
api("/api/toi").then(t => { TOI = t; $("#toi").textContent = t.ten || ""; $("#chao").textContent = `Chào ${t.goi_chu || "anh"} ${t.ten_chu || t.ten || ""}`.trim(); });
$("#hoi-nhanh").onsubmit = e => { e.preventDefault(); const q = $("#hoi-nhanh-in").value.trim(); if (!q) return; $("#hoi-nhanh-in").value = ""; $("#ai").classList.remove("dong"); window.guiTroLy?.(q); };

// ---------- ĐIỀU HÀNH ----------
async function taiDieuHanh(lamMoi = false) {
  if (DH.d && !lamMoi) return veDH();
  $("#dh").innerHTML = `<div class="skeleton">${lamMoi ? "Đang lấy số liệu mới từ Lark..." : "Đang đọc số liệu từ Lark..."}</div>`;
  try {
    DH.d = await api("/api/dieu-hanh" + (lamMoi ? "?lam_moi=1" : ""));
    $("#dh-luc").textContent = DH.d.luc ? "Số liệu lúc " + new Date(DH.d.luc * 1000).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "";
    veDH();
  } catch (e) { $("#dh").innerHTML = `<p class="note">${esc(e.message)}</p>`; }
  if (!DH.meta || lamMoi) api("/api/dieu-hanh/meta" + (lamMoi ? "?lam_moi=1" : "")).then(m => { DH.meta = m; if (["tong", "mkt"].includes(DH.tab)) veDH(); }).catch(() => {});
}
$("#dh-lm").onclick = () => taiDieuHanh(true);
$("#dh-tabs").onclick = e => { const b = e.target.closest("[data-t]"); if (!b) return; DH.tab = b.dataset.t; $("#dh-tabs").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); veDH(); };

function viecCanXuLy(d) {
  const ds = [];
  if (d.cho_duyet) ds.push({ t: `${d.cho_duyet} đề xuất của Trợ lý đang chờ anh duyệt`, r: "Chờ duyệt", c: "warn" });
  for (const v of d.viec.ds.slice(0, 4)) ds.push({ t: v.ten, r: v.tt || "Chưa rõ", c: v.tt === "Đang làm" ? "blue" : v.tt === "Hoàn thành" ? "ok" : "warn" });
  if (d.kpi.lead_chua_cham) ds.push({ t: `${so(d.kpi.lead_chua_cham)} lead chưa có trạng thái chăm sóc`, r: "Cần xử lý", c: "bad" });
  if (d.san_pham.cho_duyet_web) ds.push({ t: `${d.san_pham.cho_duyet_web} sản phẩm chờ duyệt đăng web`, r: "Chờ duyệt", c: "warn" });
  return ds.slice(0, 6);
}
function veDH() {
  const d = DH.d, m = DH.meta, k = d.kpi;
  const ngay = Object.entries(d.doanh_thu_ngay).map(([x, y]) => ({ x: ngayVN(x), y }));
  let luy = 0; const congDon = ngay.map(p => ({ x: p.x, y: (luy += p.y) }));
  const metaThe = !m ? '<div class="skeleton">Đang hỏi Meta...</div>' : m.loi ? `<div class="empty">${esc(m.loi)}</div>` :
    `<div class="big-num">${usd(m.chi_tieu)}</div><div class="meta">7 ngày · ${so(m.click)} click · ${so(m.tin_nhan)} tin nhắn · CTR ${m.ctr}%</div>`;
  let h = "";
  if (DH.tab === "tong") {
    const tl = k.lead_tong ? Math.round(k.lead_chua_cham / k.lead_tong * 100) : 0;
    const ic = { do: "⚠", cam: "⚠", vang: "⚠" }, dotC = { do: "bad", cam: "warn", vang: "gold" };
    const cb = (d.canh_bao || []).map(x => `<div class="cb ${x.muc}"><span class="dot ${dotC[x.muc]}"></span><span>${ic[x.muc]}</span><span>${esc(x.noi_dung)}</span></div>`).join("") || '<div class="empty">AI chưa thấy điểm bất thường.</div>';
    h = `<div class="tq">
      <div class="card kpi k1"><div class="lbl">Doanh thu 7 ngày</div><div class="val">${tien(k.doanh_thu_7)}</div><div class="sub">${xh(k.doanh_thu_7_xh)}</div></div>
      <div class="card kpi k2"><div class="lbl">Đơn hợp lệ 7 ngày</div><div class="val">${so(k.don_7)}</div><div class="sub">${xh(k.don_7_xh)}</div></div>
      <div class="core"><div class="core-lbl">AI CORE · <b>ONLINE</b> · <span>ĐANG GIÁM SÁT 63 BẢNG LARK</span></div><canvas class="loi" id="loi-dh"></canvas></div>
      <div class="card kpi k3"><div class="lbl">Lead mới 7 ngày</div><div class="val">${so(k.lead_7)}</div><div class="sub">${xh(k.lead_7_xh)}</div></div>
      <div class="card kpi k4"><div class="lbl">Còn phải thu</div><div class="val">${tien(k.con_thu)}</div><div class="sub"><span>trên đơn chưa huỷ</span></div></div>
      <div class="card chart-c"><h3>Doanh thu cộng dồn 30 ngày</h3>${bieuDoVung(congDon, { h: 220 })}</div>
      <div class="card gauge-c"><h3>Lead chưa chăm sóc</h3>${dongHo(k.lead_chua_cham, k.lead_tong)}<div class="bar-line" style="max-width:260px;margin:4px auto 0"><i style="width:${tl}%"></i></div><div class="meta" style="text-align:center;margin-top:8px">${tl}% lead chưa có trạng thái · Meta 7 ngày: ${m && !m.loi ? usd(m.chi_tieu) : "…"}</div></div>
      <div class="card warn-c"><h3>Cảnh báo của AI</h3><div class="canh-bao">${cb}</div></div></div>`;
    setTimeout(() => { const cv = document.getElementById("loi-dh"); if (cv && window.LoiAI && !cv._gan) { cv._gan = 1; LoiAI.gan(cv); } });
  } else if (DH.tab === "ban") {
    const tb = k.don_30 ? k.doanh_thu_30 / k.don_30 : 0;
    h = `<div class="grid g4">${theKpi("Doanh thu 30 ngày", tien(k.doanh_thu_30), "<span>đơn chưa huỷ</span>")}${theKpi("Đơn 30 ngày", so(k.don_30), "<span>đơn hợp lệ</span>")}
      ${theKpi("Giá trị TB / đơn", tien(tb), "<span>30 ngày</span>")}${theKpi("Khách trong POS", so(k.khach), "<span>bảng 2.4</span>")}</div>
      <div class="grid r-main" style="margin-top:18px">${the("Doanh thu theo ngày", bieuDoVung(ngay))}${the("Theo sale · 30 ngày", thanhNgang(tuNhom(d.sale_30), tien))}</div>
      <div class="grid r-main" style="margin-top:18px">${the("Đơn mới nhất", `<table class="tb"><tr><th>Ngày</th><th>Khách</th><th>Món</th><th>Kênh</th><th>Trạng thái</th><th class="num">Tiền</th></tr>${d.don_moi.map(o => `<tr><td>${ngayVN(o.ngay)}</td><td>${esc(o.khach)}</td><td>${esc(o.mon || "–")}</td><td>${esc(o.kenh)}</td><td>${esc(o.trang_thai)}</td><td class="num">${o.tien ? tien(o.tien) : "–"}</td></tr>`).join("")}</table>`)}
      ${the("Đơn theo trạng thái", thanhNgang(tuNhom(d.trang_thai_don, "so"), so))}</div>`;
  } else if (DH.tab === "vanhanh") {
    h = `<div class="grid g4">${theKpi("Việc đang mở", so(d.viec.mo), "<span>bảng 4.1</span>")}${theKpi("Món đang bán", so(d.san_pham.dang_ban), `<span>trên ${so(d.san_pham.tong)} món</span>`)}
      ${theKpi("Chờ duyệt đăng web", so(d.san_pham.cho_duyet_web), "<span>sản phẩm</span>")}${theKpi("Đề xuất chờ duyệt", so(d.cho_duyet), "<span>từ Trợ lý</span>")}</div>
      <div class="grid g2" style="margin-top:18px">
        ${the("Công việc", (d.viec.toan_mau ? '<p class="note">Bảng 4.1 hiện chỉ có dòng mẫu [MẪU]. Giao việc thật trên Lark là ở đây hiện theo.</p>' : "") + `<div class="list">${d.viec.ds.map(v => `<div class="li"><span class="dot ${v.tt === "Đang làm" ? "blue" : v.tt === "Hoàn thành" ? "ok" : "warn"}"></span><span class="t">${esc(v.ten)}</span><span class="r">${esc(v.ai || "")} ${v.han ? "· hạn " + ngayVN(v.han) : ""}</span></div>`).join("") || '<div class="empty">Không có việc mở</div>'}</div>`)}
        ${the("Món đang bán theo hãng", thanhNgang(tuNhom(d.san_pham.theo_hang, "so"), so))}
        ${the("Nhật ký bán hàng (tự động)", `<div class="list">${d.nhat_ky.map(x => `<div class="li"><span class="dot gold"></span><span class="t">${esc(x.su_kien)}</span><span class="r">${esc(x.luc)}</span></div>`).join("") || '<div class="empty">Chưa có sự kiện</div>'}</div>`)}
        ${the("Việc định kỳ trên VPS", '<div class="list" id="dh-viec"><div class="empty">Đang tải...</div></div>')}</div>`;
    setTimeout(async () => { const v = await api("/api/viec").catch(() => []); const el = $("#dh-viec"); if (el) el.innerHTML = v.map(x => `<div class="li"><span class="dot ok"></span><span class="t">${esc(x.mo_ta || x.ten)}</span><span class="r">${esc((x.lich[0] || "").replace(" Asia/Ho_Chi_Minh", ""))}</span></div>`).join(""); });
  } else if (DH.tab === "khach") {
    const ln = Object.entries(d.lead.theo_ngay).map(([x, y]) => ({ x: ngayVN(x), y }));
    h = `<div class="grid g4">${theKpi("Tổng lead", so(k.lead_tong), "<span>bảng 17.1</span>")}${theKpi("Lead mới 7 ngày", so(k.lead_7), xh(k.lead_7_xh))}
      ${theKpi("Chưa chăm sóc", so(k.lead_chua_cham), "<span>chưa có trạng thái</span>")}${theKpi("Đã enrich", so(d.lead.da_enrich), "<span>có hồ sơ khách</span>")}</div>
      <div class="grid r-main" style="margin-top:18px">${the("Lead mới theo ngày", bieuDoVung(ln, { dinhDang: so }))}${the("Nguồn lead", bieuDoTron(tuNhom(d.lead.nguon, "so"), so))}</div>
      <div class="grid g2" style="margin-top:18px">${the("Khách theo bậc giao dịch", thanhNgang(tuNhom(d.khach.bac, "so"), so))}
        ${the("Khách mua nhiều nhất", `<table class="tb"><tr><th>Khách</th><th class="num">Số đơn</th><th class="num">Đã mua</th></tr>${d.khach.top.map(x => `<tr><td>${esc(x.ten)}</td><td class="num">${so(x.so_don)}</td><td class="num">${tien(x.da_mua)}</td></tr>`).join("")}</table>`)}</div>`;
  } else if (DH.tab === "mkt") {
    const cd = m && !m.loi ? m.chien_dich : [];
    h = `<div class="grid g4">${theKpi("Chi quảng cáo 7 ngày", m && !m.loi ? usd(m.chi_tieu) : "–", "<span>Meta Ads</span>")}${theKpi("Hiển thị", m && !m.loi ? so(m.hien_thi) : "–", "<span>7 ngày</span>")}
      ${theKpi("Click · CTR", m && !m.loi ? `${so(m.click)}` : "–", `<span>CTR ${m && !m.loi ? m.ctr : 0}%</span>`)}${theKpi("Tin nhắn mới", m && !m.loi ? so(m.tin_nhan) : "–", "<span>7 ngày</span>")}</div>
      <div class="grid r-main" style="margin-top:18px">${the("Chiến dịch Meta · 7 ngày", cd.length ? `<table class="tb"><tr><th>Chiến dịch</th><th class="num">Chi</th><th class="num">Click</th><th class="num">CTR</th><th class="num">Tin nhắn</th></tr>${cd.map(c => `<tr><td title="${esc(c.ten)}">${esc(c.ten)}</td><td class="num">${usd(c.chi_tieu)}</td><td class="num">${so(c.click)}</td><td class="num">${(+c.ctr || 0).toFixed(2)}%</td><td class="num">${so(c.tin_nhan)}</td></tr>`).join("")}</table>` : `<div class="empty">${m?.loi ? esc(m.loi) : "Đang tải..."}</div>`)}
        ${the("Bài SEO theo trạng thái", thanhNgang(tuNhom(d.seo.trang_thai, "so"), so))}</div>
      <div class="grid g2" style="margin-top:18px">${the("Bài SEO mới đăng", `<div class="list">${d.seo.moi_dang.map(x => `<div class="li"><span class="dot ok"></span><span class="t">${esc(x.tieu_de)}</span><span class="r">${ngayVN(x.ngay)}</span></div>`).join("") || '<div class="empty">Chưa có</div>'}</div>`)}
        ${the("Lượt xem GA4", `<div class="big-num">${so(d.seo.luot_xem)}</div><div class="meta">Tổng lượt xem các bài trong bảng 18.1</div>`)}</div>`;
  } else if (DH.tab === "tc") {
    const q = Object.entries(d.tai_chinh.quy).filter(([, v]) => v.dong_tien);
    h = (d.tai_chinh.co_du_lieu ? "" : '<p class="note">Bảng 6.3 Tổng hợp Thu Chi chưa có số liệu thu chi thật (Tổng Thu và Tổng Chi đang trống). Ghi thu chi trên Lark là ở đây hiện theo. Bảng 2.2 Phiếu thu SePay cũng chưa có dòng nào.</p>') +
      `<div class="grid g4" style="margin-top:14px">${q.map(([ten, v]) => theKpi(esc(ten), tien(v.dong_tien), "<span>dòng tiền ghi gần nhất</span>")).join("") || theKpi("Quỹ", "–", "<span>chưa có</span>")}</div>
      <div class="grid g2" style="margin-top:18px">${the("Thu chi theo tháng", `<table class="tb"><tr><th>Tháng</th><th class="num">Thu</th><th class="num">Chi</th><th class="num">Dòng tiền</th></tr>${d.tai_chinh.theo_thang.map(x => `<tr><td>${esc(x.thang)}</td><td class="num">${x.thu ? tien(x.thu) : "–"}</td><td class="num">${x.chi ? tien(x.chi) : "–"}</td><td class="num">${x.dong_tien ? tien(x.dong_tien) : "–"}</td></tr>`).join("")}</table>`)}
        ${the("Còn phải thu từ khách", `<div class="big-num">${tien(k.con_thu)}</div><div class="meta">Cộng cột "Còn thu" của đơn chưa huỷ (bảng 2.3)</div>`)}</div>`;
  }
  $("#dh").innerHTML = h;
}

// ---------- STORE ----------
const ST = { ds: [], nhom: "", tim: "" };
async function veStore(taiLai = true) {
  if (taiLai) ST.ds = await api("/api/store");
  const q = ST.tim.toLowerCase();
  const ds = ST.ds.filter(k => (ST.nhom === "__cai" ? k.da_cai : !ST.nhom || k.nhom === ST.nhom) && (!q || (k.ten + " " + k.mo_ta).toLowerCase().includes(q)));
  $("#st-dem").textContent = `${ST.ds.filter(k => k.da_cai).length}/${ST.ds.length} đã cài`;
  $("#store").innerHTML = ds.map(k => `<div class="card sk" data-kn="${esc(k.ten)}"><b>${esc(k.ten.replace(/^hmh-(mkt|sale|AIOS)-/, "").replace(/-/g, " "))}</b>
    <div class="tags"><span class="tag gold">${esc(k.nhom)}</span>${k.can_script.length ? '<span class="tag warn">cần script</span>' : ""}${k.can_khoa.length ? '<span class="tag warn">cần khoá</span>' : ""}${k.da_cai ? '<span class="tag ok">đã cài</span>' : ""}</div>
    <div class="ds">${esc(k.mo_ta)}</div>
    <div class="act"><span class="meta">${esc(k.ten)}</span><button class="btn ${k.da_cai ? "" : "gold"}" data-cai="${k.da_cai ? "go" : "cai"}">${k.da_cai ? "Gỡ" : "Cài"}</button></div></div>`).join("") || '<div class="empty">Không có kỹ năng nào khớp.</div>';
}
$("#st-tim").oninput = e => { ST.tim = e.target.value; veStore(false); };
$("#st-loc").onclick = e => { const b = e.target.closest("[data-n]"); if (!b) return; ST.nhom = b.dataset.n; $("#st-loc").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); veStore(false); };
$("#store").addEventListener("click", async e => {
  const card = e.target.closest("[data-kn]"); if (!card) return; const ten = card.dataset.kn, b = e.target.closest("[data-cai]");
  if (b) { await api(`/api/store/${encodeURIComponent(ten)}/${b.dataset.cai}`, { method: "POST" }); toast(b.dataset.cai === "cai" ? "Đã cài. Trợ lý dùng được ngay." : "Đã gỡ."); return veStore(); }
  const k = await api(`/api/store/${encodeURIComponent(ten)}`);
  $("#d-title").textContent = k.ten;
  $("#d-body").innerHTML = `<p class="meta">${esc(k.nhom)} · ${k.so_dong} dòng hướng dẫn${k.can_script.length ? " · script: " + esc(k.can_script.slice(0, 4).join(", ")) : ""}</p><div class="md-xem">${esc(k.noi_dung)}</div>`;
  $("#d-foot").innerHTML = `<span class="meta">${k.da_cai ? "Đã cài" : "Chưa cài"}</span><button class="btn ${k.da_cai ? "" : "gold"}" id="d-cai">${k.da_cai ? "Gỡ" : "Cài"}</button>`;
  $("#d-cai").onclick = async () => { await api(`/api/store/${encodeURIComponent(ten)}/${k.da_cai ? "go" : "cai"}`, { method: "POST" }); $("#drawer").classList.remove("open"); veStore(); };
  $("#drawer").classList.add("open");
});

// ---------- KẾT NỐI ----------
const QUYEN = [["doc", "Chỉ đọc"], ["de_xuat", "Đề xuất"], ["toan", "Toàn quyền"]];
async function veKetNoi() {
  const d = await api("/api/ket-noi");
  $("#kn").innerHTML = d.ket_noi.map(k => `<div class="card" data-k="${k.id}" style="display:flex;flex-direction:column;gap:12px">
    <div class="kn-head"><div><div class="meta">${esc(k.nhom)}</div><div class="kn-ten"><span class="st-dot ${k.thieu.length ? "bad" : k.bat ? "ok" : ""}"></span>${esc(k.ten)}</div></div>
      <label class="switch"><input type="checkbox" data-bat ${k.bat ? "checked" : ""}><i></i></label></div>
    <div class="meta">${esc(k.mo_ta)}</div>
    ${k.can.length ? `<details class="kn-khoa" ${k.thieu.length ? "open" : ""}><summary class="meta">${k.thieu.length ? `Chưa kết nối: nhập ${k.thieu.length} khoá` : "Đổi khoá"}</summary>
      ${k.can.map(t => `<label class="meta" style="display:block;margin-top:6px">${esc(t)}${k.thieu.includes(t) ? "" : " (đã có, để trống là giữ)"}<input type="password" autocomplete="off" data-khoa="${esc(t)}" style="width:100%"></label>`).join("")}
      <button class="btn" data-luu-khoa style="margin-top:8px">Lưu khoá</button></details>` : ""}
    <span class="seg" style="width:fit-content">${QUYEN.map(([v, t]) => `<button data-q="${v}" class="${k.quyen === v ? "on" : ""} ${v}">${t}</button>`).join("")}</span>
    <div class="tags">${k.cong_cu.map(c => `<span class="tag ${c.loai === "ghi" ? "gold" : ""}" title="${esc(c.mo_ta)}">${esc(c.ten)}${c.loai === "ghi" ? " ✎" : ""}</span>`).join("")}</div>
    <div class="row"><button class="btn" data-kt>Kiểm tra</button><span class="meta kq"></span></div></div>`).join("");
  $("#mcp-ds").innerHTML = d.mcp_ngoai.length ? d.mcp_ngoai.map(m => `<div class="mcp-row"><b>${esc(m.ten)}</b><code>${esc(m.url || [m.lenh, ...(m.tham_so || [])].join(" "))}</code>
    <label class="switch"><input type="checkbox" data-mbat="${esc(m.ten)}" ${m.bat ? "checked" : ""}><i></i></label><button class="btn ghost" data-mkt="${esc(m.ten)}">Kiểm tra</button><button class="btn" data-mxoa="${esc(m.ten)}">Xoá</button></div>`).join("") : '<p class="meta">Chưa có MCP ngoài nào.</p>';
  $("#kn-so1").textContent = d.ket_noi.filter(k => k.bat).length + d.mcp_ngoai.filter(m => m.bat).length;
  veThuVien();
}
$("#kn-tabs").onclick = e => { const b = e.target.closest("[data-kt2]"); if (!b) return;
  $("#kn-tabs").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  document.querySelectorAll(".kn-tab").forEach(x => x.classList.toggle("on", x.dataset.tab === b.dataset.kt2)); };
$("#kn").addEventListener("click", async e => {
  const card = e.target.closest("[data-k]"); if (!card) return; const id = card.dataset.k, q = e.target.closest("[data-q]");
  if (q) { if (q.dataset.q === "toan" && !confirm("Toàn quyền: AI sẽ ghi/thao tác THẬT trên dịch vụ này mà không chờ anh duyệt. Chắc chưa?")) return;
    await api(`/api/ket-noi/${id}`, { method: "POST", body: JSON.stringify({ quyen: q.dataset.q }) }); toast("Đã đổi quyền."); return veKetNoi(); }
  if (e.target.closest("[data-luu-khoa]")) { const khoa = {}; card.querySelectorAll("[data-khoa]").forEach(i => { if (i.value.trim()) khoa[i.dataset.khoa] = i.value.trim(); });
    if (!Object.keys(khoa).length) return toast("Chưa nhập khoá nào.");
    const r = await api(`/api/ket-noi/${id}/khoa`, { method: "POST", body: JSON.stringify({ khoa }) }); toast(r.thieu.length ? `Đã lưu, còn thiếu ${r.thieu.length} khoá.` : "Đã lưu khoá. Bấm Kiểm tra để thử."); return veKetNoi(); }
  if (e.target.closest("[data-kt]")) { const kq = card.querySelector(".kq"); kq.textContent = "Đang kiểm tra...";
    const r = await api(`/api/ket-noi/${id}/kiem-tra`, { method: "POST" }); kq.innerHTML = r.ok ? `<span style="color:var(--ok)">✓ ${esc(r.thong_bao)}</span>` : `<span class="err">${esc(r.thong_bao)}</span>`; }
});
$("#kn").addEventListener("change", async e => { if (!e.target.matches("[data-bat]")) return; const id = e.target.closest("[data-k]").dataset.k;
  await api(`/api/ket-noi/${id}`, { method: "POST", body: JSON.stringify({ bat: e.target.checked }) }); toast(e.target.checked ? "Đã bật." : "Đã tắt."); veKetNoi(); });
// ---------- Thư viện MCP (danh mục từ Javis) ----------
const MK_IC = { puzzle: "🧩", search: "🔎", mail: "✉️", "list-todo": "✅", notebook: "📓" };
let MK = [];
let MK_NHOM = "", MK_TIM = "";
async function veThuVien() {
  MK = await api("/api/mcp-kho").catch(err => { $("#mk").innerHTML = `<p class="err">Không tải được thư viện: ${esc(err.message)}</p>`; return []; });
  $("#kn-so2").textContent = MK.length;
  const nhom = [...new Set(MK.map(c => c.nhom))].sort();
  $("#mk-loc").innerHTML = `<input id="mk-tim" placeholder="Tìm kết nối (vd: lark, tiktok, github)..." value="${esc(MK_TIM)}">
    <div class="mk-nhom"><button data-nh="" class="${MK_NHOM ? "" : "on"}">Tất cả ${MK.length}</button>${nhom.map(n => `<button data-nh="${esc(n)}" class="${MK_NHOM === n ? "on" : ""}">${esc(n)}</button>`).join("")}</div>`;
  $("#mk-tim").oninput = e => { MK_TIM = e.target.value; veLuoiMK(); };
  veLuoiMK();
}
function veLuoiMK() {
  const q = MK_TIM.trim().toLowerCase();
  const ds = MK.filter(c => (!MK_NHOM || c.nhom === MK_NHOM) && (!q || (c.ten + " " + c.mo_ta + " " + c.id).toLowerCase().includes(q)))
    .sort((a, b) => (b.da_noi - a.da_noi) || (b.ho_tro - a.ho_tro) || a.ten.localeCompare(b.ten));
  $("#mk").innerHTML = ds.map(c => `<div class="card mk-the ${c.ho_tro ? "" : "mo"}" data-mk="${c.id}">
    <div class="mk-dau"><div class="mk-logo">${c.icon.startsWith("/") ? `<img src="${esc(c.icon)}" alt="">` : (MK_IC[c.icon] || "🔌")}</div>
      <div><b>${esc(c.ten)}</b><span>${esc(c.nhom)}</span></div>${c.da_noi ? '<i class="mk-ok">● ĐÃ NỐI</i>' : ""}</div>
    <div class="mk-mt">${esc(c.mo_ta)}</div>
    ${c.ho_tro ? `<button class="btn ${c.da_noi ? "" : "gold"}" data-mk-noi="${c.id}">${c.da_noi ? "Nối lại / đổi khoá" : "Kết nối"}</button>` : `<div class="meta">⏳ ${esc(c.ly_do)}</div>`}</div>`).join("") || '<p class="meta">Không có kết nối nào khớp.</p>';
}
$("#mk-loc").addEventListener("click", e => { const b = e.target.closest("[data-nh]"); if (!b) return; MK_NHOM = b.dataset.nh;
  $("#mk-loc").querySelectorAll("[data-nh]").forEach(x => x.classList.toggle("on", x === b)); veLuoiMK(); });
$("#mk").addEventListener("click", e => {
  const b = e.target.closest("[data-mk-noi]"); if (!b) return; const c = MK.find(x => x.id === b.dataset.mkNoi);
  const hop = $("#mk-hop"), box = hop.querySelector(".mk-box");
  box.innerHTML = `<div class="mk-dau"><div class="mk-logo">${c.icon.startsWith("/") ? `<img src="${esc(c.icon)}" alt="">` : (MK_IC[c.icon] || "🔌")}</div><div><b>${esc(c.ten)}</b><span>${esc(c.nhom)}</span></div></div>
    ${c.huong_dan ? `<div class="mk-hd">${esc(c.huong_dan)}</div>` : ""}${c.huong_dan_url ? `<a class="mk-link" href="${esc(c.huong_dan_url)}" target="_blank" rel="noopener">Xem hướng dẫn đầy đủ →</a>` : ""}
    <form id="mk-f">${c.truong.map(f => `<label>${esc(f.label)}${f.tuy_chon ? ' <em>(tuỳ chọn)</em>' : ""}
      ${f.nhieu_dong ? `<textarea name="${f.key}" rows="4" placeholder="${esc(f.placeholder)}" ${f.tuy_chon ? "" : "required"}></textarea>`
        : `<input name="${f.key}" type="${f.bi_mat ? "password" : "text"}" autocomplete="off" value="${esc(f.mac_dinh || "")}" placeholder="${esc(f.placeholder)}" ${f.tuy_chon ? "" : "required"}>`}</label>`).join("")}
      <div class="row"><button type="button" class="btn ghost" data-dong>Huỷ</button><button class="btn gold">Kết nối và kiểm tra</button></div><div class="meta" id="mk-tt"></div></form>`;
  hop.hidden = false;
  box.querySelector("[data-dong]").onclick = () => hop.hidden = true;
  box.querySelector("#mk-f").onsubmit = async ev => { ev.preventDefault(); const nut = ev.target.querySelector(".gold"); nut.disabled = true;
    $("#mk-tt").textContent = "Đang khởi động máy chủ MCP và bắt tay thử (lần đầu có thể mất tới 1 phút)...";
    try { const r = await api(`/api/mcp-kho/${c.id}`, { method: "POST", body: JSON.stringify({ gia_tri: Object.fromEntries(new FormData(ev.target)) }) });
      hop.hidden = true; toast(`Đã nối ${c.ten}: ${r.so_cong_cu} công cụ. Xem ở tab Đang dùng.`); veKetNoi(); }
    catch (err) { $("#mk-tt").innerHTML = `<span class="err">${esc(err.message)}</span>`; nut.disabled = false; } };
});
$("#mk-hop").addEventListener("click", e => { if (e.target.id === "mk-hop") e.currentTarget.hidden = true; });

$("#mcp-form").onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target);
  try { await api("/api/mcp-ngoai", { method: "POST", body: JSON.stringify({ ten: f.get("ten"), lenh: f.get("lenh"), url: f.get("url"), tham_so: (f.get("tham_so") || "").split(" ").filter(Boolean) }) }); e.target.reset(); toast("Đã thêm."); veKetNoi(); } catch (err) { toast(err.message); } };
$("#mcp-ds").addEventListener("click", async e => {
  const k = e.target.closest("[data-mkt]"); if (k) { k.disabled = true; k.textContent = "Đang thử..."; const r = await api(`/api/mcp-ngoai/${k.dataset.mkt}/kiem-tra`, { method: "POST" }).catch(err => ({ loi: err.message }));
    toast(r.ok ? `Chạy tốt: ${r.so_cong_cu} công cụ` : "Lỗi: " + r.loi); k.disabled = false; k.textContent = "Kiểm tra"; return; }
  const x = e.target.closest("[data-mxoa]"); if (x && confirm("Xoá MCP này?")) { await api(`/api/mcp-ngoai/${x.dataset.mxoa}/xoa`, { method: "POST" }); veKetNoi(); } });
$("#mcp-ds").addEventListener("change", async e => { const x = e.target.closest("[data-mbat]"); if (x) await api(`/api/mcp-ngoai/${x.dataset.mbat}/${x.checked ? "bat" : "tat"}`, { method: "POST" }); });

// ---------- MODELS ----------
// ---------- MODELS (bố cục theo Javis: Model chính · Nhà cung cấp · Model việc phụ) ----------
const KHIEN = on => `<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>${on ? '<path d="M8.5 12l2.5 2.5 4.5-5"/>' : ""}</svg>`;
let MD = null;
const sanSang = e => !e.chua_ho_tro && (e.loai === "api" ? e.co_khoa : e.cai && e.dang_nhap);
const tenNha = e => ({ claude: "Claude Code", codex: "ChatGPT (Codex)" }[e.id] || e.ten);
const ghiChuNha = e => e.id === "claude" ? "Qua Claude Code · công cụ OS + skill" : e.id === "codex" ? "Qua Codex · công cụ OS + skill, dùng gói ChatGPT" : "Gọi API thẳng · công cụ OS + skill (không chạy lệnh máy)";
async function veModels(noi = $("#models")) {
  const [d, g] = await Promise.all([api("/api/models"), api("/api/giong")]); MD = d;
  const cur = d.dang_dung, nhaChinh = d.engine.find(e => e.id === cur.engine) || {};
  const lv = g.cai_dat.live_lam_viec, nhaLv = lv && d.engine.find(e => e.id === lv.engine);
  const ds = d.engine.map((e, i) => ({ e, i })).sort((a, b) => (sanSang(b.e) - sanSang(a.e)) || (a.i - b.i)).map(x => x.e);
  const the = e => { const on = sanSang(e), api_ = e.loai === "api", main = cur.engine === e.id;
    const st = e.chua_ho_tro ? (e.cai ? "Đã cài · chưa nối vào OS" : "Chưa cài · chưa nối vào OS")
      : api_ ? (on ? `● Đã kết nối · ${e.models.length} model` : "○ Chưa kết nối")
      : !e.cai ? "○ Chưa cài trên máy chủ" : on ? `● Đã đăng nhập · ${e.models.length} model${e.phien_ban ? " · " + esc(e.phien_ban) : ""}` : "○ Chưa đăng nhập";
    const tacVu = api_ ? `<form class="prov-act khoa-f"><input type="password" name="khoa" autocomplete="off" placeholder="${on ? "Dán key mới để đổi" : "Dán API key"}"><button class="btn ${on ? "" : "gold"}">${on ? "Đổi key" : "Kết nối"}</button>${on ? '<button type="button" class="btn ghost" data-ngat>Ngắt</button>' : ""}</form>
        <div class="prov-ghi"><a href="${e.lay_khoa}" target="_blank" rel="noopener">Lấy key ở đâu →</a>${on ? ' · <a href="#" data-kt>Kiểm tra lại</a>' : ""}</div>`
      : e.chua_ho_tro ? `<div class="prov-ghi">${esc(e.huong_dan)}</div>`
      : on ? "" : `<div class="prov-ghi">Trên máy chủ chạy: <code>${esc(e.huong_dan.split("Đăng nhập: ")[1] || e.huong_dan)}</code></div>`;
    return `<div class="prov ${main ? "main" : ""} ${e.chua_ho_tro ? "mo" : ""}" data-e="${e.id}">
      <div class="prov-dau"><span class="khien ${on ? "on" : ""}">${KHIEN(on)}</span>
        <div class="prov-tt"><div class="prov-ten">${esc(tenNha(e))} <span class="prov-loai">${api_ ? "API key" : "Gói có sẵn"}</span></div><div class="prov-st ${on ? "on" : ""}">${st}</div></div>
        ${main ? '<span class="prov-main">CHÍNH</span>' : ""}</div>${tacVu}</div>`; };
  noi.innerHTML = `
    <div class="md-muc"><h3>◆ Model chính <span>model chính cho hội thoại</span></h3>
      <div class="card md-chinh"><div class="md-top"><b>${esc(cur.model)}</b><span class="prov-loai">${esc(tenNha(nhaChinh))}</span></div>
        <div class="meta">${esc(ghiChuNha(nhaChinh))}</div><button class="btn gold" data-doi="chinh">Đổi model ▾</button></div></div>
    <div class="md-muc"><h3>◆ Nhà cung cấp <span>đăng nhập / kết nối nhà cung cấp model</span></h3><div class="prov-ds">${ds.map(the).join("")}</div></div>
    <div class="md-muc"><h3>◆ Model làm việc của ChatGPT Live <span>việc Live giao: tra số liệu, ghi Lark, viết theo skill</span></h3>
      <div class="card md-chinh"><div class="md-top"><b>${lv ? esc(lv.model) : "Theo model chính"}</b><span class="prov-loai">${lv ? esc(nhaLv ? tenNha(nhaLv) : lv.engine) : esc(cur.model)}</span></div>
        <div class="meta">ChatGPT Live chỉ lo nói chuyện, việc cần làm giao cho model này. Chọn model nhanh (vd Claude Haiku) để Live đọc kết quả sớm.</div>
        <div class="row">${lv ? '<button class="btn ghost" data-lv-bo>Theo model chính</button>' : ""}<button class="btn" data-doi="live">Đổi ▾</button></div></div></div>
    <p class="note">Chạy nền 24/7 bằng gói Claude Pro/Max hoặc ChatGPT Plus có rủi ro bị khoá tài khoản: các hãng chỉ tính gói cho dùng cá nhân thông thường. Khi chạy nền thật, nên dùng API key.</p>`;
}
function moChonDanhSach(loai) {
  const box = $("#mpick"), tim = $("#mpick-tim"), dsEl = $("#mpick-ds"), cur = MD.dang_dung;
  const ve = () => { const q = tim.value.trim().toLowerCase();
    dsEl.innerHTML = MD.engine.filter(e => !e.chua_ho_tro).map(e => { const on = sanSang(e), ms = e.models.filter(m => !q || m.toLowerCase().includes(q) || tenNha(e).toLowerCase().includes(q));
      if (!ms.length && q) return "";
      return `<div class="mp-nha">${esc(tenNha(e))}${on ? "" : ' <span class="khoa">🔒 chưa kết nối</span>'}</div>` +
        (on ? ms.slice(0, 80).map(m => `<button class="mp-m ${loai === "chinh" && cur.engine === e.id && cur.model === m ? "on" : ""}" data-e="${e.id}" data-m="${esc(m)}">${esc(m)}</button>`).join("") : ""); }).join("") || '<div class="meta">Không thấy model nào khớp.</div>'; };
  tim.value = ""; ve(); tim.oninput = ve; box.hidden = false; box.dataset.loai = loai; setTimeout(() => tim.focus(), 50);
}
$("#mpick").onclick = async e => {
  if (e.target.id === "mpick") { e.currentTarget.hidden = true; return; }
  const b = e.target.closest(".mp-m"); if (!b) return;
  const loai = $("#mpick").dataset.loai; $("#mpick").hidden = true;
  try {
    if (loai === "live") { await api("/api/giong", { method: "POST", body: JSON.stringify({ live_lam_viec: { engine: b.dataset.e, model: b.dataset.m } }) }); toast("Model làm việc của Live: " + b.dataset.m); }
    else { const r = await api("/api/models", { method: "POST", body: JSON.stringify({ engine: b.dataset.e, model: b.dataset.m }) }); toast(`Model chính: ${r.model}`); window.capNhatBadge?.(); }
  } catch (err) { toast(err.message); }
  veModels();
};
document.addEventListener("keydown", e => { if (e.key === "Escape") $("#mpick").hidden = true; });
$("#models").addEventListener("click", async e => {
  const doi = e.target.closest("[data-doi]"); if (doi) return moChonDanhSach(doi.dataset.doi);
  if (e.target.closest("[data-lv-bo]")) { await api("/api/giong", { method: "POST", body: JSON.stringify({ live_lam_viec: null }) }); toast("Live giao việc cho model chính."); return veModels(); }
  const card = e.target.closest("[data-e]"); if (!card) return; const nha = card.dataset.e;
  if (e.target.closest("[data-kt]")) { e.preventDefault(); const r = await api(`/api/models/${nha}/kiem-tra`, { method: "POST" }); toast(r.ok ? `Key dùng được · ${r.so_model} model` : r.loi); return veModels(); }
  if (e.target.closest("[data-ngat]")) { if (!confirm("Ngắt và xoá API key này khỏi máy chủ?")) return; await api(`/api/models/${nha}/khoa`, { method: "POST", body: JSON.stringify({ khoa: "" }) }); toast("Đã ngắt."); return veModels(); }
});
$("#models").addEventListener("submit", async e => {
  if (!e.target.matches(".khoa-f")) return; e.preventDefault();
  const nha = e.target.closest("[data-e]").dataset.e, khoa = e.target.khoa.value.trim(); if (!khoa) return;
  const b = e.target.querySelector("button"); b.disabled = true; b.textContent = "Đang kiểm tra...";
  try { const r = await api(`/api/models/${nha}/khoa`, { method: "POST", body: JSON.stringify({ khoa }) }); toast(r.ok ? `Đã kết nối · ${r.so_model} model` : "Đã lưu nhưng: " + r.loi); }
  catch (err) { toast(err.message); }
  veModels();
});
async function dungModel(e) {   // thẻ model cũ trong Cài đặt → Model AI
  if (!e.target.closest("[data-dung]")) return; const card = e.target.closest("[data-e]");
  try { const r = await api("/api/models", { method: "POST", body: JSON.stringify({ engine: card.dataset.e, model: card.querySelector("[data-m]").value }) }); toast(`Model: ${r.model}`); window.capNhatBadge?.(); } catch (err) { toast(err.message); } }

// ---------- CÀI ĐẶT (thiet-ke/caidat-v2.png) ----------
const NHAN = { hoi: "HỎI", cong_cu: "CÔNG CỤ", de_xuat: "ĐỀ XUẤT", ghi: "ĐÃ CHẠY", bo: "BỎ", cau_hinh: "CẤU HÌNH" };
const IC = {
  chu: '<svg viewBox="0 0 48 48"><rect x="6" y="8" width="30" height="22" rx="3"/><path d="M12 15h18M12 21h12M14 30l-4 7 9-7"/><rect x="26" y="28" width="16" height="10" rx="2"/><path d="M29 33h10"/></svg>',
  chu_giong: '<svg viewBox="0 0 48 48"><rect x="4" y="8" width="28" height="20" rx="3"/><path d="M10 15h16M10 21h10M12 28l-4 7 9-7"/><path d="M36 22l4-3v12l-4-3h-3v-6zM43 19c2 3 2 7 0 10"/></svg>',
  live: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><path d="M14 24h2M18 19v10M22 15v18M26 18v12M30 21v6M34 23v2"/></svg>',
  ranh_tay: '<svg viewBox="0 0 48 48"><path d="M6 12c0-3 2-5 5-5h16c3 0 5 2 5 5v8c0 3-2 5-5 5H16l-7 6v-6c-2-1-3-3-3-5z"/><path d="M14 13v6M18 11v10M22 13v6"/><path d="M22 28c0 3 2 5 5 5h8l7 6v-6c2-1 3-3 3-5v-6c0-3-2-5-5-5h-4"/><path d="M30 25v5M34 23v9M38 25v5"/></svg>',
};
const SONG_IC = '<svg viewBox="0 0 32 32"><path d="M4 16h2M8 12v8M11 9v14M14 13v6M17 7v18M20 11v10M23 13v6M26 15v2"/></svg>';
const NGUOI_IC = '<svg viewBox="0 0 32 32"><circle cx="16" cy="12" r="6"/><path d="M5 28c1.5-6 6-9 11-9s9.5 3 11 9"/></svg>';
let CD_TAB = "giong";
const NAO_IC = { github: '<svg viewBox="0 0 32 32"><path d="M16 3a13 13 0 0 0-4.1 25.3c.6.1.9-.3.9-.6v-2.3c-3.6.8-4.4-1.6-4.4-1.6-.6-1.5-1.4-1.9-1.4-1.9-1.2-.8.1-.8.1-.8 1.3.1 2 1.3 2 1.3 1.2 2 3 1.4 3.8 1.1.1-.8.5-1.4.8-1.7-2.9-.3-5.9-1.4-5.9-6.4 0-1.4.5-2.6 1.3-3.5-.1-.3-.6-1.6.1-3.4 0 0 1.1-.3 3.6 1.3a12 12 0 0 1 6.5 0c2.5-1.7 3.6-1.3 3.6-1.3.7 1.8.3 3.1.1 3.4.8.9 1.3 2.1 1.3 3.5 0 5-3 6.1-5.9 6.4.5.4.9 1.2.9 2.4v3.6c0 .3.2.7.9.6A13 13 0 0 0 16 3z"/></svg>',
  local: '<svg viewBox="0 0 32 32"><rect x="5" y="5" width="22" height="9" rx="2"/><rect x="5" y="18" width="22" height="9" rx="2"/><path d="M10 9.5h2M10 22.5h2M17 9.5h6M17 22.5h6"/></svg>' };
async function veNao(noi) {
  const d = await api("/api/nao");
  const the = n => {
    const dung = d.dang_dung === n.id;
    const tt = n.loi ? `<span class="err">${esc(n.loi)}</span>` : n.co_san ? `<span style="color:var(--ok)">● Sẵn sàng</span>${n.luc_dong_bo ? " · đồng bộ " + new Date(n.luc_dong_bo * 1000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}` : "Chưa tạo, bấm Dùng để tạo";
    return `<div class="card nao-the ${dung ? "on" : ""}">
      <div class="nao-dau"><div class="av">${NAO_IC[n.kieu]}</div><div><b>${esc(n.ten)}</b><span>${n.kieu === "github" ? "GitHub · " + esc((n.repo || "").replace("git@github.com:", "").replace(/\.git$/, "")) : "Thư mục trên VPS"}</span></div>${dung ? '<i class="nao-dung">ĐANG DÙNG</i>' : ""}</div>
      <div class="meta">${esc(n.mo_ta || "")}</div>
      <div class="nao-so"><span><b>${n.so_tep ?? "-"}</b> trang</span><span><b>${n.so_nho}</b> điều nhớ</span></div>
      <div class="nao-noi">${(n.noi_luu || []).map(x => `<div><span>${esc(x.nhan)}</span><b>${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.gia_tri)}</a>` : esc(x.gia_tri)}</b>${x.ghi ? `<em>${esc(x.ghi)}</em>` : ""}</div>`).join("")}</div>
      <div class="meta">${tt}</div>
      ${(n.lich_su || []).length ? `<div class="nao-ls">${n.lich_su.slice(0, 5).map(c => `<div><code>${c.ma}</code> ${esc(c.noi_dung.slice(0, 70))} <em>${esc(c.luc)}</em>${c.ai === "Classique OS" && n.co_san ? ` <button class="lk" data-ht="${c.ma}" data-n="${n.id}" title="Hoàn tác thay đổi này">↶</button>` : ""}</div>`).join("")}</div>` : ""}
      <div class="act">${dung ? "" : `<button class="btn gold" data-chon="${n.id}">Dùng bộ não này</button>`}${n.kieu === "github" ? `<button class="btn" data-db="${n.id}">Đồng bộ ngay</button>` : ""}</div></div>`;
  };
  const canKhoa = d.ds.some(n => n.kieu === "github" && /deploy|quyền/i.test(n.loi || ""));
  noi.innerHTML = `<div class="cd-h">Bộ não</div><div class="cd-sub">Nơi trợ lý đọc kiến thức và ghi nhớ lâu dài. Chọn bộ nào thì trợ lý làm việc ở bộ đó. Mỗi lần ghi là một commit, hoàn tác được.</div>
    ${canKhoa && d.khoa_deploy ? `<div class="card nao-khoa"><b>Cấp quyền GitHub cho OS (một lần)</b><div class="meta">Mở repo → Settings → Deploy keys → Add deploy key, dán khoá dưới, BẬT "Allow write access", rồi bấm Đồng bộ ngay.</div><code>${esc(d.khoa_deploy)}</code><button class="btn" id="chep-khoa">Chép khoá</button></div>` : ""}
    <div class="nao-luoi">${d.ds.map(the).join("")}</div>
    <details class="nao-them"><summary>＋ Thêm bộ não</summary><form id="f-nao"><input name="ten" placeholder="Tên, vd Bộ não Marketing" required>
      <select name="kieu"><option value="github">GitHub</option><option value="local">Thư mục trên VPS</option></select>
      <input name="repo" placeholder="git@github.com:ten/repo.git (với GitHub)"><button class="btn gold">Thêm</button></form></details>`;
  noi.onclick = async e => {
    const b = e.target.closest("[data-chon],[data-db],[data-ht],#chep-khoa"); if (!b) return;
    if (b.id === "chep-khoa") { navigator.clipboard?.writeText(d.khoa_deploy); toast("Đã chép khoá."); return; }
    b.disabled = true;
    try {
      if (b.dataset.chon) { const r = await api("/api/nao/chon", { method: "POST", body: JSON.stringify({ id: b.dataset.chon }) }); toast(r.canh_bao ? "Đã chọn, nhưng: " + r.canh_bao : "Đã đổi bộ não."); }
      else if (b.dataset.db) { const r = await api(`/api/nao/${b.dataset.db}/dong-bo`, { method: "POST" }); toast(r.ok ? "Đã đồng bộ." : r.loi); }
      else if (b.dataset.ht && confirm("Hoàn tác thay đổi " + b.dataset.ht + "?")) { await api(`/api/nao/${b.dataset.n}/hoan-tac`, { method: "POST", body: JSON.stringify({ ma: b.dataset.ht }) }); toast("Đã hoàn tác."); }
    } catch (err) { toast(err.message); }
    veNao(noi); veNho(); capNhatNao();
  };
  $("#f-nao").onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { await api("/api/nao/them", { method: "POST", body: JSON.stringify(f) }); toast("Đã thêm bộ não."); veNao(noi); } catch (err) { toast(err.message); } };
}
async function veCaiDat() {
  veNho();
  $("#cd-tabs").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.c === CD_TAB));
  const noi = $("#cd-noi");
  if (CD_TAB === "giong") {
    const g = await api("/api/giong"), c = g.cai_dat, td = c.toc_do;
    const moTa = { chu: "Gọn gàng, im lặng", chu_giong: "Vừa hiện chữ, vừa đọc", ranh_tay: "Như gọi điện, đáp ngay", live: "Giọng thật ChatGPT, tức thì" };
    noi.innerHTML = `<div class="cd-h">Cách trợ lý trả lời</div>
      <div class="mode-cards">${g.che_do.map(x => `<button class="mcard ${c.che_do === x.id ? "on" : ""}" data-cd="${x.id}">${IC[x.id] || ""}<div><b>${x.ten}</b><span>${moTa[x.id] || x.mo_ta}</span></div></button>`).join("")}</div>
      <div class="cd-h">Giọng đọc</div>
      <div class="voice-cards">${g.giong.map(x => `<div class="vcard ${c.giong === x.id ? "on" : ""}" data-gi="${x.id}"><div class="av ${x.id.startsWith("vi-") ? "" : "tim"}">${x.id.startsWith("vi-") ? SONG_IC : NGUOI_IC}</div>
        <div class="tt"><b>${x.ten}</b><span>${x.mo_ta}</span></div><button class="play" data-thu="${x.id}" title="Nghe thử"><i>▶</i>Nghe thử</button></div>`).join("")}</div>
      <div class="cd-h">Giọng ChatGPT Live</div>
      <div class="cd-sub">Dùng gói ChatGPT Plus đã đăng nhập trên máy chủ. Giọng đổi có hiệu lực từ cuộc gọi kế tiếp.</div>
      <div class="live-voices">${(g.giong_live || []).map(x => `<button class="pill ${(c.giong_live || "juniper") === x.id ? "on" : ""}" data-gl="${x.id}">${x.ten}</button>`).join("")}</div>
      <div class="tinh"><label>Model làm việc khi gọi Live<select id="live-lv"><option value="">Đang tải...</option></select></label></div>
      <div class="cd-sub">ChatGPT Live chỉ lo nói chuyện. Việc cần làm (tra số liệu, ghi Lark, viết bài theo skill) Live giao cho model này, cùng đủ công cụ và skills của OS.</div>
      <div class="cd-h">Tinh chỉnh</div>
      <div class="tinh">
        <label>Tốc độ đọc <b id="td-v">${td > 0 ? "+" : ""}${td}%</b><input type="range" min="-30" max="40" step="2" value="${td}" id="td" style="--p:${(td + 30) / 70 * 100}%"></label>
        <label>Nói chen là ngắt<button class="on-off ${c.ngat_loi ? "" : "tat"}" id="ngat">${c.ngat_loi ? "ON" : "OFF"}</button></label>
        <label>Model giọng nói<select id="model-giong">${[["haiku", "Haiku (nhanh nhất)"], ["sonnet", "Sonnet (cân bằng)"], ["opus", "Opus (sâu, chậm)"]].map(([v, t]) => `<option value="${v}" ${(c.model_giong || "haiku") === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      </div>`;
    const luu = async x => { const r = await api("/api/giong", { method: "POST", body: JSON.stringify(x) }); window.apDungGiong?.(r); return r; };
    noi.onclick = async e => {
      const thu = e.target.closest("[data-thu]"); if (thu) { e.stopPropagation(); const a = new Audio(`/api/tts?giong=${thu.dataset.thu}&chu_doc=${encodeURIComponent(`Chào ${[TOI.goi_chu || "anh", TOI.ten_chu].filter(Boolean).join(" ")}, em là trợ lý vận hành${TOI.doanh_nghiep ? " của " + TOI.doanh_nghiep : ""}. Hôm nay ${TOI.goi_chu || "anh"} cần em giúp gì ạ?`)}`); a.play(); return; }
      const cd = e.target.closest("[data-cd]"); if (cd) { await luu({ che_do: cd.dataset.cd }); return veCaiDat(); }
      const gi = e.target.closest("[data-gi]"); if (gi) { await luu({ giong: gi.dataset.gi }); return veCaiDat(); }
      const gl = e.target.closest("[data-gl]"); if (gl) { await luu({ giong_live: gl.dataset.gl }); toast("Giọng ChatGPT Live: " + gl.textContent); return veCaiDat(); }
      if (e.target.id === "ngat") { const b = e.target, bat = b.classList.contains("tat"); await luu({ ngat_loi: bat }); b.classList.toggle("tat", !bat); b.textContent = bat ? "ON" : "OFF"; }
    };
    $("#td").oninput = e => { const v = +e.target.value; $("#td-v").textContent = (v > 0 ? "+" : "") + v + "%"; e.target.style.setProperty("--p", (v + 30) / 70 * 100 + "%"); };
    $("#td").onchange = e => luu({ toc_do: +e.target.value });
    api("/api/models").then(m => { const lv = c.live_lam_viec, cur = m.dang_dung;
      const ten = e => ({ claude: "Claude Code", codex: "ChatGPT Codex" }[e.id] || e.ten);
      const ds = m.engine.filter(e => !e.chua_ho_tro && (e.loai === "api" ? e.co_khoa : e.cai && e.dang_nhap));
      $("#live-lv").innerHTML = `<option value="">Theo trang Models (${esc(cur.engine)} · ${esc(cur.model)})</option>` +
        ds.map(e => `<optgroup label="${esc(ten(e))}">${e.models.slice(0, 40).map(x => `<option value="${e.id}|${esc(x)}" ${lv && lv.engine === e.id && lv.model === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</optgroup>`).join("");
      $("#live-lv").onchange = ev => { const [engine, model] = ev.target.value.split("|"); luu({ live_lam_viec: engine ? { engine, model } : null }); toast("Model làm việc của Live: " + (engine ? engine + " · " + model : "theo trang Models")); };
    }).catch(() => {});
    $("#model-giong").onchange = e => { luu({ model_giong: e.target.value }); toast("Model giọng nói: " + e.target.value); };
  } else if (CD_TAB === "nao") {
    await veNao(noi);
  } else if (CD_TAB === "nho") {
    const ds = await api("/api/tri-nho");
    noi.innerHTML = `<div class="cd-h">Trí nhớ</div>
      <div class="cd-sub">Trợ lý nhớ theo 3 tầng: (1) trong một hội thoại, nói bằng giọng hay gõ chữ đều chung một mạch; (2) khởi động lại máy chủ vẫn nối lại đúng mạch cũ; (3) trí nhớ dài hạn ở cột bên phải, dùng cho mọi hội thoại. Anh nói "nhớ giúp em..." là trợ lý tự ghi; bấm ✕ để xoá.</div>
      <div class="grid g3">${theKpi("Điều đang nhớ", so(ds.length), "<span>trí nhớ dài hạn</span>")}${theKpi("Về anh", so(ds.filter(x => ["anh", "so_thich"].includes(x.loai)).length), "<span>sở thích, thói quen</span>")}${theKpi("Về công ty", so(ds.filter(x => ["cong_ty", "quyet_dinh"].includes(x.loai)).length), "<span>quyết định, thông tin</span>")}</div>`;
  } else if (CD_TAB === "taikhoan") {
    noi.innerHTML = `<div class="cd-h">Tài khoản</div><form id="doi-mk" class="form" style="max-width:440px"><label>Mật khẩu hiện tại<input type="password" name="cu" required autocomplete="current-password"></label><label>Mật khẩu mới (tối thiểu 10 ký tự)<input type="password" name="moi" required minlength="10" autocomplete="new-password"></label><button class="btn gold">Đổi mật khẩu</button></form>
      <div class="row" style="margin-top:22px"><button class="btn" id="cd-xuat">Đăng xuất</button></div>`;
    $("#doi-mk").onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target);
      try { await api("/api/doi-mat-khau", { method: "POST", body: JSON.stringify({ cu: f.get("cu"), moi: f.get("moi") }) }); e.target.reset(); toast("Đã đổi mật khẩu."); } catch (err) { toast(err.message); } };
    $("#cd-xuat").onclick = async () => { await api("/api/dang-xuat", { method: "POST" }); location.href = "/dang-nhap"; };
  } else if (CD_TAB === "hoat") {
    const ds = await api("/api/nhat-ky");
    noi.innerHTML = `<div class="cd-h">Hoạt động gần đây</div>` + (ds.slice(0, 60).map(e => `<div class="ev"><time>${new Date(e.luc * 1000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time><span class="k ${e.loai}">${NHAN[e.loai] || e.loai}</span><span>${esc(e.noi_dung)}</span></div>`).join("") || '<p class="meta">Chưa có hoạt động nào.</p>');
  }
}
$("#cd-tabs").onclick = e => { const b = e.target.closest("[data-c]"); if (b) { CD_TAB = b.dataset.c; veCaiDat(); } };
async function veNho() {
  const ds = await api("/api/tri-nho").catch(() => []);
  $("#nho-ds").innerHTML = ds.slice().reverse().map(x => `<div class="nho-it">${esc(x.noi_dung)}<small>${new Date(x.luc * 1000).toLocaleDateString("vi-VN")}</small><button data-xoa="${x.id}" title="Quên điều này">✕</button></div>`).join("") || '<div class="empty">Chưa nhớ gì. Anh nói "nhớ giúp em..." trong hội thoại, hoặc thêm ở dưới.</div>';
}
$("#nho-ds").onclick = async e => { const b = e.target.closest("[data-xoa]"); if (b && confirm("Xoá điều này khỏi trí nhớ?")) { await api(`/api/tri-nho/${b.dataset.xoa}/xoa`, { method: "POST" }); veNho(); if (CD_TAB === "nho") veCaiDat(); } };
$("#nho-them").onsubmit = async e => { e.preventDefault(); const v = e.target.nd.value.trim(); if (!v) return; await api("/api/tri-nho", { method: "POST", body: JSON.stringify({ noi_dung: v, loai: "khac" }) }); e.target.reset(); toast("Đã ghi nhớ."); veNho(); };

// ---------- đổi bộ não (kiến thức) + model nhanh: nút trên thanh đầu và nhãn trong khung chat ----------
let _naoCu = null;
async function capNhatNao() { try { const d = await api("/api/nao"), n = d.ds.find(x => x.id === d.dang_dung); $("#st-nao").textContent = n ? n.ten : "Bộ não";
  $("#dh-nao").innerHTML = `<span class="nao-seg-nhan">Bộ não</span>` + d.ds.map(x => `<button data-nao="${x.id}" class="${x.id === d.dang_dung ? "on" : ""}">${x.kieu === "github" ? "⎇ " : "▤ "}${esc(x.ten)}</button>`).join("");
  if (_naoCu && _naoCu !== d.dang_dung) window.taiLaiDoThi?.(); _naoCu = d.dang_dung; } catch (e) {} }
async function moChonModel(ev) {
  ev.stopPropagation();
  const pop = $("#pop-model"), nut = ev.currentTarget;
  if (!pop.hidden && pop.dataset.tu === nut.id) { pop.hidden = true; return; }
  pop.dataset.tu = nut.id;
  const [m, g, nao] = await Promise.all([api("/api/models"), api("/api/giong"), api("/api/nao")]), cur = m.dang_dung, mg = g.cai_dat.model_giong || "haiku";
  const phanNao = `<h4>BỘ NÃO · NƠI ĐỌC VÀ GHI KIẾN THỨC</h4><div class="mo">${nao.ds.map(n => `<button data-nao="${n.id}" class="${nao.dang_dung === n.id ? "on" : ""}">${n.kieu === "github" ? "GitHub · " : "VPS · "}${esc(n.ten)}</button>`).join("")}</div>
    <div class="ghi"><a href="#" data-qlnao>Quản lý bộ não →</a></div>`;
  if (nut.id === "chip-nao") { pop.innerHTML = phanNao; }
  else pop.innerHTML = phanNao + `<h4 style="margin-top:16px">MODEL KHI GÕ CHỮ</h4>${m.engine.filter(e => !e.chua_ho_tro && (e.loai !== "api" || e.co_khoa)).map(e => `<div class="eng-h">${esc(e.ten)}<span>${!e.cai ? "chưa cài" : e.dang_nhap ? "● sẵn sàng" : "chưa đăng nhập"}</span></div>
      <div class="mo">${e.models.map(x => `<button data-e="${e.id}" data-m="${esc(x)}" class="${cur.engine === e.id && cur.model === x ? "on" : ""}" ${e.cai && e.dang_nhap ? "" : "disabled"}>${esc(x)}</button>`).join("")}</div>`).join("")}
    <h4 style="margin-top:16px">MODEL KHI NÓI CHUYỆN</h4><div class="mo">${[["haiku", "Haiku · nhanh"], ["sonnet", "Sonnet · cân bằng"], ["opus", "Opus · sâu"]].map(([v, t]) => `<button data-g="${v}" class="${mg === v ? "on" : ""}">${t}</button>`).join("")}</div>
    <div class="ghi">Đổi model thì hội thoại mở mạch mới nhưng vẫn mang theo 20 lượt gần nhất.</div>`;
  const r = nut.getBoundingClientRect();
  pop.style.left = Math.max(12, Math.min(innerWidth - 352, r.left + r.width / 2 - 170)) + "px"; pop.style.top = (r.bottom + 8) + "px"; pop.hidden = false;
}
$("#chip-model").onclick = moChonModel;
$("#chip-nao").onclick = moChonModel;
$("#dh-nao").onclick = async e => { const b = e.target.closest("[data-nao]"); if (!b || b.classList.contains("on")) return;
  b.textContent = "Đang chuyển..."; try { const r = await api("/api/nao/chon", { method: "POST", body: JSON.stringify({ id: b.dataset.nao }) }); toast(r.canh_bao ? "Đã chọn, nhưng: " + r.canh_bao : "Đã đổi bộ não."); } catch (err) { toast(err.message); } capNhatNao(); };
capNhatNao();
$("#pop-model").onclick = async e => {
  e.stopPropagation();
  if (e.target.closest("[data-qlnao]")) { e.preventDefault(); $("#pop-model").hidden = true; moTrang("nao"); return; }
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.nao) { b.textContent = "Đang chuyển..."; try { const r = await api("/api/nao/chon", { method: "POST", body: JSON.stringify({ id: b.dataset.nao }) }); toast(r.canh_bao ? "Đã chọn, nhưng: " + r.canh_bao : "Đã đổi bộ não."); } catch (err) { toast(err.message); } capNhatNao(); if (document.body.classList.contains("p-nao")) veNao($("#nao-trang")); }
  if (b.dataset.e) { const r = await api("/api/models", { method: "POST", body: JSON.stringify({ engine: b.dataset.e, model: b.dataset.m }) }); toast(`Model chữ: ${r.model}`); window.capNhatBadge?.(); }
  if (b.dataset.g) { const r = await api("/api/giong", { method: "POST", body: JSON.stringify({ model_giong: b.dataset.g }) }); window.apDungGiong?.(r); toast(`Model nói chuyện: ${b.dataset.g}`); }
  $("#pop-model").hidden = true;
};
document.addEventListener("click", e => { if (!e.target.closest("#pop-model, #chip-model, #chip-nao")) $("#pop-model").hidden = true; });

document.body.classList.add("p-dieuhanh");
if (window.LoiAI) LoiAI.nen($("#nen"));
taiDieuHanh();
