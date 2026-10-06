---
name: hmh-mkt-web-dich-vu
description: >
  Thiết kế & dựng website CHO NGÀNH DỊCH VỤ theo chuẩn chuyển đổi của các guru web design hàng đầu thế giới
  (Ran Segall/Flux Academy, Alex Hormozi, Michał Malewicz, Payton Clark Smith). Nhận đầu bài về một doanh
  nghiệp dịch vụ (ngành, dịch vụ, khách hàng, USP, hành động mong muốn) rồi sinh ra một website hoàn chỉnh
  — mặc định là trang HTML/CSS/JS tự chứa, responsive, mobile-first, đủ các khối chuyển đổi (hero rõ ràng →
  nỗi đau → offer value-framed → khác biệt → bằng chứng → quy trình → đảo ngược rủi ro → FAQ → CTA cuối →
  liên hệ click-to-call) — hoặc xuất brief để dựng bằng Framer / WordPress. Grounded có trích dẫn từ phương
  pháp gốc của guru, không bịa.
  Dùng khi người dùng muốn: làm website cho công ty/doanh nghiệp dịch vụ, dựng landing page dịch vụ chuyển đổi,
  thiết kế trang dịch vụ cho khách (spa, luật, kế toán, xây dựng, nha khoa, agency, coaching, BĐS dịch vụ…),
  làm web "chuẩn quốc tế" cho nghề dịch vụ, hoặc đóng gói dịch vụ làm web bán cho doanh nghiệp địa phương.
  Kích hoạt khi có từ: làm website dịch vụ, web cho doanh nghiệp dịch vụ, thiết kế website ngành dịch vụ,
  landing page dịch vụ, trang dịch vụ chuyển đổi, web chuẩn chuyển đổi, dựng web cho khách, web local business,
  high converting service website, làm web bán dịch vụ, website spa/luật/xây dựng/nha khoa/agency.
---

# Skill: Dựng Website Ngành Dịch Vụ (chuẩn chuyển đổi — grounded từ guru thế giới)

Một skill **biến đầu bài doanh nghiệp dịch vụ thành website hoàn chỉnh, hiện đại, tối ưu chuyển đổi** — đứng trên
vai các guru web design hàng đầu thế giới. Mục tiêu không phải "trang web đẹp" mà là **trang web ra khách**.

---

## 1. Triết lý gốc & Nguồn (đứng trên vai người khổng lồ)

Tri thức nền của skill được chắt từ **research thật** (xem [`references/tri-thuc-guru.md`](references/tri-thuc-guru.md)
để xem đầy đủ + trích dẫn). 5 trụ cột:

1. **Alex Hormozi — Phương trình Giá trị.** Mọi headline/offer phải tối đa *(Kết quả mơ ước × Khả năng tin đạt được)*
   và tối thiểu *(Thời gian chờ × Công sức bỏ ra)*; luôn có **đảo ngược rủi ro** (bảo hành/cam kết). Nguồn: *$100M Offers* + video "How I Build Landing Pages".
2. **Ran Segall / Flux Academy — Quy trình & định giá theo giá trị.** Web design là *trò chuyện → chiến lược → art direction → dựng → launch*; nắm chắc 4 nền tảng thiết kế: **phân cấp (hierarchy), màu, chữ (type), bố cục (layout)**. Định giá theo **tầng giá trị** ($500 / $5k / $50k = brochure / thu lead / cỗ máy chuyển đổi).
3. **Michał Malewicz — Phân cấp quan trọng hơn cái đẹp.** "Đẹp ≠ chuyển đổi". Thiết kế bằng **hierarchy strips** (bố cục low-fi + chữ hi-fi), mỗi khối **một tiêu điểm**, dẫn mắt theo thứ tự đọc.
4. **Cấu trúc web dịch vụ chuẩn (đồng thuận nhiều nguồn).** Trang chủ nói rõ *làm gì – cho ai – kết quả gì* trong 5 giây; **mỗi dịch vụ một trang** (tốt cho SEO + chuyển đổi); **niềm tin là tiền tệ** (testimonial, kết quả, badge); **1 CTA rõ mỗi trang**; liên hệ phải dễ (**click-to-call**, map, giờ làm, thời gian phản hồi); **mobile-first** (>60% traffic local từ điện thoại).
5. **Payton Clark Smith — Đóng gói dịch vụ web cho doanh nghiệp địa phương.** SEO bám sẵn từ đầu; gói hoá dịch vụ; bán kèm hợp đồng SEO/bảo trì hằng năm.

> Lớp research YouTube (ai là guru + video flagship + view thật) nằm ở
> [`output/2026-06-09-yt-lam-website-dich-vu/`](../../../output/2026-06-09-yt-lam-website-dich-vu/).

---

## 2. Khi nào dùng / KHÔNG dùng

