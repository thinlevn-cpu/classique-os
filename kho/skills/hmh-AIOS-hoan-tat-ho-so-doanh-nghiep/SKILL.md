---
name: hmh-AIOS-hoan-tat-ho-so-doanh-nghiep
description: >
  AUDIT rồi ĐIỀN NỐT hồ sơ doanh nghiệp trong `wiki/` — bộ ngữ cảnh nền mà MỌI skill sale/marketing khác
  đọc trước khi chạy: Chân dung doanh nghiệp (định vị + ICP), Brand Voice (giọng thương hiệu), Chân dung CEO
  (nếu thương hiệu gắn với cá nhân), Nguyên tắc làm việc của AI, và Danh mục sản phẩm & dịch vụ (mỗi sản
  phẩm 1 trang có giá + USP). Quy trình: quét wiki chấm trạng thái ✅/⚠️/❌ từng mục → hỏi thẳng người dùng →
  nếu người dùng "không biết" thì chuyển sang PHỎNG VẤN GỢI MỞ theo bộ câu hỏi có sẵn → tóm tắt xác nhận →
  ghi thành trang wiki có liên kết chéo. Bổ trợ cho `hmh-sale-bmc-phong-van-chi-tiet` (skill kia lo 9 ô BMC
  + trang phân khúc/giá trị; skill này lo phần hồ sơ nhận diện còn lại). Dùng khi người dùng muốn: hoàn tất
  hồ sơ doanh nghiệp, xem bộ não còn thiếu ngữ cảnh gì để AI hiểu doanh nghiệp, setup hồ sơ công ty lần đầu,
  kiểm tra thông tin doanh nghiệp đã đủ chưa, viết giọng thương hiệu, lập danh mục sản phẩm & giá.
  Kích hoạt khi có từ: hoàn tất hồ sơ doanh nghiệp, hoàn thiện hồ sơ công ty, thiếu ngữ cảnh gì, business context,
  audit hồ sơ, setup hồ sơ công ty, chân dung doanh nghiệp, brand voice, giọng thương hiệu, chân dung CEO,
  danh mục sản phẩm, AI hiểu doanh nghiệp của tôi.
---

# Hoàn tất hồ sơ doanh nghiệp — Audit & điền nốt ngữ cảnh nền

Bộ não này chỉ trả lời hay khi **biết bạn là ai**. Skill này quét xem `wiki/` còn thiếu ngữ cảnh nền nào, rồi hỏi/phỏng vấn để điền nốt — để mọi skill sale/marketing sau đó không phải hỏi lại hoặc tự bịa.

## Vì sao cần skill này

Các skill khác ([[hmh-mkt-validate-ngach]], [[hmh-mkt-phan-tich-doi-thu]], [[hmh-sale-dinh-gia-offer]], [[hmh-mkt-ladipage]], [[hmh-mkt-content-da-kenh]]…) đều **đọc `index.md` + `wiki/` trước khi chạy** (CLAUDE.md §5). Nếu wiki chưa có trang doanh nghiệp, chúng buộc phải hỏi lại người dùng từ đầu mỗi lần, hoặc tệ hơn — tự suy diễn định vị/ICP/giá. Hồ sơ đầy đủ = mọi skill sau chạy trơn và nhất quán.

**Hồ sơ này thuộc Tầng 2 (`wiki/`)** — tri thức bền vững, AI sở hữu và duy trì, không phải kết quả một lần trong `output/`.

## Ranh giới với skill khác (đọc kỹ — tránh trùng lặp)

