# SOP — 5 vòng dựng hồ sơ khách hàng (chạy một lèo)

Bản vận hành của **QUY TRÌNH TẠO HỒ SƠ KHÁCH HÀNG CHUẨN ĐÉT v2** (8 bước), nén lại thành
**5 vòng chạy liên tục không dừng hỏi người dùng**. Bản gốc đầy đủ lý do và ví dụ:
`output/2026-08-01-phan-tich-quy-trinh-ho-so-khach-hang-chuan-det/QUY-TRINH-TAO-HO-SO-KHACH-HANG-v2.md`.

| Vòng | Nuốt bước nào của v2 | Ra cái gì |
|---|---|---|
| 1 | Bước 0 — gom & kiểm kê nguyên liệu | `KIEM-KE` (trong tệp `00`) + mức A/B/C/D |
| 2 | Bước 1 · 2 · 3 — bạn là ai · blueprint · đối thủ | nền để viết (không xuất tệp riêng) |
| 3 | Bước 4 — dựng lõi | tệp `01` `02` `03` |
| 4 | Bước 4 (tiếp) · Bước 6 — công cụ bán · fit check | tệp `04` `05` `06` |
| 5 | Bước 5 · Bước 7 — tự kiểm · khoảng trống | tệp `07` `NGUON` + phần đầu của `00` |

---

## Ba nguyên tắc vàng (đọc trước khi viết chữ nào)

**1. Không có nguyên liệu thì không có hồ sơ.** Nỗi đau và khát khao phải **lấy từ lời khách**,
không phải do AI tưởng tượng. Mỗi luận điểm quan trọng gắn được một mã bằng chứng, một câu
nói nguyên văn, hoặc một con số vận hành.

**2. Tách "biết" khỏi "đoán".** Hồ sơ nào cũng có phần suy luận. Hồ sơ tốt là hồ sơ **nói rõ
phần nào là suy luận** — dùng hệ ký hiệu ở cuối tài liệu này, không giấu.

**3. Đừng chờ hoàn hảo mới dùng.** Dùng ngay cho content & sale khi đã đủ chắc, song song chạy
vòng kiểm chứng để bồi đắp.

---

## LUẬT CHẠY MỘT LÈO — khác biệt lớn nhất so với bản 8 bước

Bản v2 **dừng lại** ở Bước 0 nếu thiếu nguyên liệu, và dừng sau mỗi phần chờ người duyệt.
Bản này **không dừng** — vì chủ doanh nghiệp đã điền phiếu và thả tài liệu **một lần** rồi.

Đổi lại, phải trả giá bằng **sự trung thực**:

- Thiếu nguyên liệu → **vẫn viết**, nhưng chương đó mở đầu bằng một dòng cảnh báo
  `> ⚠️ Chương này dựng chủ yếu bằng suy luận vì thiếu <loại nguyên liệu>.`
- Mức **D** (thiếu giọng khách) → hồ sơ vẫn ra, nhưng tệp `00` phải mở đầu bằng khối cảnh báo
  đỏ và tệp `07` phải dài hơn phần nội dung. **Không được im lặng viết cho đủ trang.**
- Chỗ nào suy luận: đánh `⚠️` **ngay tại dòng đó**, không gom hết xuống cuối.

> Cổng chặn cũ biến thành **nhãn cảnh báo**, không biến mất. Bỏ hẳn cổng mà không thay bằng
> nhãn thì skill này thành cái máy đẻ hồ sơ đẹp mà rỗng — đúng thứ quy trình v2 sinh ra để chặn.

---

## VÒNG 1 — KIỂM KÊ (deterministic, chạy script)

```bash
node .claude/skills/hmh-mkt-ho-so-khach-hang/scripts/kiem-ke.mjs raw/hskh --md <thư-mục-output>/KIEM-KE.md
```

Script trả: mức **A/B/C/D**, bảng 6 loại nguyên liệu, và **bảng mã bằng chứng** (`FB-01`, `Q-01`,
`KC-01`, `GIA-01`, `DT-01`, `DV-01`). Bảng mã này là **hợp đồng** của cả hồ sơ — từ đây trở đi
mọi trích dẫn phải chỉ về một mã có trong bảng.

Sau khi chạy script, **đọc nội dung thật của từng tệp** (ảnh thì xem ảnh) để biết số *mẩu* thật —
script chỉ đếm được số *tệp*. Tệp nào script không đoán được loại (`—`) thì tự gán mã theo nội dung.

Sáu loại nguyên liệu và vì sao cần:

