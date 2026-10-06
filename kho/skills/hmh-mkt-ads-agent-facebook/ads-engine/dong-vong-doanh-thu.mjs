#!/usr/bin/env node
// dong-vong-doanh-thu.mjs — Cầu nối ĐƠN HÀNG (MAD CRM) → Meta Purchase (CAPI) → ROAS thật.
// DATA-DRIVEN: đọc cấu hình từ Thư viện URL (mỗi sản phẩm: mã utm_content → pixel + giá trị đơn).
// KHÔNG hardcode pixel/giá/source. Thêm sản phẩm = thêm 1 dòng thư viện, không sửa code.
// Chạy nhiều chiến dịch: mỗi đơn tự khớp về đúng sản phẩm qua utm_content → đúng pixel + giá.
//
// node dong-vong-doanh-thu.mjs --config <urllib.json> --orders <crm.json> [--send]
//   DRY mặc định (xem trước). --send mới bắn thật.

import fs from "node:fs";
import path from "node:path";
import { sendPurchase } from "./lib/meta.mjs";

const HERE = decodeURIComponent(new URL(".", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const LEDGER = path.join(HERE, "purchase-sent-ledger.json");
const load = () => { try { return JSON.parse(fs.readFileSync(LEDGER, "utf8")); } catch { return {}; } };
const save = l => fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2), "utf8");
const arg = k => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : null; };
const SEND = process.argv.includes("--send");

function cell(m, k) {
  let v = m[k];
  if (Array.isArray(v) && v.length) { v = v[0]; if (v && typeof v === "object") v = v.text || v.name || v.value || v.number || Object.values(v)[0]; }
  return v;
}
// Khớp tên field "mềm" (chuẩn hóa NFC + so khớp đúng rồi tới chứa-chuỗi) — né lỗi tiếng Việt NFC/NFD
function pickFactory(m) {
  const keys = Object.keys(m);
  const norm = s => String(s).normalize("NFC").toLowerCase();
  return (...subs) => {
    for (const sub of subs) {
      const k = keys.find(x => norm(x) === norm(sub)) || keys.find(x => norm(x).includes(norm(sub)));
      if (k) return cell(m, k);
    }
    return undefined;
  };
}
const rowsToMaps = j => { const f = j.data.fields, rows = j.data.data, rid = j.data.record_id_list || []; return rows.map((r, i) => ({ _id: rid[i], m: Object.fromEntries(f.map((k, x) => [k, r[x]])) })); };

async function main() {
  const cfgFile = arg("config"), ordFile = arg("orders");
  if (!cfgFile || !ordFile) { console.error("Cần --config <urllib.json> --orders <crm.json>"); process.exit(1); }

  // 1) Đọc cấu hình từ Thư viện URL → map: utm_content → {pixel, value, name}
  const CFG = {};
  for (const { m } of rowsToMaps(JSON.parse(fs.readFileSync(cfgFile, "utf8")))) {
    const p = pickFactory(m);
    const key = String(p("Mã nhận diện (utm_content)", "diện") || "").toLowerCase().trim();
    if (!key) continue;
    CFG[key] = { pixel: p("Pixel gợi ý", "Pixel"), value: Number(p("Giá trị đơn (VND)", "Giá trị") || 0), name: p("Tên / Từ khóa", "Từ khóa") };
  }
  console.log(`Cấu hình ${Object.keys(CFG).length} sản phẩm từ Thư viện URL:`);
  for (const [k, v] of Object.entries(CFG)) console.log(`  - ${k} → ${v.name} | ${v.value.toLocaleString("vi-VN")}đ | pixel ${v.pixel}`);

  // 2) Đọc đơn → khớp theo utm_content → eligible
  const ledger = load();
  const eligible = [];
  for (const { _id, m } of rowsToMaps(JSON.parse(fs.readFileSync(ordFile, "utf8")))) {
    const p = pickFactory(m);
    if (p("Khóa học đăng ký", "Khóa học đăng") !== "Hoàn Tất Thanh Toán") continue;     // đã thanh toán
    const utm = String(p("utm_content") || "").toLowerCase().trim();
    const cfg = CFG[utm];
    if (!cfg) continue;                       // không khớp sản phẩm nào trong thư viện → bỏ
    if (!(cfg.value > 0)) continue;           // sản phẩm miễn phí (lead magnet) → không gửi Purchase
    const email = p("Email"), phone = p("Số điện thoại", "điện thoại");
    if (!email && !phone) continue;
    if (ledger[_id]) continue;                // khử trùng
    eligible.push({ id: _id, email, phone, ten: cell(m, "Họ và Tên"), cfg });
  }

  console.log(`\nTìm thấy ${eligible.length} đơn đã thanh toán khớp sản phẩm trong thư viện, chưa gửi.`);
  if (!eligible.length) { console.log("→ Không có gì để gửi (đúng nếu chiến dịch chưa chạy ra đơn từ ads)."); return; }

  for (const o of eligible) {
    if (!SEND) { console.log(`  [XEM TRƯỚC] Purchase ${o.cfg.value.toLocaleString("vi-VN")}đ → ${o.cfg.name} — ${o.ten} (${o.email || o.phone}) [pixel ${o.cfg.pixel}]`); continue; }
    const r = await sendPurchase({ pixelId: o.cfg.pixel, value: o.cfg.value, email: o.email, phone: o.phone });
    if (r.events_received >= 1) { ledger[o.id] = { ts: Date.now(), value: o.cfg.value, sp: o.cfg.name }; console.log(`  ✅ ${o.ten} → ${o.cfg.name} ${o.cfg.value.toLocaleString("vi-VN")}đ`); }
    else console.log(`  ⚠️ Lỗi: ${o.ten}`);
  }
  if (SEND) save(ledger);
}
main().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
