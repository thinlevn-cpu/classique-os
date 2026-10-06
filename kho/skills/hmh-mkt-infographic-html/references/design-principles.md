# Nguyên lý thiết kế infographic — bản đúc cho skill

Grounded từ guru gốc (research đầy đủ ở `output/2026-06-08-research-infographic-design/`):
**Edward Tufte** (data-ink, chống chartjunk) · **David McCandless** (Data+Concept+Goal+Design, 80/20) · **Robin Williams** (C.R.A.P.).

## 7 luật vàng (kiểm trước khi render)
1. **Nội dung trước, thiết kế sau** — chốt: góc nhìn · thông điệp lớn · đối tượng · 1 câu hỏi dẫn. (McCandless 80/20)
2. **Một thông điệp lớn mỗi tấm** — không nhồi nhét.
3. **Phân cấp bằng tương phản** (Contrast) — H1 khổng lồ, con số/từ khóa nổi (đậm/vàng), phần phụ mờ đi.
4. **Nhất quán bằng template lặp** (Repetition) — cùng màu/font/khung/footer cho cả bộ → nhận diện thương hiệu.
5. **Căn theo grid** (Alignment) — lề trái thẳng hàng, khối cân.
6. **Gom nhóm rõ** (Proximity) — mỗi ý 1 card, cách nhau bằng khoảng trắng.
7. **Sạch — bỏ chartjunk** (Tufte) — không 3D loè loẹt; mỗi yếu tố phải tải nghĩa; **chữ Việt rõ, không lỗi**.

## Quy tắc nội dung chữ (để tấm "thở")
- H1: ≤ 6 từ/dòng, tối đa 2 dòng. Viết HOA cho lực.
- Card title (`h2`): 2–5 từ. Mô tả (`p`): 1–2 câu, ≤ ~22 từ, nhấn **1–2 từ khóa** bằng `<b>`.
- 3–6 card/tấm. Quá 6 → tách 2 tấm (small multiples kiểu Tufte).
- Số liệu là vàng: nếu có con số, cho vào badge hoặc bôi `<span>` vàng ở insight.

## Theme màu (đổi ở khối :root của template)
| Theme | --p1 / --p2 | --c1 | --gold | --bgA / --bgB | Dùng cho |
|---|---|---|---|---|---|
| **Tech tím-cyan** (mặc định) | `#6d28d9` / `#7c3aed` | `#22d3ee` | `#fbbf24` | `#0b0c22` / `#111338` | AI, công nghệ, hệ thống |
| **Xanh lá tin cậy** | `#15803d` / `#16a34a` | `#4ade80` | `#facc15` | `#06210f` / `#0b3a1c` | nghề nghiệp, giáo dục, sức khỏe |
| **Cam năng lượng** | `#c2410c` / `#ea580c` | `#fb923c` | `#fde047` | `#1a0f06` / `#2a1407` | bán hàng, khẩn cấp, ưu đãi |
| **Xanh dương doanh nghiệp** | `#1d4ed8` / `#2563eb` | `#60a5fa` | `#fbbf24` | `#06122b` / `#0b1f47` | tài chính, B2B, chiến lược |

> Đổi theme = chỉ sửa 6–8 dòng trong `:root`. Phần còn lại của template tự ăn theo (Repetition).

## Brand mặc định (HMH)
- Footer `@Hoàng Minh Hóa` (đổi nếu khách khác). Hashtag thương hiệu cố định: `#AiBoss #DoanhNhanAI` + 1–2 hashtag chủ đề.
- KHÔNG dùng tên gốc trong nguồn — áp [[hmh-AIOS-rebrand-doi-ten]] nếu nội dung lấy từ raw.

## Biến thể bố cục (mở rộng sau)
- **base-list** (có sẵn): card dọc đánh số — ladder / N bước / N điểm.
- *list-2col*: 2 cột card (kiểu "10 nghề") — khi có 8–10 mục ngắn. (chưa làm — clone base-list, bọc `.grid{display:flex;flex-wrap:wrap}` 2 cột).
- *compare-abc*: 3 khối Kém/Tốt/Tốt nhất xếp dọc, viền đỏ/cam/xanh. (chưa làm)

## Icon
- Dùng **emoji** (Segoe UI Emoji — có màu sẵn trên Windows, render chuẩn). Chọn emoji tải nghĩa: ✋💬📚🤖🧬🚀💡🎯⚙️📈🔥✅❌.
- Cần icon line/SVG tinh tế hơn → nhúng `<svg>` inline (vẫn self-contained).
