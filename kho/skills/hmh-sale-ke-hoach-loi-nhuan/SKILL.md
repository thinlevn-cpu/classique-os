---
name: hmh-sale-ke-hoach-loi-nhuan
description: >
  Agent dẫn chủ doanh nghiệp đi TUẦN TỰ 9 bước lập KẾ HOẠCH LỢI NHUẬN & ĐIỂM HÒA VỐN trước/khi vận hành:
  mục tiêu lợi nhuận → sản phẩm lãi gộp cao → số đơn cần → vốn đầu tư → nhân sự → chi phí cố định →
  chi phí biến đổi → điểm hòa vốn (Q = FC/(P−V)) → bảng dự toán. Có engine tính toán deterministic và
  GHI THẲNG vào Lark Base mô hình sống (đổi số là chỉ số ra quyết định tự cập nhật). Grounded từ CVP/break-even,
  Hormozi, Profit First, Drucker, Gerber, Kennedy.
  Dùng khi người dùng muốn: lập kế hoạch lợi nhuận, tính điểm hòa vốn, xem mở doanh nghiệp có lời không,
  cần bán bao nhiêu đơn để hòa vốn / để lời X tỷ, dự toán vốn đầu tư & chi phí, dạy học viên bài toán lợi nhuận CEO.
  Kích hoạt khi có từ: kế hoạch lợi nhuận, điểm hòa vốn, hòa vốn, lãi gộp, mở doanh nghiệp có lời không,
  cần bán bao nhiêu để hòa vốn, dự toán chi phí, vốn đầu tư ban đầu, bài toán lợi nhuận, P trừ V, FC, break even.
---

# Skill: Kế hoạch Lợi nhuận & Điểm hòa vốn (9 bước CEO)

Biến bài toán tính tay của chủ doanh nghiệp thành một agent dẫn dắt tuần tự + một Lark Base "mô hình sống" để ra quyết định nhanh.

## Triết lý gốc

> "Đừng bắt đầu bằng câu hỏi *'Tôi cần bao nhiêu vốn?'* — hãy bắt đầu bằng *'Tôi muốn lợi nhuận bao nhiêu, và mô hình này có đủ sức tạo ra lợi nhuận đó không?'*"

Vốn chỉ là **biến phái sinh** rơi ra từ mô hình lợi nhuận–hòa vốn, không phải câu hỏi mở đầu. Grounded từ:
**CVP/Break-even** (Rautenstrauch — `Q = FC/(P−V)`), **Alex Hormozi** (unit economics, GP > CAC), **Mike Michalowicz — Profit First** (`Doanh thu − Lợi nhuận = Chi phí`), **Peter Drucker** (lợi nhuận = chi phí để tồn tại), **Michael Gerber — E-Myth** (mô hình hóa trước khi vận hành), **Dan Kennedy** (math-first). Chi tiết + trích dẫn: [references/triet-ly-guru.md](references/triet-ly-guru.md).

## Khi nào dùng / KHÔNG dùng
- **TẦNG TRÊN (làm trước):** dựng mô hình kinh doanh định tính bằng [[hmh-sale-business-model-canvas]] (9 ô: bán cho ai, giá trị gì, kiếm tiền kiểu nào), rồi **định giá & thiết kế offer** bằng [[hmh-sale-dinh-gia-offer]] (giá & CP biến đổi 3 tầng đổ thẳng vào bảng Sản phẩm của skill này). Ô *Dòng doanh thu* BMC → Sản phẩm/giá; ô *Cơ cấu chi phí* → chi phí cố định/biến đổi. Đừng tính hòa vốn khi mô hình còn là giả định chưa kiểm chứng.
- **Dùng:** lập kế hoạch lợi nhuận, tính hòa vốn, dự toán vốn/chi phí, quyết định mở/mở rộng, dạy học viên.
- **KHÔNG dùng** (chuyển skill khác):
  - Tính ngược **traffic/CVR/CAC** từ doanh thu → [[hmh-sale-muc-tieu-tai-chinh]] (toán phễu marketing). Skill này lo **lợi nhuận–hòa vốn–chi phí**, hai cái bổ trợ nhau.
  - Thiết kế phễu/LTV → [[hmh-sale-pheu-ltv]] · Ngân sách ads/CRM → [[hmh-sale-ngan-sach-ads-crm]].