| Việc | Skill lo |
|---|---|
| 9 ô Business Model Canvas + sơ đồ `.canvas` | [[hmh-sale-bmc-phong-van-chi-tiet]] (hoặc [[hmh-sale-business-model-canvas]] nếu muốn bản nhanh + Lark) |
| Trang chi tiết từng phân khúc khách hàng (PK) & giá trị cốt lõi (GT) | [[hmh-sale-bmc-phong-van-chi-tiet]] |
| File Đánh giá mô hình kinh doanh | [[hmh-sale-bmc-phong-van-chi-tiet]] |
| Bản đồ nỗi đau ↔ sung sướng, xếp hạng, gom cụm nội dung | [[hmh-mkt-chan-dung-dau-suong]] |
| Định giá & đóng gói offer 3 tầng | [[hmh-sale-dinh-gia-offer]] |
| **Chân dung doanh nghiệp (định vị, ICP)** | **skill này** |
| **Brand Voice — giọng thương hiệu** | **skill này** |
| **Chân dung CEO (có điều kiện)** | **skill này** |
| **Nguyên tắc làm việc của AI trong bộ não** | **skill này** |
| **Danh mục sản phẩm & dịch vụ (≥1 sản phẩm thật)** | **skill này** |

→ Với các mục thuộc BMC, skill này **KHÔNG tự phỏng vấn lại** — chỉ audit trạng thái rồi hướng dẫn người dùng chạy skill BMC. Ngược lại, nếu người dùng **vừa chạy BMC xong**, tận dụng câu trả lời đó (Customer Segments → ICP, Value Propositions → giá trị cốt lõi, Revenue Streams → bảng giá), **đừng bắt họ trả lời lại từ đầu**.

## Tiền điều kiện

Không cần API key. Chỉ đọc/ghi file trong bộ não.

---

## Bước 1 — AUDIT (luôn làm đầu tiên)

Trước khi hỏi bất cứ điều gì, **quét thực tế** — đừng đoán:

1. Đọc `index.md` (mục lục nội dung).
2. Liệt kê `wiki/entities/` và `wiki/concepts/`.
3. Liệt kê `raw/` — có nguồn nào người dùng đã thả vào mà điền được hồ sơ luôn không (brochure, bảng giá, bài giới thiệu công ty, transcript). **Đọc nguồn trước khi hỏi** — hỏi lại điều tài liệu đã trả lời là làm mất thời gian của người dùng.
4. Liệt kê `output/` — đã chạy BMC hay chân dung khách hàng chưa (tận dụng dữ liệu).

Chấm trạng thái từng mục:

- ✅ **Đầy đủ** — trang có nội dung thật, không còn placeholder.
- ⚠️ **Có trang nhưng còn trống/sơ sài** — dấu hiệu: còn `[Tên]`/`{{...}}` trong tên file hay heading; mục gạch đầu dòng rỗng; bảng có ô trống; còn nguyên câu hướng dẫn mẫu.
- ❌ **Chưa có** — chưa có trang nào.

Các mục cần chấm:

| # | Mục | Trang đích trong wiki |
|---|---|---|
| 1 | Chân dung doanh nghiệp (định vị, ICP, giá trị, kênh) | `wiki/entities/<Tên doanh nghiệp>.md` |
| 2 | Brand Voice — giọng thương hiệu | `wiki/concepts/Brand Voice — Giọng thương hiệu.md` |
| 3 | Chân dung CEO — **CÓ ĐIỀU KIỆN** (xem Bước 1b) | `wiki/entities/<Tên CEO>.md` |
| 4 | Nguyên tắc làm việc của AI trong bộ não | `wiki/concepts/Nguyên tắc làm việc của AI.md` |
| 5 | Danh mục sản phẩm & dịch vụ (≥1 sản phẩm THẬT) | `wiki/concepts/Danh mục sản phẩm & dịch vụ.md` + 1 trang/sản phẩm trong `wiki/entities/` |
| 6 | *(giao skill BMC)* Business Model Canvas 9 ô + `.canvas` | `output/YYYY-MM-DD-bmc-…/` |
| 7 | *(giao skill BMC)* Trang chi tiết PK/GT | `output/YYYY-MM-DD-bmc-…/MHKD/` |
| 8 | *(giao skill BMC)* Đánh giá mô hình kinh doanh | `output/YYYY-MM-DD-bmc-…/` |

In ra **checklist gọn** cho người dùng, tách rõ mục nào skill này lo, mục nào giao skill BMC:

```
📋 Trạng thái hồ sơ doanh nghiệp

Skill này lo:
  ⚠️ Chân dung doanh nghiệp — có trang, còn thiếu ICP & kênh
  ❌ Brand Voice — chưa có
  ⚠️ Chân dung CEO — (cần xác nhận: thương hiệu có gắn với cá nhân không?)
  ❌ Nguyên tắc làm việc của AI — chưa có
  ❌ Sản phẩm & dịch vụ — chưa có trang sản phẩm nào

Giao cho /hmh-sale-bmc-phong-van-chi-tiet:
  ❌ Business Model Canvas (9 ô) + .canvas
  ❌ Trang chi tiết phân khúc / giá trị cốt lõi
  ❌ Đánh giá mô hình kinh doanh
```

## Bước 1b — Xác nhận có cần Chân dung CEO không

Chân dung CEO chỉ **bắt buộc nếu doanh nghiệp phụ thuộc brand cá nhân** (khách mua vì tin con người trước khi tin công ty). **Trước khi coi nó là "thiếu", HỎI:** "Thương hiệu của bạn có gắn liền với cá nhân người sáng lập/CEO không (khách biết đến qua Facebook/TikTok cá nhân, mua vì tin CEO)?"

- **Có** → coi là mục cần hoàn tất, phỏng vấn như các mục khác.
- **Không** → đánh dấu "không áp dụng (N/A)", bỏ qua, **không** tính là thiếu.

## Bước 2 — Chọn thứ tự & xác nhận

Sau khi in checklist, hỏi người dùng muốn bắt đầu từ mục nào. Không có ý kiến → đề xuất thứ tự: **Chân dung doanh nghiệp → Sản phẩm & dịch vụ → Brand Voice → (Chân dung CEO nếu áp dụng) → Nguyên tắc làm việc của AI**.

Làm **từng mục một**, không dồn tất cả câu hỏi vào một lượt. Nói rõ còn bao nhiêu mục nữa để người dùng biết đường dài.

## Bước 3 — HỎI & PHỎNG VẤN từng mục

Với mỗi mục ⚠️/❌: **hỏi thẳng người dùng cung cấp thông tin trước** — họ thường đã biết sẵn và trả lời nhanh hơn là bị phỏng vấn.

**Nếu người dùng nói "không biết" / mơ hồ / "bạn hỏi tôi đi"** → chuyển sang **chế độ phỏng vấn**: mở `references/cau-hoi-phong-van.md`, lấy đúng bộ câu hỏi gợi mở của mục đó, hỏi **từng cụm nhỏ (2–4 câu/lượt)**, để người dùng trả lời tự do, rồi mới tổng hợp thành nội dung trang. Đừng đọc nguyên văn cả danh sách một lúc.

Nguyên tắc khi phỏng vấn:
- **Không bịa.** Người dùng chưa có (chưa có case study, chưa có số liệu, chưa có testimonial) → ghi "chưa có" và để mục đó ngắn, đừng nhồi cho đầy.
- **Với Sản phẩm & dịch vụ:** mỗi sản phẩm/gói thật = 1 trang riêng trong `wiki/entities/`, rồi liệt kê tất cả trong trang hub `wiki/concepts/Danh mục sản phẩm & dịch vụ.md`. Hỏi lặp lại cụm câu hỏi cho từng sản phẩm.
- **Với Nguyên tắc làm việc của AI:** thường chỉ cần điều chỉnh nhẹ, không viết lại từ đầu. Nếu người dùng muốn nguyên tắc đó **AI luôn tuân theo trong mọi phiên**, nói rõ chỗ đúng của nó là `CLAUDE.md` (§10) và **hỏi trước khi sửa `CLAUDE.md`** — đó là file cấu hình cốt lõi, không tự ý chỉnh.

## Bước 4 — GHI AN TOÀN vào wiki

Frontmatter theo đúng quy ước CLAUDE.md §3:

```yaml
---
type: entity          # hoặc concept
title: <Tên trang>
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [ho-so-doanh-nghiep, <tag khác>]
sources: [<tên nguồn trong raw/ nếu có>]
---
```

