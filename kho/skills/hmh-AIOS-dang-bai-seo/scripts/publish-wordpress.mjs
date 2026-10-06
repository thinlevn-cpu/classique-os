#!/usr/bin/env node
/**
 * publish-wordpress.mjs — Đăng 1 bài blog chuẩn SEO lên website WordPress CỦA BẠN qua REST API,
 * rồi cập nhật record trong Lark Base. CHẠY ĐƯỢC HEADLESS (không cần connector claude.ai).
 *
 * Vì sao REST API: connector claude.ai thường VẮNG trong phiên cron/headless
 * → bài viết xong mà không đăng được. REST + Application Password chạy 24/7 ổn định.
 *
 * Tiền điều kiện:
 *   .secrets/wordpress.env  (KHÔNG commit) gồm:
 *     WP_URL=https://classique.vn
 *     WP_USER=<tên đăng nhập WP>
 *     WP_APP_PASSWORD=<Application Password 24 ký tự, có thể chứa khoảng trắng>
 *
 * Dùng:
 *   node publish-wordpress.mjs --manifest manifest.json --html bai-viet.html [--dry-run] [--no-lark]
 *
 * Hợp đồng ảnh trong HTML: dùng placeholder __IMG1__, __IMG2__... ở thuộc tính src của ảnh thân bài.
 * Publisher upload ảnh (theo thứ tự manifest.images) rồi thay __IMGk__ bằng source_url thật.
 * Ảnh #1 được đặt làm featured image.
 * Alt từng ảnh (chốt 16/09/2026: tả đúng ảnh, có từ khoá khi tự nhiên): manifest.images[i].alt
 *   -> alt viết trong HTML ở <img src="__IMGk__" alt="..."> -> manifest.alt_text / từ khoá (dự phòng).
 * Ảnh chia sẻ Facebook/Zalo 1200x630: manifest.og_image {path, filename}; không có thì tự cắt từ ảnh #1
 *   bằng anh-4x3.py --chi-chia-se, rồi gắn vào Yoast (_yoast_wpseo_opengraph-image / twitter-image).
 *
 * Marker stdout khi xong: "PUBLISH_OK <url>"   |  lỗi: "PUBLISH_FAIL <lý do>" + exit !=0.
 */

import fs from 'node:fs';
import { khoiLienKet, MOC_LIEN_KET } from './lib-lien-ket-noi-bo.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { uploadLocalImage, mcpCall } from './royal-mcp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..', '..', '..', '..'); // .claude/skills/<skill>/scripts -> gốc dự án

