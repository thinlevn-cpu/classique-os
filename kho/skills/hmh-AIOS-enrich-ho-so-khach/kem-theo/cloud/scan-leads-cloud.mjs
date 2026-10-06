#!/usr/bin/env node
// scan-leads-cloud.mjs — BẢN DỰ PHÒNG chạy trên GitHub Actions khi máy chạy skill bị TẮT.
//
// Chạy được gì trên mây: đọc bảng lead qua Lark Open API + lọc rác bằng luật cứng
// (đầu số VN, email hợp lệ, tên cụt) rồi ghi nhận xét vào bảng.
// KHÔNG chạy được: tra Zalo (phiên cá nhân, IP runner ở Mỹ sẽ bị cảnh báo) và
// Claude research (cần API key trả tiền). Nên bản này CỐ TÌNH KHÔNG bật cờ "Đã enrich"
// → khi máy bật lại, enrich-watcher vẫn dựng hồ sơ đầy đủ và ghi đè lên nhận xét tạm này.
//
// Env bắt buộc: LARK_APP_ID, LARK_APP_SECRET
// Env tuỳ chọn: BASE_TOKEN, TABLE_ID, DRY_RUN=1 (chỉ in, không ghi), LARK_WEBHOOK (báo card)

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_TOKEN = process.env.BASE_TOKEN;
const TABLE_ID = process.env.TABLE_ID;
const DRY = process.env.DRY_RUN === '1';
const WEBHOOK = process.env.LARK_WEBHOOK || '';
const HOST = 'https://open.larksuite.com';

const F = {
  enrich: 'Đã enrich', chatluong: 'Chất lượng data', hoso: 'Hồ sơ khách',
  ten: 'Họ tên', sdt: 'Số điện thoại', email: 'Email', ghichu: 'Ghi chú', ngay: 'Ngày tạo',
};

if (!APP_ID || !APP_SECRET) { console.error('Thiếu LARK_APP_ID / LARK_APP_SECRET (đặt trong GitHub Secrets)'); process.exit(1); }
if (!BASE_TOKEN || !TABLE_ID) { console.error('Thiếu BASE_TOKEN / TABLE_ID (đặt trong workflow env hoặc GitHub Variables)'); process.exit(1); }

async function tenantToken() {
  const r = await fetch(`${HOST}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const j = await r.json();
  if (j.code !== 0) throw new Error(`lấy token lỗi ${j.code}: ${j.msg}`);
  return j.tenant_access_token;
}

async function listAll(tok) {
  const out = [];
  let pageToken = '';
  for (;;) {
    const u = new URL(`${HOST}/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`);
    u.searchParams.set('page_size', '500');
    if (pageToken) u.searchParams.set('page_token', pageToken);
    const r = await fetch(u, { headers: { Authorization: 'Bearer ' + tok } });
    const j = await r.json();
    if (j.code !== 0) throw new Error(`đọc bảng lỗi ${j.code}: ${j.msg}`);
    out.push(...(j.data.items || []));
    if (!j.data.has_more) break;
    pageToken = j.data.page_token;
  }
  return out;
}

// Ô Lark có thể là chuỗi, mảng, hoặc object {text,link} → rút về chuỗi phẳng.
function cell(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.map(cell).filter(Boolean).join(' ');
  if (typeof v === 'object') return String(v.text || v.name || v.link || '').trim();
  return String(v);
}
// Email trong bảng hay ở dạng markdown [a@b.com](mailto:a@b.com) → bóc lấy địa chỉ.
function normEmail(raw) {
  const s = cell(raw);
  const m = s.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : '';
}
// SĐT VN: 10 số bắt đầu 03/05/07/08/09, hoặc cố định 02x.
function normPhone(raw) {
  let s = cell(raw).replace(/[^\d+]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length >= 11) s = '0' + s.slice(2);
  return /^(0(3|5|7|8|9)\d{8}|02\d{9})$/.test(s) ? s : '';
}
const EMAIL_OK = (e) => /^[\w.+-]+@[\w-]+\.[a-z]{2,}$/i.test(e) && !/\.(con|comn|co m|cim)$/i.test(e);
const NAME_WEAK = (n) => !n || n.trim().split(/\s+/).length < 2 || n.trim().length < 4;

async function patch(tok, recordId, fields) {
  if (DRY) return true;
  const r = await fetch(`${HOST}/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${recordId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify({ fields }),
  });
  const j = await r.json();
  if (j.code !== 0) { console.error(`  ✗ ghi ${recordId} lỗi ${j.code}: ${j.msg}`); return false; }
  return true;
}

const tok = await tenantToken();
const recs = await listAll(tok);
const pending = recs.filter((r) => r.fields[F.enrich] !== true);

console.log(`Tổng record: ${recs.length} · chưa có hồ sơ: ${pending.length}${DRY ? ' · DRY RUN' : ''}`);

let junk = 0, sdtSai = 0, ok = 0, wrote = 0;
for (const r of pending) {
  const ten = cell(r.fields[F.ten]);
  const sdt = normPhone(r.fields[F.sdt]);
  const sdtRaw = cell(r.fields[F.sdt]);
  const email = normEmail(r.fields[F.email]);
  const emailOk = EMAIL_OK(email);
  const daCoHoSo = cell(r.fields[F.hoso]).length > 0;

  const ly = [];
  if (!sdt) ly.push(`SĐT "${sdtRaw}" không đúng chuẩn VN`);
  if (!emailOk) ly.push(`email "${email || cell(r.fields[F.email])}" không hợp lệ`);
  if (NAME_WEAK(ten)) ly.push(`tên khai cụt ("${ten}")`);

  let chatluong = null;
  if (!sdt && !emailOk) { chatluong = 'Rác'; junk++; }
  else if (!sdt) { chatluong = 'Cần kiểm tra'; sdtSai++; }
  else { ok++; }

  // Chỉ ghi khi record CHƯA có hồ sơ thật — không đè lên kết quả research đầy đủ.
  if (!chatluong || daCoHoSo) continue;
  const note = `[Bản lọc nhanh trên GitHub — máy chưa bật] ${ly.join(' · ')}. `
    + `Chưa tra Zalo, chưa research web. Sẽ được dựng hồ sơ đầy đủ khi máy bật lại.`;
  const okw = await patch(tok, r.record_id, { [F.chatluong]: chatluong, [F.hoso]: note });
  if (okw) { wrote++; console.log(`  ${DRY ? '(dry) ' : ''}${chatluong.padEnd(13)} ${ten} — ${ly.join(' · ')}`); }
}

const summary = `Lọc nhanh lead salepage: ${pending.length} lead chưa có hồ sơ · ${junk} rác · ${sdtSai} SĐT sai · ${ok} liên lạc được. Đã ghi ${wrote} nhận xét tạm.`;
console.log('\n' + summary);

if (WEBHOOK && !DRY && wrote > 0) {
  await fetch(WEBHOOK, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text: '☁️ ' + summary + ' (máy chưa bật — hồ sơ đầy đủ sẽ dựng sau)' } }),
  }).catch(() => {});
}
