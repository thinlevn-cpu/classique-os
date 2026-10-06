// 91-ra-soat-rac-oan.mjs — TÌM LEAD BỊ KẾT ÁN OAN.
//
// Bối cảnh 17/08/2026: trong bảng có record bị ghi
// "Chất lượng data = Rác" / "Độ tin cậy = Thấp" trong khi chỉ cần search EMAIL của họ
// trên Google là ra thông tin. Nghĩa là hệ kết luận "không có gì" trước khi thật sự đi tìm.
//
// Nguyên nhân thiết kế: SOP cũ coi email miễn phí (gmail…) là "vô dụng, bỏ qua tầng A"
// — đúng ở chỗ gmail không suy ra được doanh nghiệp, NHƯNG SAI ở chỗ bỏ luôn việc
// TRA CHÍNH CHUỖI EMAIL trên Google. Một địa chỉ gmail cá nhân vẫn để lại dấu vết:
// tin rao vặt, fanpage, hồ sơ công ty, diễn đàn, CV, group mua bán…
//
// Script CHỈ ĐỌC. Nó liệt kê các record đáng ngờ để đi tra lại thủ công/bằng agent.
//
// Dùng:
//   node 91-ra-soat-rac-oan.mjs              # liệt kê tất cả
//   node 91-ra-soat-rac-oan.mjs --limit 20
// Ra: ra-soat-rac-oan.json

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig, listAllRecords, cellText, normPhone, analyzeEmail } from "./_lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const LIMIT = (() => { const i = argv.indexOf("--limit"); return i >= 0 ? parseInt(argv[i + 1], 10) : 0; })();

const cfg = loadConfig();
const recs = listAllRecords(cfg);

const nghi = [];
let thongKe = { rac: 0, thap: 0, chuaRo: 0 };

for (const r of recs) {
  const f = r.fields;
  if (f[cfg.F_DA_ENRICH] !== true) continue;

  const chatluong = cellText(f[cfg.F_CHATLUONG]);
  const tincay = cellText(f[cfg.F_TINCAY]);
  const cokd = cellText(f[cfg.F_CO_KD]);
  const emailRaw = cellText(f[cfg.F_EMAIL]).replace(/^\[|\]\(.*$/g, "");
  const email = analyzeEmail(emailRaw, cfg.FREE_SET);
  const phone = normPhone(cellText(f[cfg.F_SDT]));
  const nguon = cellText(f[cfg.F_NGUON_ENRICH]);

  // Chỉ quan tâm bản án xấu
  const banAnXau = chatluong === "Rác" || tincay === "Thấp";
  if (!banAnXau) continue;

  // Còn đường tra: có email hợp lệ HOẶC có SĐT hợp lệ → chưa được phép kết án
  const conDuongTra = email.valid || !!phone;
  if (!conDuongTra) continue;

  // Đã thật sự tra email trên Google chưa? (dấu vết trong cột Nguồn enrich)
  const daTraEmail = /email|@|google/i.test(nguon) && /search|google|tra/i.test(nguon);

  if (chatluong === "Rác") thongKe.rac++;
  if (tincay === "Thấp") thongKe.thap++;
  if (cokd === "Chưa rõ") thongKe.chuaRo++;

  nghi.push({
    record_id: r.record_id,
    ho_ten: cellText(f[cfg.F_HOTEN]),
    sdt: phone || cellText(f[cfg.F_SDT]),
    sdt_hop_le: !!phone,
    email: email.valid ? emailRaw.toLowerCase() : emailRaw,
    email_hop_le: email.valid,
    chatluong, tincay, co_kd: cokd,
    da_tra_email_tren_google: daTraEmail,
    nguon_enrich: nguon.slice(0, 200),
  });
}

let list = LIMIT > 0 ? nghi.slice(0, LIMIT) : nghi;
const out = join(HERE, "ra-soat-rac-oan.json");
writeFileSync(out, JSON.stringify({ tong_record: recs.length, nghi_oan: nghi.length, danh_sach: list }, null, 2));

console.log("================ LEAD CÓ THỂ BỊ KẾT ÁN OAN ================");
console.log(`Tổng record            : ${recs.length}`);
console.log(`Bị "Rác"/"Thấp" NHƯNG vẫn còn đường tra: ${nghi.length}`);
console.log(`   trong đó "Rác"      : ${thongKe.rac}`);
console.log(`   trong đó "Thấp"     : ${thongKe.thap}`);
const chuaTraEmail = nghi.filter(x => !x.da_tra_email_tren_google && x.email_hop_le).length;
console.log(`Có email hợp lệ mà CHƯA hề tra email: ${chuaTraEmail}   ← đây là nhóm cần làm lại`);
console.log(`\nChi tiết → ${out}\n`);

for (const x of list.slice(0, 25)) {
  console.log(`[${x.chatluong}/${x.tincay}] ${x.ho_ten}  ·  ${x.sdt}${x.sdt_hop_le ? "" : " (SĐT sai)"}  ·  ${x.email}`);
}
if (list.length > 25) console.log(`… và ${list.length - 25} record nữa (xem file JSON)`);