| # | Loại | Nên có | Vì sao |
|---|---|---|---|
| 1 | Feedback/review thật có tên | 10–20 | Neo mọi chân dung; nguồn của ngân hàng câu chốt |
| 2 | Câu hỏi nguyên văn của khách | 20–30 | Mỗi câu hỏi thật = một tiêu đề content sẵn có |
| 3 | Ca hỏi kỹ nhưng KHÔNG chốt + lý do | 10–15 | **Chống thiên lệch sống sót** — xem dưới |
| 4 | Bảng giá + danh mục thật | đầy đủ | Không có giá thì không map được offer |
| 5 | Dữ liệu 5 kênh đối thủ + kênh mình | 5+1 | Chương bối cảnh & khoảng trống thị trường |
| 6 | Tài liệu định vị / training nội bộ | có gì lấy nấy | Giọng thương hiệu, ranh giới |

> **Vì sao loại 3 quan trọng nhất mà lại hiếm nhất:** mọi hồ sơ khách hàng đều mắc **thiên lệch
> sống sót** — chỉ nghe tiếng người **đã mua**. Người đã mua thì đương nhiên nói tốt, họ đã bị
> thuyết phục rồi. Người **không mua** mới biết chính xác chỗ nào trong lời chào hàng bị gãy.

---

## VÒNG 2 — NỀN (bạn là ai · blueprint · đối thủ)

Không xuất tệp riêng, nhưng **bắt buộc làm trước khi viết**, nếu không mọi chương sau sẽ trôi
về ngôn ngữ marketing chung chung.

**2a. Bạn là ai** — đọc `PHIEU-HSKH.md` + tài liệu định vị. Tự trả lời bằng **ngôn ngữ của chủ
doanh nghiệp** (chép lại chữ họ dùng trong phiếu), không phải ngôn ngữ marketing:
ai · bán gì · cho ai · khác biệt ở đâu · giọng thế nào · điều không bao giờ hứa.
Rút 5–7 **câu định vị thô** từ chính lời họ kể — ưu tiên câu nghe như người thật nói.

**2b. Blueprint** — dùng kiến trúc 6 phần ở [khuon-dau-ra.md](khuon-dau-ra.md). Nếu người dùng đưa
file mẫu hồ sơ của thương hiệu khác, chỉ rút **bộ khung phương pháp**: có mấy chương, chương sau
ăn đầu ra chương trước thế nào, công thức chấm điểm nào, hệ ký hiệu ra sao.
**TUYỆT ĐỐI không mang theo nội dung ngành của file mẫu** (thuật ngữ, ví dụ, tên sản phẩm, con số) —
đây là lỗi số 2 trong bảng lỗi ở cuối tài liệu.

**2c. Đối thủ** — từ tệp loại 5 + câu 13–14 của phiếu. Phân tích theo 13 đầu mục của v2, trong đó
2 mục không được làm qua loa vì chúng thành xương sống của Phần III:

- **ÁNH SÁNG** của thị trường: mong muốn, khát khao, cơ hội, lợi ích khách đang hướng tới.
- **BÓNG TỐI** của thị trường: nỗi sợ, bực bội, bất mãn, nghi ngờ, tổn thương, thất vọng.

> ⚠️ **AI không tự đọc được Fanpage/group Facebook** (tường đăng nhập chặn). Có link trần mà không
> có ảnh chụp trong `nguyen-lieu/` thì ghi ⚠️ "chưa có dữ liệu", **tuyệt đối không mô tả như đã xem**.

---

## VÒNG 3 — LÕI

Viết tệp `01` `02` `03`. Đây là phần ăn nguyên liệu nặng nhất.

### Động cơ 1 — Xếp hạng nỗi đau

```
Điểm ảnh hưởng = Cường độ × Phổ biến × Ta-giải-được      (mỗi biến 1–10)
```

| Biến | Câu hỏi chấm |
|---|---|
| **Cường độ (C)** | Không giải quyết thì khó chịu/lo lắng/tổn thất bao nhiêu? |
| **Phổ biến (Ph)** | Bao nhiêu % khách trong chân dung mục tiêu gặp phải? |
| **Ta giải được (Ta)** | **Ta**, với năng lực hiện có, giải tốt tới mức nào? |

> 🎯 **Biến thứ 3 là biến khôn nhất.** Không có nó, danh sách nỗi đau tự trôi về nỗi đau
> *nghe kịch tính nhất* thay vì nỗi đau *ta có lợi thế giải nhất*.
> `Ta ≤ 3` → đừng dựng content/offer trụ quanh nó, gây kỳ vọng rồi vỡ.

### Động cơ 2 — Chấm giá trị từng lợi ích (Value Equation — Hormozi)

```
Giá trị = (Khát khao × Khả thi) / (Độ trễ × Công sức)
```

