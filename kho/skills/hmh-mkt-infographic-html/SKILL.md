---
name: hmh-mkt-infographic-html
description: >-
  Tự thiết kế infographic chuyên nghiệp bằng HTML/CSS rồi render ra ảnh PNG nét cao (Chrome headless) —
  KHÔNG cần người dùng đụng tay vào công cụ design. Người dùng chỉ đưa chủ đề/nội dung; skill tự nghĩ
  bố cục, chia ý, đổ vào template tái dùng (đồng bộ nhận diện thương hiệu), xuất tấm ảnh sẵn đăng.
  Grounded từ guru thiết kế thông tin: Edward Tufte (data-ink, chống chartjunk), David McCandless
  (nội dung trước - thiết kế sau), Robin Williams (C.R.A.P.). Chữ tiếng Việt sạch tuyệt đối.
  Dùng khi người dùng muốn: làm infographic, tấm thông tin/kiến thức, ảnh "carousel" tri thức,
  hình tóm tắt N bước / N điểm / cấp độ, đa dạng hóa thiết kế ảnh content, ra cả loạt ảnh cùng bộ nhận diện,
  ảnh đồ họa thông tin để đăng Facebook/Threads/LinkedIn.
  Kích hoạt khi có từ: làm infographic, thiết kế infographic, infography, tấm thông tin, ảnh tri thức,
  đồ họa thông tin, ảnh tóm tắt, ảnh N bước, ảnh cấp độ, design ảnh content, ảnh kiến thức để đăng,
  HTML ra ảnh, render ảnh PNG, đa dạng hóa thiết kế hình ảnh, ảnh carousel.
---

# Skill: hmh-mkt-infographic-html — Lò đúc infographic (HTML → PNG)

Biến **một chủ đề** thành **một tấm infographic hoàn chỉnh, sẵn đăng** mà người dùng không phải mở Canva,
không kéo-thả, không căn lề. AI tự nghĩ nội dung + tự đổ vào template + tự render ra PNG.

> Quy trình 1 đầu vào: *người dùng đưa chủ đề → AI ra ảnh.* Template tái dùng → ra cả **loạt** tấm đồng bộ nhận diện.

