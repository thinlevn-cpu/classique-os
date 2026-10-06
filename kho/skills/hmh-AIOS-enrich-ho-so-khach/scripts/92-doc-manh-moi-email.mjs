// 92-doc-manh-moi-email.mjs — ĐỌC CHÍNH CHUỖI EMAIL như một manh mối (miễn phí, không cần web).
//
// Bối cảnh 17/08/2026: hệ đánh "Rác / Độ tin cậy Thấp" cho những lead mà
// chỉ cần nhìn email là biết họ làm gì. SOP cũ viết "email miễn phí (gmail…) → bỏ qua tầng này"
// — đúng ở chỗ tên miền gmail không suy ra doanh nghiệp, NHƯNG SAI ở chỗ vứt luôn PHẦN TÊN
// trước dấu @, trong khi người Việt thường tự khai nghề/thương hiệu/địa bàn ngay trong đó:
//     dangkiemhoangan@example.com   → trung tâm đăng kiểm Hoàng An
//     namtuanstore68@example.com    → có cửa hàng (store)
//     lananhtanlachb@example.com    → Tân Lạc, Hoà Bình
//     hienchupanh19@example.com     → chụp ảnh
// Đây là tín hiệu MIỄN PHÍ, có sẵn trong bảng, không tốn một lượt web nào.
//
// Script CHỈ ĐỌC. Nó chấm điểm manh mối để biết lead nào bị kết án oan và đáng research lại.
//
// Dùng:  node 92-doc-manh-moi-email.mjs [--limit N] [--tat-ca]
//        --tat-ca : liệt kê mọi lead có manh mối (mặc định chỉ lead đang bị Rác/Thấp)
// Ra:    manh-moi-email.json

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig, listAllRecords, cellText, normPhone, analyzeEmail } from "./_lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const LIMIT = (() => { const i = argv.indexOf("--limit"); return i >= 0 ? parseInt(argv[i + 1], 10) : 0; })();
const TAT_CA = argv.includes("--tat-ca");

// Từ khoá NGHỀ / MÔ HÌNH KINH DOANH hay gặp trong email người Việt.
// Không nhằm kết luận — chỉ nhằm nói "chỗ này có mùi, đi tra đi".
//
// ⚠️ LUẬT CHỌN TỪ (rút ra ngay lần chạy đầu 17/08): CHỈ nhận từ đủ dài và KHÔNG trùng
// với họ/tên/đệm phổ biến của người Việt. Bản đầu để "tra" → khớp trúng họ TRẦN
// (lytran, thuytran, trannghia…) và gán oan cả loạt người vào ngành "ăn uống";
// "quan" trúng Quang/Quân, "gd" trúng "gianGDan", "vt" trúng "dtvt" (điện tử viễn thông).
// Một công cụ chống-đoán-bừa mà tự đoán bừa thì còn tệ hơn không có.
// ⇒ Đã loại: tra · quan · gd · toc · son · tui · vinh · mọi viết tắt ≤2 ký tự.
const NGHE = {
  "bán hàng / cửa hàng": ["store", "shop", "cuahang", "sieuthi", "kinhdoanh", "buonban"],
  "làm đẹp / spa": ["spa", "thammy", "beauty", "makeup", "nail", "salon", "mypham", "cosmetic"],
  "nhiếp ảnh / studio": ["studio", "chupanh", "photo", "anhvien", "aocuoi", "wedding"],
  "bất động sản": ["bds", "batdongsan", "nhadat", "realestate", "canho"],
  "xây dựng / nội thất": ["xaydung", "noithat", "decor", "kientruc", "vlxd", "nhomkinh"],
  "ô tô / xe / đăng kiểm": ["dangkiem", "garage", "xemay", "phutung", "rentacar"],
  "ăn uống": ["food", "cafe", "coffee", "quanan", "nhahang", "bepnha", "trasua", "milktea"],
  "thời trang": ["thoitrang", "fashion", "quanao", "boutique"],
  "giáo dục / đào tạo": ["academy", "daotao", "giasu", "hocvien", "english", "ielts"],
  "y tế / nha khoa": ["nhakhoa", "dental", "phongkham", "clinic", "pharma"],
  "du lịch": ["dulich", "travel", "homestay", "resort"],
  "truyền thông / thiết kế": ["media", "agency", "design", "marketing", "quangcao", "inan"],
  "vận tải / logistics": ["vantai", "logistics", "chuyenphat", "giaohang", "xetai"],
  "nông nghiệp / thực phẩm": ["nongsan", "trangtrai", "haisan", "thucpham", "organic"],
  "chức danh chủ": ["ceo", "giamdoc", "chutich", "founder", "director"],
  "coach / tư vấn / đào tạo": ["lifecoach", "coaching", "chuyengia", "consultant", "mentor", "trainer"],
  "tài chính / bảo hiểm": ["baohiem", "insurance", "taichinh", "chungkhoan", "banking", "ketoan"],
};

