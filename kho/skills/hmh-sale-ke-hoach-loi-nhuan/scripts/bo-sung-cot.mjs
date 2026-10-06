#!/usr/bin/env node
// bo-sung-cot.mjs — Áp delta vào Base đã tồn tại:
//  (1) Thêm "Doanh thu cần/tháng - Năm 1/3/5" (doanh thu ỨNG VỚI mục tiêu lợi nhuận).
//  (2) Cập nhật ghi chú rõ cho "Tỉ trọng đơn", "Lãi gộp đóng góp", "Giá đóng góp".
//  (3) Thêm dòng giải thích vào bảng "Hướng dẫn sử dụng".
// Dùng: node bo-sung-cot.mjs --base-token <token>
// PATH: export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"

import { execFileSync } from "node:child_process";
const RUN = "@larksuite/cli/scripts/run.js";
const args = process.argv.slice(2);
const BASE = args[args.indexOf("--base-token") + 1];
if (!BASE) { console.error("Cần --base-token <token>"); process.exit(1); }

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function larkOnce(cliArgs) {
  let out;
  try { out = execFileSync("node", [RUN, ...cliArgs], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const start = out.indexOf("{");
  if (start === -1) throw new Error("Không có JSON:\n" + out);
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < out.length; i++) { const c = out[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; }
    else if (c === '"') inStr = true; else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = i; break; } } }
  const j = JSON.parse(out.slice(start, end + 1));
  if (j.ok === false) throw new Error("lark-cli lỗi: " + JSON.stringify(j.error));
  return j;
}
function lark(a) { for (let i = 0; i < 6; i++) { try { return larkOnce(a); } catch (e) {
  if (/800004135|limited/.test(String(e.message)) && i < 5) { sleep(2500 + i * 1500); continue; } throw e; } } }

const tableId = (name) => (lark(["base", "+table-list", "--base-token", BASE, "--format", "json"]).data.tables || [])
  .filter((t) => t.name === name).pop()?.id;
const _fc = {};
const fid = (tid, name) => { if (!_fc[tid]) { const r = lark(["base", "+field-list", "--base-token", BASE, "--table-id", tid, "--format", "json"]);
  _fc[tid] = Object.fromEntries((r.data.fields || r.data.items || []).map((f) => [f.name, f.id || f.field_id])); } return _fc[tid][name]; };
const hasField = (tid, name) => !!fid(tid, name);

const tKH = tableId("Kế hoạch"), tSP = tableId("Sản phẩm"), tHD = tableId("Hướng dẫn sử dụng");
const GIA = "SUM([DS Sản phẩm].[Giá đóng góp])";

// (1) Thêm 3 cột doanh thu cần
console.log("Thêm cột Doanh thu cần/tháng...");
[["Doanh thu cần/tháng - Năm 1", "[Số đơn cần - Năm 1]"],
 ["Doanh thu cần/tháng - Năm 3", "[Số đơn cần - Năm 3]"],
 ["Doanh thu cần/tháng - Năm 5", "[Số đơn cần - Năm 5]"]].forEach(([name, sodon]) => {
  if (hasField(tKH, name)) { console.log(`    = "${name}" đã có`); return; }
  lark(["base", "+field-create", "--base-token", BASE, "--table-id", tKH, "--i-have-read-guide",
    "--json", JSON.stringify({ type: "formula", name, expression: `TEXT(${sodon} * ${GIA}, "#,##0") & " ₫"`,
      description: "Doanh thu/tháng cần đạt để CHẠM MỤC TIÊU LỢI NHUẬN năm này (= Số đơn cần × Giá bán BQ). Khác doanh thu hoà vốn (chỉ để không lỗ)." })]);
  console.log(`    + "${name}"`); sleep(800);
});

