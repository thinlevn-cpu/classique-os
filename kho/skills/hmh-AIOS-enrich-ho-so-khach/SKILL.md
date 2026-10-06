---
name: hmh-AIOS-enrich-ho-so-khach
description: >-
  Làm giàu (enrich) hồ sơ khách hàng từ data salepage đổ về Lark Base: lọc data rác
  (SĐT sai, tên cụt, email fake) rồi TỰ ĐI RESEARCH trên mạng để biết khách LÀM GÌ,
  TỪNG LÀM GÌ, CÓ KINH DOANH KHÔNG, CÓ ĐĂNG KÝ KINH DOANH (mã số thuế) KHÔNG, NGÀNH NGHỀ GÌ —
  rồi ghi ngược kết quả vào chính bảng để sale có hồ sơ khách trước khi tư vấn. Grounded từ
  OSINT (Michael Bazzell) + waterfall enrichment (Clay/Apollo) + tra cứu ĐKKD Việt Nam (masothue.com).
  Chạy an toàn, chống trùng (cờ "Đã enrich"), chỉ dùng thông tin công khai.
  Dùng khi người dùng muốn: làm giàu hồ sơ khách, enrich lead, research khách hàng từ salepage,
  lọc data rác, biết khách có kinh doanh không, tra mã số thuế/ngành nghề của lead, dựng chân dung
  khách trước khi sale gọi. Kích hoạt khi có từ: enrich lead, làm giàu hồ sơ, research khách hàng,
  data rác salepage, lọc lead rác, khách có kinh doanh không, tra đăng ký kinh doanh lead, ngành nghề
  khách, chân dung khách hàng, hồ sơ khách tự động, làm sạch data lead.
---

# hmh-AIOS-enrich-ho-so-khach — Làm giàu hồ sơ khách hàng từ salepage

Salepage đổ lead về Lark Base kèm **data rác** (SĐT sai, tên cụt, email fake) lẫn lead thật. Skill này
**lọc rác + tự research công khai** để trả lời: khách **làm gì, từng làm gì, có kinh doanh không, có đăng ký
kinh doanh (MST) không, ngành nghề gì** — rồi **ghi ngược vào bảng** cho sale dùng ngay.

## Triết lý gốc / Nguồn
- **OSINT có phương pháp** — Michael Bazzell, *Open Source Intelligence Techniques*: đi từ định danh → nguồn công khai → xác thực chéo, **chỉ dùng thông tin công khai**, ghi rõ nguồn. (amazon.com/dp/1984201573)
- **Waterfall enrichment** — Clay/Apollo/Clearbit: xếp tầng nhiều nguồn, hỏi lần lượt tới khi đủ; nâng độ phủ ~40%→~78%. (apollo.io/solutions/b2b-data-enrichment)
- **Tra cứu ĐKKD/MST Việt Nam** — masothue.com (2M+ DN, hộ KD, cá nhân; dữ liệu Tổng cục Thuế).
- Chi tiết từng bước: **`references/waterfall-research-sop.md`** (đọc trước khi research).
- Bản research đầy đủ nằm trong thư mục output của lần dựng skill (không kèm trong gói chuyển giao).

## Khi nào dùng / KHÔNG dùng
- **Dùng:** có lead mới trong bảng salepage cần biết khách là ai; cần lọc rác; cần chân dung khách trước khi gọi.
- **KHÔNG dùng:** đồng bộ lead Pancake→Lark (→ `hmh-AIOS-sync-pancake-lark`); phân tích thống kê đơn/KPI (→ `phan-tich-du-lieu`); gửi tin nhắn/nhắc khách (→ skill Zalo/email). Skill này **chỉ** làm giàu hồ sơ.

## Tiền điều kiện
- `lark-cli` đã đăng nhập (`--as user`) có quyền đọc/ghi Base chứa bảng lead.
- Có tool **WebSearch** + **WebFetch** (để research). Node ≥ 18.
- Tham số trong `scripts/config.env` (base token, table id, tên cột, webhook nhóm sale).
  Lần đầu: `cp scripts/config.env.example scripts/config.env` rồi điền Base/bảng của bạn
  (lấy từ URL Base: `…/base/<BASE_TOKEN>?table=<TABLE_ID>&view=<VIEW_ID>`).

