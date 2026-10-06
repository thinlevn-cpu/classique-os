# SOP — Nghiên cứu → Tạo Ebook → Đẩy lên Heyzine thành Sách Lật

> Quy trình chuẩn (Standard Operating Procedure) để biến **một chủ đề** thành **một Ebook hoàn chỉnh có thương hiệu** rồi xuất bản thành **sách lật (flipbook)** dùng được mọi nơi. Áp dụng cho Claude (tự chạy) lẫn người vận hành.

**Thời gian:** ~15–40 phút/ebook tuỳ độ sâu nghiên cứu.
**Đầu ra:** thư mục `output/YYYY-MM-DD-ebook-<chủ-đề>/` gồm `.md` (nguồn) · `.pdf` (bìa + logo + CTA) · `.html` · link **sách lật Heyzine** · (tuỳ chọn) trang **Lark Wiki Academy**.

---

## SƠ ĐỒ 6 GIAI ĐOẠN

```
1. NGHIÊN CỨU  →  2. SOẠN EBOOK  →  3. BUILD PDF  →  4. HOST PDF CÔNG KHAI  →  5. HEYZINE SÁCH LẬT  →  6. XUẤT BẢN & GHI SỔ
   (gom tri thức)   (markdown 8 phần)  (logo+CTA)      (Novamira→classique.vn)   (api1/rest)             (Wiki + index/log)
```

---

## GIAI ĐOẠN 1 — NGHIÊN CỨU (gom tri thức, không bịa)

Mục tiêu: có đủ tri thức **thật** để viết, đứng trên vai nguồn gốc.

1. **Làm rõ đề bài** với người dùng (nếu chưa rõ): chủ đề · đối tượng đọc · mục tiêu (nhận thức/bán hàng/đào tạo) · giọng văn · có khung sườn riêng không · độ dài.
2. **Thu nguồn** theo thứ tự ưu tiên:
   - Nguồn người dùng đưa (Google Doc, file trong `raw/`, link) — đọc kỹ. Doc lớn quá token → đọc theo chunk / Grep mục cần.
   - NotebookLM (skill [[hmh-AIOS-noi-notebooklm]] / [[notebooklm-research]]) để nghe & tổng hợp video/tài liệu.
   - WebSearch cho dữ kiện, ví dụ, số liệu mới (2026) — **không đoán**.
3. **Phân biệt KHUNG vs NỘI DUNG**: nếu người dùng đưa "khung sườn" → chỉ lấy cấu trúc, KHÔNG bê nguyên nội dung cá nhân của họ vào ebook bán ra ngoài.
5. Chắt lọc thành dàn ý + giữ trích dẫn nguồn (cho phần "grounded").

---

## GIAI ĐOẠN 2 — SOẠN EBOOK (markdown chuẩn)

Tạo `output/YYYY-MM-DD-ebook-<chủ-đề>/<ten>.md` với **frontmatter cấu hình bìa**:

```yaml
---
type: output
title: "..."
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [ebook, ...]
# cấu hình bìa cho build-pdf.mjs:
book_title: "TIÊU ĐỀ LỚN|XUỐNG DÒNG [CỤM TÔ VÀNG]"   # "|" = xuống dòng; [..] = tô vàng kim
book_subtitle: "Phụ đề một dòng"
book_author: "Hoàng Minh Hóa"
book_ribbon: "E B O O K   P H Á T   T R I Ể N   B Ả N   T H Â N"
brand_word1: "MENTOR"
brand_word2: "CAMP"
brand_tagline: "PHÁT TRIỂN CON NGƯỜI · PHÁT TRIỂN KINH DOANH"
---
```

**Cấu trúc thân bài** (khung mặc định, điều chỉnh theo đề bài):
- `## MỤC LỤC` (build-pdf bắt đầu render từ đây — mọi thứ phía trên chỉ dành cho file gốc).
- Lời mở đầu (đặt được "lời hứa lớn" + thông điệp xuyên suốt).
- `# PHẦN I/II/III/IV ...` → mỗi `# PHẦN` thành **trang phân Phần riêng có logo**.
- Các chương `## Chương N` với `### tiểu mục`, bảng, danh sách, khung mẫu điền tay (Phụ lục).
- Dùng `<div style="page-break-after: always;"></div>` để ép sang trang ở các mốc.

**SEED CTA (kêu gọi hành động)** — quy ước: **bất kỳ blockquote nào chứa URL (http...) sẽ tự thành BOX CTA đỏ-vàng + nút link bấm được.** Rải 4–6 CTA ở các điểm cảm xúc cao (cuối lời mở đầu, cuối mỗi Phần, sau đoạn giá trị nhất, kết sách):

```markdown
> **TÊN CHƯƠNG TRÌNH / OFFER**
> Câu dẫn ngắn nối với đoạn vừa đọc, nêu lợi ích.
> Đăng ký: https://link-dang-ky.example.com/
```

**Chất lượng văn:** giọng người, tránh AI-sounding; theo [[content-fanpage-writing-rules]] hạn chế em-dash/emoji trong thân bài; tiếng Việt sạch dấu.

---

## GIAI ĐOẠN 3 — BUILD PDF (có thương hiệu)

