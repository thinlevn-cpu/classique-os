---
name: hmh-mkt-chan-dung-dau-suong
description: >
  Dựng CHÂN DUNG khách hàng mục tiêu (7 tiêu chí buyer persona) rồi vẽ BẢN ĐỒ Nỗi đau ↔ Sự sung sướng ↔
  Trải nghiệm, XẾP HẠNG theo mức ảnh hưởng (QuickSort) và gom thành CỤM NỘI DUNG (mỗi cụm = 1 bộ video/blog/post).
  Đây là tầng ĐẦU NGUỒN đứng trước mọi việc làm content & bán hàng — grounded từ 6 guru: Ryan Deiss (Before-After
  Grid), Eugene Schwartz (mass desire — tìm khát khao có thật, không bịa), HubSpot/Adele Revella (buyer persona),
  Alex Hormozi (Value Equation để xếp hạng sung sướng), Tony Robbins (pain↔pleasure là 2 động lực gốc), Russell
  Brunson (Dream 100 — khách tụ tập ở kênh nào). Có engine tính deterministic (zero-dep) ra báo cáo Markdown.
  Dùng khi người dùng muốn: xác định khách hàng mục tiêu / chân dung khách / buyer persona, liệt kê & xếp hạng nỗi
  đau và mong muốn của khách, lập bản đồ pain-pleasure, biết nên làm content gì trước, lên cụm/nhóm nội dung từ
  insight khách, hoặc dạy học viên cách phân tích khách hàng trước khi viết content/định giá.
  Kích hoạt khi có từ: chân dung khách hàng, khách hàng mục tiêu, đối tượng mục tiêu, buyer persona, customer
  avatar, nỗi đau khách hàng, pain point, mong muốn khách hàng, sự sung sướng, before after, bản đồ đau sướng,
  xếp hạng nỗi đau, insight khách hàng, nên làm content gì, cụm nội dung, nhóm nội dung, phân tích khách hàng.
---

# Skill: Chân dung khách hàng & Bản đồ Nỗi đau ↔ Sự sung sướng

Tầng **đầu nguồn** của cả marketing lẫn bán hàng: trước khi viết một chữ content hay đặt một con số giá, phải biết **bán cho ai, họ đau gì, họ mơ gì, đổi bằng trải nghiệm nào** — rồi xếp hạng để biết **làm gì trước**. Output là bản đồ + các **cụm nội dung** sẵn giao cho đội/skill sản xuất.

## Triết lý gốc (grounded — không bịa)
> "Mọi hành vi con người đều do né đau hoặc tìm sướng dẫn dắt." — Tony Robbins.
> "Copy không tạo ra ham muốn — nó chỉ kênh khát khao đã có sẵn trong tim hàng triệu người." — Eugene Schwartz.

Hợp nhất 6 guru: **Tony Robbins** (pain↔pleasure), **Eugene Schwartz** (mass desire — tìm khát khao thật), **HubSpot/Adele Revella** (buyer persona 7 tiêu chí), **Ryan Deiss** (Customer Avatar + Before-After Grid), **Alex Hormozi** (Value Equation để xếp hạng), **Russell Brunson** (Dream 100 — kênh phân phối). Trích dẫn + URL đầy đủ: [references/triet-ly-chan-dung-dau-suong.md](references/triet-ly-chan-dung-dau-suong.md). Bản research gốc: `output/2026-06-17-research-chan-dung-dau-suong/`.

## Vị trí trong hệ thống — ĐẦU NGUỒN
```
hmh-mkt-chan-dung-dau-suong   →   CONTENT: [[hmh-mkt-content-da-kenh]] · [[hmh-mkt-content-30-ngay]] · [[hmh-mkt-content-tri-thuc]]
(chân dung + đau/sướng + cụm)  →   BÁN HÀNG: [[hmh-sale-business-model-canvas]] → [[hmh-sale-dinh-gia-offer]] → [[hmh-sale-ke-hoach-loi-nhuan]]
                               →   PHÂN PHỐI: [[con__nang-luc__dream-100]] (khách tụ tập ở đâu)
```
- **Đầu ra → content:** mỗi cụm nội dung = 1 bộ 4 bài (Vạch đau · Khát khao · Cầu nối · Chứng minh).
- **Đầu ra → bán hàng:** chân dung + nỗi đau/khát khao là input cho ô Khách hàng/Giá trị của BMC và Value Equation của Offer.

## Khi nào dùng / KHÔNG dùng
- **DÙNG:** cần biết bán cho ai, khách đau/mơ gì, nên ưu tiên content/offer nào, lên cụm nội dung, dạy học viên phân tích khách.
- **KHÔNG dùng:** đã có chân dung rõ và chỉ cần *viết* content → đi thẳng [[hmh-mkt-content-da-kenh]]; cần *định giá/offer* → [[hmh-sale-dinh-gia-offer]].