---

## Quy trình thực thi (BPM: Input → Bước → Output)

**Input:** record lead trong bảng, cột `Đã enrich` chưa tích.
**Output:** cùng record được điền `Chất lượng data · Có kinh doanh · Ngành nghề · Đăng ký KD · Hồ sơ khách · Độ tin cậy · Nguồn enrich · Góc tư vấn · Link hồ sơ` + `Đã enrich = ✓`.
**Chốt người quyết:** sale đọc hồ sơ + độ tin cậy để quyết cách tư vấn (skill không tự nhắn khách).
**Chống trùng:** chỉ xử lý record `Đã enrich` = trống; ghi xong bật cờ.

### Bước 0 — Đảm bảo cột enrich tồn tại (chạy 1 lần/bảng)
```bash
cd .claude/skills/hmh-AIOS-enrich-ho-so-khach/scripts
node 00-ensure-fields.mjs
```
Tạo idempotent 8 cột: `Đã enrich`(checkbox), `Chất lượng data`/`Có kinh doanh`/`Độ tin cậy`(select), `Ngành nghề`/`Đăng ký KD`/`Hồ sơ khách`/`Nguồn enrich`(text).

### Bước 1 — Quét & phân loại rác (deterministic, không tốn web)
```bash
node 10-scan-leads.mjs            # hoặc --limit 10 để chạy thử ít
```
→ Ghi `scripts/worklist.json`: `to_research[]` (cần research) + `junk[]` (SĐT sai **và** email hỏng → không liên hệ được).
Validate: SĐT chuẩn VN (03/05/07/08/09 + cố định 02x); email hợp lệ + phân biệt **tên miền DN vs miễn phí**; tên cụt.

### Bước 2 — Xử lý rác uncontactable (rẻ, không web)
Với mỗi record trong `junk[]`: ghi `Chất lượng data = Rác`, `Hồ sơ khách = "Bỏ qua — <lý do>"`, `Có kinh doanh = Chưa rõ`, `Độ tin cậy = Thấp`, bật `Đã enrich`. Gom vào `results.json` rồi ghi 1 lần ở Bước 4.

### Bước 2b — Tra Zalo theo SĐT (rẻ, KHÔNG tốn Claude — làm trước research)
```bash
node 20-lookup-zalo.mjs            # [--limit N] [--delay 2000]
```
→ `zalo.json`: `{ record_id: { found, zalo_name, status, uid, gender, sdob, avatar } }`.
**Nguồn mạnh nhất với khách Việt** — khớp đúng SĐT khách khai nên không nhầm người: cho **tên thật**
(khách hay khai tên cụt), **status = nghề/chức danh tự khai**, và `found:false` = SĐT không có Zalo
→ tín hiệu số ảo. Đo thực tế: 5/8 lead có Zalo, 3 lộ luôn nghề.

### Bước 2c — Tra Google VIỆT NAM theo lô (thay `WebSearch` index Mỹ)
```bash
node 25-google-vn.mjs --dry                 # in query + ước phí, KHÔNG gọi API
node 25-google-vn.mjs --limit 8             # chạy thử cho rẻ
node 25-google-vn.mjs                       # chạy hết (nguồn mặc định: ra-soat-rac-oan.json)
node 25-google-vn.mjs --from worklist        # lấy lead từ worklist.json
node 25-google-vn.mjs --worklist worklist-<nguồn>.json --out google-<nguồn>.json   # lô theo nguồn
node 25-google-vn.mjs --rescore             # chấm lại kết quả cũ, MIỄN PHÍ (không gọi API)
```
Gọi `apify/google-search-scraper` với **`countryCode=vn` + `languageCode=vi`** → đúng Google người Việt
nhìn thấy, khác hẳn `WebSearch`. Chỉ tra **chuỗi duy nhất** (`"<SĐT>"`, `"<email>"`), **không tra họ tên trần**.
Cần `APIFY_TOKEN` (env hoặc `.secrets/apify.env`). Phí **đo thật $0,0042/query** (lô 209 query = $0,88).
→ `google-vn.json`: mỗi kết quả có 3 cờ **`khop_chinh_xac` · `vn` · `dang_doc`**.

