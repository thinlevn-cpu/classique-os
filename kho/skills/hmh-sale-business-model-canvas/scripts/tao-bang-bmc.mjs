#!/usr/bin/env node
// tao-bang-bmc.mjs — Thêm bảng "Mô hình kinh doanh (BMC)" vào Base, link vào record "Kế hoạch".
// 9 ô Business Model Canvas (Osterwalder) + ô giả định rủi ro nhất + trạng thái kiểm chứng.
// Mỗi ô có description = câu hỏi cốt lõi (grounded) để Base tự coach.
//
// Dùng: node tao-bang-bmc.mjs --base-token <token>
// PATH: export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"

import { execFileSync } from "node:child_process";
const RUN = "@larksuite/cli/scripts/run.js";
const args = process.argv.slice(2);
const BASE = args[args.indexOf("--base-token") + 1];
if (!BASE) { console.error("Cần --base-token <token>"); process.exit(1); }

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function larkOnce(a) {
  let out; try { out = execFileSync("node", [RUN, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const st = out.indexOf("{"); if (st === -1) throw new Error("Không có JSON:\n" + out);
  let dp = 0, en = -1, q = false, esc = false;
  for (let i = st; i < out.length; i++) { const c = out[i];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') q = false; }
    else if (c === '"') q = true; else if (c === "{") dp++; else if (c === "}") { dp--; if (!dp) { en = i; break; } } }
  const j = JSON.parse(out.slice(st, en + 1));
  if (j.ok === false) throw new Error("lark-cli lỗi: " + JSON.stringify(j.error));
  return j;
}
function lark(a) { for (let i = 0; i < 6; i++) { try { return larkOnce(a); } catch (e) {
  if (/800004135|limited/.test(String(e.message)) && i < 5) { sleep(2500 + i * 1500); continue; } throw e; } } }
const tableId = (n) => (lark(["base", "+table-list", "--base-token", BASE, "--format", "json"]).data.tables || [])
  .filter((t) => t.name === n).pop()?.id;
const F = (tid, json) => { lark(["base", "+field-create", "--base-token", BASE, "--table-id", tid, "--json", JSON.stringify(json)]); console.log(`    · ${json.name}`); sleep(500); };
const txt = (name, description) => ({ type: "text", name, description });

if (tableId("Mô hình kinh doanh (BMC)")) { console.log("Bảng BMC đã tồn tại — bỏ qua tạo."); process.exit(0); }

// Tạo bảng với field đầu (primary) = Tên mô hình
lark(["base", "+table-create", "--base-token", BASE, "--name", "Mô hình kinh doanh (BMC)",
  "--fields", JSON.stringify([txt("Tên mô hình", "Tên doanh nghiệp / ý tưởng mô hình. 1 dòng = 1 canvas.")]), "--json"]);
const t = tableId("Mô hình kinh doanh (BMC)");
console.log(`+ Bảng "Mô hình kinh doanh (BMC)": ${t}`);

// Link tới Kế hoạch
F(t, { type: "link", name: "Kế hoạch", link_table: "Kế hoạch", bidirectional: true, bidirectional_link_field_name: "DS BMC" });

// 9 ô theo THỨ TỰ ĐIỀN Osterwalder (mặt tiền trước → hậu trường → chi phí cuối)
F(t, txt("1. Phân khúc khách hàng", "Bạn tạo giá trị cho AI? Ai là khách quan trọng nhất? (đại chúng / ngách / đa phía...). Mô tả chân dung CỤ THỂ, đừng nói 'tất cả mọi người'."));
F(t, txt("2. Giá trị mang lại", "Bạn giải quyết VẤN ĐỀ / hoàn thành CÔNG VIỆC gì cho khách (Jobs To Be Done)? Vì sao họ chọn BẠN thay vì đối thủ / thay vì không làm gì?"));
F(t, txt("3. Kênh tiếp cận", "Khách BIẾT ĐẾN → ĐÁNH GIÁ → MUA → NHẬN → HẬU MÃI qua kênh nào? (online/offline, trực tiếp/đối tác). Kênh nào hiệu quả & rẻ nhất?"));
F(t, txt("4. Quan hệ khách hàng", "Quan hệ với mỗi phân khúc thế nào? (tự phục vụ, hỗ trợ cá nhân, cộng đồng, tự động hoá). Mục tiêu: kéo khách mới, GIỮ chân, hay BÁN THÊM?"));
F(t, txt("5. Dòng doanh thu", "Khách sẵn sàng TRẢ TIỀN cho giá trị nào? Trả thế nào? (bán đứt / thuê bao / theo lần / hoa hồng / quảng cáo). → các dòng này đổ sang bảng Sản phẩm & giá."));
F(t, txt("6. Nguồn lực chính", "Tài sản BẮT BUỘC để mô hình chạy: con người, thương hiệu, công nghệ/IP, tài chính, mặt bằng. Thiếu cái nào là mô hình sụp?"));
F(t, txt("7. Hoạt động chính", "Việc QUAN TRỌNG NHẤT phải làm thật tốt để tạo & giao giá trị (sản xuất, vận hành, marketing/bán, R&D, nền tảng)."));
F(t, txt("8. Đối tác chính", "Ai là nhà cung cấp / đối tác then chốt? Họ làm GIÚP việc gì, cho NGUỒN LỰC gì? Việc gì nên thuê ngoài thay vì tự làm?"));
F(t, txt("9. Cơ cấu chi phí", "Chi phí LỚN NHẤT để vận hành? Cố định hay biến đổi? Mô hình thiên về tối ưu chi phí hay theo đuổi giá trị? → đổ sang bảng Chi phí cố định / biến đổi."));

// Kiểm chứng (Steve Blank / Lean Startup)
F(t, txt("🎯 Giả định rủi ro nhất", "Trong 9 ô trên, GIẢ ĐỊNH NÀO mà nếu SAI thì cả mô hình sụp? (thường là: khách có thật sự cần không / có chịu trả tiền không). Ghi ra để đi kiểm chứng TRƯỚC."));
F(t, txt("Cách kiểm chứng", "Cách rẻ & nhanh nhất để kiểm chứng giả định trên trước khi đổ vốn (phỏng vấn 10 khách, bán thử, landing page, MVP...)."));
F(t, { type: "select", name: "Trạng thái kiểm chứng", multiple: false, options: [
  { name: "Chưa kiểm chứng", hue: "Gray" }, { name: "Đang kiểm chứng", hue: "Blue" },
  { name: "Đã xác thực", hue: "Green" }, { name: "Bị bác bỏ → xoay trục", hue: "Red" } ] });
sleep(500);
F(t, { type: "datetime", name: "Ngày lập", style: { format: "yyyy-MM-dd" } });

console.log("XONG. table_id:", t);
