# Khuôn đầu ra — bộ 9 tệp

Một lần chạy = một thư mục `output/YYYY-MM-DD-hskh-<thuong-hieu>/` chứa **đúng 9 tệp** dưới đây.

Chia tệp theo **vai người đọc**, không theo thứ tự viết. Chủ doanh nghiệp đọc `00`; đội sale mở
`04`; đội content mở `05`. Gộp tất cả vào một tệp 100 trang thì chẳng ai đọc quá trang 3.

| Tệp | Cho ai | Dài cỡ |
|---|---|---|
| `00-TOM-TAT-DIEU-HANH.md` | Chủ doanh nghiệp — đọc 5 phút | 2–3 trang |
| `01-HO-SO-CHINH.md` | Người muốn hiểu sâu | 15–40 trang |
| `02-THE-CHAN-DUNG.md` | Dán tường / gửi freelancer | **đúng 1 trang** |
| `03-BAN-DO-DAU-SUONG.md` | Người quyết làm gì trước | 4–8 trang |
| `04-NGAN-HANG-CAU-CHOT.md` | Đội sale | 4–8 trang |
| `05-NGAN-HANG-HOOK.md` | Đội content | 4–8 trang |
| `06-MAP-OFFER-VPC.md` | Chủ DN khi sửa sản phẩm/giá | 3–5 trang |
| `07-KHOANG-TRONG.md` | Người chịu trách nhiệm bồi đắp hồ sơ | 2–4 trang |
| `NGUON.md` | Bất kỳ ai muốn kiểm chứng | tuỳ số bằng chứng |

Mọi tệp mở đầu bằng frontmatter chuẩn CLAUDE.md (`type: output`, `title`, `created`, `tags`, `sources`).

---

## `00-TOM-TAT-DIEU-HANH.md`

Thứ tự cố ý: **độ tin cậy trước, nội dung sau.** Người đọc phải biết hồ sơ này tin được tới đâu
trước khi tin bất cứ dòng nào trong đó.

1. **Hồ sơ này tin được tới đâu** — mức A/B/C/D từ vòng 1, kèm một câu giải thích mức đó nghĩa là gì.
   Mức D thì mở đầu bằng khối cảnh báo đỏ.
2. **Bảng kiểm kê nguyên liệu** — dán nguyên bảng 6 loại từ `kiem-ke.mjs`.
3. **Khách của bạn, gói trong 5 dòng** — chân dung tổng, rút gọn.
4. **Ba nỗi đau đáng chi tiền nhất** — top 3 theo điểm ảnh hưởng, kèm điểm số.
5. **Ba việc nên làm tuần này** — cụ thể, làm được ngay, lấy từ `05` và `07`.
6. **Hướng dẫn đọc theo vai trò**:
   > Có 5 phút: đọc tệp này. · Làm CONTENT: `05` → `03`. · Làm SALE: `04` → `02`.
   > Làm CHIẾN LƯỢC: `01` → `06` → `07`.
7. **Chấm điểm nghiệm thu** — x/12 theo checklist, kèm 3 điểm còn yếu nhất.

## `01-HO-SO-CHINH.md` — 6 phần

| Phần | Chương | Trả lời câu hỏi |
|---|---|---|
| **I — Bối cảnh & phương pháp** | Phương pháp & nguồn dữ liệu · Bối cảnh thị trường | Hồ sơ này tin được tới đâu? Thị trường đang ở đâu? |
| **II — Chân dung & phân khúc** | Chân dung tổng (7 tiêu chí) · 3–5 chân dung phụ · Phân khúc theo sản phẩm/giá | Khách là ai? Bán gì cho ai, giá nào? |
| **III — Tâm lý: đau & sướng** | Dẫn chiếu `03`, **không chép lại** | Họ đau gì, sướng gì? |
| **IV — Tiếng nói khách hàng** | Giải mã câu hỏi thật · Phân tích kho bằng chứng có tên | Họ nói gì bằng **giọng của họ**? |
| **V — Hành trình & tâm lý mua** | Hành trình từ nghe tới quay lại · Rào cản & phản đối thật | Họ đi qua đâu, kẹt ở đâu? |
| **VI — Chiến lược** | Nơi khách tụ tập & cạnh tranh · Ngách · Định vị khác biệt | Bán gì, nói gì trước? |

**Chân dung tổng — 7 tiêu chí**, mỗi dòng kèm **hàm ý chiến lược** (không có hàm ý thì dòng đó vô dụng):
vị trí · tuổi · giới tính · sở thích · kênh thông tin · thói quen · thu nhập.

## `02-THE-CHAN-DUNG.md` — đúng 1 trang