## Tiền điều kiện
- Node + lark-cli (xem [[lark-cli-setup]]). PATH: `export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"`. Chạy CLI qua `node <run.js>` để giữ UTF-8 tiếng Việt.
- Lark Base mẫu đã dựng sẵn: token `__LARK_BASE_TOKEN__` (xem [references/cong-thuc-va-base.md](references/cong-thuc-va-base.md)). Cần Base mới cho học viên khác → `node scripts/tao-base-mau.mjs --create --demo`.

---

## Quy trình thực thi

### Chọn chế độ (hỏi 1 câu đầu)
- **Chế độ DẪN DẮT (học viên):** hỏi từng bước một, giải thích thuật ngữ, cầm tay qua đủ 9 bước. Mặc định khi người dùng là người mới / nói "dạy", "hướng dẫn", "em chưa biết".
- **Chế độ NHẬP NHANH (team tư vấn):** nhận đủ số liệu (hoặc 1 bảng), tính ngay, xuất bảng + kết luận. Khi người dùng đưa sẵn số hoặc nói "tính nhanh", "tư vấn cho khách".

### Bước thực thi (cả 2 chế độ đều đi qua 9 bước của [references/sop-9-buoc.md](references/sop-9-buoc.md))

1. **Thu thập số liệu theo 9 bước.** Đơn vị mặc định **triệu VNĐ**.
   - Chế độ dẫn dắt: hỏi tuần tự B1→B9, mỗi bước giải thích ngắn "vì sao". Đừng hỏi dồn.
   - Chế độ nhanh: xin đủ 1 lượt: mục tiêu LN năm 1/3/5, danh sách sản phẩm (giá + chi phí biến đổi + tỉ trọng), chi phí cố định, nhân sự, đầu tư ban đầu.

2. **Dựng input JSON** đúng hợp đồng (xem [references/cong-thuc-va-base.md](references/cong-thuc-va-base.md) §3). Lưu vào thư mục output của lần chạy.

3. **Tính bằng engine** (deterministic, không nhẩm tay):
   ```bash
   export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"
   node scripts/ke-hoach-loi-nhuan.mjs <output-dir>/input.json --md <output-dir>/bao-cao.md
   ```
   Engine trả: lãi gộp từng SP + xếp hạng, lãi gộp BQ, **điểm hòa vốn**, **số đơn cần đạt mục tiêu (năm 1/3/5)**, tổng vốn, payback, biên an toàn, **cảnh báo** (lãi gộp ≤ 0, số đơn/ngày phi thực tế, biên an toàn < 20%).

4. **Trình bày kết quả** cho người dùng: bảng theo từng bước + **kết luận & khuyến nghị** (tính khả thi, sản phẩm tập trung, điểm yếu nhất, có nên mở/mở rộng). Bám phần "Kết luận" của SOP.

5. **GHI VÀO LARK BASE** (mô hình sống — để chủ DN tự chỉnh số & quyết định nhanh):
   ```bash
   node scripts/push-to-lark-base.mjs <output-dir>/input.json --base-token __LARK_BASE_TOKEN__ --date <hôm-nay>
   ```
   Tạo 1 record hub **Kế hoạch** + các record con (Sản phẩm/Chi phí cố định/Nhân sự/Đầu tư) link vào hub; **mọi chỉ số (FC, vốn, lãi gộp BQ, điểm hòa vốn, số đơn cần) do CÔNG THỨC trong Base tự tính**. Đưa người dùng link Base để mở xem/chỉnh.
   - Mỗi học viên/doanh nghiệp nên một Base riêng để dạy → tạo bằng `tao-base-mau.mjs --create` rồi push vào đó.