// Địa danh — CHỈ dạng viết đầy đủ. Viết tắt 2 ký tự (hn/sg/vt/dl/hb…) đã bị loại bỏ
// vì trùng ngẫu nhiên quá nhiều; thà bỏ sót còn hơn gán sai địa bàn cho khách.
const DIA_DANH = {
  hanoi: "Hà Nội", hcm: "TP.HCM", saigon: "Sài Gòn", danang: "Đà Nẵng",
  cantho: "Cần Thơ", haiphong: "Hải Phòng", hoabinh: "Hoà Bình", binhduong: "Bình Dương",
  dalat: "Đà Lạt", vungtau: "Vũng Tàu", nhatrang: "Nha Trang", quynhon: "Quy Nhơn",
  thanhhoa: "Thanh Hoá", nghean: "Nghệ An", bacninh: "Bắc Ninh", dongnai: "Đồng Nai",
  longan: "Long An", tanlac: "Tân Lạc (Hoà Bình)", buonmathuot: "Buôn Ma Thuột",
};

function docEmail(local) {
  const s = String(local || "").toLowerCase();
  const sach = s.replace(/[._\-+]/g, "");         // gộp: minh_huong.tanlac → minhhuongtanlac
  const nghe = [], dia = [];

  for (const [ten, tokens] of Object.entries(NGHE)) {
    for (const t of tokens) {
      if (sach.includes(t)) { nghe.push({ nhom: ten, tu: t }); break; }
    }
  }
  for (const [vt, ten] of Object.entries(DIA_DANH)) {
    if (vt.length >= 3 && sach.includes(vt)) dia.push(ten);
  }
  // Số nhìn như năm sinh → gợi ý độ tuổi (chỉ tham khảo)
  const nam = (s.match(/(19[5-9]\d|20[0-2]\d)/) || [])[1] || "";
  return { nghe, dia: [...new Set(dia)], nam_sinh_doan: nam };
}

const cfg = loadConfig();
const recs = listAllRecords(cfg);

const ra = [];
for (const r of recs) {
  const f = r.fields;
  const emailRaw = cellText(f[cfg.F_EMAIL]).replace(/^\[|\]\(.*$/g, "");
  const em = analyzeEmail(emailRaw, cfg.FREE_SET);
  if (!em.valid) continue;

  const local = emailRaw.split("@")[0];
  const mm = docEmail(local);
  if (!mm.nghe.length && !mm.dia.length) continue;         // không có manh mối gì

  const chatluong = cellText(f[cfg.F_CHATLUONG]);
  const tincay = cellText(f[cfg.F_TINCAY]);
  const cokd = cellText(f[cfg.F_CO_KD]);
  const banAnXau = chatluong === "Rác" || tincay === "Thấp" || cokd === "Chưa rõ";
  if (!TAT_CA && !banAnXau) continue;

  ra.push({
    record_id: r.record_id,
    ho_ten: cellText(f[cfg.F_HOTEN]),
    sdt: normPhone(cellText(f[cfg.F_SDT])) || cellText(f[cfg.F_SDT]),
    email: emailRaw.toLowerCase(),
    da_enrich: f[cfg.F_DA_ENRICH] === true,
    chatluong, tincay, co_kd: cokd,
    manh_moi_nghe: mm.nghe.map(x => `${x.nhom} (“${x.tu}”)`),
    manh_moi_dia_ban: mm.dia,
    nam_sinh_doan: mm.nam_sinh_doan,
  });
}

const list = LIMIT > 0 ? ra.slice(0, LIMIT) : ra;
const out = join(HERE, "manh-moi-email.json");
writeFileSync(out, JSON.stringify({ tong_record: recs.length, co_manh_moi: ra.length, danh_sach: list }, null, 2));

console.log("============ MANH MỐI NẰM SẴN TRONG EMAIL ============");
console.log(`Tổng record                       : ${recs.length}`);
console.log(`Có manh mối trong email${TAT_CA ? "" : " mà vẫn bị Rác/Thấp/Chưa rõ"}: ${ra.length}`);
console.log(`Chi tiết → ${out}\n`);

for (const x of list.slice(0, 30)) {
  const nghe = x.manh_moi_nghe.join(", ") || "—";
  const dia = x.manh_moi_dia_ban.length ? ` · địa bàn: ${x.manh_moi_dia_ban.join("/")}` : "";
  console.log(`[${x.chatluong}/${x.tincay}] ${x.ho_ten}`);
  console.log(`    ${x.email}  →  ${nghe}${dia}`);
}
if (list.length > 30) console.log(`\n… và ${list.length - 30} record nữa (xem file JSON)`);
