#!/usr/bin/env node
// scaffold.mjs — Sinh khung website ngành dịch vụ (10 khối chuyển đổi), responsive, mobile-first.
// Chạy bằng Node >= 18. KHÔNG cần cài package.
//
// Dùng:
//   node scaffold.mjs --brief brief.json
//   node scaffold.mjs --ten "Nha khoa ABC" --slug nha-khoa-abc --mau "#0E7C7B" --sdt "0900000000"
//
// Sinh: output/YYYY-MM-DD-web-<slug>/index.html  (+ brief.json)
// LƯU Ý: đây chỉ là KHUNG placeholder. Bước 4 trong SKILL.md phải đổ nội dung THẬT vào.

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const k = t.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) a[k] = true;
      else { a[k] = v; i++; }
    }
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  console.log(`scaffold.mjs — sinh khung website dịch vụ
  --brief <file.json>   Đọc brief đầy đủ (ten, slug, nganh, mau, sdt, dich_vu[], khach_hang, usp, cta, lien_he...)
  --ten <text>          Tên doanh nghiệp (bắt buộc nếu không có --brief)
  --slug <kebab>        Slug thư mục (mặc định suy từ tên)
  --mau <#hex>          Màu nhấn CTA (mặc định #0E7C7B)
  --sdt <số>            SĐT click-to-call
  --nganh <text>        Ngành dịch vụ
  --out <dir>           Ghi đè thư mục output
`);
  process.exit(0);
}

// ---- Gom brief ----
let brief = {};
if (typeof args.brief === "string" && fs.existsSync(args.brief)) {
  brief = JSON.parse(fs.readFileSync(args.brief, "utf8"));
}
const ten   = args.ten || brief.ten;
if (!ten) { console.error("LỖI: thiếu --ten hoặc --brief có 'ten'."); process.exit(1); }

const toSlug = s => s.toString().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const slug   = args.slug || brief.slug || toSlug(ten);
const mau    = args.mau || brief.mau || brief.thuong_hieu?.mau || "#0E7C7B";
const sdt    = args.sdt || brief.sdt || brief.lien_he?.sdt || "0900000000";
const nganh  = args.nganh || brief.nganh || "dịch vụ";
const diaChi = brief.lien_he?.dia_chi || brief.dia_chi || "Địa chỉ của bạn";
const gio    = brief.lien_he?.gio || "8:00 – 20:00 (T2–CN)";
const cta    = brief.cta || "Nhận tư vấn miễn phí";
const dichVu = Array.isArray(brief.dich_vu) && brief.dich_vu.length
  ? brief.dich_vu : ["Dịch vụ 1", "Dịch vụ 2", "Dịch vụ 3"];

const today = new Date().toISOString().slice(0, 10);
const outDir = args.out || path.join("output", `${today}-web-${slug}`);
fs.mkdirSync(outDir, { recursive: true });

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const telHref = "tel:" + sdt.replace(/[^0-9+]/g, "");

