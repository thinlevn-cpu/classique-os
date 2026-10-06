#!/usr/bin/env node
/**
 * lam-manifest.mjs — dựng manifest.json cho MỘT bài, tra record trong Base 18.1 THEO SLUG.
 *
 * Vì sao có file này (18/09/2026): trước đó manifest được dựng bằng cách lấy record theo
 * THỨ TỰ trong hàng đợi. Hàng đợi đổi (đăng xong vài bài là thứ tự lệch) nên hai bài đã
 * bị gắn nhầm record, sai slug, sai meta, và ghi nhầm trạng thái sang record khác.
 * Slug là khoá duy nhất và không đổi, nên tra theo slug là cách duy nhất chắc chắn.
 *
 * Alt ảnh đọc thẳng từ thẻ <img alt> trong HTML, không gõ lại lần hai (tránh lệch alt).
 *
 * Dùng: node lam-manifest.mjs --html <bài.html> --imgdir <thư mục ảnh> --out <manifest.json>
 *       (slug lấy từ tên file ảnh đầu tiên, hoặc truyền --slug)
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const arg = (n, d = null) => { const i = process.argv.indexOf('--' + n); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const HTML = arg('html'), IMGDIR = arg('imgdir'), OUT = arg('out');
if (!HTML || !IMGDIR || !OUT) { console.error('thiếu --html / --imgdir / --out'); process.exit(2); }

const env = Object.fromEntries(fs.readFileSync('.secrets/seo-web.env', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const L = env.LARK_CLI || 'lark-cli', BT = env.SEO_BASE_TOKEN, TB = env.SEO_TABLE_ID;
const q = a => /[\s"&|<>^]/.test(String(a)) ? '"' + String(a).replace(/"/g, '\\"') + '"' : String(a);
const lark = a => { const r = spawnSync([L, ...a].map(q).join(' '), { encoding: 'utf8', maxBuffer: 64e6, shell: true }); const t = (r.stdout || '').trim(); const i = t.indexOf('{'); if (i < 0) throw new Error(r.stderr || t); return JSON.parse(t.slice(i)); };
const T = v => Array.isArray(v) ? v.map(x => x?.text ?? x).join('\n') : (v && typeof v === 'object' ? (v.text ?? '') : (v ?? ''));

// ảnh: đọc theo thứ tự tên file (…-1-…, …-2-…), alt lấy từ HTML
const html = fs.readFileSync(HTML, 'utf8');
const altTheoIndex = {};
[...html.matchAll(/<img[^>]*src="__IMG(\d+)__"[^>]*alt="([^"]*)"/g)].forEach(m => altTheoIndex[m[1]] = m[2]);
const files = fs.readdirSync(IMGDIR).filter(f => /\.webp$/i.test(f)).sort();
if (!files.length) { console.error('không có ảnh .webp trong ' + IMGDIR); process.exit(2); }
const SLUG = arg('slug') || files[0].replace(/-\d+-.*$/, '');

const fl = lark(['base', '+field-list', '--base-token', BT, '--table-id', TB, '--format', 'json']);
const nameById = {}; for (const f of fl.data.fields) nameById[f.id] = f.name;
let recs = [], offset = 0;
for (let p = 0; p < 20; p++) {
  const d = lark(['base', '+record-list', '--base-token', BT, '--table-id', TB, '--limit', '200', '--offset', String(offset), '--format', 'json']);
  const idl = d.data.field_id_list || [], rows = d.data.data || [], ids = d.data.record_id_list || [];
  rows.forEach((row, i) => { const r = { record_id: ids[i], f: {} }; idl.forEach((fid, c) => r.f[nameById[fid] || fid] = row[c]); recs.push(r); });
  if (!d.data.has_more) break; offset += rows.length || 200;
}
const hit = recs.find(r => T(r.f['URL Slug']).trim() === SLUG);
if (!hit) { console.error('KHÔNG tìm thấy record nào có URL Slug = "' + SLUG + '" trong Base. Dừng, không dựng manifest.'); process.exit(3); }
const F = k => T(hit.f[k]);

const imgs = files.map((fn, i) => ({ path: path.join(IMGDIR, fn), filename: fn, alt: altTheoIndex[String(i + 1)] || F('Alt text ảnh') || F('Từ khoá chính') }));
const og = fs.readdirSync(IMGDIR).find(f => /-chia-se\.jpg$/i.test(f));
const m = {
  record_id: hit.record_id, title: F('Tiêu đề bài viết'), focus_keyword: F('Từ khoá chính'),
  secondary_keywords: F('Từ khoá phụ'), user_keywords: F('Từ khoá người dùng'),
  meta_title: F('Meta Title'), meta_description: F('Meta Description'), slug: SLUG,
  category: F('Danh mục WordPress'), schema_type: F('Schema Type'), schema: 'Article',
  internal_links: F('Internal Links'), backlink_targets: F('Backlink Targets'),
  alt_text: imgs[0].alt, target_words: parseInt(F('Số từ mục tiêu') || '1800', 10),
  publish_date: (F('Ngày đăng').match(/\d{4}-\d{2}-\d{2}/) || [''])[0],
  images: imgs, ...(og ? { og_image: { path: path.join(IMGDIR, og), filename: og } } : {}),
};
fs.writeFileSync(OUT, JSON.stringify(m, null, 1));
console.log(`OK  slug=${SLUG}  record=${hit.record_id}  "${m.title}"  ${imgs.length} ảnh`);
