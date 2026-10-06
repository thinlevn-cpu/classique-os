---
name: hmh-mkt-ebook-sach-lat
description: >
  Pipeline trọn gói biến MỘT CHỦ ĐỀ thành EBOOK hoàn chỉnh có thương hiệu rồi xuất bản thành SÁCH LẬT (flipbook)
  dùng được mọi nơi: (1) nghiên cứu gom tri thức thật (Google Doc/raw/NotebookLM/WebSearch), (2) soạn ebook markdown
  có cấu trúc Phần–Chương + seed CTA kêu gọi hành động, (3) build PDF có bìa + logo thương hiệu của bạn + box CTA (Chrome headless),
  (4) host PDF công khai lên classique.vn, (5) đẩy lên Heyzine API thành sách lật, (6) tuỳ chọn đăng Lark Wiki Academy.
  Dùng khi người dùng muốn: tạo ebook, viết sách điện tử, làm lead magnet dạng ebook, biến PDF thành sách lật/flipbook,
  xuất bản tài liệu/khoá học thành sách lật, tạo ebook có thương hiệu để tặng/bán/thu lead.
  Kích hoạt khi có từ: tạo ebook, làm ebook, viết sách điện tử, ebook flipbook, sách lật, biến pdf thành sách,
  heyzine, flipbook, xuất bản ebook, ebook thương hiệu, nghiên cứu tạo ebook, đẩy pdf lên heyzine.
---

# Skill: Nghiên cứu → Tạo Ebook → Sách Lật Heyzine

Một dây chuyền 6 giai đoạn để ra **ebook có thương hiệu + sách lật** chỉ từ một chủ đề. Tài liệu chi tiết: `references/SOP-nghien-cuu-ebook-sach-lat.md`.

## Triết lý gốc (grounded)
Ebook trong hệ HMH là **info-product / mồi câu cao cấp**, nên bám đúng khung đã grounded của hệ:
- **Alex Hormozi** ($100M Leads): tài liệu miễn phí phải "irresistible" — giá trị cảm nhận rõ; mỗi ebook nên dẫn tới một bước tiếp theo (offer). → đây là gốc của việc **seed CTA**.
- **Russell Brunson** (Expert Secrets / Hook–Story–Offer): ebook là *Hook* mở đầu phễu; mở bằng lời hứa lớn, đóng bằng lời mời.
- **Ryan Deiss** (Lead Magnet Blueprint) & **Dan Kennedy** (specificity sells): càng cụ thể, một nhóm người cụ thể, một kết quả cụ thể → chuyển đổi càng cao.
- **Nghiên cứu trước, không bịa** (Luật 2a của [[hmh-AIOS-tao-skill]]): đứng trên nguồn gốc (Google Doc người dùng đưa, `raw/`, NotebookLM, WebSearch) rồi mới viết.
Cặp đôi tự nhiên với [[hmh-mkt-lead-magnet]] (chọn & outline mồi câu) → skill này **sản xuất & xuất bản** thành phẩm.

## Khi nào dùng / KHÔNG dùng
- **Dùng** khi cần ra một **ebook/sách điện tử** thành phẩm (PDF có thương hiệu) và/hoặc **sách lật Heyzine**.
- **KHÔNG dùng** cho: chỉ lên ý tưởng mồi câu (→ [[hmh-mkt-lead-magnet]]); bài blog SEO (→ [[hmh-AIOS-dang-bai-seo]]); infographic ảnh (→ [[hmh-mkt-infographic-html]]); slide.

## Tiền điều kiện
- **Node + Chrome** (build PDF). Chrome ở `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- **Host PDF công khai lên classique.vn**: POST media REST bị WAF 403, nên upload qua **Royal MCP** (`ROYAL_MCP_API_KEY` trong `.secrets/wordpress.env`), giống cách [[hmh-AIOS-anh-lark-wordpress]] đang làm. ⚠️ Các bước Novamira bên dưới là của site gốc, classique.vn KHÔNG có Novamira: khi chạy lần đầu phải thử đường Royal MCP cho file PDF rồi cập nhật lại mục 4.
- **Heyzine key** ở `.env` (`HEYZINE_API_KEY`, `HEYZINE_CLIENT_ID`) — xem [[heyzine-flipbook-setup]].
- **lark-cli `--as user`** nếu đăng Wiki Academy — xem [[lark-cli-setup]], [[lark-wiki-academy-hmh]].

## Quy trình thực thi (6 giai đoạn)

### 1. Nghiên cứu
Làm rõ đề bài (chủ đề · đối tượng · mục tiêu · giọng · khung sườn riêng · độ dài). Thu nguồn: doc/raw người dùng đưa → NotebookLM → WebSearch. **Phân biệt KHUNG vs NỘI DUNG** (khung sườn người dùng đưa: chỉ lấy cấu trúc). Áp [[hmh-AIOS-rebrand-doi-ten]]. Doc lớn quá token → đọc theo chunk / Grep.

### 2. Soạn ebook markdown
Tạo `output/YYYY-MM-DD-ebook-<chủ-đề>/<ten>.md`. **Frontmatter cấu hình bìa** (`book_title` dùng `|` để xuống dòng, `[..]` để tô vàng; `book_subtitle`, `book_author`, `book_ribbon`, `brand_word1/2`, `brand_tagline`). Thân bài: `## MỤC LỤC` → Lời mở đầu → `# PHẦN ...` (mỗi Phần = 1 trang có logo) → `## Chương` + `###` + bảng + khung điền tay; `<div style="page-break-after: always;"></div>` để ngắt trang.
**SEED CTA:** mỗi blockquote chứa URL → tự thành box CTA. Rải 4–6 CTA ở điểm cảm xúc cao:
```markdown
> **TÊN OFFER / CHƯƠNG TRÌNH**
> Câu dẫn nối đoạn vừa đọc + lợi ích.
> Đăng ký: https://link.example.com/
```
Giọng người, dấu tiếng Việt sạch ([[content-fanpage-writing-rules]]).

