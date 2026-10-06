#!/usr/bin/env node
// them-huong-dan.mjs — Thêm bảng "Hướng dẫn sử dụng" + ghi chú (description) cho từng CỘT NHẬP
// để học viên nhập tay trực tiếp trên Base mà không bị rối.
// Chỉ cập nhật description cho field STORAGE (text/number) — KHÔNG đụng field công thức.
//
// Dùng: node them-huong-dan.mjs --base-token <token>
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
function lark(cliArgs) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try { return larkOnce(cliArgs); }
    catch (e) {
      if (/800004135|limited/.test(String(e.message)) && attempt < 5) { sleep(2500 + attempt * 1500); continue; }
      throw e;
    }
  }
}
const tableId = (name) => (lark(["base", "+table-list", "--base-token", BASE, "--format", "json"]).data.tables || [])
  .filter((t) => t.name === name).pop()?.id;
const _fcache = {};
const fid = (tid, name) => {
  if (!_fcache[tid]) {
    const r = lark(["base", "+field-list", "--base-token", BASE, "--table-id", tid, "--format", "json"]);
    _fcache[tid] = Object.fromEntries((r.data.fields || r.data.items || []).map((f) => [f.name, f.id || f.field_id]));
  }
  return _fcache[tid][name];
};
const upd = (tid, json) => {
  const id = fid(tid, json.name);
  if (!id) { console.log(`    ! không thấy field "${json.name}" — bỏ qua`); return; }
  try {
    lark(["base", "+field-update", "--base-token", BASE, "--table-id", tid, "--field-id", id, "--json", JSON.stringify(json), "--yes"]);
    console.log(`    · ghi chú "${json.name}"`);
    sleep(800);
  } catch (e) {
    if (/800070003|no operation produced/.test(String(e.message))) console.log(`    = "${json.name}" đã có ghi chú (bỏ qua)`);
    else throw e;
  }
};

const cur = (name, description) => ({ type: "number", name, description, style: { type: "currency", precision: 0, currency_code: "VND" } });
const int = (name, description) => ({ type: "number", name, description, style: { type: "plain", precision: 0 } });
const ratio = (name, description) => ({ type: "number", name, description, style: { type: "plain", precision: 2 } });
const text = (name, description) => ({ type: "text", name, description });

const tKH = tableId("Kế hoạch"), tSP = tableId("Sản phẩm"), tCD = tableId("Chi phí cố định"),
      tNS = tableId("Nhân sự"), tDT = tableId("Đầu tư ban đầu");

console.log("Gắn ghi chú cột nhập...");
// Hub
upd(tKH, text("Tên doanh nghiệp", "Tên DN / dự án. Mỗi dòng = 1 kế hoạch riêng."));
upd(tKH, text("Ngành", "Lĩnh vực kinh doanh (vd: spa, quán cà phê, studio)."));
upd(tKH, cur("Mục tiêu LN năm 1 (VNĐ/năm)", "BƯỚC 1 — Bạn MUỐN LỜI bao nhiêu sau 1 năm? Nhập VNĐ (vd 720000000 = 720 triệu)."));
upd(tKH, cur("Mục tiêu LN năm 3 (VNĐ/năm)", "Lợi nhuận mục tiêu sau 3 năm (VNĐ)."));
upd(tKH, cur("Mục tiêu LN năm 5 (VNĐ/năm)", "Lợi nhuận mục tiêu sau 5 năm (VNĐ)."));
// Sản phẩm
upd(tSP, text("Sản phẩm", "BƯỚC 2 — Tên sản phẩm/dịch vụ bán ra."));
upd(tSP, cur("Giá bán (VNĐ)", "Giá bán 1 đơn (VNĐ). Vd 3000000 = 3 triệu."));
upd(tSP, cur("Chi phí biến đổi (VNĐ)", "BƯỚC 7 — Chi phí THẬT mỗi đơn (nguyên liệu, hoa hồng, ship...). Lãi gộp = Giá bán − số này."));
upd(tSP, ratio("Tỉ trọng đơn (0-1)", "Tỉ trọng SỐ ĐƠN của SP này trong tổng đơn. Nhập 0–1; cộng tất cả SP = 1 (vd 0.5 = 50%)."));
// Chi phí cố định
upd(tCD, text("Hạng mục", "BƯỚC 6 — Khoản chi dù có khách hay không vẫn trả (mặt bằng, điện nước, phần mềm...)."));
upd(tCD, cur("Số tiền/tháng (VNĐ)", "Số tiền mỗi THÁNG (VNĐ)."));
// Nhân sự
upd(tNS, text("Vị trí", "BƯỚC 5 — Vị trí cần (sale, kỹ thuật, quản lý, kế toán...)."));
upd(tNS, int("Số lượng", "Số người ở vị trí này."));
upd(tNS, cur("Lương/người/tháng (VNĐ)", "Lương 1 người/THÁNG (VNĐ). Tổng lương gộp vào chi phí cố định."));
// Đầu tư
upd(tDT, text("Hạng mục", "BƯỚC 4 — Khoản đầu tư 1 lần trước khi vận hành. Liệt kê từ LỚN đến nhỏ."));
upd(tDT, int("Số lượng", "Số lượng mua."));
upd(tDT, cur("Đơn giá (VNĐ)", "Giá 1 đơn vị (VNĐ). Thành tiền = Số lượng × Đơn giá."));

