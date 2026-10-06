---
name: hmh-sale-business-model-canvas
description: >
  Coach chủ doanh nghiệp dựng MÔ HÌNH KINH DOANH bằng Business Model Canvas 9 ô (Osterwalder & Pigneur) —
  điền tuần tự theo đúng thứ tự (khách & giá trị trước, tài chính cuối), mỗi ô hỏi câu sắc bén soi bằng lăng kính
  vĩ nhân (Jobs To Be Done, Blue Ocean ERRC, beachhead, Zero to One), chỉ ra GIẢ ĐỊNH RỦI RO NHẤT để kiểm chứng
  trước khi đổ vốn (Steve Blank, Lean Startup). Ghi vào Lark Base (link record Kế hoạch) + vẽ canvas 9 ô ra ảnh để in/treo.
  Là TẦNG CHIẾN LƯỢC (định tính) đứng TRƯỚC bài toán điểm hòa vốn (định lượng) — giúp khởi nghiệp không mù quáng.
  Dùng khi người dùng muốn: bắt đầu/thiết kế mô hình kinh doanh, lập business model canvas, xác định khách hàng - giá trị -
  dòng doanh thu, kiểm tra ý tưởng kinh doanh có hợp lý không, dạy học viên dựng mô hình.
  Kích hoạt khi có từ: mô hình kinh doanh, business model canvas, bmc, 9 ô, bắt đầu kinh doanh, thiết kế mô hình,
  ý tưởng kinh doanh, value proposition, khách hàng mục tiêu, dòng doanh thu, mô hình canvas, khởi nghiệp.
---

# Skill: Business Model Canvas (9 ô) — Dựng mô hình kinh doanh không mù quáng

Biến một ý tưởng mơ hồ thành **9 giả định tường minh** trên một trang, soi bằng tri thức của các vĩ nhân, rồi chỉ ra cái rủi ro nhất cần kiểm chứng — TRƯỚC khi tính tiền và đổ vốn.

## Triết lý gốc
> "A business model describes the rationale of how an organization creates, delivers, and captures value." — Osterwalder & Pigneur, *Business Model Generation*.

Grounded từ: **Osterwalder & Pigneur** (BMC 9 ô + Value Proposition Canvas), **Clayton Christensen** (Jobs To Be Done), **Steve Blank** (Customer Development — "get out of the building"), **Eric Ries** (Lean Startup — MVP, kiểm chứng giả định rủi ro nhất trước), **Kim & Mauborgne** (Blue Ocean — ERRC), **Peter Thiel** (Zero to One), **Porter** (chuỗi giá trị), **Geoffrey Moore** (beachhead), và khung **Desirability–Feasibility–Viability**. Chi tiết + trích dẫn: [references/triet-ly-bmc.md](references/triet-ly-bmc.md).

## Quan hệ với skill khác — TẦNG TRÊN của bài toán lợi nhuận
- **Skill này = WHO/WHAT/HOW (chiến lược, định tính).** Trả lời: bán cho ai, giá trị gì, kiếm tiền kiểu nào, vận hành ra sao.
- **[[hmh-sale-ke-hoach-loi-nhuan]] = HOW MUCH (con số, định lượng).** Trả lời: bán bao nhiêu để hòa vốn / để lời X.
- **Nối số:** ô **5. Dòng doanh thu** → Sản phẩm & giá; ô **9. Cơ cấu chi phí** → chi phí cố định/biến đổi của bài toán lợi nhuận. Cùng 1 record "Kế hoạch" trong Lark Base.
- **Thứ tự đúng:** dựng BMC (Desirability + Feasibility) TRƯỚC → kiểm chứng giả định rủi ro nhất → rồi chạy bài toán hòa vốn (Viability). Tính hòa vốn cho một mô hình chưa ai xác nhận = toán học trên ảo tưởng.

