#!/usr/bin/env node
/**
 * upload-anh.mjs — Tải 1 ảnh từ field attachment "File ảnh" của Lark Base rồi đẩy lên WordPress
 * của bạn, CÓ CHỐNG TRÙNG (idempotent). Thay cho 3 lệnh gõ tay của skill này.
 *
 * VÌ SAO CÓ SCRIPT NÀY: quy trình cũ là 3 lệnh gõ tay (lark-cli download → tmp_download_url →
 * wp_upload_media_from_url). Gõ tay dễ sai path/BOM VÀ KHÔNG chống trùng: chạy lại = nhồi thêm
 * 1 ảnh mới vào WP Media Library (rác + tốn dung lượng + featured image trỏ sai). Script này:
 *   1) lấy tmp_download_url public (24h) của file-token qua lark-cli,
 *   2) TÍNH slug WordPress sẽ đặt cho ảnh rồi TRA WP Media trước (REST GET) — nếu đã có thì
 *      TÁI DÙNG media_id, KHÔNG upload lại,
 *   3) chỉ khi chưa có mới upload (Royal MCP wp_upload_media_from_url; fallback base64).
 * Trả về media_id + ghi 1 dòng log.
 *
 * TÍNH IDEMPOTENT: slug được tính từ filename. Nếu KHÔNG truyền --filename, filename mặc định
 * suy ra TỪ file-token (ổn định) → chạy lại cùng file-token luôn ra cùng slug → luôn dedup được,
 * kể cả khi không có tên "đẹp". Truyền --filename để có tên chứa từ khoá (SEO) — vẫn dedup theo slug.
 *
 * Tiền điều kiện: .secrets/wordpress.env (KHÔNG commit) gồm:
 *   WP_URL=https://classique.vn
 *   WP_USER=<user WP>              # để REST GET tra media (Basic auth)
 *   WP_APP_PASSWORD=<app pass>     #   "
 *   ROYAL_MCP_API_KEY=<key>        # để UPLOAD (site chặn POST /wp/v2/media -> 403 WAF)
 *
 * DÙNG:
 *   node upload-anh.mjs --base-token <T> --table-id <tbl> --record-id <rec> --file-token <ft> \
 *        [--filename tu-khoa-chinh-1.jpg] [--alt "..."] [--caption "..."] [--title "..."] \
 *        [--as user|bot] [--via url|base64] [--dry-run] [--print-cmd] [--force] [--config cfg.json]
 *
 *   --config cfg.json : đọc mọi tham số trên từ 1 file JSON (khoá bỏ tiền tố --, vd {"file_token":"..."})
 *   --dry-run  : chỉ tra trùng + in ra sẽ làm gì, KHÔNG upload, KHÔNG gọi MCP.
 *   --print-cmd: tra trùng + IN THAM SỐ lệnh upload cần chạy (nếu muốn chạy tay qua MCP), KHÔNG tự upload.
 *   --force    : bỏ qua tra trùng, upload mới (dùng khi cố ý muốn bản mới).
 *
 * Marker stdout: "UPLOAD_OK <media_id> <url>" | "UPLOAD_REUSE <media_id> <url>" | "UPLOAD_FAIL <lý do>".
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..', '..', '..', '..'); // .claude/skills/<skill>/scripts -> gốc dự án
const LARK = process.env.LARK_CLI || process.env.LARK_CLI_BIN || 'lark-cli';

// ---------- CLI args (+ --config) ----------
function argRaw(name) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return undefined;
  const nx = process.argv[i + 1];
  return (nx && !nx.startsWith('--')) ? nx : true; // flag không giá trị -> true
}
let CFG = {};
{
  const cfgPath = argRaw('config');
  if (typeof cfgPath === 'string') {
    try { CFG = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); }
    catch (e) { fail('không đọc được --config ' + cfgPath + ': ' + e.message); }
  }
}
// arg lấy theo thứ tự: dòng lệnh > config file. Chuẩn hoá cả 2 kiểu khoá (--file-token / file_token).
function arg(name, def = undefined) {
  const v = argRaw(name);
  if (v !== undefined) return v;
  const k1 = name.replace(/-/g, '_'), k2 = name;
  if (CFG[k1] !== undefined) return CFG[k1];
  if (CFG[k2] !== undefined) return CFG[k2];
  return def;
}

function fail(msg) { console.log('UPLOAD_FAIL ' + msg); process.exit(1); }

const BASE_TOKEN = arg('base-token');
const TABLE_ID = arg('table-id');
const RECORD_ID = arg('record-id') || '';
const FILE_TOKEN = arg('file-token');
const AS = arg('as', 'user');          // lark-cli --as user|bot
const VIA = arg('via', 'url');         // 'url' (wp_upload_media_from_url) | 'base64' (tải rồi wp_upload_media)
const DRY = !!arg('dry-run', false);
const PRINT_CMD = !!arg('print-cmd', false);
const FORCE = !!arg('force', false);

if (!FILE_TOKEN) fail('thiếu --file-token (bắt buộc). Xem SKILL.md cách lấy file-token từ record.');

// filename: ưu tiên --filename; nếu không, suy ra TỪ file-token để chạy lại vẫn idempotent.
let FILENAME = arg('filename');
const EXT = String(arg('ext', 'jpg')).replace(/^\./, '').toLowerCase();
if (!FILENAME) FILENAME = 'lark-' + String(FILE_TOKEN).replace(/[^A-Za-z0-9]/g, '').slice(0, 16).toLowerCase() + '.' + EXT;
FILENAME = String(FILENAME).trim();

// alt/title mặc định: dùng phần tên (không đuôi) để có ngữ cảnh; nên truyền --alt chứa từ khoá.
const BASE_NO_EXT = FILENAME.replace(/\.[a-z0-9]+$/i, '');
const ALT = arg('alt', BASE_NO_EXT);
const CAPTION = arg('caption', '');
const TITLE = arg('title', BASE_NO_EXT);

// ---------- WordPress sanitize_title (khớp cách WP đặt slug từ filename) ----------
// WP: bỏ dấu, đ->d, thường hoá, ký tự không [a-z0-9] -> '-', gộp '-' liên tiếp, trim '-'.
function wpSlug(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // bỏ dấu tiếng Việt
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
const SLUG = wpSlug(BASE_NO_EXT);

// ---------- env ----------
function loadEnv() {
  const env = {};
  const p = path.join(PROJECT, '.secrets', 'wordpress.env');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  for (const k of ['WP_URL', 'WP_USER', 'WP_APP_PASSWORD']) if (process.env[k]) env[k] = process.env[k];
  if (process.env.ROYAL_MCP_API_KEY) env.ROYAL_MCP_API_KEY = process.env.ROYAL_MCP_API_KEY;
  return env;
}
const env = loadEnv();
if (!env.WP_URL) fail('thiếu WP_URL — điền vào .secrets/wordpress.env (xem HUONG-DAN-CAI-DAT.md)');
const WP = env.WP_URL.replace(/\/+$/, '');
const CAN_REST = !!(env.WP_USER && env.WP_APP_PASSWORD);
const REST_AUTH = CAN_REST ? 'Basic ' + Buffer.from(`${env.WP_USER}:${env.WP_APP_PASSWORD.replace(/\s+/g, '')}`).toString('base64') : null;

// ---------- lark-cli: lấy tmp_download_url của file-token ----------
function q(a) { const s = String(a); return /[\s"&|<>^]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s; }
function findKeyDeep(obj, key) {
  if (obj == null || typeof obj !== 'object') return undefined;
  if (Array.isArray(obj)) { for (const it of obj) { const r = findKeyDeep(it, key); if (r !== undefined) return r; } return undefined; }
  if (key in obj) return obj[key];
  for (const k of Object.keys(obj)) { const r = findKeyDeep(obj[k], key); if (r !== undefined) return r; }
  return undefined;
}
function getTmpUrl(fileToken) {
  // Ghi params.json UTF-8 KHÔNG BOM (Node fs mặc định) — né lỗi PS5.1 thêm BOM làm hỏng JSON.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'larktmp-'));
  const pf = path.join(dir, 'params.json');
  fs.writeFileSync(pf, JSON.stringify({ file_tokens: [fileToken] }));
  const cmd = [LARK, 'api', 'GET', '/open-apis/drive/v1/medias/batch_get_tmp_download_url',
    '--params', '@params.json', '--as', AS].map(q).join(' ');
  const r = spawnSync(cmd, { cwd: dir, encoding: 'utf8', shell: true, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  const out = (r.stdout || '') + '\n' + (r.stderr || '');
  const i = out.indexOf('{');
  if (i < 0) fail('lark-cli không trả JSON khi lấy tmp_download_url: ' + out.slice(0, 300));
  let json;
  try { json = JSON.parse(out.slice(i, out.lastIndexOf('}') + 1)); } catch (e) { fail('parse tmp url JSON lỗi: ' + e.message + ' | ' + out.slice(0, 200)); }
  const url = findKeyDeep(json, 'tmp_download_url');
  if (!url) fail('không tìm thấy tmp_download_url trong phản hồi lark-cli: ' + JSON.stringify(json).slice(0, 300));
  return url;
}

// ---------- WP Media dedup qua REST GET (đọc được, chỉ POST binary mới bị WAF chặn) ----------
async function findExistingMedia(slug) {
  if (!CAN_REST) return { checked: false, media: null };
  const headers = { Authorization: REST_AUTH };
  async function get(pathname) {
    const res = await fetch(WP + '/wp-json' + pathname, { headers });
    const txt = await res.text();
    let j; try { j = JSON.parse(txt); } catch { j = null; }
    if (!res.ok) throw new Error(`GET ${pathname} -> ${res.status} ${txt.slice(0, 150)}`);
    return j;
  }
  try {
    // 1) khớp slug chính xác (slug WP = sanitize của tên file, không đuôi)
    let list = await get('/wp/v2/media?slug=' + encodeURIComponent(slug) + '&_fields=id,slug,source_url,title');
    let m = Array.isArray(list) ? list.find(x => x.slug === slug) : null;
    if (m) return { checked: true, media: m };
    // 2) fallback: search theo slug, khớp slug hoặc tên file trong source_url
    list = await get('/wp/v2/media?per_page=100&search=' + encodeURIComponent(slug) + '&_fields=id,slug,source_url,title');
    if (Array.isArray(list)) {
      m = list.find(x => x.slug === slug || wpSlug(String(x.source_url || '').split('/').pop().replace(/\.[a-z0-9]+$/i, '')) === slug);
      if (m) return { checked: true, media: m };
    }
    return { checked: true, media: null };
  } catch (e) {
    console.error('[dedup] không tra được WP Media (' + e.message + ') — sẽ CẢNH BÁO khả năng trùng.');
    return { checked: false, media: null };
  }
}

// ---------- Royal MCP client (self-contained) — upload ảnh (site chặn POST /wp/v2/media) ----------
function loadRoyalKey() {
  if (env.ROYAL_MCP_API_KEY) return env.ROYAL_MCP_API_KEY;
  throw new Error('thiếu ROYAL_MCP_API_KEY trong .secrets/wordpress.env (cần để upload ảnh qua Royal MCP)');
}
const MCP_URL = WP + '/wp-json/royal-mcp/v1/mcp';
function mcpHeaders(key) { return { 'X-Royal-MCP-API-Key': key, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }; }
function parseMcpBody(text) {
  const joined = text.split('\n').filter(l => l.startsWith('data:') || l.trim().startsWith('{')).map(l => l.replace(/^data:\s*/, '')).join('');
  const i = joined.indexOf('{');
  if (i < 0) throw new Error('phản hồi MCP không phải JSON: ' + text.slice(0, 200));
  return JSON.parse(joined.slice(i));
}
let _sid = null, _id = 100;
async function mcpCall(toolName, args) {
  const key = loadRoyalKey();
  if (!_sid) {
    const initRes = await fetch(MCP_URL, { method: 'POST', headers: mcpHeaders(key), body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'hmh-anh-lark', version: '1.0' } } }) });
    _sid = initRes.headers.get('mcp-session-id');
    if (!_sid) throw new Error('không nhận được Mcp-Session-Id (HTTP ' + initRes.status + ')');
    await fetch(MCP_URL, { method: 'POST', headers: { ...mcpHeaders(key), 'Mcp-Session-Id': _sid }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
  }
  const res = await fetch(MCP_URL, { method: 'POST', headers: { ...mcpHeaders(key), 'Mcp-Session-Id': _sid }, body: JSON.stringify({ jsonrpc: '2.0', id: ++_id, method: 'tools/call', params: { name: toolName, arguments: args } }) });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${toolName} -> HTTP ${res.status}: ${txt.slice(0, 200)}`);
  const j = parseMcpBody(txt);
  if (j.error) throw new Error(`${toolName} lỗi: ${JSON.stringify(j.error).slice(0, 300)}`);
  const content = j.result && j.result.content;
  if (Array.isArray(content)) { const t = content.find(c => c.type === 'text'); if (t) { try { return JSON.parse(t.text); } catch { return t.text; } } }
  return j.result;
}
function normId(r) { return r.id || r.media_id || r.ID || (r.data && r.data.id); }
function normUrl(r) { return r.source_url || r.url || r.guid || (r.data && r.data.source_url); }

async function uploadFromUrl(url) {
  const r = await mcpCall('wp_upload_media_from_url', { url, filename: FILENAME, alt_text: ALT, caption: CAPTION, title: TITLE });
  return { id: normId(r), url: normUrl(r), raw: r };
}
async function uploadBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('tải tmp_download_url về để base64 lỗi: HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  const r = await mcpCall('wp_upload_media', { filename: FILENAME, content_base64: buf.toString('base64'), alt_text: ALT, caption: CAPTION, title: TITLE });
  return { id: normId(r), url: normUrl(r), raw: r };
}

// ---------- log ----------
function writeLog(rec) {
  try {
    const dir = path.join(__dirname, '..', 'logs');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'uploads.log'), JSON.stringify(rec) + '\n');
  } catch (e) { console.error('[log] không ghi được: ' + e.message); }
}

// ---------- main ----------
(async () => {
  try {
    const nowIso = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('Z', '+07:00'); // GMT+7

    // 1) tmp_download_url
    const tmpUrl = getTmpUrl(FILE_TOKEN);

    // 2) CHỐNG TRÙNG — tra WP Media theo slug TRƯỚC KHI upload
    let dedup = { checked: false, media: null };
    if (!FORCE) dedup = await findExistingMedia(SLUG);

    if (dedup.media) {
      const rec = { time: nowIso, action: 'reuse', record_id: RECORD_ID, file_token: FILE_TOKEN, filename: FILENAME, slug: SLUG, media_id: dedup.media.id, url: dedup.media.source_url };
      writeLog(rec);
      console.log(JSON.stringify(rec, null, 2));
      console.log('UPLOAD_REUSE ' + dedup.media.id + ' ' + (dedup.media.source_url || ''));
      return;
    }

    const dupWarn = (!dedup.checked && !FORCE)
      ? 'CẢNH BÁO: KHÔNG tra được WP Media (thiếu WP_USER/WP_APP_PASSWORD hoặc REST lỗi) → không chắc ảnh này đã tồn tại chưa. Upload có thể tạo bản TRÙNG.'
      : null;

    // 3) DRY-RUN / PRINT-CMD: chỉ chuẩn bị + in, KHÔNG upload
    if (DRY || PRINT_CMD) {
      if (dupWarn) console.error('[dedup] ' + dupWarn);
      const plan = {
        mode: DRY ? 'dry-run' : 'print-cmd',
        would: dedup.checked ? 'CHƯA có trên WP → sẽ upload mới' : 'không tra được → cân nhắc',
        via: VIA, filename: FILENAME, slug: SLUG, alt: ALT, title: TITLE,
        tmp_download_url: tmpUrl,
        mcp_tool: VIA === 'base64' ? 'wp_upload_media' : 'wp_upload_media_from_url',
        mcp_arguments: VIA === 'base64'
          ? { filename: FILENAME, content_base64: '<base64 của ảnh tải từ tmp_download_url>', alt_text: ALT, caption: CAPTION, title: TITLE }
          : { url: tmpUrl, filename: FILENAME, alt_text: ALT, caption: CAPTION, title: TITLE },
        dup_warning: dupWarn || null,
      };
      console.log(JSON.stringify(plan, null, 2));
      console.log('UPLOAD_DRYRUN ' + SLUG);
      return;
    }

    if (dupWarn) console.error('[dedup] ' + dupWarn);

    // 4) upload (from_url; nếu lỗi → fallback base64)
    let up;
    if (VIA === 'base64') {
      up = await uploadBase64(tmpUrl);
    } else {
      try { up = await uploadFromUrl(tmpUrl); }
      catch (e) { console.error('[upload] wp_upload_media_from_url lỗi (' + e.message + ') → thử base64.'); up = await uploadBase64(tmpUrl); }
    }
    if (!up.id) fail('upload không trả media id: ' + JSON.stringify(up.raw).slice(0, 200));

    const rec = { time: nowIso, action: 'upload', record_id: RECORD_ID, file_token: FILE_TOKEN, filename: FILENAME, slug: SLUG, media_id: up.id, url: up.url || '', via: VIA };
    writeLog(rec);
    console.log(JSON.stringify(rec, null, 2));
    console.log('UPLOAD_OK ' + up.id + ' ' + (up.url || ''));
  } catch (e) {
    fail(e.message);
  }
})();