// ---------- Bảng Hướng dẫn ----------
console.log("Tạo bảng Hướng dẫn sử dụng...");
const guideFields = [
  { type: "text", name: "Bước" },
  { type: "text", name: "Việc cần làm" },
  { type: "text", name: "Điền ở đâu" },
  { type: "text", name: "Lưu ý" },
];
lark(["base", "+table-create", "--base-token", BASE, "--name", "Hướng dẫn sử dụng", "--fields", JSON.stringify(guideFields), "--json"]);
const tHD = tableId("Hướng dẫn sử dụng");
const rows = [
  ["📌 Tổng quan", "Mỗi dòng ở bảng 'Kế hoạch' = 1 doanh nghiệp/kịch bản. 4 bảng con (Sản phẩm, Chi phí cố định, Nhân sự, Đầu tư ban đầu) link về nó.", "—", "Cột có '₫' hoặc '%' là TỰ TÍNH — ĐỪNG SỬA. Chỉ điền các cột còn lại."],
  ["Bước 1", "Nhập mục tiêu LỢI NHUẬN muốn đạt (năm 1/3/5).", "Bảng Kế hoạch", "Đơn vị VNĐ: 720 triệu thì nhập 720000000."],
  ["Bước 2 + 7", "Liệt kê sản phẩm: giá bán, chi phí biến đổi mỗi đơn, tỉ trọng đơn.", "Bảng Sản phẩm", "Tỉ trọng các SP cộng lại = 1 (0.5 + 0.3 + 0.2)."],
  ["Bước 4", "Liệt kê khoản đầu tư ban đầu (lớn → nhỏ): máy móc, nội thất, setup...", "Bảng Đầu tư ban đầu", "Đừng tính đại khái — ghi từng món."],
  ["Bước 5", "Số nhân sự + lương mỗi vị trí.", "Bảng Nhân sự", "Tổng lương tự gộp vào chi phí cố định."],
  ["Bước 6", "Chi phí cố định hằng tháng: mặt bằng, điện nước, phần mềm...", "Bảng Chi phí cố định", "Khoản dù có khách hay không vẫn phải trả."],
  ["Xem kết quả", "Điểm hòa vốn, số đơn cần, tổng vốn, lãi gộp BQ... hiện ở dòng Kế hoạch.", "Bảng Kế hoạch", "Tự tính lại sau ~3 GIÂY khi bạn đổi bất kỳ số nào."],
  ["Ra quyết định", "Thử đổi 1 số (giá bán, lương, mặt bằng) để xem điểm hòa vốn nhảy theo.", "Bất kỳ bảng nào", "'Nếu... thì...' — nghịch thoải mái rồi quyết."],
  ["Lập kế hoạch MỚI", "Nói với AI: 'lập kế hoạch lợi nhuận cho [tên DN]'. AI sẽ hỏi 9 bước và tự ghi vào đây.", "Qua trợ lý AI", "Người mới nên đi đường này lần đầu."],
];
rows.forEach((r) => lark(["base", "+record-upsert", "--base-token", BASE, "--table-id", tHD, "--as", "user",
  "--json", JSON.stringify({ "Bước": r[0], "Việc cần làm": r[1], "Điền ở đâu": r[2], "Lưu ý": r[3] })]));
console.log(`+ Bảng "Hướng dẫn sử dụng": ${tHD} (${rows.length} dòng)`);
console.log("XONG.");
