#!/usr/bin/env node
// agent-3x.mjs — Nhịp chạy 3 lần/ngày của Ads Agent.
// Đọc NGƯỠNG (Bảng 0) + SỐ THẬT (Meta insights / simulate) → decide() → xuất:
//   - dòng ghi BẢNG 5 (Số liệu hằng ngày)
//   - thẻ thông báo gửi TÔM/anh trên Lark để ra quyết định
// In ra stdout 1 dòng: RESULT::<json> để bash wrapper (lark-cli) ghi Base + gửi Lark.
//
//   node agent-3x.mjs --targets b0.json [--simulate | --metrics m.json | --live --campaign <id>]

import fs from "node:fs";
import { decide, parseTargets } from "./vong-doi-chieu.mjs";

function arg(k, d){ const i=process.argv.indexOf(`--${k}`); return i>=0?process.argv[i+1]:d; }
const has = k => process.argv.includes(`--${k}`);
const fmt = n => isFinite(n)? Math.round(n).toLocaleString("vi-VN")+"đ" : "∞";
function nowVN(){ const d=new Date(Date.now()+7*3600*1000); return d.toISOString().slice(0,16).replace("T"," "); }

// ---- Adapter SỐ THẬT từ Meta (lifetime) ----
// Đếm "lead" theo ưu tiên: pixel lead > lead form > complete_registration; nếu không có → proxy landing_page_view.
const LEAD_PRIORITY = [/fb_pixel_lead/i, /onsite_conversion\.lead_grouped/i, /^lead$/i, /complete_registration/i, /registration/i];
function extractLeads(actions){
  for (const re of LEAD_PRIORITY){
    const a = (actions||[]).find(x=>re.test(x.action_type));
    if (a) return { leads:Number(a.value), proxy:false, via:a.action_type };
  }
  const lpv = (actions||[]).find(x=>/^landing_page_view$/i.test(x.action_type) || /^link_click$/i.test(x.action_type));
  return lpv ? { leads:Number(lpv.value), proxy:true, via:lpv.action_type } : { leads:0, proxy:false, via:null };
}
const PURCHASE_RE = /fb_pixel_purchase|^purchase$|^omni_purchase$/i;
function sumByType(arr, re){ let s=0,found=false; for(const a of (arr||[])) if(re.test(a.action_type)){ s+=Number(a.value)||0; found=true; } return found?s:0; }
async function liveMetrics(campaignId, startDate){
  const { graph } = await import("./lib/meta.mjs");
  const fields = "spend,impressions,cpm,ctr,frequency,actions,action_values,cost_per_action_type,date_start,date_stop";
  const r = await graph("GET", `${campaignId}/insights`, { fields, date_preset:"maximum" });
  const row = (r.data && r.data[0]) || {};
  const { leads, proxy, via } = extractLeads(row.actions);
  const spend = Number(row.spend||0);
  // Purchase (đơn cuối phễu) + doanh thu thật
  const purchases = sumByType(row.actions, PURCHASE_RE);
  const revenue   = sumByType(row.action_values, PURCHASE_RE);
  let days = 0;
  const ds = row.date_start || startDate;
  if (ds){ const s=new Date(ds); if(!isNaN(s)) days=Math.max(1, Math.floor((Date.now()-s.getTime())/86400000)); }
  return { daysRunning:days||1, spendTotal:spend, leads, leadProxy:proxy, leadVia:via,
    cpl: leads? Math.round(spend/leads):Infinity,
    purchases, revenue, roas: (revenue&&spend)? revenue/spend : 0,
    cpa: purchases? Math.round(spend/purchases):0,
    cpm: Number(row.cpm||0), ctr: Number(row.ctr||0), frequency: Number(row.frequency||0) };
}

// ---- Chế độ QUÉT: đọc Bảng 1 (Chiến dịch) → các campaign ĐANG CHẠY có campaign_id ----
async function scanMode(bang1Path){
  const { parseTargetsFromMap } = await import("./vong-doi-chieu.mjs");
  const j = JSON.parse(fs.readFileSync(bang1Path,"utf8")).data;
  const fields=j.fields, rows=j.data, ids=j.record_id_list;
  const gOf = (m,sub)=>{ for(const n in m){ if(n.toLowerCase().includes(sub)){ let v=m[n]; if(Array.isArray(v)&&v.length){v=v[0]; v=(v&&typeof v==='object')?(v.text||v.name):v;} return v; } } return null; };
  const results=[];
  for (let k=0;k<rows.length;k++){
    const m={}; fields.forEach((n,i)=>m[n]=rows[k][i]);
    const status=String(gOf(m,'trạng thái')||''); const cid=gOf(m,'campaign_id');
    if(!/chạy/i.test(status) || !cid) continue;             // chỉ campaign đang chạy + có id
    const t = parseTargetsFromMap(m); t.recordId = ids[k];
    let metrics, err=null;
    try { metrics = await liveMetrics(cid, t.startDate); }
    catch(e){ err=e.message; metrics=null; }
    results.push({ cid, recordId:ids[k], targets:t, metrics, err });
  }
  return results;
}

