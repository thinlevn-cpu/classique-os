---
name: hmh-AIOS-dang-bai-seo
description: >
  Tự động viết và đăng bài blog chuẩn SEO lên website classique.vn theo LỊCH trong Lark Base.
  Mỗi ngày (Scheduled Task 11:00) quét bảng "Lịch bài SEO" của bạn, lấy bài có Trạng thái "Chờ viết"
  và Ngày đăng đến hạn (cũ nhất trước), viết bài HTML chuẩn SEO theo Checklist viết bài Blog (headline,
  sapo, heading, ảnh alt, internal/external link, mật độ từ khoá ~2%, kết luận + 2 CTA), đăng lên
  WordPress qua REST API (upload ảnh, set featured, Yoast, slug, category), rồi cập nhật record sang
  "Đã đăng" + link. Đăng được HEADLESS không cần connector claude.ai. Dùng khi người dùng muốn đăng bài
  SEO hằng ngày lên web, lên lịch đăng bài tự động, viết bài chuẩn SEO cho classique.vn, chạy/sửa
  tác vụ 11:00, hoặc đăng tay một bài cụ thể từ Lark Base. Kích hoạt khi có từ: đăng bài seo, đăng bài
  lên web, viết bài blog chuẩn seo, lên lịch đăng bài, tự động đăng web, seo web writer, đăng wordpress,
  bài chờ viết, classique.vn, checklist viết bài blog, từ khoá lên top.
---

> **BẢN BÀN GIAO HỌC VIÊN** — mọi token/mật khẩu/tên miền cá nhân đã được gỡ.
> Trước khi dùng: đọc `HUONG-DAN-CAI-DAT.md` ở thư mục gốc bộ bàn giao và điền cấu hình CỦA BẠN
> vào `.secrets/wordpress.env` + `.secrets/seo-web.env`.

# Skill: Tự động viết & đăng bài SEO theo lịch (Lark Base → classique.vn)

Biến lịch nội dung trong Lark Base thành bài blog chuẩn SEO đăng tự động lên website, đúng ngày, đủ ảnh,
chuẩn từ khoá để **lên top Google**. Thay cho skill cũ `seo-web-writer` (chỉ là tài liệu, chưa đóng gói).

> Luồng: **Lark Base (lịch + brief + ảnh) → AI viết bài chuẩn SEO → Đăng WordPress REST → Cập nhật Lark Base.**

---

## Nguồn / triết lý gốc (Luật 2a)

Tri thức SEO trong skill này grounded từ thực hành on-page SEO kinh điển: **Yoast SEO** (gate xanh, mật độ
từ khoá, meta), **Brian Dean / Backlinko** (cấu trúc bài trụ, internal link, độ dài), nguyên lý **headline**
của copywriting cổ điển (số + lợi ích + lời hứa), **Google Search Quality Rater Guidelines** (E-E-A-T &
YMYL — vì người đọc classique.vn sắp chi tiền lớn cho hàng đã qua sử dụng, Google soi tin cậy gắt nhất; luật gốc ở `CLAUDE.md` mục 11, thắng checklist khi lệch), và quy trình content nội bộ. Toàn bộ checklist nằm ở
[references/seo-blog-checklist.md](references/seo-blog-checklist.md) — **ĐỌC FILE ĐÓ TRƯỚC KHI VIẾT.**

---

## Khi nào dùng / KHÔNG dùng

- **DÙNG:** đăng bài SEO hằng ngày theo lịch Lark Base; đăng tay 1 bài cụ thể; dựng lại/sửa task 11:00.
- **KHÔNG dùng:** viết post Facebook tri thức (→ [[hmh-mkt-content-tri-thuc]]); dựng landing/sales page
  (→ [[hmh-mkt-ladipage]] / [[hmh-mkt-web-dich-vu]]); chỉ tải ảnh Lark lên WP (→ [[hmh-AIOS-anh-lark-wordpress]]).

---

## Tiền điều kiện

