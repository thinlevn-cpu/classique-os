# Phương pháp Keyword Research & Topic Research (grounded — Backlinko + Ahrefs)

> Nền: [[2026-06-15-research-seo-web-grounding]] (output). Đọc khi cần hiểu vì sao mỗi bước tồn tại.

## A. Nghiên cứu TỪ KHOÁ (Backlinko)

1. **Tìm hạt giống**: từ chủ đề bạn chỉ định → bung biến thể bằng gợi ý Google (autocomplete), "People also ask", "Searches related to", và (nếu có) Keyword Planner / Ahrefs.
2. **Lọc theo công thức thắng**: ưu tiên từ **volume tốt + cạnh tranh thấp** (KD thấp). Nhiều người tìm, ít site làm tốt → rank nhanh.
3. **Long-tail**: chọn thêm cụm dài, cụ thể (volume thấp, chuyển đổi cao) làm Từ khoá phụ.
4. **Xác định search intent** cho từ khoá chính: Informational / Commercial / Transactional / Navigational. Bài blog tri thức thường **Informational/Commercial**.

## B. "Follow top 100 / mô thức thành công" = SERP analysis (Ahrefs 3 C's)

Gõ từ khoá chính lên Google, đọc **các trang đang top** (top 10–100). Rút **3 C's**:

| C | Câu hỏi | Đổ vào trường |
|---|---|---|
| **Content Type** | Top là blog / video / product / tool? | Schema Type (Article / FAQ / HowTo / Video) |
| **Content Format** | how-to · listicle (N cách) · review · so sánh · hướng dẫn? | Outline (cấu trúc H2/H3 theo format thắng) |
| **Content Angle** | Góc bán: "tốt nhất" · "cho người mới" · "2026" · "miễn phí" · con số? | Tiêu đề bài viết · Meta Title |

**Nguyên tắc**: "follow the crowd" — top toàn how-to thì làm how-to, nhưng **làm sâu/đầy đủ hơn** (skyscraper) để vượt.

## C. Ước lượng Độ khó KD (Ahrefs 0–100)

KD ≈ số referring domains cần để lọt top 10. Khi không có tool trả số, ước lượng **định tính**:
- Top toàn forum/blog nhỏ, bài mỏng → **KD 0–30** (dễ).
- Trộn site vừa, một vài brand → **KD 30–60** (vừa).
- Top toàn brand lớn/báo/domain authority cao, bài rất sâu → **KD 60–100** (khó).

Ghi số ước lượng vào trường **Độ khó KD** + nêu lý do trong **Ghi chú SEO**.

## D. Topic research bằng VIDEO THẮNG (2 tầng)

- **Tầng 1 (mặc định, YouTube API)**: dùng [[hmh-mkt-research-youtube]] tìm video outlier về chủ đề (view/sub cao, view/ngày cao, engagement cao, ngưỡng view). Outlier cao = **góc/chủ đề đang cộng hưởng**. YouTube API KHÔNG có share count → dùng outlier làm proxy "thành công".
- **Tầng 2 (tuỳ chọn, Apify)**: cần **share thật >1000** để xác nhận lan toả → scrape TikTok/Facebook qua [[apify-scrape-mxh]] (chỉ 2 nền này trả share). Dùng khi muốn chắc chắn chủ đề đã viral thật.
- Video thắng nhất sẽ được **nhúng vào bài** (checklist mục 5) → lưu URL vào "Ghi chú SEO" để skill đăng bài embed.

## E. Tổng hợp bằng NotebookLM

Đưa transcript/nguồn (video thắng + trang SERP top) vào NotebookLM ([[notebooklm-research]]), hỏi theo **đầu bài SEO** (xem `blog-writing-checklist.md`) để rút ra brief: angle tiêu đề, outline theo format thắng, meta, từ khoá phụ, internal/backlink gợi ý, độ dài đề xuất. NotebookLM giúp **tổng hợp nhiều nguồn → 1 brief** thay vì đọc tay.

## F. Số từ mục tiêu & số ảnh

- Số từ mục tiêu ≈ độ dài trung bình của **top SERP + 20%** (skyscraper). Bài tri thức thường 1500–2500 từ.
- Số hình ảnh ≈ 1 ảnh / 300–400 từ (đủ trực quan, mỗi ảnh alt chứa từ khoá).
