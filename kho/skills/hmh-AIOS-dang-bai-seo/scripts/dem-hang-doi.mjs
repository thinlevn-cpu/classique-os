#!/usr/bin/env node
// dem-hang-doi.mjs — in số bài "Chờ viết" còn trong Base 18.1 (lịch VPS dùng để biết lúc nào cần research chủ đề mới).
// Dùng: node dem-hang-doi.mjs [--chi-tiet]   (--chi-tiet in thêm tiêu đề + từ khoá chính từng dòng, mọi trạng thái)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const env = Object.fromEntries(fs.readFileSync(path.join(PROJECT, '.secrets', 'seo-web.env'), 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]));
const lark = a => { const s = spawnSync('lark-cli', a, { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout || ''; return JSON.parse(s.slice(s.indexOf('{'))).data; };
const B = ['--base-token', env.SEO_BASE_TOKEN, '--table-id', env.SEO_TABLE_ID];
const ten = {}; for (const f of lark(['base', '+field-list', ...B, '--format', 'json']).fields) ten[f.id] = f.name;
const rows = [];
for (let off = 0, p = 0; p < 20; p++) {
  const d = lark(['base', '+record-list', ...B, '--limit', '200', '--offset', String(off), '--format', 'json']);
  (d.data || []).forEach(r => { const o = {}; d.field_id_list.forEach((f, i) => o[ten[f]] = r[i]); rows.push(o); });
  if (!d.has_more) break; off += 200;
}
const txt = v => [].concat(v ?? '').map(x => (x && typeof x === 'object') ? (x.text || x.name || '') : x).join('');
if (process.argv.includes('--chi-tiet')) for (const o of rows) console.log(`${txt(o['Trạng thái'])} | ${txt(o['Tiêu đề bài viết'])} | ${txt(o['Từ khoá chính'])} | ${txt(o['Chuỗi bài'])}`);
else console.log(rows.filter(o => txt(o['Trạng thái']) === 'Chờ viết').length);
