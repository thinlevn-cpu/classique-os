#!/usr/bin/env node
// lib/meta.mjs — Module gọi Meta Marketing API (tạo chiến dịch TIN NHẮN ở trạng thái PAUSED, kéo Insights).
// Node >= 18 (fetch sẵn). Đọc token từ .secrets/meta-ads.env (tìm ngược lên thư mục cha).
// PAUSED-by-default: KHÔNG bao giờ tự bật chiến dịch tiêu tiền.
//
// CLI:
//   node lib/meta.mjs whoami
//   node lib/meta.mjs create-msg --name "X3" --budget 500000 --page <PAGE_ID_CUA_BAN> --geo VN --age 28-50
//   node lib/meta.mjs insights --campaign <id>

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const sha256 = s => crypto.createHash("sha256").update(String(s).trim().toLowerCase()).digest("hex");

function loadEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const f = path.join(dir, ".secrets", "meta-ads.env");
    if (fs.existsSync(f)) {
      for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
      return;
    }
    const p = path.dirname(dir); if (p === dir) break; dir = p;
  }
}
loadEnv();

const TOKEN = process.env.META_ACCESS_TOKEN;
const ACCT  = process.env.META_AD_ACCOUNT_ID;        // act_xxx
const V     = process.env.META_API_VERSION || "v24.0";
const BASE  = `https://graph.facebook.com/${V}`;
if (!TOKEN || !ACCT) { console.error("LỖI: thiếu META_ACCESS_TOKEN / META_AD_ACCOUNT_ID trong .secrets/meta-ads.env"); process.exit(1); }

export const AD_ACCOUNT = ACCT;
export async function graph(method, node, params = {}) {
  const url = new URL(`${BASE}/${node}`);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  body.set("access_token", TOKEN);
  const opt = { method };
  if (method === "GET") { for (const [k, v] of body) if (k !== "access_token") url.searchParams.set(k, v); url.searchParams.set("access_token", TOKEN); }
  else opt.body = body;
  const res = await fetch(url, opt);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`Meta ${method} ${node}: ${json.error?.message || res.statusText} (code ${json.error?.code||res.status})`);
  return json;
}

// Tạo chiến dịch TIN NHẮN (Click-to-Messenger) ở PAUSED: campaign + ad set.
export async function createMessagingCampaign({ name, budget, pageId, geo = "VN", ageMin = 18, ageMax = 65 }) {
  // 1) Campaign — objective ENGAGEMENT (ODAX v24), PAUSED
  const camp = await graph("POST", `${ACCT}/campaigns`, {
    name: `[TIN NHẮN] ${name}`,
    objective: "OUTCOME_ENGAGEMENT",
    status: "PAUSED",
    special_ad_categories: [],
    is_adset_budget_sharing_enabled: false,   // ngân sách ở cấp ad set, không dùng CBO
  });
  // 2) Ad Set — đích MESSENGER, tối ưu hội thoại, ngân sách ngày, PAUSED
  let adset;
  try {
    adset = await graph("POST", `${ACCT}/adsets`, {
      name: `${name} — Ad set 1`,
      campaign_id: camp.id,
      status: "PAUSED",
      daily_budget: Math.round(budget),           // VND đơn vị thẳng
      billing_event: "IMPRESSIONS",
      optimization_goal: "CONVERSATIONS",
      destination_type: "MESSENGER",
      promoted_object: { page_id: String(pageId) },
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: {
        geo_locations: { countries: [geo] }, age_min: ageMin, age_max: ageMax,
        targeting_automation: { advantage_audience: 0 },   // 0 = dùng đối tượng đã chỉ định; 1 = Advantage+ tự mở rộng
      },
    });
  } catch (e) {
    // Ad set lỗi → xoá campaign vừa tạo để không để mồ côi
    try { await graph("DELETE", camp.id, {}); } catch {}
    throw e;
  }
  return { campaign_id: camp.id, adset_id: adset.id };
}

