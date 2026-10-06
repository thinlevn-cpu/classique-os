#!/usr/bin/env node
/**
 * write-brief-to-base.mjs — Ghi brief nghiên cứu SEO vào bảng lịch bài SEO trong Lark Base của bạn
 * thành record mới với Trạng thái = "Chờ viết" (để skill hmh-AIOS-dang-bai-seo lấy đăng).
 *
 * Đầu vào: file JSON (1 object hoặc mảng object) theo schema ở references/field-mapping.md.
 *
 * Dùng:
 *   node write-brief-to-base.mjs --in brief.json [--dry-run] [--status "Chờ viết"]
 *   --in       : đường dẫn file JSON brief (bắt buộc). Có thể là 1 object hoặc [obj, obj...].
 *   --dry-run  : CHỈ in payload sẽ ghi, KHÔNG gọi Lark (dùng để kiểm trước).
 *   --status   : ghi đè Trạng thái (mặc định "Chờ viết").
 *
 * Exit: 0 = OK (in record_id_list) | 1 = lỗi | 2 = brief thiếu trường bắt buộc.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  console.error('[write-brief] THIẾU SEO_BASE_TOKEN / SEO_TABLE_ID — điền vào .secrets/seo-web.env (xem HUONG-DAN-CAI-DAT.md).');
  process.exit(1);
}

function arg(name, def = null) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true; // flag dạng boolean
}
const IN = arg('in');
const DRY = !!arg('dry-run');
const STATUS = (typeof arg('status') === 'string' ? arg('status') : null) || 'Chờ viết';

function die(msg, code = 1) { console.error('[write-brief] ' + msg); process.exit(code); }
if (!IN) die('Thiếu --in <brief.json>', 2);
if (!fs.existsSync(IN)) die('Không thấy file: ' + IN, 2);

let briefs;
try { briefs = JSON.parse(fs.readFileSync(IN, 'utf8')); } catch (e) { die('JSON lỗi: ' + e.message, 2); }
if (!Array.isArray(briefs)) briefs = [briefs];
if (!briefs.length) die('Brief rỗng.', 2);

// brief key -> tên field Lark + ép kiểu
const NUM = v => (v === '' || v == null ? null : Number(v));
const MAP = [
  ['tieu_de',            'Tiêu đề bài viết',   String],
  ['tu_khoa_chinh',      'Từ khoá chính',      String],
  ['tu_khoa_phu',        'Từ khoá phụ',        String],
  ['tu_khoa_nguoi_dung', 'Từ khoá người dùng', String],
  ['outline',            'Outline',            String],
  ['meta_title',         'Meta Title',         String],
  ['meta_description',   'Meta Description',   String],
  ['url_slug',           'URL Slug',           String],
  ['danh_muc',           'Danh mục WordPress', String],
  ['chuoi_bai',           'Chuỗi bài',          String],   // select: truyền đúng tên option (thêm 21/09/2026 cho lịch 90 ngày)
  ['schema_type',        'Schema Type',        String],
  ['internal_links',     'Internal Links',     String],
  ['backlink_targets',   'Backlink Targets',   String],
  ['alt_text',           'Alt text ảnh',       String],
  ['ghi_chu_seo',        'Ghi chú SEO',        String],
  ['nguoi_viet',         'Người viết',         String],
  ['so_tu_muc_tieu',     'Số từ mục tiêu',     NUM],
  ['so_hinh_anh',        'Số hình ảnh',        NUM],
  ['volume_thang',       'Volume tháng',       NUM],
  ['do_kho_kd',          'Độ khó KD',          NUM],
];

// Ngày đăng "YYYY-MM-DD" -> epoch ms (00:00 giờ máy). datetime field nhận số ms.
function dateToMs(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0).getTime();
}

// Dựng {fields:[...], rows:[[...]]} chỉ gồm trường có giá trị + luôn có Trạng thái.
const fieldsSet = [];
const rows = [];
for (let i = 0; i < briefs.length; i++) {
  const b = briefs[i];
  if (!b.tieu_de || !b.tu_khoa_chinh) die(`Brief #${i + 1} thiếu tieu_de hoặc tu_khoa_chinh.`, 2);
  const cells = {};
  for (const [key, fname, cast] of MAP) {
    if (b[key] !== undefined && b[key] !== '' && b[key] !== null) {
      const val = cast(b[key]);
      if (val !== null && !(typeof val === 'number' && Number.isNaN(val))) cells[fname] = val;
    }
  }
  const ms = dateToMs(b.ngay_dang);
  if (ms) cells['Ngày đăng'] = ms;
  cells['Trạng thái'] = STATUS;
  for (const k of Object.keys(cells)) if (!fieldsSet.includes(k)) fieldsSet.push(k);
  rows.push(cells);
}
// chuẩn hoá thành ma trận theo thứ tự fieldsSet, ô trống = null
const rowMatrix = rows.map(c => fieldsSet.map(f => (c[f] !== undefined ? c[f] : null)));
const payload = { fields: fieldsSet, rows: rowMatrix };

if (DRY) {
  console.log('[DRY-RUN] sẽ ghi ' + rows.length + ' record vào ' + TABLE_ID);
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

// gọi lark-cli (Windows .cmd cần shell:true + tự bọc nháy)
function q(a) { const s = String(a); return /[\s"&|<>^]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s; }
// JSON lớn (nhiều nháy/tiếng Việt) KHÔNG nhồi vào arg dòng lệnh được trên Windows -> ghi file rồi dùng --json @file
const tmp = IN.replace(/\.json$/i, '') + '.payload.json';
fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
const args = ['base', '+record-batch-create', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID, '--as', 'user', '--json', '@' + tmp];
const cmd = [LARK, ...args].map(q).join(' ');
const r = spawnSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: true, windowsHide: true });
if (r.error) die('không gọi được lark-cli: ' + r.error.message);
const txt = (r.stdout || '').trim();
const i = txt.indexOf('{');
if (i < 0) die('lark-cli không trả JSON. stderr: ' + (r.stderr || '').slice(0, 500));
let d;
try { d = JSON.parse(txt.slice(i)); } catch (e) { die('parse JSON lỗi: ' + e.message + ' | ' + txt.slice(0, 300)); }
if (d.ok === false) die('lark-cli lỗi: ' + JSON.stringify(d.error).slice(0, 500));
const ids = (d.data && (d.data.record_id_list || (d.data.records || []).map(x => x.record_id))) || [];
console.log('WRITE_OK ' + ids.length + ' record(s): ' + ids.join(', '));
