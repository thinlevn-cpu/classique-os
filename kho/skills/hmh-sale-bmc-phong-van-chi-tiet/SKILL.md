---
name: hmh-sale-bmc-phong-van-chi-tiet
description: >
  PHỎNG VẤN sâu người dùng qua đủ 9 ô Business Model Canvas (Osterwalder) rồi SINH RA CẢ BỘ TÀI LIỆU
  chi tiết: trang tổng quan Markdown + sơ đồ trực quan `.canvas` bố cục Osterwalder + MỘT TRANG RIÊNG cho
  mỗi phân khúc khách hàng (persona, TAM/SAM/SOM, jobs-to-be-done, hành vi mua, CAC/LTV) và mỗi giá trị
  cốt lõi (pain reliever, so sánh lựa chọn thay thế, logic giá, bằng chứng) + file Đánh Giá Mô Hình
  (soi 9 ô có ăn khớp nhau không, chấm điểm, việc cần làm). Khác `hmh-sale-business-model-canvas` (coach
  nhanh 9 ô rồi ghi Lark Base + ảnh PNG): skill này đi CHẬM và SÂU để ra bộ tài liệu nhiều trang có liên
  kết chéo. Dùng khi người dùng muốn: hệ thống hoá mô hình kinh doanh cho một dự án cụ thể, dựng BMC chi
  tiết nhiều trang, tách từng phân khúc/giá trị thành trang riêng, vẽ sơ đồ canvas 9 ô để mở trong
  Obsidian, hoặc mô tả một ý tưởng kinh doanh và hỏi "mô hình này có ổn không".
  Kích hoạt khi có từ: business model canvas chi tiết, bmc chi tiết, mô hình kinh doanh 9 ô, 9 ô kinh doanh,
  canvas kinh doanh, phỏng vấn 9 ô, hệ thống hoá mô hình kinh doanh, trang chi tiết phân khúc,
  giá trị cốt lõi, file canvas, đánh giá mô hình kinh doanh.
---

# BMC chi tiết — Phỏng vấn 9 ô & sinh bộ tài liệu

Biến một ý tưởng kinh doanh thành **bộ tài liệu nhiều trang có liên kết chéo**: 1 trang tổng quan 9 ô, 1 sơ đồ `.canvas`, 1 trang riêng cho từng phân khúc khách hàng & từng giá trị cốt lõi, và 1 file đánh giá độc lập.

## Triết lý gốc

Grounded từ **Alexander Osterwalder & Yves Pigneur** (*Business Model Generation* — 9 ô + Value Proposition Canvas), **Clayton Christensen** (Jobs To Be Done), **Steve Blank / Eric Ries** (giả định phải kiểm chứng trước khi đổ vốn). Triết lý gốc + trích dẫn đầy đủ: xem `references/triet-ly-bmc.md` của skill [[hmh-sale-business-model-canvas]] — dùng chung nền tri thức, không lặp lại ở đây.

**Vì sao phải theo đúng thứ tự:** BMC mạnh vì nó buộc người xây dự án trả lời **9 câu hỏi đúng thứ tự kể chuyện**, không phải 9 ô rời rạc. Nếu hỏi lộn xộn, người dùng dễ liệt kê "hoạt động" trước khi biết "khách hàng cần gì" — ra một mô hình đẹp nhưng không ăn khớp. Vì vậy luôn phỏng vấn: **khách hàng trước (bên phải canvas) → hạ tầng vận hành sau (bên trái canvas) → tài chính chốt lại (dưới cùng)**.

## Khi nào dùng / KHÔNG dùng

| Việc cần làm | Dùng skill |
|---|---|
| Coach nhanh 9 ô, chốt giả định rủi ro nhất, ghi Lark Base, vẽ canvas ra ảnh PNG để in/treo | [[hmh-sale-business-model-canvas]] |
| **Phỏng vấn sâu → bộ tài liệu nhiều trang + sơ đồ `.canvas` + trang chi tiết từng phân khúc/giá trị** | **Skill này** |
| Tính điểm hoà vốn, cần bán bao nhiêu đơn để lời X (định lượng) | [[hmh-sale-ke-hoach-loi-nhuan]] |
| Định giá & đóng gói offer theo Value Equation | [[hmh-sale-dinh-gia-offer]] |
| Đo cầu thật của ngách + chấm Niche Score 100 + go/no-go | [[hmh-mkt-validate-ngach]] |
| Dựng chân dung khách + bản đồ nỗi đau ↔ sung sướng để làm content | [[hmh-mkt-chan-dung-dau-suong]] |

