#!/usr/bin/env node
// ke-hoach-loi-nhuan.mjs — Bộ não tính toán "Kế hoạch lợi nhuận & điểm hòa vốn" (9 bước CEO)
// Zero-dependency. Node ESM. Đơn vị tiền MẶC ĐỊNH: TRIỆU VNĐ (gọn cho người Việt).
//
// Cách dùng:
//   node ke-hoach-loi-nhuan.mjs <input.json>          -> in JSON kết quả ra stdout
//   node ke-hoach-loi-nhuan.mjs <input.json> --md out.md   -> kèm xuất báo cáo markdown
//   node ke-hoach-loi-nhuan.mjs --demo                -> chạy ví dụ studio áo cưới (kiểm thử)
//
// Hợp đồng INPUT (mọi tiền tính theo TRIỆU/đơn vị đã khai trong "don_vi_tien"):
// {
//   "ten_doanh_nghiep": "Studio ABC",
//   "nganh": "Chụp ảnh cưới",
//   "don_vi_tien": "triệu",                      // chỉ để ghi nhãn
//   "muc_tieu_loi_nhuan": { "nam_1": 1000, "nam_3": 3000, "nam_5": 5000 }, // lợi nhuận/NĂM
//   "san_pham": [                                  // Bước 2 & 7 (chi phí biến đổi theo đơn)
//     { "ten": "Gói A", "gia_ban": 30, "chi_phi_bien_doi": 12, "ty_trong": 0.5 }
//   ],
//   "chi_phi_co_dinh": [ { "hang_muc": "Mặt bằng", "so_tien": 30 } ],   // /THÁNG (Bước 6)
//   "nhan_su": [ { "vi_tri": "Sale", "so_luong": 3, "luong": 12 } ],     // lương/người/THÁNG (Bước 5)
//   "dau_tu_ban_dau": [ { "hang_muc": "Máy móc", "so_luong": 1, "don_gia": 50 } ] // Bước 4
// }
//
// ty_trong = tỉ trọng số ĐƠN của sản phẩm trong tổng đơn (để tính lãi gộp bình quân gia quyền).
// Nếu bỏ trống ty_trong cho mọi sản phẩm -> chia đều.

import { readFileSync, writeFileSync } from "node:fs";

const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const pct = (n) => (isFinite(n) ? r1(n * 100) : 0);
const safeDiv = (a, b) => (b === 0 || !isFinite(b) ? Infinity : a / b);

