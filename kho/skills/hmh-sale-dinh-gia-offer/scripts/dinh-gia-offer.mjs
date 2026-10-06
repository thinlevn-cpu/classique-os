#!/usr/bin/env node
// dinh-gia-offer.mjs — Engine ĐỊNH GIÁ & THIẾT KẾ OFFER (grounded Alex Hormozi $100M Offers).
// Tính: điểm Value Equation + solution stack + sàn/trần giá + bảng giá 3 tầng (lãi gộp mỗi tầng).
// Zero-dep. Đơn vị tiền khai theo TRIỆU; hiển thị quy ra VNĐ.
//
// Dùng:
//   node dinh-gia-offer.mjs <input.json> --md out.md
//   node dinh-gia-offer.mjs --demo [--md out.md]
//
// INPUT (xem DEMO ở cuối file để biết cấu trúc đầy đủ):
//   value_equation: {ket_qua, niem_tin, thoi_gian, cong_suc} mỗi cái 1-10 (10 = tốt nhất cho giá trị;
//       thoi_gian 10=nhanh, cong_suc 10=dễ).
//   gia_tri_quy_tien: giá trị khách NHẬN quy ra tiền (triệu) — để tính trần giá theo giá trị.
//   ty_le_gia_tri: tỷ lệ giá trên giá trị (mặc định 0.2 = bán ở ~20% giá trị cảm nhận).
//   chi_phi_bien_doi_core + bien_mong_muon: để tính SÀN giá (không lỗ biên mục tiêu).
//   van_de_giai_phap: [{van_de, giai_phap, gia_tri}] — solution stack.
//   tiers: [{ten, gia, chi_phi_bien_doi}] (3 tầng). Nếu bỏ trống → engine tự đề xuất.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const HE_SO = 1_000_000;
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const pct = (n) => (isFinite(n) ? r1(n * 100) : 0);
const d = (x) => Math.round(x * HE_SO).toLocaleString("vi-VN") + " ₫";

