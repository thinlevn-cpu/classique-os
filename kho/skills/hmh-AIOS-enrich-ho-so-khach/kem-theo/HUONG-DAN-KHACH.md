# Hướng dẫn cài — từ đầu đến cuối

Làm theo đúng thứ tự. Mỗi bước đều có cách tự kiểm tra đã đúng chưa.

---

## Bước 1 — Chuẩn bị công cụ

```bash
node -v          # phải ≥ 18
claude --version # Claude Code CLI
lark-cli --help
zalo-agent --help
```

Thiếu cái nào thì cài cái đó:
- Claude Code: https://claude.com/claude-code
- `npm i -g @larksuite/cli` rồi `lark-cli auth login` (quét QR)
- `npm i -g zalo-agent-cli` rồi `zalo-agent login` (quét QR bằng Zalo trên điện thoại)

> **Không có Zalo cũng chạy được**, nhưng hồ sơ sẽ mỏng đi nhiều — đây là nguồn cho ra
> tên thật, nghề nghiệp và biết số nào là số ảo.

---

## Bước 2 — Lấy 3 thông tin từ Lark Base

Mở bảng lead của bạn, nhìn thanh địa chỉ:

```
https://abc.larksuite.com/base/bascnAAAAAAAA?table=tblBBBBBBBB&view=vewCCCCCCC
                               └─ BASE_TOKEN ─┘       └TABLE_ID┘      └VIEW_ID┘
```

Bảng cần có sẵn ít nhất 3 cột: **Họ tên · Số điện thoại · Email**. Các cột kết quả sẽ được tạo tự động ở bước 4.

---

## Bước 3 — Lấy webhook nhóm sale

Mở nhóm Lark muốn nhận thẻ khách → **Cài đặt** → **Bots** → **Add Bot** → **Custom Bot**
→ đặt tên (vd "Hồ sơ khách") → **Copy Webhook URL**.

Dán thử để chắc nó sống:
```bash
curl -X POST '<WEBHOOK_URL>' -H 'Content-Type: application/json' \
  -d '{"msg_type":"text","content":{"text":"Chào nhóm, bot đã kết nối."}}'
```
Thấy tin trong nhóm là đúng.

---

## Bước 4 — Cài skill

```bash
# chép vào bộ não của bạn
cp -r skill/hmh-AIOS-enrich-ho-so-khach <thư-mục-làm-việc>/.claude/skills/

cd <thư-mục-làm-việc>/.claude/skills/hmh-AIOS-enrich-ho-so-khach/scripts
cp config.env.example config.env
```

Mở `config.env`, điền 4 chỗ:
- `BASE_TOKEN`, `TABLE_ID` — lấy ở bước 2
- `SALE_WEBHOOK` — lấy ở bước 3
- `BASE_URL` — dán nguyên URL bảng, **giữ nguyên `&record=` ở cuối** (nút "Mở bản ghi" dùng cái này)

Nếu tên cột trong bảng bạn khác (vd "SĐT" thay vì "Số điện thoại"), sửa các dòng `F_...` cho khớp.

Tạo các cột kết quả (chạy một lần, chạy lại vô hại):
```bash
node 00-ensure-fields.mjs
```
Mở Base kiểm tra: phải thấy thêm **Đã enrich · Chất lượng data · Có kinh doanh · Ngành nghề ·
Đăng ký KD · Hồ sơ khách · Độ tin cậy · Nguồn enrich · Góc tư vấn · Link hồ sơ · Đã báo sale**.

---

## Bước 5 — Chạy thử một lượt

```bash
node 10-scan-leads.mjs        # xem có bao nhiêu lead chờ, ai bị loại vì số sai
node 20-lookup-zalo.mjs --limit 5   # tra thử 5 số trên Zalo
node enrich-watcher.mjs --once      # chạy trọn một lượt: quét → Zalo → Claude → ghi → báo nhóm
```

Xong thì mở Base xem hồ sơ, và mở nhóm Lark xem thẻ khách.

> **Muốn thử mà chưa gửi vào nhóm:** `node 40-notify-sale.mjs --dry --limit 3`
> **Bảng đã có sẵn nhiều lead cũ, không muốn nhóm ngập tin:** `node 40-notify-sale.mjs --mark-all`
> (chỉ đánh dấu là đã báo, không gửi gì) — từ đó nhóm chỉ nhận khách mới.

---

## Bước 6 — Cho nó tự chạy

Chọn **một** trong hai cách.

### Cách A — Canh theo vòng (đơn giản nhất)

```bash
node enrich-watcher.mjs
```
Cứ 60 giây quét bảng một lần; chỉ khi có lead mới mới gọi Claude. Muốn tự bật lại sau khi khởi động máy
thì tạo Scheduled Task (Windows) hoặc `launchd`/`systemd` (Mac/Linux) trỏ vào đúng lệnh này.

### Cách B — Lark Base bắn thẳng khi có lead (chạy ngay lập tức)

Cần một gateway HTTP chạy trên máy bạn. Nếu đã có gateway Node, dán đoạn trong `gateway/hook-lead-new.snippet.mjs`
vào, rồi trong Lark Base tạo **Automation**:

| Mục | Giá trị |
|---|---|
| Trigger | Khi bản ghi được thêm |
| Action | Gửi yêu cầu HTTP |
| Method | `POST` |
| URL | `https://<tên-miền-gateway-của-bạn>/hook/lead-new` |
| Header | `Content-Type: application/json` (+ header xác thực nếu gateway bạn yêu cầu) |
| Body | `{"record_id":"<Record ID>","source":"base-automation"}` |

Kiểm tra: tạo một bản ghi thử → mở log gateway, phải thấy dòng ghi nhận cú bắn → rồi xoá bản ghi thử.

> ⚠️ Đừng kiểm tra kiểu "đếm số dòng log trước và sau" — Base bắn nhanh hơn cả lệnh đếm đầu tiên nên
> bạn sẽ tưởng nhầm là không có gì. **Mở file log ra đọc.**

---

## Bước 7 (tuỳ chọn) — Lưới dự phòng khi máy tắt

Đẩy repo này lên GitHub của bạn, vào **Settings → Secrets and variables → Actions**:

- **Secrets:** `LARK_APP_ID`, `LARK_APP_SECRET` (app Lark có quyền Base), `LARK_WEBHOOK` (tuỳ chọn)
- **Variables:** `BASE_TOKEN`, `TABLE_ID`

Workflow `enrich-lead.yml` sẽ chạy mỗi 6 tiếng: lọc số sai/email hỏng và ghi nhận xét tạm vào bảng, giúp sale
khỏi gọi số ma trong lúc máy bạn tắt. Nó **không** dựng hồ sơ đầy đủ và **cố tình không bật cờ** `Đã enrich`,
nên khi máy bật lại, lead đó vẫn được research tử tế.

---

## Khi có trục trặc

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| `spawnSync lark-cli ENOENT` hoặc `EINVAL` | Trên Windows phải gọi qua file JS của lark-cli, không gọi `.cmd` trực tiếp — `_lib.mjs` đã xử lý sẵn, chỉ cần cài lark-cli đúng chỗ |
| Lark trả `91403 Forbidden` | App chưa được thêm vào Base, hoặc đang dùng nhầm app id/secret |
| Tra Zalo báo "User không hợp lệ" | Số đó **không có tài khoản Zalo** — đây là kết quả hợp lệ (dấu hiệu số ảo), không phải lỗi |
| Bỗng nhiên **mọi** lead đều "không có Zalo" | **Phiên Zalo đã chết** (sống khoảng 17 ngày rồi hết hạn im lặng). Kiểm bằng `zalo-agent status`: không thấy dòng `Logged in as` là chết. Chạy `node 21-zalo-login-qr.mjs` rồi quét QR bằng điện thoại — trang tự làm mới ở http://localhost:18930 |
| Nhận card đỏ "PHIÊN ZALO ĐÃ HẾT HẠN" / "ZALO ĐANG CHẶN" | Hệ **cố tình dừng** thay vì đoán bừa. Lead vẫn nằm nguyên trong hàng chờ, không bị đánh dấu đã xử lý. Xử lý xong nguyên nhân là nó chạy tiếp |
| Zalo trả "Vượt quá số request cho phép" | Tra quá dày. Rà soát hàng loạt phải để `--delay 3500` trở lên và chia mẻ; nghỉ vài giờ rồi chạy lại |
| Hồ sơ ghi "chưa tra được" hàng loạt | WebSearch của AI chạy **index Mỹ**, rất yếu với dữ liệu Việt. Muốn tra bằng Google người Việt thật thì bật `25-google-vn.mjs` (xem phần chi phí bên dưới) |
| Nhóm không nhận thẻ | Webhook sai, hoặc lead đã bị tick `Đã báo sale` từ trước |
| Hồ sơ toàn "Chưa rõ" | Khách dùng email miễn phí và không có Zalo — không có gì để tra. Cân nhắc bổ sung nguồn nội bộ (lịch sử chat, đơn hàng cũ) |
| Chạy chồng nhiều lượt | Đã có khoá `enrich.lock`; nếu tiến trình chết đột ngột, khoá tự hết hiệu lực sau 45 phút |

---

## Chi phí vận hành

Mỗi lượt xử lý tối đa 10 lead và tốn một phiên Claude. Quét bảng và tra Zalo **không tốn gì**, nên những
ngày không ai đăng ký thì hệ thống gần như không tiêu tốn. Thời gian thực đo: **10 lead ≈ 8 phút**.

**Tuỳ chọn có tính phí — tra Google Việt Nam (`25-google-vn.mjs`):** WebSearch của AI chạy index Mỹ nên
gần như vô dụng với SĐT và email người Việt. Muốn có đúng thứ Google người Việt nhìn thấy thì phải đi qua
Apify. Giá đo thật: **~$0,0042 mỗi truy vấn** — một lead tốn 2 truy vấn (SĐT + email), lô 113 lead hết
**$0,88**. Luôn chạy `node 25-google-vn.mjs --dry` trước để xem số truy vấn và ước phí, và `--rescore`
để chấm lại kết quả cũ **miễn phí**. Cần `APIFY_TOKEN` trong biến môi trường hoặc `.secrets/apify.env`.
