# HƯỚNG DẪN TRIỂN KHAI ADS AGENT — TỪ A ĐẾN Z (self-serve)

> Dành cho **học viên** tự dựng hệ thống chạy quảng cáo Facebook tự động RIÊNG của mình.
> Bạn KHÔNG cần biết lập trình. Làm theo đúng thứ tự dưới đây, mỗi bước có lệnh copy-paste.

---

## 0. Ads Agent là gì? (đọc 2 phút)

Một hệ thống để **bạn điền 1 dòng** trên một bảng Lark → hệ thống tự **dựng chiến dịch quảng cáo Facebook**
đúng chuẩn (ở trạng thái TẠM DỪNG, chờ bạn duyệt) → rồi **tự canh tối ưu 3 lần/ngày theo mức LÃI của bạn**,
và mọi quyết định quan trọng (tăng tiền, tắt, đổi nội dung) đều **hỏi bạn duyệt qua tin nhắn Lark**.

Nguyên tắc lõi: **"Facebook là tài xế giỏi, Ads Agent là kế toán + gác cổng ngồi cạnh."**
Facebook đã giỏi phần *tạo & nhắm mục tiêu* (Advantage+) → ta không làm lại. Ta chỉ tự động hoá phần
Facebook KHÔNG làm: **quyết định theo lãi của bạn** (CPL/CPA/ROAS mục tiêu tính từ giá vốn) + **gác cổng** +
**giám sát nhiều chiến dịch** + **trí nhớ ngưỡng**.

---

## 1. Chuẩn bị (cài 1 lần)

| Cần có | Cách lấy |
|---|---|
| **Tài khoản Lark** + quyền tạo Base | larksuite.com |
| **lark-cli** đã cài & đăng nhập | xem `references` trong skill `lark-cli-setup`; kiểm tra `lark-cli --version` |
| **Node.js ≥ 18** | nodejs.org (LTS). Kiểm tra `node -v` |
| **Python 3** | python.org. Kiểm tra `python --version` |
| **Tài khoản quảng cáo Facebook** (Business) | business.facebook.com |
| **Token Meta (System User)** quyền `ads_management` + `pages_*` | Business Settings → System Users → Generate token |

> Chưa có token Meta? Vào **business.facebook.com → Cài đặt doanh nghiệp → Người dùng hệ thống → Tạo token**,
> tick các quyền `ads_management`, `ads_read`, `pages_manage_ads`, `pages_read_engagement`, `business_management`.

---

## 2. Sao chép Base mẫu "Ads Agent" về Lark của bạn

Base mẫu có sẵn **10 bảng + form đầu bài + các công thức tính ngưỡng**. Bạn chỉ cần **nhân bản**, không dựng tay.

1. Mở **link Base mẫu** do người bàn giao gửi (anh Hóa cấp link "Tạo bản sao"/template).
2. Bấm **··· (góc phải) → Tạo bản sao / Save as template → Lưu vào không gian của tôi**.
3. Mở bản sao của bạn. Nhìn URL: `https://<domain>.larksuite.com/base/**<BASE_TOKEN>**?table=...`
   → **chuỗi `<BASE_TOKEN>`** chính là thứ bạn điền ở bước 4.

> Không có link template? Có thể dựng lại Base từ các file mô tả trường trong `ads-engine/f-*.json` và
> `fields-chien-dich.json` — nhưng **cách nhân bản ở trên nhanh và an toàn hơn nhiều**, hãy ưu tiên.

10 bảng bạn sẽ thấy: **0. Tổng tư lệnh** (nơi bạn điền 1 dòng) · 1. Chiến dịch · 2. Nhóm quảng cáo ·
3. Quảng cáo/Creative · 4. Tệp đối tượng · 5. Số liệu hằng ngày · 6. Nhật ký · 7. Thư viện URL · 9. Pixel.

---

## 3. Mở thư mục công cụ & điền cấu hình

Toàn bộ công cụ nằm trong thư mục **`ads-engine/`**. Mở terminal (Git Bash) tại thư mục đó.

### 3a. Tạo file cấu hình
```bash
cp config.env.example config.env
```
Mở `config.env`, điền **4 giá trị** ở MỤC A & C:
- `B=` → dán **BASE_TOKEN** của bạn (lấy ở bước 2).
- `DOMAIN=` → phần trước `/base/` trong URL Base của bạn (vd `https://abc.sg.larksuite.com`).
- `CHAT=` → mã nhóm Lark nhận thẻ duyệt (dạng `oc_...`). Chưa có thì để trống (sẽ không gửi thẻ).
- `ACT=` → **số** tài khoản quảng cáo (chỉ phần số, vd `1234567890`).

### 3b. Tự dò mã các bảng (table_id)
```bash
node do-config.mjs
```
Lệnh này đọc Base của bạn, **tự điền** `T0..T9, T_NK` vào `config.env`. Thấy "🎉 Đủ hết" là xong.

### 3c. Điền token Facebook
```bash
cp .secrets/meta-ads.env.example .secrets/meta-ads.env
```
Mở `.secrets/meta-ads.env`, điền `META_ACCESS_TOKEN` và `META_AD_ACCOUNT_ID=act_…` (nhớ tiền tố `act_`).

> ⚠️ KHÔNG gửi `config.env` và `.secrets/meta-ads.env` cho ai — đó là chìa khoá tài khoản của bạn.

---

