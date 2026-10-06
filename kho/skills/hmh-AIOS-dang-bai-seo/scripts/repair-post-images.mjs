#!/usr/bin/env node
/**
 * repair-post-images.mjs — VÁ ảnh cho bài ĐÃ đăng nhưng thiếu ảnh (sự cố 20-28/06: ảnh >5MB bị bỏ).
 *
 * Với 1 manifest (do select-article tạo, đã tải + NÉN ảnh về img/):
 *   1) Upload ảnh qua Royal MCP (base64) -> media id + url.
 *   2) Tìm bài trên WP theo slug.
 *   3) Set featured_media = ảnh #1; chèn các ảnh thành <figure> vào thân bài (phân bố theo </h2>).
 *   4) Cập nhật Lark: WordPress Media ID (+ giữ Trạng thái "Đã đăng").
 *
 * Dùng:
 *   node repair-post-images.mjs --manifest <manifest.json> [--dry-run] [--no-lark]
 *
 * Chỉ ĐỘNG vào bài đã có (KHÔNG tạo bài mới). An toàn chạy lại: nếu thân bài đã có ảnh -> bỏ qua chèn.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { uploadLocalImage } from './royal-mcp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..', '..', '..', '..');

// CẤU HÌNH CỦA BẠN — điền vào .secrets/seo-web.env (SEO_BASE_TOKEN, SEO_TABLE_ID; xem HUONG-DAN-CAI-DAT.md).
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
  console.log('REPAIR_FAIL thiếu SEO_BASE_TOKEN / SEO_TABLE_ID — điền vào .secrets/seo-web.env (xem HUONG-DAN-CAI-DAT.md)');
  process.exit(1);
}

function arg(name, def = null) { const i = process.argv.indexOf('--' + name); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : (i >= 0 ? true : def); }
const MANIFEST = arg('manifest');
const DRY = !!arg('dry-run', false);
const NO_LARK = !!arg('no-lark', false);
function fail(m) { console.log('REPAIR_FAIL ' + m); process.exit(1); }
if (!MANIFEST) fail('thiếu --manifest');

function loadEnv() {
  const p = path.join(PROJECT, '.secrets', 'wordpress.env');
  if (!fs.existsSync(p)) fail('thiếu .secrets/wordpress.env');
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
  return env;
}
const env = loadEnv();
const WP = (env.WP_URL || '').replace(/\/+$/, '');
const AUTH = 'Basic ' + Buffer.from(`${env.WP_USER}:${(env.WP_APP_PASSWORD || '').replace(/\s+/g, '')}`).toString('base64');

async function wp(pathname, opts = {}) {
  const url = WP + '/wp-json' + pathname;
  const headers = Object.assign({ Authorization: AUTH }, opts.headers || {});
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${pathname} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

function q(a) { const s = String(a); return /[\s"&|<>^]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s; }
function updateLark(record_id, patch) {
  const body = JSON.stringify({ record_id_list: [record_id], patch });
  const cmd = [LARK, 'base', '+record-batch-update', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID, '--json', body].map(q).join(' ');
  const r = spawnSync(cmd, { encoding: 'utf8', shell: true, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0 || /"ok"\s*:\s*false/.test(out)) throw new Error('lark update lỗi: ' + out.slice(0, 300));
  return out;
}

// Chèn các <figure> vào thân bài: phân bố sau các </h2> (bỏ qua H2 đầu để không đè ngay dưới featured),
// nếu không đủ H2 thì chèn sau các </p>. Trả HTML mới.
function injectFigures(html, figures) {
  if (!figures.length) return html;
  // điểm chèn ưu tiên: sau </h2>
  const anchors = [];
  const reH2 = /<\/h2>/gi; let m;
  while ((m = reH2.exec(html))) anchors.push(m.index + m[0].length);
  let points = anchors.slice(1); // bỏ H2 đầu tiên
  if (points.length < figures.length) {
    // bù thêm bằng vị trí sau </p>
    const reP = /<\/p>/gi; const ps = [];
    while ((m = reP.exec(html))) ps.push(m.index + m[0].length);
    for (const p of ps) { if (points.length >= figures.length + 2) break; if (!points.includes(p) && p > (html.length * 0.15)) points.push(p); }
    points.sort((a, b) => a - b);
  }
  if (!points.length) return figures.join('\n') + '\n' + html; // bài không có heading: dồn lên đầu
  // chọn vị trí trải đều
  const chosen = [];
  const step = Math.max(1, Math.floor(points.length / figures.length));
  for (let i = 0, pi = 0; i < figures.length && pi < points.length; i++, pi += step) chosen.push(points[pi]);
  while (chosen.length < figures.length) chosen.push(points[points.length - 1]);
  // chèn từ cuối lên để không lệch offset
  let out = html;
  for (let i = figures.length - 1; i >= 0; i--) { const at = chosen[i]; out = out.slice(0, at) + '\n' + figures[i] + '\n' + out.slice(at); }
  return out;
}

(async () => {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const slug = manifest.slug;
    const KW = manifest.focus_keyword || '';
    const altBase = (manifest.alt_text && String(manifest.alt_text).trim()) ? String(manifest.alt_text).trim() : KW;
    const imgs = manifest.images || [];
    if (!slug) fail('manifest thiếu slug');
    if (!imgs.length) { console.log('REPAIR_SKIP ' + slug + ' (không có ảnh trong manifest)'); return; }

    // 1) tìm bài theo slug
    const posts = await wp('/wp/v2/posts?slug=' + encodeURIComponent(slug) + '&context=edit&_fields=id,link,status,content,featured_media');
    const post = Array.isArray(posts) ? posts.find(p => p.status === 'publish') || posts[0] : null;
    if (!post) fail('không tìm thấy bài publish slug=' + slug);
    const rawContent = (post.content && (post.content.raw ?? post.content.rendered)) || '';
    const alreadyHasImg = /<img\s/i.test(rawContent) || (post.featured_media && post.featured_media > 0);

    if (DRY) { console.log(`[dry] slug=${slug} post=${post.id} featured=${post.featured_media} hasImg=${alreadyHasImg} ảnh=${imgs.length}`); console.log('REPAIR_OK __DRY__ ' + post.link); return; }

    if (alreadyHasImg) { console.log('REPAIR_SKIP ' + slug + ' (bài đã có ảnh/featured — không đụng)'); return; }

    // 2) upload ảnh
    const uploaded = [];
    for (let i = 0; i < imgs.length; i++) {
      const alt = i === 0 ? altBase : `${altBase} (${i + 1})`;
      try {
        const { id, url } = await uploadLocalImage(imgs[i].path, { filename: imgs[i].filename, alt, caption: altBase, title: imgs[i].filename.replace(/\.[a-z0-9]+$/i, '') });
        uploaded.push({ id, url, alt });
      } catch (e) { console.error('[upload] ảnh ' + (i + 1) + ' lỗi: ' + e.message); }
    }
    if (!uploaded.length) fail('upload ảnh thất bại hết (xem ROYAL_MCP_API_KEY)');

    // 3) build figures + chèn (ảnh #1 vừa featured vừa nằm trong thân — đồng bộ hành vi publisher)
    const figures = uploaded.map(u => `<figure><img src="${u.url}" alt="${u.alt}"><figcaption>${u.alt}</figcaption></figure>`);
    const newContent = injectFigures(rawContent, figures);
    const featured = uploaded[0].id;

    await wp('/wp/v2/posts/' + post.id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newContent, featured_media: featured }) });

    // 4) cập nhật Lark
    let larkMsg = 'bỏ qua (--no-lark)';
    if (!NO_LARK && manifest.record_id) {
      try { updateLark(manifest.record_id, { 'Trạng thái': 'Đã đăng', 'Link web sau đăng': post.link, 'WordPress Media ID': featured }); larkMsg = 'OK'; }
      catch (e) { larkMsg = 'LỖI: ' + e.message; console.error('[lark] ' + e.message); }
    }

    console.log(JSON.stringify({ slug, post_id: post.id, link: post.link, uploaded: uploaded.length, featured, lark: larkMsg }, null, 2));
    console.log('REPAIR_OK ' + post.link);
  } catch (e) { fail(e.message); }
})();
