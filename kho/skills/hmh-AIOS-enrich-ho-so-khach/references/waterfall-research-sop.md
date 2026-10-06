# SOP — Research waterfall làm giàu hồ sơ khách (VN)

Quy trình research cho **MỘT lead**, chắt lọc từ 2 phương pháp gốc:

- **OSINT có phương pháp** — Michael Bazzell, *Open Source Intelligence Techniques* (nguyên FBI Cyber Crimes Task Force). Nguyên tắc: đi từ **định danh (identifier) → nguồn công khai → xác thực chéo**, ghi lại nguồn, và **chỉ dùng thông tin công khai**. (amazon.com/dp/1984201573)
- **Waterfall enrichment** — Clay/Apollo/Clearbit: **xếp tầng nhiều nguồn, hỏi lần lượt tới khi đủ dữ liệu**, nâng độ phủ từ ~40% lên ~78%. Không phụ thuộc 1 nguồn duy nhất. (apollo.io/solutions/b2b-data-enrichment)

> **Nguyên tắc vàng:** thà ghi "Chưa rõ" còn hơn bịa. Mỗi tuyên bố phải truy được về 1 nguồn. Đánh dấu độ tin cậy trung thực.

---

## Định danh đầu vào (identifiers)
Từ bảng: **Họ tên · Số điện thoại · Email · Nguồn · Ghi chú sale**.
Tín hiệu mạnh yếu (ưu tiên tra theo thứ tự này):

| Bậc | Tín hiệu | Vì sao mạnh |
|---|---|---|
| 1 | **Email tên miền riêng** (không phải gmail/yahoo/icloud…) | Gần như chắc chắn có DN/thương hiệu. Domain = tên công ty. |
| 2 | **Ghi chú sale** ("hv cũ kd studio", "chủ shop"…) | Sale đã nói chuyện — manh mối nghề nghiệp trực tiếp. |
| 3 | **Họ tên đầy đủ + SĐT** | Tra Facebook/Zalo/masothue; tên đủ 2–3 từ mới đáng tra. |
| 4 | **SĐT** | Tra hộ kinh doanh/DN đăng công khai theo SĐT. |

---

## Tầng research (dừng khi đã đủ tự tin)

### Tầng B0 — ZALO theo SĐT ⭐ NGUỒN MẠNH NHẤT VỚI KHÁCH VIỆT (chạy ĐẦU TIÊN)
Đo thực tế 2026-08-06 trên bảng đăng ký salepage: **100/100 lead dùng email miễn phí** (gmail/icloud)
→ Tầng A vô dụng; `WebSearch` là index Mỹ nên tra SĐT/tên tiếng Việt gần như **0 kết quả**.
Zalo thì ngược lại: khớp **đúng số khách tự khai** nên không có chuyện nhầm người.

Bridge/watcher đã chạy sẵn `scripts/20-lookup-zalo.mjs` → đọc **`scripts/zalo.json`**:
```
"<record_id>": { found, zalo_name, status, uid, gender, sdob, avatar }
```
Tra tay 1 số: `zalo-agent --json friend find <sdt>`

Khai thác:
- `found: false` → SĐT **không có tài khoản Zalo** = tín hiệu số sai/ảo mạnh → `Chất lượng data` hạ xuống
  `Cần kiểm tra` (hoặc `Rác` nếu email cũng hỏng). Ghi vào hồ sơ: "SĐT không có Zalo".
- `zalo_name` → **tên thật** (khách hay khai tên cụt "Anh", "Thu" ở form) → dùng làm từ khoá tra tiếp.
- `status` → thường là **nghề/chức danh tự khai**, ví dụ thật đã lấy được:
  *"Founder · Người Sáng Lập Học Viện Đào Tạo Phun Xăm Thẩm Mỹ"*, *"Tư vấn bất động sản Vinhomes Ocean Park 2,3"*,
  *"Founder Thảo Mộc Uyên Nhiên"*. Có tên thương hiệu ở đây thì mang thẳng xuống tầng B/C tra tiếp.
- Tỉ lệ thực đo: **5/8 lead có Zalo**, 3 trong số đó lộ luôn nghề nghiệp.

### Tầng A — Email: PHẢI đọc CẢ HAI nửa (cập nhật 2026-08-17)

```
     dangkiemanphu   @   gmail.com
     └─── A2 ────┘       └── A1 ──┘
```

**A1 — tên miền (sau @):**
1. **Tên miền riêng** → `WebFetch https://<domain>` (thử `http://` nếu lỗi) → DN gì, ngành nghề,
   dịch vụ, địa chỉ, tên chủ/thương hiệu, hotline. Bằng chứng "CÓ kinh doanh" mạnh nhất.
