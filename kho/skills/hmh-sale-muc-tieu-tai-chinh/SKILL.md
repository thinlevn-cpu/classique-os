---
name: hmh-sale-muc-tieu-tai-chinh
description: >
  Xác định mục tiêu tài chính và tính ngược ra số lượng khách hàng, giá bán, traffic cần thiết.
  Dùng khi người dùng muốn lên kế hoạch doanh thu, định giá sản phẩm, hoặc hỏi "cần bao nhiêu khách để đạt X triệu/tháng".
  Kích hoạt ngay khi có từ: mục tiêu doanh thu, thu nhập mục tiêu, cần bao nhiêu khách, kế hoạch tài chính kinh doanh.
---

# Skill: Mục Tiêu Tài Chính

## Triết lý gốc

> "Hầu hết mọi người làm ngược: làm sản phẩm rồi mới xem kiếm được bao nhiêu.
> Người giỏi làm thuận: quyết định thu nhập mục tiêu → tính ngược ra mọi thứ cần có."
> — Dan Kennedy, No B.S. Direct Marketing

Framework kết hợp từ:
- **Alex Hormozi** ($100M Leads): Backward calculation từ revenue goal
- **Dan Kennedy**: Math-first, không đoán mò
- **Russell Brunson** (DotCom Secrets): Funnel Math — Traffic × CVR × AOV × LTV

---

## Quy trình thực thi

### Bước 1 — Thu thập 3 thông tin

Hỏi người dùng đúng 3 câu này, không hỏi thêm:

1. **Thu nhập mục tiêu hàng tháng là bao nhiêu?** (Ví dụ: 50 triệu, 200 triệu, 1 tỷ)
2. **Bạn đang làm ngành/lĩnh vực gì?** (Nếu chưa có: lĩnh vực nào bạn có kiến thức hoặc kinh nghiệm?)
3. **Bạn đang bán cho ai?** (Cá nhân hay doanh nghiệp? Mô tả ngắn gọn)

---

### Bước 2 — Tính ngược theo 3 kịch bản giá

Tính toán cho 3 mức giá sản phẩm (thấp / trung / cao):

**Công thức cốt lõi:**
```
Số khách cần = Mục tiêu doanh thu / Giá bán
Traffic cần  = Số khách cần / Tỉ lệ chuyển đổi
CAC tối đa   = LTV × 0.33 (tối đa chi 1/3 LTV để có 1 khách)
```

**Chuẩn tỉ lệ chuyển đổi theo kênh:**
- Cold traffic (quảng cáo lạnh): 1-3%
- Warm traffic (đã biết bạn): 5-15%
- Hot traffic (đã tin tưởng): 20-40%

**Bảng tính 3 kịch bản:**

| | Kịch bản Thấp | Kịch bản Trung | Kịch bản Cao |
|---|---|---|---|
| Giá bán | Tự tính (×0.1 mục tiêu) | Tự tính (×0.5) | Tự tính (×2) |
| Số khách/tháng | | | |
| Traffic cần (CVR 2%) | | | |
| CAC tối đa | | | |

---

### Bước 3 — Kết luận và khuyến nghị

Sau khi có bảng tính, đưa ra:

1. **Kịch bản khuyến nghị** — kịch bản nào thực tế nhất với lĩnh vực và năng lực hiện tại
2. **Sản phẩm cần xây trước** — dựa vào kịch bản đó, cần sản phẩm ở tầng giá nào
3. **Khoảng trống cần lấp** — traffic, conversion, hay giá trị sản phẩm là điểm yếu nhất

---

## Output chuẩn

Trả về đúng format này:

```
## MỤC TIÊU TÀI CHÍNH

Mục tiêu: [X] triệu/tháng
Ngành: [ngành]
Đối tượng khách: [mô tả]

## BẢNG TÍNH 3 KỊCH BẢN

| | Giá thấp | Giá trung | Giá cao |
|---|---|---|---|
| Giá bán | | | |
| Khách/tháng cần | | | |
| Traffic cần (CVR 2%) | | | |
| CAC tối đa | | | |

## KẾT LUẬN

Kịch bản khuyến nghị: [Thấp/Trung/Cao] — Lý do: [1-2 câu]

Bước tiếp theo: Dùng Skill 2 (Thiết kế phễu) để xây đúng sản phẩm cho kịch bản [X].
```

---

## Lưu ý quan trọng

- Không tư vấn đầu tư hay hứa hẹn kết quả
- Nếu mục tiêu quá cao so với lĩnh vực (ví dụ: 1 tỷ/tháng từ bán hàng thủ công), cảnh báo rõ ràng và gợi ý điều chỉnh
- Luôn hỏi đủ 3 thông tin trước khi tính, không đoán
