// 93-worklist-theo-nguon.mjs — Tạo worklist cho MỘT nguồn cụ thể (chạy lại có chủ đích).
//
// Khác 10-scan-leads.mjs: script kia chỉ lấy lead CHƯA enrich. Script này lấy theo NGUỒN
// và cho phép lấy cả record ĐÃ enrich — dùng khi cần DỰNG LẠI hồ sơ đã dựng sai
// (vd nhóm bị chấm Rác/Thấp trước khi có luật 5 cửa ngày 17/08).
//
// Dùng:
//   node 93-worklist-theo-nguon.mjs --nguon ebook-honnhanhoahop
//   node 93-worklist-theo-nguon.mjs --nguon ebook-honnhanhoahop --chua-enrich   # chỉ lead mới
//   node 93-worklist-theo-nguon.mjs --nguon ebook-honnhanhoahop --limit 10
// Ra: worklist.json (đúng định dạng 30-write-enrich/20-lookup-zalo đang dùng)
//     + kèm manh mối đọc từ phần tên email để research khỏi bỏ sót.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig, listAllRecords, cellText, normPhone, analyzeEmail, classify } from "./_lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const val = (n, d = "") => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const NGUON = val("--nguon");
const LIMIT = parseInt(val("--limit", "0"), 10);
const CHUA_ENRICH = argv.includes("--chua-enrich");

if (!NGUON) { console.error("Thiếu --nguon <tên nguồn>"); process.exit(1); }

// Đọc manh mối từ phần tên email (rút gọn từ 92-doc-manh-moi-email.mjs).
const NGHE = {
  "bán hàng/cửa hàng": ["store", "shop", "cuahang", "sieuthi", "kinhdoanh", "buonban"],
  "làm đẹp/spa": ["spa", "thammy", "beauty", "makeup", "nail", "salon", "mypham", "cosmetic"],
  "nhiếp ảnh/studio": ["studio", "chupanh", "photo", "anhvien", "aocuoi", "wedding"],
  "bất động sản": ["bds", "batdongsan", "nhadat", "realestate", "canho"],
  "xây dựng/nội thất": ["xaydung", "noithat", "decor", "kientruc", "vlxd", "nhomkinh"],
  "ô tô/đăng kiểm": ["dangkiem", "garage", "xemay", "phutung", "rentacar"],
  "ăn uống": ["food", "cafe", "coffee", "quanan", "nhahang", "bepnha", "trasua", "milktea"],
  "thời trang": ["thoitrang", "fashion", "quanao", "boutique"],
  "giáo dục/đào tạo": ["academy", "daotao", "giasu", "hocvien", "english", "ielts"],
  "y tế/nha khoa": ["nhakhoa", "dental", "phongkham", "clinic", "pharma"],
  "du lịch": ["dulich", "travel", "homestay", "resort"],
  "truyền thông/thiết kế": ["media", "agency", "design", "marketing", "quangcao", "inan"],
  "vận tải": ["vantai", "logistics", "chuyenphat", "giaohang", "xetai"],
  "nông sản/thực phẩm": ["nongsan", "trangtrai", "haisan", "thucpham", "organic"],
  "chức danh chủ": ["ceo", "giamdoc", "chutich", "founder", "director"],
  "coach/tư vấn": ["lifecoach", "coaching", "chuyengia", "consultant", "mentor", "trainer"],
  "tài chính/bảo hiểm": ["baohiem", "insurance", "taichinh", "chungkhoan", "ketoan"],
};
const DIA = { hanoi: "Hà Nội", hcm: "TP.HCM", saigon: "Sài Gòn", danang: "Đà Nẵng", cantho: "Cần Thơ",
  haiphong: "Hải Phòng", hoabinh: "Hoà Bình", binhduong: "Bình Dương", dalat: "Đà Lạt", vungtau: "Vũng Tàu",
  nhatrang: "Nha Trang", quynhon: "Quy Nhơn", thanhhoa: "Thanh Hoá", nghean: "Nghệ An", bacninh: "Bắc Ninh",
  dongnai: "Đồng Nai", longan: "Long An", tanlac: "Tân Lạc (Hoà Bình)", buonmathuot: "Buôn Ma Thuột" };

