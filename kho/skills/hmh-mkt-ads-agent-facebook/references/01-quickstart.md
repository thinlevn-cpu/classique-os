# QUICKSTART — Ads Agent (5 lệnh là chạy)

> Bản rút gọn. Người mới đọc `HUONG-DAN-TRIEN-KHAI.md`. Yêu cầu: lark-cli (đã login), Node ≥18, Python 3,
> token Meta, và đã **nhân bản Base mẫu "Ads Agent"** về Lark của bạn.

```bash
cd ads-engine

# 1) Cấu hình
cp config.env.example config.env
#    -> mở config.env, điền: B (base_token), DOMAIN, CHAT (oc_...), ACT (số tài khoản QC)

# 2) Tự dò mã bảng
node do-config.mjs

# 3) Token Facebook
cp .secrets/meta-ads.env.example .secrets/meta-ads.env
#    -> điền META_ACCESS_TOKEN và META_AD_ACCOUNT_ID=act_...

# 4) Kiểm tra (không tốn tiền)
node engine.mjs demo

# 5) Điền 1 dòng Bảng 0 (Trạng thái = "1. Chờ xử lý"), rồi:
bash chay-tron-bo.sh
#    -> dựng Lark + đẩy Facebook PAUSED. Vào Ads Manager BẬT để chạy.

# (tuỳ chọn) Tự canh tối ưu 3x/ngày — chạy PowerShell Admin:
#    powershell -ExecutionPolicy Bypass -File dang-ky-task.ps1
```

**An toàn:** engine luôn tạo chiến dịch **PAUSED**; bạn là người bật. Giữ kín `config.env` + `.secrets/`.