## Tiền điều kiện
- Node + lark-cli (xem [[lark-cli-setup]]). PATH: `export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"`.
- Base mẫu chung token `__LARK_BASE_TOKEN__` đã có bảng "Mô hình kinh doanh (BMC)" link vào "Kế hoạch". Base mới → chạy `tao-bang-bmc.mjs` (và [[hmh-sale-ke-hoach-loi-nhuan]]'s `tao-base-mau.mjs` trước).
- Vẽ canvas cần Chrome (dùng `render-png.ps1` của [[skill-infographic-html]]).

## Quy trình thực thi
1. **Coach điền 9 ô theo đúng thứ tự** ([references/sop-9-o.md](references/sop-9-o.md)): Phân khúc KH → Giá trị → Quan hệ → Kênh → Doanh thu → Hoạt động → Nguồn lực → Đối tác → Chi phí. Mỗi ô hỏi câu sắc bén + soi 1 lăng kính vĩ nhân + **vặn lại** để ép cụ thể. Cấm "tất cả mọi người"; ép chọn beachhead.
2. **Chốt giả định rủi ro nhất + cách kiểm chứng** (Blank/Ries): ô nào sai thì sụp? Kiểm chứng rẻ-nhanh thế nào trước khi đổ vốn?
3. **Ghi vào Lark Base** — tạo record ở bảng "Mô hình kinh doanh (BMC)", link vào record "Kế hoạch" tương ứng (mỗi DN = 1 canvas + 1 bài toán):
   ```bash
   node scripts/tao-bang-bmc.mjs --base-token __LARK_BASE_TOKEN__   # (chỉ lần đầu nếu Base chưa có bảng)
   # rồi dùng record-upsert ghi 9 ô + giả định rủi ro nhất + Trạng thái kiểm chứng, link "Kế hoạch":[{"id":"rec..."}]
   ```
4. **Vẽ canvas 9 ô ra ảnh** (để in/treo/dạy):
   ```bash
   node scripts/ve-canvas.mjs --base-token __LARK_BASE_TOKEN__ --name "<Tên mô hình>" --out <output-dir>
   ```
5. **Áp bộ lọc 3 tầng** rồi **bàn giao sang [[hmh-sale-ke-hoach-loi-nhuan]]**: ô Doanh thu → Sản phẩm/giá, ô Chi phí → chi phí cố định/biến đổi; chạy bài toán hòa vốn để kiểm Viability.
6. **Lưu output** theo CLAUDE.md + cập nhật `index.md`, ghi `log.md`.

## Tham chiếu scripts / references
- `scripts/tao-bang-bmc.mjs` — thêm bảng "Mô hình kinh doanh (BMC)" vào Base (9 ô + giả định rủi ro + trạng thái kiểm chứng), link "Kế hoạch", mỗi ô có description = câu hỏi cốt lõi.
- `scripts/ve-canvas.mjs` — đọc 1 record BMC → vẽ canvas 9 ô layout Osterwalder (HTML→PNG, màu phân vùng phải/trái/đáy).
- `references/sop-9-o.md` — câu hỏi coach từng ô + lăng kính vĩ nhân.
- `references/triet-ly-bmc.md` — triết lý gốc + trích dẫn nguồn.

## Lưu ý / gotcha
- **Định tính TRƯỚC định lượng.** Đừng nhảy vào tính hòa vốn khi 9 ô còn là giả định chưa kiểm chứng.
- **Ô khách hàng:** ép cụ thể, chọn beachhead — "tất cả mọi người" = chưa có phân khúc.
- **Ô giá trị:** hỏi JOB của khách (JTBD), không liệt kê tính năng; dùng ERRC để khác biệt.
- **Luôn chốt 1 giả định rủi ro nhất** và cách kiểm chứng — đó là phần "không mù quáng".
- Lark Base: link cell `[{"id":"rec..."}]`; record-upsert `--json` là field map trực tiếp; record-list trả tên field bị cắt → map qua `field-list` + `field_id_list`. Render: path tiếng Việt → render-png.ps1 tự copy sang %TEMP%.

## Output (bám CLAUDE.md)
- Mỗi canvas = 1 thư mục `output/YYYY-MM-DD-bmc-<tên-DN>/` chứa HTML + PNG canvas + ghi chú giả định rủi ro.
- Cập nhật `index.md` + ghi `log.md`: `## [YYYY-MM-DD] query | BMC <tên-DN>`.
