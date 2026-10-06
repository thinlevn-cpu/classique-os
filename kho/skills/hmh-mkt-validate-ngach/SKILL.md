---
name: hmh-mkt-validate-ngach
description: >
  ĐO CẦU THẬT của một ngách / ý tưởng kinh doanh số ở Việt Nam (demand-side, KHÔNG phải PESTEL vĩ mô):
  keyword volume Việt+Anh, doanh số marketplace (Shopee/Unica/Edumall/Gitiho/KyNa), tín hiệu cộng đồng
  (FB group, hashtag TikTok, Threads, Zalo OA), giá đối thủ, khả năng chi trả (WTP) và unit economics —
  rồi chấm NICHE SCORE 100 ĐIỂM theo 7 chiều CÓ BẰNG CHỨNG (URL + số cụ thể), ra quyết định
  GO / NO-GO kèm WTP smoke test và falsification protocol (điều kiện tự bỏ ngách). Bắt buộc triangulate
  ≥3 nguồn độc lập cho mỗi claim quan trọng — 1 nguồn = tin vịt. Xuất báo cáo Markdown + sơ đồ điểm `.canvas`.
  Dùng khi người dùng muốn: validate một ngách trước khi đầu tư, biết ngách có đáng làm không, thị trường
  đủ lớn không, có ai làm chưa, khách có chịu trả tiền không, chọn ngách trong nhiều ứng viên, size
  TAM/SAM/SOM cho SME/solopreneur Việt Nam, hoặc check tính khả thi của một ý tưởng cụ thể.
  Kích hoạt khi có từ: validate ngách, chọn ngách, đo cầu, demand validation, niche score, ngách có nên làm không,
  thị trường đủ lớn không, có ai làm chưa, khách có trả tiền không, keyword research, TAM SAM SOM,
  go no-go, nghiên cứu thị trường phía cầu, kiểm chứng ý tưởng kinh doanh.
---

# Validate ngách (demand-side) — Đo cầu thật & chấm Niche Score 100

Đo cầu thật cho 1 ngách / ý tưởng kinh doanh số ở Việt Nam bằng **data triangulate** qua keyword + marketplace + community, không phải opinion. Output là **Niche Score 100 điểm có evidence + quyết định go/no-go**, ghi thành báo cáo Markdown (nguồn sự thật) kèm 1 file `.canvas` trực quan hoá điểm số.

> **Nguyên tắc đầu tiên:** Mỗi claim quan trọng (demand, competition, monetization) phải có **≥3 nguồn độc lập** support. 1 nguồn = anecdote. 2 = coincidence. 3 = signal. Không triangulate được thì ghi "evidence yếu" và hạ confidence — **không bịa**.

**Khung gốc:** Demand Signal Triangulation + Niche Score 100 (7 chiều: Problem Severity × WTP & Unit Economics × Search Demand × Trend & Timing × Competition & Defensibility × Channel-Market Fit × Personal Alignment) + TAM/SAM/SOM Vietnam + WTP Smoke Test Gate. Port từ skill market-research của BIZ.MKT.OS, VN-native, đã đổi output sang Markdown + `.canvas` theo quy ước bộ não này.

## Đọc trước khi chạy (bắt buộc — theo CLAUDE.md)

Nghiên cứu thị trường phải **nối được về doanh nghiệp thật**, không nghiên cứu trong chân không. Trước khi search, đọc theo đúng thứ tự truy vấn của bộ não:

1. **`index.md`** — mục lục nội dung, tìm trang liên quan tới ngành/doanh nghiệp/ngách này.
2. **`wiki/`** — trang thực thể doanh nghiệp (`wiki/entities/`), khái niệm liên quan (`wiki/concepts/`), `wiki/overview.md`, và các phân tích cũ (`wiki/analyses/`) để biết định vị, ICP, giá trị cốt lõi, sản phẩm & giá hiện có (dùng khi chấm **Personal Alignment**, **Channel-Market Fit**, và so sánh price tier khi chấm **WTP**).
3. **`output/`** — đã có lần nghiên cứu/BMC nào cho ngách này chưa (tránh làm lại, và để re-score so sánh theo thời gian).
4. **`raw/`** — nguồn thô người dùng đã thả vào (báo cáo ngành, screenshot số liệu, transcript phỏng vấn khách).

Nếu wiki còn trống (chưa có trang doanh nghiệp/ngành), **nói thẳng với người dùng là đang thiếu ngữ cảnh doanh nghiệp** và gợi ý chạy [[hmh-sale-bmc-phong-van-chi-tiet]] hoặc [[hmh-mkt-chan-dung-dau-suong]] trước. Vẫn nghiên cứu được, nhưng phải đánh dấu Personal Alignment / Channel-Market Fit là "chưa neo được vào doanh nghiệp thật — cần chấm lại sau".