## 4. Kiểm tra hệ thống (chưa tốn tiền)

```bash
node engine.mjs demo            # in 5 kịch bản toán ngưỡng (HỌC/TĂNG/DUY TRÌ/SỬA/TẮT)
node vong-doi-chieu.mjs --demo  # in cây quyết định tối ưu theo lãi
```
Thấy các bảng số in ra gọn gàng = engine chạy tốt trên máy bạn.

---

## 5. Chạy chiến dịch đầu tiên

1. Mở Base → **Bảng 0 (Tổng tư lệnh)** → thêm **1 dòng**, điền tối thiểu: Tên lệnh/Sản phẩm · Ngày chạy ·
   Ngân sách ngày · Khu vực · Tuổi · Link quảng cáo (hoặc chọn từ Thư viện URL) · đính **ảnh/video** ·
   đặt **Trạng thái = "1. Chờ xử lý"**.
2. Tại `ads-engine/`, chạy:
   ```bash
   bash chay-tron-bo.sh
   ```
   Hệ thống sẽ: **Bước 2** dựng "giả chiến" trên Lark (Chiến dịch + Nhóm QC + Content + caption 4 phần) →
   **Bước 3** đẩy lên Facebook ở trạng thái **TẠM DỪNG (PAUSED)** → ghi `campaign_id` về Base + gửi thẻ Lark
   kèm link Ads Manager.
3. Vào **Ads Manager** kiểm tra chiến dịch (PAUSED). Ưng thì **BẬT** để chạy.

> Muốn làm từng bước: `bash buoc2-setup-lark.sh` rồi `bash buoc3-len-facebook.sh`.

---

## 6. Bật chế độ tự canh tối ưu 3 lần/ngày

Sau khi chiến dịch đã BẬT, đăng ký tác vụ tự chạy (Windows):
1. Mở PowerShell **với quyền Admin**, `cd` vào thư mục `ads-engine` của bạn.
2. Chạy: `powershell -ExecutionPolicy Bypass -File dang-ky-task.ps1` (script tự nhận thư mục qua `$PSScriptRoot`,
   bạn **không cần sửa đường dẫn**; chỉ cần có **Git Bash** ở `C:\Program Files\Git\bin\bash.exe`).
3. Mỗi ngày 08:00 / 13:00 / 19:00, hệ thống kéo số thật từ Facebook → so với ngưỡng lãi của bạn → ghi
   **Bảng 5** + gửi thẻ. Quyết định **TẮT / TĂNG TIỀN / ĐỔI NỘI DUNG** sẽ hỏi bạn **duyệt qua Lark** trước.

Test thủ công không cần chờ lịch:
```bash
bash agent-3x.sh            # quét chiến dịch đang chạy, số Facebook thật
bash agent-3x.sh --simulate # chạy thử với số giả từ Bảng 0
```

---

## 7. Ngưỡng lãi hoạt động thế nào? (hiểu để tin)

Bạn điền ở Bảng 0: **Giá bán (P)**, **Chi phí biến đổi (V)**, **Biên lãi muốn giữ**, **Tỷ lệ Lead→Đơn**,
**Tỷ lệ Chat→Đơn**. Base **tự tính** (công thức kế toán hoà vốn — CVP):
- **Break-even ROAS** = P / (P−V) — ROAS tối thiểu để hoà vốn.
- **CPA mục tiêu** = (P−V) × (1 − biên) — chi tối đa cho 1 đơn mà vẫn giữ lãi.
- **CPL mục tiêu** = CPA × tỷ lệ Lead→Đơn — giá 1 lead tối đa.
- **CPL hoà vốn** = (P−V) × tỷ lệ Lead→Đơn — **lằn cấm vượt**.

Agent canh: phấn đấu CPL ≤ mục tiêu; **CẤM vượt CPL hoà vốn** (tắt gấp); tôn trọng **trần chi tiêu** bạn đặt.
Đây là phần Facebook không làm cho bạn — và là **giá trị thật** của Ads Agent.

---

## 8. An toàn

- Engine **luôn tạo chiến dịch ở PAUSED** — không bao giờ tự tiêu tiền. Bạn là người bật.
- Mọi quyết định nguy hiểm đi qua **cổng duyệt Lark**.
- Giữ kín `config.env` và `.secrets/`. Nếu lỡ lộ token Meta → vào Business Settings thu hồi & tạo token mới.

---

## 9. Gặp lỗi? (xem nhanh)

| Triệu chứng | Cách xử lý |
|---|---|
| `do-config.mjs` báo "Gọi lark-cli thất bại" | Chưa cài/đăng nhập lark-cli, hoặc `B` sai. Chạy lại sau khi `lark-cli` đăng nhập. |
| "thiếu META_ACCESS_TOKEN" | Chưa tạo `.secrets/meta-ads.env` hoặc điền sai. |
| Tạo chiến dịch lỗi "advantage_audience" | Đang nhắm tuổi cụ thể (<65) thì để đối tượng chỉ định; đừng bật Advantage+ ở nhóm đó. |
| Ảnh/video không lên | Đính lại file vào ô media Bảng 0; video lớn cần chờ tải. |
| Thẻ Lark không tới | `CHAT` trống hoặc sai mã nhóm `oc_...`. |

Chi tiết kiến trúc & xử lý sự cố nâng cao: xem `2026-06-25-bo-chuyen-giao-ads-agent.md` và skill
`hmh-sale-ads-agent`.
