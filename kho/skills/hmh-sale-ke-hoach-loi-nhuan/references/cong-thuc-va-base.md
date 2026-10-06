# Công thức cốt lõi + Cấu trúc Lark Base + Hợp đồng input

## 1. Công thức (Base hiển thị VNĐ thật; input khai theo triệu cho gọn)

| Tên | Công thức | Ghi chú |
|---|---|---|
| Lãi gộp/đơn | `P − V` = Giá bán − Chi phí biến đổi | contribution margin |
| Biên lãi gộp | `(P − V) / P` | % |
| Lãi gộp BQ/đơn | `Σ (lãi gộp_i × tỉ trọng_i)` | gia quyền theo tỉ trọng đơn (Σ tỉ trọng = 1) |
| Giá bán BQ | `Σ (giá_i × tỉ trọng_i)` | |
| Tổng CP cố định/tháng (FC) | `Σ chi phí cố định + Σ (số lượng × lương)` | gồm cả lương |
| Tổng vốn đầu tư | `Σ (số lượng × đơn giá)` | |
| **Điểm hòa vốn (đơn)** | **`Q = FC / (P − V)`** | làm tròn lên |
| Doanh thu hòa vốn | `Q × Giá bán BQ` | |
| **Số đơn cần đạt mục tiêu** | **`(FC + Lợi nhuận mục tiêu/tháng) / (P − V)`** | LN mục tiêu/tháng = LN năm ÷ 12 |
| **Doanh thu cần đạt mục tiêu** | **`Số đơn cần × Giá bán BQ`** | doanh thu/tháng để lời đúng mục tiêu (khác doanh thu hoà vốn) |
| Biên an toàn | `(Doanh thu mục tiêu − Doanh thu hòa vốn) / Doanh thu mục tiêu` | margin of safety |
| Payback (tháng hoàn vốn) | `Tổng vốn đầu tư / Lợi nhuận mục tiêu/tháng` | |

## 2. Cấu trúc Lark Base mẫu (5 bảng liên kết — mô hình SỐNG)

Base: **"KẾ HOẠCH LỢI NHUẬN CEO — Mẫu HMH"** · token `__LARK_BASE_TOKEN__`
URL: https://studiosuccess.sg.larksuite.com/base/__LARK_BASE_TOKEN__

> **ĐƠN VỊ TRONG BASE: VNĐ thật (đồng), định dạng kế toán có dấu phân cách** (vd `1.200.000.000 ₫`). Ô nhập tiền = field `currency` VND (precision 0). Ô công thức tiền = formula trả **text** `TEXT(x, "#,##0") & " ₫"` (vì formula field KHÔNG nhận `style` qua API). Tỉ lệ % = `TEXT(ratio*100, "0.0") & "%"`.

- **Kế hoạch** (hub, 1 record = 1 doanh nghiệp/kịch bản): Tên doanh nghiệp, Ngành, Mục tiêu LN năm 1/3/5 (VNĐ/năm), Trạng thái, Ngày lập.
  Công thức tự tính (rollup từ bảng con qua link): Tổng lương/tháng, Tổng CP cố định khác/tháng, **Tổng CP cố định/tháng (FC)**, **Tổng vốn đầu tư ban đầu**, **Lãi gộp BQ/đơn**, Giá bán BQ, Biên lãi gộp BQ, **Điểm hoà vốn (đơn/tháng)**, **Doanh thu hoà vốn/tháng** (để KHÔNG LỖ), **Số đơn cần - Năm 1/3/5**, **Doanh thu cần/tháng - Năm 1/3/5** (để CHẠM MỤC TIÊU LỢI NHUẬN — = Số đơn cần × Giá bán BQ).
  > Phân biệt: *Doanh thu hoà vốn* = ngưỡng không lỗ; *Doanh thu cần* = doanh thu phải đạt để lời đúng mục tiêu năm đó.