export function tinhKeHoach(input) {
  const dv = input.don_vi_tien || "triệu";
  const sp = (input.san_pham || []).map((p) => {
    const laiGop = p.gia_ban - p.chi_phi_bien_doi;
    return {
      ten: p.ten,
      gia_ban: p.gia_ban,
      chi_phi_bien_doi: p.chi_phi_bien_doi,
      ty_trong: p.ty_trong,
      lai_gop_don: r2(laiGop),                       // P - V (contribution margin / đơn)
      bien_lai_gop_pct: pct(safeDiv(laiGop, p.gia_ban)), // CM ratio
    };
  });

  // Chuẩn hoá tỉ trọng. Nếu không khai -> chia đều.
  const coTyTrong = sp.some((p) => typeof p.ty_trong === "number" && p.ty_trong > 0);
  let tongTyTrong = sp.reduce((s, p) => s + (p.ty_trong || 0), 0);
  sp.forEach((p) => {
    p.ty_trong_chuan = coTyTrong
      ? safeDiv(p.ty_trong || 0, tongTyTrong)
      : safeDiv(1, sp.length);
  });

  // Bình quân gia quyền theo tỉ trọng đơn
  const laiGopBinhQuan = sp.reduce((s, p) => s + p.lai_gop_don * p.ty_trong_chuan, 0);
  const giaBanBinhQuan = sp.reduce((s, p) => s + p.gia_ban * p.ty_trong_chuan, 0);
  const bienLaiGopBinhQuan = pct(safeDiv(laiGopBinhQuan, giaBanBinhQuan));

  // Bước 2: xếp hạng sản phẩm lợi nhuận cao nhất (theo lãi gộp/đơn)
  const xep_hang_lai_gop = [...sp]
    .sort((a, b) => b.lai_gop_don - a.lai_gop_don)
    .map((p, i) => ({ hang: i + 1, ten: p.ten, lai_gop_don: p.lai_gop_don, bien_lai_gop_pct: p.bien_lai_gop_pct }));

  // Bước 5 + 6: Chi phí cố định/tháng = các khoản cố định + tổng lương
  const luong = (input.nhan_su || []).map((n) => ({
    vi_tri: n.vi_tri,
    so_luong: n.so_luong,
    luong: n.luong,
    thanh_tien: r2(n.so_luong * n.luong),
  }));
  const tongLuong = luong.reduce((s, n) => s + n.thanh_tien, 0);
  const cpCoDinhKhac = (input.chi_phi_co_dinh || []).reduce((s, c) => s + c.so_tien, 0);
  const FC = cpCoDinhKhac + tongLuong; // chi phí cố định/tháng tổng

  // Bước 4: Vốn đầu tư ban đầu
  const dau_tu = (input.dau_tu_ban_dau || []).map((d) => ({
    hang_muc: d.hang_muc,
    so_luong: d.so_luong ?? 1,
    don_gia: d.don_gia,
    thanh_tien: r2((d.so_luong ?? 1) * d.don_gia),
  }));
  const tongDauTu = dau_tu.reduce((s, d) => s + d.thanh_tien, 0);

  // Bước 8: Điểm hoà vốn = FC / lãi gộp bình quân/đơn
  const hoaVon_don = safeDiv(FC, laiGopBinhQuan);
  const hoaVon_doanhthu = hoaVon_don * giaBanBinhQuan;

  // Bước 1 + 3: mục tiêu lợi nhuận theo năm -> /tháng -> số đơn cần
  const mt = input.muc_tieu_loi_nhuan || {};
  const kichBan = (loiNhuanNam, nhan) => {
    const loiNhuanThang = safeDiv(loiNhuanNam, 12);
    // profit = CM*Q - FC  =>  Q = (FC + profit)/CM
    const soDon = safeDiv(FC + loiNhuanThang, laiGopBinhQuan);
    const doanhThu = soDon * giaBanBinhQuan;
    const bienAnToan = pct(safeDiv(doanhThu - hoaVon_doanhthu, doanhThu)); // margin of safety
    const hoanVon_thang = safeDiv(tongDauTu, loiNhuanThang); // payback từ lợi nhuận mục tiêu
    return {
      nhan,
      loi_nhuan_nam: r0(loiNhuanNam),
      loi_nhuan_thang: r1(loiNhuanThang),
      so_don_thang: Math.ceil(soDon),
      so_don_ngay: r1(soDon / 26),                 // ~26 ngày làm việc
      doanh_thu_thang: r1(doanhThu),
      doanh_thu_nam: r0(doanhThu * 12),
      bien_an_toan_pct: bienAnToan,
      so_thang_hoan_von: isFinite(hoanVon_thang) ? r1(hoanVon_thang) : null,
    };
  };

  const kich_ban = [];
  if (mt.nam_1 != null) kich_ban.push(kichBan(mt.nam_1, "Năm 1"));
  if (mt.nam_3 != null) kich_ban.push(kichBan(mt.nam_3, "Năm 3"));
  if (mt.nam_5 != null) kich_ban.push(kichBan(mt.nam_5, "Năm 5"));

  // Cảnh báo sức khoẻ
  const canh_bao = [];
  if (laiGopBinhQuan <= 0) canh_bao.push("Lãi gộp bình quân ≤ 0: giá bán không đủ bù chi phí biến đổi — phải tăng giá hoặc giảm chi phí biến đổi trước khi tính tiếp.");
  if (FC > 0 && !isFinite(hoaVon_don)) canh_bao.push("Không tính được điểm hoà vốn vì lãi gộp/đơn = 0.");
  kich_ban.forEach((k) => {
    if (k.so_don_ngay > 50) canh_bao.push(`${k.nhan}: cần ~${k.so_don_ngay} đơn/ngày — rất cao, soát lại giá/biên lợi nhuận hoặc giãn mục tiêu.`);
    if (k.bien_an_toan_pct < 20 && k.bien_an_toan_pct >= 0) canh_bao.push(`${k.nhan}: biên an toàn chỉ ${k.bien_an_toan_pct}% — sát điểm hoà vốn, rủi ro cao.`);
  });

  return {
    meta: {
      ten_doanh_nghiep: input.ten_doanh_nghiep || "(chưa đặt tên)",
      nganh: input.nganh || "",
      don_vi_tien: dv,
    },
    san_pham: sp,
    xep_hang_lai_gop,           // Bước 2
    binh_quan: {
      gia_ban_binh_quan: r2(giaBanBinhQuan),
      lai_gop_binh_quan_don: r2(laiGopBinhQuan),
      bien_lai_gop_binh_quan_pct: bienLaiGopBinhQuan,
    },
    nhan_su: luong,             // Bước 5
    chi_phi_co_dinh_thang: {    // Bước 6
      cac_khoan_khac: r2(cpCoDinhKhac),
      tong_luong: r2(tongLuong),
      tong: r2(FC),
    },
    dau_tu_ban_dau: dau_tu,     // Bước 4
    tong_dau_tu_ban_dau: r2(tongDauTu),
    hoa_von: {                  // Bước 8
      so_don_thang: Math.ceil(hoaVon_don),
      doanh_thu_thang: r1(hoaVon_doanhthu),
    },
    kich_ban,                   // Bước 1 + 3
    canh_bao,
  };
}

