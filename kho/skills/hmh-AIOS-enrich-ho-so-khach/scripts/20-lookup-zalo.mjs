// 20-lookup-zalo.mjs — TẦNG B0: tra SĐT trên Zalo (nguồn mạnh nhất với khách Việt).
// Đọc worklist.json → với mỗi lead gọi zalo-agent → ghi zalo.json.
//
// Vì sao đặt TRƯỚC research web: khách VN hầu hết dùng gmail nên tra tên miền vô dụng,
// còn WebSearch (index Mỹ) tra SĐT/tên Việt gần như không ra. Zalo trả thẳng:
//   - có/không có Zalo  → xác thực SĐT thật hay số ma
//   - display_name      → TÊN THẬT (khách hay khai tên cụt ở form)
//   - status            → thường là NGHỀ/CHỨC DANH tự khai ("Founder học viện …")
// Tên thật + nghề lấy được ở đây chính là từ khoá để tầng sau tra masothue / Facebook.
//
// ⚠️ BÀI HỌC 13–17/08/2026 — vì sao file này có cầu chì:
// Bản cũ bọc lệnh trong `try{…}catch{}` RỖNG với comment "User không hợp lệ = không có Zalo".
// Catch đó nuốt MỌI lỗi, kể cả "Not logged in". Phiên Zalo chết ⇒ 100% lead ra found:false
// ⇒ hệ tưởng khách dùng số ảo ⇒ mất mỏ neo ⇒ tra masothue theo HỌ TÊN ⇒ GHÉP NHẦM NGƯỜI.
// Trôi 4 ngày, 147 record dính dấu vết, không một cảnh báo nào.
// ⇒ Luật: KHÔNG BAO GIỜ dịch một lỗi hạ tầng thành một kết luận về khách hàng.
// Toàn bộ việc đọc kết quả nằm ở `_zalo.mjs` (nguồn sự thật duy nhất).
//
// Dùng: node 20-lookup-zalo.mjs [--delay 2000] [--limit N]
// Ra:   zalo.json        = { "<record_id>": { found, zalo_name, status, uid, gender, sdob, avatar } }
//       zalo-status.json = { session_ok, checked_at, hit, miss, failed, reason }
// Mã thoát: 0 bình thường · 2 PHIÊN CHẾT (zalo-agent login) · 3 BỊ CHẶN (nghỉ rồi chạy lại)
//           → watcher phải DỪNG lượt ở cả 2 và 3.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { traZalo, kiemPhien, EXIT_SESSION_DEAD, EXIT_RATE_LIMITED } from "./_zalo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKLIST = path.join(__dirname, "worklist.json");
const OUT = path.join(__dirname, "zalo.json");
const OUT_STATUS = path.join(__dirname, "zalo-status.json");

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const DELAY_MS = Number(arg("--delay", 2000));   // nghỉ giữa 2 lần tra — tránh Zalo chặn
const LIMIT = Number(arg("--limit", 0));         // 0 = tất cả
const MAX_LOI_LIEN_TIEP = Number(process.env.ZALO_MAX_FAIL || 3);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ghiStatus(o) {
  fs.writeFileSync(OUT_STATUS, JSON.stringify({ checked_at: new Date().toISOString(), ...o }, null, 1), "utf8");
}

// ── Kiểm phiên TRƯỚC khi tra: hỏng thì dừng ngay, đừng tra oan cả trăm số ──────
const phien = kiemPhien();
if (!phien.ok) {
  ghiStatus({ session_ok: false, reason: phien.reason, hint: phien.hint });
  console.error("\n✖ PHIÊN ZALO KHÔNG DÙNG ĐƯỢC —", phien.reason);
  console.error("  KHÔNG được coi đây là 'khách không có Zalo'. Dừng lượt enrich.");
  console.error("  Khắc phục:", phien.hint, "\n");
  process.exit(EXIT_SESSION_DEAD);
}

const wl = JSON.parse(fs.readFileSync(WORKLIST, "utf8"));
let leads = [...(wl.to_research || []), ...(wl.junk || [])].filter((l) => l.sdt);
if (LIMIT > 0) leads = leads.slice(0, LIMIT);

const out = {};
let hit = 0, miss = 0, failed = 0, loiLienTiep = 0, sup = "";

