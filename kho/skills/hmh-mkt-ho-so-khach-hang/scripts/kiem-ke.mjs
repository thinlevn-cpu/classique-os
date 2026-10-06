#!/usr/bin/env node
// hmh-mkt-ho-so-khach-hang — KIỂM KÊ NGUYÊN LIỆU (zero-dep, ESM)
//
// Vòng 1 của skill: quét thư mục nguyên liệu + đọc phiếu đã điền, rồi trả lời đúng
// một câu hỏi — "với chừng này nguyên liệu, dựng được hồ sơ ở mức nào?"
//
// Chạy deterministic để mức chấm KHÔNG đổi giữa hai lần chạy, và để mọi tệp
// được đánh MÃ BẰNG CHỨNG cố định (FB-01, Q-01…) — cái neo cho luật grounding.
//
// CÁCH DÙNG
//   node kiem-ke.mjs [thư-mục] [--md <file.md>] [--json]
//   node kiem-ke.mjs raw/hskh --md output/2026-08-07-hskh-abc/KIEM-KE.md
//
// Mặc định thư mục = raw/hskh

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

// ---------- 6 loại nguyên liệu (theo quy trình v2, Bước 0) ----------
// `can`   = số TỆP tối thiểu để coi loại đó là có mặt. Cố ý để thấp:
//           một tệp .txt có thể chứa 30 câu hỏi, đếm tệp mà đòi 10 là đếm sai đơn vị.
// `canMau`= số MẨU nên có — thứ người đọc phải tự đối chiếu, script không đếm hộ được.
// `ma`    = tiền tố mã bằng chứng.
const LOAI = [
  {
    id: 1, ma: 'FB', ten: 'Feedback/review thật có tên', can: 2, canMau: '10–20 cái', batBuoc: true,
    layODau: 'Fanpage, group, Zalo, tin nhắn — chụp màn hình cũng được',
    tuKhoa: ['feedback', 'review', 'danhgia', 'danh-gia', 'camnhan', 'cam-nhan', 'testimonial', 'fb-', 'khen'],
  },
  {
    id: 2, ma: 'Q', ten: 'Câu hỏi nguyên văn của khách', can: 1, canMau: '20–30 câu', batBuoc: true,
    layODau: 'Inbox, comment, group, Zalo OA — chép nguyên chữ, không sửa văn',
    tuKhoa: ['cauhoi', 'cau-hoi', 'inbox', 'comment', 'binhluan', 'binh-luan', 'chat', 'tinnhan', 'tin-nhan', 'hoi'],
  },
  {
    id: 3, ma: 'KC', ten: 'Ca hỏi kỹ nhưng KHÔNG chốt + lý do thật', can: 1, canMau: '10–15 ca', batBuoc: false,
    layODau: 'Lịch sử tư vấn — hỏi lại sale nếu cần',
    tuKhoa: ['khongchot', 'khong-chot', 'khongmua', 'khong-mua', 'tuchoi', 'tu-choi', 'matkhach', 'mat-khach'],
  },
  {
    id: 4, ma: 'GIA', ten: 'Bảng giá + danh mục sản phẩm thật', can: 1, canMau: 'đầy đủ', batBuoc: true,
    layODau: 'File vận hành nội bộ (kể cả giá vốn — đánh dấu 🔒)',
    tuKhoa: ['gia', 'banggia', 'bang-gia', 'price', 'sanpham', 'san-pham', 'dichvu', 'dich-vu', 'menu', 'goi', 'combo'],
  },
  {
    id: 5, ma: 'DT', ten: 'Dữ liệu đối thủ + kênh của mình', can: 2, canMau: '5 đối thủ + kênh mình', batBuoc: false,
    layODau: 'Chụp màn hình 10–20 bài nổi bật mỗi bên',
    tuKhoa: ['doithu', 'doi-thu', 'competitor', 'kenh', 'fanpage', 'tiktok', 'youtube', 'website', 'thitruong', 'thi-truong'],
  },
  {
    id: 6, ma: 'DV', ten: 'Tài liệu định vị / training nội bộ', can: 1, canMau: 'có gì lấy nấy', batBuoc: false,
    layODau: 'Giáo án, slide, kịch bản sale cũ',
    tuKhoa: ['dinhvi', 'dinh-vi', 'training', 'daotao', 'dao-tao', 'kichban', 'kich-ban', 'giaoan', 'giao-an', 'slide', 'brand'],
  },
];