// ---- Render báo cáo Markdown (hiển thị VNĐ thật, dấu phân cách kế toán) ----
export function renderMarkdown(k) {
  // Đơn vị nội bộ là triệu; quy ra đồng để hiển thị (trừ khi don_vi_tien="đồng").
  const HE_SO = (k.meta.don_vi_tien === "đồng" || k.meta.don_vi_tien === "dong") ? 1 : 1_000_000;
  const d = (x) => (Math.round(x * HE_SO)).toLocaleString("vi-VN") + " ₫";
  const L = [];
  L.push(`# Kế hoạch lợi nhuận — ${k.meta.ten_doanh_nghiep}`);
  if (k.meta.nganh) L.push(`**Ngành:** ${k.meta.nganh}  ·  **Đơn vị tiền:** VNĐ`);
  L.push("");
  L.push(`## Bước 2 — Sản phẩm & lãi gộp (xếp theo lãi gộp/đơn)`);
  L.push(`| Hạng | Sản phẩm | Giá bán | CP biến đổi | Lãi gộp/đơn | Biên lãi gộp |`);
  L.push(`|---|---|--:|--:|--:|--:|`);
  k.xep_hang_lai_gop.forEach((p) => {
    const full = k.san_pham.find((s) => s.ten === p.ten);
    L.push(`| ${p.hang} | ${p.ten} | ${d(full.gia_ban)} | ${d(full.chi_phi_bien_doi)} | **${d(p.lai_gop_don)}** | ${p.bien_lai_gop_pct}% |`);
  });
  L.push("");
  L.push(`> Sản phẩm tập trung bán: **${k.xep_hang_lai_gop[0]?.ten}** (lãi gộp cao nhất ${d(k.xep_hang_lai_gop[0]?.lai_gop_don)}/đơn). "Giá cao chưa chắc lời cao."`);
  L.push("");
  L.push(`## Bước 4 — Vốn đầu tư ban đầu`);
  L.push(`| Hạng mục | SL | Đơn giá | Thành tiền |`);
  L.push(`|---|--:|--:|--:|`);
  k.dau_tu_ban_dau.forEach((x) => L.push(`| ${x.hang_muc} | ${x.so_luong} | ${d(x.don_gia)} | ${d(x.thanh_tien)} |`));
  L.push(`| **TỔNG VỐN ĐẦU TƯ** | | | **${d(k.tong_dau_tu_ban_dau)}** |`);
  L.push("");
  L.push(`## Bước 5 + 6 — Chi phí cố định/tháng`);
  L.push(`| Vị trí/Khoản | SL | Lương/Giá | Thành tiền |`);
  L.push(`|---|--:|--:|--:|`);
  k.nhan_su.forEach((n) => L.push(`| ${n.vi_tri} | ${n.so_luong} | ${d(n.luong)} | ${d(n.thanh_tien)} |`));
  L.push(`| Các khoản cố định khác | | | ${d(k.chi_phi_co_dinh_thang.cac_khoan_khac)} |`);
  L.push(`| **TỔNG CHI PHÍ CỐ ĐỊNH/THÁNG** | | | **${d(k.chi_phi_co_dinh_thang.tong)}** |`);
  L.push("");
  L.push(`## Bước 8 — Điểm hoà vốn`);
  L.push(`- Lãi gộp bình quân/đơn: **${d(k.binh_quan.lai_gop_binh_quan_don)}** (biên ${k.binh_quan.bien_lai_gop_binh_quan_pct}%)`);
  L.push(`- **Điểm hoà vốn: ${k.hoa_von.so_don_thang} đơn/tháng** ⇄ doanh thu **${d(k.hoa_von.doanh_thu_thang)}/tháng**`);
  L.push(`- Dưới mức này là LỖ. Trên mức này mới bắt đầu có lời.`);
  L.push("");
  L.push(`## Bước 1 + 3 — Mục tiêu lợi nhuận → số đơn cần`);
  L.push(`| Mốc | LN/năm | LN/tháng | Đơn/tháng | Đơn/ngày | Doanh thu/tháng | Biên an toàn | Hoàn vốn |`);
  L.push(`|---|--:|--:|--:|--:|--:|--:|--:|`);
  k.kich_ban.forEach((s) =>
    L.push(`| ${s.nhan} | ${d(s.loi_nhuan_nam)} | ${d(s.loi_nhuan_thang)} | **${s.so_don_thang}** | ${s.so_don_ngay} | ${d(s.doanh_thu_thang)} | ${s.bien_an_toan_pct}% | ${s.so_thang_hoan_von ?? "—"} tháng |`)
  );
  L.push("");
  if (k.canh_bao.length) {
    L.push(`## ⚠️ Cảnh báo`);
    k.canh_bao.forEach((c) => L.push(`- ${c}`));
    L.push("");
  }
  L.push(`---`);
  L.push(`_Công thức: Lãi gộp = Giá bán − CP biến đổi · Điểm hoà vốn Q = FC / (P−V) · Số đơn đạt mục tiêu = (FC + LN mục tiêu) / (P−V)._`);
  return L.join("\n");
}