> 🔗 **Đã gộp 17/08:** file này là bản hợp nhất của `25-google-vn.mjs` (bộ chấm điểm + `--rescore`)
> và `94-google-apify.mjs` (tham số `--worklist`/`--out`). `94-google-apify.mjs` nay chỉ là **cầu
> chuyển tiếp**: lệnh cũ vẫn chạy (`--uoc-tinh`, `--limit`, `--worklist`, `--out`) và vẫn ghi ra
> `google-results.json` như trước để không trộn nhầm hai lô. Dùng thẳng `25-` cho việc mới.

⚠️ **KHÔNG chạy lô dựa trên `worklist.json`** — `enrich-watcher` ghi đè file đó bất cứ lúc nào
(gateway spawn một watcher mỗi khi có lead mới). Lô theo nguồn phải truyền `--worklist` file riêng.

⚠️ **Hai loại nhiễu đã đo và đã chặn — đừng gỡ bộ lọc:**
- **Trùng số quốc tế** (nặng nhất): đầu số VN trùng số nội địa nước khác — đo thật trên một lô lead:
  số 03… ra số cố định **Tokyo** (03-xxxx-xxxx) · số 07… ra **Thụy Điển** (hitta.se/eniro.se) · số 09…
  ra rao vặt **Aleppo, Syria** · một số 09… khác = `+421…` **Slovakia**; lô ebook còn trúng
  **Jordan** và **Đài Loan**. Chặn theo tên miền `.jp/.se/.sk/.tw/.kr/.ru/.pl` + `jpnumber.com`,
  `09xy.sk`, `france-inverse.com`, `mobile-phone.com.tw`.
- **Khớp một phần:** Google **không** tôn trọng ngoặc kép tuyệt đối — query `"hung@example.com"` trả về
  `kitty.hung@` / `bradley.hung@`, người khác hẳn. Cờ `khop_chinh_xac` kiểm ký tự liền trước chuỗi để loại.
- Nguồn rác tự sinh: `z-*.blogspot.com`, `<hash>.cloudfront.net` → chặn theo tên miền.
- **`scribd.com` / `pdfcoffee.com`: loại vì lý do ĐẠO ĐỨC** — toàn "data VIP" bị rò rỉ, vừa không
  kiểm chứng được vừa không được phép dùng làm nguồn hồ sơ khách.

**Claude chỉ đọc kết quả có `dang_doc: true`**; phần còn lại giữ trong file để tra ngược khi cần.
`so_dang_doc = 0` ⇒ ghi **"chưa tra được"**, KHÔNG được ghi "không có thông tin".

**Hiệu quả đo thật 17/08:**
- Lô **113 record *án oan*** (`--from rac-oan`): 209 query = $0,88 → **65 lead có tín hiệu**, đã viết hồ sơ
  và ghi ngược Base 65/65 (52 `Lead thật` · 12 `Cần kiểm tra` · 1 `Rác` · 13 lộ pháp nhân/MST).
- Lô **26 lead ebook**, KHÔNG dùng Zalo (`--worklist worklist-ebook-honnhanhoahop.json`): 49 query ≈ $0,17
  → **7 khách xác minh được danh tính + nghề** (spa, quán bia, quán chay, bếp chả, vận tải, giáo viên,
  life coach) — từ 0 lên 7 `Độ tin cậy: Cao`. (Lô này chạy trước khi có bộ chấm điểm: 185 kết quả thô
  còn 53 sau khi lọc tay.)

⚠️ **Khi viết hồ sơ từ kết quả — hai luật cứng rút ra từ lô 17/08:**
1. **Tên khai ≠ tên người đại diện pháp nhân ⇒ CẤM gán**, ghi `XÁC MINH TRƯỚC` (gặp 3 ca). Một SĐT gắn
   NHIỀU pháp nhân tên khác nhau cũng vậy — chỉ nhận dấu vết nhất quán lặp lại (vd fanpage đăng đều).