**Thứ tự đúng:** dựng BMC (định tính) → kiểm chứng giả định rủi ro nhất → rồi mới chạy bài toán hoà vốn (định lượng). Tính hoà vốn cho một mô hình chưa ai xác nhận = toán học trên ảo tưởng.

## Tiền điều kiện

Không cần API key hay tool ngoài. File `.canvas` là JSON Canvas thuần — mở được bằng Obsidian.

## Quy trình thực thi

1. Xác định dự án (tên, mô tả, giai đoạn) và thư mục lưu.
2. Phỏng vấn lần lượt 9 ô theo `references/cau-hoi-phong-van.md` — riêng Customer Segments và Value Propositions luôn đào sâu thêm theo mục "Đào sâu thêm".
3. Tóm tắt lại toàn bộ 9 ô, cho người dùng xác nhận/sửa **trước khi** ghi file.
4. Sinh 2 file chính: trang Markdown tổng quan + sơ đồ `.canvas`.
5. Sinh trang chi tiết riêng cho MỖI phân khúc khách hàng và MỖI giá trị cốt lõi (thư mục `MHKD/`) — **mặc định luôn làm**, không phải tuỳ chọn.
6. Sinh file Đánh Giá Mô Hình Kinh Doanh.
7. Cập nhật `index.md` + ghi `log.md`; hỏi người dùng có nâng cấp lên `wiki/` không.

---

## Bước 1 — Xác định dự án & thư mục lưu

Hỏi gọn trong **một lượt** (đừng hỏi lắt nhắt từng câu):
- Tên công ty/dự án là gì?
- Mô tả 1–2 câu: đang làm gì, giai đoạn nào (ý tưởng / MVP / đã có doanh thu / đang mở rộng)?
- Đây là mô hình nhiều đơn vị kinh doanh chồng lên nhau, hay một dòng sản phẩm đơn giản?

**Thư mục lưu (bám CLAUDE.md của bộ não này):** mỗi lần chạy skill = **MỘT thư mục kết quả**

```
output/YYYY-MM-DD-bmc-<ten-du-an>/
├── Business Model Canvas — <Tên dự án>.md      # trang tổng quan 9 ô
├── Business Model Canvas.canvas                 # sơ đồ trực quan
├── Đánh Giá Mô Hình Kinh Doanh — <Tên>.md      # file đánh giá
└── MHKD/
    ├── _MHKD <Tên> — Tổng Quan.md
    ├── Phân Khúc Khách Hàng/
    │   ├── PK1 — <Tên phân khúc 1>.md
    │   └── PK2 — <Tên phân khúc 2>.md
    └── Giá Trị Cốt Lõi/
        ├── GT1 — <Tên giá trị 1>.md
        └── GT2 — <Tên giá trị 2>.md
```

**Tuyệt đối không** để file rời rạc ngay dưới `output/` — mọi file của lần chạy này nằm trong đúng một thư mục con.

**Trước khi ghi, luôn kiểm tra:** đọc `index.md` và liệt kê `output/` xem đã có thư mục BMC cho dự án này chưa. Nếu có VÀ đã có nội dung thật, KHÔNG ghi đè âm thầm — cho người dùng xem thư mục cũ rồi hỏi: ghi đè, tạo bản mới theo ngày hôm nay (giữ bản cũ làm lịch sử), hay merge. Nếu `wiki/entities/` đã có trang thực thể của doanh nghiệp này, **đọc trước** để không phỏng vấn lại thứ đã biết.

## Bước 2 — Phỏng vấn 9 ô

Mở `references/cau-hoi-phong-van.md` để lấy bộ câu hỏi đầy đủ. Thứ tự phỏng vấn:

1. **Customer Segments** (Phân khúc khách hàng)
2. **Value Propositions** (Giá trị cốt lõi)
3. **Channels** (Kênh phân phối)
4. **Customer Relationships** (Quan hệ khách hàng)
5. **Revenue Streams** (Dòng doanh thu)
6. **Key Resources** (Nguồn lực chính)
7. **Key Activities** (Hoạt động chính)
8. **Key Partnerships** (Đối tác chính)
9. **Cost Structure** (Cơ cấu chi phí)

Cách hỏi: trình bày các câu hỏi của MỘT ô trong một lượt (đừng hỏi từng câu rồi chờ — quá chậm), để người dùng trả lời tự do bằng đoạn văn. Các câu hỏi phụ trong file reference là để **đào sâu**, không phải checklist bắt buộc — nếu câu trả lời đầu đã rõ và cụ thể, đừng ép hỏi hết mọi câu con. Chỉ hỏi thêm khi câu trả lời còn chung chung (ví dụ "khách hàng là doanh nghiệp" → hỏi thêm quy mô nào, ngành nào, ai ký hợp đồng).