const ANH = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif', '.bmp', '.tiff']);
const CHU = new Set(['.md', '.txt', '.pdf', '.doc', '.docx', '.rtf', '.pages', '.csv', '.xls', '.xlsx', '.json']);
const BOQUA = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

// Bỏ dấu tiếng Việt để so tên tệp — người dùng đặt tên kiểu gì cũng bắt được.
function khongDau(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function liet(dir, goc = dir, ket = []) {
  let items;
  try {
    items = readdirSync(dir, { withFileTypes: true });
  } catch {
    return ket;
  }
  // sort để thứ tự mã bằng chứng ổn định giữa các lần chạy
  items.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) {
      liet(p, goc, ket);
      continue;
    }
    if (BOQUA.has(it.name.toLowerCase())) continue;
    let kb = 0;
    try {
      kb = Math.round(statSync(p).size / 1024);
    } catch { /* tệp biến mất giữa chừng — bỏ qua */ }
    ket.push({ ten: it.name, duongDan: path.relative(goc, p).replace(/\\/g, '/'), kb });
  }
  return ket;
}

// Đoán tệp thuộc loại nào: khớp từ khoá trong ĐƯỜNG DẪN (gồm cả tên thư mục cha).
// Không khớp được thì trả null — để người đọc tự gán, KHÔNG đoán bừa.
function doanLoai(duongDan) {
  const s = khongDau(duongDan);
  for (const l of LOAI) {
    if (l.tuKhoa.some((k) => s.includes(k))) return l;
  }
  return null;
}