| Hạng mục | Giá trị |
|----------|---------|
| Lark Base | base_token `<SEO_BASE_TOKEN>` · table `<SEO_TABLE_ID>` ("Lịch bài SEO") |
| Website | classique.vn (WordPress + Yoast SEO + WooCommerce) |
| **WordPress creds** | `.secrets/wordpress.env` → `WP_URL`, `WP_USER`, `WP_APP_PASSWORD` (Application Password). Xem file mẫu trong HUONG-DAN-CAI-DAT.md |
| lark-cli | đã cài & đăng nhập (xem [[lark-cli-setup]]) — gọi qua `lark-cli` |
| Node | `C:\Program Files\nodejs` (không có trên PATH mặc định — thêm khi chạy) |

> **App Password tạo ở đâu:** classique.vn/wp-admin → Users → Profile → Application Passwords →
> tạo tên "Claude SEO" → copy chuỗi 24 ký tự dán vào `.secrets/wordpress.env`. Đây là cách đăng HEADLESS;
> connector claude.ai `WordPress` thường VẮNG trong cron nên KHÔNG dùng cho tự động.

---

## Bảng Lark Base — các trường (field) quan trọng

| Trường | Vai trò | Ai điền |
|--------|---------|---------|
| Tiêu đề bài viết | H1 + tiêu đề | Người lên kế hoạch |
| Từ khoá chính | Focus keyword | // |
| Từ khoá phụ / Từ khoá người dùng | H2/H3 + FAQ | // |
| Outline | Cấu trúc bài (H1/H2…) | // |
| Meta Title / Meta Description | Yoast | // |
| URL Slug | đường dẫn sạch | // |
| Danh mục WordPress | category con/chuyên đề (tên "A > B" hoặc ID). Hệ thống LUÔN gắn thêm "BLOG" tự động | // |
| Schema Type | Article / FAQ / HowTo | // |
| Internal Links · Backlink Targets | link nội bộ + web ngoài mạnh | // |
| Alt text ảnh | alt dự phòng (dùng khi ảnh không có alt riêng trong HTML) | // |
| Số từ mục tiêu | độ dài (mặc định ~1500-2000) | // |
| **Ngày đăng** | ngày kích hoạt đăng | // |
| **File ảnh** (attachment) | ảnh bài (ưu tiên) | Người thiết kế |
| Link ảnh Drive | ảnh dự phòng | // |
| **Trạng thái** | Chờ viết → Đã đăng | **hệ thống** |
| Link web sau đăng · WordPress Media ID | hệ thống điền | **hệ thống** |

---

## QUY TRÌNH THỰC THI (Claude làm theo đúng các bước)

> Mọi lệnh Bash cần Node + lark-cli: thêm PATH trước:
> `export PATH="$PATH:/c/Program Files/nodejs:$APPDATA/npm"   # chỉnh theo máy của bạn nếu node/lark-cli chưa có trên PATH`

### Bước 0 — Chuẩn bị thư mục output
Tạo `output/YYYY-MM-DD-dang-bai-seo/` cho kết quả hôm nay (theo CLAUDE.md mục `output/`).

### Bước 1 — Chọn bài đến hạn + tải ảnh
```bash
node ".claude/skills/hmh-AIOS-dang-bai-seo/scripts/select-article.mjs" \
  --imgdir "output/YYYY-MM-DD-dang-bai-seo/img" \
  --out    "output/YYYY-MM-DD-dang-bai-seo/manifest.json"
```
- Chọn bài **Trạng thái = "Chờ viết"** và **Ngày đăng <= hôm nay**, lấy bài **cũ nhất** (quá hạn lâu nhất).
- Tải ảnh "File ảnh" về `img/`, đổi tên `<slug>-N.jpg` (tên file chứa từ khoá — chuẩn SEO). **Ảnh lớn (máy ảnh/điện thoại 6-10MB) được NÉN tự động** về web-friendly (max 1600px, JPEG ~q3 → ~200-500KB) bằng `lib-image.mjs` (ffmpeg). KHÔNG bỏ ảnh nặng nữa.
- **Exit code 3 = KHÔNG có bài đến hạn** → dừng êm, không coi là lỗi, ghi log "không có bài hôm nay".
- **Exit code 4 = có bài nhưng TẤT CẢ đang KẸT** (record độc lỗi ≥ `--max-fails`, mặc định 3) → orchestrator cảnh báo Lark.
- **Chống nghẽn hàng đợi:** truyền `--fail-ledger <path>` (sổ đếm lỗi theo record do `run-daily.ps1` ghi). Bài lỗi ≥ `--max-fails` lần liên tiếp bị **bỏ qua** để không chặn các bài phía sau (trước đây 1 record độc làm cả hàng đợi bị đói vì luôn chọn bài cũ nhất). Đăng thành công → xoá khỏi sổ.
- **"Hôm nay" tính theo GMT+7** (không dùng UTC) — tránh lệch ngày khi chạy tay sau 17:00.
- Đăng tay 1 bài cụ thể: thêm `--record-id recXXXX` (bỏ qua cả bộ lọc lịch lẫn sổ lỗi).

