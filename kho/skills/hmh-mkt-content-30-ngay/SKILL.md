---
name: hmh-mkt-content-30-ngay
description: >
  Xây chuỗi nội dung 30 ngày, lưu vào Larkbase, tự động đăng bài mỗi ngày và trả về kết quả bài đăng.
  Dùng khi người dùng muốn lên lịch content, tự động đăng bài, theo dõi hiệu quả content hàng ngày, hoặc xây hệ thống content machine.
  Kích hoạt khi có từ: lịch content, chuỗi bài viết, tự động đăng bài, content calendar, Larkbase content, content machine, đăng bài tự động.
---

# Skill: Chuỗi Nội Dung Larkbase + Tự Động Đăng

## Triết lý gốc

> "Nội dung không phải là vua. Nội dung NHẤT QUÁN mới là vua."
> — Gary Vaynerchuk

> "Mỗi bài viết là một tài sản. Tài sản tích lũy theo thời gian."
> — Neil Patel

Framework kết hợp từ:
- **Gary Vaynerchuk**: Content at scale — mỗi ngày 1 bài, nhất quán hơn hoàn hảo
- **Russell Brunson**: Hook-Story-Offer trong mỗi bài viết
- **Dan Kennedy**: Direct Response content — mỗi bài có mục tiêu cụ thể, đo được

---

## Quy trình thực thi

### Bước 1 — Thu thập thông tin

Hỏi người dùng 4 câu:
1. **Chủ đề / lĩnh vực chính** của chuỗi content là gì?
2. **Đối tượng** — mô tả khách hàng lý tưởng bằng 1-2 câu
3. **Kênh đăng** — Facebook Page nào? (nếu dùng kênh đã kết nối)
4. **Mục tiêu chuỗi content** — Thu lead? Warm-up? Branding? Bán sản phẩm?

---

### Bước 2 — Thiết kế cấu trúc 30 ngày

Chia 30 ngày thành 4 tuần với chủ đề riêng:

**Tuần 1 — Nhận thức (Awareness)**
Mục tiêu: Gọi đúng người, xác nhận nỗi đau họ đang có
Content type: Bài "Bạn có đang gặp..." / "5 dấu hiệu..." / "Sai lầm phổ biến nhất..."

**Tuần 2 — Giáo dục (Education)**
Mục tiêu: Dạy họ nguyên lý, xây dựng thẩm quyền
Content type: Bài "Tại sao..." / "Cách để..." / "Công thức..." / Case study

**Tuần 3 — Chứng minh (Proof)**
Mục tiêu: Social proof, câu chuyện thành công, so sánh trước-sau
Content type: Testimonial / Câu chuyện thật / Số liệu / Behind the scenes

**Tuần 4 — Hành động (Action)**
Mục tiêu: Dẫn đến opt-in mồi câu hoặc mua hàng
Content type: Bài offer mồi câu / FAQ / Last call / Story dẫn đến CTA

---

### Bước 3 — Tạo 30 bài viết

Với mỗi bài, dùng cấu trúc 4 phần:

```
HOOK (2-3 câu đầu):
Câu 1: Gây chú ý bằng sự thật gây ngạc nhiên, câu hỏi, hoặc tuyên bố táo bạo
Câu 2-3: Xác nhận đây là vấn đề của người đọc

THÂN BÀI:
Nội dung giá trị — 3-5 điểm hoặc 1 câu chuyện ngắn
Ngắn gọn, dễ đọc, khoảng cách dòng rộng

KẾT:
Câu tóm tắt insight chính

CTA (nhẹ nhàng):
Comment / Chia sẻ / Link mồi câu (chỉ 1 trong 3, không dùng cả 3)
```

**Lưu ý viral formula (từ memory):** Dùng cấu trúc: Sự thật bất ngờ → Giải thích → Ứng dụng → Kêu gọi.

---

### Bước 4 — Lưu vào Larkbase

Cấu trúc bảng Larkbase cần tạo:

| Cột | Kiểu dữ liệu | Mô tả |
|-----|-------------|-------|
| ID | Auto | Số thứ tự bài |
| Ngày đăng | Date | Ngày theo lịch |
| Tuần | Select | Tuần 1-4 |
| Chủ đề tuần | Text | Awareness/Education/Proof/Action |
| Tiêu đề/Hook | Text | Câu đầu tiên |
| Nội dung đầy đủ | Long text | Toàn bộ bài viết |
| Kênh | Select | Facebook/Zalo/... |
| Trạng thái | Select | Chờ / Đã đăng / Hủy |
| Kết quả | Number | Reach / Like / Comment / Click |
| Ghi chú | Text | Note thêm |

Sử dụng Larkbase MCP tools để:
1. Tạo bảng với cấu trúc trên (nếu chưa có)
2. Tạo 30 records với nội dung từng bài
3. Set ngày đăng tự động (ngày hiện tại + 1, 2, 3...)

---

### Bước 5 — Tự động đăng và báo cáo

**Quy trình tự động hóa:**

```
Mỗi ngày khi được kích hoạt:
1. Đọc Larkbase → lấy bài có ngày đăng = hôm nay + trạng thái "Chờ"
2. Đăng bài qua Facebook Graph API (dùng Page ID và token đã lưu)
3. Lấy kết quả (post ID, reach sau 1h)
4. Cập nhật Larkbase: trạng thái → "Đã đăng", ghi post ID và kết quả
5. Trả về báo cáo ngắn cho người dùng
```

**Cấu trúc báo cáo hàng ngày:**
```
BÁO CÁO CONTENT [Ngày]

Bài đăng hôm nay:
- Tiêu đề: [...]
- Kênh: [...]
- Đăng lúc: [giờ]

Kết quả (cập nhật sau 1h):
- Reach: [số]
- Tương tác: [số]
- Click link: [số]

Bài ngày mai (preview):
- [Tiêu đề ngày mai]
```

---

### Bước 6 — Thực thi khi được gọi

Khi skill này được kích hoạt:

**Lần đầu (Setup):**
1. Thu thập 4 thông tin ở Bước 1
2. Tạo 30 bài viết theo cấu trúc
3. Tạo/cập nhật bảng Larkbase với 30 records
4. Xác nhận với người dùng trước khi lưu

**Lần thường (Daily run):**
1. Kiểm tra bài hôm nay trong Larkbase
2. Đăng bài nếu đúng giờ
3. Cập nhật kết quả bài hôm qua
4. Trả về báo cáo ngắn

**Lần review (Cuối tuần):**
1. Tổng kết 7 bài vừa đăng
2. Bài nào reach cao nhất → phân tích hook
3. Gợi ý điều chỉnh cho tuần tiếp theo

---

## Lưu ý quan trọng

- **Nhất quán > Hoàn hảo**: Đăng mỗi ngày dù bài chưa perfect còn tốt hơn chờ perfect mà không đăng
- **Không spam CTA**: Mỗi 4-5 bài giá trị mới có 1 bài offer
- **Điều chỉnh theo dữ liệu**: Tuần 2 nhìn lại Tuần 1 và điều chỉnh chủ đề nếu engagement thấp
- Token Facebook có thể hết hạn sau 60 ngày — nhắc nhở người dùng gia hạn

---

## Output chuẩn khi setup

```
## CHUỖI CONTENT 30 NGÀY — [Lĩnh vực]

Đối tượng: [mô tả]
Kênh: [tên kênh]
Mục tiêu: [thu lead / warm-up / branding]

### LỊCH 30 NGÀY

**Tuần 1 — Nhận thức**
Ngày 1: [Tiêu đề bài 1]
Ngày 2: [Tiêu đề bài 2]
[...]

**Tuần 2 — Giáo dục**
[...]

**Tuần 3 — Chứng minh**
[...]

**Tuần 4 — Hành động**
[...]

### NỘI DUNG CHI TIẾT

**BÀI 1 — [Ngày]**
[Nội dung đầy đủ]
---

[Tiếp tục 30 bài]

### HƯỚNG DẪN LƯU LARKBASE
[Hướng dẫn cụ thể nếu cần tạo bảng mới]
```
