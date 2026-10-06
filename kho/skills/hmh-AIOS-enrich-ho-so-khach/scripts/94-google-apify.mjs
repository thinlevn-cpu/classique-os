// 94-google-apify.mjs — ⛔ ĐÃ GỘP, KHÔNG CÒN LOGIC RIÊNG (17/08/2026).
//
// File này và `25-google-vn.mjs` trước đây trùng chức năng (2 phiên dựng song song cùng ngày).
// Đã gộp làm một: **`25-google-vn.mjs`** giữ toàn bộ tính năng của cả hai —
//   · tham số hoá `--worklist` / `--out` (vốn của file này)
//   · bộ chấm điểm chống nhiễu `khop_chinh_xac` / `vn` / `dang_doc` + `--rescore` (vốn của 25)
// Đánh số 25 vì đây là một BƯỚC trong dây chuyền (00 → 10 → 20 → 25 → 30 → 40),
// còn dải 9x dành cho công cụ rà soát chạy theo lệnh.
//
// File này giữ lại làm CẦU CHUYỂN TIẾP để lệnh cũ không gãy — nó gọi thẳng sang 25.
// Cờ cũ vẫn chạy: `--limit`, `--uoc-tinh`, `--worklist`, `--out`.
// ⚠️ Khác biệt cần biết: định dạng kết quả nay theo chuẩn của 25
//    ({ record_id: { queries: { "<query>": [...] } } }) chứ không còn { sdt: [], email: [] }.
//
// → Hãy dùng thẳng:  node 25-google-vn.mjs --worklist <file> --out <file>

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const MOI = join(HERE, "25-google-vn.mjs");
const argv = process.argv.slice(2);

// Giữ NGUYÊN hành vi lệnh cũ để không trộn nhầm hai lô dữ liệu:
//   · nguồn mặc định là worklist (không phải rac-oan của 25)
//   · file kết quả mặc định là google-results.json (không phải google-vn.json của 25)
const args = [MOI, ...argv];
if (!argv.includes("--worklist") && !argv.includes("--from")) args.push("--from", "worklist");
if (!argv.includes("--out")) args.push("--out", "google-results.json");

console.error(
  "⚠️  `94-google-apify.mjs` đã gộp vào `25-google-vn.mjs` — đang chuyển tiếp.\n" +
  `    Lần sau chạy thẳng:  node 25-google-vn.mjs ${args.slice(1).join(" ")}\n`
);

process.exit(spawnSync(process.execPath, args, { stdio: "inherit" }).status ?? 1);
