#!/usr/bin/env node
// tong-chi-huy.mjs — Agent TỔNG CHỈ HUY (orchestrator).
// Khép vòng: ĐỌC (Trinh Sát) → NGHĨ (Tham Mưu) → HỎI (thẻ Liên Lạc) → NGHE duyệt → LÀM (thực thi) → GHI SỔ.
// Node lo LOGIC + thực thi Meta + sổ cái cục bộ (ledger). Lark gửi/nghe & Base ghi do bash wrapper (lark-cli) lo.
//
// 2 chế độ:
//   scan  --campaign <id> --adset <id> --brief <f> [--simulate]   → ra quyết định + THẺ + ghi ledger (in thẻ ra stdout để bash gửi Lark)
//   apply --reply "<text Lark>" [--actually]                       → đọc reply → tra ledger → THỰC THI Meta → in xác nhận + dòng BANG5

import fs from "node:fs";
import path from "node:path";
import { decide, computeThresholds } from "./engine.mjs";
import { insights, setAdSetBudget, setStatus } from "./lib/meta.mjs";
import { parseMetrics } from "./vong-b-quyet-dinh.mjs";
import { formatCard, parseReply } from "./lib/duyet.mjs";

const HERE = decodeURIComponent(new URL(".", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const LEDGER = path.join(HERE, "pending-decisions.json");
function loadLedger() { try { return JSON.parse(fs.readFileSync(LEDGER, "utf8")); } catch { return {}; } }
function saveLedger(l) { fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2), "utf8"); }
function arg(k, d) { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; }
const has = k => process.argv.includes(`--${k}`);
const code = id => "C" + String(id).slice(-5);

async function scan() {
  const campaignId = arg("campaign"), adsetId = arg("adset"), briefPath = arg("brief");
  const brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
  const t = computeThresholds(brief);

  let metrics, note = "";
  if (has("simulate")) {                       // dữ liệu giả để demo khép vòng
    metrics = { spend: 1200000, results: 80, days: 5, cpm: 90000, ctr: 0.022, frequency: 1.8, cpmc: 67000, roas: 2.0, cpl: null, cpa: null };
  } else {
    let row = null;
    try { const r = await insights(campaignId); row = (r.data && r.data[0]) || null; if (!row) note = "Chưa có dữ liệu."; }
    catch (e) { note = "Không kéo Insights: " + e.message; }
    metrics = parseMetrics(row, parseInt(arg("days", "0"), 10));
  }

  const d = decide(brief, metrics);
  const payload = {
    campaign_id: campaignId, ten: brief.ten, nganh: brief.nganh, note,
    nguong: { beROAS: t.beROAS, targetCPMC: t.targetCPMC, targetCPL: t.targetCPL, targetCPA: t.targetCPA },
    metrics, quyet_dinh: { action: d.action, reason: d.reason, suggested_budget: d.suggested_budget, flags: d.flags },
  };

  // Chỉ cần anh duyệt khi có hành động đổi tiền/bật-tắt
  const needApprove = ["TĂNG", "DUY TRÌ/TĂNG", "GIẢM/TẮT"].includes(d.action);
  if (needApprove) {
    const led = loadLedger();
    led[code(campaignId)] = { campaign_id: campaignId, adset_id: adsetId, action: d.action, suggested_budget: d.suggested_budget, status: "pending", ten: brief.ten, ts: Date.now() };
    saveLedger(led);
  }
  // In THẺ ra stdout (bash sẽ gửi vào Lark). Nếu không cần duyệt, in NOOP.
  if (needApprove) console.log(formatCard(payload));
  else console.log(`NOOP :: ${d.action} :: ${d.reason}`);
}

async function apply() {
  const r = parseReply(arg("reply"));
  const led = loadLedger();
  if (r.action === "unknown") { console.log("BỎ QUA :: không hiểu lệnh"); return; }
  const item = led[r.code];
  if (!item) { console.log(`BỎ QUA :: không thấy mã ${r.code} đang chờ`); return; }
  if (item.status !== "pending") { console.log(`BỎ QUA :: ${r.code} đã xử lý (${item.status})`); return; }

  let done = "", bang5 = null;
  const doExec = has("actually");
  if (r.action === "reject") {
    item.status = "rejected"; done = `Đã BỎ đề xuất ${r.code} (${item.ten}).`;
  } else {
    // approve: dùng suggested_budget; edit: dùng số anh gõ
    const newBudget = r.action === "edit" ? r.value : item.suggested_budget;
    if (item.action === "GIẢM/TẮT" && r.action === "approve") {
      if (doExec) await setAdSetBudget(item.adset_id, item.suggested_budget); // giảm 50%
      done = `Đã GIẢM ngân sách ${item.ten} về ${item.suggested_budget?.toLocaleString("vi-VN")}đ.`;
    } else {
      if (doExec && newBudget) await setAdSetBudget(item.adset_id, newBudget);
      done = `Đã đặt ngân sách ${item.ten} = ${newBudget?.toLocaleString("vi-VN")}đ.`;
    }
    item.status = doExec ? "done" : "approved(dry)";
    bang5 = { ten: item.ten, hanh_dong: item.action, nguoi_duyet: "Lark", ket_qua: done, ma: r.code };
  }
  saveLedger(led);
  console.log("XÁC NHẬN :: " + done);
  if (bang5) console.log("BANG5 :: " + JSON.stringify(bang5));
}

const mode = process.argv[2];
if (mode === "scan") scan().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
else if (mode === "apply") apply().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
else console.log("Dùng: tong-chi-huy.mjs scan --campaign --adset --brief [--simulate] | apply --reply \"...\" [--actually]");