**Ngoại lệ — Customer Segments và Value Propositions luôn hỏi kỹ hơn 7 ô còn lại.** Hai ô này sẽ tách thành trang chi tiết riêng ở Bước 5 (persona, quy mô thị trường, jobs-to-be-done, hành vi mua, CAC/LTV, phản đối & rủi ro cho Customer Segments; cấu phần sản phẩm, so sánh lựa chọn thay thế, logic giá, bằng chứng, phản đối & rủi ro cho Value Propositions — xem mục "Đào sâu thêm để dựng trang chi tiết" trong file reference).

Vẫn áp dụng nguyên tắc **"đừng bịa nếu người dùng chưa nói"** — nếu người dùng không có số liệu thị trường hay chưa nghĩ tới CAC/LTV, cứ hỏi 1 lượt rồi chấp nhận câu trả lời "chưa biết/chưa đo", đánh dấu `⚠️ giả định` khi phải tự ước lượng, thay vì ép người dùng bịa số hoặc bỏ qua câu hỏi hoàn toàn.

**Có nguồn trong `raw/` thì đọc trước khi hỏi.** Nếu người dùng đã thả tài liệu về dự án vào `raw/` (pitch deck, kế hoạch, bảng giá, ghi âm họp), đọc trước rồi hỏi **xác nhận/bổ sung** — đừng hỏi lại từ đầu những gì tài liệu đã trả lời. Ghi rõ ô nào lấy từ nguồn nào: trang tổng quan trích dẫn theo dạng `(theo [[sources/tên-nguồn]])`.

Nếu dự án có nhiều phân khúc hoặc nhiều giá trị cốt lõi chồng lấn (ví dụ nền tảng đa mảng), hỏi người dùng có muốn **gắn nhãn ưu tiên** không (🥇 làm ngay / 🥈 kế tiếp / 🥉 dài hạn). Chỉ gắn nhãn khi người dùng đã xác nhận — đừng tự suy ra nhãn chỉ vì câu trả lời có chữ "làm ngay"/"để sau"; chưa hỏi hoặc chưa rõ thì để văn xuôi thường, không gắn 🥇🥈🥉.

## Bước 3 — Tóm tắt & xác nhận

Trước khi ghi file, tóm tắt lại toàn bộ 9 ô bằng gạch đầu dòng ngắn (mỗi ô 2–5 dòng) và hỏi người dùng xác nhận hoặc sửa. File `.md` và `.canvas` khó chỉnh lại bằng tay sau này (đặc biệt `.canvas` là JSON), nên sửa ở bước tóm tắt rẻ hơn nhiều.

## Bước 4 — Sinh 2 file chính

### 4a. Trang Markdown tổng quan

Đường dẫn: `output/YYYY-MM-DD-bmc-<ten-du-an>/Business Model Canvas — <Tên dự án>.md`

Frontmatter (theo đúng quy ước CLAUDE.md của bộ não này):

```yaml
---
type: output
title: Business Model Canvas — <Tên dự án>
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [business-model, bmc, <ngành>]
sources: [<tên-nguồn-trong-raw-nếu-có>]
---
```

(Không dùng `rank`/`deadline`/`up` — đó là quy ước của vault khác. Bộ não này dùng `type/title/created/updated/tags/sources`.)

Cấu trúc body — mỗi khối 1 heading, tên **tiếng Anh kèm tiếng Việt trong ngoặc**:

```markdown
# 📊 Business Model Canvas — <Tên dự án>

**Câu hỏi/đề bài gốc:** <ghi lại yêu cầu ban đầu của người dùng>

> <Mô tả 1–2 câu về dự án + giai đoạn hiện tại>

---

## 👥 Customer Segments (Phân khúc khách hàng)
...
## 🎁 Value Propositions (Giá trị cốt lõi)
...
## 📢 Channels (Kênh phân phối)
...
## ❤️ Customer Relationships (Quan hệ khách hàng)
...
## 💰 Revenue Streams (Dòng doanh thu)
...
## 🧱 Key Resources (Nguồn lực chính)
...
## ⚙️ Key Activities (Hoạt động chính)
...
## 🤝 Key Partnerships (Đối tác chính)
...
## 💸 Cost Structure (Cơ cấu chi phí)
...

---

## 🔗 Kết nối với
- [[Business Model Canvas.canvas|Xem sơ đồ trực quan]]
- [[_MHKD <Tên> — Tổng Quan]] — trang chi tiết phân khúc & giá trị (Bước 5)
- [[Đánh Giá Mô Hình Kinh Doanh — <Tên>]] (Bước 6)
- [[wiki/overview]] · các trang thực thể/khái niệm liên quan trong `wiki/`
```