2. **Không đưa nội dung bôi nhọ đời tư vào hồ sơ khách**, kể cả khi Google trả về (đã gặp 1 ca trên
   diễn đàn). Hồ sơ chỉ chứa thông tin công khai, kiểm chứng được, dùng được cho việc bán hàng.

⚠️ **File kết quả định dạng CŨ** (`google-results.json` do bản 94 sinh ra trước khi gộp) có hình dạng
`{sdt:[…], email:[…]}` chứ không có `queries` — script nhận ra và **chỉ dùng để chống tra trùng**,
không ép kiểu, không ghi đè. Muốn có cờ `dang_doc` cho lô đó thì tra lại với `--force`.

### Bước 3 — Research từng lead trong `to_research[]` (theo SOP waterfall)
Đọc `references/waterfall-research-sop.md`, làm đúng tầng B0→A→B→C, **dừng khi đủ tự tin**:
- **B0 · Zalo** — đọc `zalo.json` trước tiên; lấy tên thật + nghề + tên thương hiệu làm mồi cho các tầng sau.
  ⚠️ `found:false` **CÓ kèm `error`** = KHÔNG BIẾT (phiên chết/bị chặn), **cấm** ghi "SĐT không có Zalo".
- **A · Email — đọc CẢ HAI nửa:**
  - **A1 tên miền:** nếu là tên miền riêng → `WebFetch https://<domain>` → DN gì, ngành, địa chỉ, chủ.
  - **A2 phần tên (trước @):** ⭐ MIỄN PHÍ — `node 92-doc-manh-moi-email.mjs` tách nghề/địa bàn/thương hiệu
    (`dangkiemanphu` → đăng kiểm · `minstudio088` → studio · `minhhuongtanlachb` → Tân Lạc, Hoà Bình).
    **Gmail KHÔNG có nghĩa là bỏ qua email.** Là manh mối, không phải kết luận.
- **B · ĐKKD/MST** — `WebFetch https://masothue.com/Search/?q=…&type=auto`, **tra theo SĐT trước**, tên DN sau,
  họ tên người chỉ để tham khảo (≥2 kết quả trùng tên = cờ đỏ, **cấm gán**).
- **C · Web/MXH — thứ tự bắt buộc, chuỗi duy nhất trước, tên người sau cùng:**
  1. SĐT trên **Zalo** → **mở xem profile** (ảnh, bài đăng, cửa hàng, địa bàn)
  2. **`WebSearch "<SĐT>"`** — số lộ trên fanpage/rao vặt/danh bạ DN → mỏ neo cứng
  3. **`WebSearch "<email>"`** — ⭐ bước hay bị bỏ sót; email là chuỗi duy nhất → mỏ neo cứng
  4. Tên thương hiệu → 5. `"<Họ tên>" + tỉnh/ngành`. **Cấm** tra họ tên trần khi chưa có mỏ neo.
  ⚠️ WebSearch là **index Mỹ**, yếu với dữ liệu VN. **Rỗng ≠ không tồn tại** — ghi "chưa tra được",
  **cấm** ghi "không có thông tin". → Bước 2c bên dưới thay được cửa 2 và 3 bằng Google VN thật.
- Tận dụng **Ghi chú sale** làm mồi (vd "hv cũ kd studio" = đang kinh doanh studio).

> **Chưa đi hết 5 cửa (Zalo · phần tên email · Google SĐT · Google email · masothue theo SĐT)
> thì CHƯA được ghi `Rác` hay `Độ tin cậy: Thấp`.** Rà 17/08: 113 record mang bản án xấu mà vẫn
> còn đường tra, 89 trong số đó có email hợp lệ nhưng chưa từng được tra email lần nào.

**Chạy nhanh cả lô:** fan-out mỗi lead một sub-agent `general-purpose` (research song song), yêu cầu trả về đúng JSON object `{record_id, chatluong, co_kd, nganhnghe, dkkd, hoso, tincay, nguon}`. Gộp kết quả vào `results.json`.