> 🎯 **Đây là PHÉP CHIA.** Một lợi ích khát khao 10/10 vẫn tụt hạng chỉ vì độ trễ nhích 1→2.
> ➡️ **Hàm ý bán hàng quan trọng nhất của cả hồ sơ: giảm mẫu số mạnh hơn tăng tử số.**
> "Nhận kết quả sau X ngày ký", "nhóm hỗ trợ lập ngay hôm đặt cọc" chốt mạnh hơn việc tả thêm
> viễn cảnh trong mơ — thứ vốn đã cao sẵn trong đầu khách.

### Nối hai bản đồ

Mỗi nỗi đau phải có **một sung sướng đối ứng**, cặp đó được gán vai trò phễu:

| Nỗi đau | → | Sung sướng đối ứng | Vai trò |
|---|---|---|---|
| Đau phổ biến, khách chủ động hỏi | → | giá trị thường thấp | **TOFU** — kéo số đông, giáo dục |
| Đau nặng nhưng khách chưa gọi tên được | → | giá trị cao nhất | **BOFU** — để chốt |

> 💡 **Nỗi đau nặng nhất thường im lặng nhất.** Khách chưa trải qua thì chưa hình dung được nên
> không hỏi. Đừng vì inbox ít nhắc mà đánh giá thấp — chính vì nó ẩn nên nó là vũ khí chốt đơn
> mạnh nhất khi được kể đúng lúc.

**Bắt buộc:** bảng chấm điểm hiện **đủ từng biến**, không chỉ điểm tổng. Chưa đủ căn cứ chấm một
nỗi đau thì ghi thẳng "ưu tiên cao" — **đừng bịa ra con số**.

---

## VÒNG 4 — CÔNG CỤ BÁN + FIT CHECK

Viết tệp `04` `05` `06`.

**Ngân hàng câu chốt** lấy từ mã `FB-*`: câu khách tự đúc kết đúng định vị bằng chữ của họ là
bằng chứng mạnh nhất. **Ngân hàng hook** lấy từ mã `Q-*`: mỗi câu hỏi thật = một hook.

**Fit check bằng Value Proposition Canvas (Osterwalder)** — kẻ 2 bảng rồi trả lời thẳng 3 câu:

1. Nỗi đau nào **chưa có** thứ gì trong offer giải? → lỗ hổng sản phẩm.
2. Thứ nào trong offer **không** giải đau nào và **không** tạo lợi ích nào? → chi phí lãng phí.
3. Lợi ích nào khách mong mà mình **chưa** tạo được? → cơ hội nâng cấp offer.

> ⚠️ **Phải tìm ra ít nhất một lỗ hổng ở mỗi câu.** Một offer khớp hoàn hảo 100% với mọi nỗi đau
> là dấu hiệu hai bảng đã được vẽ chiều theo nhau, không phải bằng chứng của sản phẩm tốt.

---

## VÒNG 5 — TỰ KIỂM & KHAI BÁO

Viết tệp `07` + `NGUON` + phần đầu tệp `00`.

Tự kiểm 8 câu, trong đó **câu 8 là câu quan trọng nhất của cả quy trình**:

1. Có bị chung chung không?
2. Đủ sâu về insight chưa?
3. Có đúng với sản phẩm/dịch vụ không?
4. Ứng dụng được cho content và sale không?
5. Có điểm nào đang suy đoán thiếu căn cứ không?
6. Có phần nào cần hỏi thêm để làm rõ không?
7. Phần nào cần viết lại cho sắc hơn, thật hơn, đời hơn?
8. **TRUY VẾT NGUỒN:** liệt kê **MỌI** con số, tên khách và trích dẫn trong hồ sơ, chỉ rõ từng
   cái lấy từ mã nào. **Cái nào không chỉ được nguồn thì GẠCH ĐI, đừng giữ lại.**

> ✅ **Nghiệm thu:** phải có một danh sách cụ thể những dòng bị gạch. Danh sách rỗng = vòng tự
> kiểm đã chạy hình thức. Chấp nhận cả câu trả lời "phần lớn chương này là suy luận" — đó là
> thông tin quý, không phải thất bại.

Rồi bảng **khoảng trống** (mỗi mảng: hiện trạng — rủi ro nếu bỏ qua — mức 🔴🟡🟢) và ba vòng
kiểm chứng tiếp theo:

| Vòng | Làm gì | Chi phí | Lấp được gì |
|---|---|---|---|
| **2** *(rẻ nhất, làm ngay)* | Mở inbox + tìm kiếm group, **đếm 30–60 phút** xem 20 câu hỏi gần nhất rơi vào cụm nào. Lọc 10–15 khách hỏi kỹ không chốt, ghi lý do thật | 1 buổi | Tần suất nỗi đau · **lý do từ chối** |
| **3** | Phỏng vấn sâu 5–7 khách: *điều gì kích hoạt bạn tìm giải pháp · tiêu chí chọn · điều gì suýt khiến bạn không mua · ai thuyết phục bạn* | 1 tuần | Xác nhận chân dung còn là giả thuyết |
| **4** | Điền số liệu từng kênh → tính chuyển đổi đa kênh. Chốt giá vốn thật → khóa biên offer | 1 tuần | Phân bổ ngân sách · định giá |

