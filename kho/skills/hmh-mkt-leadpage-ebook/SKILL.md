---
name: hmh-mkt-leadpage-ebook
description: Tạo LEADPAGE EBOOK theo design chuẩn chuyển đổi cao từ 2 nguyên liệu — ẢNH BÌA MOCKUP (giữ nguyên không chỉnh) + DANH SÁCH VẤN ĐỀ/nỗi đau — rồi deploy lên hosting tĩnh (Cloudflare Pages/Vercel/Netlify). Cấu trúc khóa cứng trong template: hero mockup full-width + nút TẢI NGAY đỏ đè ảnh → headline đỏ gọi đúng đối tượng → card trắng bo tròn nỗi đau icon sao đỏ → "EBOOK NÀY SẼ GIÚP BẠN" → ribbon gradient đỏ-tím → countdown 4 vòng tròn đỏ evergreen → form 3 trường validate SĐT VN → footer đen thương hiệu CỦA BẠN → hiệu ứng động (nút đập nhịp, vệt sáng, reveal khi cuộn) + toast social proof góc trái chạy liên tục. TRƯỚC KHI BUILD BẮT BUỘC HỎI người dùng thông tin thương hiệu (tên, địa chỉ, hotline, email) — không dùng thông tin mẫu. Dùng khi người dùng muốn: làm leadpage cho ebook, trang tải ebook, đưa bìa mockup + vấn đề ra trang thu lead. Kích hoạt khi có từ: leadpage ebook, trang tải ebook, làm ebook mới, bìa mockup ra leadpage, trang thu lead ebook, ebook leadpage.
---

# Skill: Leadpage Ebook — bìa mockup + vấn đề → trang thu lead hoàn chỉnh

Đưa **1 ảnh bìa mockup + danh sách vấn đề** → ra **leadpage ebook theo design đã thắng thực chiến**
→ deploy lên hosting tĩnh của BẠN (Cloudflare Pages / Vercel / Netlify đều được).

## Triết lý gốc / Nguồn

- **Nguyên lý squeeze page** (Russell Brunson, DotCom Secrets): trang chỉ làm 1 việc — lấy thông tin;
  không link thoát; mọi nút đều scroll về form.
- Design nhân bản từ trang thực chiến đã chạy quảng cáo có chuyển đổi. `references/template.html`
  là **nguồn design duy nhất** — sửa file đó là MỌI trang sau đổi theo (đổi có kiểm soát).
- Cơ chế đã chứng minh giữ nguyên: countdown **evergreen** localStorage riêng từng khách · validate
  SĐT VN ngay trên form · honeypot chống bot · event CompleteRegistration định giá được.

## Tiền điều kiện

- Python 3 (chỉ stdlib) + Chrome (để chụp preview).
- **Ảnh bìa mockup có sẵn trên đĩa** (script copy nguyên trạng, KHÔNG chỉnh sửa ảnh).
- Tài khoản hosting tĩnh bất kỳ (khuyến nghị Cloudflare Pages — miễn phí, có wrangler CLI).

## Quy trình thực thi

1. **HỎI NGƯỜI DÙNG thông tin thương hiệu** — BẮT BUỘC, không được bịa, không được dùng dữ liệu mẫu:
   - **Tên thương hiệu / tên bạn** (hiện ở footer, chữ vàng): ví dụ `NGUYỄN VĂN A`.
   - **Địa chỉ** (bỏ trống nếu không muốn hiện).
   - **Hotline** (bỏ trống nếu không muốn hiện).
   - **Email liên hệ** (bỏ trống nếu không muốn hiện).
   - **Chữ trên nút đăng ký** (mặc định `NHẬN EBOOK MIỄN PHÍ`) và **chữ ribbon** (mặc định
     `QUÀ TẶNG ĐẶC BIỆT`) — người dùng có thể đổi theo giọng thương hiệu riêng.
2. **Thu thập input ebook** (hỏi phần thiếu — KHÔNG bịa pixel/endpoint):
   - Ảnh bìa mockup (đường dẫn file) · tên ebook · slug URL (không dấu, ví dụ `banhangkhongloso`).
   - Headline đối tượng + 3–5 nỗi đau (AI viết draft theo công thức nếu người dùng chưa có, đưa duyệt).
   - Tùy chọn: pixel FB/GA4/TikTok, form_endpoint (nơi nhận lead), popup, tên toast.