// ===== CHIẾN DỊCH CHUYỂN ĐỔI (form/leadpage/sale page) — chế độ chuyên sâu có tệp + pixel =====
// objective: OUTCOME_LEADS (điền form/leadpage) | OUTCOME_SALES (sale page, mua)
// event: LEAD (form) | PURCHASE (mua) | COMPLETE_REGISTRATION ...
export async function createConversionCampaign({
  name, objective = "OUTCOME_LEADS", budget, pixelId, event = "LEAD",
  geo = "VN", ageMin = 18, ageMax = 65, interests = [],
  audienceIds = [], excludeIds = [], advantageAudience = 0, budgetMode = "ABO",
}) {
  const campParams = {
    name: `[CHUYỂN ĐỔI] ${name}`, objective, status: "PAUSED", special_ad_categories: [],
    is_adset_budget_sharing_enabled: false,
  };
  if (budgetMode === "CBO") { campParams.daily_budget = Math.round(budget); campParams.is_adset_budget_sharing_enabled = true; }
  const camp = await graph("POST", `${ACCT}/campaigns`, campParams);

  const targeting = {
    geo_locations: { countries: [geo] }, age_min: ageMin, age_max: ageMax,
    targeting_automation: { advantage_audience: advantageAudience },
  };
  if (audienceIds.length) targeting.custom_audiences = audienceIds.map(id => ({ id: String(id) }));
  if (excludeIds.length) targeting.excluded_custom_audiences = excludeIds.map(id => ({ id: String(id) }));
  if (interests.length) targeting.flexible_spec = [{ interests: interests.map(i => ({ id: String(i.id), name: i.name })) }];

  const adsetParams = {
    name: `${name} — Nhóm chuyển đổi`, campaign_id: camp.id, status: "PAUSED",
    billing_event: "IMPRESSIONS", optimization_goal: "OFFSITE_CONVERSIONS",
    promoted_object: { pixel_id: String(pixelId), custom_event_type: event },
    bid_strategy: "LOWEST_COST_WITHOUT_CAP", targeting,
  };
  if (budgetMode === "ABO") adsetParams.daily_budget = Math.round(budget);
  let adset;
  try { adset = await graph("POST", `${ACCT}/adsets`, adsetParams); }
  catch (e) { try { await graph("DELETE", camp.id, {}); } catch {} throw e; }
  return { campaign_id: camp.id, adset_id: adset.id };
}

// Quảng cáo dẫn tới leadpage/sale page (link + nút CTA)
export async function createConversionAd({ adsetId, pageId, link, message, headline = "", description = "", imageHash, cta = "SIGN_UP" }) {
  const creative = await graph("POST", `${ACCT}/adcreatives`, {
    name: `Creative ${headline || link}`,
    object_story_spec: {
      page_id: String(pageId),
      link_data: {
        link, message, name: headline, description, image_hash: imageHash,
        call_to_action: { type: cta, value: { link } },
      },
    },
  });
  const ad = await graph("POST", `${ACCT}/ads`, {
    name: `Ad ${headline || link}`, adset_id: adsetId, status: "PAUSED",
    creative: { creative_id: creative.id },
  });
  return { creative_id: creative.id, ad_id: ad.id };
}

// Tạo tệp Lookalike từ 1 tệp nguồn (origin custom audience)
export async function createLookalike({ name, originId, ratio = 0.01, country = "VN" }) {
  return graph("POST", `${ACCT}/customaudiences`, {
    name, subtype: "LOOKALIKE", origin_audience_id: String(originId),
    lookalike_spec: JSON.stringify({ type: "similarity", ratio, country }),
  });
}