2. Domain không có web → `WebSearch "<domain>"` xem là DN nào.
3. Email miễn phí (gmail…) → không suy ra được DN, **NHƯNG KHÔNG BỎ QUA EMAIL** → sang A2.

**A2 — phần tên (trước @) ⭐ MIỄN PHÍ, KHÔNG TỐN LƯỢT WEB — chạy `92-doc-manh-moi-email.mjs`:**
> Bản SOP cũ ghi "email miễn phí → bỏ qua tầng này", khiến hệ vứt luôn phần tên do chính khách
> đặt. Rà bảng 17/08 lộ ra hàng loạt lead bị chấm `Rác`/`Thấp` trong khi email đã nói rõ họ làm gì:

| Email | Đọc ra | Hệ đang chấm |
|---|---|---|
| `dangkiemhoangan@example.com` | trung tâm đăng kiểm Hoàng An | Cần kiểm tra · **Thấp** |
| `namtuanstore68@example.com` | có cửa hàng (store) | **Rác** · Thấp |
| `hienchupanh19@example.com` | nghề chụp ảnh | Cần kiểm tra · **Thấp** |
| `linhstudio088@example.com` | studio | Lead thật · **Thấp** |
| `aocuoimaianh1992@example.com` | áo cưới | Lead thật · Trung bình |
| `lananhtanlachb@example.com` | địa bàn Tân Lạc, Hoà Bình | Cần kiểm tra · Thấp |

Bỏ dấu `. _ - +` rồi soi: **nghề/mô hình** · **địa bàn** · **thương hiệu** (từ lạ không phải tên người).
Giá trị lớn nhất là **ĐỊA BÀN** — đúng thứ cần để khớp chéo chống trùng tên.

⚠️ **Bẫy đã sập:** bản đầu nhận từ `"tra"` → khớp trúng họ **Trần** (lytran, thuytran, trannghia),
gán oan cả loạt vào ngành "ăn uống"; `"quan"` trúng Quang/Quân; `"gd"` trúng gian**gd**an.
Loại hết từ ngắn + viết tắt ≤2 ký tự → 26 kết quả nhiễu còn **11 kết quả thật**.
**Chỉ nhận từ đủ dài, không trùng họ/tên/đệm người Việt. Thà bỏ sót còn hơn gán sai.**

**A2 là manh mối, KHÔNG phải kết luận** — cho phép ghi *"email gợi ý làm đăng kiểm, cần xác minh"*,
không cho phép ghi *"chủ trung tâm đăng kiểm An Phú"*.

### Tầng B — Đăng ký kinh doanh / Mã số thuế (bằng chứng pháp lý)
Tra **masothue.com** (2M+ DN + hộ KD + cá nhân, dữ liệu từ Tổng cục Thuế):
- Theo tên DN (lấy từ tầng A): `WebFetch https://masothue.com/Search/?q=<ten-doanh-nghiep>&type=auto`
- Theo SĐT: `WebFetch https://masothue.com/Search/?q=<sdt>&type=auto`
- Theo họ tên đầy đủ (khi tên đặc trưng): `...q=<Ho Ten>...`
→ Nếu ra kết quả: ghi **MST**, người đại diện, ngành nghề, tình trạng → `Đăng ký KD` = MST.
→ Không ra: `Đăng ký KD` = "Không tìm thấy công khai" (KHÔNG kết luận là không kinh doanh — hộ KD nhỏ thường không index).

Nguồn phụ khi cần: hosocongty.vn, tratencongty.com, thongtindoanhnghiep.co (cùng tra theo tên/MST/SĐT).

### Tầng C — Web/MXH mở (cập nhật 2026-08-17 theo cách tra tay của người có nghề)

**THỨ TỰ BẮT BUỘC — tra bằng chuỗi DUY NHẤT trước, tên người sau cùng:**

| Bước | Tra gì | Ghi chú |
|---|---|---|
| **C1** | SĐT trên **Zalo** → **MỞ XEM PROFILE** | Không dừng ở lấy tên: xem ảnh đại diện/bìa, bài đăng, cửa hàng, địa bàn |
| **C2** | **SĐT trên Google** — `"<SĐT khách>"` | Số lộ trên fanpage bán hàng, tin rao vặt, danh bạ DN, trang liên hệ → **mỏ neo cứng** |
| **C3** | **EMAIL trên Google** — `"<email khách>"` | ⭐ Bước bị bỏ sót suốt từ đầu. Gmail cá nhân vẫn để dấu vết: rao vặt, fanpage, hồ sơ công ty, diễn đàn, CV → **mỏ neo cứng** |
| **C4** | Tên thương hiệu (từ Zalo status / phần tên email) | Thương hiệu ít trùng hơn tên người |
| **C5** | `"<Họ tên>" + <tỉnh/ngành>` | Chỉ khi đã biết tỉnh/ngành từ nguồn khác |
| — | `"<Họ tên>"` trần | **CẤM** khi chưa có mỏ neo |