export function dinhGia(input) {
  const ve = input.value_equation || { ket_qua: 5, niem_tin: 5, thoi_gian: 5, cong_suc: 5 };
  const levers = [
    { key: "ket_qua", ten: "Kết quả mơ ước", v: ve.ket_qua, goi_y: "Vẽ rõ kết quả CỤ THỂ, đo được, khao khát (sau X có Y)." },
    { key: "niem_tin", ten: "Niềm tin sẽ đạt được", v: ve.niem_tin, goi_y: "Tăng bằng chứng: review, case study, cam kết/bảo hành, dùng thử." },
    { key: "thoi_gian", ten: "Tốc độ thấy kết quả", v: ve.thoi_gian, goi_y: "Rút ngắn thời gian chờ; tạo 'quick win' sớm cho khách." },
    { key: "cong_suc", ten: "Dễ dàng (ít công sức)", v: ve.cong_suc, goi_y: "Làm thay khách nhiều hơn (done-for-you); bớt bước, bớt phải nghĩ." },
  ];
  const suc_manh = Math.round((levers.reduce((s, l) => s + (l.v || 0), 0) / 4) * 10); // 0-100
  const yeu = [...levers].sort((a, b) => a.v - b.v)[0];
  // chỉ số Hormozi tương đối: (kết quả × niềm tin) / ((11-tốc độ) × (11-dễ))
  const hz = r2((ve.ket_qua * ve.niem_tin) / ((11 - ve.thoi_gian) * (11 - ve.cong_suc)));

  const stack = (input.van_de_giai_phap || []).map((x) => ({ ...x, gia_tri: x.gia_tri || 0 }));
  const tong_gia_tri_stack = stack.reduce((s, x) => s + x.gia_tri, 0);

  const cpbd = input.chi_phi_bien_doi_core ?? 0;
  const bien = input.bien_mong_muon ?? 0.6;
  const san = bien < 1 ? r1(cpbd / (1 - bien)) : Infinity;       // giá tối thiểu giữ biên mục tiêu
  const gtri = input.gia_tri_quy_tien ?? 0;
  const tyle = input.ty_le_gia_tri ?? 0.2;
  const tran = r1(gtri * tyle);                                   // trần giá theo giá trị (10-20% giá trị)

  // 3 tầng: dùng input.tiers nếu có, else tự đề xuất
  let tiers = input.tiers;
  if (!tiers || tiers.length === 0) {
    const better = Math.max(san, r1(tran * 0.75));
    tiers = [
      { ten: "Good (bắt khách nhạy giá)", gia: r1(Math.max(san, tran * 0.4)), chi_phi_bien_doi: r2(cpbd * 0.6) },
      { ten: "Better (mũi nhọn)", gia: r1(better), chi_phi_bien_doi: cpbd },
      { ten: "Best (neo giá)", gia: r1(Math.max(tran, better * 1.8)), chi_phi_bien_doi: r2(cpbd * 1.6) },
    ];
  }
  tiers = tiers.map((t) => {
    const lai_gop = r2(t.gia - t.chi_phi_bien_doi);
    const bien_pct = pct(t.gia ? lai_gop / t.gia : 0);
    const tren_san = t.gia >= san - 1e-9;
    return { ...t, lai_gop, bien_pct, tren_san, dat_bien_muc_tieu: bien_pct >= bien * 100 - 0.05 };
  });
  const mui_nhon = tiers.find((t) => /better|mũi nhọn/i.test(t.ten)) || tiers[Math.floor(tiers.length / 2)];

  const canh_bao = [];
  if (isFinite(san) && tran && tran < san)
    canh_bao.push(`Trần giá theo giá trị (${d(tran)}) THẤP HƠN sàn biên (${d(san)}): giá trị cảm nhận chưa đủ cao để vừa đạt biên ${pct(bien)}% vừa hấp dẫn → tăng Value Equation (đòn bẩy "${yeu.ten}") hoặc giảm chi phí biến đổi.`);
  tiers.forEach((t) => { if (!t.tren_san) canh_bao.push(`Tầng "${t.ten}" (${d(t.gia)}) DƯỚI sàn biên — biên chỉ ${t.bien_pct}% < mục tiêu ${pct(bien)}%. Chỉ dùng làm mồi bắt khách, đừng để là tầng chính.`); });
  if (suc_manh < 60) canh_bao.push(`Sức mạnh Offer mới ${suc_manh}/100 — cải thiện đòn bẩy "${yeu.ten}" trước khi tăng giá.`);

  return {
    meta: { ten: input.ten || "Offer", khach: input.khach || "", ket_qua_mo_uoc: input.ket_qua_mo_uoc || "" },
    value_equation: { levers, suc_manh, hormozi_index: hz, diem_yeu_nhat: yeu.ten, goi_y_cai_thien: yeu.goi_y },
    solution_stack: stack, tong_gia_tri_stack: r1(tong_gia_tri_stack),
    dinh_gia: { san, tran, value_anchor: r1(gtri), ty_le_gia_tri: tyle, chi_phi_bien_doi_core: cpbd, bien_mong_muon: bien },
    tiers, mui_nhon: mui_nhon?.ten,
    thu_tu_trinh_bay: [...tiers].reverse().map((t) => t.ten), // Best -> Good (neo cao trước)
    offer: { bao_hanh: input.bao_hanh || "", khan_hiem: input.khan_hiem || "", qua_tang: input.qua_tang || [] },
    canh_bao,
  };
}

