# Classique OS

Buồng lái AI cho chủ doanh nghiệp nhỏ, chạy thẳng trên **Lark Base**. Giao diện tự dựng từ cấu trúc Base của bạn: mỗi bảng là một màn hình, mỗi cột hiện đúng kiểu cột Lark. Bên cạnh là một trợ lý AI (Claude Code, Codex hoặc model qua API key) dùng được mọi kết nối bạn bật: Lark, Pancake POS, Meta Ads, WordPress và các MCP ngoài.

## Có gì

- **Trợ lý**: khung chat có giọng nói (Edge TTS tiếng Việt), chế độ ChatGPT Live, đồ thị bộ não. Lệnh ghi của AI chạy theo mức quyền từng kết nối: Chỉ đọc, Đề xuất (phải bấm Duyệt), Toàn quyền.
- **Điều hành**: 6 tab chỉ số (Tổng quan, Bán hàng, Vận hành, Khách & Lead, Marketing, Tài chính) lấy số thật từ Lark và Meta.
- **Bảng**: lưới, Kanban, ngăn chi tiết cho mọi bảng trong Base. Có bản đệm SQLite để không đốt hạn mức API Lark.
- **Kết nối (MCP Hub)**: Lark, Pancake, Meta Ads, WordPress, cộng thư viện MCP ngoài (Composio, Google Sheets, Search Console, NotebookLM...).
- **Models**: Claude Code, Codex (ChatGPT) dùng gói đăng nhập sẵn; hoặc OpenRouter, OpenAI, Anthropic, Gemini, Groq, Ollama bằng API key.
- **Store**: kỹ năng `hmh-*` (marketing, bán hàng, vận hành) cài một chạm cho trợ lý.
- **Bộ não**: thư mục markdown hoặc repo GitHub làm kiến thức và trí nhớ dài hạn cho trợ lý.
- **Bóc âm**: gỡ băng trực tiếp hoặc từ file ghi âm.

## Cài

Cần Python 3.11 trở lên, `git`, và ít nhất một bộ não AI: [Claude Code](https://claude.com/claude-code) (`claude auth login`) hoặc Codex (`codex login`), hoặc một API key nhập ở trang Models.

```bash
git clone https://github.com/thinlevn-cpu/classique-os.git
cd classique-os
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp ho-so.example.json ho-so.json        # rồi sửa: tên bạn, doanh nghiệp, bảng Lark
printf "%s\n" "mat-khau-it-nhat-10-ky-tu" | ./.venv/bin/python server.py dat-mat-khau ten-dang-nhap
./.venv/bin/python server.py
```

Mở http://127.0.0.1:8790 và đăng nhập. Cần ffmpeg nếu muốn bóc âm từ file.

## Kết nối dữ liệu

Vào trang **Kết nối**, mở thẻ từng dịch vụ, dán khoá rồi bấm **Kiểm tra**. Khoá được ghi vào `.env` trên máy chủ (chmod 600), không bao giờ gửi ra trình duyệt. Danh sách khoá xem ở `.env.example`.

**Lark Base**: tạo app nội bộ ở Lark Developer Console, cấp quyền Bitable, thêm app vào Base (Share > thêm app với quyền sửa). Nhập App ID, App Secret và mã Base (đoạn sau `/base/` trong link).

## Hồ sơ (`ho-so.json`)

Mọi thông tin riêng của bạn nằm ở `ho-so.json` (không lên git). Không có file này OS vẫn chạy, chỉ chào chung chung và trang Điều hành để trống.

| Trường | Ý nghĩa |
|---|---|
| `ten_chu`, `goi_chu` | Tên bạn và cách trợ lý gọi bạn (anh, chị, bạn...) |
| `doanh_nghiep`, `mo_ta_doanh_nghiep` | Tên và một câu mô tả doanh nghiệp, đưa vào lời dặn cho trợ lý |
| `tu_rieng` | Tên thương hiệu, thuật ngữ để bóc âm viết đúng chính tả |
| `lark.ten_base` | Tên Base hiện trên thẻ kết nối |
| `lark.phan_he`, `lark.phan_he_tay` | Gom bảng theo số đầu tên bảng (vd `2.3 Đơn hàng` thuộc phân hệ `2`) |
| `lark.chi_doc_tien_to` | Bảng có tên bắt đầu bằng các tiền tố này luôn chỉ đọc (bảng có chữ "tự động" luôn chỉ đọc) |
| `lark.bang_chinh` | Bảng hay dùng kèm id, để trợ lý khỏi phải dò |
| `lark.bang` | Bảng nào là đơn, khách, lead, sản phẩm, công việc, SEO, nhật ký, thu chi, dòng tiền cho trang Điều hành |

Trang **Điều hành** đọc tên cột theo mẫu Base "CRM Anh Cả" (vd `Ngày tạo`, `Tổng tiền`, `Trạng thái`, `Còn thu`, `Kênh`, `Sale`). Base của bạn đặt tên cột khác thì phần đó ra số 0; các trang còn lại (Bảng, Trợ lý, Kết nối) chạy với mọi Base.

## Đưa lên máy chủ

1. Clone và cài như trên vào máy chủ Linux, chạy dưới một user riêng.
2. Sửa rồi chép `deploy/classique-os.service` vào `/etc/systemd/system/`, chạy `systemctl enable --now classique-os`.
3. Trỏ tên miền về máy chủ, sửa tên miền trong `deploy/Caddyfile` rồi đưa vào cấu hình [Caddy](https://caddyserver.com) (tự có HTTPS).
4. Ghi `OS_PUBLIC_URL=https://ten-mien-cua-ban` vào `.env`.

OS chỉ nghe `127.0.0.1`, nên chỉ ra Internet qua Caddy, và có màn đăng nhập riêng (phiên ký HMAC, chặn đoán mật khẩu).

## Những file không lên git

`.env`, `ho-so.json`, `cau-hinh.json`, `tai-khoan.json`, khoá model và MCP (`khoa-*.json`), bản đệm `cache.db`, lịch sử hội thoại, thư mục `brains/`. Xem `.gitignore`.

## Ghi công

- Kỹ năng `hmh-*` trong `kho/skills` thuộc hệ thống kỹ năng của Hoàng Minh Hóa.
- Danh mục MCP (`mcp-catalog.json`) và cách tổ chức trang Models học theo Javis OS.
