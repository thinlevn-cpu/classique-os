#!/usr/bin/env node
// lib/duyet.mjs — Agent LIÊN LẠC: soạn THẺ DUYỆT từ quyết định của Tham Mưu (Vòng B).
// Đầu ra là chuỗi text gọn để gửi Zalo/Lark. Việc GỬI do tầng có MCP/lark-cli lo (orchestrator).
// Reply quy ước: "DUYỆT <mã>" | "SỬA <mã> <số>" | "BỎ <mã>".
//
// Dùng:
//   node lib/duyet.mjs --in <vongB.json>     (đọc JSON quyết định → in thẻ)
//   node lib/duyet.mjs demo

import fs from "node:fs";

const VND = n => (n == null || Number.isNaN(n)) ? "—" : Math.round(n).toLocaleString("vi-VN") + "đ";
const N = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d));

// Sinh mã ngắn từ campaign_id (6 số cuối) để anh gõ reply
function maCode(p) {
  const id = String(p.campaign_id || "X");
  return "C" + id.slice(-5);
}

export function formatCard(p) {
  const m = p.metrics || {};
  const ng = p.nguong || {};
  const qd = p.quyet_dinh || {};
  const code = maCode(p);
  const icon = { "TĂNG": "📈", "DUY TRÌ/TĂNG": "📈", "DUY TRÌ": "➡️", "GIỮ — SỬA CHỐT SALE": "🛠️", "GIẢM/TẮT": "📉", "HỌC": "⏳", "TỐI ƯU": "🔧", "THIẾU SỐ": "❓" }[qd.action] || "🔔";

  const L = [];
  L.push(`${icon} ĐỀ XUẤT QUẢNG CÁO — cần anh duyệt`);
  L.push(`Chiến dịch: ${p.ten || p.campaign_id}  [mã: ${code}]`);
  if (p.nganh) L.push(`Ngành: ${p.nganh}`);
  L.push("");
  if (p.note) { L.push(`ℹ️ ${p.note}`); L.push(""); }
  L.push(`📊 Số liệu: chi ${VND(m.spend)} · ${m.results ?? 0} hội thoại · CPMC ${VND(m.cpmc)} · ROAS ${N(m.roas)} · tần suất ${N(m.frequency, 1)}`);
  L.push(`🎯 Ngưỡng lãi: CPMC tối đa ${VND(ng.targetCPMC)} · hòa vốn ROAS ${N(ng.beROAS)}`);
  if (qd.flags && qd.flags.length) qd.flags.forEach(f => L.push(`⚠️ ${f}`));
  L.push("");
  L.push(`🧠 Đề xuất: ${qd.action}`);
  L.push(`   ${qd.reason}`);
  if (qd.suggested_budget != null) L.push(`   Ngân sách đề xuất: ${VND(qd.suggested_budget)}`);
  L.push("");
  L.push(`Trả lời:  DUYỆT ${code}   |   SỬA ${code} <số tiền>   |   BỎ ${code}`);
  return L.join("\n");
}

// Parse reply của anh → hành động máy hiểu
export function parseReply(text) {
  const t = (text || "").trim().toUpperCase();
  let m;
  if ((m = t.match(/^DUY[ỆE]T\s+(C\w+)/))) return { action: "approve", code: m[1] };
  if ((m = t.match(/^S[ỬU]A\s+(C\w+)\s+([\d.]+)/))) return { action: "edit", code: m[1], value: parseInt(m[2].replace(/\./g, ""), 10) };
  if ((m = t.match(/^B[ỎO]\s+(C\w+)/))) return { action: "reject", code: m[1] };
  return { action: "unknown", raw: text };
}

// ---------- CLI ----------
const runCli = process.argv[1] && process.argv[1].endsWith("duyet.mjs");
function arg(k, d) { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; }
if (runCli && process.argv[2] === "demo") {
  const sample = {
    campaign_id: "120250300276770316", ten: "X3 hiệu suất marketing", nganh: "Đào tạo",
    nguong: { beROAS: 1.25, targetCPMC: 100000 },
    metrics: { spend: 1200000, results: 18, cpmc: 67000, roas: 1.4, frequency: 1.8 },
    quyet_dinh: { action: "TĂNG", reason: "ROAS 1.40 ≥ hòa vốn (1.25), CPMC 67k dưới ngưỡng 100k → đang lời, nhân thắng.", suggested_budget: 600000, flags: [] },
  };
  console.log(formatCard(sample));
  console.log("\n--- thử parse reply 'DUYỆT C70316' ---");
  console.log(JSON.stringify(parseReply("DUYỆT C70316")));
} else if (runCli && arg("in")) {
  console.log(formatCard(JSON.parse(fs.readFileSync(arg("in"), "utf8"))));
} else if (runCli) {
  console.log("Dùng: node lib/duyet.mjs --in <vongB.json> | demo");
}