Tổng hợp mỗi lead thành 1 object (giá trị hợp lệ):
- `chatluong` ∈ `Lead thật | Cần kiểm tra | Rác`
- `co_kd` ∈ `Có | Không | Chưa rõ`  · `tincay` ∈ `Cao | Trung bình | Thấp`
- `nganhnghe`, `dkkd` (MST hoặc "Không tìm thấy công khai"), `nguon` (link + ngày).
- `hoso` — **BỘ HỒ SƠ CHI TIẾT, viết theo đúng 6 dòng có nhãn** (dòng nào không có data thì ghi `Chưa rõ`,
  TUYỆT ĐỐI không bịa). Đây là thứ sale đọc trước khi gọi:
  ```
  NGHỀ/CHỨC DANH: …
  DOANH NGHIỆP: <tên> · MST <…> · <ngành> · vai trò <chủ/quản lý/nhân viên>
  QUY MÔ & ĐỊA BÀN: <nhân sự/chi nhánh/tỉnh thành nếu suy ra được>
  TỪNG LÀM: <nghề/vai trò trước đó>
  DẤU VẾT ONLINE: <fanpage/website/MXH đang hoạt động — mô tả ngắn họ đang bán gì, đăng gì>
  NHU CẦU SUY RA: <vì sao người này để lại data, họ đang vướng gì>
  ```
- `goctuvan` — **gợi ý cho sale**, 1 dòng 4 nhãn: `MỞ LỜI: … | ĐÒN BẨY: … | RÀO CẢN: … | GÓI PHÙ HỢP: …`
- `link` — các URL đã tìm được, cách nhau bằng ` · ` (website · fanpage · masothue…) để sale bấm xem ngay.

### Bước 4 — Ghi ngược vào bảng + bật cờ chống trùng
```bash
node 30-write-enrich.mjs results.json
```
In từng dòng đã ghi. `Đã enrich` tự bật → chạy lại không đụng record cũ (idempotent).

### Bước 4b — CHẾ ĐỘ HỒ SƠ MỀM (khi Zalo không dùng được)

Chốt 08/09/2026: **Zalo hỏng thì không đứng cả dây chuyền.** Trước đó hệ dừng hẳn để tránh
lặp sự cố ghép nhầm người 13–17/08 — nguyên tắc đúng, nhưng hệ quả là một trục trặc Zalo làm sale
không có lead nào để gọi.

Nay khi `20-lookup-zalo.mjs` thoát mã 2 hoặc 3, watcher **vẫn chạy tiếp** nhưng ở chế độ mềm:

| | Bình thường | Hồ sơ mềm |
|---|---|---|
| Nguồn tra | Zalo + email + Google VN | email + Google VN (Zalo đóng) |
| Cờ `Đã enrich` | ✅ bật | ❌ **không bật** — lead ở lại hàng chờ |
| `Độ tin cậy` | tới `Cao` | tối đa `Trung bình` |
| `Góc tư vấn` | bình thường | mở đầu `HỒ SƠ TẠM (chưa tra được Zalo) —` |
| Card sale | bình thường | có nhãn `⏳ HỒ SƠ TẠM` |
| Báo Lark | 🟡 chuyển chế độ mềm (không phải báo dừng) | |

Bật bằng `ENRICH_HO_SO_MEM=1` (watcher tự đặt) hoặc cờ `--ho-so-mem` cho `30-write-enrich.mjs`
và `40-notify-sale.mjs`.

**Chống research lại vô hạn:** lead không tick cờ thì lượt sau `10-scan-leads` lại nhặt lên — nếu
Zalo vẫn hỏng sẽ gọi Claude lại mãi trên cùng một lead. Nên watcher giữ sổ `ho-so-mem.json`: đã
dựng hồ sơ tạm cho ai thì thôi, chờ Zalo sống. **Zalo sống lại** ⇒ watcher xoá sổ, **gỡ cờ
`Đã báo sale`** của những lead đó rồi tra lại đầy đủ và ghi đè — sale nhận card mới thay card tạm.

> Luật lõi KHÔNG đổi: chế độ mềm vẫn **cấm** viết "SĐT không có Zalo", cấm suy ra số ảo, cấm hạ
> `Chất lượng data` vì thiếu Zalo. Thiếu tin thì ghi "Chưa rõ — chưa tra được Zalo".