const dichVuCards = dichVu.map(d => `        <article class="card">
          <h3>${esc(d)}</h3>
          <p>[Mô tả ngắn kết quả khách nhận được từ "${esc(d)}" — viết theo Phương trình Giá trị: nhanh, dễ, đáng tin.]</p>
          <a class="link" href="#lien-he">Tìm hiểu &rarr;</a>
        </article>`).join("\n");

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(ten)} — ${esc(nganh)}</title>
<meta name="description" content="[Mô tả SEO 150 ký tự: ${esc(ten)} cung cấp ${esc(nganh)}...]">
<style>
  :root{ --brand:${mau}; --ink:#14202e; --muted:#5b6b7a; --bg:#ffffff; --soft:#f4f7f9; --radius:14px; }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:'Be Vietnam Pro',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);line-height:1.6;background:var(--bg)}
  .wrap{max-width:1100px;margin:0 auto;padding:0 20px}
  h1,h2,h3{line-height:1.2;font-weight:800;letter-spacing:-.01em}
  h1{font-size:clamp(1.9rem,5vw,3.2rem)} h2{font-size:clamp(1.5rem,3.5vw,2.2rem);margin-bottom:.6em} h3{font-size:1.2rem}
  p{color:var(--muted)} section{padding:64px 0}
  .btn{display:inline-block;background:var(--brand);color:#fff;font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.12);transition:transform .15s}
  .btn:hover{transform:translateY(-2px)}
  .btn-ghost{background:transparent;color:var(--brand);border:2px solid var(--brand);box-shadow:none}
  .link{color:var(--brand);font-weight:700;text-decoration:none}
  /* header */
  header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid #eef2f5}
  .nav{display:flex;align-items:center;justify-content:space-between;height:64px}
  .brand{font-weight:800;font-size:1.15rem;color:var(--ink);text-decoration:none}
  .nav ul{display:flex;gap:22px;list-style:none}
  .nav a{color:var(--ink);text-decoration:none;font-weight:600;font-size:.95rem}
  .nav .btn{padding:10px 20px}
  .menu-btn{display:none;background:none;border:0;font-size:1.6rem;cursor:pointer}
  /* hero */
  .hero{background:linear-gradient(180deg,var(--soft),#fff);text-align:center}
  .hero p.sub{font-size:1.15rem;max-width:680px;margin:18px auto 26px}
  .trust{display:flex;gap:26px;justify-content:center;flex-wrap:wrap;margin-top:30px;color:var(--muted);font-weight:600;font-size:.95rem}
  /* grids */
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .card{background:var(--soft);border:1px solid #eef2f5;border-radius:var(--radius);padding:26px}
  .card h3{margin-bottom:.5em}
  .pain li{margin:10px 0;color:var(--ink)}
  .steps{counter-reset:s} .steps .card{position:relative}
  .steps .card::before{counter-increment:s;content:counter(s);position:absolute;top:-16px;left:22px;width:34px;height:34px;background:var(--brand);color:#fff;border-radius:50%;display:grid;place-items:center;font-weight:800}
  .soft{background:var(--soft)}
  .center{text-align:center}
  details{background:#fff;border:1px solid #eef2f5;border-radius:10px;padding:14px 18px;margin:10px 0}
  summary{font-weight:700;cursor:pointer}
  .guarantee{background:var(--brand);color:#fff;border-radius:var(--radius);padding:34px;text-align:center}
  .guarantee p{color:rgba(255,255,255,.9)}
  /* contact */
  .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px}
  form{display:grid;gap:12px} input,textarea{padding:13px;border:1px solid #d7dee4;border-radius:10px;font:inherit}
  footer{background:var(--ink);color:#c7d2dc;padding:40px 0;font-size:.95rem}
  footer a{color:#fff;text-decoration:none}
  /* sticky call */
  .call-fab{position:fixed;right:18px;bottom:18px;z-index:60;background:var(--brand);color:#fff;border-radius:999px;padding:14px 20px;font-weight:800;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.25);display:none}
  @media(max-width:860px){
    .grid,.contact-grid{grid-template-columns:1fr}
    .nav ul{display:none} .menu-btn{display:block}
    .nav ul.open{display:flex;position:absolute;top:64px;left:0;right:0;flex-direction:column;background:#fff;padding:16px 20px;border-bottom:1px solid #eef2f5}
    .call-fab{display:inline-block}
  }
</style>
</head>
<body>

<header>
  <div class="wrap nav">
    <a class="brand" href="#">${esc(ten)}</a>
    <ul id="menu">
      <li><a href="#dich-vu">Dịch vụ</a></li>
      <li><a href="#vi-sao">Vì sao chọn</a></li>
      <li><a href="#bang-chung">Khách nói</a></li>
      <li><a href="#lien-he">Liên hệ</a></li>
      <li><a class="btn" href="${telHref}">Gọi ngay</a></li>
    </ul>
    <button class="menu-btn" onclick="document.getElementById('menu').classList.toggle('open')">&#9776;</button>
  </div>
</header>

<!-- 1. HERO -->
<section class="hero">
  <div class="wrap">
    <h1>[Headline: ${esc(nganh)} cho [khách] — đạt [kết quả mơ ước]]</h1>
    <p class="sub">[Subhead 1 câu: cách bạn làm / khác biệt / yếu tố nhanh – đảm bảo.]</p>
    <a class="btn" href="#lien-he">${esc(cta)}</a>
    <div class="trust">
      <span>⭐ 4.9/5 từ [N] khách</span>
      <span>[N]+ dự án hoàn thành</span>
      <span>Bảo hành rõ ràng</span>
    </div>
  </div>
</section>

<!-- 2. NỖI ĐAU -->
<section>
  <div class="wrap center">
    <h2>Bạn có đang gặp những điều này?</h2>
    <ul class="pain" style="list-style:none;max-width:620px;margin:0 auto">
      <li>• [Nỗi đau 1 của khách]</li>
      <li>• [Nỗi đau 2]</li>
      <li>• [Nỗi đau 3]</li>
    </ul>
  </div>
</section>

<!-- 3. DỊCH VỤ / OFFER -->
<section id="dich-vu" class="soft">
  <div class="wrap">
    <h2 class="center">Dịch vụ của chúng tôi</h2>
    <div class="grid" style="margin-top:30px">
${dichVuCards}
    </div>
  </div>
</section>

<!-- 4. VÌ SAO CHỌN -->
<section id="vi-sao">
  <div class="wrap">
    <h2 class="center">Vì sao khách chọn ${esc(ten)}</h2>
    <div class="grid" style="margin-top:30px">
      <div class="card"><h3>[Lý do 1]</h3><p>[Bằng chứng cho thấy bạn làm được.]</p></div>
      <div class="card"><h3>[Lý do 2]</h3><p>[Kinh nghiệm / quy trình / đội ngũ.]</p></div>
      <div class="card"><h3>[Lý do 3]</h3><p>[Công nghệ / cam kết.]</p></div>
    </div>
  </div>
</section>

<!-- 5. BẰNG CHỨNG -->
<section id="bang-chung" class="soft">
  <div class="wrap">
    <h2 class="center">Khách hàng nói gì</h2>
    <div class="grid" style="margin-top:30px">
      <div class="card"><p>"[Trích testimonial thật]"</p><p style="margin-top:12px;color:var(--ink);font-weight:700">— [Tên khách], [vai trò]</p></div>
      <div class="card"><p>"[Testimonial 2]"</p><p style="margin-top:12px;color:var(--ink);font-weight:700">— [Tên khách]</p></div>
      <div class="card"><p>"[Testimonial 3]"</p><p style="margin-top:12px;color:var(--ink);font-weight:700">— [Tên khách]</p></div>
    </div>
  </div>
</section>

<!-- 6. QUY TRÌNH -->
<section>
  <div class="wrap">
    <h2 class="center">Quy trình 4 bước</h2>
    <div class="grid steps" style="margin-top:34px">
      <div class="card"><h3>Liên hệ</h3><p>[Khách để lại thông tin / gọi.]</p></div>
      <div class="card"><h3>Tư vấn</h3><p>[Khảo sát nhu cầu, báo giá rõ.]</p></div>
      <div class="card"><h3>Thực hiện</h3><p>[Triển khai, cập nhật tiến độ.]</p></div>
      <div class="card"><h3>Bàn giao</h3><p>[Nghiệm thu + bảo hành.]</p></div>
    </div>
  </div>
</section>

<!-- 7. ĐẢO NGƯỢC RỦI RO -->
<section class="soft">
  <div class="wrap">
    <div class="guarantee">
      <h2 style="color:#fff">Cam kết của chúng tôi</h2>
      <p>[VD: Hoàn 100% nếu không hài lòng / Bảo hành X tháng / Đúng tiến độ hoặc giảm Y%.]</p>
    </div>
  </div>
</section>

<!-- 8. FAQ -->
<section>
  <div class="wrap" style="max-width:760px">
    <h2 class="center">Câu hỏi thường gặp</h2>
    <div style="margin-top:24px">
      <details><summary>[Chi phí khoảng bao nhiêu?]</summary><p>[Trả lời.]</p></details>
      <details><summary>[Mất bao lâu?]</summary><p>[Trả lời.]</p></details>
      <details><summary>[Có bảo hành không?]</summary><p>[Trả lời.]</p></details>
      <details><summary>[Thanh toán thế nào?]</summary><p>[Trả lời.]</p></details>
    </div>
  </div>
</section>

<!-- 9. CTA CUỐI -->
<section class="soft center">
  <div class="wrap">
    <h2>Sẵn sàng bắt đầu?</h2>
    <p style="max-width:560px;margin:10px auto 24px">[1 câu thúc giục hành động.]</p>
    <a class="btn" href="#lien-he">${esc(cta)}</a>
    &nbsp;
    <a class="btn btn-ghost" href="${telHref}">Gọi ${esc(sdt)}</a>
  </div>
</section>

<!-- 10. LIÊN HỆ -->
<section id="lien-he">
  <div class="wrap">
    <h2 class="center">Liên hệ ${esc(ten)}</h2>
    <div class="contact-grid" style="margin-top:30px">
      <div>
        <p style="color:var(--ink);font-weight:700;font-size:1.1rem">📞 <a class="link" href="${telHref}">${esc(sdt)}</a></p>
        <p style="margin-top:10px">📍 ${esc(diaChi)}</p>
        <p style="margin-top:10px">🕒 ${esc(gio)}</p>
        <p style="margin-top:10px">Thời gian phản hồi: trong [X giờ].</p>
      </div>
      <form onsubmit="alert('[Kết nối form tới nơi nhận lead]');return false">
        <input type="text" placeholder="Họ và tên" required>
        <input type="tel" placeholder="Số điện thoại" required>
        <textarea rows="3" placeholder="Nhu cầu của bạn"></textarea>
        <button class="btn" type="submit">${esc(cta)}</button>
      </form>
    </div>
  </div>
</section>

<footer>
  <div class="wrap">
    <p style="color:#fff;font-weight:800;font-size:1.1rem">${esc(ten)}</p>
    <p style="margin-top:8px">📞 <a href="${telHref}">${esc(sdt)}</a> · 📍 ${esc(diaChi)}</p>
    <p style="margin-top:14px;font-size:.85rem">© ${today.slice(0,4)} ${esc(ten)}. [Điều khoản] · [Bảo mật]</p>
  </div>
</footer>

<a class="call-fab" href="${telHref}">📞 Gọi ngay</a>

</body>
</html>`;

fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
// Lưu lại brief để tái lập
const briefOut = { ten, slug, nganh, mau, sdt, cta, dich_vu: dichVu,
  lien_he: { dia_chi: diaChi, gio }, _note: "Khung scaffold — đổ nội dung thật ở Bước 4 SKILL.md" };
fs.writeFileSync(path.join(outDir, "brief.json"), JSON.stringify(briefOut, null, 2), "utf8");

console.log(`✓ Đã sinh khung website: ${path.join(outDir, "index.html")}`);
console.log(`  brief: ${path.join(outDir, "brief.json")}`);
console.log(`  → Bước 4: đổ nội dung THẬT (headline Hormozi, copy, testimonial, ảnh) thay placeholder [ ].`);
