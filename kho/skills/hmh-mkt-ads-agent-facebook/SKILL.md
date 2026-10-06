---
name: hmh-mkt-ads-agent-facebook
description: Chạy & tối ưu QUẢNG CÁO FACEBOOK (Meta Ads) TỰ ĐỘNG THEO LÃI — từ 1 dòng đầu bài trên Lark Base, engine tự tính 4 ngưỡng quyết định (ROAS hoà vốn, CPA hoà vốn, CPA/CPL/CPMC mục tiêu) từ giá bán P và chi phí biến đổi V, tự dựng Chiến dịch/Nhóm QC/Creative lên Meta ở trạng thái PAUSED (không bao giờ tự tiêu tiền), rồi canh 3 nhịp/ngày kéo số thật từ Meta Insights, chấm scorecard, chạy cây quyết định TẮT/SỬA/THEO DÕI/SCALE và gửi thẻ duyệt qua Lark trước khi thực thi. Có sub-agent sinh hook quảng cáo và cầu nối đơn hàng CRM → Meta Purchase (CAPI) để ra ROAS thật. Dùng khi người dùng muốn - set up hệ thống chạy ads tự động, tính ngưỡng CPA/CPL/ROAS mục tiêu từ giá vốn - biên lãi, biết nên tắt hay scale nhóm quảng cáo, đẩy chiến dịch lên Facebook từ Lark Base, dựng cổng duyệt quảng cáo qua Lark, cài Ads Agent cho học viên. Kích hoạt khi có từ - ads agent, chạy quảng cáo tự động, quảng cáo facebook theo lãi, meta ads api, ngưỡng CPA, CPL mục tiêu, ROAS hoà vốn, tắt hay scale nhóm quảng cáo, tối ưu ads 3 lần/ngày, đẩy chiến dịch lên facebook, lark base ads, cổng duyệt quảng cáo, CAPI purchase, hook quảng cáo facebook.
---

# Ads Agent — chạy quảng cáo Facebook theo LÃI

> **Triết lý gốc:** *"Meta lái xe, Agent làm kế toán + gác cổng."* Không tự động hoá lại
> phần Meta đã giỏi (tạo/target/Advantage+). Agent làm cái Meta KHÔNG làm: quyết định
> theo **lãi thật**, cổng duyệt qua Lark, giám sát nhiều chiến dịch, nhớ ngưỡng.

## LUẬT AN TOÀN (không được vi phạm)

1. **PAUSED-by-default.** Mọi chiến dịch engine đẩy lên Meta đều ở trạng thái `PAUSED`.
   Chỉ CON NGƯỜI bật trong Ads Manager. Không bao giờ tự `setStatus ACTIVE` giúp người dùng.
2. **Không tự tiêu tiền.** Mọi lệnh đổi ngân sách / tắt / scale phải đi qua **cổng duyệt
   Lark** (`tong-chi-huy.mjs scan` → thẻ → người duyệt → `apply --actually`).
   Chạy `apply` mà **thiếu** `--actually` = chỉ xem trước, an toàn. Mặc định luôn xem trước.
3. **Không đụng vào bí mật.** `config.env` và `.secrets/*.env` chứa token thật.
   Không đọc ra màn hình, không copy, không commit, không gửi đi đâu. Chỉ có `*.example`
   là được xem. Nếu người dùng lỡ dán token vào chat → nhắc họ **rotate** token.
4. **Không dùng token/Base/tài khoản QC của người khác.** Mỗi người một bộ cấu hình riêng.

## Khi nào chạy bước nào

| Người dùng nói | Làm gì |
|---|---|
| "cài Ads Agent", "setup lần đầu" | Chạy **Phần A — Cài đặt** bên dưới |
| "tính ngưỡng", "CPA/CPL mục tiêu là bao nhiêu" | `node engine.mjs thresholds <brief.json>` (không cần Lark, không cần token) |
| "cho tôi xem thử", "demo" | `node engine.mjs demo` · `node demo-da-nganh.mjs` · `node vong-doi-chieu.mjs --demo` |
| "đẩy chiến dịch lên Facebook" | `bash chay-tron-bo.sh` (ra PAUSED) |
| "nên tắt hay scale?" | `node vong-doi-chieu.mjs --targets b0.json --metrics m.json` |
| "chạy nhịp tối ưu" | `bash agent-3x.sh --simulate` trước, rồi `bash agent-3x.sh` |
| "viết hook quảng cáo" | `node hook-gen.mjs --product ... --chudich ... --n 5` |
| "ROAS thật từ đơn hàng" | `node dong-vong-doanh-thu.mjs --config f-urllib.json --orders crm.json` (DRY; `--send` mới bắn thật) |

Mọi lệnh chạy trong thư mục `ads-engine/` của skill này.

## Phần A — Cài đặt (1 lần cho mỗi người dùng)

Yêu cầu: `lark-cli` đã đăng nhập · Node ≥ 18 · Python 3 · token Meta Marketing API (v24.0,
quyền `ads_management` + `pages_*`) · đã **nhân bản Base mẫu "Ads Agent"** (10 bảng) về Lark của họ.

```bash
cd ads-engine
cp config.env.example config.env
# → điền B (base_token lấy từ URL Base), DOMAIN, CHAT (oc_...), ACT (số tài khoản QC, không có "act_")
node do-config.mjs          # tự dò T0..T9, T_NK — báo "🎉 Đủ hết" là xong
cp .secrets/meta-ads.env.example .secrets/meta-ads.env
# → điền META_ACCESS_TOKEN, META_AD_ACCOUNT_ID=act_...
node engine.mjs demo        # nghiệm thu, không tốn tiền
```

