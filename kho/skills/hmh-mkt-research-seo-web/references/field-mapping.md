# Bản đồ trường — bảng "Lịch bài SEO" của bạn (31 trường)

base_token `<SEO_BASE_TOKEN>` · table `<SEO_TABLE_ID>` (điền trong `.secrets/seo-web.env` — xem HUONG-DAN-CAI-DAT.md)

> ⚠️ **field_id trong bảng dưới là CỦA BASE MẪU** — khi bạn tạo base riêng, field_id sẽ KHÁC.
> Không sao: script `write-brief-to-base.mjs` và `select-article.mjs` map theo **TÊN trường**, nên bạn chỉ cần
> tạo các trường **đúng TÊN + đúng KIỂU** như bảng dưới. Muốn tra field_id của base mình:
> `lark-cli base +field-list --base-token <token> --table-id <table> --format json`.

## Trường skill NGHIÊN CỨU này SỞ HỮU (ghi khi tạo record "Chờ viết")

| Trường (tên Lark) | field_id | Kiểu | Nguồn brief |
|---|---|---|---|
| Tiêu đề bài viết | fldEG5NoEn | text | Angle thắng (3C) + headline checklist |
| Từ khoá chính | fldb3pKFSc | text | Keyword traffic tốt + KD thấp |
| Từ khoá phụ | fldvXK89Xw | text | Long-tail / parent topic (phẩy ngăn cách) |
| Từ khoá người dùng | fldC5EQBDJ | text | Cụm người dùng thật gõ (PAA, autocomplete) |
| Outline | fldJqMYCYV | text | Cấu trúc H2/H3 theo format thắng (3C) |
| Meta Title | fldB6nav3Y | text | ≤60 ký tự, chứa từ khoá chính |
| Meta Description | fldakyN2rT | text | ≤155 ký tự, có lợi ích + CTA mềm |
| URL Slug | fldWpfmHDh | text | slug sạch, chứa từ khoá, không dấu |
| Danh mục WordPress | fldxeCFkJK | text | tên category ("A > B") hoặc ID |
| Schema Type | fldLWuBvmN | text | Article / FAQ / HowTo / Video (Content Type 3C) |
| Internal Links | fldiwzftTf | text | 2–3 URL nội bộ classique.vn (phẩy) |
| Backlink Targets | fldHkCX34W | text | 1–2 nguồn ngoài mạnh (phẩy) |
| Alt text ảnh | fldWgt9l9V | text | mô tả ảnh, chứa từ khoá chính |
| Số từ mục tiêu | fld15ccIu5 | number | top SERP + 20% (1500–2500) |
| Số hình ảnh | fld8zUeIvG | number | ~1 ảnh / 300–400 từ |
| Volume tháng | fld4GNF6Wr | number | lượng search/tháng ước lượng |
| Độ khó KD | fldwEisj94 | number | 0–100 (Ahrefs KD ước lượng) |
| Ghi chú SEO | fldgBwO80A | text | intent, video YouTube để embed (URL), lý do KD, gợi ý CTA |
| Ngày đăng | fldkzcAzFq | datetime | ngày muốn đăng (skill đăng bài đọc) |
| Người viết | fldpQuLGtO | text | mặc định "AI Research" |
| Trạng thái | fldzmyEk8c | select | **luôn = "Chờ viết"** |

## Trường skill ĐĂNG BÀI / hệ thống / về sau (skill này ĐỂ TRỐNG)
File ảnh (fldKAKLFLQ, attachment) · Link ảnh Drive (fldPe5u2vV) · Link web sau đăng (fldlm4fGoD) ·
WordPress Media ID (fldS4jbZIR) · Kết quả ranking (fldS6dKWlp) · GA4 Sessions/Lượt xem/Thời gian/Cập nhật
(fldm6XvRg8, fldZ2yZCJj, fldnhA8RRU, fldconxxIj) · ID (fldofJQdp7, auto_number).

> **File ảnh** vẫn cần người thiết kế bổ sung trước khi đăng (hoặc skill [[hmh-AIOS-anh-lark-wordpress]]).
> Skill nghiên cứu có thể gợi ý chủ đề ảnh trong "Ghi chú SEO".

## Lưu ý kiểu dữ liệu khi ghi (lark-cli +record-batch-create)
- text → string thường.
- number (Volume tháng, Độ khó KD, Số từ, Số ảnh) → **số**, không phải chuỗi.
- datetime (Ngày đăng) → **epoch milliseconds** (số). Script tự đổi "YYYY-MM-DD".
- select (Trạng thái) → đúng chuỗi tên option có sẵn: `Chờ viết` (tránh tạo option mới).
- Trường để trống → bỏ khỏi `fields` (không cần null).

## Schema brief JSON (đầu vào cho write-brief-to-base.mjs)
```json
{
  "tieu_de": "...",            "tu_khoa_chinh": "...",
  "tu_khoa_phu": "a, b, c",    "tu_khoa_nguoi_dung": "x, y",
  "outline": "H2: ...\nH2: ...","meta_title": "...",
  "meta_description": "...",    "url_slug": "...",
  "danh_muc": "...",            "schema_type": "Article",
  "internal_links": "u1, u2",   "backlink_targets": "u3",
  "alt_text": "...",            "so_tu_muc_tieu": 1800,
  "so_hinh_anh": 5,             "volume_thang": 1200,
  "do_kho_kd": 28,              "ghi_chu_seo": "intent...; video embed: https://youtu.be/...",
  "ngay_dang": "2026-06-20",    "nguoi_viet": "AI Research"
}
```
Một file có thể chứa 1 object hoặc mảng object (nhiều bài 1 lần). `tieu_de` + `tu_khoa_chinh` là bắt buộc.
