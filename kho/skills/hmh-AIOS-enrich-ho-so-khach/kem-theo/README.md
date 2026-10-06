# Trợ lý dựng hồ sơ khách hàng từ sale page

Khách điền form trên sale page → hệ thống **tự đi tìm hiểu người đó là ai** → ghi hồ sơ vào Lark Base
→ đẩy một tấm thẻ vào nhóm sale để gọi cho đúng mạch. Không ai phải bấm gì.

Bài toán nó giải: sale nhìn vào bảng lead chỉ thấy *"Thu · 0934xxxxxx · gmail"* — không biết khách làm nghề gì,
có kinh doanh không, nên mở lời thế nào. Gọi 100 số thì quá nửa là số sai hoặc người không quan tâm.

Sau khi cài, mỗi lead sẽ có:

```
NGHỀ/CHỨC DANH: Chủ dịch vụ chụp ảnh – quay phim
DOANH NGHIỆP: Giang Smile Studio · ngành nhiếp ảnh · vai trò chủ
QUY MÔ & ĐỊA BÀN: studio nhỏ, chính chủ đứng máy
TỪNG LÀM: Chưa rõ
DẤU VẾT ONLINE: Zalo dùng làm bảng hiệu, có hotline và tagline nghề
NHU CẦU SUY RA: thợ ảnh tự làm chủ, cần nguồn khách đều thay vì chạy đơn lẻ

GÓC TƯ VẤN: MỞ LỜI: hỏi mùa này studio chạy đơn thế nào | ĐÒN BẨY: có tay nghề
nhưng nguồn khách bấp bênh | RÀO CẢN: hay bận đi chụp, nhắn Zalo ngoài giờ |
GÓI PHÙ HỢP: nhấn phần phễu khách
```

## Cách nó hoạt động

```
Khách điền form ──► Lark Base (bản ghi mới)
                         │  Automation: gửi yêu cầu HTTP
                         ▼
                    Máy bạn / gateway
                         │
              ┌──────────┴───────────┐
              │ 1. Quét bảng (rẻ)    │  lọc số sai, email hỏng, tên cụt
              │ 2. Tra Zalo theo SĐT │  tên thật · nghề tự khai · số sống hay ảo
              │ 3. Claude research   │  masothue, web, mạng xã hội — mỗi lead một trợ lý con
              │ 4. Ghi ngược vào Base│  bật cờ "Đã enrich"
              │ 5. Thẻ vào nhóm sale │  mỗi khách một tin, bật cờ "Đã báo sale"
              └──────────────────────┘
```

**Ba nguyên tắc nằm dưới:**
- *Rẻ trước, đắt sau* — 99% số lần chạy dừng ngay ở bước quét; Claude chỉ được đánh thức khi thật sự có lead mới.
- *Nhớ bằng cờ, không bằng thời gian* — mất điện giữa chừng chạy lại không hỏng, không ai bị xử lý hai lần.
- *Thà "Chưa rõ" còn hơn bịa* — mọi dòng trong hồ sơ đều truy được về nguồn.

**Vì sao Zalo đứng trước web:** với khách Việt, tra tên trên Google ra hàng nghìn người trùng tên, còn Zalo
tra **theo đúng số điện thoại khách tự khai** nên không nhầm người — và thường lộ luôn nghề nghiệp trong
dòng trạng thái. Đo thực tế trên 100+ lead: Zalo ra kết quả cho ~2/3 số máy, trong khi tra tên miền email
gần như vô dụng (khách toàn dùng gmail).

## Có gì trong repo

| Thư mục | Nội dung |
|---|---|
| `skill/hmh-AIOS-enrich-ho-so-khach/` | Skill chính — chạy trên máy bạn (cần Claude Code + Zalo đăng nhập) |
| `cloud/` + `.github/workflows/` | Bản chạy trên GitHub Actions khi máy tắt — chỉ lọc rác, không research |
| `gateway/` | Đoạn code thêm route HTTP nếu bạn có sẵn một gateway Node |
| `HUONG-DAN-KHACH.md` | Hướng dẫn cài từ đầu đến cuối |

## Cài nhanh

