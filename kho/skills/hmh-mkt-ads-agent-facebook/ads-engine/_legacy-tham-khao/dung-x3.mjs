#!/usr/bin/env node
// dung-x3.mjs — Dựng TRỌN chiến dịch CHUYỂN ĐỔI X3 KHÓA HỌC ONLINE từ video Lark (PAUSED).
// Campaign OUTCOME_LEADS (CBO 200k) → 2 ad set (Lookalike + Tương tác, tệp + loại trừ + pixel LEAD)
//   → mỗi nhóm 1 video ad (video_id đã upload, dẫn tới leadpage). Tự xoá campaign nếu lỗi giữa chừng.

import { graph, AD_ACCOUNT, getVideoThumb } from "./lib/meta.mjs";

const PAGE = "<PAGE_ID_CUA_BAN>";
const PIXEL = "1685232532882048";
const VIDEO = "1159368547263433";
const LEAD_URL = "https://x3online.hoangminhhoa.com/?utm_source=tomaisetup&utm_content=x3online";
const BUDGET = 200000;
const AUD = {
  lookalike: "<AUDIENCE_LOOKALIKE>",   // Lookalike DREAM100 1%
  tuongtac:  "<AUDIENCE_TUONGTAC>",   // Tương tác page MAD
  excl:      "120246645570140316",   // DATA KHÁCH HÀNG MAD (loại trừ)
};
// 3 bài (mỗi caption = 1 quảng cáo) — khớp 3 dòng Bảng Nội dung
const CAPS = [
  { goc: "Nỗi đau",  text: "Anh chị kinh doanh online mà mỗi tháng đổ tiền quảng cáo nhưng đơn vẫn nhỏ giọt? Vấn đề thường không phải do chưa cố gắng, mà do chưa có một hệ thống đúng. Để lại thông tin nhận buổi tư vấn lộ trình X3 hiệu suất cho ngành của anh chị." },
  { goc: "Kết quả",  text: "Hình dung mỗi đồng quảng cáo mang về gấp ba kết quả so với bây giờ, nhờ một quy trình rõ ràng từ thu hút đến chốt đơn. Đăng ký nhận lộ trình X3 phù hợp với mô hình của anh chị." },
  { goc: "Phản bác", text: "Nhiều người nghĩ phải giỏi công nghệ hay ngân sách lớn mới làm marketing hiệu quả. Thật ra không cần. Chỉ cần một cách làm đúng, đi từng bước. Để lại thông tin, bắt đầu từ bước đầu tiên." },
];

async function makeAdSet(campId, name, useAud) {
  const targeting = {
    geo_locations: { countries: ["VN"] }, age_min: 22, age_max: 55,
    targeting_automation: { advantage_audience: 0 },
  };
  if (useAud) {                       // chỉ gắn tệp khi đã chấp nhận ToS
    targeting.custom_audiences = [{ id: useAud }];
    // Lưu ý: loại trừ danh sách khách (DATA KHÁCH HÀNG MAD) cần ToS danh sách khách riêng → tạm bỏ
  }
  return graph("POST", `${AD_ACCOUNT}/adsets`, {
    name, campaign_id: campId, status: "PAUSED",
    billing_event: "IMPRESSIONS", optimization_goal: "OFFSITE_CONVERSIONS",
    promoted_object: { pixel_id: PIXEL, custom_event_type: "LEAD" },
    targeting,
  });
}
const USE_TEP = process.argv.includes("--tep");   // bật khi đã chấp nhận ToS
async function makeVideoAd(adsetId, name, message, thumb) {
  const creative = await graph("POST", `${AD_ACCOUNT}/adcreatives`, {
    name: `Creative ${name}`,
    object_story_spec: {
      page_id: PAGE,
      video_data: {
        video_id: VIDEO, message, title: "X3 Hiệu Suất Marketing",
        image_url: thumb,
        call_to_action: { type: "SIGN_UP", value: { link: LEAD_URL } },
      },
    },
  });
  const ad = await graph("POST", `${AD_ACCOUNT}/ads`, {
    name: `Ad ${name}`, adset_id: adsetId, status: "PAUSED", creative: { creative_id: creative.id },
  });
  return { creative_id: creative.id, ad_id: ad.id };
}

// Tạo NHIỀU ad (mỗi caption 1 ad) trong 1 ad set
async function makeAllAds(adsetId, thumb, only) {
  const list = only ? CAPS.filter(c => only.includes(c.goc)) : CAPS;
  const out = [];
  for (const c of list) out.push({ goc: c.goc, ...(await makeVideoAd(adsetId, c.goc, c.text, thumb)) });
  return out;
}

// Lệnh phụ: bổ sung ad vào ad set có sẵn (--adset <id> [--only "Nỗi đau,Phản bác"])
async function addAds() {
  const arg = k => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : null; };
  const adsetId = arg("adset");
  const only = arg("only") ? arg("only").split(",").map(s => s.trim()) : null;
  const thumb = await getVideoThumb(VIDEO);
  const ads = await makeAllAds(adsetId, thumb, only);
  console.log(JSON.stringify({ adset: adsetId, them: ads }, null, 2));
}

async function main() {
  const thumb = await getVideoThumb(VIDEO);
  console.error("thumbnail:", thumb ? "có" : "không");
  // 1) Campaign CBO PAUSED
  // TÊN CHUẨN: NGÀY(DDMMYYYY) | NUÔI DƯỠNG|SĂN BẮN | NỘI DUNG  (agent đọc ô "Tên chuẩn Ads" trong Base)
  const TEN_CHUAN = "20062026 | SĂN BẮN | X3 HIỆU SUẤT MARKETING ONLINE";
  const camp = await graph("POST", `${AD_ACCOUNT}/campaigns`, {
    name: TEN_CHUAN, objective: "OUTCOME_LEADS", status: "PAUSED",
    special_ad_categories: [], daily_budget: BUDGET, bid_strategy: "LOWEST_COST_WITHOUT_CAP",
  });
  try {
    if (USE_TEP) {
      const asLook = await makeAdSet(camp.id, "X3 — Nhóm Lookalike DREAM100 1%", AUD.lookalike);
      const asTuon = await makeAdSet(camp.id, "X3 — Nhóm Tương tác page", AUD.tuongtac);
      const adsLook = await makeAllAds(asLook.id, thumb);   // 3 bài/nhóm
      const adsTuon = await makeAllAds(asTuon.id, thumb);
      console.log(JSON.stringify({ campaign_id: camp.id, mode: "CÓ TỆP — 2 nhóm × 3 bài",
        adsets: { lookalike: asLook.id, tuongtac: asTuon.id }, ads: { lookalike: adsLook, tuongtac: adsTuon } }, null, 2));
    } else {
      const as = await makeAdSet(camp.id, "X3 — Đối tượng rộng (Advantage+)", null);
      const ads = await makeAllAds(as.id, thumb);            // 3 bài
      console.log(JSON.stringify({ campaign_id: camp.id, mode: "RỘNG — 3 bài", adset: as.id, ads }, null, 2));
    }
  } catch (e) {
    try { await graph("DELETE", camp.id, {}); } catch {}
    throw e;
  }
}
const MODE = process.argv[2];
(MODE === "add-ads" ? addAds() : main()).catch(e => { console.error("LỖI:", e.message); process.exit(1); });