## Skill này phù hợp khi

- Người dùng đã có 1 ngách cụ thể, muốn validate trước khi đầu tư thời gian/tiền
- Người dùng chưa có ngách, cần brainstorm + pick top từ một danh sách ứng viên
- Cần size TAM/SAM/SOM thực tế cho SME/solopreneur VN, không phải corporate-scale
- Muốn biết "ai đang làm rồi", giá bao nhiêu, định vị ở đâu

## Skill này KHÔNG làm (dùng skill khác trong bộ não)

| Việc cần làm | Dùng skill |
|---|---|
| Nghiên cứu thị trường & đối thủ 360° (rộng, không chấm điểm ngách) | [[hmh-mkt-research-thi-truong]] |
| Phân tích sâu 1–5 đối thủ cụ thể (hồ sơ, kênh, offer) | [[hmh-mkt-phan-tich-doi-thu]] |
| Hệ thống hoá mô hình kinh doanh 9 ô + trang chi tiết phân khúc | [[hmh-sale-bmc-phong-van-chi-tiet]] · [[hmh-sale-business-model-canvas]] |
| Đóng gói offer & định giá theo Value Equation (Hormozi) | [[hmh-sale-dinh-gia-offer]] |
| Tính điểm hoà vốn, vốn đầu tư, cần bán bao nhiêu đơn | [[hmh-sale-ke-hoach-loi-nhuan]] |
| Dựng chân dung khách + bản đồ nỗi đau ↔ sung sướng | [[hmh-mkt-chan-dung-dau-suong]] |
| Tìm video/chủ đề đang hút view trên YouTube (số liệu API thật) | [[hmh-mkt-research-youtube]] |

> Skill này chỉ **đo cầu + chấm điểm ngách + go/no-go**. Nó feed dữ liệu vào các skill trên, không thay thế chúng.

## Workflow

### Mode A — Đã có 1 ngách, cần validate (2–3h)
Skip Phase 1. Chạy Phase 2 → Phase 4. Đây là use case phổ biến nhất.

### Mode B — Chưa có ngách, cần discover + pick (4–6h)
Phase 1 → 2 → 4. Bỏ Phase 3 trừ khi đã narrow xuống 1–2 ứng viên.

### Mode C — Đã validate, cần size TAM/SAM/SOM (1h)
Chỉ Phase 3. Reference [tam-sam-som-vn.md](./references/tam-sam-som-vn.md).

| Phase | Mục tiêu | Output |
|---|---|---|
| **1. Discover** | Brainstorm 50+ candidate keyword/ngách từ 5 nguồn | Seed list |
| **2. Signal** | Đo 4 demand signal cho mỗi ứng viên | Evidence table |
| **3. Size** | TAM/SAM/SOM cho top 1–2 ngách | Sizing model |
| **4. Score & Decide** | Niche Score 100 + go/no-go | Báo cáo (Markdown + canvas) |

## Live Research Protocol (bắt buộc dùng tool thật)

Model có cutoff. Search volume + danh sách đối thủ + giá thay đổi mỗi quý. **Đoán = sai.** Dùng `WebSearch` / `WebFetch` thật, không viết báo cáo từ ký ức.

### Step 1 — Mỗi lần research bắt buộc chạy ≥6/10 query này

Thay `$NICHE` bằng keyword tiếng Việt + tiếng Anh để cross-check. Date-stamp mọi finding bằng ngày hôm nay (lấy từ context, không hardcode trong báo cáo).

```
"$NICHE khóa học vietnam"                     → Có ai đang dạy / sell course
"$NICHE shopee.vn"                            → Marketplace activity (sales, reviews)
"$NICHE unica.vn OR edumall.vn OR gitiho.vn"  → Course platform VN (số học viên, giá)
"$NICHE tiktok.com vietnam"                   → TikTok hashtag + creator (discovery #1 Gen Z VN)
"$NICHE threads.net vietnam"                  → Threads VN (creator AI/tech đang shift sang, ít cạnh tranh)
"$NICHE zalo OR shopee live vietnam"          → Zalo Mini App + livestream sale (kênh native VN)
"$NICHE site:reddit.com OR site:facebook.com" → Pain point + sentiment
"$NICHE facebook group vietnam"               → Community signal
"$NICHE google trends vietnam"                → Hướng trend
"$NICHE giá bao nhiêu"                        → Pricing benchmark
```

