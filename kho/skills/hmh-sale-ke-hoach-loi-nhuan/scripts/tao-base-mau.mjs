#!/usr/bin/env node
// tao-base-mau.mjs — Dựng (hoặc bồi đắp) Lark Base "Kế hoạch lợi nhuận CEO" mô hình SỐNG.
// ĐƠN VỊ TIỀN TRONG BASE: VNĐ thật (đồng), định dạng kế toán có dấu phân cách (vd 1,200,000,000 ₫).
// Input/demo của script khai theo TRIỆU cho gọn -> nhân HE_SO=1.000.000 khi ghi vào Base.
// 5 bảng liên kết + công thức cross-table (FC, vốn, lãi gộp BQ, điểm hoà vốn, số đơn cần).
//
// Dùng:
//   node tao-base-mau.mjs --base-token <token>            # bồi đắp vào Base có sẵn
//   node tao-base-mau.mjs --create                        # tự tạo Base mới rồi dựng
//   node tao-base-mau.mjs --base-token <t> --demo-only --demo   # chỉ nạp demo
//   thêm --demo để nạp ví dụ studio áo cưới.
//
// PATH cần Node: export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"

import { execFileSync } from "node:child_process";

const RUN = "@larksuite/cli/scripts/run.js";
const args = process.argv.slice(2);
const getArg = (k) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : undefined; };
const WANT_DEMO = args.includes("--demo");
const HE_SO = 1_000_000; // triệu -> đồng

