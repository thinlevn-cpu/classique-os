// Ghi kết quả enrich ngược vào bảng + bật cờ "Đã enrich" (chống trùng).
// Dùng:  node 30-write-enrich.mjs results.json
// results.json = [{ record_id, chatluong, co_kd, nganhnghe, dkkd, hoso, tincay, nguon, goctuvan, link }, ...]
//   chatluong ∈ {Lead thật, Cần kiểm tra, Rác}
//   co_kd     ∈ {Có, Không, Chưa rõ}
//   tincay    ∈ {Cao, Trung bình, Thấp}
import { readFileSync } from "node:fs";
import { loadConfig, updateRecord } from "./_lib.mjs";

// ── CHẾ ĐỘ HỒ SƠ MỀM (08/09/2026) ─────────────────────────────────────────────
// Khi Zalo không tra được, hệ vẫn dựng hồ sơ từ email + Google VN để sale có cái mà gọi,
// NHƯNG hồ sơ đó thiếu mỏ neo mạnh nhất nên KHÔNG được coi là xong: cờ "Đã enrich"
// phải để trống, để lượt sau — khi Zalo sống lại — lead này được tra lại và ghi đè.
// Bật bằng biến môi trường ENRICH_HO_SO_MEM=1 (watcher tự đặt) hoặc cờ --ho-so-mem.
const HO_SO_MEM = process.env.ENRICH_HO_SO_MEM === "1" || process.argv.includes("--ho-so-mem");

const cfg = loadConfig();
const file = process.argv[2];
if (!file) { console.error("Thiếu đường dẫn results.json"); process.exit(1); }

const items = JSON.parse(readFileSync(file, "utf8"));
const list = Array.isArray(items) ? items : [items];

let ok = 0, fail = 0;
for (const it of list) {
  if (!it.record_id) { console.error("Bỏ qua item thiếu record_id"); fail++; continue; }
  // Hồ sơ mềm: ghi đủ nội dung nhưng KHÔNG tick cờ → lead vẫn nằm trong hàng chờ.
  const patch = HO_SO_MEM ? {} : { [cfg.F_DA_ENRICH]: true };
  if (it.chatluong)  patch[cfg.F_CHATLUONG]    = it.chatluong;
  if (it.co_kd)      patch[cfg.F_CO_KD]        = it.co_kd;
  if (it.nganhnghe)  patch[cfg.F_NGANHNGHE]    = it.nganhnghe;
  if (it.dkkd)       patch[cfg.F_DKKD]         = it.dkkd;
  if (it.hoso)       patch[cfg.F_HOSO]         = it.hoso;
  if (it.tincay)     patch[cfg.F_TINCAY]       = it.tincay;
  if (it.nguon)      patch[cfg.F_NGUON_ENRICH] = it.nguon;
  if (it.goctuvan)   patch[cfg.F_GOCTUVAN]     = it.goctuvan;
  if (it.link)       patch[cfg.F_LINK]         = it.link;
  try {
    updateRecord(cfg, it.record_id, patch);
    ok++;
    console.log(`✓ ${it.record_id}  ${it.chatluong || ""} | KD:${it.co_kd || "?"} | ${it.nganhnghe || ""}`);
  } catch (e) {
    fail++;
    console.error(`✗ ${it.record_id}: ${String(e.message || e).slice(0, 200)}`);
  }
}
console.log(`\nĐã ghi: ${ok} · Lỗi: ${fail}`);
if (HO_SO_MEM) {
  console.log("⚠ HỒ SƠ MỀM — chưa tick cờ \"Đã enrich\". Lead vẫn nằm trong hàng chờ để tra lại khi Zalo sống.");
}
