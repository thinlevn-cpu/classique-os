#!/usr/bin/env node
// dung-tu-base.mjs — ĐỘI QUÂN tự dựng chiến dịch TỪ BASE (data-driven, hết hardcode).
// Đọc dòng "Chờ dựng" ở Bảng Chiến dịch + Thư viện URL → tự lấy URL/pixel/sự kiện/giá trị,
// dựng campaign + 2 nhóm tệp + video ads trên Meta (PAUSED), in campaign_id để bash ghi ngược Base.
//
// node dung-tu-base.mjs --campaigns <bang1.json> --urllib <thuvien.json> [--build]
//   DRY mặc định (xem kế hoạch). --build mới tạo thật.

import fs from "node:fs";
import { graph, AD_ACCOUNT, getVideoThumb } from "./lib/meta.mjs";

const arg = k => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : null; };
const BUILD = process.argv.includes("--build");

// ----- Mặc định (v1) -----
const PAGE = "<PAGE_ID_CUA_BAN>";
const DEFAULT_VIDEO = "1159368547263433";           // video X3 đã upload (sau sẽ đọc từ Nội dung)
const AUD = { lookalike: "<AUDIENCE_LOOKALIKE>", tuongtac: "<AUDIENCE_TUONGTAC>" };
const CAPS = [
  { goc: "Nỗi đau",  text: "Anh chị kinh doanh online mà mỗi tháng đổ tiền quảng cáo nhưng đơn vẫn nhỏ giọt? Vấn đề thường do chưa có một hệ thống đúng. Để lại thông tin nhận tư vấn lộ trình X3 hiệu suất." },
  { goc: "Kết quả",  text: "Hình dung mỗi đồng quảng cáo mang về gấp ba kết quả, nhờ quy trình rõ ràng từ thu hút đến chốt đơn. Đăng ký nhận lộ trình phù hợp với mô hình của anh chị." },
  { goc: "Phản bác", text: "Không cần giỏi công nghệ hay ngân sách lớn. Chỉ cần một cách làm đúng, đi từng bước. Để lại thông tin, bắt đầu từ bước đầu tiên." },
];

function cell(m, k) { let v = m[k]; if (Array.isArray(v) && v.length) { v = v[0]; if (v && typeof v === "object") v = v.text || v.name || v.value || v.number || v.link || Object.values(v)[0]; } return v; }
function pick(m, ...subs) { const ks = Object.keys(m), n = s => String(s).normalize("NFC").toLowerCase(); for (const s of subs) { const k = ks.find(x => n(x) === n(s)) || ks.find(x => n(x).includes(n(s))); if (k) return cell(m, k); } }
const rows = j => { const f = j.data.fields, rs = j.data.data, id = j.data.record_id_list || []; return rs.map((r, i) => ({ _id: id[i], m: Object.fromEntries(f.map((k, x) => [k, r[x]])) })); };
const norm = s => String(s || "").normalize("NFC").toLowerCase().replace(/[^a-z0-9]+/g, "");

function objectiveOf(muctieu) {
  const s = String(muctieu || "").toLowerCase();
  if (s.includes("sale") || s.includes("mua")) return { obj: "OUTCOME_SALES", event: "PURCHASE" };
  if (s.includes("tin nhắn") || s.includes("messenger")) return { obj: "OUTCOME_ENGAGEMENT", event: null };
  return { obj: "OUTCOME_LEADS", event: "LEAD" };   // mặc định Lead
}

// Lấy content (caption + video) anh đính trong Bảng Nội dung, gắn với chiến dịch này
function contentFor(recId, contentRows) {
  const matched = contentRows.filter(c => {
    const raw = JSON.stringify(Object.entries(c.m).filter(([k]) => k.normalize("NFC").toLowerCase().includes("chiến dịch")).map(([, v]) => v));
    return raw.includes(recId);
  });
  const ads = [];
  for (const c of matched) {
    const cap = pick(c.m, "Caption");
    const mid = String(pick(c.m, "Media ID (Meta)") || "");
    const vid = mid.startsWith("video:") ? mid.slice(6) : (mid.match(/^\d+$/) ? mid : null);
    if (cap) ads.push({ goc: pick(c.m, "Góc hook") || "Ad", text: cap, video: vid });
  }
  return ads;   // rỗng nếu anh chưa đính content
}