### Bước 2 — ĐỌC checklist rồi VIẾT bài HTML chuẩn SEO
**Đọc [references/seo-blog-checklist.md](references/seo-blog-checklist.md) trước, bắt đầu từ mục "HÀNH VĂN, GIỌNG BLOG"** (luật giọng: blog chạy **làn CỬA HÀNG**, xưng "bên em" gọi "anh chị", không kể chuyện đời, cấm 4 dạng văn AI; gốc ở `wiki/concepts/Hai làn giọng.md`). Dùng brief trong `manifest.json`
(title, focus_keyword, secondary_keywords, outline, meta, internal_links, backlink_targets, target_words…).

Viết file `output/YYYY-MM-DD-dang-bai-seo/<slug>.html` — **chỉ phần thân bài** (không cần <html>/<head>), tuân thủ:
- **Headline/H1**: từ khoá chính ở đầu, có số + lợi ích + lời hứa. **TIÊU ĐỀ BÀI VIẾT HOA TOÀN BỘ** (luật 17/09/2026, áp cho mọi bài cũ và mới): publisher tự ép `title` về chữ hoa nên brief/manifest viết thường vẫn được; JSON-LD Article do Yoast sinh từ `title` nên tự khớp (publisher không tự viết JSON-LD). Meta title Yoast giữ chữ thường.
- **Sapo**: câu đầu trả lời thẳng câu hỏi của từ khoá, từ khoá chính trong **100 từ đầu**. Không mở bằng câu hỏi gây sốc (sửa 24/09/2026 theo research AEO). Ngay sau sapo là H2 "Trả lời nhanh: …".
- **Heading H2/H3** theo Outline; **≥ 2 H2 là câu hỏi người mua** có "?" (lấy từ People Also Ask trong brief); câu đầu mỗi H2 trả lời luôn điều heading hỏi. **≥ 1 bảng hoặc danh sách.**
- Từ khoá tự nhiên, không nhồi; độ dài **>= số từ mục tiêu** (mặc định ~1500-2000) nhưng đủ ý thì dừng, không độn (AI không chấm theo độ dài); đoạn 3-5 dòng.
- **Ảnh thân bài — quy trình 4 bước (chốt 18/09/2026):** chọn ảnh → **mở từng tấm ra nhìn** → đặt tên file mô tả đúng thứ nhìn thấy → mới viết alt và caption. ⛔ **Nguồn ảnh chốt 18/09: dùng `raw/kho-anh-classique/1-anh-goc`, KHÔNG dùng `2-anh-co-moc`** (mộc kiểu cũ, xấu, và gây ảnh hai mộc). Bản che serial lưu ở thư mục không có chữ `co-moc`. Ảnh cũ trên WP đã sửa thì đăng lại kèm `--thay-anh`, nếu không publisher tái dùng media cũ và ảnh **không đổi**. Publisher có **cổng alt-khớp-ảnh** chặn khi tên file và alt không trùng chữ nào, và **tự ép** `width/height/loading/decoding/class/style="max-width:100%"` nên không cần gõ tay mấy thuộc tính đó.
- **Ảnh thân bài**: dùng placeholder `__IMG1__`, `__IMG2__`… ở `src`, bọc `<figure><img src="__IMG1__" alt="<tả đúng ảnh>"><figcaption>…</figcaption></figure>`. **Alt tả đúng thứ trong ảnh**, từ khoá chính có ở alt ảnh #1 và chỉ ở ảnh khác khi tự nhiên; cấm gắn đuôi từ khoá vào mọi alt. Publisher chép alt này sang thư viện media, thay placeholder bằng URL thật; ảnh #1 = featured.
- **Ảnh**: dựng bằng `scripts/anh-4x3.py` → 4:3 1600x1200, đóng mộc **logo nhỏ góc phải dưới, nền trong suốt, kèm chữ THE CLASSIQUE, đậm 40%** (mặc định của script, chốt 17/09/2026; kiểu logo to giữa ảnh 16/09 đã bỏ) CHỈ cho ảnh của mình, **WebP ≤200KB**; mục ảnh đại diện thêm `"og": true` để ra **ảnh chia sẻ 1200x630** rồi ghi vào manifest `"og_image": {"path": "...", "filename": "...-chia-se.jpg"}`. Thiếu `og_image` thì publisher tự cắt từ ảnh #1.
- **Bài TIN TỨC (chuỗi E) có sản phẩm mới mà kho chưa có ảnh** (luật 17/09/2026): ĐƯỢC lấy ảnh từ trang khác (ưu tiên ảnh hãng cấp cho báo: bài báo thời trang, trang hãng). Chỉ lấy ảnh **KHÔNG có dấu mộc/watermark** của bên khác (mở ảnh ra xem trước; không xoá mộc người khác). Tải về `<thư mục bài>/nguon-web/`, ảnh vuông thì độn nền cùng màu cho đủ 4:3 để không cắt mất sản phẩm, rồi dựng bằng `anh-4x3.py` với `"nguon": "<Hãng>"` trong từng mục spec → **KHÔNG đóng mộc The Classique lên ảnh bên ngoài** (chốt lại 17/09/2026: đóng logo mình lên ảnh hãng là nhận vơ + nặng thêm lỗi bản quyền). **Caption BẮT BUỘC ghi nguồn ở cuối**: `Nguồn ảnh: <Hãng>, qua <a href="<link bài gốc>" target="_blank" rel="noopener"><Tên trang></a>.` Ảnh thật của bên em vẫn ghi "Ảnh thật tại The Classique". Bài mẫu: `output/2026-09-17-viet-chuoi-bai-seo/van-cleef-alhambra-men-hong/` (spec-tin-tuc.json).
- **Internal links**: 2-3 link nội bộ (anchor chứa từ khoá) lấy từ `internal_links`. **External**: ≥ 2 link "web mạnh", trang sâu cùng chủ đề (gợi ý từ `backlink_targets`), mạng xã hội không tính.
- **Kết luận** < 200 từ, không ý mới, truyền cảm hứng + câu cuối dễ nhớ.
- **2 CTA** (giữa + cuối bài) gắn UTM: `?utm_source=blog&utm_medium=post&utm_campaign=<slug>&utm_content=cta-giua-bai|cta-cuoi-bai`.
- **CẤM**: ký tự em dash "—", emoji, trích dẫn/viết tin báo.
- **E-E-A-T & YMYL (bắt buộc, theo `CLAUDE.md` mục 11)**: mỗi bài có ≥1 **bằng chứng trải nghiệm thật** (ca thẩm định/thu mua có thật, ẩn danh, không bịa) + ≥2 **external link uy tín** (trang sâu) + 2-3 internal link. **CẤM** hứa hẹn giá trị ("chắc chắn lên giá", "đầu tư chắc thắng", "giữ giá tuyệt đối"), phán thật/giả qua ảnh, và **mọi con số sổ sách Classique** (giá bán/giá thu của bên em, doanh thu, biên lãi, tồn kho, giá trung vị). 🔺 **Giá tham khảo từ nguồn công khai thì ĐƯỢC viết** (niêm yết chính hãng, sàn bán lại quốc tế, đấu giá), bắt buộc ghi nguồn và thời điểm, nói rõ là mức tham khảo — luật 18/09/2026, câu mẫu ở `wiki/concepts/Kho đoạn mẫu.md` mục A4. Bài có nói giá trị bán lại → thêm **1-2 câu khuyến cáo** cuối bài. *(Author box "Về tác giả" do publisher tự chèn — không cần viết tay.)*
- **Chạy CỔNG VĂN trước khi sang Bước 3** (bắt buộc từ 18/09/2026):
  ```bash
  python3 van-hanh/cong-van/cham.py "output/YYYY-MM-DD-dang-bai-seo/<slug>.html"
  ```
  Đạt đủ mới được đăng: câu trung bình **25-40 từ** · câu trên 50 từ ≤10% (trần thêm 24/09/2026) · H2 "Trả lời nhanh" đoạn 50-70 từ, câu đầu ≤40 từ · ≥2 link ngoài trang sâu · ≥2 H2 câu hỏi · ≥1 bảng/danh sách (thêm 24/09/2026) · câu dưới 12 từ ≤15% · cụm rào ≤0,10 mỗi câu · câu tự nói về bài = 0. Lệch chỉ số nào thì mở `wiki/concepts/Kho đoạn mẫu.md` đúng mục tương ứng rồi sửa, đừng viết lại từ đầu. Chuẩn và lý do: `wiki/concepts/Sổ nhịp văn.md`.
