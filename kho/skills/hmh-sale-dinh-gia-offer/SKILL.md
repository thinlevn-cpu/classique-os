---
name: hmh-sale-dinh-gia-offer
description: >
  Coach chủ doanh nghiệp ĐỊNH GIÁ theo giá trị và THIẾT KẾ OFFER hấp dẫn (Grand Slam Offer) — grounded
  Alex Hormozi ($100M Offers): chấm Phương trình Giá trị (Kết quả mơ ước × Niềm tin / Thời gian × Công sức),
  dựng solution stack (mỗi vấn đề của khách → 1 giải pháp), tính SÀN giá (không lỗ) & TRẦN giá (theo giá trị),
  ra bảng giá 3 tầng Good–Better–Best với biên lãi gộp, bọc offer bằng bảo hành/khan hiếm/quà, trình bày neo giá
  (Cialdini). Engine tính deterministic + ghi Lark Base (link Kế hoạch) + nối thẳng vào bài toán điểm hòa vốn.
  Là MẮT XÍCH nối mô hình kinh doanh (giá trị) với bài toán lợi nhuận (con số) — bán giá cao mà bán ít vẫn lời nhiều hơn.
  Dùng khi người dùng muốn: định giá sản phẩm/dịch vụ, thiết kế gói/offer, làm bảng giá 3 tầng, xử lý "khách chê đắt",
  tăng giá mà không mất khách, đóng gói combo, dạy học viên định giá.
  Kích hoạt khi có từ: định giá, đặt giá, bảng giá, offer, grand slam offer, gói dịch vụ, combo, khách chê đắt,
  tăng giá, value equation, Hormozi, định giá theo giá trị, 3 tầng giá, good better best.
---

# Skill: Định giá & Thiết kế Offer (Grand Slam Offer)

Biến giá trị (mô hình kinh doanh) thành GIÁ và OFFER khiến khách thấy "quá hời" — bán giá cao trên ít khách hơn mà lời nhiều hơn, thay vì đua giảm giá giết biên lãi.

## Triết lý gốc
> "Make people an offer so good they would feel stupid saying no." — Alex Hormozi, *$100M Offers*.

Grounded từ: **Alex Hormozi** ($100M Offers — Value Equation, Grand Slam Offer, solution stack, 5 đòn bẩy + 4 loại guarantee, naming MAGIC), **Ron Baker** (value-based pricing — định giá theo giá trị không theo chi phí), **Robert Cialdini** (anchoring/contrast/scarcity/social proof), **HBR** (Good-Better-Best), **Warren Buffett** (pricing power = lợi thế số 1). Chi tiết + trích dẫn: [references/triet-ly-dinh-gia-offer.md](references/triet-ly-dinh-gia-offer.md).

## Vị trí trong hệ thống — MẮT XÍCH giữa mô hình & con số
```
[[hmh-sale-business-model-canvas]]  →  hmh-sale-dinh-gia-offer  →  [[hmh-sale-ke-hoach-loi-nhuan]]
(giá trị: bán cho ai, value gì)        (Offer + bảng giá 3 tầng)      (giá → điểm hòa vốn)
```
- **Đầu vào** từ BMC: ô *Giá trị* (value prop) + *Khách* (kết quả mơ ước) → chấm Value Equation & dựng stack.
- **Đầu ra** sang bài toán lợi nhuận: giá & CP biến đổi mỗi tầng → bảng Sản phẩm → điểm hòa vốn. Giá bán là biến duy nhất ở **cả hai** vế.

## Tiền điều kiện
- Node + lark-cli (xem [[lark-cli-setup]]). PATH: `export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"`.
- Base mẫu token `__LARK_BASE_TOKEN__` đã có bảng "Offer & Định giá" link "Kế hoạch". Base mới → `tao-bang-offer.mjs`.