## Tiền điều kiện
- Node (để chạy engine). PATH trên máy này: `export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"` (xem [[lark-cli-setup]]).
- Engine **zero-dep** — không cần cài gói.

## Quy trình thực thi
1. **Coach 7 bước** theo [references/sop-chan-dung.md](references/sop-chan-dung.md): sản phẩm/thị trường → chân dung 7 tiêu chí → nỗi đau (chấm cuongDo/phoBien/taiGiaiQuyet) → sung sướng (chấm khatKhao/khaThi/doTre/congSuc) → trải nghiệm → xếp hạng → cụm nội dung.
   > Schwartz: nỗi đau & khát khao phải CÓ THẬT. Cái gì là phán đoán → đánh dấu "cần kiểm chứng" (hỏi khách / đọc comment / phỏng vấn).
2. **Soạn `input.json`** (xem schema dưới) rồi chạy engine:
   ```bash
   export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"
   node scripts/chan-dung-dau-suong.mjs <input.json> --md <output-dir>/chan-dung.md
   # xem ví dụ mẫu (coaching giảm cân): node scripts/chan-dung-dau-suong.mjs --demo
   ```
   Engine trả: bảng chân dung 7 tiêu chí · **nỗi đau đã xếp hạng** (điểm = cuongDo×phoBien×taiGiaiQuyet) · **sung sướng đã xếp hạng** (Value Equation) · **các cụm nội dung** (mỗi cụm 4 bài gợi ý) · cảnh báo (chân dung thiếu, nỗi đau ta khó giải).
3. **Bàn giao cụm nội dung** sang skill sản xuất content; **bàn giao chân dung + đau/sướng** sang mạch bán hàng (BMC → Offer).
4. **Lưu output** theo CLAUDE.md + cập nhật `index.md` + ghi `log.md`.

## Schema `input.json`
```json
{
  "sanPham": "...",
  "thiTruong": "...",
  "chanDung": { "viTri": "", "tuoi": "", "gioiTinh": "", "soThich": "",
                "kenhThongTin": "", "thoiQuen": "", "thuNhap": "" },
  "noiDau":    [{ "ten": "", "cuongDo": 9, "phoBien": 8, "taiGiaiQuyet": 9 }],
  "sungSuong": [{ "ten": "", "khatKhao": 9, "khaThi": 8, "doTre": 4, "congSuc": 4, "doiUngNoiDau": 0 }],
  "traiNghiem": ["Nhanh", "An toàn", "Không đau đớn"]
}
```
Mọi điểm thang 1–10. `doiUngNoiDau` = index (0-based) của nỗi đau mà sung sướng này là mặt đối lập (để ghép cụm đúng); bỏ trống thì engine ghép theo hạng.

## Tham chiếu scripts / references
- `scripts/chan-dung-dau-suong.mjs` — engine: chấm điểm, QuickSort xếp hạng, ghép cụm, render Markdown (zero-dep). `--demo` ví dụ; `--md` ghi file. Export `phanTich/renderMarkdown/DEMO`.
- `references/sop-chan-dung.md` — coach 7 bước (câu hỏi + chuẩn đầu ra).
- `references/triet-ly-chan-dung-dau-suong.md` — triết lý 6 guru + trích dẫn + URL.

## Lưu ý / gotcha
- **Đừng bịa nỗi đau** (Schwartz). Pain point phán đoán phải kiểm chứng bằng khách thật — engine sẽ cảnh báo nhưng không thay được việc đi nghe khách.
- **taiGiaiQuyet ≤ 3** → nỗi đau ta không giải nổi, đừng dựng content/offer quanh nó (gây kỳ vọng rồi vỡ).
- **Nhân khẩu học chỉ là vỏ** (Revella) — luôn đào tiếp "tại sao họ mua". Một chân dung 7 ô đầy đủ mà thiếu lý do mua thì vẫn rỗng.
- **Value Equation:** muốn tăng giá trị cảm nhận → giảm mẫu số (doTre, congSuc) dễ hơn tăng tử số. Đây cũng là gợi ý cho "trải nghiệm" cần nhấn.
- Đường dẫn dự án có dấu cách/tiếng Việt — luôn bọc path trong nháy kép khi chạy shell.

## Output (bám CLAUDE.md)
- Mỗi lần phân tích = 1 thư mục `output/YYYY-MM-DD-chan-dung-<tên>/` chứa `input.json` + `chan-dung.md`.
- Cập nhật `index.md` (mục Output) + ghi `log.md`: `## [YYYY-MM-DD] query | Chân dung & bản đồ đau/sướng <tên>`.
- Nếu là tri thức dùng lại → nâng cấp vào `wiki/` và liên kết chéo.