- **Sản phẩm** (link → Kế hoạch): Sản phẩm, Giá bán (VNĐ), Chi phí biến đổi (VNĐ), Tỉ trọng đơn (0-1). Tự tính: Lãi gộp/đơn, Biên lãi gộp, **Lãi gộp đóng góp** & **Giá đóng góp** (2 field NUMERIC để hub SUM — hiển thị số đồng thô).
- **Chi phí cố định** (link → Kế hoạch): Hạng mục, Số tiền/tháng (VNĐ).
- **Nhân sự** (link → Kế hoạch): Vị trí, Số lượng, Lương/người/tháng (VNĐ). Tự tính: **Thành tiền/tháng** (NUMERIC để SUM).
- **Đầu tư ban đầu** (link → Kế hoạch): Hạng mục, Số lượng, Đơn giá (VNĐ). Tự tính: **Thành tiền** (NUMERIC để SUM).

> **Đổi số bất kỳ trong Base → các chỉ số quyết định tự cập nhật** (live model). Đây là phần "tăng hiệu suất, ra quyết định nhanh".
> Reverse link trong hub đặt tên `DS Sản phẩm` / `DS Chi phí cố định` / `DS Nhân sự` / `DS Đầu tư` để công thức cross-table không trùng tên bảng.
> Các field "đóng góp"/"Thành tiền" để NUMERIC vì hub phải `SUM()` chúng (không thể SUM một field text). Field NUMERIC formula hiển thị số đồng không dấu phân cách — đây là cột phụ; cột tổng ở hub đã format đẹp.

## 3. Hợp đồng input JSON (dùng chung cho `ke-hoach-loi-nhuan.mjs` và `push-to-lark-base.mjs`)

```json
{
  "ten_doanh_nghiep": "Studio ABC",
  "nganh": "Chụp ảnh cưới",
  "don_vi_tien": "triệu",
  "muc_tieu_loi_nhuan": { "nam_1": 1200, "nam_3": 3600, "nam_5": 6000 },
  "san_pham": [
    { "ten": "Gói Cơ bản", "gia_ban": 15, "chi_phi_bien_doi": 7, "ty_trong": 0.5 }
  ],
  "chi_phi_co_dinh": [ { "hang_muc": "Mặt bằng", "so_tien": 40 } ],
  "nhan_su": [ { "vi_tri": "Sale", "so_luong": 2, "luong": 10 } ],
  "dau_tu_ban_dau": [ { "hang_muc": "Máy ảnh", "so_luong": 2, "don_gia": 60 } ]
}
```
- `ty_trong` = tỉ trọng số đơn của SP trong tổng đơn (Σ nên = 1). Bỏ trống mọi SP → engine chia đều.
- Mọi tiền khai theo đơn vị `don_vi_tien` (mặc định **triệu**). Engine + push tự nhân **HE_SO = 1.000.000** để ra VNĐ khi hiển thị/ghi Base. Nếu muốn khai thẳng đồng: đặt `"don_vi_tien": "đồng"` → HE_SO = 1.

## 4. Tái dựng Base từ đầu (nếu cần Base mới cho học viên khác)
```bash
export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"
node tao-base-mau.mjs --create --demo        # tạo Base mới + nạp ví dụ
node them-huong-dan.mjs --base-token <token> # thêm bảng Hướng dẫn + ghi chú từng cột (CHẠY SAU)
# hoặc bồi đắp vào base có sẵn:
node tao-base-mau.mjs --base-token <token>   # chỉ dựng bảng/field
node tao-base-mau.mjs --base-token <token> --demo-only --demo   # chỉ nạp demo
```
Gotcha field-update: phải dùng `field_id` (fld...) không dùng tên (tên có dấu ngoặc/đ → URL 404); rate-limit `800004135` → nghỉ ~2,5s + retry; sửa trùng trạng thái → `800070003` no-op (bỏ qua).

## 5. Hai đường nhập liệu cho người dùng
- **Qua AI** (lần đầu / lập kế hoạch mới): nói "lập kế hoạch lợi nhuận cho [DN]" → AI dẫn 9 bước → tự ghi Base.
- **Trực tiếp trên Base** (sửa/thử kịch bản hằng ngày): điền các cột KHÔNG có '₫'/'%' (cột '₫'/'%' là tự tính). Bảng "Hướng dẫn sử dụng" trong Base mô tả rõ điền gì ở đâu.