### 3. Build PDF (thương hiệu)
```bash
node "<thư-mục-bộ-não>/.claude/skills/hmh-mkt-ebook-sach-lat/scripts/build-pdf.mjs" <ten>.md
```
Ra `<ten>.pdf` (bìa + logo + trang phân Phần + box CTA + link bấm). Tự render trong `%TEMP%` (né path tiếng Việt) + retry nếu PDF đang mở. Tiêu đề font **Cambria** (dấu tiếng Việt chuẩn). Mở xem / chụp bìa bằng Chrome `--screenshot` để kiểm.

### 4. Host PDF công khai (classique.vn, ưu tiên Royal MCP; Novamira chỉ là mẫu của site gốc)
- `novamira/create-upload-link` với `path=wp-content/uploads/2026/06/<ten>.pdf`, `overwrite:true`, `create_directories:true`.
- `curl -X PUT -H "X-Novamira-Upload-Token: <token>" --data-binary @<ten>.pdf "<upload_url>"`.
- Verify `https://classique.vn/wp-content/uploads/2026/06/<ten>.pdf` → HTTP 200 + application/pdf.
(WordPress classique.vn REST POST media bị WAF 403 → upload qua Royal MCP; Lark file URL cần login → không dùng được.)

### 5. Heyzine sách lật
```bash
bash "<thư-mục-bộ-não>/.claude/skills/hmh-mkt-ebook-sach-lat/scripts/heyzine.sh" "<public-pdf-url>"
```
→ in `SÁCH LẬT: https://heyzine.com/flip-book/<id>.html`. (Auth Bearer key + `k=client_id`, CHỈ `pdf`+`k`.)

### 6. Xuất bản & ghi sổ
(Tuỳ chọn) đăng Wiki Academy ([[lark-wiki-academy-hmh]]: `wiki +node-create` + `docs +update append`; đính PDF qua `drive +upload --wiki-token`; nhúng link sách lật). Lưu tất cả 1 thư mục output, cập nhật `index.md` + `log.md`, lưu memory nếu là tài sản dùng lại. (Tuỳ chọn) gửi link vào nhóm Zalo/Lark.

## Tham chiếu
- `scripts/build-pdf.mjs` — md→HTML→PDF tham số hoá (bìa/logo/CTA từ frontmatter).
- `scripts/heyzine.sh` — gọi Heyzine API từ 1 URL PDF công khai.
- `references/SOP-nghien-cuu-ebook-sach-lat.md` — SOP đầy đủ 6 giai đoạn + checklist.

## Gotcha
- **PDF trắng 1 trang**: path dự án có dấu cách/tiếng Việt → luôn render trong `%TEMP%` (đã xử lý trong script).
- **Dấu tiếng Việt lỗi ở tiêu đề** ("KẾ´"): KHÔNG dùng Georgia cho tiêu đề; dùng **Cambria** (đã set).
- **Heyzine 422 "pdf required"**: gửi JSON → sai; phải **form-urlencoded**. **500 "Input data error"**: do thêm `title`/`t` → chỉ truyền `pdf`+`k`. **"-100 Invalid api key"**: thiếu `k=client_id` hoặc để k=key đầy đủ.
- **PDF phải công khai** cho Heyzine fetch: Lark URL (login) hỏng; REST POST của classique.vn bị WAF 403 → upload qua Royal MCP rồi dùng URL `classique.vn/wp-content/uploads/...`.
- **Heyzine cache theo URL**: sau khi overwrite cùng URL PDF (vd đổi logo), gọi lại cùng URL ra **bản cũ**. Ép render mới bằng cache-buster `?v=2` trên tham số pdf → flipbook id/URL mới (nhớ cập nhật link đã nhúng ở Wiki/index/log).
- **Logo**: thả logo CỦA BẠN vào `assets/` với đúng 2 tên `logo-mentorcamp-white.png` (dùng trên nền tối) và `logo-mentorcamp-dark.png` (dùng trên nền sáng). Bản phát hành không kèm logo sẵn — thiếu file thì PDF vẫn build bình thường, chỉ là không có logo.
- **PDF đích bị khoá** (đang mở xem) → script tự rớt sang tên `-CTA.pdf`; nhắc người dùng đóng bản xem để gộp 1 tên.

## Output
Bám CLAUDE.md: mỗi ebook = 1 thư mục `output/YYYY-MM-DD-ebook-<chủ-đề>/` (.md + .pdf + .html + link sách lật). Cập nhật `index.md` + `log.md`. Mẫu tham chiếu đã chạy thật: `output/2026-06-20-ebook-ke-hoach-cuoc-doi-1-trang/` → sách lật https://heyzine.com/flip-book/a97c012a11.html.