- Rà mục "RÀ CUỐI TRƯỚC KHI PUBLISH" trong checklist trước khi sang Bước 3.

### Bước 3 — Đăng lên WordPress + cập nhật Lark
```bash
node ".claude/skills/hmh-AIOS-dang-bai-seo/scripts/publish-wordpress.mjs" \
  --manifest "output/YYYY-MM-DD-dang-bai-seo/manifest.json" \
  --html     "output/YYYY-MM-DD-dang-bai-seo/<slug>.html"
```
Publisher tự động: upload ảnh + set alt (lấy từ HTML), thay `__IMGk__`, **đẩy ảnh dựng trên máy ngược vào cột "File ảnh" của Base sau khi đăng** (luật 17/09/2026: Base luôn phải có ảnh; ảnh vốn tải từ Base thì bỏ qua; `--cap-nhat` không đẩy lại; bài cũ thiếu ảnh bù bằng `van-hanh/tool-anh-base/bu-anh-base.py --ghi`), **gắn ảnh chia sẻ 1200x630 vào Yoast (Facebook/Zalo/X)**, **chèn author box E-E-A-T** ("Về tác giả:
Anh Cả Hàng Hiệu (The Classique)" + tiểu sử + link MXH) vào cuối bài, **CỔNG CHẶN YMYL** — nếu bài có cụm
hứa hẹn phóng đại ("chắc chắn lên giá", "đầu tư chắc thắng", "giàu nhanh"…) hoặc con số giá (triệu/tỷ/đ) thì **KHÔNG đăng live** (`PUBLISH_FAIL`),
buộc sửa lời hoặc chạy lại `--allow-ymyl` để bỏ qua (chỉ khi false-positive), tạo bài
**publish** với slug + category + featured image + excerpt (=meta description), thử set Yoast focus keyword,
**verify status=publish**, rồi cập nhật record Lark → **Trạng thái "Đã đăng" + Link web + WordPress Media ID**.

> **Author box (E-E-A-T):** sửa tiểu sử/link tại hằng `AUTHOR` trong `publish-wordpress.mjs`. Muốn hiện
> **ảnh tác giả**: thêm `WP_AUTHOR_AVATAR=https://classique.vn/wp-content/uploads/....jpg` vào
> `.secrets/wordpress.env` (để trống = author box chỉ có chữ, tránh ảnh hỏng).

> **QUY TẮC DANH MỤC BẮT BUỘC:** mọi bài đăng **luôn** được gắn thêm danh mục **"BLOG"** (cộng vào danh mục
> riêng lấy từ trường "Danh mục WordPress"). Publisher tự xử lý qua hằng `FORCED_CATEGORY = 'BLOG'` trong
> `publish-wordpress.mjs` — tự tìm hoặc tạo danh mục "BLOG" rồi thêm id vào bài. Vì vậy người lên kế hoạch
> KHÔNG cần điền "BLOG" thủ công; chỉ điền danh mục con/chuyên đề. Muốn đổi tên danh mục bắt buộc → sửa
> `FORCED_CATEGORY`.
- In `PUBLISH_OK <url>` khi xong; `PUBLISH_FAIL <lý do>` + exit!=0 khi lỗi.
- **Sửa bài ĐÃ đăng** (viết lại, thay ảnh): thêm `--cap-nhat` → ghi đè tiêu đề/nội dung/ảnh/featured/Yoast vào đúng bài cùng slug (giữ post id, slug, ngày đăng). Không có cờ này thì publisher thấy trùng slug sẽ bỏ qua.
- Thử trước bằng `--dry-run` (không tạo bài thật) hoặc `--no-lark` (đăng nhưng không đụng Lark).

### Bước 4 — Lưu output + ghi sổ
- Tạo file mô tả `output/YYYY-MM-DD-dang-bai-seo/YYYY-MM-DD-dang-bai-seo.md` (frontmatter `type: output`):
  câu hỏi gốc, bài đã chọn, link đã đăng, ảnh, trạng thái Lark.
- Cập nhật `index.md` (mục Output) + ghi 1 dòng `log.md`:
  `## [YYYY-MM-DD] query | Đăng bài SEO "<tiêu đề>" — <link hoặc lý do dừng>`

---

## Tự động hoá — Scheduled Task 11:00 mỗi ngày

- `scripts/run-daily.ps1` — **kiến trúc TÁCH NODE** (sửa 2026-06-18, sau khi `claude -p` headless bị cổng
  duyệt quyền chặn mọi lệnh node dù `--permission-mode bypassPermissions` → 14–18/06 không đăng được bài nào):
  - **Bước 1** (`select-article.mjs`) + **Bước 3** (`publish-wordpress.mjs`) → chạy THẲNG bằng `node` trong
    PowerShell (không qua cổng quyền Claude → không bao giờ bị chặn).
  - **Bước 2** (viết HTML) → vẫn `claude -p` với **cùng prompt + cùng checklist**, nhưng **nhả HTML ra STDOUT**
    (prompt + checklist nhúng sẵn qua stdin, chỉ đọc — không dùng tool ghi file); PowerShell tự ghi `bai-viet.html`.
  - **Bước 4** (output `.md` + `log.md`) → PowerShell ghi deterministic.
  - Vẫn có **tiền kiểm** (`.secrets/wordpress.env`) + **hậu kiểm** (`PUBLISH_OK`/"không có bài") + **cảnh báo Lark**
    + nối tiếp **lan toả Facebook**. Log ở `logs/YYYY-MM-DD.log`. Bản cũ: `run-daily.ps1.bak-2026-06-18`.
  - **GOTCHA bắt buộc:** (1) file phải lưu **UTF-8 CÓ BOM** (PS 5.1 chạy `-File` đọc no-BOM → ANSI → mojibake +
    vỡ cú pháp); (2) `--imgdir` truyền cho select-article phải **TƯƠNG ĐỐI** (lark-cli +record-download-attachment
    đòi `--output` relative-within-cwd; tuyệt đối → "unsafe output path" → ảnh không tải).
- `scripts/register-task.ps1` — đăng ký task **"SEO - Dang Bai 11AM"** chạy 11:00 hằng ngày:
  ```powershell
  powershell -ExecutionPolicy Bypass -File ".claude/skills/hmh-AIOS-dang-bai-seo/scripts/register-task.ps1"
  ```
- Chạy thử ngay: `Start-ScheduledTask -TaskName "SEO - Dang Bai 11AM"`
- Gỡ: `Unregister-ScheduledTask -TaskName "SEO - Dang Bai 11AM" -Confirm:$false`

> Task chạy khi máy bật + user đăng nhập. Muốn 24/7 thật → chuyển lên cloud (xem [[aios-gateway]] / AnyCross).

---

## Tham chiếu scripts / references

- `scripts/select-article.mjs` — quét Lark Base, chọn bài đến hạn, tải + NÉN ảnh, in manifest JSON.
- `scripts/lib-image.mjs` — nén ảnh web-friendly bằng ffmpeg (dò ffmpeg, scale ≤1600px, JPEG q3). Dùng chung.
- `scripts/repair-post-images.mjs` — VÁ ảnh cho bài ĐÃ đăng thiếu ảnh (upload + featured + chèn figure).
- `scripts/publish-wordpress.mjs` — đăng WP REST + cập nhật Lark (headless-safe).
- `scripts/thay-anh-bai-da-dang.mjs` — thay ảnh bài ĐÃ ĐĂNG (đổi mộc, che lại...) không đổi link: upload ảnh mới, thay URL trong nội dung, đặt lại ảnh đại diện + ảnh chia sẻ Yoast, in media cũ để xoá tay.
- `scripts/anh-4x3.py` — cắt ảnh 4:3 1600x1200 + đóng mộc góc phải 40% (bỏ qua mục có `"nguon"`) + xuất WebP ≤200KB; `"og": true` ra thêm ảnh chia sẻ 1200x630; `--chi-chia-se` chỉ làm ảnh chia sẻ.
- `scripts/royal-mcp.mjs` — upload ảnh qua plugin Royal MCP (base64 JSON, né rào upload file). CLI: `node royal-mcp.mjs upload <file> "<alt>"`.
- `scripts/run-daily.ps1` · `scripts/register-task.ps1` — bộ chạy & đăng ký lịch 11:00.
- `references/seo-blog-checklist.md` — **tri thức SEO Blog lõi** (đọc trước khi viết).

---

## Lưu ý / gotcha

- **WordPress connector claude.ai KHÔNG dùng cho tự động** — luôn đi đường REST API (App Password). Đây là
  nguyên nhân suốt 08–13/06 bài viết xong mà không đăng được.
- **Yoast focus keyword qua REST**: chỉ "ăn" nếu site đăng ký `show_in_rest` cho meta `_yoast_wpseo_*`
  (thường cần 1 mu-plugin nhỏ). Nếu chưa, publisher vẫn đăng bài và **on-page SEO trong nội dung vẫn đủ**
  (từ khoá ở title, H1, sapo, alt, slug, density) — đó mới là thứ quyết định ranking. Đặt focus keyword tay
  trong Yoast khi cần gate xanh tuyệt đối.
- **Ảnh lớn được NÉN, KHÔNG bị loại** (sửa 2026-06-29 sau sự cố 20-28/06: máy ảnh xuất 6-10MB, code cũ bỏ
  thẳng ảnh >5MB → 4-5 bài đăng không ảnh). `lib-image.mjs` (ffmpeg, tự dò trong WinGet\Packages vì không
  có shim PATH) nén về max 1600px/JPEG. ffmpeg lỗi/thiếu → giữ ảnh gốc nếu ≤9MB. Vá bài đã đăng thiếu ảnh:
  `repair-post-images.mjs --manifest <manifest.json>` (upload + set featured + chèn figure, KHÔNG tạo bài mới).
- Nếu record **không có "File ảnh"** trong Base, bài vẫn đăng nhưng không có ảnh — báo trong log để người lên
  kế hoạch bổ sung ảnh vào field "File ảnh".
- **ẢNH — đã giải qua Royal MCP** (2026-06-14): site CHẶN upload file/binary qua `POST /wp/v2/media` (403 WAF).
  Giải pháp: plugin **Royal MCP** (active) có tool JSON-RPC `wp_upload_media` nhận **ảnh base64 trong JSON** →
  qua được mà KHÔNG lách bảo mật. `scripts/royal-mcp.mjs` lo việc này; publisher gọi tự động. Cần
  `ROYAL_MCP_API_KEY` trong `.secrets/wordpress.env` (header `X-Royal-MCP-API-Key`; endpoint
  `/wp-json/royal-mcp/v1/mcp`). Nếu THIẾU key → ảnh fail, publisher tự bỏ `<figure>` và đăng **text-only**
  (vẫn chuẩn SEO on-page). KHÔNG tìm cách lách WAF (POST file vẫn 403, đúng và để nguyên).
- **lark-cli trên máy này**: Node không trên PATH; spawn `.cmd` từ Node cần `shell:true` (đã xử lý trong script).
  Xem [[lark-cli-setup]].
- **Ngày đăng để quá khứ** vẫn được coi là "đến hạn" và sẽ đăng (xử lý hàng tồn). Muốn bài tương lai thì để
  Ngày đăng ở tương lai.

---

## Output (theo CLAUDE.md)

Mỗi lần chạy = 1 thư mục `output/YYYY-MM-DD-dang-bai-seo/` gồm: `manifest.json`, `<slug>.html`, `img/`,
file mô tả `.md`. Cập nhật `index.md` + `log.md`. SOP bàn giao nhân sự: [[sop-tu-dong-dang-bai-theo-lich]].