**Bắt buộc:** ≥1 query phải là TikTok/Threads — kênh discovery thực tế của người mua VN đã dịch chuyển khỏi Google search cho nhiều ngách (AI tool, beauty, finance, parenting). Bỏ qua = miss demand signal lớn nhất.

### Step 2 — WebFetch để extract số chính xác

Search xong, **fetch URL cụ thể** để lấy data exact (không paraphrase):
- Course page → giá, số học viên, review count, credential giảng viên
- Shopee listing → "Đã bán X", price range, top seller
- FB Ads Library (facebook.com/ads/library, filter VN) → creative đang chạy, tín hiệu ad spend
- Trang giá của đối thủ → giá từng tier, bonus, bảo hành

### Step 3 — Manual tool (hướng dẫn người dùng nếu cần login)

| Tool | URL | Lấy gì |
|---|---|---|
| Google Trends VN | trends.google.com (region: Vietnam) | Hướng trend 5 năm, related rising queries, geo hotspot |
| Google Keyword Planner | ads.google.com (account free) | Monthly search volume, CPC, competition level |
| FB Ads Library | facebook.com/ads/library (country: VN) | Ad đối thủ đang chạy, góc creative |
| Shopee Sales Filter | shopee.vn → sort theo lượt bán | Doanh số top seller, price range, pattern review |

Khi cần người dùng thao tác, output theo dạng: "Vào X, làm Y, copy data về theo template Z."

Chi tiết step-by-step + threshold đọc số: [vn-data-sources.md](./references/vn-data-sources.md)

## Niche Score 100 — 7 chiều

7 chiều, weight không đều. Mỗi score **bắt buộc có evidence** (URL + số cụ thể), không "tôi nghĩ".

| # | Dimension | Max | Đo cái gì (1 dòng) |
|---|---|---|---|
| 1 | **Problem Severity** | 15 | Pain intensity × frequency × urgency × failed-attempts (starving crowd) |
| 2 | **WTP & Unit Economics** | 20 | Tín hiệu trả tiền thật + margin sau phí + LTV/backend ladder + price-point match |
| 3 | **Search Demand** | 12 | Keyword chính + portfolio volume Việt+Anh cộng dồn |
| 4 | **Trend & Timing** | 10 | Hướng 5 năm + vị trí trên adoption curve |
| 5 | **Competition & Defensibility** | 15 | Sweet spot 10đ (active vs stale) + unfair advantage/moat 5đ |
| 6 | **Channel-Market Fit** | 15 | Audience ở kênh nào + content native fit + CAC khả thi (LTV/CAC ≥ 3) |
| 7 | **Personal Alignment** | 13 | Expertise + sustainability + network — **chấm theo năng lực doanh nghiệp thật trong `wiki/`** |
| | **TOTAL** | **100** | |

> **VN volume note:** Threshold Search Demand thấp hơn US-mindset ~60% — keyword VN thường = 15–30% US cho cùng concept. Nếu audience tech-savvy (lập trình viên, designer), volume tiếng Anh có thể chiếm 50–70% portfolio → cộng dồn cả 2 ngôn ngữ.
>
> **Saturation flip:** Đếm "đối thủ active trong 12 tháng gần" thay vì tổng số. Unica/Edumall thường show 50+ course nhưng top course đã 18–24 tháng tuổi, giảng viên không update → de facto sweet spot, không phải saturated. Filter: course update <12 tháng + review mới <6 tháng = "active".
>
> **Gross-to-net haircut:** Doanh thu marketplace ≠ tiền về tay. Unica/Edumall share 30–50% revenue; refund rate khoá học online VN 5–12%; FB Ads để fill lớp ăn 30–60% revenue. Chấm Monetization theo **NET**, không theo gross.

**Decision tier:**

| Score | Verdict | Action |
|---|---|---|
| **80–100** | Strong Go | Dồn nguồn lực, fast-track — vẫn phải qua WTP smoke test gate trước khi build full |
| **60–79** | Solid Go | **Bắt buộc** qua WTP smoke test gate + 10 cuộc phỏng vấn khách trước khi chi >5 triệu build |
| **40–59** | Marginal | Chỉ đi tiếp nếu Personal Alignment ≥10 VÀ Channel-Market Fit ≥10, kèm hard milestone + falsification trigger |
| **<40** | Pass | Quay lại Phase 1, chọn ngách khác |

Rubric chi tiết từng chiều + worked example: [niche-scoring-100.md](./references/niche-scoring-100.md)

## WTP Smoke Test Gate (bắt buộc cho score 60–79, optional cho 80+)