In ra dán tường. Không có gì ngoài: tên chân dung + một dòng mô tả · 3 nỗi đau đầu bảng (kèm điểm) ·
3 câu khách hay nói nguyên văn (kèm mã) · 3 lý do họ KHÔNG mua · một câu định vị dùng để mở đầu
mọi cuộc nói chuyện. Ghi rõ *"minh họa (composite)"* nếu là chân dung dựng.

## `03-BAN-DO-DAU-SUONG.md`

- Bảng nỗi đau: `| # | Nỗi đau | C | Ph | Ta | Điểm | Tầng | Vai trò phễu | Mã bằng chứng |`
- Bảng sung sướng: `| # | Lợi ích | Khát khao | Khả thi | Độ trễ | Công sức | Giá trị | Mã |`
- Bảng ghép cặp đau ↔ sướng + vai trò TOFU/MOFU/BOFU.
- Một mục **"đau nào đang im lặng"**: nỗi đau điểm cao nhưng không xuất hiện trong `Q-*`.

**Hiện đủ từng biến, không chỉ điểm tổng** — người đọc phải cãi lại được từng con số.

## `04-NGAN-HANG-CAU-CHOT.md` — cho sale

- **Câu chốt theo từng nỗi đau** — mỗi câu ghi rõ dùng khi khách nói gì.
- **6 phản đối thật + kịch bản xử lý** — lấy từ `KC-*` và câu 9 của phiếu, không tự nghĩ ra.
- **Bằng chứng đi kèm từng phản đối** — mã `FB-*` nào nên đưa ra lúc nào.
- **Điều KHÔNG BAO GIỜ hứa** — chép từ câu 16 của phiếu, đóng khung.

## `05-NGAN-HANG-HOOK.md` — cho content

- **Bảng câu hỏi thật → hook**: `| Mã Q | Câu khách hỏi (nguyên văn) | Hook | Định dạng |`
- **10 cụm nội dung**, mỗi cụm = 1 nỗi đau + 4 bài (Vạch đau · Khát khao · Cầu nối · Chứng minh),
  gán TOFU/MOFU/BOFU và thứ tự nên làm trước.
- **Từ nên dùng / từ nên tránh** — từ câu 18 của phiếu.

> Bàn giao được thẳng sang `hmh-mkt-content-30-ngay`, `hmh-mkt-hook-video`, `hmh-mkt-content-da-kenh`.

## `06-MAP-OFFER-VPC.md`

Bảng A **Pains ↔ Pain Relievers** · Bảng B **Gains ↔ Gain Creators** · 3 câu trả lời thẳng
(lỗ hổng sản phẩm · chi phí lãng phí · cơ hội nâng cấp) · xếp hạng Pain Relievers theo nỗi đau
điểm cao nhất → **cái nào nên đưa lên đầu trang bán hàng**.

> Bàn giao được thẳng sang `hmh-sale-dinh-gia-offer` và `hmh-mkt-ladipage`.

## `07-KHOANG-TRONG.md`

1. Bảng khoảng trống: `| Mảng thiếu | Hiện trạng | Rủi ro nếu bỏ qua | Mức 🔴🟡🟢 |`
   — ít nhất **5 mục**, trong đó ít nhất **2 mục 🔴**. Hồ sơ tự nhận "đã đầy đủ" là hồ sơ chưa đủ trung thực.
2. Với mỗi 🔴: cách lấp **rẻ nhất, nhanh nhất** bằng dữ liệu ĐANG CÓ — không phải khảo sát mới tốn tiền.
3. **Việc cần xác nhận trong tuần này** — cụ thể, làm được ngay.
4. **Cách hồ sơ này tự lớn lên**: feedback mới / ca từ chối mới / vòng kiểm chứng thì cập nhật vào đâu.
5. Kết bằng một câu nhắc: **dùng ngay đi, đừng chờ hoàn hảo.**

## `NGUON.md`

Bảng mã bằng chứng đầy đủ (dán từ `kiem-ke.mjs`, bổ sung mã tự gán), cộng **kết quả truy vết
câu 8 vòng 5**: mọi con số/tên/trích dẫn trong hồ sơ → chỉ về mã nào. Cuối tệp là mục
**"những dòng đã bị gạch vì không truy được nguồn"** — mục này rỗng là dấu hiệu vòng 5 chạy hình thức.

---

## Luật đặt tên & lưu

- Thư mục: `output/YYYY-MM-DD-hskh-<thuong-hieu-khong-dau>/`
- Sau khi ghi đủ 9 tệp: cập nhật `index.md` (mục Output) và ghi `log.md`:
  `## [YYYY-MM-DD] query | Hồ sơ khách hàng <thương hiệu> — mức <A/B/C/D>`
- Chạy lại cho cùng thương hiệu: **cập nhật thư mục cũ**, giữ `created`, sửa `updated` —
  đừng đẻ thư mục trùng.
