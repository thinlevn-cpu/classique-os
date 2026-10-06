#!/usr/bin/env node
// vong-b-quyet-dinh.mjs — Agent TRINH SÁT + THAM MƯU.
// Kéo Insights 1 chiến dịch từ Meta → chuẩn hóa metrics → engine.decide() theo ngưỡng lãi → in JSON.
// (Phần ghi Bảng 3 + cổng duyệt do bash wrapper / Agent Liên Lạc lo — giữ node sạch, chỉ lo Meta + quyết định.)
//
// Dùng:
//   node vong-b-quyet-dinh.mjs --campaign <campaign_id> --brief <brief.json> [--days N]

import fs from "node:fs";
import { decide, computeThresholds } from "./engine.mjs";
import { insights } from "./lib/meta.mjs";

function arg(k, d) { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; }

// Trích metrics từ 1 record insights của Meta → khung engine hiểu
export function parseMetrics(row, days) {
  if (!row) return { results: 0, days, cpm: null, ctr: null, frequency: null, cpmc: null, roas: null };
  const num = v => (v == null ? null : parseFloat(v));
  const findAction = (arr, key) => {
    if (!Array.isArray(arr)) return null;
    const hit = arr.find(a => (a.action_type || "").includes(key));
    return hit ? parseFloat(hit.value) : null;
  };
  const spend = num(row.spend) || 0;
  // Hội thoại tin nhắn bắt đầu
  const conversations = findAction(row.actions, "messaging_conversation_started") ?? findAction(row.actions, "onsite_conversion.messaging_first_reply") ?? 0;
  const cpmcFromCost = findAction(row.cost_per_action_type, "messaging_conversation_started");
  const purchases = findAction(row.actions, "purchase");
  const purchaseValue = findAction(row.action_values, "purchase");
  return {
    results: conversations || 0,
    days,
    cpm: num(row.cpm),
    ctr: row.ctr != null ? parseFloat(row.ctr) / 100 : null,   // Meta ctr là %
    frequency: num(row.frequency),
    cpmc: cpmcFromCost != null ? cpmcFromCost : (conversations ? spend / conversations : null),
    cpl: null,
    cpa: purchases ? spend / purchases : null,
    roas: (purchaseValue && spend) ? purchaseValue / spend : null,
    spend,
  };
}

async function main() {
  const campaignId = arg("campaign");
  const briefPath = arg("brief");
  const days = parseInt(arg("days", "0"), 10);
  if (!campaignId || !briefPath) { console.error("Cần --campaign <id> --brief <brief.json>"); process.exit(1); }

  const brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
  const t = computeThresholds(brief);

  let row = null, note = "";
  try {
    const res = await insights(campaignId);
    row = (res.data && res.data[0]) || null;
    if (!row) note = "Chiến dịch chưa có dữ liệu (chưa chạy / chưa đủ hiển thị).";
  } catch (e) { note = "Không kéo được Insights: " + e.message; }

  const metrics = parseMetrics(row, days);
  const result = decide(brief, metrics);

  console.log(JSON.stringify({
    campaign_id: campaignId,
    note,
    nguong: { beROAS: t.beROAS, targetCPMC: t.targetCPMC, targetCPL: t.targetCPL, targetCPA: t.targetCPA },
    metrics,
    quyet_dinh: { action: result.action, reason: result.reason, suggested_budget: result.suggested_budget, flags: result.flags },
  }, null, 2));
}
if (process.argv[1] && process.argv[1].endsWith("vong-b-quyet-dinh.mjs")) {
  main().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
}