// Tệp khách đã ghé web (từ pixel) trong N ngày
export async function createWebsiteAudience({ name, pixelId, retentionDays = 180 }) {
  return graph("POST", `${ACCT}/customaudiences`, {
    name, subtype: "WEBSITE", retention_days: retentionDays, prefill: true,
    rule: JSON.stringify({ inclusions: { operator: "or", rules: [
      { event_sources: [{ id: String(pixelId), type: "pixel" }], retention_seconds: retentionDays * 86400,
        filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: "PageView" }] } },
    ] } }),
  });
}

// ===== MEDIA DO ANH CHỈ ĐỊNH: video / ảnh / bài FB sẵn =====
// Tải ẢNH lên Meta (từ URL) → image_hash
export async function uploadImage({ url, name = "anh-qc" }) {
  const r = await graph("POST", `${ACCT}/adimages`, { url, name });
  // adimages trả { images: { <name>: { hash, url } } }
  const first = r.images && Object.values(r.images)[0];
  return { image_hash: first?.hash, url: first?.url, raw: r };
}
// Tải VIDEO lên Meta (từ URL công khai) → video_id (xử lý bất đồng bộ)
export async function uploadVideo({ fileUrl, name = "video-qc" }) {
  return graph("POST", `${ACCT}/advideos`, { file_url: fileUrl, name });
}
// ⭐ Tải VIDEO TỪ FILE lên TRANG (graph-video host, dark post) — CHẠY ĐƯỢC với token Trang.
// Dùng cho video anh đính trong Lark → tải về → đẩy lên page → chạy ads.
const VIDEO_BASE = `https://graph-video.facebook.com/${V}`;
export async function uploadVideoToPage({ pageId, filePath, published = false, description = "" }) {
  const buf = fs.readFileSync(filePath);
  const url = `${VIDEO_BASE}/${pageId}/videos`;
  const post = async (form) => {
    const res = await fetch(url, { method: "POST", body: form });
    const j = await res.json().catch(() => ({ error: { message: "phản hồi không hợp lệ" } }));
    if (j.error) throw new Error(`${j.error.message} (code ${j.error.code || ""})`);
    return j;
  };
  // File nhỏ (<5MB) → upload 1 phát; lớn → resumable chunked
  if (buf.length < 5 * 1024 * 1024) {
    const fd = new FormData();
    fd.append("source", new Blob([buf]), "video.mp4");
    fd.append("published", String(published));
    if (description) fd.append("description", description);
    fd.append("access_token", TOKEN);
    return post(fd);
  }
  // --- resumable ---
  let f = new FormData();
  f.append("upload_phase", "start"); f.append("file_size", String(buf.length)); f.append("access_token", TOKEN);
  const s = await post(f);
  const sid = s.upload_session_id, videoId = s.video_id;
  let start = parseInt(s.start_offset, 10), end = parseInt(s.end_offset, 10);
  while (start < end) {
    const t = new FormData();
    t.append("upload_phase", "transfer"); t.append("upload_session_id", sid); t.append("start_offset", String(start));
    t.append("video_file_chunk", new Blob([buf.subarray(start, end)]), "chunk"); t.append("access_token", TOKEN);
    const tr = await post(t);
    start = parseInt(tr.start_offset, 10); end = parseInt(tr.end_offset, 10);
  }
  const fin = new FormData();
  fin.append("upload_phase", "finish"); fin.append("upload_session_id", sid);
  fin.append("published", String(published)); if (description) fin.append("description", description);
  fin.append("access_token", TOKEN);
  const fr = await post(fin);
  return { id: videoId, success: fr.success };
}
export async function getVideoThumb(videoId) {
  const r = await graph("GET", `${videoId}/thumbnails`, {});
  const t = (r.data || []).find(x => x.is_preferred) || (r.data || [])[0];
  return t?.uri || null;
}
export async function getVideoStatus(videoId) {
  return graph("GET", videoId, { fields: "status" });
}
// Quảng cáo VIDEO (video anh chỉ định) → ad PAUSED
export async function createVideoAd({ adsetId, pageId, videoId, thumbnailUrl, message, headline = "", link, cta = "SIGN_UP" }) {
  const video_data = { video_id: String(videoId), message, title: headline };
  if (thumbnailUrl) video_data.image_url = thumbnailUrl;
  if (link) video_data.call_to_action = { type: cta, value: { link } };
  const creative = await graph("POST", `${ACCT}/adcreatives`, {
    name: `Video creative ${headline || videoId}`,
    object_story_spec: { page_id: String(pageId), video_data },
  });
  const ad = await graph("POST", `${ACCT}/ads`, {
    name: `Video ad ${headline || videoId}`, adset_id: adsetId, status: "PAUSED",
    creative: { creative_id: creative.id },
  });
  return { creative_id: creative.id, ad_id: ad.id };
}
// Chạy quảng cáo TỪ BÀI FB ĐÃ ĐĂNG (giữ nguyên like/comment/share)
// objectStoryId dạng "<pageId>_<postId>" (vd <PAGE_ID_CUA_BAN>_123456789)
export async function createAdFromPost({ adsetId, objectStoryId }) {
  const creative = await graph("POST", `${ACCT}/adcreatives`, {
    name: `From post ${objectStoryId}`, object_story_id: String(objectStoryId),
  });
  const ad = await graph("POST", `${ACCT}/ads`, {
    name: `Ad from post ${objectStoryId}`, adset_id: adsetId, status: "PAUSED",
    creative: { creative_id: creative.id },
  });
  return { creative_id: creative.id, ad_id: ad.id };
}
// Tách "<pageId>_<postId>" từ link bài FB (vài dạng phổ biến)
export function postUrlToStoryId(url, pageId) {
  const s = String(url);
  let m;
  if ((m = s.match(/(\d+)_(\d+)/))) return `${m[1]}_${m[2]}`;            // đã đúng dạng
  if ((m = s.match(/\/posts\/(\d+)/)) && pageId) return `${pageId}_${m[1]}`;
  if ((m = s.match(/\/videos\/(\d+)/)) && pageId) return `${pageId}_${m[1]}`;
  if ((m = s.match(/story_fbid=(\d+)/)) && pageId) return `${pageId}_${m[1]}`;
  if ((m = s.match(/fbid=(\d+)/)) && pageId) return `${pageId}_${m[1]}`;
  return null;
}