---

## LUẬT GROUNDING — áp cho cả 5 vòng

```
- Mọi luận điểm quan trọng gắn MÃ BẰNG CHỨNG có trong bảng mã (FB-01, Q-07…).
- Mọi con số, tên khách, trích dẫn, giá đều lấy từ nguồn thật.
  KHÔNG BỊA số, KHÔNG BỊA tên khách, KHÔNG BỊA trích dẫn.
- Chỗ nào là suy luận thì ghi ⚠️ NGAY TẠI DÒNG ĐÓ và nói rõ suy luận từ đâu.
- Dữ liệu nội bộ (giá vốn, biên lợi nhuận, phí) ghi 🔒 — không đưa vào bản gửi khách/landing.
- Chân dung dựng để mô tả phân khúc phải ghi rõ "minh họa (composite)".
- KHÔNG viết lại nội dung đã có ở chương khác — chỉ dẫn chiếu sang.
- Giữ lại ít nhất MỘT lời chê trong hồ sơ, làm chứng chỉ trung thực.
```

## Bảng ký hiệu chuẩn

| Ký hiệu | Nghĩa | Dùng khi |
|---|---|---|
| `FB-01`, `Q-07` | Mã bằng chứng | Mọi trích dẫn, mọi luận điểm neo vào khách thật |
| 🔒 | Dữ liệu nội bộ | Giá vốn, biên lợi nhuận, phí |
| ⚠️ | Cần kiểm chứng | Suy luận, giả thuyết, dữ liệu một nguồn |
| *"minh họa (composite)"* | Chân dung dựng | Mô tả phân khúc, không phải một người có thật |
| 🔴 🟡 🟢 | Mức ưu tiên/rủi ro | Bảng khoảng trống dữ liệu |
| TOFU / MOFU / BOFU | Đầu / giữa / cuối phễu | Vai trò từng cặp đau–sướng |

## Sáu lỗi thường gặp

| # | Lỗi | Dấu hiệu | Cách chặn |
|---|---|---|---|
| 1 | **Rỗng ruột** | Dài đúng số trang mong muốn, mọi trích dẫn khách đều "hay" đáng ngờ, không mã nguồn | Vòng 1 nghiêm túc + câu 8 vòng 5 |
| 2 | **Nhiễm ngành file mẫu** | Xuất hiện thuật ngữ/ví dụ của ngành gốc | Vòng 2b chỉ lấy blueprint |
| 3 | **Đưa link cho AI tự đọc** | Mô tả Fanpage/website mà chắc chắn không vào được | Chỉ đọc thứ có trong `nguyen-lieu/` |
| 4 | **Dán ảnh bìa sách coi như đã nạp sách** | Phần "áp dụng lý thuyết" chung chung, không có công cụ cụ thể | Viết lại khung đầy đủ trước rồi mới soi |
| 5 | **Chỉ nghe người đã mua** | Chương phản đối toàn phản đối *đã vượt qua*, không có ca thất bại | Ép loại nguyên liệu 3 |
| 6 | **Viết một lần 100 trang** | Phần sau lặp phần trước, mâu thuẫn số liệu giữa các chương | Viết theo thứ tự tệp, phần sau dẫn chiếu phần trước |

## Checklist nghiệm thu — chấm 12 điểm

Dưới **9/12** thì chưa dùng để tiêu tiền quảng cáo được.

- [ ] 1. Có chương **phương pháp & nguồn dữ liệu**, ghi rõ độ tin cậy từng lớp nguồn
- [ ] 2. Có chương **bối cảnh thị trường** đứng TRƯỚC chương chân dung
- [ ] 3. Chân dung tổng có **7 tiêu chí**, mỗi dòng kèm hàm ý chiến lược
- [ ] 4. Có **chân dung phụ**, mỗi cái neo vào bằng chứng thật có mã
- [ ] 5. Bản đồ nỗi đau **có xếp hạng bằng công thức**, không phải danh sách suông
- [ ] 6. Mỗi nỗi đau có **một sung sướng đối ứng** + vai trò phễu
- [ ] 7. Có chương **tiếng nói khách hàng nguyên văn**
- [ ] 8. Bằng chứng được **mã hóa** và truy vết được về tệp nguồn
- [ ] 9. **Giữ lại ít nhất một lời chê**
- [ ] 10. Có chương **rào cản & phản đối thật** kèm kịch bản xử lý
- [ ] 11. Có **ngân hàng câu chốt** + **ngân hàng câu hỏi → hook**
- [ ] 12. Có chương **khoảng trống dữ liệu** tự chấm mức rủi ro
