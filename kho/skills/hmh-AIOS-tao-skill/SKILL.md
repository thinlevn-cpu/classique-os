---
name: hmh-AIOS-tao-skill
description: >
  Nguyên tắc & khuôn mẫu BẮT BUỘC khi tạo bất kỳ skill mới nào cho hệ thống của Hoàng Minh Hóa.
  Gồm 2 luật: (1) ĐẶT TÊN theo lĩnh vực — marketing → tiền tố `mkt-`, bán hàng → `sale-`, vận hành → `AIOS-`,
  rồi tới phần mô tả công dụng rõ ràng để người dùng biết chọn; (2) CẤU TRÚC — trước khi viết phải đi lấy
  kiến thức của người sáng lập/guru gốc của lĩnh vực đó (research thật, có trích dẫn) rồi dựng SKILL.md theo
  đúng khung "AI hiểu". Dùng khi người dùng muốn tạo skill mới, chuẩn hoá/đổi tên skill cũ, hoặc review danh
  sách skill cho đúng quy ước. Kích hoạt khi có từ: tạo skill, làm skill mới, nguyên tắc đặt tên skill, chuẩn
  hoá skill, đổi tên skill, mkt sale AIOS, review skill, lò đúc skill.
---

# Skill: Nguyên tắc tạo Skill (lò đúc skill — chuẩn HMH)

Đây là **khuôn vàng thước ngọc** để mọi skill trong hệ thống nhất quán, dễ tìm, dễ chọn, và **grounded vào
tri thức gốc** chứ không bịa. Khi tạo bất kỳ skill mới nào → **đọc skill này trước, làm theo đúng 2 luật dưới.**

---

## LUẬT 1 — ĐẶT TÊN (`hmh-` + tiền tố lĩnh vực + công dụng rõ ràng)

### 1a. Cấu trúc tên bắt buộc: `hmh-<lĩnh-vực>-<công-dụng>`
**Mọi skill của HMH BẮT BUỘC bắt đầu bằng `hmh-`** (token sở hữu — để lọc nhanh skill của Hoàng Minh Hóa
khỏi skill global `lark-*`/built-in), rồi tới tiền tố lĩnh vực, rồi công dụng:

| Lĩnh vực | Tiền tố đầy đủ | Ví dụ tên skill |
|---|---|---|
| **Marketing** (thu hút, nội dung, thương hiệu, quảng cáo, research thị trường, lead magnet, landing/sales page, content YouTube/FB/TikTok…) | **`hmh-mkt-`** | `hmh-mkt-content-tri-thuc`, `hmh-mkt-research-youtube`, `hmh-mkt-ladipage` |
| **Bán hàng** (tư vấn, xử lý từ chối, chốt đơn, phễu/LTV, định giá, ngân sách chuyển đổi…) | **`hmh-sale-`** | `hmh-sale-xu-ly-tu-choi`, `hmh-sale-pheu-ltv`, `hmh-sale-muc-tieu-tai-chinh` |
| **Vận hành** (đồng bộ data, báo cáo tự động, gửi mail/hệ thống, đăng bài, tích hợp Lark/Pancake/WordPress, lò đúc skill, lịch tự động…) | **`hmh-AIOS-`** | `hmh-AIOS-bao-cao-fanpage`, `hmh-AIOS-sync-pancake-lark`, `hmh-AIOS-tao-skill` |

- **`hmh`** viết thường, luôn đứng đầu. **`AIOS`** = AI Operating System — viết HOA (token thương hiệu, xem [[aios-gateway]]). `mkt`/`sale` viết thường.
- Skill thuần tiện ích/hạ tầng không thuộc 3 nhóm trên (vd wrapper Lark gốc) → giữ tên mô tả rõ, không ép tiền tố.

### 1b. Phần sau tiền tố = CÔNG DỤNG rõ ràng
- Đặt tên dạng `hmh-<lĩnh-vực>-<chức-năng-cụ-thể>`, kebab-case, tiếng Việt không dấu hoặc Anh ngắn gọn.
- **Người dùng đọc tên là biết chọn** — tránh tên mơ hồ (`tool-1`, `helper`, `xu-ly`). Nêu đối tượng/kết quả:
  `hmh-mkt-content-tri-thuc` (rõ: làm content tri thức) tốt hơn `mkt-content`.
- `name:` trong frontmatter **trùng** tên thư mục skill.

---

## LUẬT 2 — CẤU TRÚC (grounded từ guru gốc + khung AI hiểu)