// ⭐ Gửi sự kiện MUA (Purchase) về Meta qua Conversions API → đóng vòng doanh thu → có ROAS THẬT.
// Gọi khi 1 đơn được chốt (online hoặc offline/CRM). Khớp với lead qua email/sđt (đã hash) hoặc fbc/fbp.
export async function sendPurchase({ pixelId, value, currency = "VND", email, phone, fbc, fbp, eventTime, eventId, testCode, actionSource = "system_generated" }) {
  const user_data = {};
  if (email) user_data.em = [sha256(email)];
  if (phone) user_data.ph = [sha256(String(phone).replace(/\D/g, ""))];
  if (fbc) user_data.fbc = fbc;
  if (fbp) user_data.fbp = fbp;
  const ev = {
    event_name: "Purchase",
    event_time: eventTime || Math.floor(Date.now() / 1000),
    action_source: actionSource,
    user_data,
    custom_data: { value: Number(value), currency },
  };
  if (eventId) ev.event_id = eventId;
  const params = { data: JSON.stringify([ev]) };
  if (testCode) params.test_event_code = testCode;
  return graph("POST", `${pixelId}/events`, params);
}

// Liệt kê tệp sẵn có trong tài khoản
export async function listAudiences() {
  return graph("GET", `${ACCT}/customaudiences`, { fields: "id,name,subtype,approximate_count_lower_bound" });
}

// ----- Hàm THỰC THI (gọi sau khi anh duyệt) -----
export async function setAdSetBudget(adsetId, daily) {
  return graph("POST", adsetId, { daily_budget: Math.round(daily) });
}
export async function setStatus(id, status) {     // status: ACTIVE | PAUSED
  return graph("POST", id, { status });
}

