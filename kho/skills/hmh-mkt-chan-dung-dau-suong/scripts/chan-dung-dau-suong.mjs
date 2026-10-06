#!/usr/bin/env node
// hmh-mkt-chan-dung-dau-suong — ENGINE (zero-dep, ESM)
// Dựng chân dung khách hàng + xếp hạng Nỗi đau / Sự sung sướng + gom CỤM NỘI DUNG.
// Grounded: Ryan Deiss (Before-After Grid), Eugene Schwartz (mass desire),
//           Adele Revella/HubSpot (buyer persona), Alex Hormozi (Value Equation),
//           Tony Robbins (pain↔pleasure), Russell Brunson (Dream 100 — kênh phân phối).
//
// CÔNG THỨC XẾP HẠNG
//   Nỗi đau:      điểm = cuongDo × phoBien × taiGiaiQuyet            (đau nhất + nhiều người + ta giải được → ưu tiên)
//   Sự sung sướng (Hormozi Value Equation):
//                 giá trị = (khatKhao × khaThi) / (doTre × congSuc)  (mơ ước cao, khả thi cao, ít thời gian, ít công sức)
//
// CÁCH DÙNG
//   node chan-dung-dau-suong.mjs <input.json> [--md <file.md>]
//   node chan-dung-dau-suong.mjs --demo [--md]

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------- QuickSort (đúng tinh thần framework gốc: "dùng QuickSort xếp theo mức ảnh hưởng") ----------
// Sắp giảm dần theo khoá `key`; tie-break theo tên để KẾT QUẢ ỔN ĐỊNH (deterministic).
function quickSortDesc(arr, key) {
  if (arr.length <= 1) return arr.slice();
  const a = arr.slice();
  const pivot = a[Math.floor(a.length / 2)];
  const pv = key(pivot);
  const greater = [], equal = [], less = [];
  for (const x of a) {
    const v = key(x);
    if (v > pv) greater.push(x);
    else if (v < pv) less.push(x);
    else equal.push(x);
  }
  equal.sort((m, n) => String(m.ten).localeCompare(String(n.ten), 'vi'));
  return [...quickSortDesc(greater, key), ...equal, ...quickSortDesc(less, key)];
}

const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

export function phanTich(input) {
  const sp = input.sanPham || '(chưa nêu sản phẩm)';
  const tt = input.thiTruong || '(chưa nêu thị trường)';
  const cd = input.chanDung || {};
  const canhBao = [];

  // --- Nỗi đau ---
  const noiDau = (input.noiDau || []).map((p, i) => {
    const cuongDo = clamp(p.cuongDo, 1, 10);
    const phoBien = clamp(p.phoBien, 1, 10);
    const taiGiaiQuyet = clamp(p.taiGiaiQuyet, 1, 10); // 1=ta gần như không giải được … 10=ta giải triệt để
    const diem = cuongDo * phoBien * taiGiaiQuyet;     // 1..1000
    if (taiGiaiQuyet <= 3) canhBao.push(`Nỗi đau "${p.ten}" ta khó giải (taiGiaiQuyet=${taiGiaiQuyet}) — cân nhắc không làm content trụ quanh nó.`);
    return { idx: i, ten: p.ten, cuongDo, phoBien, taiGiaiQuyet, diem, ghiChu: p.ghiChu || '' };
  });

  // --- Sự sung sướng (Value Equation) ---
  const sungSuong = (input.sungSuong || []).map((q, i) => {
    const khatKhao = clamp(q.khatKhao, 1, 10);  // Dream Outcome
    const khaThi   = clamp(q.khaThi, 1, 10);     // Perceived Likelihood
    const doTre    = clamp(q.doTre, 1, 10);      // Time Delay
    const congSuc  = clamp(q.congSuc, 1, 10);    // Effort & Sacrifice
    const giaTri   = (khatKhao * khaThi) / (doTre * congSuc); // Hormozi
    return {
      idx: i, ten: q.ten, khatKhao, khaThi, doTre, congSuc,
      giaTri: r2(giaTri),
      doiUngNoiDau: Number.isInteger(q.doiUngNoiDau) ? q.doiUngNoiDau : null,
      ghiChu: q.ghiChu || '',
    };
  });

  const traiNghiem = input.traiNghiem || []; // ["Nhanh","An toàn","Không đau đớn"...]

  // Xếp hạng bằng QuickSort
  const noiDauXep = quickSortDesc(noiDau, (x) => x.diem);
  const sungSuongXep = quickSortDesc(sungSuong, (x) => x.giaTri);

  // --- Gom CỤM NỘI DUNG ---
  // Mỗi cụm = 1 nỗi đau (đã ưu tiên) + sự sung sướng đối ứng (theo doiUngNoiDau, nếu không có thì ghép theo hạng).
  const dungSung = new Set();
  const cumNoiDung = noiDauXep.map((dau, rank) => {
    let sung = sungSuong.find((s) => s.doiUngNoiDau === dau.idx && !dungSung.has(s.idx));
    if (!sung) sung = sungSuongXep.find((s) => !dungSung.has(s.idx)); // ghép theo hạng nếu chưa khai báo đối ứng
    if (sung) dungSung.add(sung.idx);
    return {
      hang: rank + 1,
      dau,
      sung: sung || null,
      goiYNoiDung: goiYContent(dau, sung, traiNghiem, sp),
    };
  });

  const chanDungThieu = ['viTri', 'tuoi', 'gioiTinh', 'soThich', 'kenhThongTin', 'thoiQuen', 'thuNhap']
    .filter((k) => !cd[k]);
  if (chanDungThieu.length) canhBao.push(`Chân dung còn thiếu ${chanDungThieu.length}/7 tiêu chí: ${chanDungThieu.join(', ')}.`);
  if (!noiDau.length) canhBao.push('Chưa có nỗi đau nào — không thể dựng cụm nội dung.');
  if (!sungSuong.length) canhBao.push('Chưa có sự sung sướng nào — bản đồ thiếu một nửa động lực (Tony Robbins).');

  return { sanPham: sp, thiTruong: tt, chanDung: cd, traiNghiem, noiDauXep, sungSuongXep, cumNoiDung, canhBao };
}

