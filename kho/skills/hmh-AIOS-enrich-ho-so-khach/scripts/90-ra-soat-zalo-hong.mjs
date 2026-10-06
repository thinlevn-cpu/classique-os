// 90-ra-soat-zalo-hong.mjs — RÀ SOÁT lead bị enrich trong lúc phiên Zalo đã chết.
//
// Bối cảnh (17/08/2026): phiên `zalo-agent` hết hạn từ 13/08 ~14:36 nhưng
// 20-lookup-zalo.mjs nuốt lỗi "Not logged in" thành `found:false` = "SĐT không có Zalo".
// Hệ mất mỏ neo giả tạo → quay sang tra masothue theo HỌ TÊN → ghép nhầm người.
//
// Script này CHỈ ĐỌC. Nó tìm các record mang dấu vết của lỗi đó, và (tuỳ chọn) tra
// lại Zalo để chứng minh SĐT thật sự có tài khoản — tức hồ sơ cũ dựng trên tiền đề sai.
//
// Dùng:
//   node 90-ra-soat-zalo-hong.mjs                 # liệt kê + đếm (không gọi Zalo)
//   node 90-ra-soat-zalo-hong.mjs --tra-zalo      # tra lại từng SĐT để xác nhận (chậm, 2s/số)
//   node 90-ra-soat-zalo-hong.mjs --tra-zalo --limit 10
// Ra: ra-soat-zalo-hong.json

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig, listAllRecords, cellText, normPhone } from "./_lib.mjs";
import { traZalo, kiemPhien } from "./_zalo.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const TRA_ZALO = argv.includes("--tra-zalo");
const LIMIT = (() => { const i = argv.indexOf("--limit"); return i >= 0 ? parseInt(argv[i + 1], 10) : 0; })();
// Nhịp mặc định 3,5s: lần chạy đầu (17/08) để 2s và quét 147 số liên tiếp → Zalo chặn
// "Vượt quá số request cho phép", làm hỏng chính kết quả rà soát.
const DELAY_MS = (() => { const i = argv.indexOf("--delay"); return i >= 0 ? parseInt(argv[i + 1], 10) : 3500; })();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Dấu vết của lỗi: cột "Nguồn enrich" hoặc "Hồ sơ khách" nhắc tới việc không có Zalo.
const DAU_VET = /không có zalo|found\s*=\s*false|không có tài khoản zalo|zalo.*(false|không)/i;

const cfg = loadConfig();
const recs = listAllRecords(cfg);

const dinh = [];
for (const r of recs) {
  const f = r.fields;
  if (f[cfg.F_DA_ENRICH] !== true) continue;
  const nguon = cellText(f[cfg.F_NGUON_ENRICH]);
  const hoso = cellText(f[cfg.F_HOSO]);
  if (!DAU_VET.test(nguon) && !DAU_VET.test(hoso)) continue;

  dinh.push({
    record_id: r.record_id,
    ho_ten: cellText(f[cfg.F_HOTEN]),
    sdt: normPhone(cellText(f[cfg.F_SDT])),
    email: cellText(f[cfg.F_EMAIL]).replace(/^\[|\]\(.*$/g, ""),
    co_kd: cellText(f[cfg.F_CO_KD]),
    tincay: cellText(f[cfg.F_TINCAY]),
    dkkd: cellText(f[cfg.F_DKKD]).slice(0, 120),
    nguon_enrich: nguon.slice(0, 160),
  });
}

let list = dinh;
if (LIMIT > 0) list = list.slice(0, LIMIT);

let coZalo = 0, khongZalo = 0, chuaTra = 0, dungVi = "";
if (TRA_ZALO) {
  const phien = kiemPhien();
  if (!phien.ok) {
    console.error(`\n✖ PHIÊN ZALO KHÔNG DÙNG ĐƯỢC (${phien.reason}) — không tra số nào.`);
    console.error(`  ${phien.hint}\n`);
    process.exit(2);
  }
  console.log(`Đang tra lại Zalo cho ${list.length} số (nghỉ ${DELAY_MS}ms/số)…\n`);
  for (const [i, x] of list.entries()) {
    if (!x.sdt) { x.zalo = { found: false, error: "SDT_KHONG_HOP_LE" }; chuaTra++; continue; }
    x.zalo = traZalo(x.sdt);

    // Lỗi hạ tầng ⇒ DỪNG. Chạy tiếp chỉ tạo ra kết luận sai hàng loạt —
    // đúng cái bẫy mà bản rà soát đầu tiên (17/08) đã sập: 147 số quét dày,
    // Zalo chặn giữa chừng, và mọi số sau đó bị ghi nhầm là "không có Zalo".
    if (x.zalo.error) {
      dungVi = x.zalo.error;
      console.error(`\n✖ DỪNG RÀ SOÁT tại số thứ ${i + 1}/${list.length} — ${x.zalo.error}`);
      console.error(x.zalo.error === "RATE_LIMITED"
        ? "  Zalo đang chặn vì tra quá dày. Nghỉ vài giờ rồi chạy lại (tăng --delay).\n"
        : "  Khắc phục rồi chạy lại. Kết quả các số CHƯA tra không được coi là 'không có Zalo'.\n");
      break;
    }

    if (x.zalo.found) { coZalo++; console.log(`✓ ${x.sdt}  ${x.ho_ten}  →  ${x.zalo.zalo_name}${x.zalo.status ? ` — ${x.zalo.status.slice(0,60)}` : ""}`); }
    else { khongZalo++; console.log(`· ${x.sdt}  ${x.ho_ten}  (thật sự không có Zalo)`); }
    if (i < list.length - 1) await sleep(DELAY_MS);
  }
  chuaTra += list.length - coZalo - khongZalo;
}

const out = join(HERE, "ra-soat-zalo-hong.json");
writeFileSync(out, JSON.stringify({
  tong_record: recs.length, dinh_loi: dinh.length,
  da_tra_zalo: TRA_ZALO, dung_vi: dungVi || null,
  ket_qua_day_du: TRA_ZALO && !dungVi,
  danh_sach: list,
}, null, 2));

console.log(`\n================ RÀ SOÁT LEAD DÍNH LỖI PHIÊN ZALO ================`);
console.log(`Tổng record trong bảng      : ${recs.length}`);
console.log(`Đã enrich, mang dấu vết lỗi : ${dinh.length}`);
if (TRA_ZALO) {
  console.log(`  → Tra lại CÓ Zalo         : ${coZalo}   ← hồ sơ cũ dựng trên tiền đề SAI, cần dựng lại`);
  console.log(`  → Tra lại KHÔNG có Zalo   : ${khongZalo}  (hồ sơ cũ vẫn đúng ở điểm này)`);
  console.log(`  → Chưa tra được           : ${chuaTra}  ${chuaTra ? "← CHƯA BIẾT, không được kết luận gì" : ""}`);
  if (dungVi) {
    console.log(`\n⚠ KẾT QUẢ CHƯA ĐẦY ĐỦ — dừng giữa chừng vì ${dungVi}.`);
    console.log(`  Đừng dùng con số trên để quyết định. Khắc phục rồi chạy lại.`);
  }
}
console.log(`Chi tiết → ${out}`);
