#!/usr/bin/env node
/**
 * royal-mcp.mjs — Client tối giản gọi tool của plugin "Royal MCP" trên website WordPress của bạn qua JSON-RPC.
 *
 * VÌ SAO: máy chủ chặn upload FILE/binary qua REST (POST /wp/v2/media -> 403 WAF). Royal MCP cung cấp
 * tool `wp_upload_media` nhận ẢNH DẠNG BASE64 trong body JSON (text, không phải binary đa phần) nên
 * upload được mà KHÔNG lách bảo mật — đây là đường chính thống có API key riêng.
 *
 * Auth: header `X-Royal-MCP-API-Key: <ROYAL_MCP_API_KEY trong .secrets/wordpress.env>`.
 * Giao thức: MCP Streamable HTTP — initialize -> notifications/initialized -> tools/call.
 *
 * API:
 *   import { mcpCall, uploadLocalImage, setFeatured } from './royal-mcp.mjs'
 *   await uploadLocalImage(path, { alt, caption, title, filename }) -> { id, url }
 *   await setFeatured(postId, mediaId)
 *   await mcpCall('wp_update_post', { id, content })
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..', '..', '..', '..');

// Đọc 1 khoá từ .secrets/wordpress.env (KHÔNG hardcode giá trị nào của site vào file này).
function envValue(key) {
  if (process.env[key]) return process.env[key];
  const p = path.join(PROJECT, '.secrets', 'wordpress.env');
  if (fs.existsSync(p)) {
    const m = fs.readFileSync(p, 'utf8').match(new RegExp('^\\s*' + key + '\\s*=\\s*(.+)\\s*$', 'm'));
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  return '';
}
let _MCP_URL = null;
function mcpUrl() {
  if (_MCP_URL) return _MCP_URL;
  const wp = process.env.WP_URL_OVERRIDE || envValue('WP_URL');
  if (!wp) throw new Error('thiếu WP_URL (điền vào .secrets/wordpress.env)');
  _MCP_URL = wp.replace(/\/+$/, '') + '/wp-json/royal-mcp/v1/mcp';
  return _MCP_URL;
}

function loadKey() {
  const k = envValue('ROYAL_MCP_API_KEY');
  if (k) return k;
  throw new Error('thiếu ROYAL_MCP_API_KEY (env hoặc .secrets/wordpress.env)');
}
let _KEY = null;
function headers() {
  if (!_KEY) _KEY = loadKey(); // nạp lười: import module không crash khi thiếu key (cho bài text-only)
  return { 'X-Royal-MCP-API-Key': _KEY, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
}

// Parse response: có thể là JSON thuần hoặc SSE ("data: {...}")
function parseBody(text) {
  const joined = text.split('\n').filter(l => l.startsWith('data:') || l.trim().startsWith('{')).map(l => l.replace(/^data:\s*/, '')).join('');
  const i = joined.indexOf('{');
  if (i < 0) throw new Error('phản hồi không phải JSON: ' + text.slice(0, 200));
  return JSON.parse(joined.slice(i));
}

let SESSION = null;
async function ensureSession() {
  if (SESSION) return SESSION;
  const initRes = await fetch(mcpUrl(), { method: 'POST', headers: headers(), body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'seo-skill', version: '1.0' } } }) });
  const sid = initRes.headers.get('mcp-session-id');
  if (!sid) throw new Error('không nhận được Mcp-Session-Id (HTTP ' + initRes.status + ')');
  await fetch(mcpUrl(), { method: 'POST', headers: { ...headers(), 'Mcp-Session-Id': sid }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
  SESSION = sid;
  return sid;
}

let _id = 100;
export async function mcpCall(toolName, args) {
  const sid = await ensureSession();
  const res = await fetch(mcpUrl(), { method: 'POST', headers: { ...headers(), 'Mcp-Session-Id': sid }, body: JSON.stringify({ jsonrpc: '2.0', id: ++_id, method: 'tools/call', params: { name: toolName, arguments: args } }) });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${toolName} -> HTTP ${res.status}: ${txt.slice(0, 200)}`);
  const j = parseBody(txt);
  if (j.error) throw new Error(`${toolName} lỗi: ${JSON.stringify(j.error).slice(0, 300)}`);
  // result.content[] kiểu MCP — thường có 1 phần text JSON
  const content = j.result && j.result.content;
  if (Array.isArray(content)) {
    const textPart = content.find(c => c.type === 'text');
    if (textPart) { try { return JSON.parse(textPart.text); } catch { return textPart.text; } }
  }
  return j.result;
}

export async function uploadLocalImage(filePath, opts = {}) {
  const buf = fs.readFileSync(filePath);
  const filename = opts.filename || path.basename(filePath);
  const r = await mcpCall('wp_upload_media', {
    filename,
    content_base64: buf.toString('base64'),
    alt_text: opts.alt || '',
    caption: opts.caption || '',
    title: opts.title || filename.replace(/\.[a-z0-9]+$/i, ''),
  });
  // chuẩn hoá id + url từ nhiều khả năng tên trường
  const id = r.id || r.media_id || r.ID || (r.data && r.data.id);
  const url = r.source_url || r.url || r.guid || (r.data && r.data.source_url);
  if (!id) throw new Error('upload không trả media id: ' + JSON.stringify(r).slice(0, 200));
  return { id, url };
}

export async function setFeatured(postId, mediaId) {
  return mcpCall('wp_set_featured_image', { post_id: postId, media_id: mediaId });
}

// CLI: node royal-mcp.mjs upload <file> [alt]   |   node royal-mcp.mjs call <tool> '<jsonArgs>'
if (process.argv[1] && process.argv[1].endsWith('royal-mcp.mjs')) {
  const [, , cmd, a, b] = process.argv;
  (async () => {
    try {
      if (cmd === 'upload') console.log(JSON.stringify(await uploadLocalImage(a, { alt: b || '' })));
      else if (cmd === 'call') console.log(JSON.stringify(await mcpCall(a, JSON.parse(b || '{}'))));
      else console.log('dùng: upload <file> [alt] | call <tool> <jsonArgs>');
    } catch (e) { console.error('ERR ' + e.message); process.exit(1); }
  })();
}
