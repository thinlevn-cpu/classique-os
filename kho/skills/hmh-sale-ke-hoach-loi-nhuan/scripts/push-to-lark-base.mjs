#!/usr/bin/env node
// push-to-lark-base.mjs — Đẩy MỘT kế hoạch lợi nhuận vào Lark Base "Kế hoạch lợi nhuận CEO".
// Tạo 1 record hub (Kế hoạch) + các record con (Sản phẩm/Chi phí cố định/Nhân sự/Đầu tư) link vào hub.
// Các chỉ số (FC, vốn, lãi gộp BQ, điểm hoà vốn, số đơn cần) do CÔNG THỨC trong Base tự tính.
//
// Dùng:
//   node push-to-lark-base.mjs <input.json> --base-token <token> [--date 2026-06-15]
// input.json dùng ĐÚNG hợp đồng của ke-hoach-loi-nhuan.mjs.
//
// PATH cần Node: export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RUN = "@larksuite/cli/scripts/run.js";
const args = process.argv.slice(2);
const getArg = (k) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : undefined; };
const BASE = getArg("--base-token");
const FILE = args.find((a) => !a.startsWith("--") && a.endsWith(".json"));
const DATE = getArg("--date"); // YYYY-MM-DD
if (!BASE || !FILE) { console.error("Cần: node push-to-lark-base.mjs <input.json> --base-token <token>"); process.exit(1); }

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
const tableId = (name) => {
  const r = lark(["base", "+table-list", "--base-token", BASE, "--format", "json"]);
  return (r.data.tables || []).filter((t) => t.name === name).pop()?.id;
};
const rec = (tid, fields) => {
  const r = lark(["base", "+record-upsert", "--base-token", BASE, "--table-id", tid, "--as", "user", "--json", JSON.stringify(fields)]);
  return r.data?.record?.record_id_list?.[0];
};

const input = JSON.parse(readFileSync(FILE, "utf8"));
// Đơn vị Base là VNĐ (đồng). Input khai theo "triệu" -> nhân HE_SO. Nếu don_vi_tien="đồng" thì HE_SO=1.
const HE_SO = (input.don_vi_tien === "đồng" || input.don_vi_tien === "dong") ? 1 : 1_000_000;
const tKH = tableId("Kế hoạch"), tSP = tableId("Sản phẩm"), tCD = tableId("Chi phí cố định"),
      tNS = tableId("Nhân sự"), tDT = tableId("Đầu tư ban đầu");
if (!tKH || !tSP || !tCD || !tNS || !tDT) throw new Error("Base thiếu bảng chuẩn — chạy tao-base-mau.mjs trước.");

const mt = input.muc_tieu_loi_nhuan || {};
const hubFields = {
  "Tên doanh nghiệp": input.ten_doanh_nghiep || "(chưa đặt tên)",
  "Ngành": input.nganh || "",
  "Trạng thái": "Đang lập",
};
if (mt.nam_1 != null) hubFields["Mục tiêu LN năm 1 (VNĐ/năm)"] = mt.nam_1 * HE_SO;
if (mt.nam_3 != null) hubFields["Mục tiêu LN năm 3 (VNĐ/năm)"] = mt.nam_3 * HE_SO;
if (mt.nam_5 != null) hubFields["Mục tiêu LN năm 5 (VNĐ/năm)"] = mt.nam_5 * HE_SO;
if (DATE) hubFields["Ngày lập"] = DATE + " 00:00:00";

const kh = rec(tKH, hubFields);
const link = { "Kế hoạch": [{ id: kh }] };
console.log("Hub record:", kh);

(input.san_pham || []).forEach((p) => rec(tSP, {
  "Sản phẩm": p.ten, "Giá bán (VNĐ)": p.gia_ban * HE_SO, "Chi phí biến đổi (VNĐ)": p.chi_phi_bien_doi * HE_SO,
  "Tỉ trọng đơn (0-1)": p.ty_trong ?? null, ...link,
}));
(input.chi_phi_co_dinh || []).forEach((c) => rec(tCD, { "Hạng mục": c.hang_muc, "Số tiền/tháng (VNĐ)": c.so_tien * HE_SO, ...link }));
(input.nhan_su || []).forEach((n) => rec(tNS, { "Vị trí": n.vi_tri, "Số lượng": n.so_luong, "Lương/người/tháng (VNĐ)": n.luong * HE_SO, ...link }));
(input.dau_tu_ban_dau || []).forEach((d) => rec(tDT, { "Hạng mục": d.hang_muc, "Số lượng": d.so_luong ?? 1, "Đơn giá (VNĐ)": d.don_gia * HE_SO, ...link }));

const r = lark(["base", "+base-get", "--base-token", BASE, "--format", "json"]);
const url = r.data?.base?.url || r.data?.url || `(base ${BASE})`;
console.log("XONG. Mở Base xem chỉ số tự tính:", url);