Score cao nhưng chưa ai trả tiền cho **chính price-point của bạn** = vẫn là giả định. Smoke test rẻ nhất:

1. **Dựng 1 landing 1 trang** — chỉ promise + CTA "Đăng ký waitlist / giữ chỗ early-bird" với **giá thật** dự định bán. (Dùng [[hmh-mkt-leadpage]] hoặc [[hmh-mkt-ladipage]] để viết trang.)
2. **Đẩy 200–500 warm traffic** qua content organic + 500K–2M FB Ads test.
3. **Đọc số:**
   - Waitlist signup ≥5% warm traffic = WTP signal hợp lệ → proceed MVP
   - Pre-pay/đặt cọc ≥1% = WTP signal mạnh nhất → proceed full launch
   - <2% signup = WTP yếu → giảm giá 30–50%, pivot offer, hoặc kill
4. **Ghi số vào báo cáo** — đây là evidence Tier A, mạnh hơn cả data marketplace.

## Falsification Protocol (pre-mortem — bắt buộc có trong output)

Sau khi chấm điểm, ép người dùng pre-commit kill criteria **trước khi** chi tiền:

> "Trong 90 ngày, nếu 3 signal nào xuất hiện thì bạn bỏ ngách này thay vì cố đổ thêm?"

Ví dụ trigger:
- Waitlist conversion <1% sau 500 traffic = WTP fail
- 0 bài content organic đạt >5K reach trong 30 ngày = channel-market mismatch
- 2 đối thủ lớn cùng launch offer giống = cửa sổ đã đóng
- Personal cost: >40h/tuần × 90 ngày mà doanh thu <20 triệu = vượt sàn burnout

Pre-mortem này phải nằm trong báo cáo. Không có pre-mortem = không có kỷ luật ra quyết định.

## TAM/SAM/SOM cho SME/solopreneur VN

```
TAM = Tổng người mua tiềm năng (VN) × Giá trung bình
SAM = TAM × geo% × demo% × psycho%
SOM năm 1 = SAM × share% thực tế (solo creator)
```

**Sanity check (red flag):**
- SOM năm 1 < 100 triệu VND → ngách quá nhỏ cho solo, pivot hoặc tăng giá
- SOM > 1% market share → quá lạc quan, hạ assumption
- TAM/SOM > 1000x → thị trường quá phân tán, khó chiếm share

Worked example (khoá AI, khoá tiếng Anh, freelance coaching): [tam-sam-som-vn.md](./references/tam-sam-som-vn.md)

## Output — Báo cáo Markdown (nguồn sự thật) + file `.canvas` (trực quan)

Mỗi lần chạy skill = **MỘT thư mục kết quả** theo CLAUDE.md, không để file rời dưới `output/`:

```
output/YYYY-MM-DD-validate-ngach-<ten-ngach>/
├── YYYY-MM-DD-validate-ngach-<ten-ngach>.md   # báo cáo — nguồn sự thật, đầy đủ evidence
└── <Tên ngách>.canvas                          # sơ đồ điểm số trực quan
```

1. **Báo cáo `.md`** — mở đầu ghi lại **câu hỏi/đề bài gốc** của người dùng, sau đó là toàn bộ evidence có nhãn nguồn, Niche Score 7 chiều, verdict, WTP gate, falsification protocol, và link `[[...]]` về các trang wiki liên quan. Frontmatter theo quy ước bộ não:
   ```yaml
   ---
   type: output
   title: Validate ngách — <Tên ngách>
   created: YYYY-MM-DD
   updated: YYYY-MM-DD
   tags: [market-research, niche-validation, <ngành>]
   sources: [<nguồn-trong-raw-nếu-có>]
   ---
   ```
2. **File `.canvas`** — JSON Canvas trực quan hoá điểm: 1 node title (tên ngách + total + verdict + link về báo cáo `.md`), 7 node dimension tô màu theo score, 1 node TL;DR/verdict, và (nếu có Phase 3) 3 node funnel TAM/SAM/SOM. Node đầu tiên **phải** link `[[...]]` về file `.md` để 2 file luôn dính nhau.

Khung chi tiết cho cả báo cáo lẫn canvas (frontmatter, thứ tự section, toạ độ/màu node, quy tắc tô màu theo score): [mau-bao-cao.md](./references/mau-bao-cao.md).

### Sau khi ghi 2 file — lưu vết & nâng cấp lên wiki