Viết nội dung từng ô **dựa trên câu trả lời phỏng vấn thực tế** — không tự thêm chi tiết người dùng chưa nói. Người dùng trả lời sơ sài ở ô nào thì viết ngắn ở ô đó, đừng bịa cho "đầy đủ". Trong ô Customer Segments và Value Propositions, mỗi phân khúc/giá trị nêu tên kèm link tới trang chi tiết tương ứng (vd `[[PK1 — Tên Phân Khúc]]`) — các trang này tạo ở Bước 5, nên viết link trước rồi tạo file sau trong cùng lượt làm việc.

### 4b. File `.canvas` (sơ đồ trực quan)

Đường dẫn: `output/YYYY-MM-DD-bmc-<ten-du-an>/Business Model Canvas.canvas`

Dùng `assets/canvas-layout-template.json` làm khung toạ độ — đây là bố cục chuẩn Osterwalder (Key Partnerships / Key Activities + Key Resources / Value Propositions / Customer Relationships + Channels / Customer Segments ở hàng trên; Cost Structure + Revenue Streams ở hàng dưới). Copy file này, **giữ nguyên** `x/y/width/height`, chỉ thay nội dung `text` của từng node bằng bản tóm tắt 3–6 dòng của khối tương ứng (ngắn hơn nhiều bản Markdown — canvas là bản nhìn nhanh). Thêm 1 node tiêu đề ở trên cùng ghi tên dự án + link `[[Business Model Canvas — <Tên dự án>]]`.

Toạ độ là điểm khởi đầu, không phải khuôn cứng: nếu một ô có 2–3 nhóm rõ rệt, gộp thành các dòng ngắn có tiêu đề phụ **trong cùng 1 node** (không tạo thêm node); nếu nội dung thật sự cần nhiều chỗ, tăng `height` của node đó (và dịch các node cùng cột) thay vì nhồi nhét gây tràn chữ.

Không thêm node đánh giá/rủi ro/kế hoạch gọi vốn vào sơ đồ — chúng không thuộc 9 ô canvas chuẩn và đã có file riêng ở Bước 6.

## Bước 5 — Trang chi tiết Customer Segments & Value Propositions

Bước **mặc định, luôn làm**: mỗi phân khúc khách hàng và mỗi giá trị cốt lõi có 1 file riêng trong `MHKD/` (xem cấu trúc thư mục ở Bước 1).

Đánh số PK/GT theo thứ tự ưu tiên đã chốt ở Bước 2 (nếu có nhãn 🥇🥈🥉); không có nhãn thì đánh số theo thứ tự liệt kê tự nhiên lúc phỏng vấn.

- **Mỗi phân khúc:** copy `assets/mhkd-customer-segment-template.md`, điền bằng câu trả lời phỏng vấn thật (đặc biệt phần "Đào sâu thêm" của ô Customer Segments). Mục nào người dùng chưa trả lời (quy mô thị trường, CAC, LTV) → ghi ngắn "chưa có dữ liệu" hoặc gắn `⚠️ giả định` cho phần AI tự ước lượng. **Tuyệt đối không bịa số cụ thể để trông "đầy đủ".**
- **Mỗi giá trị cốt lõi:** copy `assets/mhkd-value-proposition-template.md`, điền tương tự dựa trên phần "Đào sâu thêm" của ô Value Propositions, link tới đúng phân khúc chính/phụ.
- **File hub tổng quan:** copy `assets/mhkd-tong-quan-template.md`, điền bảng liệt kê tất cả PK/GT kèm mức ưu tiên (nếu có) và mô tả 1 dòng.
- Dự án chỉ có 1 phân khúc + 1 giá trị: vẫn tạo đủ cấu trúc, file sẽ ngắn hơn tương ứng lượng thông tin thật — không ép đủ 15/12 mục nếu người dùng không có gì để nói.
- **Sau khi tạo xong, quay lại trang tổng quan (Bước 4a)** kiểm tra các link `[[PK1 — ...]]` / `[[GT1 — ...]]` đã trỏ đúng tên file vừa tạo.

## Bước 6 — Đánh giá mô hình kinh doanh

Cũng là bước **mặc định, luôn làm** sau khi đã có dữ liệu từ Bước 4 và 5.

Đường dẫn: `output/YYYY-MM-DD-bmc-<ten-du-an>/Đánh Giá Mô Hình Kinh Doanh — <Tên>.md`