### Bước 5 — Báo cáo & log
- Lưu kết quả vào `output/YYYY-MM-DD-enrich-salepage/` (worklist + results + tóm tắt md), cập nhật `index.md`.
- Ghi `log.md`: `## [YYYY-MM-DD] enrich | <n> lead — <x> có KD, <y> rác`.
- Báo cáo THẬT (thực thi trước, báo cáo sau): đã enrich bao nhiêu, bao nhiêu Có KD, ngành nổi bật, lead rác.

---

## Tham chiếu script
| File | Vai trò |
|---|---|
| `scripts/config.env` | Tham số hoá (base/table/tên cột/email free) — đổi để nhân bản base khác |
| `scripts/_lib.mjs` | Đọc config, gọi lark-cli, chuẩn hoá SĐT/email, phân loại rác |
| `scripts/_zalo.mjs` | **Nguồn sự thật duy nhất khi gọi & đọc kết quả Zalo** — mọi script phải dùng `traZalo()`/`kiemPhien()`, **cấm tự viết catch riêng** |
| `scripts/90-ra-soat-zalo-hong.mjs` | Rà lead bị enrich lúc phiên Zalo hỏng (`--tra-zalo`, delay ≥3500ms) |
| `scripts/91-ra-soat-rac-oan.mjs` | Tìm lead bị chấm `Rác`/`Thấp` mà vẫn còn đường tra |
| `scripts/92-doc-manh-moi-email.mjs` | Đọc phần tên email → nghề/địa bàn/thương hiệu (miễn phí) |
| `scripts/00-ensure-fields.mjs` | Tạo idempotent 8 cột enrich |
| `scripts/10-scan-leads.mjs` | Quét → `worklist.json` (to_research + junk) |
| `scripts/20-lookup-zalo.mjs` | Tra SĐT trên Zalo → `zalo.json` (tên thật + nghề + số sống/ảo) |
| `scripts/21-zalo-login-qr.mjs` | Giữ mã QR luôn sống để đăng nhập lại Zalo (trang tự làm mới ở http://localhost:18930) |
| `scripts/25-google-vn.mjs` | Tra SĐT/email trên **Google Việt Nam** qua Apify (`--dry` xem phí, `--rescore` chấm lại miễn phí) |
| `scripts/93-worklist-theo-nguon.mjs` | Tách worklist RIÊNG theo từng nguồn (`worklist-<nguồn>.json`) để chạy lô không đụng watcher |
| `scripts/94-google-apify.mjs` | Cầu chuyển tiếp cho lệnh cũ — đã gộp vào `25-google-vn.mjs` |
| `scripts/40-notify-sale.mjs` | **Báo sale**: card hồ sơ **trả lời trong chuỗi** tin data của Base Assistant (`--gon` = card rút gọn, `--xem` = duyệt trước); cờ `Đã báo sale` chống trùng |
| `scripts/_thread.mjs` | Quét lịch sử nhóm → bản đồ SĐT/email → `message_id` tin data, rồi `reply --reply-in-thread` |
| `scripts/41-bat-tra-loi-trong-chuoi.mjs` | Chạy 1 lần: thêm bot vào nhóm data + gửi thử vào chuỗi (báo rõ nếu app chưa được phép dùng ở nhóm ngoài) |
| `scripts/enrich-watcher.mjs` | **Tiến trình canh**: có lead mới → scan → tra Zalo → gọi Claude → ghi bảng → báo sale |
| `scripts/30-write-enrich.mjs` | Ghi `results.json` ngược bảng + bật `Đã enrich` |
| `references/waterfall-research-sop.md` | SOP research 3 tầng + đạo đức |

## Lưu ý / gotcha
- **Không bịa.** Thà `Chưa rõ` + `Độ tin cậy: Thấp`. Mỗi tuyên bố phải truy được về nguồn.
- **Bẫy trùng tên** — chỉ gán hồ sơ khi khớp (địa phương/ngành/thương hiệu), nhất là tên phổ biến.
- **Email markdown** — bảng lưu email dạng `[a@b.com](mailto:...)`; `_lib.mjs` đã gỡ, nhưng kiểm lại khi đổi bảng.
- **masothue "không có kết quả" ≠ "không kinh doanh"** — hộ KD nhỏ thường không index. Ghi "Không tìm thấy công khai".
- **Chỉ thông tin công khai**, phục vụ lead qualification hợp pháp; không thu thập dữ liệu nhạy cảm ngoài mục tiêu kinh doanh.
- **Chống trùng bằng cờ, không bằng thời gian** — chạy lại an toàn.
- **Trả lời trong chuỗi cần bot ở TRONG nhóm** — `im +messages-reply --reply-in-thread` chỉ chạy khi
  app bot là thành viên nhóm. Nhóm **liên hệ ngoài (external)** chặn cả 3 đường: thêm bot → `232033`,
  bot gửi → `230002`, user gửi → `230027`. Muốn dùng chuỗi ở nhóm ngoại thì phải bật cho app quyền
  hoạt động ở nhóm ngoài (Developer/Admin Console), hoặc chuyển data sang nhóm nội bộ.
  Không tìm được tin gốc / reply lỗi → script **tự rơi về webhook** (tin rời) nên không mất hồ sơ.

## Tự động hoá — "có data về thì chạy"
Enrich CẦN Claude research → executor phải là Claude headless chạy trên MÁY BẠN (Zalo là phiên đăng
nhập cá nhân, không mang lên máy chủ được). Ba mức, chọn một:

**1. Tiến trình canh (đơn giản nhất, đang chạy thật):**
```bash
node enrich-watcher.mjs          # vòng 60s: scan rẻ → có lead mới mới gọi Claude
node enrich-watcher.mjs --once   # chạy đúng 1 lượt (để thử)
```
Có khoá liên tiến trình (`enrich.lock`, tự hết hạn sau 45 phút) nên chạy chồng cũng không hỏng dữ liệu.

**2. Bắn thẳng từ Base (độ trễ ~1 giây):** Lark Base Automation "khi có bản ghi mới" → gửi HTTP tới
gateway Node của bạn → gateway spawn `enrich-watcher.mjs --once`. Route mẫu: `gateway/hook-lead-new.snippet.mjs`.
⚠️ Gateway spawn MỘT tiến trình mỗi cú POST → nhiều lead về cùng lúc sẽ đẻ nhiều watcher ghi đè
`worklist.json` / `zalo.json` của nhau. Khoá liên tiến trình ở trên chính là thứ chặn việc đó — đừng gỡ.

**3. Task Scheduler:** chạy `enrich-watcher.mjs --once` mỗi 1–2 phút. Cùng cơ chế scan-gate + khoá.

**Ràng buộc đã kiểm chứng (đừng đi sai đường):**
- Máy sau NAT → worker/cloud **không gọi thẳng** vào máy được (trừ khi mở tunnel).
- Bridge chat (nếu bạn có) thường **lọc bỏ tin `sender_type === "app"`** → Base Automation bắn tin vào
  control chat **KHÔNG kích hoạt** được trợ lý. ⇒ Không dùng đường "automation → control chat".
- Máy tắt thì không chạy. Bản `cloud/` trên GitHub Actions chỉ lọc rác bằng luật cứng và **cố tình
  không bật cờ `Đã enrich`** để khi máy bật lại, hồ sơ đầy đủ vẫn được dựng.

> ⚠️ Cả ba đều là **Claude chạy nền không giám sát** trên máy production → phải được chủ hệ thống BẬT có
> chủ ý. Chốt cơ chế với người dùng trước khi kích hoạt. Idempotent (`Đã enrich`) đảm bảo chạy lặp an toàn.

## Output (bám CLAUDE.md)
Mỗi lần chạy → 1 thư mục `output/YYYY-MM-DD-enrich-salepage/` chứa `worklist.json`, `results.json`, và trang tóm tắt `.md` (câu hỏi gốc + số liệu + vài hồ sơ tiêu biểu). Cập nhật `index.md` (mục Output) + `log.md`.
