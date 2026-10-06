# HƯỚNG DẪN CÀI ĐẶT — Bộ Skill SEO Web (bản bàn giao học viên)

Bộ này gồm **4 skill** chạy trọn quy trình: **nghiên cứu từ khoá → nạp brief vào Lark Base → AI viết bài chuẩn SEO → tự động đăng WordPress mỗi ngày → đưa ảnh từ Lark lên web**.

| Skill | Vai trò |
|---|---|
| `hmh-mkt-research-seo-web` | Giai đoạn 1: research từ khoá/chủ đề → ghi brief "Chờ viết" vào Lark Base |
| `hmh-AIOS-dang-bai-seo` | Giai đoạn 2: mỗi ngày lấy bài đến hạn → viết HTML chuẩn SEO → đăng WordPress → cập nhật Base |
| `hmh-AIOS-anh-lark-wordpress` | Phụ trợ: tải ảnh từ tin nhắn/Base Lark lên WordPress Media Library |
| `seo-web-writer` | Bản tài liệu quy trình 9 bước (dùng khi đăng tay qua connector claude.ai) |

> **Nguyên tắc bàn giao:** bộ này đã **gỡ toàn bộ dữ liệu cá nhân** của người hướng dẫn (token, mật khẩu, tên miền, webhook, đường dẫn máy). Mọi chỗ cần cấu hình đều đọc từ 2 file trong `.secrets/` — bạn điền thông tin CỦA BẠN vào đó, **không sửa code**.

---

## Bước 1 — Chép skill vào dự án của bạn

Chép 4 thư mục skill vào `.claude/skills/` trong thư mục dự án (thư mục bạn mở Claude Code):

```
<dự án của bạn>/
├── .claude/skills/
│   ├── hmh-AIOS-dang-bai-seo/
│   ├── hmh-mkt-research-seo-web/
│   ├── hmh-AIOS-anh-lark-wordpress/
│   └── seo-web-writer/
├── .secrets/          ← tạo ở Bước 4
└── output/            ← kết quả mỗi lần chạy
```

## Bước 2 — Cài công cụ nền

1. **Node.js v18+** — tải tại nodejs.org (scripts dùng `fetch` built-in).
2. **lark-cli** — cài và đăng nhập tài khoản Lark CỦA BẠN (`lark-cli auth status` phải ra `ready`).
   Nếu `lark-cli` không nằm trên PATH: đặt biến môi trường `LARK_CLI` trỏ tới file thực thi (Windows: `...\npm\lark-cli.cmd`).
3. **ffmpeg** (khuyến nghị) — để tự nén ảnh nặng về chuẩn web (~1600px). Thiếu ffmpeg thì ảnh ≤9MB vẫn dùng được nguyên bản.

## Bước 3 — Tạo Lark Base "Lịch bài SEO" của bạn

1. Tạo 1 Base mới trong Lark của bạn, thêm 1 bảng với các trường **đúng TÊN + đúng KIỂU** theo
   `hmh-mkt-research-seo-web/references/field-mapping.md` (21 trường brief + các trường hệ thống).
   Quan trọng nhất: `Tiêu đề bài viết`, `Từ khoá chính`, `Outline`, `Meta Title`, `Meta Description`,
   `URL Slug`, `Danh mục WordPress`, `Ngày đăng` (datetime), `File ảnh` (attachment),
   `Trạng thái` (select có option **"Chờ viết"** và **"Đã đăng"**), `Link web sau đăng`, `WordPress Media ID`.
2. Lấy **base_token**: mở Base trên trình duyệt, token là chuỗi trong URL (dạng `XxxXxXxXxXxXxXx...`).
3. Lấy **table_id**: `lark-cli base +table-list --base-token <token> --as user` → chuỗi `tblXXXX`.

## Bước 4 — Điền cấu hình vào `.secrets/`

Tạo thư mục `.secrets/` ở gốc dự án (thêm vào `.gitignore` — **tuyệt đối không commit**), rồi chép 2 file mẫu từ `.secrets-mau/` sang và điền:

**`.secrets/wordpress.env`** — kết nối website WordPress của bạn:
```
WP_URL=https://classique.vn
WP_USER=<tên đăng nhập wp-admin>
WP_APP_PASSWORD=<Application Password 24 ký tự>
# Tuỳ chọn:
# ROYAL_MCP_API_KEY=<key plugin Royal MCP — chỉ cần nếu site chặn upload media qua REST (403)>
# WP_AUTHOR_AVATAR=<URL ảnh đại diện tác giả trên WP Media>
```
> **Tạo Application Password:** vào `classique.vn/wp-admin` → Users → Profile → Application Passwords → đặt tên "Claude SEO" → copy chuỗi 24 ký tự.

**`.secrets/seo-web.env`** — Base + thông tin tác giả của bạn:
```
SEO_BASE_TOKEN=<base_token lấy ở Bước 3>
SEO_TABLE_ID=<table_id lấy ở Bước 3>
# Tuỳ chọn — author box E-E-A-T cuối mỗi bài:
AUTHOR_NAME=<Tên bạn>
AUTHOR_BIO=<2-3 câu giới thiệu trung thực về bạn>
AUTHOR_ABOUT_URL=<link trang giới thiệu trên web bạn>
AUTHOR_YOUTUBE=<link kênh YouTube của bạn — để trống nếu chưa có>
AUTHOR_TIKTOK=<link TikTok của bạn — để trống nếu chưa có>
# Tuỳ chọn — nhận cảnh báo vào nhóm Lark (tạo Custom Bot trong nhóm → copy webhook):
LARK_ALERT_WEBHOOK=
# Tuỳ chọn — nếu lark-cli không trên PATH:
# LARK_CLI=C:\Users\<ban>\AppData\Roaming\npm\lark-cli.cmd
```

## Bước 5 — Chạy thử

```bash
# 1. Nạp thử 1 brief (xem trước, không ghi):
node .claude/skills/hmh-mkt-research-seo-web/scripts/write-brief-to-base.mjs --in briefs.json --dry-run

# 2. Chọn bài đến hạn + tải ảnh:
node .claude/skills/hmh-AIOS-dang-bai-seo/scripts/select-article.mjs --imgdir "output/test/img" --out "output/test/manifest.json"

# 3. Đăng thử KHÔNG tạo bài thật:
node .claude/skills/hmh-AIOS-dang-bai-seo/scripts/publish-wordpress.mjs --manifest "output/test/manifest.json" --html "output/test/bai-viet.html" --dry-run
```

## Bước 6 — (Tuỳ chọn) Bật tự động 11:00 hằng ngày (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File ".claude/skills/hmh-AIOS-dang-bai-seo/scripts/register-task.ps1"
# Chạy thử ngay:  Start-ScheduledTask -TaskName "SEO - Dang Bai 11AM"
# Gỡ:            Unregister-ScheduledTask -TaskName "SEO - Dang Bai 11AM" -Confirm:$false
```

Task chạy khi máy bật + đã đăng nhập. `run-daily.ps1` cần `claude` CLI (mặc định tìm ở `%APPDATA%\npm\claude.cmd`; khác thì đặt biến `CLAUDE_CLI`) và Node (mặc định `C:\Program Files\nodejs\node.exe`; khác thì đặt `NODE_EXE`).

---

## An toàn & lưu ý

- `.secrets/` **không bao giờ** commit lên git, không gửi qua chat, không chụp màn hình.
- Mỗi học viên dùng **website + Base + tài khoản Lark của riêng mình** — không dùng chung token với người khác.
- Bài chủ đề tiền bạc/kinh doanh là **YMYL**: publisher có cổng chặn tự động các cụm hứa hẹn phóng đại ("giàu nhanh", "cam kết lợi nhuận"...) — đây là tính năng bảo vệ uy tín, đừng tắt trừ khi chắc chắn false-positive (`--allow-ymyl`).
- Muốn đổi tên skill theo thương hiệu riêng của bạn: đổi tên thư mục + trường `name:` trong `SKILL.md` (giữ nguyên phần còn lại).