Nếu thiếu bất kỳ thứ gì ở trên → **hỏi người dùng, đừng đoán**. Không tự tạo token,
không tự tạo Base, không tự đăng nhập hộ.

Checklist bàn giao đầy đủ: `references/03-checklist-ban-giao.md`.
Hướng dẫn A–Z cho người mới: `references/02-huong-dan-trien-khai.md`.

## Phần B — Lõi tính ngưỡng (`engine.mjs`)

Công thức **phổ quát cho mọi ngành** — chỉ đổi input, không đổi code:

```
M        = P − V                      lãi gộp / đơn
m        = M / P                      biên lãi gộp
beROAS   = 1 / m                      ROAS hoà vốn
beCPA    = M                          chi tối đa/đơn để hoà vốn
targetCPA  = M × (1 − loi_nhuan_muon_giu)
targetCPMC = targetCPA × ty_le_chat_to_don    giá 1 hội thoại tối đa
targetCPL  = targetCPA × ty_le_lead_to_don    giá 1 lead tối đa
```

`brief.json` tối thiểu:

```json
{
  "gia_P": 5000000,
  "chi_phi_bien_doi_V": 1000000,
  "loi_nhuan_muon_giu": 0.5,
  "ty_le_lead_to_don": 0.1,
  "ty_le_chat_to_don": 0.2,
  "ngan_sach_ngay": 500000,
  "tran_chi_tieu_cung": 5000000,
  "guardrail": { "min_results": 50, "min_days": 3, "tang_toi_da_moi_lan": 0.2 }
}
```

`presets-nganh.json` + `demo-da-nganh.mjs` có ví dụ 5 ngành (đào tạo, spa, BĐS, nha khoa…)
— dùng để giải thích cho người dùng vì sao cùng engine mà ngưỡng khác nhau.

**Guardrail:** chưa đủ `min_results` (mặc định 50) hoặc `min_days` (mặc định 3) thì
KHÔNG phán tắt/scale — trả về "⚪ HỌC / chưa đủ dữ liệu". Scale tối đa +20%/lần.

## Phần C — Vòng đối chiếu & cổng duyệt

- `vong-doi-chieu.mjs` — bộ não: đọc ngưỡng (Bảng 0) + số thật → ra một trong
  🛑 DỪNG / 🔴 TẮT GẤP / 🟠 SỬA / 🟡 THEO DÕI / 🟢 SCALE / 🟢 DUY TRÌ / ⚪ HỌC, **kèm lý do bằng số**.
- `tong-chi-huy.mjs` — orchestrator khép vòng:
  `scan` (đọc Meta → nghĩ → in thẻ duyệt + ghi ledger `pending-decisions.json`)
  → người duyệt trả lời trên Lark → `apply --reply "<text>"` (xem trước)
  → `apply --reply "<text>" --actually` (thực thi thật lên Meta + ghi Bảng 5).
- `agent-3x.sh` — nhịp 3 lần/ngày, quét mọi campaign đang chạy, im lặng nếu không có gì
  (không spam). Chạy `--simulate` trước khi chạy thật.
- Hẹn giờ: `dang-ky-task.ps1` là **Windows Scheduled Task**. Trên macOS/Linux dùng
  `cron` hoặc `launchd` gọi `bash agent-3x.sh` 3 lần/ngày.

## Lưu ý môi trường (macOS)

Các file `.sh` được viết trên Windows/Git-Bash: có dòng
`export PATH="$PATH:/c/Program Files/nodejs:..."` — trên macOS dòng này vô hại (chỉ thêm
path không tồn tại), không cần sửa. Nhưng nếu `lark-cli` / `node` không nằm trong PATH của
shell không-tương-tác (cron), phải thêm PATH thật vào đầu script.

## Bản đồ file

- `ads-engine/engine.mjs` — lõi tính ngưỡng + cây quyết định (zero-dep, dùng độc lập được)
- `ads-engine/vong-doi-chieu.mjs` · `vong-b-quyet-dinh.mjs` — vòng đối chiếu thực vs mục tiêu
- `ads-engine/tong-chi-huy.mjs` · `lib/duyet.mjs` — thẻ duyệt Lark + ledger
- `ads-engine/lib/meta.mjs` — gọi Meta API (insights, setAdSetBudget, setStatus, sendPurchase)
- `ads-engine/buoc2-*` — dựng dữ liệu trên Lark Base · `buoc3-*` — đẩy lên Facebook PAUSED
- `ads-engine/chay-tron-bo.sh` — gói bước 2 + bước 3 thành 1 lệnh
- `ads-engine/f-*.json`, `fields-chien-dich.json` — schema các bảng Lark Base
- `ads-engine/hook-gen.mjs` — sinh hook quảng cáo (nối với skill `hmh-mkt-hook-video`)
- `ads-engine/dong-vong-doanh-thu.mjs` — CRM → Meta CAPI Purchase → ROAS thật
- `ads-engine/_legacy-tham-khao/` — bản cũ, chỉ để tham khảo, **đừng chạy**
- `references/` — README gốc, quickstart, hướng dẫn A–Z, checklist bàn giao, bộ chuyển giao

## Skill liên quan

Đầu bài (giá P, biên lãi, tỷ lệ chuyển đổi) nên lấy từ `hmh-sale-dinh-gia-offer` và
`hmh-sale-ke-hoach-loi-nhuan`. Nội dung/hook quảng cáo lấy từ `hmh-mkt-hook-video`
và `hmh-mkt-chan-dung-dau-suong`. Trang đích lấy từ `hmh-mkt-leadpage`.

*Nguồn: github.com/minhhoasqtt-prog/ads-agent-hoc-vien*