## Triết lý gốc (grounded — không bịa)
Đứng trên vai 3 guru thiết kế thông tin (research đầy đủ: `output/2026-06-08-research-infographic-design/`):
- **Edward Tufte** — *data-ink ratio*, chống *chartjunk*: mỗi yếu tố phải tải nghĩa, bỏ trang trí thừa.
- **David McCandless** (*Information is Beautiful*) — *Data + Concept + Goal + Design*, **80% nội dung / 20% thiết kế**: chốt thông điệp trước, đẹp sau.
- **Robin Williams** (*The Non-Designer's Design Book*) — **C.R.A.P.**: Contrast · Repetition · Alignment · Proximity.

Bản đúc 7 luật vàng + bảng theme màu + quy tắc chữ: đọc `references/design-principles.md` TRƯỚC khi viết tấm.

## Khi nào dùng / KHÔNG dùng
- **Dùng:** cần một (hoặc loạt) **ảnh đồ họa thông tin** — tóm tắt kiến thức, N bước, N điểm, cấp độ, so sánh — để đăng MXH; muốn đa dạng hóa/đồng bộ thiết kế ảnh content.
- **KHÔNG dùng:**
  - Cần **ảnh minh họa nghệ thuật / nhân vật / cảnh 3D** → dùng Higgsfield (MCP) hoặc Canva, không phải skill này.
  - Cần **design mở ra chỉnh tay trong Canva** → dùng Canva MCP.
  - Chỉ cần **viết caption/nội dung bài** (không cần ảnh) → các skill `mkt-content-*`.
  - Slide thuyết trình → `lark-slides` / Marp.

## Tiền điều kiện
- **Chrome** (hoặc Edge dự phòng) đã cài — script tự dò. Trên máy này: `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Chạy bằng PowerShell (Windows). Không cần internet (template self-contained, font hệ thống Segoe UI + Segoe UI Emoji).

## Quy trình thực thi
1. **Chốt nội dung trước** (luật McCandless 80/20). Xác định: chủ đề · **thông điệp lớn** (1 câu) · đối tượng · góc nhìn · số card (3–6). Nếu người dùng đưa nội dung thô → chắt thành tiêu đề + các ý. Nếu lấy từ `raw/` → áp [[hmh-AIOS-rebrand-doi-ten]].
2. **Đọc** `references/design-principles.md` — nắm 7 luật + chọn **theme màu** hợp chủ đề (tím-cyan/xanh lá/cam/xanh dương) + quy tắc độ dài chữ.
3. **Tạo thư mục output**: `output/YYYY-MM-DD-infographic-<chủ-đề>/` (đúng CLAUDE.md — mỗi kết quả 1 thư mục).
4. **Dựng HTML**: copy `templates/base-list.html` vào thư mục output (đổi tên `<chủ-đề>.html`), rồi sửa:
   - Khối `:root` → áp theme đã chọn.
   - `kicker`, `h1` (2 dòng, viết HOA), `sub` (câu dẫn tò mò).
   - Các `.card` (mỗi card 1 ý: badge số/nhãn + emoji tải nghĩa + h2 ngắn + p nhấn `<b>` từ khóa). Card chốt thêm class `peak`.
   - `.insight` (1 thông điệp lớn, nhấn `<span>` vàng). Footer: hashtag thương hiệu + `@Hoàng Minh Hóa`.
5. **Render PNG**:
   ```powershell
   powershell -File ".claude\skills\hmh-mkt-infographic-html\scripts\render-png.ps1" `
     -Html "output\YYYY-MM-DD-infographic-x\x.html" `
     -Out  "output\YYYY-MM-DD-infographic-x\x.png" `
     -Width 1080 -Height <250 + 162*sốCard + 220> -Scale 2
   ```
   (Ví dụ 5 card → Height ≈ 1450. Tính dư ~30px rồi xem ảnh, chỉnh nếu hụt/thừa.)
6. **Kiểm bằng mắt**: Read file PNG. Soát: không cắt xén, chữ Việt đúng dấu, tương phản đủ, footer đủ. Hụt chiều cao → tăng `-Height` render lại.
7. **Lưu & ghi sổ**: cập nhật `index.md` (mục Output) + `log.md` (prefix `## [YYYY-MM-DD] query | infographic …`).
8. **Loạt nhiều tấm**: lặp bước 4–6 với cùng theme/footer (Repetition) → bộ ảnh đồng bộ nhận diện.

## Tham chiếu
- `scripts/render-png.ps1` — render HTML→PNG (tự dò Chrome/Edge, xử lý gotcha path tiếng Việt).
- `templates/base-list.html` — template card dọc đánh số (ladder / N bước / N điểm). Đã verify render.
- `references/design-principles.md` — 7 luật vàng, bảng theme màu, quy tắc chữ, biến thể bố cục.

## Lưu ý / gotcha (đã xác nhận trên máy này)
- **Path tiếng Việt + dấu cách** ("HOÁ TRI THỨC") làm Chrome đôi khi ra ảnh **TRẮNG** → script đã tự copy HTML sang `%TEMP%` (ASCII) render rồi copy về. Đừng render thẳng trong thư mục dự án.
- **Sandbox PowerShell chặn `Remove-Item`** (static-analysis nhầm path "C:\Program") → script KHÔNG dọn temp; vô hại, Windows tự dọn `%TEMP%`.
- **Template phải self-contained**: CSS inline, icon = emoji/SVG, KHÔNG ảnh ngoài → chỉ cần copy 1 file HTML là render được.
- **Chiều cao**: `--screenshot` chụp đúng `--window-size`; tính Height theo số card, để dư rồi xem lại. Thừa nhiều → giảm; hụt → chữ bị cắt đáy.
- **Chữ Việt**: Segoe UI render dấu chuẩn. Tránh font web (offline không tải được).

## Output
Bám CLAUDE.md mục 5: mỗi tấm/loạt = 1 thư mục `output/YYYY-MM-DD-infographic-…/` chứa cả `.html` + `.png`; cập nhật `index.md` + `log.md`. Nếu là tri thức dùng lại → cân nhắc nâng lên `wiki/`.