for (const [i, lead] of leads.entries()) {
  const rec = traZalo(lead.sdt);
  out[lead.record_id] = rec;

  if (rec.found) {
    hit++; loiLienTiep = 0;
    console.log(`✓ ${lead.sdt}  ${rec.zalo_name}${rec.status ? ` — ${rec.status}` : ""}`);
  } else if (!rec.error) {
    miss++; loiLienTiep = 0;
    console.log(`· ${lead.sdt}  (không có Zalo)`);
  } else {
    failed++; loiLienTiep++;
    console.log(`⚠ ${lead.sdt}  LỖI TRA: ${rec.error} — không kết luận gì về khách`);
    // ── CẦU CHÌ: hỏng hệ thì dừng, đừng biến nó thành đặc điểm của khách ──
    if (rec.error === "SESSION_DEAD" || rec.error === "RATE_LIMITED" || loiLienTiep >= MAX_LOI_LIEN_TIEP) {
      sup = rec.error === "SESSION_DEAD" ? "SESSION_DEAD"
          : rec.error === "RATE_LIMITED" ? "RATE_LIMITED" : "LOOKUP_FAILED";
      console.error(`\n✖ NGẮT MẠCH sau ${loiLienTiep} lỗi liên tiếp (${rec.error}).`);
      console.error("  Dừng tra để KHÔNG sinh ra hàng loạt hồ sơ dựng trên tiền đề sai.\n");
      break;
    }
  }

  if (i < leads.length - 1) await sleep(DELAY_MS);
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 1), "utf8");
ghiStatus({ session_ok: !sup, hit, miss, failed, reason: sup });

console.log(`\n================ ZALO LOOKUP ================`);
console.log(`Đã tra          : ${hit + miss + failed} / ${leads.length}`);
console.log(`Có Zalo         : ${hit}   (có tên thật${hit ? " + status nghề nghiệp" : ""})`);
console.log(`Không có Zalo   : ${miss} (SĐT nghi sai/ảo)`);
console.log(`Lỗi tra         : ${failed} ${failed ? "← KHÔNG kết luận gì về những khách này" : ""}`);
console.log(`zalo.json → ${OUT}`);

// ── CẦU CHÌ THỨ HAI: "không tra nổi số nào" ───────────────────────────────────
// Cầu chì đếm-lỗi-liên-tiếp ở trên chỉ nổ khi có ≥3 lead trong lượt. Nhưng thực tế
// gateway spawn một lượt cho MỖI lead mới → hầu hết lượt chỉ có 1 lead, cầu chì kia
// không bao giờ chạm ngưỡng. Nên chốt thêm: cả lượt không thu được kết quả rõ ràng nào
// (không số nào có Zalo, cũng không số nào được CLI khẳng định là không có) mà lại có lỗi
// ⇒ hệ đang hỏng, KHÔNG PHẢI khách đều dùng số ảo ⇒ dừng lượt.
if (!sup && failed > 0 && hit === 0 && miss === 0) {
  sup = "RATE_LIMITED";
  console.error("\n✖ Cả lượt không tra nổi số nào (toàn lỗi) → coi như hệ hỏng, không phải đặc điểm khách.");
}

if (sup === "SESSION_DEAD") { console.error("\n✖ PHIÊN ZALO CHẾT — lượt enrich phải dừng. Chạy: zalo-agent login"); process.exit(EXIT_SESSION_DEAD); }
if (sup === "RATE_LIMITED") { console.error("\n✖ ZALO KHÔNG TRA ĐƯỢC (chặn hoặc lỗi) — nghỉ rồi chạy lại, tăng --delay."); process.exit(EXIT_RATE_LIMITED); }
// LOOKUP_FAILED = tra hỏng KHÔNG RÕ NGUYÊN NHÂN. Trước 08/09/2026 nhánh này thoát mã 2,
// tức là báo "PHIÊN ZALO HẾT HẠN" và giục đi quét QR — trong khi zalo-agent status vẫn
// "Logged in as …". Sai thông điệp thì người sửa đi sai đường; mã 3 (tra không được) mới đúng.
if (sup) { console.error("\n✖ Tra Zalo hỏng liên tiếp, chưa rõ nguyên nhân — xem trường raw trong zalo.json."); process.exit(EXIT_RATE_LIMITED); }