export function renderMarkdown(k) {
  const L = [];
  L.push(`# Offer & Định giá — ${k.meta.ten}`);
  if (k.meta.khach) L.push(`**Khách:** ${k.meta.khach}`);
  if (k.meta.ket_qua_mo_uoc) L.push(`**Kết quả mơ ước:** ${k.meta.ket_qua_mo_uoc}`);
  L.push("");
  L.push(`## 1) Phương trình Giá trị (Hormozi) — sức mạnh Offer: ${k.value_equation.suc_manh}/100`);
  L.push(`| Đòn bẩy | Điểm /10 |`); L.push(`|---|--:|`);
  k.value_equation.levers.forEach((l) => L.push(`| ${l.ten} | ${l.v} |`));
  L.push(`\n> Đòn bẩy YẾU nhất: **${k.value_equation.diem_yeu_nhat}** → ${k.value_equation.goi_y_cai_thien}`);
  L.push(`> Value = (Kết quả × Niềm tin) / (Thời gian chờ × Công sức). Tăng tử số, giảm mẫu số.`);
  L.push("");
  L.push(`## 2) Solution stack — biến mỗi VẤN ĐỀ thành 1 giải pháp`);
  L.push(`| Vấn đề của khách | Giải pháp của ta | Giá trị |`); L.push(`|---|---|--:|`);
  k.solution_stack.forEach((x) => L.push(`| ${x.van_de} | ${x.giai_phap} | ${d(x.gia_tri)} |`));
  L.push(`| | **TỔNG GIÁ TRỊ STACK** | **${d(k.tong_gia_tri_stack)}** |`);
  L.push(`\n> Khách trả giá tầng mũi nhọn nhưng NHẬN giá trị stack ~${d(k.tong_gia_tri_stack)} → cảm giác "quá hời".`);
  L.push("");
  L.push(`## 3) Bảng giá 3 tầng (Good–Better–Best)`);
  L.push(`- Sàn giá (giữ biên ${pct(k.dinh_gia.bien_mong_muon)}%): **${d(k.dinh_gia.san)}** · Trần theo giá trị: **${d(k.dinh_gia.tran)}** (≈${pct(k.dinh_gia.ty_le_gia_tri)}% của ${d(k.dinh_gia.value_anchor)})`);
  L.push(`| Tầng | Giá | CP biến đổi | Lãi gộp | Biên | |`); L.push(`|---|--:|--:|--:|--:|:--|`);
  k.tiers.forEach((t) => L.push(`| ${t.ten} | **${d(t.gia)}** | ${d(t.chi_phi_bien_doi)} | ${d(t.lai_gop)} | ${t.bien_pct}% | ${t.tren_san ? "✅" : "⚠️ dưới sàn"} |`));
  L.push(`\n> **Mũi nhọn (đa số chọn): ${k.mui_nhon}.** Trình bày NEO CAO trước: ${k.thu_tu_trinh_bay.join(" → ")} (Cialdini).`);
  L.push("");
  L.push(`## 4) Bọc Offer (đòn bẩy giá trị cảm nhận)`);
  if (k.offer.bao_hanh) L.push(`- 🛡️ **Bảo hành/đảm bảo:** ${k.offer.bao_hanh}`);
  if (k.offer.khan_hiem) L.push(`- ⏳ **Khan hiếm/cấp bách:** ${k.offer.khan_hiem}`);
  if (k.offer.qua_tang?.length) L.push(`- 🎁 **Quà tặng:** ${k.offer.qua_tang.join("; ")}`);
  L.push("");
  if (k.canh_bao.length) { L.push(`## ⚠️ Cảnh báo`); k.canh_bao.forEach((c) => L.push(`- ${c}`)); L.push(""); }
  L.push(`---`);
  L.push(`_Nối hệ thống: giá & CP biến đổi mỗi tầng → bảng Sản phẩm của bài toán điểm hòa vốn để kiểm "giá này bán bao nhiêu thì sống"._`);
  return L.join("\n");
}

// ---- Render DOC trình bày (customer-facing + mục nội bộ) — dùng cho Lark Doc ----
export function renderDoc(k) {
  const L = [];
  L.push(`# 🌿 ${k.meta.ten.toUpperCase()}`);
  if (k.meta.khach) { L.push(`### Dành cho ai`); L.push(k.meta.khach); }
  if (k.meta.ket_qua_mo_uoc) { L.push(`### Sau khi hoàn thành bạn có gì`); L.push(`> **${k.meta.ket_qua_mo_uoc}**`); }
  L.push("");
  L.push(`---`);
  L.push(`## Trong gói bạn nhận được`);
  L.push(`| Điều bạn đang gặp | Chúng tôi giải quyết cho bạn | Giá trị |`);
  L.push(`|---|---|--:|`);
  k.solution_stack.forEach((x) => L.push(`| ${x.van_de} | ${x.giai_phap} | ${d(x.gia_tri)} |`));
  L.push(`| | **TỔNG GIÁ TRỊ BẠN NHẬN** | **${d(k.tong_gia_tri_stack)}** |`);
  L.push("");
  L.push(`---`);
  L.push(`## Bảng giá — chọn gói phù hợp với bạn`);
  [...k.tiers].reverse().forEach((t) => {
    const noi_bat = t.ten === k.mui_nhon ? "  ·  *Phổ biến nhất*" : "";
    L.push(`### ${t.ten}${noi_bat}`);
    L.push(`**${d(t.gia)}**`);
  });
  L.push(`\n> Bạn trả gói phổ biến **${d((k.tiers.find((t) => t.ten === k.mui_nhon) || {}).gia || 0)}** nhưng nhận về giá trị **~${d(k.tong_gia_tri_stack)}** — và yên tâm vì đã có cam kết.`);
  L.push("");
  L.push(`---`);
  L.push(`## Cam kết & ưu đãi`);
  if (k.offer.bao_hanh) L.push(`- 🛡️ **Cam kết:** ${k.offer.bao_hanh}`);
  if (k.offer.khan_hiem) L.push(`- ⏳ **Ưu tiên có hạn:** ${k.offer.khan_hiem}`);
  if (k.offer.qua_tang?.length) L.push(`- 🎁 **Quà tặng:** ${k.offer.qua_tang.join("; ")}`);
  L.push("");
  L.push(`---`);
  L.push(`---`);
  L.push(`## 🔒 (Nội bộ — không gửi khách) Phân tích định giá`);
  L.push(`- **Sức mạnh Offer: ${k.value_equation.suc_manh}/100.** Đòn bẩy yếu nhất: **${k.value_equation.diem_yeu_nhat}** → ${k.value_equation.goi_y_cai_thien}`);
  L.push(`- **Sàn giá** (giữ biên ${pct(k.dinh_gia.bien_mong_muon)}%): **${d(k.dinh_gia.san)}** · **Trần giá theo giá trị:** ${d(k.dinh_gia.tran)}`);
  L.push(`| Tầng | Giá | Biên | Ghi chú |`);
  L.push(`|---|--:|--:|---|`);
  k.tiers.forEach((t) => L.push(`| ${t.ten} | ${d(t.gia)} | ${t.bien_pct}% | ${t.tren_san ? (t.ten === k.mui_nhon ? "✅ tầng chốt" : "✅") : "⚠️ dưới sàn — chỉ làm mồi"} |`));
  L.push(`\n- Khách chê đắt → **không giảm giá, thêm bonus / tăng niềm tin**. Trình bày NEO CAO trước (Best → Better → Good).`);
  if (k.canh_bao.length) { L.push(""); k.canh_bao.forEach((c) => L.push(`- ⚠️ ${c}`)); }
  L.push(`\n_Grounded: Alex Hormozi ($100M Offers) · Ron Baker (value pricing) · Cialdini (neo giá) · HBR (Good-Better-Best)._`);
  return L.join("\n");
}

