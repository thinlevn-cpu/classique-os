#!/usr/bin/env node
/**
 * thay-anh-bai-da-dang.mjs — THAY ẢNH cho bài ĐÃ ĐĂNG mà không đổi link bài (tạo 17/09/2026).
 * Dùng khi đổi kiểu mộc, che lại serial, thay ảnh nguồn ngoài... Ảnh mới dựng sẵn bằng anh-4x3.py.
 *
 *   node thay-anh-bai-da-dang.mjs --slug <slug> --img <thư mục ảnh mới> [--manifest manifest.json]
 *        [--map '{"ten-cu":"ten-moi"}'] [--dry-run]
 *
 * Khớp ảnh theo TÊN FILE (bỏ đuôi): ảnh trên web "<ten>.webp" <- file mới "<ten>.webp" trong --img.
 * Tên khác nhau thì truyền --map. Ảnh chia sẻ "<...>-chia-se.jpg" thay vào meta Yoast OG/Twitter.
 * Việc làm: upload ảnh mới (alt lấy từ manifest) -> thay URL trong nội dung -> đặt lại ảnh đại diện
 * -> thay ảnh chia sẻ Yoast -> in danh sách media CŨ (không tự xoá; xoá trong wp-admin nếu muốn).
 */
import fs from 'node:fs';
import path from 'node:path';
import { mcpCall, uploadLocalImage, setFeatured } from './royal-mcp.mjs';

const arg = (n, d = null) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };
const SLUG = arg('slug'), IMG = arg('img'), MF = arg('manifest'), DRY = process.argv.includes('--dry-run');
const MAP = JSON.parse(arg('map', '{}'));
if (!SLUG || !IMG) { console.error('thiếu --slug / --img'); process.exit(1); }
const SITE = 'https://classique.vn';
const base = u => path.basename(u).replace(/\.[a-z0-9]+$/i, '');

const j = async u => (await fetch(u)).json();
const post = (await j(`${SITE}/wp-json/wp/v2/posts?slug=${SLUG}&_fields=id,featured_media,content,meta,yoast_head_json`))[0];
if (!post) { console.error('không thấy bài ' + SLUG); process.exit(1); }
const html = post.content.rendered;
const liveUrls = [...new Set([...html.matchAll(/src="(https:\/\/classique\.vn\/wp-content\/uploads\/[^"]+)"/g)].map(m => m[1]))];

const alts = {};
if (MF) for (const it of JSON.parse(fs.readFileSync(MF, 'utf8')).images || []) if (it && it.filename) alts[base(it.filename)] = it.alt;
const files = fs.readdirSync(IMG);
const moi = t => files.find(f => base(f) === t && !f.includes('-chia-se'));

const bao = { slug: SLUG, post: post.id, thay: [], khong_khop: [], media_cu: [] };
let featuredOld = post.featured_media ? await j(`${SITE}/wp-json/wp/v2/media/${post.featured_media}?_fields=id,source_url`) : null;
let featuredNew = null;

for (const u of liveUrls) {
  const cu = base(u); const ten = MAP[cu] || cu; const f = moi(ten);
  if (!f) { bao.khong_khop.push(cu); continue; }
  if (DRY) { bao.thay.push(`${cu} <- ${f}`); continue; }
  const up = await uploadLocalImage(path.join(IMG, f), { alt: alts[ten] || alts[cu] || '', filename: f });
  const r = await mcpCall('wp_replace_in_post', { id: post.id, find: u, replace: up.url });
  bao.thay.push(`${cu} -> ${up.url} (${JSON.stringify(r).slice(0, 60)})`);
  const cuMedia = (await j(`${SITE}/wp-json/wp/v2/media?search=${encodeURIComponent(cu)}&_fields=id,source_url`)).filter(m => m.source_url === u);
  bao.media_cu.push(...cuMedia.map(m => m.id));
  if (featuredOld && base(featuredOld.source_url) === cu) featuredNew = up.id;
}

// Ảnh đại diện không nằm trong thân bài (theme tự hiện) -> thay riêng
if (featuredOld && !featuredNew) {
  const cu = base(featuredOld.source_url); const ten = MAP[cu] || cu; const f = moi(ten);
  if (f && !DRY) { const up = await uploadLocalImage(path.join(IMG, f), { alt: alts[ten] || '', filename: f }); featuredNew = up.id; bao.media_cu.push(featuredOld.id); bao.thay.push(`featured ${cu} -> ${up.url}`); }
  else if (f) bao.thay.push(`featured ${cu} <- ${f}`); else bao.khong_khop.push('featured:' + cu);
}
if (featuredNew && !DRY) await setFeatured(post.id, featuredNew);

// Ảnh chia sẻ Yoast
const og = files.find(f => f.includes('-chia-se'));
if (og && !DRY) {
  const up = await uploadLocalImage(path.join(IMG, og), { alt: '', filename: og });
  for (const [k, v] of [['_yoast_wpseo_opengraph-image', up.url], ['_yoast_wpseo_opengraph-image-id', String(up.id)], ['_yoast_wpseo_twitter-image', up.url], ['_yoast_wpseo_twitter-image-id', String(up.id)]])
    await mcpCall('wp_update_post_meta', { post_id: post.id, key: k, value: v });
  bao.thay.push('og -> ' + up.url);
}
console.log(JSON.stringify(bao, null, 1));