function lark(cliArgs) {
  let out;
  try { out = execFileSync("node", [RUN, ...cliArgs], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const start = out.indexOf("{");
  if (start === -1) throw new Error("Không có JSON:\n" + out);
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < out.length; i++) {
    const c = out[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; }
    else if (c === '"') inStr = true; else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const j = JSON.parse(out.slice(start, end + 1));
  if (j.ok === false) throw new Error("lark-cli lỗi: " + JSON.stringify(j.error));
  return j;
}

// Field helpers
const cur = (name) => ({ type: "number", name, style: { type: "currency", precision: 0, currency_code: "VND" } });
const int = (name) => ({ type: "number", name, style: { type: "plain", precision: 0 } });
const ratio = (name) => ({ type: "number", name, style: { type: "plain", precision: 2 } });
const numF = (name, expr) => ({ type: "formula", name, expression: expr });               // số (để SUM/tham chiếu)
const moneyF = (name, expr) => ({ type: "formula", name, expression: `TEXT(${expr}, "#,##0") & " ₫"` }); // hiển thị tiền kế toán
const pctF = (name, expr) => ({ type: "formula", name, expression: `TEXT((${expr}) * 100, "0.0") & "%"` });

let BASE = getArg("--base-token");
if (args.includes("--create")) {
  const r = lark(["base", "+base-create", "--as", "user", "--name", "KẾ HOẠCH LỢI NHUẬN CEO — Mẫu HMH", "--json"]);
  BASE = r.data.base.base_token;
  console.log("Đã tạo Base:", BASE, r.data.base.url);
}
if (!BASE) throw new Error("Cần --base-token <token> hoặc --create");

const tableIdByName = (name) => {
  const r = lark(["base", "+table-list", "--base-token", BASE, "--format", "json"]);
  return (r.data.tables || []).filter((t) => t.name === name).pop()?.id;
};
const T = (name, fields) => {
  lark(["base", "+table-create", "--base-token", BASE, "--name", name, "--fields", JSON.stringify(fields), "--json"]);
  const id = tableIdByName(name);
  console.log(`+ Bảng "${name}": ${id}`);
  if (!id) throw new Error(`Không lấy được table_id cho "${name}"`);
  return id;
};
const F = (tableId, json) => {
  const cli = ["base", "+field-create", "--base-token", BASE, "--table-id", tableId, "--json", JSON.stringify(json)];
  if (json.type === "formula") cli.push("--i-have-read-guide");
  lark(cli);
  console.log(`    · field "${json.name}" (${json.type})`);
};

const DEMO_ONLY = args.includes("--demo-only");
let tKH, tSP, tCD, tNS, tDT;
if (DEMO_ONLY) {
  tKH = tableIdByName("Kế hoạch"); tSP = tableIdByName("Sản phẩm");
  tCD = tableIdByName("Chi phí cố định"); tNS = tableIdByName("Nhân sự"); tDT = tableIdByName("Đầu tư ban đầu");
  console.log("DEMO_ONLY — dùng bảng có sẵn:", { tKH, tSP, tCD, tNS, tDT });
}

if (!DEMO_ONLY) {
// ---------- 1) Hub: Kế hoạch ----------
tKH = T("Kế hoạch", [
  { type: "text", name: "Tên doanh nghiệp" },
  { type: "text", name: "Ngành" },
  cur("Mục tiêu LN năm 1 (VNĐ/năm)"),
  cur("Mục tiêu LN năm 3 (VNĐ/năm)"),
  cur("Mục tiêu LN năm 5 (VNĐ/năm)"),
  { type: "select", name: "Trạng thái", multiple: false, options: [
    { name: "Đang lập", hue: "Blue" }, { name: "Khả thi", hue: "Green" },
    { name: "Cần điều chỉnh", hue: "Orange" }, { name: "Không khả thi", hue: "Red" } ] },
  { type: "datetime", name: "Ngày lập", style: { format: "yyyy-MM-dd" } },
]);

// ---------- 2) Sản phẩm ----------
tSP = T("Sản phẩm", [
  { type: "text", name: "Sản phẩm" },
  cur("Giá bán (VNĐ)"),
  cur("Chi phí biến đổi (VNĐ)"),
  { ...ratio("Tỉ trọng đơn (0-1)"), description: "Trong tổng số đơn bán ra, SP này chiếm bao nhiêu phần. Nhập số thập phân 0–1: 0.5 = 50% số đơn, 0.3 = 30%. TỔNG tỉ trọng tất cả SP phải = 1. Vd 3 gói: 0.5 + 0.3 + 0.2 = 1." },
]);
F(tSP, { type: "link", name: "Kế hoạch", link_table: "Kế hoạch", bidirectional: true, bidirectional_link_field_name: "DS Sản phẩm" });
F(tSP, moneyF("Lãi gộp/đơn", "[Giá bán (VNĐ)] - [Chi phí biến đổi (VNĐ)]"));
F(tSP, pctF("Biên lãi gộp", "([Giá bán (VNĐ)] - [Chi phí biến đổi (VNĐ)]) / [Giá bán (VNĐ)]"));
F(tSP, { ...numF("Lãi gộp đóng góp", "([Giá bán (VNĐ)] - [Chi phí biến đổi (VNĐ)]) * [Tỉ trọng đơn (0-1)]"), description: "CỘT PHỤ (tự tính, không cần để ý) = Lãi gộp/đơn × Tỉ trọng. Cộng cột này của tất cả SP = 'Lãi gộp BQ/đơn' của cả DN — tức lãi gộp bình quân mỗi đơn theo cơ cấu bán." });
F(tSP, { ...numF("Giá đóng góp", "[Giá bán (VNĐ)] * [Tỉ trọng đơn (0-1)]"), description: "CỘT PHỤ (tự tính, không cần để ý) = Giá bán × Tỉ trọng. Cộng cột này của tất cả SP = 'Giá bán BQ' — giá bán bình quân mỗi đơn theo cơ cấu bán." });

// ---------- 3) Chi phí cố định ----------
tCD = T("Chi phí cố định", [
  { type: "text", name: "Hạng mục" },
  cur("Số tiền/tháng (VNĐ)"),
]);
F(tCD, { type: "link", name: "Kế hoạch", link_table: "Kế hoạch", bidirectional: true, bidirectional_link_field_name: "DS Chi phí cố định" });

// ---------- 4) Nhân sự ----------
tNS = T("Nhân sự", [
  { type: "text", name: "Vị trí" },
  int("Số lượng"),
  cur("Lương/người/tháng (VNĐ)"),
]);
F(tNS, { type: "link", name: "Kế hoạch", link_table: "Kế hoạch", bidirectional: true, bidirectional_link_field_name: "DS Nhân sự" });
F(tNS, numF("Thành tiền/tháng", "[Số lượng] * [Lương/người/tháng (VNĐ)]"));

// ---------- 5) Đầu tư ban đầu ----------
tDT = T("Đầu tư ban đầu", [
  { type: "text", name: "Hạng mục" },
  int("Số lượng"),
  cur("Đơn giá (VNĐ)"),
]);
F(tDT, { type: "link", name: "Kế hoạch", link_table: "Kế hoạch", bidirectional: true, bidirectional_link_field_name: "DS Đầu tư" });
F(tDT, numF("Thành tiền", "[Số lượng] * [Đơn giá (VNĐ)]"));

// ---------- Rollup công thức trong hub ----------
const FC = "(SUM([DS Nhân sự].[Thành tiền/tháng]) + SUM([DS Chi phí cố định].[Số tiền/tháng (VNĐ)]))";
const LG = "SUM([DS Sản phẩm].[Lãi gộp đóng góp])";
const GIA = "SUM([DS Sản phẩm].[Giá đóng góp])";
F(tKH, moneyF("Tổng lương/tháng", "SUM([DS Nhân sự].[Thành tiền/tháng])"));
F(tKH, moneyF("Tổng CP cố định khác/tháng", "SUM([DS Chi phí cố định].[Số tiền/tháng (VNĐ)])"));
F(tKH, moneyF("Tổng CP cố định/tháng (FC)", FC));
F(tKH, moneyF("Tổng vốn đầu tư ban đầu", "SUM([DS Đầu tư].[Thành tiền])"));
F(tKH, moneyF("Lãi gộp BQ/đơn", LG));
F(tKH, moneyF("Giá bán BQ", GIA));
F(tKH, pctF("Biên lãi gộp BQ", `IF(${GIA} > 0, ${LG} / ${GIA}, 0)`));
F(tKH, numF("Điểm hoà vốn (đơn/tháng)", `IF(${LG} > 0, ROUNDUP(${FC} / ${LG}, 0), 0)`));
F(tKH, moneyF("Doanh thu hoà vốn/tháng", `[Điểm hoà vốn (đơn/tháng)] * ${GIA}`));
F(tKH, numF("Số đơn cần - Năm 1", `IF(${LG} > 0, ROUNDUP((${FC} + [Mục tiêu LN năm 1 (VNĐ/năm)] / 12) / ${LG}, 0), 0)`));
F(tKH, numF("Số đơn cần - Năm 3", `IF(${LG} > 0, ROUNDUP((${FC} + [Mục tiêu LN năm 3 (VNĐ/năm)] / 12) / ${LG}, 0), 0)`));
F(tKH, numF("Số đơn cần - Năm 5", `IF(${LG} > 0, ROUNDUP((${FC} + [Mục tiêu LN năm 5 (VNĐ/năm)] / 12) / ${LG}, 0), 0)`));
// Doanh thu/tháng ỨNG VỚI MỤC TIÊU LỢI NHUẬN (khác doanh thu hoà vốn)
F(tKH, moneyF("Doanh thu cần/tháng - Năm 1", `[Số đơn cần - Năm 1] * ${GIA}`));
F(tKH, moneyF("Doanh thu cần/tháng - Năm 3", `[Số đơn cần - Năm 3] * ${GIA}`));
F(tKH, moneyF("Doanh thu cần/tháng - Năm 5", `[Số đơn cần - Năm 5] * ${GIA}`));
} // end if (!DEMO_ONLY)

console.log("\n=== IDS ===");
console.log(JSON.stringify({ base_token: BASE, tables: { ke_hoach: tKH, san_pham: tSP, chi_phi_co_dinh: tCD, nhan_su: tNS, dau_tu: tDT } }, null, 2));

// ---------- Dữ liệu demo (khai theo triệu -> nhân HE_SO ra đồng) ----------
function rec(tableId, fields) {
  const r = lark(["base", "+record-upsert", "--base-token", BASE, "--table-id", tableId, "--json", JSON.stringify(fields), "--as", "user"]);
  return r.data?.record?.record_id_list?.[0];
}
if (WANT_DEMO) {
  console.log("\nNạp dữ liệu demo (Studio Áo Cưới)...");
  const kh = rec(tKH, {
    "Tên doanh nghiệp": "Studio Áo Cưới Demo", "Ngành": "Chụp ảnh cưới",
    "Mục tiêu LN năm 1 (VNĐ/năm)": 1200 * HE_SO, "Mục tiêu LN năm 3 (VNĐ/năm)": 3600 * HE_SO,
    "Mục tiêu LN năm 5 (VNĐ/năm)": 6000 * HE_SO, "Trạng thái": "Đang lập",
  });
  const link = { "Kế hoạch": [{ id: kh }] };
  const sp = [["Gói Cơ bản", 15, 7, 0.5], ["Gói Cao cấp", 40, 18, 0.3], ["Gói VIP", 80, 35, 0.2]];
  sp.forEach(([n, g, v, t]) => rec(tSP, { "Sản phẩm": n, "Giá bán (VNĐ)": g * HE_SO, "Chi phí biến đổi (VNĐ)": v * HE_SO, "Tỉ trọng đơn (0-1)": t, ...link }));
  const cd = [["Thuê mặt bằng", 40], ["Điện nước - internet", 8], ["Phần mềm + kế toán", 6], ["Khấu hao thiết bị", 10]];
  cd.forEach(([n, s]) => rec(tCD, { "Hạng mục": n, "Số tiền/tháng (VNĐ)": s * HE_SO, ...link }));
  const ns = [["Sale", 2, 10], ["Photographer", 2, 15], ["Retoucher", 1, 12], ["Quản lý", 1, 20]];
  ns.forEach(([n, sl, l]) => rec(tNS, { "Vị trí": n, "Số lượng": sl, "Lương/người/tháng (VNĐ)": l * HE_SO, ...link }));
  const dt = [["Máy ảnh + ống kính", 2, 60], ["Nội thất + setup studio", 1, 200], ["Máy tính + phần mềm", 3, 25], ["Biển bảng + khai trương", 1, 50]];
  dt.forEach(([n, sl, g]) => rec(tDT, { "Hạng mục": n, "Số lượng": sl, "Đơn giá (VNĐ)": g * HE_SO, ...link }));
  console.log("Đã nạp demo. Hub record:", kh);
}
console.log("\nXONG.");