export const DEMO = {
  ten: "Lộ trình 90 ngày sạch mụn",
  khach: "Nữ 22–35, mụn dai dẳng, đã thử nhiều nơi không khỏi",
  ket_qua_mo_uoc: "Da sạch mụn, tự tin sau 90 ngày",
  gia_tri_quy_tien: 80, ty_le_gia_tri: 0.2,
  value_equation: { ket_qua: 9, niem_tin: 6, thoi_gian: 6, cong_suc: 7 },
  chi_phi_bien_doi_core: 4.8, bien_mong_muon: 0.6,
  van_de_giai_phap: [
    { van_de: "Không biết da mình bị gì", giai_phap: "Khám & soi da chuyên sâu + phác đồ riêng", gia_tri: 3 },
    { van_de: "Mua sản phẩm lung tung không hợp", giai_phap: "Bộ sản phẩm cá nhân hóa mang về", gia_tri: 8 },
    { van_de: "Làm rồi bỏ giữa chừng", giai_phap: "App nhắc + chuyên viên theo dõi hằng tuần", gia_tri: 5 },
    { van_de: "Sợ không hiệu quả mất tiền", giai_phap: "Cam kết cải thiện hoặc bù 2 buổi miễn phí", gia_tri: 4 },
    { van_de: "Da xấu lại do ăn uống", giai_phap: "Tư vấn dinh dưỡng cho da", gia_tri: 2 },
  ],
  tiers: [
    { ten: "Good — Combo 10 buổi cơ bản", gia: 6, chi_phi_bien_doi: 2.8 },
    { ten: "Better (mũi nhọn) — Trọn gói 90 ngày da mặt", gia: 12, chi_phi_bien_doi: 4.8 },
    { ten: "Best — 90 ngày da mặt + body + VIP", gia: 25, chi_phi_bien_doi: 9.5 },
  ],
  bao_hanh: "Cam kết cải thiện rõ sau 90 ngày hoặc bù 2 buổi miễn phí",
  khan_hiem: "Chỉ nhận 15 khách/tháng để đảm bảo theo sát",
  qua_tang: ["Bộ sản phẩm khởi đầu trị giá 1.5tr", "Buổi soi da miễn phí cho người được giới thiệu"],
};

// CLI chỉ chạy khi gọi trực tiếp (không chạy khi bị import làm module).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && a.endsWith(".json"));
const input = file ? JSON.parse(readFileSync(file, "utf8")) : DEMO;
const k = dinhGia(input);
if (args.includes("--doc")) { const di = args.indexOf("--doc"); if (args[di + 1] && !args[di + 1].startsWith("--")) { writeFileSync(args[di + 1], renderDoc(k), "utf8"); console.error("Đã ghi doc:", args[di + 1]); } else console.log(renderDoc(k)); }
else { const mi = args.indexOf("--md");
  if (mi !== -1 && args[mi + 1]) { writeFileSync(args[mi + 1], renderMarkdown(k), "utf8"); console.error("Đã ghi:", args[mi + 1]); }
  else if (args.includes("--md")) console.log(renderMarkdown(k));
  else console.log(JSON.stringify(k, null, 2)); }
} // end if (isMain)