**Vì sao C2–C3 phải đứng trước:** chúng tra bằng chuỗi định danh **duy nhất** (số điện thoại, email),
ra kết quả là chắc chắn đúng người — miễn nhiễm hoàn toàn với bẫy trùng tên đã gây sự cố 17/08.

⚠️ **WebSearch của AI là index MỸ, yếu hơn hẳn Google người Việt dùng.** Kiểm chứng 17/08:
tra một email khách kiểu «nghề + địa bàn» (vd đăng kiểm + tên huyện) → chỉ ra trang Wikipedia về họ của người đó.
⇒ **Rỗng ≠ không tồn tại.** Cấm ghi "không có thông tin"; chỉ được ghi
*"WebSearch (index Mỹ) không ra — chưa tra bằng Google Việt Nam"*, rồi chọn:
người tra tay trên google.com.vn (lead đáng giá) · Apify Google Search Scraper (chạy lô) · ghi `Chưa tra được`.

→ Lấy: nghề hiện tại, từng làm gì, chức danh, lĩnh vực. Chỉ nhận thông tin **công khai** và **khớp** — tránh nhầm người trùng tên.

⚠️ **Đã kiểm chứng 2026-08-06 — biết trước để khỏi mất công:**
- `WebSearch` **index Mỹ**: tra hai SĐT khách thật (đầu số 09) → 0 kết quả liên quan; tra tên Việt phổ thông ra
  hàng loạt người trùng tên. Chỉ dùng khi có **tên thương hiệu** (từ Zalo status), đừng tra tên người trần.
  Và tên gần giống KHÔNG phải là trùng — tra "Thảo Mộc Uyên Nhiên" ra "THẢO MỘC AN NHIÊN", khác doanh nghiệp.
- `WebFetch https://masothue.com/Search/?q=…` chỉ trả về **giao diện tìm kiếm**, không trả kết quả (chặn bot).
  Coi tầng B là "có thì tốt", đừng dựa vào nó để kết luận.
- **Facebook qua Apify**: đã thử `apivault_labs/facebook-profile-scraper` (search theo tên thương hiệu)
  → tìm ra URL nhưng scrape trả `Page not found or no public data (login-walled)` cho cả 3 profile.
  Profile cá nhân VN gần như luôn bị login-wall ⇒ chỉ đáng chạy khi nạp được **cookies Facebook**
  (actor `devwithbobby/fb-profile-scraper` có tham số `cookies`) — cân nhắc rủi ro tài khoản trước khi bật.

---

## Tổng hợp → ghi bảng
Điền các cột:
- **Có kinh doanh**: `Có` (có web DN / MST / bằng chứng rõ) · `Không` (bằng chứng là người làm công/nội trợ/sinh viên) · `Chưa rõ` (không đủ dữ liệu — mặc định khi mơ hồ).
- **Ngành nghề**: ngắn gọn (vd "Nhiếp ảnh – studio cưới", "Bất động sản", "Spa/thẩm mỹ").
- **Đăng ký KD**: MST nếu có, hoặc "Không tìm thấy công khai".
- **Hồ sơ khách**: 2–4 câu — *họ làm gì hiện tại, từng làm gì, quy mô/thương hiệu*, kèm điều sale nên biết để tư vấn. Viết trung thực, nêu rõ chỗ suy đoán.
- **Độ tin cậy**: `Cao` (≥2 nguồn khớp / có web/MST) · `Trung bình` (1 nguồn công khai) · `Thấp` (chủ yếu suy đoán từ ghi chú/nguồn).
- **Nguồn enrich**: liệt kê link/nguồn đã dùng + ngày (vd `<web-doanh-nghiep>.vn; masothue(<SĐT khách>)=none · 2026-08-05`).

## Phạm vi & đạo đức (bắt buộc)
- **Chỉ thông tin công khai** phục vụ **đánh giá lead để tư vấn bán hàng** (lead qualification hợp pháp).
- **Không bịa, không suy diễn quá tay.** Trùng tên là bẫy lớn — chỉ gán khi có yếu tố khớp (địa phương/ngành/thương hiệu).
- Không thu thập dữ liệu nhạy cảm (sức khoẻ, chính trị, đời tư) ngoài mục tiêu kinh doanh.
- Khi không chắc → `Chưa rõ` + `Độ tin cậy: Thấp`. Con người (sale) là chốt quyết định cuối.
