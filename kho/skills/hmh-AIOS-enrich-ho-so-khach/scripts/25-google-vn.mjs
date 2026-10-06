#!/usr/bin/env node
/**
 * 25-google-vn.mjs — CỬA 3 & 4 của SOP: tra SĐT và EMAIL trên GOOGLE VIỆT NAM (qua Apify).
 *
 * ⚠️ File này là BẢN GỘP (17/08/2026) của hai script trùng chức năng do 2 phiên chạy song song:
 *    · 25-google-vn.mjs  — bộ chấm điểm chống nhiễu + `--rescore` miễn phí
 *    · 94-google-apify.mjs — tham số hoá `--worklist` / `--out` để chạy lô theo từng nguồn
 *    Nay chỉ còn MỘT file này. `94-google-apify.mjs` giữ lại làm cầu chuyển tiếp (deprecated).
 *
 * VÌ SAO CẦN (kiểm chứng 17/08/2026):
 *   · `WebSearch` của AI chạy **index MỸ** → tra SĐT/email tiếng Việt gần như rỗng
 *     (đo thật: tra một email khách kiểu «nghề + địa bàn» chỉ ra trang Wikipedia về họ của người đó).
 *   · Gọi thẳng Google/Bing/DuckDuckGo thì bị chặn hoặc CAPTCHA.
 *   · masothue KHÔNG tra được theo SĐT qua WebFetch — trả trang chủ kèm doanh nghiệp
 *     NGẪU NHIÊN, suýt gán nhầm hồ sơ.
 *   ⇒ Đường duy nhất lấy được index Google Việt Nam thật là actor apify/google-search-scraper
 *     với `countryCode: "vn"`.
 *
 * NGUYÊN TẮC: chỉ tra **CHUỖI DUY NHẤT** (`"<SĐT>"`, `"<email>"`) — mỗi chuỗi chỉ thuộc một
 * người nên miễn nhiễm bẫy trùng tên đã gây sự cố ghép nhầm hồ sơ 13–17/08.
 * **CẤM tra họ tên trần.**
 *
 * Chạy:
 *   node 25-google-vn.mjs --dry                          # in query + ước phí, KHÔNG gọi API
 *   node 25-google-vn.mjs --limit 8                      # chạy thử 8 lead cho rẻ
 *   node 25-google-vn.mjs                                # chạy hết nguồn đang chọn
 *   node 25-google-vn.mjs --from worklist                # lấy lead từ worklist.json
 *   node 25-google-vn.mjs --worklist worklist-<nguồn>.json --out google-<nguồn>.json
 *   node 25-google-vn.mjs --rescore                      # chấm lại kết quả cũ, KHÔNG tốn phí
 *
 * Cờ:
 *   --from rac-oan|worklist   nguồn lead (mặc định rac-oan = record bị đóng án sớm)
 *   --worklist <file>         chỉ định file worklist riêng (ngụ ý --from worklist)
 *   --out <file>              file kết quả (mặc định google-vn.json)
 *   --limit N                 số LEAD (mỗi lead tối đa 2 query: SĐT + email)
 *   --only-email / --only-sdt chỉ tra một cửa
 *   --dry (= --uoc-tinh)      in ra rồi dừng
 *   --rescore                 chấm lại file kết quả đã có, không gọi API
 *   --force                   tra lại cả lead đã có trong file kết quả
 *
 * Ra: `google-vn.json` — { record_id: { ho_ten, sdt, email, so_ket_qua, so_dang_doc,
 *                                       queries: { "<query>": [ {title,url,description,
 *                                       khop_chinh_xac, vn, dang_doc} ] }, tra_ngay, nguon } }
 *
 * Kết quả này là **MANH MỐI, không phải kết luận** — đầu vào cho Bước 3 (Claude research).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, isAbsolute } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ACTOR = "apify~google-search-scraper";
const GIA_MOI_QUERY = 0.0042; // USD/query — ĐO THẬT 17/08: $0,88 cho 209 query (không phải $0,0035 như ước ban đầu)

// ---------- cờ dòng lệnh ----------
const argv = process.argv.slice(2);
const co = (c) => argv.includes(c);
const lay = (c, md) => {
  const i = argv.indexOf(c);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : md;
};
const duongDan = (p) => (isAbsolute(p) ? p : join(HERE, p));

const WORKLIST_FILE = lay("--worklist", null);
const NGUON = WORKLIST_FILE ? "worklist" : lay("--from", "rac-oan");
const OUT = duongDan(lay("--out", "google-vn.json"));
const LIMIT = parseInt(lay("--limit", "0"), 10) || 0;
const DRY = co("--dry") || co("--uoc-tinh"); // --uoc-tinh: giữ tương thích lệnh cũ của 94
const FORCE = co("--force");
const CHI_EMAIL = co("--only-email");
const CHI_SDT = co("--only-sdt");

// ---------- đọc token ----------
function docToken() {
  if (process.env.APIFY_TOKEN) return process.env.APIFY_TOKEN.trim();
  // đi ngược lên tìm .secrets/apify.env (không gắn cứng đường dẫn máy nào)
  let dir = HERE;
  for (let i = 0; i < 8; i++) {
    const f = join(dir, ".secrets", "apify.env");
    if (existsSync(f)) {
      const m = readFileSync(f, "utf8").match(/^\s*APIFY_TOKEN\s*=\s*(.+)$/m);
      if (m) return m[1].replace(/\s+#.*$/, "").trim(); // KHÔNG in token ra màn hình
    }
    const cha = resolve(dir, "..");
    if (cha === dir) break;
    dir = cha;
  }
  console.error(
    "\n✖ Không tìm thấy APIFY_TOKEN.\n" +
    "  Đặt biến môi trường APIFY_TOKEN, hoặc tạo file `.secrets/apify.env` với dòng:\n" +
    "    APIFY_TOKEN=apify_api_xxxxxxxx\n" +
    "  (Lấy token ở https://console.apify.com/settings/integrations)\n"
  );
  process.exit(1);
}

// ---------- gom lead ----------
// ⚠️ MẶC ĐỊNH KHÔNG đụng `worklist.json`: file đó bị `enrich-watcher` ghi đè bất cứ lúc nào
// (gateway spawn một watcher mỗi khi có lead mới). Lô chạy theo nguồn PHẢI truyền
// `--worklist worklist-<nguồn>.json` riêng, nếu không kết quả sẽ lệch giữa chừng.
function docLead() {
  if (NGUON === "worklist") {
    const f = duongDan(WORKLIST_FILE || "worklist.json");
    if (!existsSync(f)) {
      console.error(`✖ Không thấy worklist: ${f}\n  Chạy \`node 10-scan-leads.mjs\` hoặc \`node 93-worklist-theo-nguon.mjs\` trước.`);
      process.exit(1);
    }
    const j = JSON.parse(readFileSync(f, "utf8"));
    const ds = j.to_research || j.danh_sach || (Array.isArray(j) ? j : []);
    return ds.map((r) => ({
      record_id: r.record_id, ho_ten: r.ho_ten || "", sdt: r.sdt || "", email: r.email || "",
    }));
  }
  const f = join(HERE, "ra-soat-rac-oan.json");
  if (!existsSync(f)) {
    console.error("✖ Chưa có ra-soat-rac-oan.json — chạy `node 91-ra-soat-rac-oan.mjs` trước.");
    process.exit(1);
  }
  const j = JSON.parse(readFileSync(f, "utf8"));
  return (j.danh_sach || []).map((r) => ({
    record_id: r.record_id, ho_ten: r.ho_ten || "", sdt: r.sdt || "", email: r.email || "",
  }));
}

function dungQuery(lead) {
  const q = {};
  if (!CHI_EMAIL && lead.sdt && /^0\d{9,10}$/.test(lead.sdt)) q.sdt = `"${lead.sdt}"`;
  if (!CHI_SDT && lead.email && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(lead.email)) q.email = `"${lead.email}"`;
  return q;
}

// ---------- chấm điểm kết quả (chống 2 loại nhiễu ĐO ĐƯỢC ngày 17/08) ----------
// Nhiễu 1 — TRÙNG SỐ QUỐC TẾ: đầu số VN trùng số nội địa nước khác.
//   Đo thật trên một lô lead: số 03… ra số cố định Tokyo (03-xxxx-xxxx) · số 07… ra danh bạ
//   hitta.se Thuỵ Điển · số 09… ra rao vặt Aleppo, Syria · số 09… khác ra +421… Slovakia.
//   Lô ebook còn trúng Jordan và Đài Loan.
// Nhiễu 2 — KHỚP MỘT PHẦN: Google KHÔNG tôn trọng ngoặc kép tuyệt đối — query
//   "hung@example.com" trả về kitty.hung@ / bradley.hung@, người khác hẳn.
// ⇒ Mỗi kết quả gắn 3 cờ để Claude đọc tín hiệu chứ không đọc rác. ĐỪNG GỠ BỘ LỌC NÀY.
const BLOCK = [
  /^z-[a-z]+\.blogspot\.com$/i,          // blog rác tự sinh "How to understand who called you"
  /^[a-z0-9]{10,}\.cloudfront\.net$/i,   // trang gom SĐT tự sinh, tên miền ngẫu nhiên
  /\.web\.core\.windows\.net$/i, /tmobile368\.com$/i,
  /jpnumber\.com$/i, /telguarder\./i, /09xy\.sk$/i, /9x\.sk$/i,
  /mobile-phone\.com\.tw$/i, /telefonforsaljare\./i, /france-inverse\.com$/i,
  /\.se$/i, /\.jp$/i, /\.kr$/i, /\.ru$/i, /\.pl$/i, /\.sk$/i, /\.tw$/i, // danh bạ SĐT nước khác
  // scribd/pdfcoffee: toàn "data VIP" bị rò rỉ — KHÔNG dùng làm nguồn
  // (vừa không kiểm chứng được, vừa không nên đưa vào hồ sơ khách)
  /scribd\.com$/i, /pdfcoffee\.com$/i,
];
const SITE_VN = /(\.vn$|\.vn\/|masothue\.com|tratencongty\.com|infodoanhnghiep|hsctvn|thongtindoanhnghiep|bni06\.com)/i;
const CHU_VN = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

function chamDiem(q, r) {
  const chuoi = q.replace(/"/g, "").toLowerCase();
  const all = `${r.title || ""} ${r.description || ""} ${r.url || ""}`.toLowerCase();
  let host = "";
  try { host = new URL(r.url).hostname; } catch {}

  // khớp chính xác: chuỗi xuất hiện nguyên vẹn VÀ ký tự liền trước không phải ký tự định danh
  // (chặn "hung@…" khớp vào "kitty.hung@…")
  const i = all.indexOf(chuoi);
  const truoc = i > 0 ? all[i - 1] : " ";
  r.khop_chinh_xac = i >= 0 && !/[a-z0-9._+-]/.test(truoc);

  const rac = BLOCK.some((re) => re.test(host));
  r.vn = SITE_VN.test(r.url || "") || CHU_VN.test(`${r.title || ""} ${r.description || ""}`);
  // ĐÁNG ĐỌC = khớp đúng chuỗi + có dấu hiệu Việt Nam + không phải nguồn rác
  r.dang_doc = r.khop_chinh_xac && r.vn && !rac;
  return r;
}

function demTinHieu(v) {
  let n = 0;
  for (const res of Object.values(v.queries || {})) n += (res || []).filter((r) => r.dang_doc).length;
  return n;
}

// ---------- gọi Apify ----------
async function chayActor(token, queries) {
  const input = {
    queries: queries.join("\n"),
    resultsPerPage: 10,
    maxPagesPerQuery: 1,
    countryCode: "vn",              // ⭐ google.com.vn — điểm khác biệt với WebSearch
    languageCode: "vi",
    includeUnfilteredResults: true, // lấy cả kết quả Google thường lọc bớt — OSINT cần
    mobileResults: false,
    saveHtml: false,
    saveHtmlToKeyValueStore: false, // mặc định TRUE, làm actor chậm hẳn
  };
  const r = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`Apify khởi chạy lỗi HTTP ${r.status}: ${(await r.text()).slice(0, 400)}`);
  const { data: run } = await r.json();
  console.log(`   run ${run.id} → https://console.apify.com/actors/runs/${run.id}`);

  for (let i = 0; i < 240; i++) {           // chờ tối đa 20 phút
    await new Promise((s) => setTimeout(s, 5000));
    const s = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${token}`);
    const { data: st } = await s.json();
    if (i % 6 === 0) console.log(`   … ${st.status} (${(i + 1) * 5}s)`);
    if (st.status === "SUCCEEDED") break;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(st.status)) {
      throw new Error(`Apify run ${st.status} — xem https://console.apify.com/actors/runs/${run.id}`);
    }
    if (i === 239) throw new Error("Apify chạy quá 20 phút — dừng chờ.");
  }
  const d = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${token}&clean=true`);
  return await d.json();
}

// ---------- chính ----------
const cu = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

// File kết quả của bản 94 CŨ có hình dạng khác ({sdt:[…], email:[…]} thay vì {queries:{…}}).
// Không ép kiểu, không ghi đè — chỉ giữ để chống tra trùng, và báo cho người chạy biết.
const CU_LEGACY = Object.values(cu).filter((v) => v && !v.queries).length;
if (CU_LEGACY) {
  console.warn(
    `⚠️  ${CU_LEGACY}/${Object.keys(cu).length} bản ghi trong ${OUT} theo ĐỊNH DẠNG CŨ (bản 94).\n` +
    `    Chúng chỉ dùng để chống tra trùng, KHÔNG chấm điểm lại được (thiếu chuỗi query gốc).\n` +
    `    Muốn có cờ dang_doc cho lô này thì tra lại với --force, hoặc dùng --out file mới.`
  );
}

// --rescore: chấm lại file kết quả đã có, KHÔNG gọi API (miễn phí) — dùng khi siết bộ lọc nhiễu
if (co("--rescore")) {
  let n = 0, boQua = 0;
  for (const v of Object.values(cu)) {
    if (!v || !v.queries) { boQua++; continue; }   // bản ghi định dạng cũ — để nguyên
    for (const [q, res] of Object.entries(v.queries)) {
      if (res) for (const r of res) chamDiem(q, r);
    }
    v.so_dang_doc = demTinHieu(v);
    if (v.so_dang_doc) n++;
  }
  if (boQua) console.log(`   (bỏ qua ${boQua} bản ghi định dạng cũ)`);
  writeFileSync(OUT, JSON.stringify(cu, null, 2), "utf8");
  console.log(`♻️  Chấm lại ${Object.keys(cu).length} lead (không tốn phí) → ${n} lead có tín hiệu thật.`);
  console.log(`   → ${OUT}`);
  process.exit(0);
}

const leads = docLead();
const canTra = [];
for (const l of leads) {
  if (!FORCE && cu[l.record_id]) continue;
  const q = dungQuery(l);
  if (!q.sdt && !q.email) continue;
  canTra.push({ ...l, q });
  if (LIMIT && canTra.length >= LIMIT) break;
}

const queries = [];
for (const l of canTra) { if (l.q.sdt) queries.push(l.q.sdt); if (l.q.email) queries.push(l.q.email); }
const soSdt = canTra.filter((l) => l.q.sdt).length;
const soMail = canTra.filter((l) => l.q.email).length;

console.log(`\n📋 Nguồn: ${NGUON}${WORKLIST_FILE ? ` (${WORKLIST_FILE})` : ""} · ${leads.length} lead · cần tra: ${canTra.length}`);
console.log(`🔎 ${queries.length} query (${soSdt} SĐT + ${soMail} email) · ước phí ≈ $${(queries.length * GIA_MOI_QUERY).toFixed(3)} (~${Math.round(queries.length * GIA_MOI_QUERY * 26000).toLocaleString("vi-VN")}đ)`);
console.log(`📄 Ghi ra: ${OUT}\n`);

if (!queries.length) { console.log("Không có gì để tra. Xong."); process.exit(0); }
if (DRY) {
  console.log(queries.slice(0, 40).join("\n"));
  if (queries.length > 40) console.log(`… và ${queries.length - 40} query nữa`);
  console.log("\n(--dry: chỉ ước tính, không gọi API)");
  process.exit(0);
}

const token = docToken();
console.log("🚀 Gọi apify/google-search-scraper (countryCode=vn, languageCode=vi)…");
const items = await chayActor(token, queries);

// Gắn kết quả về đúng lead: actor trả searchQuery.term đúng bằng chuỗi query đã gửi.
const theoQuery = {};
for (const it of items) {
  const key = (it.searchQuery?.term || "").trim();
  const lay1 = (o, loc) => ({ title: o.title, url: o.url, description: o.description, ...(loc ? { loc: true } : {}) });
  theoQuery[key] = [
    ...(it.organicResults || []).map((o) => lay1(o, false)),
    ...(it.unfilteredResults || []).map((o) => lay1(o, true)),
  ];
}

const ngay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // GMT+7
let coKq = 0, coTinHieu = 0;
for (const l of canTra) {
  const kq = {};
  for (const q of [l.q.sdt, l.q.email].filter(Boolean)) {
    kq[q] = theoQuery[q] ? theoQuery[q].map((r) => chamDiem(q, r)) : null;
  }
  const v = {
    ho_ten: l.ho_ten, sdt: l.sdt, email: l.email,
    so_ket_qua: Object.values(kq).reduce((a, x) => a + (x?.length || 0), 0),
    queries: kq, tra_ngay: ngay, nguon: "apify/google-search-scraper vn",
  };
  v.so_dang_doc = demTinHieu(v);
  if (v.so_ket_qua) coKq++;
  if (v.so_dang_doc) coTinHieu++;
  cu[l.record_id] = v;
}
writeFileSync(OUT, JSON.stringify(cu, null, 2), "utf8");

console.log(`\n================ GOOGLE (index VN) ================`);
console.log(`Query gửi        : ${queries.length}`);
console.log(`Lead có kết quả  : ${coKq} / ${canTra.length}`);
console.log(`⭐ Lead có TÍN HIỆU THẬT (dang_doc): ${coTinHieu} / ${canTra.length}`);
console.log(`→ ${OUT}`);
console.log(`\n⚠ Kết quả là MANH MỐI, chỉ gán vào hồ sơ khi KHỚP CHÉO (SOP mục 7.3).`);
console.log(`⚠ Rỗng ≠ không tồn tại: lead 0 tín hiệu chỉ được ghi "chưa tra được", KHÔNG ghi "không có thông tin".`);
