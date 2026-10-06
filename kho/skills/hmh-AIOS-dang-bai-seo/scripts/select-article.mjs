#!/usr/bin/env node
/**
 * select-article.mjs — Quét bảng lịch bài SEO trong Lark Base của bạn, chọn bài ĐẾN HẠN để đăng.
 *
 * Tiêu chí chọn (khớp SOP tự động đăng theo lịch):
 *   - Trạng thái == "Chờ viết"
 *   - Ngày đăng <= HÔM NAY (theo ngày, tính cả bài quá hạn)
 *   - Nếu nhiều bài: lấy bài có Ngày đăng SỚM NHẤT (cũ nhất / quá hạn lâu nhất) trước.
 *
 * Việc làm:
 *   1) Liệt kê toàn bộ record (phân trang) qua lark-cli +record-list --format json.
 *   2) Lọc + sắp xếp, chọn 1 bài.
 *   3) Tải ảnh trong field "File ảnh" về thư mục --imgdir, đổi tên <slug>-N.<ext> (tên file chứa từ khoá/slug — chuẩn SEO).
 *   4) In ra STDOUT một MANIFEST JSON gồm toàn bộ brief + danh sách ảnh local. (Cũng ghi ra --out nếu có.)
 *
 * Dùng:
 *   node select-article.mjs --imgdir "<thư mục lưu ảnh>" [--out manifest.json] [--date YYYY-MM-DD] [--record-id recXXX]
 *   --date    : ép "hôm nay" (mặc định = ngày hệ thống). Hữu ích khi test.
 *   --record-id: bỏ qua bộ lọc, chọn đúng record này (đăng tay 1 bài cụ thể).
 *
 * Exit code: 0 = có bài (in manifest) | 3 = KHÔNG có bài đến hạn | 4 = có bài nhưng TẤT CẢ đang kẹt (>=max-fails lỗi) | 1 = lỗi.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressImage } from './lib-image.mjs';

// CẤU HÌNH CỦA BẠN — điền vào .secrets/seo-web.env (SEO_BASE_TOKEN, SEO_TABLE_ID; xem HUONG-DAN-CAI-DAT.md)
// hoặc đặt biến môi trường cùng tên. KHÔNG hardcode token vào file này.
const _PROJ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
function loadSeoEnv() {
  const out = {};
  for (const p of [path.join(_PROJ, '.secrets', 'seo-web.env'), '.secrets/seo-web.env']) {
    try {
      for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
        if (m && out[m[1]] === undefined) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    } catch {}
  }
  return out;
}
const seoEnv = loadSeoEnv();
const BASE_TOKEN = process.env.SEO_BASE_TOKEN || seoEnv.SEO_BASE_TOKEN || '';
const TABLE_ID = process.env.SEO_TABLE_ID || seoEnv.SEO_TABLE_ID || '';
const LARK = process.env.LARK_CLI || seoEnv.LARK_CLI || 'lark-cli';
if (!BASE_TOKEN || !TABLE_ID) {
  console.error('[select-article] THIẾU SEO_BASE_TOKEN / SEO_TABLE_ID — điền vào .secrets/seo-web.env (xem HUONG-DAN-CAI-DAT.md).');
  process.exit(1);
}

// ---- đọc tham số ----
function arg(name, def = null) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const IMGDIR = arg('imgdir');
const OUT = arg('out');
const FORCE_RID = arg('record-id');
const LEDGER = arg('fail-ledger');                       // sổ đếm lần lỗi theo record (chống nghẽn hàng đợi)
const MAX_FAILS = parseInt(arg('max-fails', '3'), 10) || 3;
// Record đã thử trong CÙNG lượt đêm (viết bù khi bài trước bị chặn): không chọn lại ngay trong đêm đó.
const BO_QUA = new Set((arg('bo-qua', '') || '').split(',').map(x => x.trim()).filter(Boolean));
// "Hôm nay" theo GMT+7 (Việt Nam) — KHÔNG dùng UTC. Ngày đăng trong Lark là giờ địa phương GMT+7;
// new Date().toISOString() trả UTC nên chạy tay sau 17:00 có thể lệch 1 ngày. Cộng 7h rồi cắt ngày.
function todayGmt7() { return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); }
const TODAY = arg('date') || todayGmt7();

function die(msg, code = 1) { console.error('[select-article] ' + msg); process.exit(code); }

// Sổ đếm lỗi: { "recXXXX": { count, lastError, lastDate } } — do orchestrator (run-daily.ps1) ghi. Ở đây chỉ đọc.
function loadLedger(p) {
  if (!p || !fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, '')) || {}; } catch { return {}; }
}

// Spawn .cmd trên Windows: Node chặn spawn trực tiếp .cmd (EINVAL) → dùng shell:true + tự bọc nháy kép.
function q(a) { const s = String(a); return /[\s"&|<>^]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s; }
function runLark(args) {
  const cmd = [LARK, ...args].map(q).join(' ');
  return spawnSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: true, windowsHide: true });
}

function lark(args) {
  const r = runLark(args);
  if (r.error) die('không gọi được lark-cli: ' + r.error.message);
  // lark-cli in JSON ra stdout; có thể kèm _notice — cố parse object đầu tiên.
  const txt = (r.stdout || '').trim();
  const i = txt.indexOf('{');
  if (i < 0) die('lark-cli không trả JSON. stderr: ' + (r.stderr || '').slice(0, 400));
  let d;
  try { d = JSON.parse(txt.slice(i)); } catch (e) { die('parse JSON lỗi: ' + e.message + ' | ' + txt.slice(0, 300)); }
  if (d.ok === false) die('lark-cli lỗi: ' + JSON.stringify(d.error).slice(0, 400));
  return d;
}

// ---- 1) liệt kê toàn bộ record (phân trang) ----
// QUAN TRỌNG: data của record-list xếp cột theo `field_id_list` (ID), KHÔNG chắc khớp `fields` (tên).
// Map sai cột làm field đính kèm ("File ảnh") đọc nhầm -> ảnh=0. Nên map theo field_id_list + tên từ field-list.
function listAll() {
  const fl = lark(['base', '+field-list', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID, '--format', 'json']);
  const nameById = {};
  for (const f of fl.data.fields) nameById[f.id] = f.name;
  const out = [];
  let offset = 0;
  for (let page = 0; page < 20; page++) {
    const d = lark(['base', '+record-list', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID,
      '--limit', '200', '--offset', String(offset), '--format', 'json']);
    const idList = d.data.field_id_list || [];  // thứ tự cột THẬT của data
    const rows = d.data.data || [];
    const ids = d.data.record_id_list || [];
    rows.forEach((row, idx) => {
      const rec = { record_id: ids[idx], fields: {} };
      idList.forEach((fid, c) => { rec.fields[nameById[fid] || fid] = row[c]; });
      out.push(rec);
    });
    if (!d.data.has_more) break;
    offset += rows.length || 200;
  }
  return out;
}

// Lark trả Ngày đăng dạng "YYYY-MM-DD HH:mm:ss" (giờ địa phương base, GMT+7) hoặc number(ms).
function dateOf(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return new Date(v).toISOString().slice(0, 10);
  const m = String(v).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
function statusArr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }

function slugify(s) {
  return String(s || 'bai-viet')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bai-viet';
}

// ---- chọn record ----
const all = listAll();
let chosen;
if (FORCE_RID) {
  chosen = all.find(r => r.record_id === FORCE_RID);
  if (!chosen) die('không tìm thấy record ' + FORCE_RID);
} else {
  const due = all.filter(r => {
    const st = statusArr(r.fields['Trạng thái']).join(',');
    const d = dateOf(r.fields['Ngày đăng']);
    return st.includes('Chờ viết') && d && d <= TODAY;
  });
  due.sort((a, b) => (dateOf(a.fields['Ngày đăng']) || '').localeCompare(dateOf(b.fields['Ngày đăng']) || ''));
  if (!due.length) {
    console.error(`[select-article] KHÔNG có bài "Chờ viết" nào đến hạn (<= ${TODAY}). Tổng record=${all.length}.`);
    process.exit(3);
  }
  // CHỐNG NGHẼN HÀNG ĐỢI: bỏ qua record "độc" đã lỗi >= MAX_FAILS lần (brief/ảnh hỏng) để không chặn
  // mọi bài phía sau (bài cũ nhất luôn được chọn -> nếu nó fail mãi thì cả hàng đợi bị đói). Record kẹt
  // được orchestrator báo động riêng; ở đây chỉ loại khỏi danh sách chọn rồi lấy bài lành kế tiếp.
  const ledger = loadLedger(LEDGER);
  const poisoned = [];
  const healthy = due.filter(r => {
    if (BO_QUA.has(r.record_id)) return false;
    const e = ledger[r.record_id];
    if (e && Number(e.count) >= MAX_FAILS) { poisoned.push(r.record_id); return false; }
    return true;
  });
  if (poisoned.length) {
    console.error(`[select-article] BỎ QUA ${poisoned.length} bài KẸT (>=${MAX_FAILS} lần lỗi): ${poisoned.join(', ')}.`);
  }
  if (!healthy.length) {
    console.error(`[select-article] TẤT CẢ ${due.length} bài đến hạn đều đang KẸT (>=${MAX_FAILS} lần lỗi). Cần người xử lý brief/ảnh.`);
    process.exit(4);
  }
  chosen = healthy[0];
}

const f = chosen.fields;
const slugRaw = (f['URL Slug'] || '').toString().replace(/^\/+/, '');
const slug = slugRaw ? slugify(slugRaw) : slugify(f['Từ khoá chính'] || f['Tiêu đề bài viết']);

// ---- 3) tải ảnh "File ảnh" ----
let images = [];
const atts = Array.isArray(f['File ảnh']) ? f['File ảnh'] : [];
if (atts.length && IMGDIR) {
  fs.mkdirSync(IMGDIR, { recursive: true });
  atts.forEach((a, i) => {
    // KHÔNG bỏ ảnh nặng nữa: tải về rồi NÉN bằng ffmpeg (xem lib-image.mjs). Máy ảnh xuất 6-10MB
    // mà blog chỉ cần ~1600px; nén vừa upload được (Royal MCP base64) vừa nhanh tải = tốt SEO.
    const ext = (path.extname(a.name || '') || '.jpg').toLowerCase();
    const outName = `${slug}-${i + 1}${ext}`;            // tên file chứa slug/từ khoá (chuẩn SEO)
    const outPath = path.join(IMGDIR, outName);
    const r = runLark(['base', '+record-download-attachment', '--base-token', BASE_TOKEN,
      '--table-id', TABLE_ID, '--record-id', chosen.record_id, '--file-token', a.file_token,
      '--output', outPath, '--overwrite']);
    if (r.status === 0 && fs.existsSync(outPath)) {
      const c = compressImage(outPath, { maxW: 1600 });
      if (c.ok) {
        console.error(`[select-article] ảnh ${a.name}: ${(c.before / 1048576).toFixed(1)}MB -> ${(c.after / 1048576).toFixed(2)}MB (${c.note}).`);
        images.push({ path: c.path, filename: c.filename, origName: a.name });
      } else {
        console.error(`[select-article] BỎ ảnh ${a.name}: nén xong vẫn ${(c.after / 1048576).toFixed(1)}MB (${c.note}) — quá ngưỡng upload.`);
      }
    } else {
      console.error(`[select-article] tải ảnh ${a.name} lỗi: ${(r.stderr || r.stdout || '').slice(0, 200)}`);
    }
  });
}

// ---- 4) manifest ----
const manifest = {
  record_id: chosen.record_id,
  id: f['ID'],
  title: f['Tiêu đề bài viết'],
  focus_keyword: f['Từ khoá chính'],
  secondary_keywords: f['Từ khoá phụ'],
  user_keywords: f['Từ khoá người dùng'],
  outline: f['Outline'],
  meta_title: f['Meta Title'],
  meta_description: f['Meta Description'],
  slug,
  category: f['Danh mục WordPress'],
  schema_type: f['Schema Type'],
  internal_links: f['Internal Links'],
  backlink_targets: f['Backlink Targets'],
  alt_text: f['Alt text ảnh'],
  seo_note: f['Ghi chú SEO'],
  target_words: f['Số từ mục tiêu'],
  publish_date: dateOf(f['Ngày đăng']),
  drive_image_link: f['Link ảnh Drive'],
  images,
  today: TODAY,
};

const json = JSON.stringify(manifest, null, 2);
if (OUT) fs.writeFileSync(OUT, json, 'utf8');
process.stdout.write(json + '\n');
console.error(`[select-article] CHỌN: ${manifest.id} "${manifest.title}" | keyword="${manifest.focus_keyword}" | slug=/${slug} | ảnh=${images.length} | ngày đăng=${manifest.publish_date}`);