function goiYContent(dau, sung, traiNghiem, sp) {
  const tn = traiNghiem.length ? traiNghiem.join(', ') : 'nhanh, an toàn, dễ làm';
  const tenSung = sung ? sung.ten : 'kết quả mơ ước';
  return [
    `Bài VẠCH NỖI ĐAU: gọi tên "${dau.ten}" — khuấy cho khách thấy rõ cái giá của việc kệ nó.`,
    `Bài KHÁT KHAO: vẽ bức tranh "${tenSung}" — trạng thái After khách mơ ước.`,
    `Bài CẦU NỐI: câu chuyện/kinh nghiệm đi từ "${dau.ten}" → "${tenSung}", nhấn trải nghiệm khách mong (${tn}).`,
    `Bài CHỨNG MINH: ${sp} giúp đạt điều đó với trải nghiệm ${tn} (case study / demo / con số).`,
  ];
}

function clamp(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

// ---------- Render Markdown ----------
export function renderMarkdown(R) {
  const L = [];
  L.push(`# Chân dung & Bản đồ Nỗi đau ↔ Sự sung sướng`);
  L.push('');
  L.push(`- **Sản phẩm:** ${R.sanPham}`);
  L.push(`- **Thị trường mục tiêu:** ${R.thiTruong}`);
  L.push('');
  L.push(`## 1. Chân dung khách hàng (7 tiêu chí — buyer persona)`);
  const cdRows = [
    ['Vị trí địa lý', R.chanDung.viTri],
    ['Độ tuổi', R.chanDung.tuoi],
    ['Giới tính', R.chanDung.gioiTinh],
    ['Sở thích', R.chanDung.soThich],
    ['Kênh tìm thông tin', R.chanDung.kenhThongTin],
    ['Thói quen', R.chanDung.thoiQuen],
    ['Thu nhập/tháng', R.chanDung.thuNhap],
  ];
  L.push('| Tiêu chí | Mô tả |');
  L.push('|---|---|');
  for (const [k, v] of cdRows) L.push(`| ${k} | ${v || '_(chưa có)_'} |`);
  L.push('');

  L.push(`## 2. Nỗi đau — xếp theo mức ảnh hưởng (cường độ × phổ biến × ta-giải-được)`);
  L.push('| # | Nỗi đau | Cường độ | Phổ biến | Ta giải được | **Điểm** |');
  L.push('|---|---|---|---|---|---|');
  R.noiDauXep.forEach((d, i) => L.push(`| ${i + 1} | ${d.ten} | ${d.cuongDo} | ${d.phoBien} | ${d.taiGiaiQuyet} | **${d.diem}** |`));
  L.push('');

  L.push(`## 3. Sự sung sướng — xếp theo Value Equation (Hormozi)`);
  L.push(`> giá trị = (Khát khao × Khả thi) / (Độ trễ × Công sức)`);
  L.push('');
  L.push('| # | Sự sung sướng | Khát khao | Khả thi | Độ trễ | Công sức | **Giá trị** |');
  L.push('|---|---|---|---|---|---|---|');
  R.sungSuongXep.forEach((s, i) => L.push(`| ${i + 1} | ${s.ten} | ${s.khatKhao} | ${s.khaThi} | ${s.doTre} | ${s.congSuc} | **${s.giaTri}** |`));
  L.push('');

  if (R.traiNghiem.length) {
    L.push(`## 4. Trải nghiệm khách mong khi đổi đau lấy sướng`);
    L.push(R.traiNghiem.map((t) => `- ${t}`).join('\n'));
    L.push('');
  }

  L.push(`## 5. CỤM NỘI DUNG (mỗi cụm = 1 bộ video/blog/post)`);
  R.cumNoiDung.forEach((c) => {
    const tenSung = c.sung ? c.sung.ten : '(chưa ghép sung sướng)';
    L.push(`### Cụm #${c.hang}: ${c.dau.ten}  →  ${tenSung}`);
    L.push(`*Nỗi đau (điểm ${c.dau.diem})* ⇄ *Sung sướng (giá trị ${c.sung ? c.sung.giaTri : '—'})*`);
    c.goiYNoiDung.forEach((g, i) => L.push(`${i + 1}. ${g}`));
    L.push('');
  });

  if (R.canhBao.length) {
    L.push(`## ⚠️ Cảnh báo / điểm cần kiểm chứng`);
    R.canhBao.forEach((w) => L.push(`- ${w}`));
    L.push('');
    L.push(`> Lưu ý gốc (Eugene Schwartz): nỗi đau & khát khao phải là cái **có thật** trong thị trường — đi hỏi/nghe khách, đừng bịa.`);
  }
  return L.join('\n');
}

// ---------- DEMO ----------
export const DEMO = {
  sanPham: 'Khóa coaching giảm cân 12 tuần (online + huấn luyện viên kèm)',
  thiTruong: 'Phụ nữ 28–45 đã có con, thừa cân, bận rộn',
  chanDung: {
    viTri: 'Thành phố lớn (HN, HCM, ĐN)',
    tuoi: '28–45',
    gioiTinh: 'Nữ',
    soThich: 'Làm đẹp, thời trang, chăm con, nấu ăn lành mạnh',
    kenhThongTin: 'Facebook, TikTok, hội nhóm mẹ bỉm, YouTube review',
    thoiQuen: 'Lướt điện thoại buổi tối sau khi con ngủ, mua hàng online',
    thuNhap: '15–35 triệu/tháng',
  },
  noiDau: [
    { ten: 'Mặc đồ không vừa, mất tự tin', cuongDo: 9, phoBien: 9, taiGiaiQuyet: 8 },
    { ten: 'Mệt mỏi, ốm yếu, dễ bệnh', cuongDo: 8, phoBien: 7, taiGiaiQuyet: 7 },
    { ten: 'Đã thử nhiều cách nhưng tăng cân lại', cuongDo: 9, phoBien: 8, taiGiaiQuyet: 9 },
    { ten: 'Sợ phẫu thuật / thuốc giảm cân hại sức khỏe', cuongDo: 7, phoBien: 6, taiGiaiQuyet: 9 },
  ],
  sungSuong: [
    { ten: 'Tự tin diện đồ đẹp, được khen', khatKhao: 9, khaThi: 8, doTre: 4, congSuc: 4, doiUngNoiDau: 0 },
    { ten: 'Khỏe mạnh, nhiều năng lượng chơi với con', khatKhao: 8, khaThi: 8, doTre: 3, congSuc: 4, doiUngNoiDau: 1 },
    { ten: 'Giảm cân BỀN, không lo tăng lại', khatKhao: 9, khaThi: 7, doTre: 6, congSuc: 5, doiUngNoiDau: 2 },
    { ten: 'An tâm vì cách làm an toàn, tự nhiên', khatKhao: 7, khaThi: 9, doTre: 3, congSuc: 3, doiUngNoiDau: 3 },
  ],
  traiNghiem: ['Nhanh thấy kết quả', 'An toàn — không thuốc, không phẫu thuật', 'Không phải nhịn ăn khổ sở', 'Có người kèm sát'],
};

// ---------- CLI ----------
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  let input, mdPath = null;
  const mdIdx = args.indexOf('--md');
  if (mdIdx !== -1) mdPath = args[mdIdx + 1] && !args[mdIdx + 1].startsWith('--') ? args[mdIdx + 1] : 'AUTO';

  if (args.includes('--demo')) {
    input = DEMO;
  } else {
    const file = args.find((a) => !a.startsWith('--') && a !== mdPath);
    if (!file) {
      console.error('Cách dùng: node chan-dung-dau-suong.mjs <input.json> [--md <file.md>]  |  --demo [--md]');
      process.exit(1);
    }
    input = JSON.parse(readFileSync(file, 'utf8'));
  }

  const R = phanTich(input);
  const md = renderMarkdown(R);
  if (mdPath) {
    const out = mdPath === 'AUTO' ? 'chan-dung-dau-suong.md' : mdPath;
    writeFileSync(out, md, 'utf8');
    console.error(`✅ Đã ghi: ${out}`);
  } else {
    console.log(md);
  }
}