3. **Ghi `config-ebook.json`** (mẫu: `references/config.example.json`) với thông tin đã hỏi ở bước 1–2.
4. **Build** (idempotent — chạy lại ghi đè sạch):
   ```bash
   python3 <thư-mục-skill>/scripts/build_ebook_leadpage.py \
     --config config-ebook.json --out site
   ```
5. **Preview + CỔNG DUYỆT (người dùng quyết — chưa duyệt KHÔNG deploy):**
   ```bash
   # macOS:
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
     --hide-scrollbars --window-size=800,2600 --virtual-time-budget=5000 \
     --screenshot=preview.png "file://$(pwd)/site/index.html"
   # Windows: thay bằng "C:\Program Files\Google\Chrome\Application\chrome.exe"
   ```
   (virtual-time-budget 5000 để bắt được toast góc trái đang hiện.)
6. **Deploy sau khi duyệt** — ví dụ Cloudflare Pages:
   ```bash
   npx wrangler pages deploy site --project-name <ten-du-an> --commit-dirty=true
   ```
   (Lần đầu wrangler sẽ hỏi đăng nhập + tạo project. Muốn nhiều ebook chung 1 domain: gom mỗi ebook
   vào 1 thư mục con của một site-root rồi deploy cả site-root.)
7. **Nghiệm thu thật:** `curl -sI <url-live>` phải 200 + mở trang kiểm tra đúng `<title>`.

## Thu lead an toàn (cùng tên miền, không lộ khoá)

TUYỆT ĐỐI không gọi Lark/CRM thẳng từ trình duyệt — làm vậy là dán app_secret lên trang.
Dùng `references/function-lark-lead.js`: chép vào `site/functions/api/lead.js`, đặt
`"form_endpoint": "/api/lead"` trong config. Function tự: kiểm lại họ tên + SĐT VN ở máy chủ,
nuốt bot qua honeypot `website`, chống trùng 24h theo SĐT + ebook (cập nhật chứ không nhân dòng),
và **cập nhật không bao giờ xoá trắng ô đã có** (giữ nguồn quảng cáo ghi ở lần gửi đầu).
Khoá đặt bằng biến môi trường; `LARK_APP_SECRET` phải là **secret**, không nằm trong mã.

⚠ BẪY DEPLOY: phải `cd site` rồi `wrangler pages deploy .`. Chạy từ thư mục cha thì wrangler
BỎ QUA `functions/` và `/api/lead` trả 405.
⚠ Đừng để `.dev.vars` trong thư mục deploy — nó có thể bị đẩy lên thành file tĩnh và lộ secret.
   Chạy thử tại máy thì truyền qua `wrangler pages dev . --binding KEY=VALUE`.

## Tham chiếu scripts / references

- `scripts/build_ebook_leadpage.py` — compiler config → `site/index.html` (stdlib, idempotent,
  báo lỗi nếu còn slot `{{…}}` chưa thay, báo lỗi nếu thiếu thông tin thương hiệu).
- `references/template.html` — design khóa cứng (mọi token màu/animation/JS đã test thật).
- `references/config.example.json` — đủ mọi trường; các trường thương hiệu để trống chờ hỏi người dùng.
- `references/function-lark-lead.js` — Cloudflare Pages Function thu lead → Lark Base (đã kiểm thật).

## Lưu ý / gotcha

- **Ảnh mockup giữ nguyên 100%** — script chỉ copy. Ảnh nặng (>1MB) nên nén webp TRƯỚC khi đưa
  vào config nếu chạy ads (hỏi người dùng trước khi nén — đổi file là đổi hình).
- `pains` là HTML nhẹ (cho phép `<b>`); `audience_headline` cũng vậy — KHÔNG escape, đừng nhét input lạ.
- `form_endpoint` trống → popup vẫn hiện nhưng **lead không được lưu** (chỉ console.warn). Nối endpoint
  (Google Sheets Apps Script / Lark Base / CRM webhook…) trước khi chạy ads.
- **Toast là danh sách MẪU MÔ PHỎNG** (14 tên mặc định) — nói rõ với người dùng; đổi qua `toast_names`
  trong config (khuyến nghị dùng tên khách thật đã xin phép).
- Countdown evergreen theo `location.pathname` → mỗi ebook (path riêng) tự có đồng hồ riêng.

## Output

`config-ebook.json` + `site/` (index.html + assets) + `preview.png` + URL live sau khi deploy.