Quy tắc ghi:
- **Trang chưa có** → tạo mới trong `wiki/entities/` (người, tổ chức, sản phẩm) hoặc `wiki/concepts/` (khái niệm: giọng thương hiệu, nguyên tắc, danh mục).
- **Trang chỉ là bản trống/sơ sài** → điền thẳng vào, cập nhật `updated`.
- **Trang đã có nội dung THẬT** → **KHÔNG ghi đè âm thầm**: cho người dùng xem nội dung cũ, hỏi họ muốn ghi đè / bổ sung / giữ nguyên. Nếu thông tin mới **mâu thuẫn** cái cũ → ghi rõ cả hai kèm ngày (CLAUDE.md §3), đừng xoá lịch sử.
- **Trích dẫn nguồn**: mọi sự thật lấy từ `raw/` phải ghi `(theo [[sources/tên-nguồn]])`.
- **Liên kết chéo rộng tay**: trang doanh nghiệp là hub — link tới Brand Voice, CEO, từng sản phẩm; các trang con link ngược lại. Mọi trang phải có ≥1 liên kết vào (không để trang mồ côi).
- **Tóm tắt trước khi ghi**: sau mỗi mục phỏng vấn, tóm tắt bằng gạch đầu dòng cho người dùng xác nhận/sửa **rồi mới ghi file**.

## Bước 5 — KẾT THÚC & lưu vết

1. In lại **checklist đã cập nhật** (mục nào giờ ✅, còn mục nào ⚠️/❌).
2. **Cập nhật `index.md`** — thêm dòng cho từng trang wiki mới (mục Thực thể / Khái niệm), kèm tóm tắt một câu.
3. **Ghi `log.md`**: `## [YYYY-MM-DD] ingest | Hồ sơ doanh nghiệp — <các mục đã hoàn tất>`.
4. **Lưu bản checklist audit vào `output/`** (theo CLAUDE.md §5.4 — mọi kết quả trả về đều có bản lưu): `output/YYYY-MM-DD-audit-ho-so-doanh-nghiep/YYYY-MM-DD-audit-ho-so-doanh-nghiep.md` — ghi trạng thái trước/sau + việc còn thiếu để lần sau tiếp tục.
5. **Củng cố `wiki/overview.md`** — nếu hồ sơ mới làm rõ định vị/hướng đi toàn cục.
6. Nếu BMC / PK-GT / Đánh giá vẫn thiếu → nhắc người dùng chạy [[hmh-sale-bmc-phong-van-chi-tiet]] để hoàn tất phần mô hình kinh doanh.
7. Nếu còn mục identity ⚠️/❌ mà người dùng chưa muốn làm hôm nay → ghi rõ còn thiếu gì trong file audit, đừng ép làm hết trong một lượt.

## Tham chiếu references

- `references/cau-hoi-phong-van.md` — bộ câu hỏi gợi mở chi tiết cho từng mục (chân dung doanh nghiệp, brand voice, CEO, nguyên tắc AI, sản phẩm), chia theo cụm 2–4 câu.

## Lưu ý / gotcha

- **Audit trước, hỏi sau.** Đừng hỏi thông tin mà `raw/` hoặc `wiki/` đã có.
- **Đây là skill sinh trang `wiki/`, không phải kết quả một lần** — hồ sơ phải sống lâu và được cập nhật, khác với output trong `output/`.
- **Không tự sửa `CLAUDE.md`** — nếu cần đưa nguyên tắc vào đó, hỏi người dùng trước.
- **Không xoá/ghi đè** trang có nội dung thật; mâu thuẫn thì nêu cả hai + ngày.
- Doanh nghiệp không phụ thuộc brand cá nhân → **bỏ hẳn** Chân dung CEO, đừng tính là thiếu rồi ép làm.
- Ngôn ngữ: tiếng Việt. Heading có thể dùng "English (Tiếng Việt)" khi thuật ngữ gốc quan trọng.

## Output (bám CLAUDE.md)

- Trang bền vững → `wiki/entities/` + `wiki/concepts/` (có liên kết chéo, có `sources`).
- Bản checklist audit → `output/YYYY-MM-DD-audit-ho-so-doanh-nghiep/`.
- Cập nhật `index.md` + ghi `log.md` với prefix `ingest`.