Từ trong thư mục output:

```bash
node "<thư-mục-bộ-não>/.claude/skills/hmh-mkt-ebook-sach-lat/scripts/build-pdf.mjs" <ten>.md
```

- Sinh `<ten>.html` rồi render `<ten>.pdf`: **bìa** (logo lớn + tiêu đề vàng kim) · **trang phân Phần** có logo · **box CTA** · trang cuối có dấu ấn thương hiệu.
- Tự render trong `%TEMP%` (né lỗi path tiếng Việt → PDF trắng) và **retry** nếu PDF đích đang bị mở/khoá (rớt sang tên `-CTA.pdf`).
- **Kiểm tra:** mở PDF; nếu cần soi bìa nhanh, chụp bằng Chrome `--screenshot` từ file html.
- Font tiêu đề là **Cambria** để dấu tiếng Việt chuẩn (KHÔNG dùng Georgia cho tiêu đề — lỗi dấu "KẾ´").

---

## GIAI ĐOẠN 4 — HOST PDF CÔNG KHAI

Heyzine cần một **URL công khai, không redirect, đuôi .pdf**. Lark file URL KHÔNG dùng được (đòi đăng nhập). WordPress classique.vn bị **WAF chặn REST POST (403)**, upload thật nên đi qua **Royal MCP** (xem hmh-AIOS-anh-lark-wordpress). Mẫu dưới đây là của site gốc → Dùng **Novamira** đẩy lên **classique.vn**:

1. Tạo link upload (MCP Novamira):
   ```
   ability: novamira/create-upload-link
   params:  { "path": "wp-content/uploads/2026/06/<ten>.pdf", "overwrite": true, "create_directories": true, "expires_in": 1800 }
   ```
   → nhận `upload_url`, `upload_token`, `token_header`.
2. PUT file lên:
   ```bash
   curl -X PUT -H "X-Novamira-Upload-Token: <upload_token>" \
     --data-binary @<ten>.pdf "<upload_url>"
   ```
3. URL công khai = `https://classique.vn/wp-content/uploads/2026/06/<ten>.pdf` — verify:
   ```bash
   curl -sI "https://classique.vn/.../<ten>.pdf" | grep -iE 'HTTP|content-type'   # mong HTTP 200 + application/pdf
   ```

---

## GIAI ĐOẠN 5 — HEYZINE SÁCH LẬT

```bash
bash "<thư-mục-bộ-não>/.claude/skills/hmh-mkt-ebook-sach-lat/scripts/heyzine.sh" \
  "https://classique.vn/wp-content/uploads/2026/06/<ten>.pdf"
```

- Script đọc key từ `.env`, gọi `POST https://heyzine.com/api1/rest` với **Bearer key + k=client_id**, **chỉ** `pdf`+`k`.
- Trả JSON có `url` = link sách lật `https://heyzine.com/flip-book/<id>.html` (id = sha1 của PDF → cùng PDF ra cùng book, idempotent).
- ⚠️ KHÔNG thêm `title`/`t`/`author` (lỗi 500). Đặt tên/bìa tuỳ chỉnh làm trong dashboard Heyzine.

---

## GIAI ĐOẠN 6 — XUẤT BẢN & GHI SỔ

1. (Tuỳ chọn) **Đăng Lark Wiki Academy** "SCHOOL- ACADEMY- HMH" (xem [[lark-wiki-academy-hmh]]):
   ```bash
   lark-cli wiki +node-create --space-id <SPACE_ID_CUA_BAN> --obj-type docx --title "Ebook — ..." --as user   # lấy obj_token
   lark-cli docs +update --api-version v2 --doc <obj_token> --command append --doc-format markdown --content @wiki-<ten>.md --as user
   ```
   - Strip frontmatter trước khi append. Đính kèm PDF tải về: `lark-cli drive +upload --file ./<ten>.pdf --name "..." --wiki-token <node_cha> --as user`.
   - Nhúng dòng link sách lật vào trang.
2. **Output chuẩn:** mọi file trong 1 thư mục `output/YYYY-MM-DD-ebook-<chủ-đề>/`.
3. **Cập nhật** `index.md` (mục Output) + ghi `log.md`.
4. Nếu là tài sản dùng lại → lưu memory (link sách lật, node Wiki).
5. (Tuỳ chọn) Gửi link sách lật vào nhóm Zalo/Lark cho học viên.

---

## CHECKLIST NHANH
- [ ] Nghiên cứu thật, có nguồn; phân biệt khung vs nội dung; đã rebrand.
- [ ] Ebook `.md` có frontmatter cấu hình bìa + cấu trúc Phần/Chương + 4–6 CTA (blockquote có link).
- [ ] `build-pdf.mjs` → PDF có bìa/logo/CTA, mở xem OK.
- [ ] PDF đã host công khai (classique.vn) — verify HTTP 200 application/pdf.
- [ ] `heyzine.sh` → có link `flip-book/<id>.html`.
- [ ] (Tuỳ chọn) Đăng Wiki Academy + nhúng link sách lật.
- [ ] Lưu output 1 thư mục, cập nhật index.md + log.md (+ memory nếu cần).