### 2a. Trước khi viết: ĐI LẤY KIẾN THỨC NGƯỜI SÁNG LẬP / GURU GỐC
Mọi skill nghiệp vụ phải **đứng trên vai người khổng lồ**, không tự chế:
1. Xác định **ai là người sáng lập / chuyên gia số 1** của lĩnh vực skill (vd phễu → Russell Brunson, Dan Kennedy, Alex Hormozi; hook video → Callaway; sales page → Phạm Thành Long).
2. **Research thật** phương pháp của họ (WebSearch / video / sách / nguồn trong `raw/` hoặc NotebookLM) — **không đoán mò**. Lưu bản research vào `output/YYYY-MM-DD-research-<chủ-đề>/`.
3. Chắt lọc thành nguyên lý cốt lõi, **giữ trích dẫn nguồn** trong skill.
> Đây là tiêu chuẩn đã có sẵn trong các skill phễu (xem `hmh-sale-pheu-ltv`, `hmh-mkt-hook-video`, `hmh-mkt-ladipage`).

### 2b. Khung SKILL.md chuẩn "AI hiểu" (theo chuẩn Anthropic Agent Skills)
Một SKILL.md tốt cho AI gồm các phần theo thứ tự:
1. **Frontmatter** — `name` (trùng thư mục, đúng tiền tố) + `description` GIÀU TRIGGER:
   - 1–3 câu nói skill làm gì,
   - câu **"Dùng khi người dùng muốn…"**,
   - câu **"Kích hoạt khi có từ: …"** (liệt kê từ khoá tiếng Việt người dùng hay gõ).
   *(Description là thứ DUY NHẤT AI dùng để quyết định gọi skill — viết cho máy chọn đúng.)*
2. **Tiêu đề + 1 câu tóm tắt** skill.
3. **Triết lý gốc / Nguồn** — trích guru + link bản research (Luật 2a).
4. **Khi nào dùng / KHÔNG dùng** (ranh giới với skill khác).
5. **Tiền điều kiện** (tool/MCP/auth/PATH cần có) nếu có.
6. **Quy trình thực thi** — các **bước đánh số**, mỗi bước có hành động + lệnh/tool cụ thể (copy-paste chạy được).
7. **Tham chiếu tool / scripts / references** — đặt code trong `scripts/`, tài liệu dài trong `references/`.
8. **Lưu ý / gotcha** — lỗi hay gặp + cách tránh.
9. **Output** — bám CLAUDE.md: mỗi kết quả 1 thư mục `output/YYYY-MM-DD-…/`, cập nhật `index.md` + `log.md`.

### 2c. Thư mục skill
```
.claude/skills/<tien-to>-<ten>/
├── SKILL.md            # theo khung 2b
├── scripts/            # script .mjs/.ps1 chạy được (KHÔNG nhúng logic dài vào SKILL.md)
└── references/         # SOP, bảng tra, tài liệu dài (đọc khi cần)
```

---

## Quy trình tạo 1 skill mới (checklist)
1. Phân loại lĩnh vực → chọn tiền tố đầy đủ `hmh-mkt-`/`hmh-sale-`/`hmh-AIOS-`.
2. Đặt tên `hmh-<lĩnh-vực>-<công-dụng>` rõ ràng.
3. Research guru gốc → lưu `output/…-research-…/` (Luật 2a).
4. Viết `SKILL.md` theo khung 2b (frontmatter giàu trigger là quan trọng nhất).
5. Tách code ra `scripts/`, tài liệu dài ra `references/`.
6. Test các script/tool thật trước khi coi là xong.
7. Ghi `log.md` + (nếu là tài sản dùng lại) lưu memory dự án.

## Khi REVIEW / SỬA skill cũ
- Đối chiếu từng skill với Luật 1 & 2 → lập **bảng đề xuất đổi tên** (cũ → mới).
- ⚠️ Đổi tên là **thao tác phá vỡ**: kéo theo tên lệnh `/slash`, đường dẫn script (vd `run-daily.ps1`), scheduled task, memory, và cross-ref giữa các skill (vd `hmh-sale-nha-may-pheu` gọi `hmh-mkt-ladipage`). → **Trình bày bản đồ đổi tên + rủi ro, hỏi người dùng trước khi đổi hàng loạt.** Áp ngay cho skill MỚI; skill cũ đổi có kiểm soát.

## Lưu ý
- Quy ước này áp cho **skill nghiệp vụ của HMH**, KHÔNG đụng skill global `lark-*` (plugin) hay skill built-in.
- Tiền tố giúp người dùng & AI **lọc nhanh theo lĩnh vực** — đây là mục tiêu số 1 của luật đặt tên.