// CẤU HÌNH CỦA BẠN — điền vào .secrets/seo-web.env (SEO_BASE_TOKEN, SEO_TABLE_ID; xem HUONG-DAN-CAI-DAT.md)
// hoặc đặt biến môi trường cùng tên. KHÔNG hardcode token vào file này.
function loadSeoEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(PROJECT, '.secrets', 'seo-web.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const seoEnv = loadSeoEnv();
const LARK = process.env.LARK_CLI || seoEnv.LARK_CLI || 'lark-cli';
const BASE_TOKEN = process.env.SEO_BASE_TOKEN || seoEnv.SEO_BASE_TOKEN || '';
const TABLE_ID = process.env.SEO_TABLE_ID || seoEnv.SEO_TABLE_ID || '';
if (!BASE_TOKEN || !TABLE_ID) {
  console.log('PUBLISH_FAIL thiếu SEO_BASE_TOKEN / SEO_TABLE_ID — điền vào .secrets/seo-web.env (xem HUONG-DAN-CAI-DAT.md)');
  process.exit(1);
}

// ---- E-E-A-T: AUTHOR BOX (chèn deterministic vào CUỐI mọi bài) ----
// Tín hiệu "người thật đứng sau nội dung" — yếu tố Trust/Authority Google soi gắt với site YMYL.
// >>> ĐIỀN THÔNG TIN CỦA BẠN vào đây (hoặc qua .secrets/seo-web.env: AUTHOR_NAME, AUTHOR_BIO,
// >>> AUTHOR_ABOUT_URL, AUTHOR_YOUTUBE, AUTHOR_TIKTOK). Chỉ nêu sự thật kiểm chứng được, không phóng đại.
const AUTHOR = {
  name: seoEnv.AUTHOR_NAME || 'Tên tác giả của bạn',
  // Tiểu sử ngắn 2-3 câu — chỉ nêu sự thật kiểm chứng được (khớp trang giới thiệu trên web của bạn).
  bio: seoEnv.AUTHOR_BIO || 'Điền 2-3 câu giới thiệu trung thực về bạn: bạn là ai, kinh nghiệm gì, giúp ai đạt kết quả gì.',
  about: seoEnv.AUTHOR_ABOUT_URL || '',    // vd https://classique.vn/gioi-thieu/
  youtube: seoEnv.AUTHOR_YOUTUBE || '',    // để trống = không hiện link
  tiktok: seoEnv.AUTHOR_TIKTOK || '',      // để trống = không hiện link
  // Ảnh đại diện: để TRỐNG mặc định (tránh ảnh hỏng). Điền URL ảnh thật trên WP Media để hiện avatar.
  // Cấu hình qua .secrets/wordpress.env: WP_AUTHOR_AVATAR=https://classique.vn/wp-content/uploads/....jpg
  avatar: '',
};
function buildAuthorBox(a) {
  const img = a.avatar
    ? `<img src="${a.avatar}" alt="${a.name}" width="96" height="96" style="border-radius:50%;object-fit:cover;flex:0 0 96px" loading="lazy">`
    : '';
  const links = [];
  if (a.about) links.push(`<a href="${a.about}" rel="author">Tiểu sử đầy đủ</a>`);
  if (a.youtube) links.push(`<a href="${a.youtube}" target="_blank" rel="noopener">YouTube</a>`);
  if (a.tiktok) links.push(`<a href="${a.tiktok}" target="_blank" rel="noopener">TikTok</a>`);
  const linkRow = links.length ? `<p style="margin:0">${links.join(' · ')}</p>` : '';
  return `\n<hr>\n<div class="hmh-author-box" style="display:flex;gap:16px;align-items:flex-start;border:1px solid #eee;border-radius:12px;padding:16px;margin-top:32px;background:#fafafa">${img}<div>` +
    `<p style="margin:0 0 4px;font-weight:700;font-size:1.05em">Về tác giả: ${a.name}</p>` +
    `<p style="margin:0 0 8px;color:#444">${a.bio}</p>` +
    linkRow +
    `</div></div>\n`;
}

// ---- YMYL: cổng hai tầng (luật 18/09/2026) ----
// TẦNG CHẶN: hứa hẹn phóng đại, phán thật/giả qua ảnh, và MỌI số liệu kinh doanh của Classique.
// TẦNG CẢNH BÁO: giá tham khảo từ nguồn công khai — ĐƯỢC PHÉP (luật 18/09), chỉ nhắc phải ghi nguồn.
// Luật gốc: CLAUDE.md mục 11.4 + wiki/concepts/Ranh giới nội dung hàng hiệu.md mục A.
const MONEY = String.raw`(?:\d+(?:[.,]\d+)?\s*(?:triệu|tỷ|tr\b)|\d{1,3}(?:[.,]\d{3}){1,}\s*(?:đ|₫|vnđ|vnd)(?![a-zà-ỹ])|(?:usd|\$)\s*\d|\d+(?:[.,]\d+)?\s*(?:usd|đô))`;

// (1) CHẶN CỨNG — không liên quan tới nguồn nào cả
const YMYL_BLOCK = [
  /giàu nhanh/i, /làm giàu không khó/i, /chắc chắn (?:x\s?\d|giàu|thắng|thành công)/i,
  /cam kết (?:lợi nhuận|x\s?\d|giàu)/i, /đảm bảo (?:giàu|lợi nhuận|x\s?\d|thành công)/i,
  /chắc chắn (?:lên giá|tăng giá|sinh lời|có lời)/i, /đầu tư (?:chắc thắng|an toàn tuyệt đối|không lỗ)/i,
  /giữ giá tuyệt đối/i, /không bao giờ mất giá/i, /(?:đảm bảo|cam kết) (?:lên giá|tăng giá|sinh lời)/i,
  /nhìn ảnh (?:là )?biết (?:thật|giả)/i, /tự do tài chính/i,
  /không bao giờ (?:thất bại|lỗ)/i, /tiền\s+(?:sẽ\s+|tự\s+)*(?:tìm đến|tụ về|chảy về|hút về)/i,
  /(?:tài sản|tiền)\s+tự\s+(?:tụ|tìm|chảy|hút)/i, /x\s?\d+\s*(?:doanh thu|lợi nhuận|tài sản)/i,
];

// (2) CHẶN CỨNG — SỐ LIỆU TỔNG HỢP kinh doanh của Classique (luật 18/09 bản 2).
//     Ranh giới: giá của MỘT MÓN CỤ THỂ thì được viết dạng tham khảo, kể cả giá thu của bên em.
//     Cấm là con số nói về TOÀN BỘ hoạt động: doanh thu, tỷ trọng, biên, tồn kho, giá trung vị theo dòng.
const BIZ_METRIC = /(doanh thu|giá vốn|biên (?:lợi nhuận|lãi)|tồn kho|vòng quay vốn|giá trung vị|giá bán trung bình|tỷ trọng nguồn hàng|lãi từng món|cơ cấu chi phí|biên theo kênh|tổng số món|số món (?:bán|trong kho))/i;

// dấu hiệu con số là GIÁ THAM KHẢO CÔNG KHAI có dẫn nguồn => cho qua, chỉ log
const PUBLIC_SRC = /(niêm yết|chính hãng|hãng công bố|theo (?:trang|báo|nguồn|sàn|nhà đấu giá)|nguồn:|công bố|đấu giá|sotheby|christie|phillips|fashionphile|therealreal|rebag|chrono24|tham khảo)/i;

function splitSentences(t) {
  return t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').split(/(?<=[.!?;])\s+/);
}

function warnYmyl(html) {
  const blocks = [];   // chặn
  const warns  = [];   // cảnh báo, vẫn đăng
  const plain = html.replace(/<[^>]+>/g, ' ');

  for (const re of YMYL_BLOCK) { const m = plain.match(re); if (m) blocks.push(m[0]); }

  const moneyRe = new RegExp(MONEY, 'i');
  for (const sent of splitSentences(html)) {
    const hasMoney = moneyRe.test(sent);
    if (BIZ_METRIC.test(sent) && (hasMoney || /\d/.test(sent))) {
      blocks.push('[số liệu kinh doanh] ' + sent.trim().slice(0, 120));
      continue;
    }
    if (!hasMoney) continue;
    if (!PUBLIC_SRC.test(sent)) {
      warns.push('[giá chưa ghi nguồn] ' + sent.trim().slice(0, 120));
    }
  }

  // Cảnh báo phái sinh: cùng một bài vừa nêu giá THU của bên em vừa nêu giá bán lại công khai
  // thì người đọc trừ ra được biên lãi — thứ vẫn thuộc nhóm cấm.
  // phải có CON SỐ tiền trong cùng câu mới tính, tránh bắt nhầm câu "bên em nhận thu mua" không kèm giá
  const hasOurBuy = splitSentences(html).some(x =>
    /(bên em|the classique|chúng tôi)/i.test(x) && /(thu vào|thu mua|giá thu)/i.test(x) && new RegExp(MONEY, 'i').test(x));
  const hasResale = /(bán lại|rao|niêm yết|sàn|đấu giá)[^.]{0,60}\d/i.test(plain);
  if (hasOurBuy && hasResale) warns.push('[suy ra biên lãi] bài có cả giá THU của bên em và giá bán lại công khai — người đọc trừ ra được biên. Cân nhắc bỏ một trong hai.');

  const uniq = a => [...new Set(a)];
  const B = uniq(blocks), W = uniq(warns);
  if (W.length) console.error('[YMYL] Cảnh báo (vẫn đăng) — giá tham khảo nên ghi rõ nguồn và ngày:\n  - ' + W.join('\n  - '));
  if (B.length) console.error('[YMYL] CHẶN: ' + B.join(' | '));
  return B;
}

function arg(name, def = null) { const i = process.argv.indexOf('--' + name); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : (i >= 0 ? true : def); }
const MANIFEST = arg('manifest');
const HTMLF = arg('html');
const DRY = !!arg('dry-run', false);
const NO_LARK = !!arg('no-lark', false);
const ALLOW_DUP = !!arg('allow-duplicate', false);
const ALLOW_YMYL = !!arg('allow-ymyl', false);
const ALLOW_ALT = !!arg('allow-alt', false);
const THAY_ANH = !!arg('thay-anh', false);   // 18/09: buộc THAY ảnh cũ trên WP (xoá media trùng tên rồi upload bản mới)   // bỏ cổng alt-khớp-ảnh (chỉ khi bắt nhầm)
const BO_QUA_CONG_ANH = !!arg('bo-qua-cong-anh', false); // chỉ dùng khi người thật đã xem và khẳng định cổng ảnh báo nhầm
const NHAP = !!arg('nhap', false);             // 17/09/2026 VPS: đăng NHÁP chờ chủ nhân duyệt; Base -> "Chờ duyệt" + Link web sau đăng = link ?p=<id> (duyet-bai.mjs đăng thật sau)
const CAP_NHAT = !!arg('cap-nhat', false);     // bài cùng slug đã publish: GHI ĐÈ nội dung/tiêu đề/ảnh vào bài đó (giữ post id, slug, ngày đăng) thay vì bỏ qua   // bỏ CỔNG CHẶN YMYL (đăng dù có cụm phóng đại) — chỉ dùng khi false-positive

function fail(msg) { console.log('PUBLISH_FAIL ' + msg); process.exit(1); }
if (!MANIFEST || !HTMLF) fail('thiếu --manifest hoặc --html');

// ---- env ----
function loadEnv() {
  const p = path.join(PROJECT, '.secrets', 'wordpress.env');
  if (!fs.existsSync(p)) fail('CHƯA có .secrets/wordpress.env (cần WP_URL, WP_USER, WP_APP_PASSWORD). Xem wordpress.env.example.');
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  for (const k of ['WP_URL', 'WP_USER', 'WP_APP_PASSWORD']) if (!env[k]) fail('thiếu ' + k + ' trong wordpress.env');
  return env;
}
const env = loadEnv();
const WP = env.WP_URL.replace(/\/+$/, '');
const AUTH = 'Basic ' + Buffer.from(`${env.WP_USER}:${env.WP_APP_PASSWORD.replace(/\s+/g, '')}`).toString('base64');
if (env.WP_AUTHOR_AVATAR) AUTHOR.avatar = env.WP_AUTHOR_AVATAR; // ảnh tác giả tùy chọn (xem AUTHOR ở đầu file)

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
// Đường dẫn ảnh trong manifest có thể tương đối theo THƯ MỤC BÀI (trợ lý VPS ghi "img/...") hoặc theo gốc dự án.
// Không thấy file từ thư mục đang chạy thì thử theo thư mục chứa manifest (vá 17/09/2026 sau lượt thử VPS mất 6 ảnh).
{
  const goc = path.dirname(path.resolve(MANIFEST));
  const sua = o => { if (o && o.path && !fs.existsSync(o.path) && fs.existsSync(path.join(goc, o.path))) o.path = path.relative(process.cwd(), path.join(goc, o.path)); };
  (manifest.images || []).forEach(sua); sua(manifest.og_image);
}
let html = fs.readFileSync(HTMLF, 'utf8');
const KW = manifest.focus_keyword || '';

async function wp(pathname, opts = {}) {
  const url = WP + '/wp-json' + pathname;
  const headers = Object.assign({ Authorization: AUTH }, opts.headers || {});
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${pathname} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

// Danh mục BẮT BUỘC có ở MỌI bài (quy tắc chung): luôn gắn thêm "BLOG".
const FORCED_CATEGORY = (seoEnv.FORCED_CATEGORY !== undefined ? seoEnv.FORCED_CATEGORY : 'BLOG').trim(); // đặt FORCED_CATEGORY= (rỗng) trong .secrets/seo-web.env để không ép danh mục

// ---- resolve 1 tên danh mục -> id (tìm, tạo nếu chưa có) ----
async function resolveCategoryName(name) {
  try {
    const found = await wp('/wp/v2/categories?per_page=100&search=' + encodeURIComponent(name));
    let cat = Array.isArray(found) ? found.find(c => c.name.toLowerCase() === name.toLowerCase()) || found[0] : null;
    if (!cat && !DRY) cat = await wp('/wp/v2/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    return cat && cat.id ? cat.id : null;
  } catch (e) { console.error('[cat] ' + name + ': ' + e.message); return null; }
}

// ---- resolve categories (text "A > B" hoặc "[26,28]" hoặc "26,28") ----
// LUÔN bổ sung danh mục FORCED_CATEGORY ("BLOG") vào mọi bài.
async function resolveCategories(raw) {
  const ids = [];
  const s = String(raw || '').trim();
  const nums = s.match(/\d+/g);
  if (s && /^[\[\s\d,\]]+$/.test(s) && nums) {
    ids.push(...nums.map(Number));
  } else if (s) {
    const names = s.split('>').map(x => x.trim()).filter(Boolean);
    for (const name of names) {
      const id = await resolveCategoryName(name);
      if (id) ids.push(id);
    }
  }
  // Bắt buộc: mọi bài đều thuộc danh mục "BLOG".
  if (FORCED_CATEGORY) {
    const blogId = await resolveCategoryName(FORCED_CATEGORY);
    if (blogId) ids.push(blogId);
    else console.error('[cat] CẢNH BÁO: không gắn được danh mục bắt buộc "' + FORCED_CATEGORY + '"');
  }
  return [...new Set(ids)];
}

// ---- upload 1 ảnh qua Royal MCP (base64 JSON) — vì site CHẶN upload file/binary qua /wp/v2/media (403 WAF).
// Royal MCP wp_upload_media nhận base64 trong JSON nên qua được mà KHÔNG lách bảo mật (đường chính thống có API key).
function altTrongHtml(index) {
  const m = html.match(new RegExp('<img[^>]*src="__IMG' + index + '__"[^>]*>', 'i'));
  const a = m && m[0].match(/alt="([^"]*)"/i);
  return a && a[1].trim() ? a[1].trim() : '';
}
async function uploadImage(img, index) {
  const altBase = manifest.alt_text && String(manifest.alt_text).trim() ? String(manifest.alt_text).trim() : KW;
  // Alt tả ĐÚNG ảnh (Google khuyên tả thật hơn nhồi từ khoá). Chỉ khi không có alt riêng mới dùng alt chung.
  const altRieng = (img.alt && String(img.alt).trim()) || altTrongHtml(index);
  const alt = altRieng || (index === 1 ? altBase : `${altBase} (${index})`);
  // Idempotent: media cùng tên file đã có trên WP thì tái dùng, không upload trùng.
  // --thay-anh: XOÁ media cũ trùng tên rồi upload bản mới. Cần khi ảnh local đã sửa
  // (vá 18/09/2026: đăng đè bản nháp mà ảnh không đổi vì nhánh tái dùng này giữ file cũ).
  try {
    const stem = img.filename.replace(/\.[a-z0-9]+$/i, '');
    const found = await wp('/wp/v2/media?per_page=10&search=' + encodeURIComponent(stem));
    const hit = Array.isArray(found) ? found.find(m => m.source_url && m.source_url.split('/').pop().replace(/\.[a-z0-9]+$/i, '') === stem) : null;
    if (hit && hit.id && THAY_ANH) {
      try { await wp('/wp/v2/media/' + hit.id + '?force=true', { method: 'DELETE' }); console.error('[thay-anh] đã xoá media cũ #' + hit.id + ' (' + img.filename + ')'); }
      catch (e) { console.error('[thay-anh] không xoá được media #' + hit.id + ': ' + e.message); }
    } else if (hit && hit.id) {
      console.error('[upload] tái dùng media #' + hit.id + ' cho ' + img.filename + '  (ảnh local đã sửa thì chạy --thay-anh)');
      return { id: hit.id, url: hit.source_url, alt };
    }
  } catch (e) { /* không tìm được thì upload bình thường */ }
  const { id, url } = await uploadLocalImage(img.path, { filename: img.filename, alt, caption: altRieng ? '' : altBase, title: img.filename.replace(/\.[a-z0-9]+$/i, '') });
  return { id, url, alt };
}

// ---- Ảnh chia sẻ Open Graph 1200x630 (Facebook/Zalo cắt ảnh 4:3 mất trên/dưới) ----
function chuanBiOgImage() {
  if (manifest.og_image && manifest.og_image.path) return manifest.og_image;
  const dau = (manifest.images || [])[0];
  if (!dau || !dau.path) return null;
  const src = path.isAbsolute(dau.path) ? dau.path : path.join(PROJECT, dau.path);
  if (!fs.existsSync(src)) return null;
  const outDir = path.join(path.dirname(src), 'chia-se');
  const stem = (manifest.slug || dau.filename.replace(/\.[a-z0-9]+$/i, '')) + '-chia-se';
  const specPath = path.join(outDir, 'spec-chia-se.json');
  fs.mkdirSync(outDir, { recursive: true });
  // Ảnh #1 đã cắt 4:3 + đóng mộc ở bước trước, nên chỉ cắt lại khung 1200x630, KHÔNG đóng mộc lần 2.
  fs.writeFileSync(specPath, JSON.stringify([{ src, out: stem, og: true, og_out: stem, cx: 0.5, cy: 0.5 }]));
  const r = spawnSync('python3', [path.join(__dirname, 'anh-4x3.py'), specPath, outDir, '--chi-chia-se', '--khong-moc'], { encoding: 'utf8' });
  const file = path.join(outDir, stem + '.jpg');
  if (r.status !== 0 || !fs.existsSync(file)) { console.error('[og] không tự làm được ảnh chia sẻ: ' + (r.stderr || '').slice(0, 200)); return null; }
  return { path: file, filename: stem + '.jpg' };
}


// ---- Checklist: đoạn 3-5 dòng. Tự tách <p> dài hơn 90 âm tiết tại ranh giới câu (không đổi chữ). ----
function splitLongParagraphs(html, max = 90, target = 75) {
  return html.replace(/<p>(?!<a |<strong>)([\s\S]*?)<\/p>/g, (m, inner) => {
    const words = t => t.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
    if (words(inner) <= max) return m;
    const sents = inner.split(/(?<=[.!?])\s+(?=[A-ZĐÀ-Ỹ<])/);
    if (sents.length < 3) return m;
    const chunks = []; let cur = [], n = 0;
    for (const se of sents) { const w = words(se); if (n + w > target && cur.length) { chunks.push(cur.join(' ')); cur = []; n = 0; } cur.push(se); n += w; }
    if (cur.length) chunks.push(cur.join(' '));
    return chunks.map(c => '<p>' + c + '</p>').join('\n');
  });
}

// ---- Lark update (qua lark-cli, shell:true) ----
function q(a) { const s = String(a); return /[\s"&|<>^]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s; }
function updateLark(patch) {
  const body = JSON.stringify({ update_records: { [manifest.record_id]: patch } });
  const cmd = [LARK, 'base', '+record-batch-update', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID, '--json', body, '--as', 'user'].map(q).join(' ');
  const r = spawnSync(cmd, { encoding: 'utf8', shell: true, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0 || /"ok"\s*:\s*false/.test(out)) throw new Error('lark update lỗi: ' + out.slice(0, 300));
  return out;
}

function uploadAnhLenBase(paths) {
  // lark-cli chỉ nhận đường dẫn TƯƠNG ĐỐI nằm trong cwd
  const rel = paths.map(p => path.relative(process.cwd(), path.isAbsolute(p) ? p : path.join(PROJECT, p)));
  if (rel.some(p => p.startsWith('..'))) throw new Error('ảnh nằm ngoài thư mục đang chạy, hãy chạy từ gốc New Brain');
  const cmd = [LARK, 'base', '+record-upload-attachment', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID,
    '--record-id', manifest.record_id, '--field-id', 'File ảnh', '--as', 'user', ...rel.flatMap(p => ['--file', p])].map(q).join(' ');
  const r = spawnSync(cmd, { encoding: 'utf8', shell: true, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0 || /"ok"\s*:\s*false/.test(out)) throw new Error(out.slice(0, 300));
  return `đã đưa ${rel.length} ảnh lên File ảnh`;
}

(async () => {
  try {
    let capNhatId = null;
    // 0) CHỐNG TRÙNG: nếu đã có bài publish cùng slug → KHÔNG tạo trùng (hại SEO). Tự đồng bộ Lark "Đã đăng".
    if (!ALLOW_DUP && manifest.slug) {
      try {
        const dup = await wp('/wp/v2/posts?slug=' + encodeURIComponent(manifest.slug) + '&_fields=id,link,status');
        const existed = Array.isArray(dup) ? dup.find(p => p.status === 'publish') : null;
        // Chạy lại --nhap cho bài đã có bản nháp (WP trả nháp khi có quyền): ghi đè bản nháp đó, không tạo nháp thứ hai.
        const nhapCu = NHAP && !existed ? (await wp('/wp/v2/posts?status=draft,pending&search=' + encodeURIComponent(manifest.slug) + '&context=edit&_fields=id,slug,generated_slug,status')).find(p => [p.slug, p.generated_slug].includes(manifest.slug)) : null;
        if (nhapCu) { capNhatId = nhapCu.id; console.error('[nhap] ghi đè bản nháp #' + nhapCu.id); }
        if (existed && CAP_NHAT) { capNhatId = existed.id; console.error('[cap-nhat] sẽ ghi đè bài #' + existed.id + ' ' + existed.link); }
        else if (existed) {
          let larkMsg = 'bỏ qua (--no-lark)';
          if (!NO_LARK) { try { updateLark({ 'Trạng thái': 'Đã đăng', 'Link web sau đăng': existed.link }); larkMsg = 'OK -> Đã đăng (đồng bộ về bài cũ)'; } catch (e) { larkMsg = 'LỖI: ' + e.message; } }
          console.log(JSON.stringify({ already_published: true, post_id: existed.id, link: existed.link, lark: larkMsg }, null, 2));
          console.log('ALREADY_PUBLISHED ' + existed.link);
          console.log('PUBLISH_OK ' + existed.link); // coi như xong: bài đã ở trên web, hàng đợi tiến tiếp
          return;
        }
      } catch (e) { console.error('[dup-check] bỏ qua (' + e.message + ')'); }
    }

    // 0b) CỔNG CHẶN YMYL — CHẶN TRƯỚC khi upload ảnh/tạo bài (không tạo rác media/post).
    //     Bài tiền bạc/kinh doanh (YMYL) có cụm hứa hẹn phóng đại thì KHÔNG đăng live: Google hạ hạng +
    //     rủi ro uy tín/pháp lý dưới tên tác giả thật. Sửa lời hứa hoặc chạy lại --allow-ymyl để bỏ qua.
    const ymylHits = warnYmyl(html);
    if (ymylHits.length && !ALLOW_YMYL) {
      fail('YMYL chặn: ' + ymylHits.join(' | ') + '\n  Gỡ cụm hứa hẹn / số liệu kinh doanh Classique / giá bán của mình. Giá tham khảo từ nguồn công khai thì ĐƯỢC, chỉ cần ghi rõ nguồn. Bắt nhầm thì chạy lại với --allow-ymyl.');
    }

    // 0c) CỔNG ẢNH (20/09/2026) — chặn TRƯỚC khi upload: ảnh còn lộ serial/ngày mua/mã hộp/dấu cửa hàng/
    //     tên khách/hoá đơn/chữ Trung là KHÔNG đăng. Quy chuẩn: van-hanh/cong-anh/QUY-CHUAN-ANH.md.
    //     Sự cố gốc: bộ hộp Cartier lên web còn nguyên serial HUR 094 + ngày mua + dấu Lotte Duty Free.
    if (!DRY && !BO_QUA_CONG_ANH && (manifest.images || []).length) {
      const anh = manifest.images.filter(i => i.path && fs.existsSync(i.path));
      const r = spawnSync('python3', [path.join(PROJECT, 'van-hanh', 'cong-anh', 'soi-anh.py'), '--json', ...anh.map(i => i.path)],
        { encoding: 'utf8', cwd: PROJECT, maxBuffer: 32 * 1024 * 1024 });
      let kq = null;
      try { kq = JSON.parse((r.stdout || '').slice((r.stdout || '').indexOf('['))); } catch {}
      if (!kq) console.error('[cong-anh] không soi được (' + ((r.stderr || r.stdout || '').slice(0, 200)) + ') — kiểm tra tesseract/pytesseract trên máy này');
      else {
        const nang = [];
        kq.forEach((k, i) => {
          const daChe = anh[i] && anh[i].da_che === true;   // tác tử khai đã che vùng chữ trên giấy tờ
          for (const l of k.loi || []) {
            // "co-giay-to" = có giấy tờ trong ảnh. Đã khai che thì cho qua (tầng 2 nhìn mắt vẫn soát lại);
            // chưa khai là chặn. Các lỗi khác (đọc ra serial, ngày, dấu cửa hàng, mã vạch...) luôn chặn.
            if (l.luat === 'co-giay-to' && daChe) continue;
            nang.push(`${path.basename(k.file)}: ${l.vi_sao}${l.chuoi ? ' [' + l.chuoi.slice(0, 40) + ']' : ''}${l.vung ? ' vùng ' + l.vung.map(v => v.toFixed(3)).join(',') : ''}`);
          }
        });
        if (nang.length) fail('CỔNG ẢNH chặn (ảnh còn lộ thông tin khách):\n' + nang.join('\n').slice(0, 1500) +
          '\nChe bằng van-hanh/tool-dong-moc/che-vung.py, khai "da_che": true cho ảnh có giấy tờ trong manifest, rồi chạy lại. ' +
          'Chỉ dùng --bo-qua-cong-anh khi người thật đã xem tận mắt và khẳng định báo nhầm.');
        console.error('[cong-anh] ' + kq.length + ' ảnh đạt tầng 1');
      }
    }

    // 1) categories
    const categories = await resolveCategories(manifest.category);

    // 2) upload ảnh + thay placeholder __IMGk__
    const uploaded = [];
    for (let i = 0; i < (manifest.images || []).length; i++) {
      if (DRY) { uploaded.push({ id: 0, url: `__DRYRUN_IMG${i + 1}__`, alt: KW }); continue; }
      try { uploaded.push(await uploadImage(manifest.images[i], i + 1)); }
      catch (e) { console.error('[upload] ảnh ' + (i + 1) + ' lỗi: ' + e.message); uploaded.push({ id: 0, url: null, alt: KW }); } // giữ index để map __IMGk__ đúng
    }
    uploaded.forEach((u, i) => { if (u.url) html = html.split(`__IMG${i + 1}__`).join(u.url); });
    // 2a) CỔNG ALT-KHỚP-ẢNH (dựng 18/09/2026 sau lỗi alt sai ảnh trên nháp #1584)
    //     Tên file ảnh do người chọn đặt SAU KHI mở ảnh ra nhìn (vd ...-3-khoa-moc-va-vien-hat-vang.webp)
    //     nên phần đuôi tên file là mô tả độc lập với alt. Alt không chia một chữ nội dung nào
    //     với phần đuôi đó gần như luôn nghĩa là alt viết cho tấm ảnh KHÁC.
    //     HAI CHỖ PHẢI XỬ ĐÚNG, đã trượt ở bản đầu:
    //       - bỏ phần SLUG bài khỏi tên file, vì slug luôn trùng chữ với alt (luật SEO bắt tên file chứa từ khoá)
    //       - bỏ dấu tiếng Việt cả hai phía, vì tên file không dấu còn alt có dấu
    if (!ALLOW_ALT) {
      const boDau = t => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
      const BO = new Set(('va,cua,cho,trong,tren,duoi,voi,mot,nhung,cac,la,co,tai,anh,chi,ben,em,the,classique,'
        + 'that,webp,jpg,jpeg,png,chia,se,img,hinh,nen,soi,can,thay,ro,nay,khi,thi').split(','));
      const toks = t => boDau(t).replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/)
        .filter(x => x.length > 2 && !BO.has(x) && !/^\d+$/.test(x));
      const slugTok = new Set(toks(manifest.slug || ''));
      const lech = [];
      for (let i = 0; i < uploaded.length; i++) {
        const u = uploaded[i]; const mf = (manifest.images || [])[i];
        if (!u || !u.url || !mf) continue;
        const tag = html.match(new RegExp('<img[^>]*src="' + u.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>', 'i'));
        if (!tag) continue;
        const alt = (tag[0].match(/alt="([^"]*)"/i) || [, ''])[1];
        const rieng = toks((mf.filename || '').replace(/\.(webp|jpg|jpeg|png)$/i, '')).filter(x => !slugTok.has(x));
        const at = new Set(toks(alt));
        const chung = rieng.filter(x => at.has(x));
        if (rieng.length >= 2 && chung.length === 0)
          lech.push(`ảnh ${i + 1}: phần mô tả trong tên file [${rieng.join(', ')}] không khớp chữ nào với alt "${alt.slice(0, 90)}"`);
      }
      if (lech.length) fail('ALT KHÔNG KHỚP ẢNH:\n  - ' + lech.join('\n  - ')
        + '\n  Nhiều khả năng alt viết cho tấm ảnh khác (đúng lỗi 18/09 trên nháp #1584).'
        + '\n  Mở đúng tấm ảnh ra nhìn rồi viết lại alt VÀ caption. Bắt nhầm thì chạy lại với --allow-alt.');
    }

    // 2b) ÉP THUỘC TÍNH ẢNH THÂN BÀI (vá 18/09/2026 — ảnh tràn khung trên bài nháp #1584)
    //     Ảnh trần <img src alt> không có width/height/style và không có class wp-image-<id> thì
    //     theme không ép được max-width, ảnh 1600px tràn ra ngoài cột nội dung trên điện thoại.
    //     Làm ở đây thay vì trông chờ người viết nhớ: cổng máy, không dựa trí nhớ.
    for (let i = 0; i < uploaded.length; i++) {
      const u = uploaded[i];
      if (!u || !u.url) continue;
      let w = 1600, h = 1200;
      try {
        const mf = (manifest.images || [])[i];
        if (mf && mf.path && fs.existsSync(mf.path)) {
          const buf = fs.readFileSync(mf.path);
          // WebP VP8L/VP8X/VP8: đọc kích thước từ header; JPG: quét SOF0..SOF2
          if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') {
            const tag = buf.slice(12, 16).toString('latin1');
            if (tag === 'VP8X') { w = 1 + buf.readUIntLE(24, 3); h = 1 + buf.readUIntLE(27, 3); }
            else if (tag === 'VP8 ') { w = buf.readUInt16LE(26) & 0x3fff; h = buf.readUInt16LE(28) & 0x3fff; }
          } else if (buf[0] === 0xff && buf[1] === 0xd8) {
            for (let k = 2; k < buf.length - 9;) {
              if (buf[k] !== 0xff) { k++; continue; }
              const mk = buf[k + 1];
              if (mk >= 0xc0 && mk <= 0xc2) { h = buf.readUInt16BE(k + 5); w = buf.readUInt16BE(k + 7); break; }
              k += 2 + buf.readUInt16BE(k + 2);
            }
          }
        }
      } catch (e) { /* giữ mặc định 1600x1200 */ }
      const esc = u.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp('<img([^>]*?)src="' + esc + '"([^>]*?)>', 'g'), (tag, a, b) => {
        let attrs = (a + ' ' + b).trim();
        if (!/\swidth=/.test(attrs)) attrs += ` width="${w}"`;
        if (!/\sheight=/.test(attrs)) attrs += ` height="${h}"`;
        if (!/\sloading=/.test(attrs)) attrs += ' loading="lazy"';
        if (!/\sdecoding=/.test(attrs)) attrs += ' decoding="async"';
        if (u.id && !/\sclass=/.test(attrs)) attrs += ` class="wp-image-${u.id}"`;
        if (!/max-width:\s*100%/.test(attrs)) attrs += ' style="max-width:100%;height:auto;display:block"';
        return `<img src="${u.url}" ${attrs.replace(/\s+/g, ' ').trim()}>`;
      });
    }
    // ảnh upload LỖI (còn placeholder): bỏ trọn khối <figure> chứa nó để không lòi <img src=""> hỏng
    html = html.replace(/<figure[\s\S]*?__IMG\d+__[\s\S]*?<\/figure>\s*/g, '');
    // dọn nốt placeholder lẻ (nếu nằm ngoài figure)
    html = html.replace(/__IMG\d+__/g, '');
    const imgFails = (manifest.images || []).length - uploaded.filter(u => u.url).length;
    if (imgFails > 0) console.error(`[warn] ${imgFails} ảnh KHÔNG upload được (đăng bài không ảnh). Xem README/skill về upload ảnh qua royal-mcp hoặc thêm tay.`);

    const firstOk = uploaded.find(u => u.id && u.url);
    const featured = firstOk ? firstOk.id : 0;

    // 2a) ảnh chia sẻ 1200x630 (không chặn đăng bài nếu lỗi)
    let og = null;
    if (!DRY) {
      try {
        const ogSrc = chuanBiOgImage();
        if (ogSrc) og = await uploadImage({ ...ogSrc, alt: ogSrc.alt || (firstOk && firstOk.alt) || KW }, 0);
      } catch (e) { console.error('[og] upload ảnh chia sẻ lỗi: ' + e.message); }
    }

    // 2b) E-E-A-T: chèn author box vào cuối bài (1 lần). (YMYL đã kiểm ở cổng 0b phía trên.)
    { const before = html; html = splitLongParagraphs(html); if (html !== before) console.error('[checklist] đã tách đoạn dài >90 âm tiết'); }
    // 2b-bis) Liên kết nội bộ: chèn khối "Hàng đang có" TRƯỚC author box (23/09/2026 — gỡ kẹt chỉ mục,
    // xem lib-lien-ket-noi-bo.mjs). Lỗi ở đây không được chặn việc đăng bài.
    if (!new RegExp('class="' + MOC_LIEN_KET + '"').test(html)) {
      try {
        const kLK = await khoiLienKet(wp, (manifest.title || '') + ' ' + html, WP);
        if (kLK) { html += kLK; console.error('[lien-ket] đã chèn khối Hàng đang có'); }
        else console.error('[lien-ket] bỏ qua: không dựng được khối');
      } catch (e) { console.error('[lien-ket] lỗi: ' + e.message.slice(0, 160)); }
    }

    if (!/class="hmh-author-box"/.test(html)) html += buildAuthorBox(AUTHOR);

    // 3) tạo bài publish
    const postBody = {
      // Luật 17/09/2026: TIÊU ĐỀ BÀI (H1) VIẾT HOA TOÀN BỘ, tự ép ở đây để không bài nào lọt. Meta title Yoast giữ chữ thường (SERP viết hoa trông như spam).
      title: String(manifest.title || manifest.meta_title).toLocaleUpperCase('vi-VN'), // H1 = tiêu đề bài; meta_title chỉ dành cho SEO plugin (nếu không có plugin, WP sẽ dùng title này + ' – Site name')
      slug: manifest.slug,
      status: NHAP ? 'draft' : 'publish',
      content: html,
      excerpt: manifest.meta_description || '',
      categories,
      // Yoast (best-effort — chỉ ăn nếu site đăng ký show_in_rest cho các meta này):
      meta: {
        _yoast_wpseo_focuskw: KW,
        _yoast_wpseo_title: manifest.meta_title || manifest.title,
        _yoast_wpseo_metadesc: manifest.meta_description || '',
      },
    };
    // KHÔNG gán featured_media lúc tạo: theme hostinger-ai-theme (Hooks.php:336) văng TypeError post_id null -> 500. Gán sau bằng PATCH.

    if (DRY) {
      console.log('[dry-run] categories=' + JSON.stringify(categories) + ' featured=' + featured + ' ảnh=' + uploaded.length + ' content_len=' + html.length);
      console.log('PUBLISH_OK __DRYRUN__');
      return;
    }

    if (capNhatId && !NHAP) { delete postBody.slug; delete postBody.status; }
    const post = await wp(capNhatId ? '/wp/v2/posts/' + capNhatId : '/wp/v2/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postBody) });
    // Gắn ảnh chia sẻ vào Yoast TRƯỚC bước PATCH featured: lần lưu bài đó làm Yoast dựng lại dữ liệu OG.
    let ogOk = false;
    if (og && og.id && env.ROYAL_MCP_API_KEY) {
      try {
        for (const [key, value] of [
          ['_yoast_wpseo_opengraph-image', og.url], ['_yoast_wpseo_opengraph-image-id', String(og.id)],
          ['_yoast_wpseo_twitter-image', og.url], ['_yoast_wpseo_twitter-image-id', String(og.id)],
        ]) await mcpCall('wp_update_post_meta', { post_id: post.id, key, value });
        ogOk = true; console.error('[og] ảnh chia sẻ 1200x630 OK: ' + og.url);
      } catch (e) { console.error('[og] gắn ảnh chia sẻ lỗi: ' + e.message); }
    }
    if (featured) {
      try { await wp('/wp/v2/posts/' + post.id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ featured_media: featured }) }); }
      catch (e) { console.error('[warn] không gán được featured image: ' + e.message); }
    }

    // 4) verify
    const check = await wp('/wp/v2/posts/' + post.id + '?context=edit&_fields=id,status,link');
    const link = check.link || post.link;
    // SEO plugin (classique.vn dùng Yoast, 15/09/2026): đặt title/description/focus keyword qua Royal MCP wp_update_seo_meta (tự nhận Yoast/Rank Math).
    let rankMathOk = false;
    if (env.ROYAL_MCP_API_KEY) {
      try { await mcpCall('wp_update_seo_meta', { post_id: post.id, title: manifest.meta_title || manifest.title, description: manifest.meta_description || '', focus_keyword: KW }); rankMathOk = true; console.error('[seo] meta title/description/focus keyword OK (Yoast qua Royal MCP)'); }
      catch (e) { console.error('[seo] meta lỗi: ' + e.message); }
    }
    const yoastOk = post.meta && post.meta._yoast_wpseo_focuskw === KW;
    if (check.status !== (NHAP ? 'draft' : 'publish')) console.error('[warn] status=' + check.status + ' (không phải publish)');
    if (!yoastOk && !rankMathOk) console.error('[warn] Yoast focus keyword có thể chưa set qua REST (cần mu-plugin show_in_rest — xem references). On-page SEO trong nội dung vẫn đầy đủ.');

    // 5) cập nhật Lark
    let larkMsg = 'bỏ qua (--no-lark)';
    if (!NO_LARK) {
      const patch = NHAP
        ? { 'Trạng thái': 'Chờ duyệt', 'Link web sau đăng': WP + '/?p=' + post.id }
        : { 'Trạng thái': 'Đã đăng', 'Link web sau đăng': link };
      if (featured) patch['WordPress Media ID'] = featured;
      try { updateLark(patch); larkMsg = 'OK -> ' + patch['Trạng thái']; }
      catch (e) { larkMsg = 'LỖI: ' + e.message; console.error('[lark] ' + e.message); }
      // Luật 17/09/2026: ảnh dựng trên máy (không tải từ Base) phải đẩy ngược vào cột "File ảnh" để Base luôn có ảnh.
      // Ảnh tải từ Base (có origName) thì đã nằm sẵn trên Base, bỏ qua. --cap-nhat không đẩy lại để khỏi nhân đôi.
      const anhMay = uploaded.map((u, i) => u.url && manifest.images[i]).filter(img => img && !img.origName);
      if (anhMay.length && !capNhatId) {
        try { larkMsg += ' | ' + uploadAnhLenBase(anhMay.map(img => img.path)); }
        catch (e) { larkMsg += ' | ảnh Base LỖI: ' + e.message; console.error('[lark] ảnh: ' + e.message); }
      }
    }

    console.log(JSON.stringify({ post_id: post.id, link, status: check.status, categories, featured, og_image: ogOk ? og.url : null, images: uploaded.length, yoast: yoastOk, rankmath: rankMathOk, lark: larkMsg }, null, 2));
    if (NHAP) console.log('DRAFT_OK ' + post.id + ' ' + WP + '/?p=' + post.id + '&preview=true');
    else console.log('PUBLISH_OK ' + link);
  } catch (e) {
    fail(e.message);
  }
})();
