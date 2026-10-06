---
name: hmh-AIOS-anh-lark-wordpress
description: |
  Tải ảnh từ tin nhắn Lark (image_key dạng img_v3_...) xuống local rồi upload lên WordPress Media Library, trả về attachment ID + URL sẵn sàng nhúng vào bài.
  Dùng khi người dùng gửi ảnh qua Lark bridge và muốn đưa lên web classique.vn.
  Kích hoạt khi nghe: "đưa ảnh lên web", "upload ảnh lên WordPress", "ảnh Lark lên web", "lấy hình đưa lên bài", "lấy tất cả ảnh lên bài".
---

> **BẢN BÀN GIAO HỌC VIÊN** — mọi token/mật khẩu/tên miền cá nhân đã được gỡ.
> Trước khi dùng: đọc `HUONG-DAN-CAI-DAT.md` ở thư mục gốc bộ bàn giao và điền cấu hình CỦA BẠN
> vào `.secrets/wordpress.env` + `.secrets/seo-web.env`.

# Skill: Đưa ảnh từ Lark lên WordPress

Upload ảnh từ tin nhắn Lark bridge → WordPress Media Library trong một lệnh.

## Khi nào dùng / KHÔNG dùng

**Dùng khi:**
- Anh gửi ảnh qua Lark và muốn chúng xuất hiện trên web
- Cần embed ảnh thực tế vào bài WordPress
- Ảnh có dạng img_v3_... (message image) từ bridge chat

**KHÔNG dùng khi:**
- Ảnh ở Lark Base attachment (dùng lark-cli base +record-download-attachment thay thế)
- Ảnh đã có URL public sẵn (dùng wp_upload_media_from_url trực tiếp)

## Tiền điều kiện

- lark-cli đã auth (lark-cli auth status → status: ready)
- node v18+ (fetch built-in)
- Bridge chat ID: <CHAT_ID_BRIDGE_CUA_BAN> (CONTROL_CHAT_ID)
- WP: classique.vn / WP_USER + WP_APP_PASSWORD điền trong .secrets/wordpress.env (KHÔNG ghi vào file này)

## Quy trình thực thi

### Bước 1 — Nhận image keys từ conversation

Image keys dạng img_v3_02145_xxxxxxxx-... xuất hiện trong context khi anh gửi ảnh.
Nếu không thấy, tìm trong bridge chat:

```powershell
lark-cli im +chat-messages-list --chat-id "<CHAT_ID_BRIDGE_CUA_BAN>" --as bot --page-size 20 2>&1 | Select-String "img_v3|message_id"
```

### Bước 2 — Chuẩn bị (QUAN TRỌNG: không dùng path có Unicode)

```powershell
[System.IO.File]::WriteAllText("$env:USERPROFILE\params-img-type.json", '{"type":"image"}', [System.Text.Encoding]::ASCII)
New-Item -ItemType Directory -Force "$env:USERPROFILE\lark-img-tmp" | Out-Null
```

### Bước 3 — Download từng ảnh

```powershell
Set-Location "$env:USERPROFILE"   # BẮT BUỘC cd về thư mục ASCII

$msgId = "om_xxx..."
$imgKey = "img_v3_02145_xxx..."
$name = "ten-mo-ta-keyword-seo"

lark-cli api GET "/open-apis/im/v1/messages/$msgId/resources/$imgKey" --params "@./params-img-type.json" --as bot -o "./lark-img-tmp/$name.jpg" 2>&1
```

### Bước 4 — Upload lên WordPress

```powershell
node "<thư-mục-dự-án>\.claude\skills\hmh-AIOS-anh-lark-wordpress\scripts\upload-lark-images-to-wp.mjs" "$env:USERPROFILE\lark-img-tmp\anh-1.jpg" "$env:USERPROFILE\lark-img-tmp\anh-2.jpg"
```

Output: {"id":2607,"url":"https://classique.vn/wp-content/uploads/.../anh-1.jpg"}

### Bước 5 — Nhúng vào bài

Dùng attachment ID từ bước 4 với MCP wp_update_post (featured_media) hoặc nhúng trực tiếp vào content HTML.

### Bước 6 — Dọn dẹp

```powershell
Remove-Item "$env:USERPROFILE\lark-img-tmp\*" -Force
Remove-Item "$env:USERPROFILE\params-img-type.json" -Force
```

## Gotchas

| Vấn đề | Giải pháp |
|---|---|
| --params: cannot read file | cd về $env:USERPROFILE (không có Unicode) trước khi chạy lark-cli |
| --file must be a relative path | Dùng ./params-img-type.json (relative), không phải absolute |
| Invalid request param (bot) | Thiếu params-img-type.json với {"type":"image"} — bắt buộc |
| user access token not support | API /im/v1/images/{key} KHÔNG hỗ trợ user token — phải --as bot |
| batch_get_tmp_download_url trả rỗng | Chỉ dùng với Drive file tokens, KHÔNG phải message image keys |

## Liên kết liên quan

- Memory: lark-attachment-to-wordpress-images (cho Base file tokens khác với message images)
- Memory: cau-noi-lark-claude (bridge chat ID)
- Script: scripts/upload-lark-images-to-wp.mjs (hàm uploadImages tái sử dụng)