**Dùng khi:** làm website/landing cho một doanh nghiệp **dịch vụ** (spa, thẩm mỹ, luật, kế toán, xây dựng, nha khoa,
coaching, agency, BĐS dịch vụ, sửa chữa, giáo dục…); cần trang **ra khách** chứ không chỉ đẹp; đóng gói dịch vụ làm web đi bán.

**KHÔNG dùng (chuyển skill khác):**
- Landing page phễu bán **một sản phẩm/khoá** trên Ladipage → [[hmh-mkt-ladipage]] / [[hmh-mkt-leadpage]].
- Website **cá nhân/thương hiệu HMH** theo mẫu có sẵn → dùng output `web-ca-nhan-hmh` làm gốc.
- **E-commerce/bán lẻ nhiều SKU** (giỏ hàng, thanh toán) → cân nhắc WordPress/Shopify, skill này chỉ lo phần marketing site.
- Chỉ cần **infographic/ảnh** → [[hmh-mkt-infographic-html]].

---

## 3. Tiền điều kiện

- **Node ≥ 18** (chạy script scaffold). Trên máy này Node không nằm trên PATH mặc định — xem [[lark-cli-setup]] để biết cách gọi Node.
- Render xem trước/chụp ảnh: **Chrome headless** (xem [[chrome-headless-pdf]] — render trong `%TEMP%` để tránh lỗi path tiếng Việt).
- Không cần API/auth gì thêm cho bản HTML tự chứa.

---

## 4. Quy trình thực thi

### Bước 1 — Lấy đầu bài (brief) doanh nghiệp dịch vụ
Hỏi (hoặc suy từ yêu cầu) tối thiểu:

| Trường | Ý nghĩa | Bắt buộc |
|---|---|---|
| `ten` | Tên doanh nghiệp/thương hiệu | ✅ |
| `nganh` | Ngành dịch vụ (vd "nha khoa thẩm mỹ") | ✅ |
| `dich_vu[]` | Danh sách dịch vụ chính (mỗi cái → 1 khối/1 trang) | ✅ |
| `khach_hang` | Khách mục tiêu + nỗi đau lớn nhất | ✅ |
| `usp` | Khác biệt/lý do chọn (proof của "khả năng đạt được") | nên có |
| `ket_qua` | Kết quả mơ ước khách muốn (Hormozi: Dream Outcome) | nên có |
| `cta` | Hành động mong muốn (gọi/đặt lịch/để lại SĐT) | ✅ |
| `lien_he` | SĐT (click-to-call), địa chỉ, giờ làm, map | ✅ |
| `proof` | Testimonial, số liệu, logo, chứng nhận | nên có |
| `bao_hanh` | Cam kết/đảm bảo (đảo ngược rủi ro) | nên có |
| `thuong_hieu` | Màu chủ đạo, tông giọng, logo (nếu có) | tùy |
| `nen_tang` | `html` (mặc định) · `framer` · `wordpress` | mặc định html |

→ Lưu brief thành `brief.json` để tái lập.

### Bước 2 — Soạn KIẾN TRÚC TRANG theo blueprint chuyển đổi
Đọc [`references/blueprint-trang-dich-vu.md`](references/blueprint-trang-dich-vu.md). Mặc định trang chủ dịch vụ gồm **10 khối** theo đúng thứ tự dẫn mắt (Malewicz) + value-framing (Hormozi):

1. **Hero** — headline *làm gì · cho ai · kết quả gì* + subhead + CTA chính + dải tin cậy (rating/logo/“X khách”).
2. **Nỗi đau** — gọi đúng vấn đề khách đang chịu (agitate).
3. **Dịch vụ / Offer** — đóng khung theo Phương trình Giá trị (kết quả mơ ước, nhanh, dễ, đáng tin).
4. **Vì sao chọn chúng tôi** — khác biệt = bằng chứng "khả năng đạt được".
5. **Bằng chứng xã hội** — testimonial, kết quả trước/sau, con số, chứng nhận.
6. **Quy trình 3–4 bước** — giảm "công sức cảm nhận" của khách.
7. **Đảo ngược rủi ro** — cam kết/bảo hành rõ ràng.
8. **FAQ** — gỡ phản đối còn lại.
9. **CTA cuối** — mạnh, **một** hành động.
10. **Liên hệ** — click-to-call + form ngắn + map + giờ làm + thời gian phản hồi.

> Nếu nhiều dịch vụ và cần SEO → tách **mỗi dịch vụ 1 trang con** (Flux/Payton), trang chủ chỉ tóm tắt + link sang.

### Bước 3 — Scaffold khung dự án
Tạo nhanh thư mục output + khung `index.html` responsive đã wiring sẵn 10 khối:

```bash
node ".claude/skills/hmh-mkt-web-dich-vu/scripts/scaffold.mjs" --brief "duong-dan/brief.json"
# hoặc nhanh:
node ".claude/skills/hmh-mkt-web-dich-vu/scripts/scaffold.mjs" --ten "Nha khoa ABC" --slug "nha-khoa-abc" --mau "#0E7C7B" --sdt "0900000000"
```
→ sinh `output/YYYY-MM-DD-web-<slug>/index.html` (khung placeholder) + copy `brief.json`.

