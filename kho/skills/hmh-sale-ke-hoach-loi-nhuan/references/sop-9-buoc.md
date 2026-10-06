# SOP — 9 bước lập kế hoạch lợi nhuận (chi tiết để dẫn dắt)

> Khung gốc của guru kinh doanh. Agent dẫn chủ DN đi **tuần tự**, hỏi đúng số liệu mỗi bước, không nhảy cóc.
> Tinh thần: **"Đừng bắt đầu bằng 'tôi cần bao nhiêu vốn?' — bắt đầu bằng 'tôi muốn lãi bao nhiêu, và mô hình này có đủ sức tạo ra mức lãi đó không?'"**

Đơn vị tiền mặc định khi dẫn dắt: **triệu VNĐ** (gọn). Tất cả ánh xạ vào các bảng Lark Base tương ứng.

---

### Bước 1 — Xác định mục tiêu LỢI NHUẬN (không phải doanh thu)
Hỏi: *"Anh/chị muốn LỜI bao nhiêu sau 1 năm? 3 năm? 5 năm?"*
- Ghi 3 mốc: `nam_1`, `nam_3`, `nam_5` (triệu/năm).
- → cột **Mục tiêu LN năm 1/3/5** ở bảng **Kế hoạch**.
- Vì sao trước tiên: không có mục tiêu lợi nhuận → kinh doanh cảm tính, "thấy bán được là vui" nhưng không biết lời/lỗ thật ([[triet-ly-guru]] — Drucker, Michalowicz).

### Bước 2 — Xác định sản phẩm/dịch vụ LỢI NHUẬN CAO nhất
Liệt kê **toàn bộ** SP/DV đang/định bán. Mỗi cái hỏi: **Giá bán** và **Chi phí biến đổi/đơn**.
- **Lãi gộp/đơn = Giá bán − Chi phí biến đổi** (contribution margin).
- Xếp hạng theo lãi gộp/đơn. **Giá cao chưa chắc lời cao** — tập trung bán cái lãi gộp tốt nhất.
- → bảng **Sản phẩm** (Giá bán, Chi phí biến đổi, Tỉ trọng đơn). Base tự tính Lãi gộp/đơn, Biên lãi gộp.

### Bước 3 — Quy mục tiêu lợi nhuận về số đơn cần bán
- Lợi nhuận/tháng = Mục tiêu LN năm ÷ 12.
- **Số đơn cần = (Chi phí cố định + Lợi nhuận mục tiêu/tháng) ÷ Lãi gộp BQ/đơn.**
- (Điểm hòa vốn thuần: `Q = FC / (P − V)`.)
- → Base cột **Số đơn cần - Năm 1/3/5** (tự tính).

### Bước 4 — Xác định mức ĐẦU TƯ ban đầu
Liệt kê **từ lớn đến nhỏ**, không tính đại khái: mặt bằng, biển bảng, đồng phục, máy móc, máy tính, điện thoại, camera, phần mềm, máy bán hàng, nội thất, công cụ, chi phí setup, sửa chữa, khai trương…
- → bảng **Đầu tư ban đầu** (Hạng mục, Số lượng, Đơn giá). Base tự tính Thành tiền + Tổng vốn.

### Bước 5 — Xác định NHÂN SỰ để đạt mục tiêu
Hỏi cần bao nhiêu: sale, marketing, kỹ thuật, vận hành, quản lý, kế toán, CSKH? Mỗi vị trí: **Số lượng × Lương/người/tháng**.
- → bảng **Nhân sự**. Base tự tính tổng lương/tháng (gộp vào chi phí cố định ở Bước 6).

### Bước 6 — Xác định CHI PHÍ CỐ ĐỊNH hàng tháng
Khoản dù có khách hay không vẫn phải trả: thuê mặt bằng, lương cố định, điện nước, internet, phần mềm, kế toán, bảo vệ, vệ sinh, khấu hao thiết bị, chi phí quản lý/văn phòng.
- → bảng **Chi phí cố định** + tổng lương (Bước 5) = **Tổng CP cố định/tháng (FC)** trong Base.
- Chi phí cố định càng cao → áp lực doanh thu càng lớn (Munger).

### Bước 7 — Xác định CHI PHÍ BIẾN ĐỔI theo đơn
Chi phí phát sinh theo từng đơn (đã nhập ở Bước 2 cho mỗi SP). Ví dụ studio: makeup, photo, retouch, trang phục, in ấn, hoa, phụ kiện, phí sale, phí quảng cáo theo đơn, giao hàng.
- CEO phải biết **mỗi đơn tốn bao nhiêu tiền thật** → chính là `V` trong `P − V`.

### Bước 8 — Tính ĐIỂM HÒA VỐN
- **Điểm hòa vốn = Chi phí cố định ÷ Lãi gộp BQ/đơn** (đơn/tháng).
- Doanh thu hòa vốn = Điểm hòa vốn × Giá bán BQ.
- Dưới mức này = LỖ; trên mức này mới bắt đầu có lời.
- → Base cột **Điểm hoà vốn (đơn/tháng)**, **Doanh thu hoà vốn/tháng** (tự tính).

### Bước 9 — Lập bảng DỰ TOÁN & kiểm soát
Đưa tất cả vào bảng quản trị (chính là Lark Base này). CEO nhìn vào biết ngay:
- Cần đầu tư ban đầu bao nhiêu? (Tổng vốn đầu tư)
- Mỗi tháng chi bao nhiêu? (Tổng CP cố định/tháng)
- Cần bán bao nhiêu đơn để hòa vốn? (Điểm hòa vốn)
- Muốn lời 1/3/5 tỷ thì cần bao nhiêu doanh thu/đơn? (Số đơn cần - Năm 1/3/5)
- **Có nên mở rộng hay chưa?** → ra quyết định ngay trên Base.

---

## Kết luận & khuyến nghị (agent đưa ra sau 9 bước)
1. **Tính khả thi:** số đơn/ngày cần có thực tế không? (đối chiếu năng lực, thị trường)
2. **Sản phẩm tập trung:** cái nào lãi gộp cao nhất → dồn marketing/sale.
3. **Điểm yếu nhất:** giá, biên lãi gộp, chi phí cố định, hay vốn đầu tư?
4. **Cảnh báo:** lãi gộp ≤ 0, biên an toàn < 20%, hoặc số đơn/ngày phi thực tế → điều chỉnh mục tiêu/giá/chi phí trước khi tiêu vốn.
5. Đặt **Trạng thái** Base: Khả thi / Cần điều chỉnh / Không khả thi.