Copy `assets/danh-gia-mo-hinh-kinh-doanh-template.md` và điền dựa trên chính nội dung vừa dựng. Đây là đánh giá về **tính nhất quán giữa 9 ô, tính khả thi, và bằng chứng Product-Market Fit** — không phải chấm điểm ý tưởng hay/dở chung chung:

1. Soi từng cặp ô có ăn khớp logic không (Value Propositions có giải đúng pain point của Customer Segments không; Revenue Streams có khớp hành vi mua đã mô tả không…).
2. Tính khả thi tài chính thô — **chỉ tính nếu người dùng đã cho số cụ thể** (vốn, giá, chi phí); chưa có thì ghi rõ "chưa đủ dữ liệu để đánh giá", đừng tự bịa con số. Cần tính kỹ → chuyển sang [[hmh-sale-ke-hoach-loi-nhuan]].
3. Mức độ bằng chứng PMF thực tế — đa số dự án mới ở mức "giả thuyết, chưa có bằng chứng", cứ nói thẳng.
4. Chấm điểm theo bảng tiêu chí trong template + liệt kê việc cần làm tiếp theo.

## Bước 7 — Lưu vết & nâng cấp lên wiki

1. **Cập nhật `index.md`** — thêm dòng vào mục Output: link thư mục kết quả + tóm tắt 1 câu + ngày.
2. **Ghi `log.md`**: `## [YYYY-MM-DD] query | BMC chi tiết <Tên dự án>`.
3. **Hỏi người dùng có nâng cấp lên `wiki/` không** (CLAUDE.md §5.5 — kết quả chứa tri thức dùng lại lâu dài thì tích hợp vào wiki):
   - `wiki/entities/<Tên doanh nghiệp>.md` — trang thực thể doanh nghiệp, link tới bộ BMC này.
   - `wiki/concepts/` — khái niệm mới xuất hiện lúc phỏng vấn mà chưa có trang.
   - `wiki/analyses/` — nếu muốn giữ bản đánh giá như một phân tích thường trực có liên kết chéo.
   - Nhớ thêm link chéo hai chiều để không sinh trang mồ côi.
4. Nếu đánh giá ở Bước 6 phát hiện rủi ro 🔴 hoặc điểm trung bình thấp, **gợi ý** (không tự làm trừ khi được yêu cầu): phỏng vấn sâu thêm một phân khúc, chạy [[hmh-mkt-validate-ngach]] để đo cầu thật, hoặc tách các ô còn lại (Channels, Revenue Streams…) thành trang riêng nếu đủ phức tạp.

## Tham chiếu references / assets

- `references/cau-hoi-phong-van.md` — bộ câu hỏi đầy đủ 9 ô + phần đào sâu cho Customer Segments & Value Propositions.
- `assets/canvas-layout-template.json` — khung toạ độ JSON Canvas bố cục Osterwalder (đã test hiển thị trong Obsidian).
- `assets/mhkd-customer-segment-template.md` — template trang phân khúc (15 mục).
- `assets/mhkd-value-proposition-template.md` — template trang giá trị cốt lõi (12 mục).
- `assets/mhkd-tong-quan-template.md` — template file hub liệt kê PK/GT.
- `assets/danh-gia-mo-hinh-kinh-doanh-template.md` — template đánh giá 6 phần + bảng chấm điểm.

## Lưu ý / gotcha

- **Không bịa.** Người dùng chưa nói thì ghi "chưa có dữ liệu" hoặc gắn `⚠️ giả định` — bộ tài liệu này dùng để ra quyết định, số bịa làm hỏng quyết định.
- **Xác nhận trước khi ghi** (Bước 3) — sửa JSON `.canvas` bằng tay rất khổ.
- **Không ghi đè kết quả cũ** — CLAUDE.md yêu cầu cập nhật file trong thư mục cũ (giữ `updated`) hoặc tạo thư mục mới theo ngày; đừng xoá lịch sử.
- **Ô khách hàng:** ép cụ thể — "tất cả mọi người" = chưa có phân khúc.
- **Ô giá trị:** hỏi JOB của khách (JTBD), không liệt kê tính năng.
- Template trong `assets/` dùng placeholder `{{...}}` và `{{TEN_DU_AN}}` — thay hết placeholder, đừng để sót cặp `{{}}` nào trong file cuối.

## Output (bám CLAUDE.md)

- Mỗi lần chạy = 1 thư mục `output/YYYY-MM-DD-bmc-<ten-du-an>/` chứa **tất cả** file (trang tổng quan, `.canvas`, `MHKD/`, file đánh giá).
- Cập nhật `index.md` (mục Output) + ghi `log.md`.
- Tri thức dùng lại lâu dài → nâng cấp vào `wiki/` (Bước 7).