function manhMoi(local) {
  const sach = String(local || "").toLowerCase().replace(/[._\-+]/g, "");
  const nghe = [], dia = [];
  for (const [ten, toks] of Object.entries(NGHE)) if (toks.some(t => sach.includes(t))) nghe.push(ten);
  for (const [k, v] of Object.entries(DIA)) if (k.length >= 3 && sach.includes(k)) dia.push(v);
  return { nghe, dia };
}

const cfg = loadConfig();
const recs = listAllRecords(cfg);

const rows = [];
for (const r of recs) {
  const f = r.fields;
  const nguon = cellText(f[cfg.F_NGUON]);
  if (!nguon.toLowerCase().includes(NGUON.toLowerCase())) continue;

  const daEnrich = f[cfg.F_DA_ENRICH] === true;
  if (CHUA_ENRICH && daEnrich) continue;

  const name = cellText(f[cfg.F_HOTEN]);
  const phoneRaw = cellText(f[cfg.F_SDT]);
  const emailRaw = cellText(f[cfg.F_EMAIL]).replace(/^\[|\]\(.*$/g, "");
  const phone = normPhone(phoneRaw);
  const em = analyzeEmail(emailRaw, cfg.FREE_SET);
  const cls = classify({ name, phoneOk: !!phone, email: em });
  const mm = em.valid ? manhMoi(emailRaw.split("@")[0]) : { nghe: [], dia: [] };

  rows.push({
    record_id: r.record_id,
    ho_ten: name,
    sdt_raw: phoneRaw,
    sdt: phone,
    email: em.valid ? emailRaw.toLowerCase() : "",
    email_domain: em.domain,
    email_is_business: em.isBusiness,
    nguon,
    ghi_chu: cellText(f[cfg.F_GHICHU]),
    quality: cls.quality,
    quality_reason: cls.reason,
    needs_research: cls.needsResearch,
    already_enriched: daEnrich,
    // Trạng thái hiện tại — để so sánh sau khi dựng lại
    cu_chatluong: cellText(f[cfg.F_CHATLUONG]),
    cu_co_kd: cellText(f[cfg.F_CO_KD]),
    cu_tincay: cellText(f[cfg.F_TINCAY]),
    // Manh mối miễn phí từ phần tên email (cửa 2 trong luật 5 cửa)
    manh_moi_nghe: mm.nghe,
    manh_moi_dia_ban: mm.dia,
  });
}

const toResearch = rows.filter(x => x.needs_research);
const junk = rows.filter(x => !x.needs_research);
const worklist = LIMIT > 0 ? toResearch.slice(0, LIMIT) : toResearch;

// ⚠️ KHÔNG ghi đè worklist.json. File đó thuộc về enrich-watcher: gateway spawn watcher
// mỗi khi có lead mới đổ về, watcher chạy 10-scan-leads.mjs và THAY SẠCH nội dung file.
// Sự cố thật 17/08: đang chạy lô theo nguồn thì một lead mới về, worklist.json bị thay,
// script gộp kết quả suýt ghi hồ sơ "chưa tra ra gì" cho lead chưa hề được research.
// ⇒ Lô chạy theo nguồn dùng file RIÊNG, đặt tên theo nguồn.
const outPath = join(HERE, `worklist-${NGUON.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`);
writeFileSync(outPath, JSON.stringify({
  generated_records: recs.length, nguon_loc: NGUON,
  to_research: worklist, junk,
}, null, 2));

console.log(`=========== WORKLIST THEO NGUỒN: ${NGUON} ===========`);
console.log(`Tổng record trong bảng   : ${recs.length}`);
console.log(`Thuộc nguồn này          : ${rows.length}`);
console.log(`  → Cần research         : ${toResearch.length}  (ghi ${worklist.length} vào worklist)`);
console.log(`  → Rác (không liên hệ được): ${junk.length}`);
console.log(`  → Đã enrich trước đó   : ${rows.filter(x => x.already_enriched).length}  (sẽ dựng lại)`);
const coMM = rows.filter(x => x.manh_moi_nghe.length || x.manh_moi_dia_ban.length);
console.log(`  → Có manh mối sẵn trong email: ${coMM.length}`);
for (const x of coMM) console.log(`      · ${x.ho_ten} — ${x.email} → ${[...x.manh_moi_nghe, ...x.manh_moi_dia_ban].join(", ")}`);
console.log(`\nworklist.json → ${outPath}`);
