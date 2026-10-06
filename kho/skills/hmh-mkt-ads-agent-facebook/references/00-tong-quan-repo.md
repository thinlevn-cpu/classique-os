# Ads Agent — Chạy quảng cáo Facebook tự động theo LÃI

Hệ thống nhận **1 dòng đầu bài** trên Lark Base rồi tự dựng chiến dịch Meta (luôn ở
trạng thái **PAUSED** — bạn là người bật), và tự canh tối ưu 3 nhịp/ngày theo mục tiêu
CPA/CPL/ROAS tính từ giá vốn – biên lãi.

> **Meta lái xe, Agent làm kế toán + gác cổng.** Agent không thay Meta làm phần Meta giỏi
> (tạo/target/Advantage+); nó làm cái Meta không làm: quyết định theo lãi, cổng duyệt qua
> Lark, giám sát nhiều chiến dịch, nhớ ngưỡng.

## Bắt đầu
- **Cài nhanh 5 lệnh:** đọc [QUICKSTART.md](QUICKSTART.md)
- **Hướng dẫn A–Z (người mới):** đọc [HUONG-DAN-TRIEN-KHAI.md](HUONG-DAN-TRIEN-KHAI.md)
- **Checklist bàn giao:** đọc [CHECKLIST-BAN-GIAO.md](CHECKLIST-BAN-GIAO.md)

## Cách nhân bản cho mỗi học viên (mô hình clone)
Mỗi học viên dùng **chung code này**, chỉ khác **cấu hình + token riêng của họ**:

1. `git clone` repo về máy → `cd ads-engine`
2. Nhân bản Base mẫu **"Ads Agent"** (10 bảng) về Lark của họ.
3. `cp config.env.example config.env` → điền `B` (base_token), `DOMAIN`, `CHAT` (oc_...), `ACT` (số tài khoản QC).
4. `node do-config.mjs` → tự dò mã bảng, ghi `T0..T9` vào `config.env`.
5. `cp .secrets/meta-ads.env.example .secrets/meta-ads.env` → điền token Meta của họ.
6. Điền 1 dòng Bảng 0 → `bash chay-tron-bo.sh` → Meta PAUSED → vào Ads Manager BẬT.

## Yêu cầu môi trường
- `lark-cli` đã login (tài khoản Lark của học viên)
- Node ≥ 18, Python 3
- Token Meta Marketing API (`act_...`), API v24.0

## An toàn & bí mật
- Engine **PAUSED-by-default**: không bao giờ tự tiêu tiền.
- **KHÔNG commit** `config.env` và `.secrets/*.env` (đã chặn trong `.gitignore`) — đó là bí
  mật riêng từng học viên. Repo chỉ chứa `*.example`.
- Nếu từng lộ token, hãy **rotate** (tạo lại) token sau khi dựng xong.

## Ghi chú kỹ thuật
Hệ chạy **trên máy học viên** (cần `lark-cli` login + token Meta riêng + có cổng duyệt qua
Lark), **không** chạy headless qua GitHub Actions/HTTP. Đây là repo để **clone về chạy**,
không phải HTTP endpoint.