export async function insights(campaignId) {
  const fields = "campaign_name,spend,impressions,cpm,ctr,frequency,actions,cost_per_action_type";
  return graph("GET", `${campaignId}/insights`, { fields, date_preset: "last_7d" });
}

// ---------- CLI ----------
function arg(k, d) { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; }
const cmd = process.argv[2];
const runCli = process.argv[1] && process.argv[1].endsWith("meta.mjs");
if (runCli && cmd === "whoami") {
  graph("GET", ACCT, { fields: "name,account_status,currency,timezone_name" }).then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e.message); process.exit(1); });
} else if (runCli && cmd === "create-msg") {
  const [aMin, aMax] = (arg("age", "18-65")).split("-").map(Number);
  createMessagingCampaign({
    name: arg("name", "Chiến dịch"), budget: Number(arg("budget", "0")),
    pageId: arg("page"), geo: arg("geo", "VN"), ageMin: aMin, ageMax: aMax,
  }).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "upload-video") {
  uploadVideo({ fileUrl: arg("url"), name: arg("name", "video-qc") }).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "upload-video-page") {
  uploadVideoToPage({ pageId: arg("page"), filePath: arg("file"), published: arg("published") === "true", description: arg("desc", "") }).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "video-status") {
  getVideoStatus(arg("id")).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "upload-image") {
  uploadImage({ url: arg("url"), name: arg("name", "anh-qc") }).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "create-video-ad") {
  createVideoAd({ adsetId: arg("adset"), pageId: arg("page"), videoId: arg("video"), thumbnailUrl: arg("thumb"), message: arg("message", ""), headline: arg("headline", ""), link: arg("link"), cta: arg("cta", "SIGN_UP") }).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "ad-from-post") {
  const story = arg("story") || postUrlToStoryId(arg("url"), arg("page"));
  if (!story) { console.error("LỖI: cần --story <page_post> hoặc --url <link> --page <pageId>"); process.exit(1); }
  createAdFromPost({ adsetId: arg("adset"), objectStoryId: story }).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "send-purchase") {
  sendPurchase({ pixelId: arg("pixel"), value: Number(arg("value", "0")), currency: arg("currency", "VND"), email: arg("email"), phone: arg("phone"), testCode: arg("test") })
    .then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "list-audiences") {
  listAudiences().then(r => console.log(JSON.stringify(r.data || r, null, 2))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "create-conv") {
  const [aMin, aMax] = (arg("age", "18-65")).split("-").map(Number);
  createConversionCampaign({
    name: arg("name", "Chuyển đổi"), objective: arg("objective", "OUTCOME_LEADS"),
    budget: Number(arg("budget", "0")), pixelId: arg("pixel"), event: arg("event", "LEAD"),
    geo: arg("geo", "VN"), ageMin: aMin, ageMax: aMax, budgetMode: arg("mode", "ABO"),
    audienceIds: (arg("audiences", "") || "").split(",").filter(Boolean),
    excludeIds: (arg("exclude", "") || "").split(",").filter(Boolean),
  }).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "create-lookalike") {
  createLookalike({ name: arg("name"), originId: arg("origin"), ratio: Number(arg("ratio", "0.01")), country: arg("country", "VN") })
    .then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "set-budget") {
  setAdSetBudget(arg("adset"), Number(arg("budget", "0"))).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "set-status") {
  setStatus(arg("id"), arg("status", "PAUSED")).then(r => console.log(JSON.stringify(r))).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
} else if (runCli && cmd === "insights") {
  insights(arg("campaign")).then(r => console.log(JSON.stringify(r.data || r, null, 2))).catch(e => { console.error(e.message); process.exit(1); });
} else if (runCli) {
  console.log("Dùng: whoami | create-msg --name --budget --page --geo --age | insights --campaign <id>");
}
