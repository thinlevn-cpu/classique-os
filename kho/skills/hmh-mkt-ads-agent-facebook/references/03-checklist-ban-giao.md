# CHECKLIST BÀN GIAO ADS AGENT

## A. Người bàn giao (anh Hóa / mentor) chuẩn bị
- [ ] Tạo **link sao chép Base mẫu "Ads Agent"** (10 bảng + form + công thức ngưỡng) cho học viên nhân bản.
- [ ] Gửi học viên **cả thư mục `2026-06-25-bo-chuyen-giao-ads-agent/`** (đã bóc sạch token).
- [ ] Nhắc học viên: KHÔNG dùng token/Base/tài khoản quảng cáo của anh Hóa — phải dùng của chính họ.
- [ ] (Tuỳ chọn) demo 1 lần luồng `chay-tron-bo.sh` để học viên thấy chiến dịch PAUSED hiện trên Ads Manager.

## B. Học viên cài đặt (1 lần)
- [ ] Cài & đăng nhập **lark-cli** (`lark-cli --version` chạy được).
- [ ] **Node ≥ 18** (`node -v`) và **Python 3** (`python --version`).
- [ ] Có **tài khoản quảng cáo Facebook** + **token System User** (quyền ads_management + pages_*).
- [ ] **Nhân bản Base mẫu** về Lark của mình → lấy `BASE_TOKEN` từ URL.

## C. Cấu hình (trong `ads-engine/`)
- [ ] `cp config.env.example config.env` → điền `B`, `DOMAIN`, `CHAT`, `ACT`.
- [ ] `node do-config.mjs` → báo "🎉 Đủ hết" (T0..T9, T_NK đã điền).
- [ ] `cp .secrets/meta-ads.env.example .secrets/meta-ads.env` → điền token + `act_…`.
- [ ] `config.env` và `.secrets/` **không** bị chia sẻ ra ngoài.

## D. Nghiệm thu (chạy thật)
- [ ] `node engine.mjs demo` in số gọn gàng.
- [ ] `node vong-doi-chieu.mjs --demo` in cây quyết định.
- [ ] Điền 1 dòng **Bảng 0** (Trạng thái "1. Chờ xử lý") + đính ảnh/video + link.
- [ ] `bash chay-tron-bo.sh` → Base có Chiến dịch/Nhóm QC/Content; Ads Manager có campaign **PAUSED**;
      Base ghi `campaign_id`; (nếu có CHAT) nhận thẻ Lark.
- [ ] BẬT chiến dịch trong Ads Manager → quảng cáo phân phối.

## E. Tự động hoá (tuỳ chọn)
- [ ] Sửa đường dẫn trong `dang-ky-task.ps1` → đăng ký Task (PowerShell Admin).
- [ ] `bash agent-3x.sh --simulate` chạy thử OK.
- [ ] Hiểu **ngưỡng lãi**: P, V, biên, tỷ lệ Lead→Đơn/Chat→Đơn ở Bảng 0 → Base tự tính CPL/CPA/ROAS mục tiêu.

## F. Hiểu nguyên tắc
- [ ] Engine **luôn PAUSED**, học viên là người bật.
- [ ] Quyết định TẮT/TĂNG/ĐỔI đi qua **cổng duyệt Lark**.
- [ ] "Facebook lái xe, Ads Agent làm kế toán + gác cổng" — không tự động hoá lại phần Facebook đã giỏi.
