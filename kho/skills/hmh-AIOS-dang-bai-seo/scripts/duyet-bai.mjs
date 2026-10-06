#!/usr/bin/env node
/**
 * duyet-bai.mjs — Đăng thật các bài NHÁP chủ nhân đã duyệt (17/09/2026, chạy trên VPS mỗi 15 phút).
 *
 * Bài do lịch VPS viết được publish-wordpress.mjs --nhap đưa lên WordPress dạng draft,
 * Base 18.1 -> "Chờ duyệt", "Link web sau đăng" = https://classique.vn/?p=<id>. Chủ nhân duyệt bằng 1 trong 2 cách:
 *   A. Đổi Trạng thái trong Base sang "Duyệt đăng"  -> script này chuyển bài sang publish.
 *   B. Bấm "Đăng" ngay trong WordPress              -> script này thấy bài đã publish, chỉ đồng bộ Base.
 * Sau đó Base -> "Đã đăng" + link thật, gửi 1 tin vào nhóm Lark (LARK_ALERT_WEBHOOK).
 *
 * Dùng: node duyet-bai.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..', '..', '..', '..');
const DRY = process.argv.includes('--dry-run');

function docEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(PROJECT, '.secrets', file), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}
const seo = docEnv('seo-web.env');
const wpEnv = docEnv('wordpress.env');
const LARK = process.env.LARK_CLI || seo.LARK_CLI || 'lark-cli';
const BASE_TOKEN = seo.SEO_BASE_TOKEN, TABLE_ID = seo.SEO_TABLE_ID, WEBHOOK = seo.LARK_ALERT_WEBHOOK;
const WP = (wpEnv.WP_URL || '').replace(/\/+$/, '');
const AUTH = 'Basic ' + Buffer.from(`${wpEnv.WP_USER}:${(wpEnv.WP_APP_PASSWORD || '').replace(/\s+/g, '')}`).toString('base64');
if (!BASE_TOKEN || !TABLE_ID || !WP) { console.error('[duyet] thiếu cấu hình seo-web.env / wordpress.env'); process.exit(1); }

function lark(args) {
  const r = spawnSync(LARK, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const s = r.stdout || '';
  const i = s.indexOf('{');
  if (r.status !== 0 || i < 0) throw new Error('lark-cli lỗi: ' + (r.stderr || s).slice(0, 300));
  const d = JSON.parse(s.slice(i));
  if (d.ok === false) throw new Error('lark-cli: ' + s.slice(0, 300));
  return d;
}

function listAll() {
  const nameById = {};
  for (const f of lark(['base', '+field-list', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID, '--format', 'json']).data.fields) nameById[f.id] = f.name;
  const out = [];
  for (let page = 0, offset = 0; page < 20; page++) {
    const d = lark(['base', '+record-list', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID, '--limit', '200', '--offset', String(offset), '--format', 'json']).data;
    (d.data || []).forEach((row, idx) => {
      const rec = { record_id: d.record_id_list[idx], fields: {} };
      (d.field_id_list || []).forEach((fid, c) => { rec.fields[nameById[fid] || fid] = row[c]; });
      out.push(rec);
    });
    if (!d.has_more) break;
    offset += (d.data || []).length || 200;
  }
  return out;
}

// Lark trả ô select/text dạng mảng chuỗi HOẶC mảng object {text}/{link}/{name}.
// BẪY (lỗi 20/09/2026): với chuỗi thường, x.link là String.prototype.link (hàm cũ của JS) nên LUÔN truthy
// -> text() trả về mã nguồn hàm, không bài nào khớp "Duyệt đăng", 13 bài anh duyệt nằm im. Chỉ đọc
// thuộc tính khi x THẬT SỰ là object.
const oneText = x => (x && typeof x === 'object') ? (x.text || x.link || x.name || '') : String(x ?? '');
const text = v => Array.isArray(v) ? v.map(oneText).join('') : oneText(v);

async function wp(pathname, opts = {}) {
  const res = await fetch(WP + '/wp-json' + pathname, { method: opts.method || 'GET', headers: { Authorization: AUTH, 'Content-Type': 'application/json' }, body: opts.body });
  const body = await res.text();
  let json; try { json = JSON.parse(body); } catch { json = body; }
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${pathname} -> ${res.status} ${String(body).slice(0, 200)}`);
  return json;
}

async function guiLark(msg) {
  if (!WEBHOOK || DRY) { console.log('[lark]', msg); return; }
  try { await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msg_type: 'text', content: { text: msg } }) }); }
  catch (e) { console.error('[lark] gửi tin lỗi: ' + e.message); }
}

function capNhatBase(recordId, patch) {
  if (DRY) { console.log('[dry-run] Base', recordId, JSON.stringify(patch)); return; }
  lark(['base', '+record-batch-update', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID, '--json', JSON.stringify({ update_records: { [recordId]: patch } }), '--as', 'user']);
}

const recs = listAll().filter(r => ['Chờ duyệt', 'Duyệt đăng'].includes(text(r.fields['Trạng thái'])));
let daDang = 0;
for (const r of recs) {
  const trangThai = text(r.fields['Trạng thái']);
  const tieuDe = text(r.fields['Tiêu đề bài viết']);
  const m = text(r.fields['Link web sau đăng']).match(/[?&]p=(\d+)/);
  if (!m) { if (trangThai === 'Duyệt đăng') console.error(`[duyet] ${r.record_id} "${tieuDe}": không có link ?p=<id>, bỏ qua`); continue; }
  const id = m[1];
  try {
    let post = await wp(`/wp/v2/posts/${id}?context=edit&_fields=id,status,link`);
    if (post.status !== 'publish' && trangThai === 'Duyệt đăng') {
      if (DRY) { console.log(`[dry-run] sẽ đăng #${id} "${tieuDe}"`); continue; }
      await wp(`/wp/v2/posts/${id}`, { method: 'POST', body: JSON.stringify({ status: 'publish' }) });
      post = await wp(`/wp/v2/posts/${id}?context=edit&_fields=id,status,link`);
    }
    if (post.status !== 'publish') continue; // còn nháp, chưa ai duyệt
    capNhatBase(r.record_id, { 'Trạng thái': 'Đã đăng', 'Link web sau đăng': post.link });
    daDang++;
    console.log(`PUBLISH_OK ${post.link}`);
    await guiLark(`✅ Đã đăng lên web: ${tieuDe.toLocaleUpperCase('vi-VN')}\n${post.link}`);
  } catch (e) {
    console.error(`[duyet] #${id} "${tieuDe}": ${e.message}`);
    if (trangThai === 'Duyệt đăng') await guiLark(`⚠️ Không đăng được bài đã duyệt "${tieuDe}" (#${id}): ${e.message.slice(0, 200)}`);
  }
}
console.log(`[duyet] ${recs.length} bài chờ/duyệt, đã đăng ${daDang}.`);
