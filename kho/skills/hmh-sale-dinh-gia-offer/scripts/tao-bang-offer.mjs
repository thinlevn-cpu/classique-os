#!/usr/bin/env node
// tao-bang-offer.mjs — Thêm bảng "Offer & Định giá" vào Base, link vào record "Kế hoạch".
// Lưu Value Equation, solution stack, sàn/trần giá, bảng giá 3 tầng (biên tự tính). Đơn vị VNĐ.
// Dùng: node tao-bang-offer.mjs --base-token <token>
// PATH: export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"

import { execFileSync } from "node:child_process";
const RUN = "@larksuite/cli/scripts/run.js";
const args = process.argv.slice(2);
const BASE = args[args.indexOf("--base-token") + 1];
if (!BASE) { console.error("Cần --base-token <token>"); process.exit(1); }

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function larkOnce(a) { let out; try { out = execFileSync("node", [RUN, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const st = out.indexOf("{"); let dp = 0, en = -1, q = false, esc = false;
  for (let i = st; i < out.length; i++) { const c = out[i];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') q = false; }
    else if (c === '"') q = true; else if (c === "{") dp++; else if (c === "}") { dp--; if (!dp) { en = i; break; } } }
  const j = JSON.parse(out.slice(st, en + 1)); if (j.ok === false) throw new Error(JSON.stringify(j.error)); return j; }
function lark(a) { for (let i = 0; i < 6; i++) { try { return larkOnce(a); } catch (e) {
  if (/800004135|limited/.test(String(e.message)) && i < 5) { sleep(2500 + i * 1500); continue; } throw e; } } }
const tableId = (n) => (lark(["base", "+table-list", "--base-token", BASE, "--format", "json"]).data.tables || []).filter((t) => t.name === n).pop()?.id;
const F = (tid, j) => { const c = ["base", "+field-create", "--base-token", BASE, "--table-id", tid, "--json", JSON.stringify(j)]; if (j.type === "formula") c.push("--i-have-read-guide"); lark(c); console.log("    ·", j.name); sleep(600); };
const txt = (name, description) => ({ type: "text", name, description });
const cur = (name, description) => ({ type: "number", name, description, style: { type: "currency", precision: 0, currency_code: "VND" } });
const sc = (name, description) => ({ type: "number", name, description, style: { type: "plain", precision: 0 } });
const ratio = (name, description) => ({ type: "number", name, description, style: { type: "plain", precision: 2 } });
const moneyF = (name, expr) => ({ type: "formula", name, expression: `TEXT(${expr}, "#,##0") & " ₫"` });
const pctF = (name, expr) => ({ type: "formula", name, expression: `TEXT((${expr}) * 100, "0.0") & "%"` });
const numF = (name, expr) => ({ type: "formula", name, expression: expr });

if (tableId("Offer & Định giá")) { console.log("Bảng Offer đã tồn tại — bỏ qua."); process.exit(0); }
lark(["base", "+table-create", "--base-token", BASE, "--name", "Offer & Định giá",
  "--fields", JSON.stringify([txt("Tên Offer", "Tên gói/offer. 1 dòng = 1 offer.")]), "--json"]);
const t = tableId("Offer & Định giá");
console.log(`+ Bảng "Offer & Định giá": ${t}`);

F(t, { type: "link", name: "Kế hoạch", link_table: "Kế hoạch", bidirectional: true, bidirectional_link_field_name: "DS Offer" });
F(t, txt("Khách", "Khách mục tiêu của offer này."));
F(t, txt("Kết quả mơ ước", "Hormozi: kết quả CỤ THỂ, đo được, khao khát mà khách muốn đạt."));

// Value Equation (1-10, 10 = tốt nhất cho giá trị)
F(t, sc("VE - Kết quả mơ ước (1-10)", "Kết quả càng lớn/khao khát → điểm cao."));
F(t, sc("VE - Niềm tin đạt được (1-10)", "Khách càng TIN sẽ đạt (bằng chứng/cam kết) → điểm cao."));
F(t, sc("VE - Tốc độ thấy KQ (1-10)", "Càng nhanh thấy kết quả → điểm cao (giảm thời gian chờ)."));
F(t, sc("VE - Dễ dàng (1-10)", "Khách càng ÍT công sức (làm thay) → điểm cao."));
F(t, numF("Sức mạnh Offer /100", "ROUND(([VE - Kết quả mơ ước (1-10)] + [VE - Niềm tin đạt được (1-10)] + [VE - Tốc độ thấy KQ (1-10)] + [VE - Dễ dàng (1-10)]) / 4 * 10, 0)"));

// Định giá lõi
F(t, cur("Giá trị quy tiền (VNĐ)", "Giá trị khách NHẬN quy ra tiền (để tính trần giá theo giá trị)."));
F(t, ratio("Tỷ lệ giá trị (0-1)", "Bán ở ~10–20% giá trị cảm nhận → nhập 0.1–0.2."));
F(t, cur("CP biến đổi gói lõi (VNĐ)", "Chi phí biến đổi/đơn của gói chính (để tính sàn giá)."));
F(t, ratio("Biên mong muốn (0-1)", "Biên lãi gộp mục tiêu, vd 0.6 = 60%."));
F(t, moneyF("Sàn giá (không lỗ biên)", "IF([Biên mong muốn (0-1)] < 1, [CP biến đổi gói lõi (VNĐ)] / (1 - [Biên mong muốn (0-1)]), 0)"));
F(t, moneyF("Trần giá theo giá trị", "[Giá trị quy tiền (VNĐ)] * [Tỷ lệ giá trị (0-1)]"));

// 3 tầng
F(t, cur("Giá Good (VNĐ)", "Tầng thấp — bắt khách nhạy giá."));
F(t, cur("CPBĐ Good (VNĐ)", "Chi phí biến đổi tầng Good."));
F(t, pctF("Biên Good", "IF([Giá Good (VNĐ)] > 0, ([Giá Good (VNĐ)] - [CPBĐ Good (VNĐ)]) / [Giá Good (VNĐ)], 0)"));
F(t, cur("Giá Better (VNĐ)", "Tầng MŨI NHỌN — đa số chọn."));
F(t, cur("CPBĐ Better (VNĐ)", "Chi phí biến đổi tầng Better."));
F(t, pctF("Biên Better", "IF([Giá Better (VNĐ)] > 0, ([Giá Better (VNĐ)] - [CPBĐ Better (VNĐ)]) / [Giá Better (VNĐ)], 0)"));
F(t, cur("Giá Best (VNĐ)", "Tầng cao — NEO giá (trình bày trước)."));
F(t, cur("CPBĐ Best (VNĐ)", "Chi phí biến đổi tầng Best."));
F(t, pctF("Biên Best", "IF([Giá Best (VNĐ)] > 0, ([Giá Best (VNĐ)] - [CPBĐ Best (VNĐ)]) / [Giá Best (VNĐ)], 0)"));

// Stack + bọc offer
F(t, txt("Solution stack (vấn đề → giải pháp)", "Liệt kê mỗi vấn đề của khách → 1 giải pháp của ta (mỗi dòng 1 cặp)."));
F(t, cur("Tổng giá trị stack (VNĐ)", "Cộng giá trị các giải pháp — để neo 'khách trả ít hơn giá trị nhận'."));
F(t, txt("Bọc Offer (bảo hành / khan hiếm / quà)", "Bảo hành/đảm bảo, khan hiếm/cấp bách, quà tặng — tăng giá trị cảm nhận."));
F(t, { type: "select", name: "Trạng thái", multiple: false, options: [
  { name: "Nháp", hue: "Gray" }, { name: "Đang dùng", hue: "Green" }, { name: "Cần chỉnh", hue: "Orange" } ] });

console.log("XONG. table_id:", t);
