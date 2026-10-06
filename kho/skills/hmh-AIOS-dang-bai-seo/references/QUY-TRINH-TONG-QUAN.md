# Quy trình viết & đăng bài SEO tự động — từ chủ đề đến bài trên web

## 1. Bức tranh lớn: dây chuyền 2 giai đoạn, gặp nhau tại 1 cái bảng

```
GIAI ĐOẠN 1 (research)          ĐIỂM BÀN GIAO               GIAI ĐOẠN 2 (viết & đăng)
hmh-mkt-research-seo-web   →   Lark Base "Lịch bài SEO"   →   hmh-AIOS-dang-bai-seo
"tìm gì để viết?"               mỗi dòng = 1 bài              chạy tự động 11:00 mỗi ngày
                                cột Trạng thái = công tắc
                                   "Chờ viết" ───────────────→ "Đã đăng" + link
```

Hai skill **không gọi nhau trực tiếp** — chúng giao tiếp qua cột **Trạng thái** trong bảng.
Điểm thấu suốt quan trọng nhất: **cái bảng là nguồn sự thật duy nhất.** Người lên kế hoạch chỉ
cần nhìn bảng là biết bài nào chờ, bài nào đã lên web, link ở đâu. Không ai phải hỏi ai.

Vai trò từng nhóm cột trong bảng:

| Nhóm cột | Ai điền | Gồm |
|---|---|---|
| Brief (đầu vào) | Người lên kế hoạch / skill research | Tiêu đề, Từ khoá chính/phụ/người dùng, Outline, Meta Title/Description, URL Slug, Danh mục, Schema Type, Internal Links, Số từ, **Ngày đăng** |
| Ảnh | Người thiết kế / skill ảnh | File ảnh (attachment), Link ảnh Drive, Alt text |
| Hệ thống (đầu ra) | **Máy tự điền** | Trạng thái, Link web sau đăng, WordPress Media ID |

---

## 2. Giai đoạn 1 — Từ chủ đề mơ hồ thành brief nằm trong bảng

Bạn chỉ định **chủ đề** (vd "phễu marketing tự động") và **số bài**. Skill research làm 5 việc:

1. **Nghiên cứu từ khoá** (phương pháp Backlinko): bung biến thể từ autocomplete, "People also ask",
   related search → chọn **từ khoá chính** theo tiêu chí *traffic tốt + độ khó (KD) thấp*, gom từ khoá phụ
   (long-tail) và "từ khoá người dùng" (cụm người thật gõ — sau này thành câu hỏi FAQ trong bài).

2. **Follow top 100 / mô thức thành công**: đọc các trang đang top Google cho từ khoá đó, rút **3 C's**
   (Ahrefs) — Content Type (dạng bài → Schema Type), Format (cấu trúc → Outline), Angle (góc tiếp cận →
   Tiêu đề). Triết lý: *không đoán mò người tìm muốn gì — nhìn cái đang thắng rồi làm sâu hơn (skyscraper)*.
   Song song chạy YouTube API tìm **video outlier** (view vượt cỡ kênh) để biết góc nào đang cộng hưởng.

3. **Tổng hợp thành brief** (NotebookLM hoặc trực tiếp): angle headline, outline theo format thắng,
   meta title/description, độ dài đề xuất, ý CTA.

4. **Dựng `briefs.json`** — mỗi bài 1 object đủ 21 trường. **Ngày đăng đặt giãn cách mỗi bài 1 ngày** —
   đây chính là cách "xếp lịch" cho giai đoạn 2 rút bài tuần tự.

5. **Ghi vào bảng**: `write-brief-to-base.mjs --dry-run` xem trước payload → ghi thật → mỗi brief thành
   1 record **Trạng thái = "Chờ viết"**. Script map theo *tên trường* (không phụ thuộc field_id) nên
   bảng của ai cũng dùng được.

Còn thiếu **ảnh**: người thiết kế (hoặc skill `hmh-AIOS-anh-lark-wordpress`) bổ sung vào field "File ảnh"
của record. Bài không ảnh vẫn đăng được (text-only), có ảnh thì chuẩn SEO hơn.

---

## 3. Giai đoạn 2 — Mỗi ngày 11:00, cỗ máy tự chạy 4 bước

Windows Task Scheduler gọi `run-daily.ps1`. Mở màn là **tiền kiểm**: có WordPress Application Password
trong `.secrets/wordpress.env` chưa? Chưa → báo nhóm Lark rồi dừng, *không chết câm*.

### Bước 1 — Chọn bài đến hạn (`select-article.mjs`)
- Quét toàn bảng, lọc **Trạng thái = "Chờ viết"** và **Ngày đăng ≤ hôm nay** (giờ VN GMT+7; ngày quá khứ
  vẫn tính = xử lý hàng tồn), lấy bài **cũ nhất trước**.
- **Sổ đếm lỗi (fail-ledger)**: bài hỏng ≥3 lần liên tiếp bị **bỏ qua** để không chặn hàng đợi —
  một record lỗi không được phép làm cả dây chuyền đói. Bài kẹt được báo động riêng về Lark.