## Quy trình thực thi
1. **Coach 6 bước** ([references/sop-dinh-gia.md](references/sop-dinh-gia.md)): chấm Value Equation → liệt kê vấn đề → solution stack → 3 tầng giá → bọc offer → trình bày neo giá.
2. **Tính bằng engine** (deterministic):
   ```bash
   export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"
   node scripts/dinh-gia-offer.mjs <input.json> --md <output-dir>/offer.md
   # hoặc xem ví dụ mẫu: node scripts/dinh-gia-offer.mjs --demo --md
   ```
   Engine trả: Sức mạnh Offer /100 + đòn bẩy yếu nhất, solution stack + tổng giá trị, **sàn/trần giá**, **bảng giá 3 tầng + biên**, cảnh báo (trần < sàn, tầng dưới sàn, offer yếu).
3. **Ghi vào Lark Base** — bảng "Offer & Định giá", link record "Kế hoạch":
   ```bash
   node scripts/tao-bang-offer.mjs --base-token __LARK_BASE_TOKEN__   # (lần đầu nếu chưa có bảng)
   # rồi record-upsert: VE 4 điểm, 3 tầng giá+CPBĐ, stack, bọc offer; link "Kế hoạch":[{"id":"rec..."}]
   ```
   Base tự tính: Sức mạnh Offer, Sàn giá, Trần giá, Biên mỗi tầng — đổi giá là biên cập nhật ngay.
4. **Xuất Offer ra TÀI LIỆU ngay trong Base** (đọc dễ hiểu, gửi khách) — 1 lệnh tự sinh:
   ```bash
   node scripts/xuat-offer-doc.mjs <input.json> --base-token __LARK_BASE_TOKEN__ [--link-record <recId>]
   # xem trước markdown không tạo doc: node scripts/xuat-offer-doc.mjs <input.json> --md-only
   ```
   Script tự: engine tính → render bản trình bày (gói nhận được + bảng giá 3 tầng NEO CAO trước + cam kết; phần biên để mục "🔒 Nội bộ") → `base-block-create` tạo docx trong mục **Tài liệu** của Base → `docs update append` đổ nội dung → (tùy chọn) gắn link vào cột "📄 Doc trình bày" của record Offer. Cần scope `base:block:create` (đã cấp, xem [[lark-cli-setup]]).
5. **Bàn giao sang [[hmh-sale-ke-hoach-loi-nhuan]]**: đổ giá 3 tầng vào bảng Sản phẩm → kiểm "giá này bán bao nhiêu thì sống".
6. **Lưu output** theo CLAUDE.md + cập nhật `index.md`, ghi `log.md`.

## Tham chiếu scripts / references
- `scripts/dinh-gia-offer.mjs` — engine: Value Equation, solution stack, sàn/trần, 3 tầng giá + biên (zero-dep). `--demo` ví dụ Spa; `--md` báo cáo phân tích; `--doc` bản trình bày. Export `dinhGia/renderMarkdown/renderDoc/DEMO` (CLI có guard `isMain` để import an toàn).
- `scripts/xuat-offer-doc.mjs` — TỰ SINH tài liệu offer trình bày NGAY TRONG Base (mục Tài liệu) + gắn link record. `--md-only` để xem trước.
- `scripts/tao-bang-offer.mjs` — thêm bảng "Offer & Định giá" vào Base (link Kế hoạch, công thức sức mạnh/sàn/trần/biên).
- `references/sop-dinh-gia.md` — coach 6 bước.
- `references/triet-ly-dinh-gia-offer.md` — triết lý gốc + trích dẫn.

## Lưu ý / gotcha
- **Khách chê đắt → KHÔNG giảm giá, THÊM bonus / tăng giá trị cảm nhận** (Hormozi). Giảm giá giết biên lãi.
- **Trần giá < sàn biên** = giá trị cảm nhận chưa đủ → quay lại tăng Value Equation, đừng ép giá.
- **Neo cao trước:** trình bày Best → Better → Good (Cialdini).
- Tầng dưới sàn chỉ làm mồi, không làm tầng chính.
- Lark Base: link cell `[{"id":"rec..."}]`; record-upsert `--json` field map trực tiếp; field-update theo `field_id` (tên có dấu/ngoặc → 404); rate-limit `800004135` → nghỉ + retry.

## Output (bám CLAUDE.md)
- Mỗi offer = 1 thư mục `output/YYYY-MM-DD-offer-<tên>/` chứa `input.json` + `offer.md`.
- Cập nhật `index.md` + ghi `log.md`: `## [YYYY-MM-DD] query | Offer & định giá <tên>`.