### Bước 4 — VIẾT NỘI DUNG THẬT (đây là phần AI làm, không để placeholder)
Đổ nội dung grounded vào từng khối:
- **Headline (Hormozi):** công thức `Giúp [khách] đạt [kết quả mơ ước] mà không [nỗi sợ/công sức]`. Rõ ràng — không khẩu hiệu mơ hồ, không chơi chữ (nguyên tắc clarity của web dịch vụ).
- **Copy:** ngắn, mỗi khối một ý, mỗi khối một CTA. Tông giọng theo `thuong_hieu`.
- **Tiếng Việt sạch** (xem [[content-fanpage-writing-rules]] nếu cần giọng đời thường): không icon rác, ưu tiên câu rõ nghĩa.
- **Thiết kế (Flux/Malewicz):** phân cấp rõ (cỡ chữ/đậm/khoảng trắng), 1 màu nhấn cho CTA, type ≤ 2 font, ảnh thật ngành (Unsplash nếu chưa có — ghi rõ là minh hoạ).
- **Mobile-first:** kiểm tra menu, nút gọi nổi (sticky call button), form ngắn.

### Bước 5 — Xem trước & kiểm chất lượng
- Mở `index.html` bằng trình duyệt, hoặc chụp ảnh bằng Chrome headless (render trong `%TEMP%`, xem [[chrome-headless-pdf]]).
- **Checklist chuyển đổi** (Malewicz/Hormozi): trong 5s có hiểu *làm gì–cho ai–kết quả*? · mỗi khối 1 tiêu điểm? · CTA nổi bật & lặp lại? · có bằng chứng? · có đảo ngược rủi ro? · click-to-call hoạt động? · đọc tốt trên điện thoại?

### Bước 6 — (Tuỳ chọn) Xuất sang nền tảng khác
- `framer`: xuất **brief thiết kế** (sitemap + nội dung từng section + tông màu/typo) để dựng trên Framer (web hiện đại no-code — Sajid/DesignCode).
- `wordpress`: xuất cấu trúc trang + nội dung + gợi ý theme/block (Tyler Moore/Metics) khi khách cần blog/SEO nặng.

### Bước 7 — Lưu output (BẮT BUỘC theo CLAUDE.md)
- Mọi file trong `output/YYYY-MM-DD-web-<slug>/`: `index.html` (+ trang con nếu có), `brief.json`, ảnh/asset, và 1 file markdown chính `YYYY-MM-DD-web-<slug>.md` (frontmatter `type: output`) ghi lại đầu bài + quyết định thiết kế + trích dẫn guru đã áp.
- Cập nhật `index.md` (mục Output) + ghi `log.md`:
  `## [YYYY-MM-DD] query | web dịch vụ: <tên DN> (<ngành>)`
- Nếu là **mẫu/tài sản tái dùng** (vd template ngành nha khoa) → nâng cấp thành trang `wiki/` hoặc lưu vào `references/` của skill.

---

## 5. Tham chiếu

- [`references/tri-thuc-guru.md`](references/tri-thuc-guru.md) — kho tri thức gốc đã chắt + trích dẫn (đọc khi cần chiều sâu).
- [`references/blueprint-trang-dich-vu.md`](references/blueprint-trang-dich-vu.md) — blueprint 10 khối + mẫu copy + checklist.
- [`scripts/scaffold.mjs`](scripts/scaffold.mjs) — sinh khung dự án website responsive.

## 6. Lưu ý / gotcha

- **Không để placeholder trong bản giao** — scaffold chỉ là khung; Bước 4 phải thay 100% nội dung thật.
- **Ảnh:** Higgsfield hay hết credit → fallback Unsplash, ghi rõ "ảnh minh hoạ".
- **Path tiếng Việt + dấu cách** làm Chrome headless ra trang trắng → render trong `%TEMP%` (xem [[chrome-headless-pdf]]).
- **Đừng nhồi mọi dịch vụ vào 1 trang** nếu khách cần SEO → tách trang con (Flux/Payton).
- **Đẹp mà không chuyển đổi là hỏng** (Malewicz) — luôn chạy checklist Bước 5 trước khi coi là xong.

## 7. Output
Bám CLAUDE.md: mỗi website = **một thư mục** `output/YYYY-MM-DD-web-<slug>/`, không để file rời; cập nhật `index.md` + `log.md`.

## 8. Đưa web LÊN MẠNG (deploy)
Khi cần xuất web ra link công khai + gắn tên miền → chuyển sang skill [[AIOS-deploy-cloudflare]]: deploy thư mục web lên **Cloudflare Pages** ra link `*.pages.dev` ngay, rồi gắn domain riêng (classique.vn/.net/.online), SSL tự động. ⚠️ Đây là hành động ra ngoài — xác nhận với người dùng trước khi chạy.