async function buildOne(row, libRows, contentRows) {
  const m = row.m;
  const ten = pick(m, "Tên chiến dịch") || "Chiến dịch";
  const tenChuan = pick(m, "Tên chuẩn Ads") || ten;
  const { obj, event } = objectiveOf(pick(m, "Mục tiêu"));
  const budget = Number(pick(m, "Ngân sách ngày") || 0);
  const cbo = String(pick(m, "Chế độ ngân sách") || "").toLowerCase().includes("cbo");
  // Khớp Thư viện URL theo tên offer
  const lib = libRows.find(l => { const key = norm(pick(l.m, "Tên / Từ khóa")); return key && (norm(ten).includes(key) || key.includes(norm(ten))); });
  const url = (lib && pick(lib.m, "URL")) || pick(m, "URL đích", "URL");
  const pixel = pick(m, "pixel_id") || (lib && pick(lib.m, "Pixel gợi ý"));
  const ev = pick(m, "Sự kiện") && String(pick(m, "Sự kiện")).includes("PURCHASE") ? "PURCHASE" : (event || "LEAD");

  // Content: ưu tiên bài anh đính ở Bảng Nội dung; rỗng → mặc định
  const fromBase = contentFor(row._id, contentRows);
  const ADS = fromBase.length ? fromBase : CAPS.map(c => ({ ...c, video: null }));
  const plan = { record: row._id, ten: tenChuan, objective: obj, budget, cbo, url, pixel, event: ev,
    tep: ["Lookalike DREAM100 1%", "Tương tác page"],
    content: fromBase.length ? `${fromBase.length} bài từ Bảng Nội dung (video anh đính)` : "mặc định (anh chưa đính content)",
    so_bai: ADS.length };
  if (!BUILD) return { plan, built: null };
  if (!url || !pixel) throw new Error(`Thiếu URL/pixel cho "${ten}" (kiểm tra Thư viện URL)`);

  // 1) Campaign
  const campParams = { name: tenChuan, objective: obj, status: "PAUSED", special_ad_categories: [] };
  if (cbo) { campParams.daily_budget = budget; campParams.bid_strategy = "LOWEST_COST_WITHOUT_CAP"; }
  const camp = await graph("POST", `${AD_ACCOUNT}/campaigns`, campParams);
  try {
    const thumbCache = {};
    const thumbOf = async v => (thumbCache[v] ??= await getVideoThumb(v));
    const mkAdset = (name, audId) => graph("POST", `${AD_ACCOUNT}/adsets`, {
      name, campaign_id: camp.id, status: "PAUSED", billing_event: "IMPRESSIONS",
      optimization_goal: obj === "OUTCOME_ENGAGEMENT" ? "CONVERSATIONS" : "OFFSITE_CONVERSIONS",
      promoted_object: obj === "OUTCOME_ENGAGEMENT" ? { page_id: PAGE } : { pixel_id: String(pixel), custom_event_type: ev },
      ...(cbo ? {} : { daily_budget: budget }),
      targeting: { geo_locations: { countries: ["VN"] }, age_min: 22, age_max: 55, custom_audiences: [{ id: audId }], targeting_automation: { advantage_audience: 0 } },
    });
    const mkAd = async (adsetId, ad) => {
      const vid = ad.video || DEFAULT_VIDEO;
      const cr = await graph("POST", `${AD_ACCOUNT}/adcreatives`, {
        name: `Creative ${ad.goc}`, object_story_spec: { page_id: PAGE, video_data: { video_id: vid, message: ad.text, title: ten, image_url: await thumbOf(vid), call_to_action: { type: "SIGN_UP", value: { link: url } } } },
      });
      return graph("POST", `${AD_ACCOUNT}/ads`, { name: `Ad ${ad.goc}`, adset_id: adsetId, status: "PAUSED", creative: { creative_id: cr.id } });
    };
    const asL = await mkAdset(`${ten} — Lookalike`, AUD.lookalike);
    const asT = await mkAdset(`${ten} — Tương tác`, AUD.tuongtac);
    for (const as of [asL, asT]) for (const ad of ADS) await mkAd(as.id, ad);
    return { plan, built: { campaign_id: camp.id, adsets: [asL.id, asT.id] } };
  } catch (e) { try { await graph("DELETE", camp.id, {}); } catch {} throw e; }
}

async function main() {
  const camps = rows(JSON.parse(fs.readFileSync(arg("campaigns"), "utf8")));
  const lib = rows(JSON.parse(fs.readFileSync(arg("urllib"), "utf8")));
  const content = arg("content") ? rows(JSON.parse(fs.readFileSync(arg("content"), "utf8"))) : [];
  // CHỈ lên Meta khi anh ĐÃ DUYỆT BASE (Bước 3). "Chờ dựng" là việc của soan-base (Bước 2).
  const todo = camps.filter(r => String(pick(r.m, "Trạng thái") || "").includes("Duyệt Base"));
  console.log(`Có ${todo.length} chiến dịch "Chờ dựng".${BUILD ? " — DỰNG THẬT" : " — XEM KẾ HOẠCH (chưa dựng)"}`);
  const out = [];
  for (const r of todo) {
    try { const res = await buildOne(r, lib, content); console.log("\n" + JSON.stringify(res.built ? { ...res.plan, ...res.built } : res.plan, null, 2)); if (res.built) out.push({ record: r._id, campaign_id: res.built.campaign_id, ten: res.plan.ten }); }
    catch (e) { console.log(`  ✗ ${pick(r.m, "Tên chiến dịch")}: ${e.message}`); }
  }
  if (out.length) { fs.writeFileSync(new URL("./_writeback.json", import.meta.url), JSON.stringify(out), "utf8"); console.log(`\n→ Ghi _writeback.json (${out.length} dòng) cho bash cập nhật Base.`); }
}
main().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