6. **Lưu output** theo CLAUDE.md (xem mục Output bên dưới) + cập nhật `index.md`, ghi `log.md`.

---

## Tham chiếu scripts / references
- `scripts/ke-hoach-loi-nhuan.mjs` — engine tính toán (zero-dep). `--demo` chạy ví dụ studio; `--md <file>` xuất báo cáo.
- `scripts/push-to-lark-base.mjs` — đẩy 1 kế hoạch vào Base (hub + con link, Base tự tính).
- `scripts/tao-base-mau.mjs` — dựng/tái tạo Base mẫu 5 bảng + công thức cross-table (`--create` / `--base-token` / `--demo` / `--demo-only`).
- `scripts/them-huong-dan.mjs --base-token <t>` — thêm bảng "Hướng dẫn sử dụng" + ghi chú (description) cho từng cột nhập. CHẠY SAU khi tạo Base mới cho học viên, để họ nhập tay không bị rối.
- `references/sop-9-buoc.md` — SOP 9 bước chi tiết để dẫn dắt.
- `references/cong-thuc-va-base.md` — công thức, cấu trúc Base, hợp đồng input.
- `references/triet-ly-guru.md` — triết lý gốc + trích dẫn nguồn.

## Lưu ý / gotcha
- **Lợi nhuận trước, vốn sau.** Luôn bắt đầu bằng mục tiêu lợi nhuận (Bước 1), không bắt đầu bằng "cần bao nhiêu vốn".
- **Giá cao ≠ lời cao.** Xếp hạng theo lãi gộp/đơn, không theo giá bán (Bước 2).
- Nếu **lãi gộp ≤ 0** hoặc số đơn/ngày phi thực tế → cảnh báo rõ, đề nghị chỉnh giá/chi phí/mục tiêu **trước khi** tiêu vốn. Không hứa hẹn kết quả.
- Tỉ trọng đơn các SP nên cộng = 1; engine tự chuẩn hóa nếu lệch.
- **Đơn vị tiền = VNĐ thật (đồng)** theo nguyên lý kế toán — KHÔNG hiển thị scale "triệu" trên Base. Ô nhập = field `currency` VND; ô công thức tiền = formula text `TEXT(x,"#,##0") & " ₫"` (formula field không nhận `style`). Input khai theo triệu, engine/push nhân HE_SO=1.000.000. Chi tiết [references/cong-thuc-va-base.md](references/cong-thuc-va-base.md).
- Lark Base: link cell dùng `[{"id":"rec..."}]`; record-upsert `--json` là field map trực tiếp (không bọc `fields`); `record_id` ở `data.record.record_id_list[0]`; table-create trả shape không ổn định → lấy id qua `table-list` (`data.tables[].id`); record-list dùng `--format json` (không `--json`); reverse link đặt tên `DS ...` tránh trùng tên bảng trong công thức. Chi tiết [[lark-base-record-batch-jq-gotcha]].
- Điểm hòa vốn trong Base làm tròn LÊN số đơn (thận trọng) nên doanh thu hòa vốn có thể nhỉnh hơn engine vài %; cả hai đều đúng.

## Output (bám CLAUDE.md)
- Mỗi lần chạy = 1 thư mục `output/YYYY-MM-DD-ke-hoach-loi-nhuan-<tên-DN>/` chứa: `input.json`, `bao-cao.md` (frontmatter `type: output`), ghi lại câu hỏi gốc + link Base.
- Cập nhật `index.md` (mục Output) và ghi `log.md`: `## [YYYY-MM-DD] query | Kế hoạch lợi nhuận <tên-DN>`.
- Nâng cấp wiki nếu tri thức dùng lại lâu dài.