1. **Cập nhật `index.md`** (mục Output): link thư mục + verdict + score 1 dòng.
2. **Ghi `log.md`**: `## [YYYY-MM-DD] query | Validate ngách <tên ngách> — <score>/100 <verdict>`.
3. **Nâng cấp lên `wiki/` khi đáng giá** (CLAUDE.md §5.5) — nghiên cứu ngách thường sinh tri thức dùng lại lâu dài:
   - `wiki/concepts/<ngách>.md` — trang khái niệm về ngách + tổng hợp cầu.
   - `wiki/entities/<đối thủ>.md` — đối thủ phát hiện được đáng theo dõi lâu dài.
   - `wiki/analyses/` — nếu muốn giữ bản phân tích thường trực có liên kết chéo.
   - **Củng cố hoặc thách thức `wiki/overview.md`** nếu phát hiện xu hướng thị trường đáng theo dõi. Nếu số mới **mâu thuẫn** với trang wiki cũ, ghi rõ cả hai và ngày tháng — không âm thầm ghi đè (CLAUDE.md §3).
4. **Không ghi đè báo cáo cũ của cùng ngách** — thêm mục "Nhật ký cập nhật" vào file cũ (giữ `updated`) hoặc tạo thư mục mới theo ngày. Đây là hồ sơ theo dõi lâu dài: re-score mỗi quý để thấy ngách dịch chuyển.
5. Mỗi số liệu gắn nhãn nguồn: **Đã đo** (URL trực tiếp) / **Người dùng cung cấp** / **Ước tính**. Không có data → ghi "Chưa xác định — cần kiểm tra thủ công", không đoán đại.

## Anti-pattern thường gặp

| Anti-pattern | Vì sao sai | Cách khác |
|---|---|---|
| "Ngách này hot lắm" không có URL | Opinion ≠ data. Báo cáo dạng này vô giá trị | Ép ≥3 nguồn mỗi claim |
| Interest = Demand | Traffic cao không = chịu trả tiền | Check doanh số marketplace, CPC, có khoá học trả phí tồn tại |
| 1 nguồn duy nhất | Cherry-picked evidence | Triangulate (search + marketplace + community tối thiểu) |
| Audience size = revenue | 100K follower ≠ doanh thu. Conversion 0.5–2% là thường | revenue = audience × conversion × LTV, không assume |
| Chấm Personal Alignment cho một solopreneur giả định | Chấm lệch năng lực thật = quyết định sai | Neo vào trang doanh nghiệp trong `wiki/entities/` |
| TAM giả định 100% addressable | TAM ≠ SOM. Solo creator chiếm được 0.01–0.1% là thường | Áp filter geo + demo + psycho, ghi rõ assumption |
| Data cũ >12 tháng | Thị trường số shift quá nhanh | Ưu tiên nguồn ≤12 tháng, date-stamp mọi finding |

## Best practice

1. **Date-stamp mọi data point**: "Shopee 2026-07-27: 247 sản phẩm, top seller 1.2K đã bán"
2. **URL/nguồn cho mỗi con số** — kiểm tra lại được, audit được
3. **Triangulate ≥3 nguồn** cho claim demand/competition/monetization
4. **Search cả 2 ngôn ngữ** — người VN search cả tiếng Việt và tiếng Anh
5. **Timebox** từng phase. 80% confidence là đủ để làm MVP
6. **Lưu raw search result** vào thư mục output (screenshot, link archive) — thị trường shift, data gốc có thể biến mất

## Tham chiếu references

- [vn-data-sources.md](./references/vn-data-sources.md) — nguồn data VN-specific (Shopee/Unica/Edumall/Gitiho/KyNa/FB/TikTok + Cốc Cốc/Zalo OA/Spiderum/TikTok Creative Center), query template, threshold đọc tín hiệu mạnh/yếu
- [niche-scoring-100.md](./references/niche-scoring-100.md) — rubric đầy đủ 7 chiều có weight, decision tree từng score band, worked example "AI tools cho freelance writer VN" 69/100
- [tam-sam-som-vn.md](./references/tam-sam-som-vn.md) — sizing math VN-native, 3 worked example, % filter điển hình, sanity check threshold
- [mau-bao-cao.md](./references/mau-bao-cao.md) — khung báo cáo Markdown + spec file `.canvas` (frontmatter, section, toạ độ + màu node)

---

**Khi người dùng yêu cầu validate ngách:** đọc `index.md` + trang wiki liên quan (1–2 phút), confirm scope 1–2 câu (mode A/B/C, ngách cụ thể chưa, vùng nào), rồi chạy Live Research Protocol Step 1 ngay — **không hỏi lan man trước khi có data đầu tiên**. Kết thúc bằng ghi báo cáo `.md` + `.canvas` vào một thư mục `output/`, cập nhật `index.md` và `log.md`.