// ---------- Đọc phiếu ----------
// Phiếu đánh dấu mỗi ô trả lời bằng `<!-- qN -->`; nội dung chạy tới heading kế tiếp.
export function docPhieu(noiDung) {
  const o = {};
  const re = /<!--\s*q(\d+)\s*-->/g;
  let m;
  const moc = [];
  while ((m = re.exec(noiDung)) !== null) moc.push({ so: Number(m[1]), tu: m.index + m[0].length });
  for (let i = 0; i < moc.length; i++) {
    const het = i + 1 < moc.length ? moc[i + 1].tu : noiDung.length;
    let doan = noiDung.slice(moc[i].tu, het);
    // cắt trước heading / phần chú thích của ô sau
    doan = doan.split(/\n#{2,3}\s/)[0].split(/\n---\s*\n/)[0];
    const sach = doan
      .split('\n')
      .map((d) => d.trim())
      .filter((d) => d && !d.startsWith('>') && !d.startsWith('<!--') && !/^\*.*\*$/.test(d))
      .join('\n')
      .trim();
    o[moc[i].so] = sach;
  }
  return o;
}

function demDong(s) {
  if (!s) return 0;
  return s.split('\n').filter((d) => d.trim()).length;
}

// ---------- Chấm mức ----------
function cham({ dem, phieu }) {
  // Một loại được coi là CÓ khi: phiếu đã trả lời ô tương ứng, HOẶC đủ số tệp `can`.
  // Dùng đúng ngưỡng của bảng bên dưới để mức chấm và bảng không nói hai chuyện khác nhau.
  const du = (id) => dem[id] >= LOAI.find((l) => l.id === id).can;
  const coGiongKhach = Boolean(phieu[8]) || du(2);           // câu hỏi nguyên văn
  const coFeedback = Boolean(phieu[12]) || du(1);            // bằng chứng có tên
  const coKhongChot = Boolean(phieu[9]) || du(3);            // ca không chốt
  const coGia = Boolean(phieu[4]) || du(4);                  // bảng giá
  // Loại 5 & 6 KHÔNG cho phiếu thay thế: ba cái tên đối thủ gõ trong phiếu không phải
  // là dữ liệu kênh, và mức A (chiến lược) mà dựng trên trí nhớ thì chỉ là mức B đội mũ.
  const coDoiThu = du(5);
  const coDinhVi = du(6);

  let muc, nghia;
  if (!coGiongKhach || !coFeedback) {
    muc = 'D';
    nghia = 'THIẾU GIỌNG KHÁCH — hồ sơ dựng ra sẽ phần lớn là suy luận. Vẫn chạy được, nhưng mọi chương tâm lý phải đánh ⚠️ và chương khoảng trống sẽ dài hơn phần nội dung.';
  } else if (coGiongKhach && coFeedback && coGia && coKhongChot && coDoiThu && coDinhVi) {
    muc = 'A';
    nghia = 'Đủ nguyên liệu dựng hồ sơ CHIẾN LƯỢC — dùng được cho ngách, định vị và thiết kế offer.';
  } else if (coGiongKhach && coFeedback && coGia && coKhongChot) {
    muc = 'B';
    nghia = 'Đủ nguyên liệu dựng hồ sơ dùng cho CẢ CONTENT LẪN SALE.';
  } else {
    muc = 'C';
    nghia = 'Đủ nguyên liệu dựng hồ sơ dùng cho CONTENT; phần sale (phản đối, lý do từ chối) còn yếu.';
  }
  return { muc, nghia, co: { coGiongKhach, coFeedback, coKhongChot, coGia, coDoiThu, coDinhVi } };
}

export function kiemKe(thuMuc) {
  const duongDanPhieu = ['PHIEU-HSKH.md', 'phieu-hskh.md', 'PHIEU.md']
    .map((f) => path.join(thuMuc, f))
    .find((p) => existsSync(p));

  const phieu = duongDanPhieu ? docPhieu(readFileSync(duongDanPhieu, 'utf8')) : {};

  const thuMucNL = ['nguyen-lieu', 'nguyenlieu', 'tai-lieu']
    .map((d) => path.join(thuMuc, d))
    .find((p) => existsSync(p));

  // Không có thư mục con thì quét thẳng thư mục gốc (trừ chính cái phiếu).
  const goc = thuMucNL || thuMuc;
  const tep = liet(goc, goc).filter((t) => !/^phieu(-hskh)?\.md$/i.test(t.ten));

  // Gán mã bằng chứng theo loại, thứ tự ổn định.
  const dem = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const chuaRo = [];
  for (const t of tep) {
    const l = doanLoai(t.duongDan);
    const ext = path.extname(t.ten).toLowerCase();
    t.dang = ANH.has(ext) ? 'ảnh' : CHU.has(ext) ? 'văn bản' : 'khác';
    if (l) {
      dem[l.id] += 1;
      t.ma = `${l.ma}-${String(dem[l.id]).padStart(2, '0')}`;
      t.loai = l.id;
    } else {
      chuaRo.push(t);
      t.ma = '—';
      t.loai = 0;
    }
  }

  const ketQua = cham({ dem, phieu });
  const oDaDien = Object.keys(phieu).filter((k) => phieu[k]).length;
  const oBatBuoc = [8, 9, 10, 12].filter((k) => phieu[k]);

  return {
    thuMuc, duongDanPhieu, thuMucNguyenLieu: thuMucNL,
    phieu: { oDaDien, tongO: 19, oBatBuocDaDien: oBatBuoc, soDongCauHoi: demDong(phieu[8]), soDongKhongChot: demDong(phieu[9]), soDongFeedback: demDong(phieu[12]) },
    tep, chuaRo, dem, ...ketQua,
  };
}

// ---------- Render ----------
export function renderMarkdown(k) {
  const d = new Date().toISOString().slice(0, 10);
  const L = [];
  L.push(`# Kiểm kê nguyên liệu — hồ sơ khách hàng`, '');
  L.push(`> Quét \`${k.thuMuc}\` ngày ${d}. Bảng này là **cổng vào** của hồ sơ: nó nói thẳng`);
  L.push(`> hồ sơ sắp dựng đứng trên bao nhiêu bằng chứng thật.`, '');
  L.push(`## Mức: ${k.muc}`, '', k.nghia, '');

  L.push('## Phiếu', '');
  if (!k.duongDanPhieu) {
    L.push('⛔ **Chưa có `PHIEU-HSKH.md`.** Tải phiếu ở trienkhaihskh.hoangminhhoa.com, điền rồi lưu vào thư mục này.', '');
  } else {
    L.push(`- Đã điền **${k.phieu.oDaDien}/${k.phieu.tongO}** ô.`);
    L.push(`- Ô bắt buộc (8 · 9 · 10 · 12): đã điền **${k.phieu.oBatBuocDaDien.length}/4** — ${k.phieu.oBatBuocDaDien.join(' · ') || 'chưa ô nào'}.`);
    L.push(`- Câu hỏi nguyên văn: ${k.phieu.soDongCauHoi} dòng · Ca không chốt: ${k.phieu.soDongKhongChot} dòng · Feedback dán tay: ${k.phieu.soDongFeedback} dòng.`, '');
  }

  L.push('## Sáu loại nguyên liệu', '');
  L.push('| # | Loại | Nên có | Đang có | Đủ? | Thiếu thì lấy ở đâu |');
  L.push('|---|---|---|---|---|---|');
  for (const l of LOAI) {
    const co = k.dem[l.id];
    const themPhieu = l.id === 1 && k.phieu.soDongFeedback ? ` + ${k.phieu.soDongFeedback} dòng phiếu`
      : l.id === 2 && k.phieu.soDongCauHoi ? ` + ${k.phieu.soDongCauHoi} dòng phiếu`
      : l.id === 3 && k.phieu.soDongKhongChot ? ` + ${k.phieu.soDongKhongChot} dòng phiếu` : '';
    const dat = co >= l.can || themPhieu;
    L.push(`| ${l.id} | ${l.ten} | ${l.canMau} | ${co} tệp${themPhieu} | ${dat ? '✅' : l.batBuoc ? '🔴' : '🟡'} | ${l.layODau} |`);
  }
  L.push('');
  L.push('> Cột "Đang có" đếm **tệp**, cột "Nên có" đếm **mẩu** — một tệp có thể chứa nhiều mẩu.');
  L.push('> Máy đọc nội dung từng tệp ở vòng sau để biết số mẩu thật.', '');

  L.push('## Mã bằng chứng — dùng để neo mọi luận điểm', '');
  if (!k.tep.length) {
    L.push('_Chưa có tệp nào trong thư mục nguyên liệu._', '');
  } else {
    L.push('| Mã | Tệp | Dạng | KB |');
    L.push('|---|---|---|---|');
    for (const t of k.tep) L.push(`| \`${t.ma}\` | ${t.duongDan} | ${t.dang} | ${t.kb} |`);
    L.push('');
  }
  if (k.chuaRo.length) {
    L.push(`> ⚠️ ${k.chuaRo.length} tệp chưa đoán được thuộc loại nào (tên tệp không có từ khoá).`);
    L.push('> Máy vẫn đọc nội dung để phân loại, nhưng đặt tên có từ khoá thì nhanh và chắc hơn:');
    L.push('> `feedback-…`, `cauhoi-…`, `khongchot-…`, `banggia-…`, `doithu-…`, `dinhvi-…`.', '');
  }

  L.push('## Việc cần bổ sung', '');
  const buPhieu = { 1: k.phieu.soDongFeedback, 2: k.phieu.soDongCauHoi, 3: k.phieu.soDongKhongChot };
  const thieu = LOAI.filter((l) => k.dem[l.id] < l.can && !buPhieu[l.id]);
  if (!thieu.length) L.push('- Không thiếu loại nào ở mức tối thiểu. Đi thẳng vòng 3 (dựng lõi).', '');
  else for (const l of thieu) L.push(`- ${l.batBuoc ? '🔴' : '🟡'} **${l.ten}** — nên có ${l.canMau}, hiện chưa có tệp nào nhận diện được. ${l.layODau}.`);
  L.push('');
  L.push('---', '', '*Sinh bởi `hmh-mkt-ho-so-khach-hang/scripts/kiem-ke.mjs` — chạy lại bất cứ lúc nào để đo lại.*');
  return L.join('\n');
}

// ---------- CLI ----------
// Chỉ chạy khi được gọi thẳng — import vào script khác thì không tự chạy.
if (process.argv[1] && path.basename(process.argv[1]) === 'kiem-ke.mjs') {
  const args = process.argv.slice(2);
  const thuMuc = args.find((a) => !a.startsWith('--')) || 'raw/hskh';
  const iMd = args.indexOf('--md');

  if (!existsSync(thuMuc)) {
    console.error(`⛔ Không thấy thư mục "${thuMuc}".\n   Tạo nó rồi thả PHIEU-HSKH.md + thư mục nguyen-lieu/ vào.`);
    process.exit(1);
  }

  const k = kiemKe(thuMuc);
  if (args.includes('--json')) {
    console.log(JSON.stringify(k, null, 2));
  } else {
    const md = renderMarkdown(k);
    if (iMd >= 0 && args[iMd + 1]) {
      writeFileSync(args[iMd + 1], md, 'utf8');
      console.log(`✓ Đã ghi ${args[iMd + 1]}`);
    }
    console.log(md);
  }
}