// (2) Cập nhật ghi chú (field-update PUT — cần expression cũ + --yes + guide)
console.log("Cập nhật ghi chú rõ...");
const updFormula = (tid, name, expr, desc) => {
  const id = fid(tid, name); if (!id) return console.log(`    ! thiếu "${name}"`);
  try { lark(["base", "+field-update", "--base-token", BASE, "--table-id", tid, "--field-id", id,
    "--json", JSON.stringify({ type: "formula", name, expression: expr, description: desc }), "--i-have-read-guide", "--yes"]);
    console.log(`    · "${name}"`); sleep(800);
  } catch (e) { if (/800070003|no operation/.test(String(e.message))) console.log(`    = "${name}" đã ổn`); else throw e; }
};
const updNumber = (tid, name, desc) => {
  const id = fid(tid, name); if (!id) return console.log(`    ! thiếu "${name}"`);
  try { lark(["base", "+field-update", "--base-token", BASE, "--table-id", tid, "--field-id", id,
    "--json", JSON.stringify({ type: "number", name, description: desc, style: { type: "plain", precision: 2 } }), "--yes"]);
    console.log(`    · "${name}"`); sleep(800);
  } catch (e) { if (/800070003|no operation/.test(String(e.message))) console.log(`    = "${name}" đã ổn`); else throw e; }
};
updNumber(tSP, "Tỉ trọng đơn (0-1)", "Trong tổng số đơn bán ra, SP này chiếm bao nhiêu phần. Nhập 0–1: 0.5 = một nửa (50%) số đơn, 0.3 = 30%. TỔNG tỉ trọng tất cả SP = 1 (vd 0.5 + 0.3 + 0.2).");
updFormula(tSP, "Lãi gộp đóng góp", "([Giá bán (VNĐ)] - [Chi phí biến đổi (VNĐ)]) * [Tỉ trọng đơn (0-1)]",
  "CỘT PHỤ tự tính (không cần để ý) = Lãi gộp/đơn × Tỉ trọng. Cộng cột này của TẤT CẢ SP = 'Lãi gộp BQ/đơn' của cả DN — lãi gộp bình quân mỗi đơn theo cơ cấu bán.");
updFormula(tSP, "Giá đóng góp", "[Giá bán (VNĐ)] * [Tỉ trọng đơn (0-1)]",
  "CỘT PHỤ tự tính (không cần để ý) = Giá bán × Tỉ trọng. Cộng cột này của TẤT CẢ SP = 'Giá bán BQ' — giá bán bình quân mỗi đơn theo cơ cấu bán.");

// (3) Thêm dòng giải thích vào Hướng dẫn
if (tHD) {
  console.log("Bổ sung dòng Hướng dẫn...");
  const rows = [
    ["Hiểu 'Tỉ trọng đơn'", "Cơ cấu bán: trong 10 đơn bán ra, SP này chiếm mấy đơn. Nhập 0–1, tổng các SP = 1.", "Bảng Sản phẩm", "Vd Combo 0.2 nghĩa là cứ 10 đơn thì 2 đơn là Combo."],
    ["Hiểu cột 'đóng góp'", "'Lãi gộp đóng góp' & 'Giá đóng góp' là cột PHỤ để máy tính lãi gộp & giá BÌNH QUÂN mỗi đơn.", "Bảng Sản phẩm", "Không cần điền, không cần để ý — máy tự cộng."],
    ["Doanh thu mục tiêu", "'Doanh thu cần/tháng - Năm 1/3/5' = doanh thu phải đạt để LỜI đúng mục tiêu đã đặt.", "Bảng Kế hoạch", "Khác 'Doanh thu hoà vốn' (chỉ để không lỗ)."],
  ];
  rows.forEach((r) => { lark(["base", "+record-upsert", "--base-token", BASE, "--table-id", tHD, "--as", "user",
    "--json", JSON.stringify({ "Bước": r[0], "Việc cần làm": r[1], "Điền ở đâu": r[2], "Lưu ý": r[3] })]); sleep(400); });
  console.log(`    + ${rows.length} dòng`);
}
console.log("XONG.");