const DEMO = {
  ten_doanh_nghiep: "Studio Áo Cưới Demo",
  nganh: "Chụp ảnh cưới",
  don_vi_tien: "triệu",
  muc_tieu_loi_nhuan: { nam_1: 1200, nam_3: 3600, nam_5: 6000 },
  san_pham: [
    { ten: "Gói Cơ bản", gia_ban: 15, chi_phi_bien_doi: 7, ty_trong: 0.5 },
    { ten: "Gói Cao cấp", gia_ban: 40, chi_phi_bien_doi: 18, ty_trong: 0.3 },
    { ten: "Gói VIP", gia_ban: 80, chi_phi_bien_doi: 35, ty_trong: 0.2 },
  ],
  chi_phi_co_dinh: [
    { hang_muc: "Thuê mặt bằng", so_tien: 40 },
    { hang_muc: "Điện nước - internet", so_tien: 8 },
    { hang_muc: "Phần mềm + kế toán", so_tien: 6 },
    { hang_muc: "Khấu hao thiết bị", so_tien: 10 },
  ],
  nhan_su: [
    { vi_tri: "Sale", so_luong: 2, luong: 10 },
    { vi_tri: "Photographer", so_luong: 2, luong: 15 },
    { vi_tri: "Retoucher", so_luong: 1, luong: 12 },
    { vi_tri: "Quản lý", so_luong: 1, luong: 20 },
  ],
  dau_tu_ban_dau: [
    { hang_muc: "Máy ảnh + ống kính", so_luong: 2, don_gia: 60 },
    { hang_muc: "Nội thất + setup studio", so_luong: 1, don_gia: 200 },
    { hang_muc: "Máy tính + phần mềm", so_luong: 3, don_gia: 25 },
    { hang_muc: "Biển bảng + khai trương", so_luong: 1, don_gia: 50 },
  ],
};

// ---- CLI ----
const args = process.argv.slice(2);
if (args.includes("--demo") || args.length === 0) {
  const k = tinhKeHoach(DEMO);
  if (args.includes("--md")) {
    console.log(renderMarkdown(k));
  } else {
    console.log(JSON.stringify(k, null, 2));
    console.error("\n--- (chạy với --md để xem báo cáo markdown; truyền file input.json để tính thật) ---");
  }
} else {
  const file = args[0];
  const input = JSON.parse(readFileSync(file, "utf8"));
  const k = tinhKeHoach(input);
  const mdIdx = args.indexOf("--md");
  if (mdIdx !== -1 && args[mdIdx + 1]) {
    writeFileSync(args[mdIdx + 1], renderMarkdown(k), "utf8");
    console.error(`Đã ghi báo cáo: ${args[mdIdx + 1]}`);
  }
  console.log(JSON.stringify(k, null, 2));
}