const SIM = { daysRunning:6, spendTotal:500000, leads:30, spendToday:100000, cpm:85000, ctr:0.019, frequency:1.6 };

// Dựng dòng Bảng 5 + thẻ từ (targets, metrics, decision)
function buildOutput(t, m, r){
  const cpl = r.cpl;
  const proxyNote = m.leadProxy ? ` [⚠️ proxy ${m.leadVia} — chưa gắn sự kiện Lead pixel, CPL chỉ ước lượng]` : "";
  const hasRev = m.purchases>0;
  const bang5 = {
    "Ngày": nowVN(),
    "CPL": isFinite(cpl)? Math.round(cpl): 0,
    "CPA": m.cpa||0,
    "ROAS": hasRev? Number(r.roas.toFixed(2)): 0,
    "CPM": Math.round(m.cpm||0),
    "CTR": m.ctr||0,
    "Frequency": m.frequency||0,
    "Quyết định": `${r.sev}: ${r.action}`,
    "Đề xuất": r.recommend,
    "Lý do": `${r.reason} | thực: ${m.leads} ${m.leadProxy?'(proxy)':'lead'}${hasRev?`, ${m.purchases} đơn DT ${fmt(m.revenue)} ROAS ${r.roas.toFixed(2)}`:', chưa đơn'}, tiêu ${fmt(m.spendTotal)}, ${m.daysRunning} ngày${proxyNote}`,
    "Ad set": t.ten,
  };
  const card = [
    `📊 [ADS AGENT — ${nowVN()}] ${t.ten}`,
    `Thực tế: ${m.leads} ${m.leadProxy?'(proxy '+m.leadVia+')':'lead'} · tiêu ${fmt(m.spendTotal)} · CPL ${fmt(cpl)}${hasRev?` · ${m.purchases} đơn DT ${fmt(m.revenue)} · ROAS ${r.roas.toFixed(2)}`:` · chưa đơn`} · freq ${m.frequency?.toFixed?.(1)??m.frequency}`,
    `Ngưỡng: CPL mt ${fmt(t.cplTarget)} | CPL hòa vốn ${fmt(t.cplBreakeven)} | ROAS mt ${t.roasTarget} | BE ROAS ${t.beROAS} | trần ${fmt(t.totalCap)}`,
    ``,
    `➜ ${r.sev}: ${r.action}`,
    `Vì: ${r.reason}`,
    `Đề xuất: ${r.recommend}${proxyNote}`,
    ``,
    r.auto ? `⚙️ Đủ điều kiện TỰ ĐỘNG (chế độ "${t.autonomy}").`
           : `👉 Cần anh quyết: trả lời DUYỆT / SỬA <số> / BỎ.`,
  ].join("\n");
  return { needApprove: !r.auto, severity: r.sev, recordId: t.recordId||null, bang5, card };
}

// ===== CHẾ ĐỘ QUÉT (production): đọc Bảng 1 → mọi campaign đang chạy =====
if (has("scan")) {
  const results = await scanMode(arg("scan"));
  const out = [];
  for (const it of results) {
    if (it.err || !it.metrics) {
      out.push({ needApprove:false, severity:"⚠️ LỖI", recordId:it.recordId,
        bang5:{ "Ngày":nowVN(), "Ad set":it.targets.ten, "Lý do":"Không kéo được Insights: "+(it.err||"no data") },
        card:`⚠️ [ADS AGENT] ${it.targets.ten}: không kéo được số liệu (${it.err||'no data'}).` });
      continue;
    }
    out.push(buildOutput(it.targets, it.metrics, decide(it.targets, it.metrics)));
  }
  console.log("RESULT::" + JSON.stringify(out));
  process.exit(0);
}

const targets = parseTargets(JSON.parse(fs.readFileSync(arg("targets"),"utf8")));

let metrics, src;
if (has("live"))      { metrics = await liveMetrics(arg("campaign"), targets.startDate); src="Meta (live)"; }
else if (has("metrics")) { metrics = JSON.parse(fs.readFileSync(arg("metrics"),"utf8")); src="file"; }
else                  { metrics = SIM; src="simulate"; }

const r = decide(targets, metrics);
console.log("RESULT::" + JSON.stringify([ buildOutput(targets, metrics, r) ]));