```bash
# 1. Chép skill vào bộ não của bạn
cp -r skill/hmh-AIOS-enrich-ho-so-khach <thư-mục-làm-việc>/.claude/skills/

# 2. Điền cấu hình
cd <thư-mục-làm-việc>/.claude/skills/hmh-AIOS-enrich-ho-so-khach/scripts
cp config.env.example config.env   # rồi mở ra điền Base token, table id, webhook nhóm

# 3. Tạo các cột kết quả trong bảng (chạy 1 lần)
node 00-ensure-fields.mjs

# 4. Chạy thử một lượt
node enrich-watcher.mjs --once
```

Chi tiết từng bước, kể cả cách lấy Base token và webhook nhóm: xem [HUONG-DAN-KHACH.md](HUONG-DAN-KHACH.md).

## Cần chuẩn bị

- **Node.js ≥ 18** và **Claude Code CLI** (bước research cần Claude thật sự đọc–suy nghĩ–tra cứu).
- **lark-cli** đã đăng nhập, có quyền đọc/ghi Base.
- **zalo-agent-cli** đã đăng nhập bằng QR (tầng tra cứu mạnh nhất — bỏ qua được nhưng hồ sơ sẽ mỏng hẳn).
  Phiên Zalo sống khoảng **17 ngày** rồi hết hạn im lặng; `node 21-zalo-login-qr.mjs` giữ mã QR luôn sống
  để quét lại (lệnh gốc chỉ sinh một mã, hết hạn sau 2 phút là thoát).
- *(tuỳ chọn)* **Tài khoản Apify** nếu muốn tra Google Việt Nam thật — ~$0,0042/truy vấn, có chế độ `--dry`.
- Một **Lark Base** có bảng lead với ít nhất 3 cột: Họ tên · Số điện thoại · Email.

## Giới hạn cần biết trước

- **Máy tắt thì không chạy.** Bước research cần Claude và Zalo — cả hai đều không mang lên máy chủ đám mây được
  (Zalo là phiên đăng nhập cá nhân, đổi IP sẽ bị cảnh báo). Bản `cloud/` chỉ lọc rác giúp bạn, và **cố tình
  không bật cờ** để khi máy bật lại, hồ sơ đầy đủ vẫn được dựng.
- **Chỉ dùng thông tin công khai.** Skill không thu thập dữ liệu riêng tư, không vượt tường đăng nhập.
  Mục đích là hiểu khách để tư vấn đúng, không phải theo dõi ai.
- **Tôn trọng nhịp Zalo** — script nghỉ ~2 giây giữa mỗi lần tra. Đừng hạ xuống thấp hơn.

## Có gì mới so với bản đầu (08/2026 → 09/2026)

| Bổ sung | Vì sao có |
|---|---|
| `_zalo.mjs` — nguồn sự thật duy nhất khi gọi Zalo | Bản cũ bọc lệnh trong `catch` rỗng: phiên Zalo chết bị dịch thành "khách dùng số ảo" → 4 ngày ghép nhầm người. Nay chỉ câu "User không hợp lệ" mới được kết luận là không có Zalo; mọi lỗi khác = **không biết**, hệ dừng và báo động thay vì đoán |
| Cầu chì + card báo động khi Zalo chết / bị chặn | Lead nằm nguyên trong hàng chờ, không bị đánh dấu đã xử lý |
| `21-zalo-login-qr.mjs` | Giữ mã QR luôn sống (tự sinh lại khi hết hạn), trang tự làm mới ở cổng cố định |
| `25-google-vn.mjs` (+ `94` làm cầu chuyển tiếp) | Tra SĐT/email trên **Google Việt Nam** qua Apify, kèm bộ chấm điểm chặn 2 loại nhiễu đã đo: trùng số quốc tế và khớp một phần |
| `91-ra-soat-rac-oan.mjs` · `92-doc-manh-moi-email.mjs` | Tìm lead bị chấm "Rác/Thấp" oan, và đọc **phần tên email** (miễn phí) — người Việt hay tự khai nghề, thương hiệu, địa bàn ngay trước dấu @ |
| `93-worklist-theo-nguon.mjs` | Chạy lô theo nguồn mà không giẫm lên `worklist.json` của tiến trình canh |
| `_thread.mjs` · `41-bat-tra-loi-trong-chuoi.mjs` | Trả lời **trong chuỗi** tin data của Base Assistant thay vì gửi card rời; lỗi thì tự rơi về webhook |
| `90-ra-soat-zalo-hong.mjs` | Rà lại những lead từng bị enrich đúng lúc phiên Zalo hỏng |

## Giấy phép

Dùng nội bộ và cho học viên của Hoàng Minh Hóa. Không bán lại nguyên trạng.
