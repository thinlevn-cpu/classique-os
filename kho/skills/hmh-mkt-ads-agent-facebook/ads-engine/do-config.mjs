#!/usr/bin/env node
// do-config.mjs — TỰ DÒ table_id từ Base "Ads Agent" CỦA BẠN rồi điền vào config.env.
// Cách dùng (chạy trong shell mà lệnh `lark-cli` hoạt động + đã `lark-cli` đăng nhập):
//   1) Đã copy config.env.example -> config.env và điền B=<base_token của bạn>
//   2) node do-config.mjs
// Script đọc danh sách bảng trong Base, khớp theo SỐ THỨ TỰ đầu tên bảng (0..9) rồi keyword,
// và ghi T0..T9, T_NK vào config.env (giữ nguyên các dòng khác + comment).

import fs from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// fileURLToPath xử lý đúng path có dấu cách / tiếng Việt (URL.pathname sẽ bị %-encode → sai)
const CFG = fileURLToPath(new URL("./config.env", import.meta.url));
if (!fs.existsSync(CFG)) {
  console.error("✗ Không thấy config.env. Hãy copy config.env.example -> config.env và điền B trước.");
  process.exit(1);
}
let text = fs.readFileSync(CFG, "utf8");
const getVar = (k) => (text.match(new RegExp(`^${k}=(.*)$`, "m")) || [, ""])[1].trim();
const B = getVar("B");
if (!B || B.includes("DIEN_") || B.includes("<")) {
  console.error("✗ Chưa điền B (base_token) trong config.env. Mở Base của bạn, lấy chuỗi sau /base/ trong URL.");
  process.exit(1);
}

// 1) Lấy danh sách bảng
console.log("▶ Đang đọc danh sách bảng từ Base", B, "...");
let raw;
try {
  raw = execSync(`lark-cli base +table-list --base-token ${B} --format json --as user`, {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 24,
  });
} catch (e) {
  console.error("✗ Gọi lark-cli thất bại. Kiểm tra: đã cài lark-cli? đã `lark-cli` đăng nhập? B đúng?");
  console.error(String(e.stderr || e.message).slice(0, 400));
  process.exit(1);
}

// 2) Bóc mọi cặp {table_id, name} ở bất kỳ độ sâu nào (chịu được khác biệt schema JSON)
const tables = [];
(function walk(o) {
  if (!o || typeof o !== "object") return;
  if (Array.isArray(o)) return o.forEach(walk);
  const id = o.table_id || o.tableId;
  const name = o.name ?? o.table_name;
  if (id && typeof name === "string") tables.push({ id, name });
  for (const v of Object.values(o)) walk(v);
})(JSON.parse(raw));

if (!tables.length) {
  console.error("✗ Không tìm thấy bảng nào trong Base. Base có đúng là bản sao 'Ads Agent' không?");
  process.exit(1);
}
console.log(`  ✓ thấy ${tables.length} bảng:`, tables.map((t) => t.name).join(" · "));

// 3) Khớp từng biến: ưu tiên SỐ đầu tên bảng, sau đó keyword
const nf = (s) => s.normalize("NFC").toLowerCase();
function pick(num, ...keys) {
  let m = tables.find((t) => new RegExp(`^\\s*${num}[.\\s]`).test(t.name));
  if (m) return m.id;
  m = tables.find((t) => keys.some((k) => nf(t.name).includes(k)));
  return m ? m.id : "";
}
const map = {
  T0: pick(0, "tổng tư lệnh", "tong tu lenh"),
  T1: pick(1, "chiến dịch", "chien dich"),
  T2: pick(2, "nhóm quảng cáo", "nhom quang cao", "nhóm qc"),
  T3: pick(3, "creative"),
  T4: pick(4, "tệp", "đối tượng", "audience"),
  T5: pick(5, "số liệu", "so lieu"),
  T_NK: pick(6, "nhật ký", "nhat ky"),
  T7: pick(7, "url", "thư viện"),
  T9: pick(9, "pixel"),
};

// 4) Ghi lại config.env (thay từng dòng Tn=, giữ phần comment phía sau)
let missing = [];
for (const [k, v] of Object.entries(map)) {
  if (!v) { missing.push(k); continue; }
  const re = new RegExp(`^(${k}=)([^#\\n]*)(#.*)?$`, "m");
  if (re.test(text)) text = text.replace(re, (_, p1, _2, cmt) => `${p1}${v}          ${cmt || ""}`.trimEnd());
  else text += `\n${k}=${v}`;
}
fs.writeFileSync(CFG, text);

console.log("\n✓ Đã điền table_id vào config.env:");
for (const [k, v] of Object.entries(map)) console.log(`  ${k} = ${v || "(KHÔNG TÌM THẤY)"}`);
if (missing.length) {
  console.log("\n⚠ Thiếu:", missing.join(", "),
    "\n  -> Mở Base kiểm tra tên bảng có đúng đánh số 0..9 không, hoặc điền tay table_id vào config.env.");
} else {
  console.log("\n🎉 Đủ hết. Giờ điền nốt CHAT + ACT + .secrets/meta-ads.env rồi chạy được.");
}