- Tải ảnh về máy, đổi tên `<slug>-1.jpg` (tên file chứa từ khoá — cũng là tín hiệu SEO), ảnh nặng
  6-10MB được **nén tự động** về ≤1600px (ffmpeg).
- Xuất `manifest.json` = toàn bộ brief + danh sách ảnh local. Không có bài đến hạn → thoát êm (exit 3).

### Bước 2 — AI viết bài (phiên Claude bị "khoá tay", chỉ nhả HTML)
- AI nhận đúng 2 thứ: **checklist SEO** (headline có số + lợi ích + lời hứa; sapo chứa từ khoá trong
  100 từ đầu; heading theo outline; mật độ từ khoá ~1.5-2%; E-E-A-T: ≥1 bằng chứng trải nghiệm thật +
  ≥1 external link uy tín; YMYL không hứa hẹn phóng đại) và **manifest** (brief bài này).
- Viết HTML thân bài: H1 → H2/H3 theo Outline → FAQ → kết luận <200 từ → **2 CTA gắn UTM**
  (`utm_campaign=<slug>`, `utm_content=cta-giua-bai|cta-cuoi-bai` — để đo CTA nào ra chuyển đổi).
- Vị trí ảnh dùng **placeholder** `__IMG1__`, `__IMG2__`... — AI không cần biết URL ảnh thật;
  việc đổi placeholder thành URL là của bước 3. Alt ảnh bắt buộc chứa từ khoá chính.
- **Lưới an toàn**: HTML phải hợp lệ + đủ dài + có placeholder nếu bài có ảnh. Không đạt → KHÔNG đăng,
  ghi sổ lỗi, báo Lark.

### Bước 3 — Đăng WordPress (`publish-wordpress.mjs`), đúng thứ tự
1. **Chống trùng**: đã có bài publish cùng slug → không tạo bài đôi (hại SEO), chỉ đồng bộ bảng "Đã đăng".
2. **Cổng chặn YMYL**: bài tiền bạc/kinh doanh có cụm hứa hẹn phóng đại ("giàu nhanh", "cam kết lợi
   nhuận"...) → **chặn không cho lên web** (Google hạ hạng loại nội dung này + rủi ro uy tín tác giả).
   Chỉ bỏ qua bằng `--allow-ymyl` khi chắc chắn false-positive.
3. Upload ảnh lấy **media ID thật** (site chặn upload REST thì đi đường Royal MCP base64) → thay
   placeholder bằng URL thật; ảnh #1 = featured image; ảnh upload lỗi → gỡ trọn khối `<figure>` đó,
   không để ảnh vỡ trên web.
4. Chèn **author box E-E-A-T** cuối bài (tên + tiểu sử + link tác giả — tín hiệu "người thật").
5. Tạo bài `publish`: slug + danh mục (**luôn tự gắn thêm "BLOG"**) + excerpt + Yoast meta (best-effort).
6. **Verify**: đọc lại post, xác nhận `status=publish` thật rồi mới báo thành công — nguyên tắc
   *không bao giờ báo "đã đăng" chỉ vì lệnh không lỗi*.
7. **Cập nhật bảng**: Trạng thái → "Đã đăng" + Link web + Media ID. Vòng lặp khép kín về nơi xuất phát.

### Bước 4 — Ghi sổ
Lưu kết quả vào `output/YYYY-MM-DD-dang-bai-seo/`, ghi `log.md`, bắn tin Lark ✅ (hoặc ⚠️ kèm lý do).

---

## 4. Vì sao thiết kế này đáng tin

- **Bảng là công tắc, không phải con người**: muốn đăng → record "Chờ viết" + Ngày đăng; muốn hoãn →
  dời ngày; muốn dừng → đổi trạng thái. Không sửa code.
- **Mỗi bước có cổng kiểm**: tiền kiểm creds → guard HTML → cổng YMYL → verify sau đăng.
  Lỗi ở đâu dừng ở đó, báo về Lark, không đăng bừa.
- **Tách việc đúng sở trường**: máy làm việc máy giỏi (quét bảng, tải ảnh, gọi API, verify — chạy
  thẳng Node, không bị chặn quyền); AI chỉ làm đúng một việc: **viết**.
- **Chạy lại an toàn (idempotent)**: chống trùng slug, sổ lỗi, ảnh nén theo tên ổn định —
  chạy 2 lần không tạo rác.

## 5. Hai skill vệ tinh

- **`hmh-AIOS-anh-lark-wordpress`**: đưa ảnh từ tin nhắn/Base Lark lên WordPress Media Library, có chống
  trùng — phục vụ khâu chuẩn bị ảnh cho record trước ngày đăng.
- **`seo-web-writer`**: bản quy trình **9 bước đăng tay** qua connector claude.ai — dùng khi muốn ngồi
  giám sát từng bài thay vì để cỗ máy tự chạy. Bản chất các bước giống hệt giai đoạn 2.

