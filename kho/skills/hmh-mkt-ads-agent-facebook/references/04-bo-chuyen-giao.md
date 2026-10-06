---
type: output
title: "Bộ chuyển giao ADS AGENT (self-serve) cho học viên"
created: 2026-06-25
updated: 2026-06-25
tags: [output, ads-agent, facebook-ads, larkbase, chuyen-giao, hoc-vien, self-serve]
sources: [ads-agent-base, yt-facebook-messenger-ads-2026-06-19]
---

# Bộ chuyển giao ADS AGENT — self-serve cho học viên

> **Câu hỏi gốc:** "Đóng gói toàn bộ Skill chạy Ads Agent để chuyển giao cho học viên."
> **Chốt:** gói **self-serve đầy đủ A–Z**, **bóc sạch secret** (mọi token/ID tham số hoá), để học viên tự
> dựng hệ thống quảng cáo tự động RIÊNG trên Base + tài khoản Meta của chính họ.

## 1. Gói này là gì
Bản đóng gói sạch của hệ thống **Ads Agent** (đầu não vận hành ở [[ads-agent-base]]) — chạy quảng cáo
Facebook tự động theo LÃI: học viên **điền 1 dòng Bảng 0** → hệ thống dựng chiến dịch Meta **PAUSED** → tự
canh tối ưu **3 nhịp/ngày** theo ngưỡng CPL/CPA/ROAS tính từ giá vốn, mọi quyết định nguy hiểm **duyệt qua Lark**.

Triết lý: **"Facebook là tài xế giỏi; Ads Agent là kế toán + gác cổng."** Không tự động hoá lại phần Meta đã
giỏi (Advantage+), chỉ tự động hoá phần Meta không làm: quyết-định-theo-lãi + cổng duyệt + giám sát + trí nhớ.
(Nguyên tắc: [[feedback-ads-agent-giu-don-gian]].)

## 2. Khác gì bản gốc của anh Hóa
| | Bản gốc (vận hành) | Bộ chuyển giao (gói này) |
|---|---|---|
| Token/Base/Meta | cứng trong script | **tham số hoá** vào `config.env` + `.secrets/` |
| table_id | cứng | **`do-config.mjs` tự dò** từ Base học viên |
| Bí mật | có | **bóc sạch** (placeholder), legacy đã strip |
| Hướng dẫn | memory rời | **A–Z + Quickstart + Checklist** trong gói |
| Script cũ | lẫn lộn | tách `_legacy-tham-khao/` (không hỗ trợ) |

## 3. Mục lục gói
```
2026-06-25-bo-chuyen-giao-ads-agent/
├── 2026-06-25-bo-chuyen-giao-ads-agent.md   # (file này) tổng quan + mục lục
├── HUONG-DAN-TRIEN-KHAI.md                  # ⭐ hướng dẫn A–Z (đọc đầu tiên)
├── QUICKSTART.md                            # 5 lệnh là chạy
├── CHECKLIST-BAN-GIAO.md                    # checklist cho người bàn giao + học viên
└── ads-engine/                              # toàn bộ công cụ (đã bóc secret)
    ├── config.env.example                   # cấu hình tham số hoá (copy -> config.env)
    ├── do-config.mjs                        # tự dò & điền table_id
    ├── .secrets/meta-ads.env.example        # mẫu token Meta
    ├── chay-tron-bo.sh                      # chạy trọn bộ Bước 2 -> Bước 3
    ├── buoc2-setup-lark.sh + buoc2-passA/B/C.py   # dựng giả chiến trên Lark
    ├── buoc3-len-facebook.sh + buoc3-extract.py + buoc3.mjs  # đẩy Meta PAUSED
    ├── engine.mjs + vong-doi-chieu.mjs      # toán ngưỡng (CVP) + cây quyết định
    ├── agent-3x.sh + agent-3x.mjs           # nhịp 3x/ngày tối ưu theo lãi
    ├── lib/meta.mjs + lib/duyet.mjs         # Meta API v24.0 (PAUSED) + thẻ duyệt Lark
    ├── vong-b-quyet-dinh.mjs, tong-chi-huy.mjs, hook-gen.mjs, dong-vong-doanh-thu.mjs
    ├── dang-ky-task.ps1                      # đăng ký Task 3x/ngày (Windows)
    ├── f-*.json, fields-chien-dich.json, presets-nganh.json   # schema bảng + preset ngành
    └── _legacy-tham-khao/                    # script luồng cũ — chỉ tham khảo
```
(44 file, ~257KB, không kèm media nặng.)

## 4. Lộ trình triển khai (tóm tắt 6 bước)
1. **Nhân bản Base mẫu** "Ads Agent" (10 bảng + form + công thức) về Lark của học viên.
2. Cài **lark-cli (login) + Node ≥18 + Python 3**; có **token Meta**.
3. `cp config.env.example config.env` → điền `B`, `DOMAIN`, `CHAT`, `ACT`.
4. `node do-config.mjs` → tự điền `T0..T9, T_NK`.
5. `cp .secrets/meta-ads.env.example .secrets/meta-ads.env` → điền token Meta.
6. Điền 1 dòng Bảng 0 → `bash chay-tron-bo.sh` → Meta PAUSED → BẬT trong Ads Manager. (Tự canh: `dang-ky-task.ps1`.)

Chi tiết: [HUONG-DAN-TRIEN-KHAI.md](HUONG-DAN-TRIEN-KHAI.md).

## 5. An toàn (bóc secret)
- Mọi token/ID của anh Hóa **không còn trong gói**: thay bằng biến `config.env` hoặc placeholder `<...>`.
- Script `_legacy-tham-khao/` đã strip token (base/chat/page/audience) → không chạy nguyên trạng, chỉ đọc tham khảo.
- Engine **PAUSED-by-default** — không tự tiêu tiền. `config.env` + `.secrets/` không được chia sẻ.

## 6. Liên kết
- Skill vận hành & chuyển giao: **`hmh-sale-ads-agent`** (mới tạo, theo khung [[skill-naming-convention]]).
- Nền hệ thống gốc: [[ads-agent-base]] · Chuẩn tên campaign: [[ads-naming-standard]] · Giữ đơn giản:
  [[feedback-ads-agent-giu-don-gian]] · Meta API: [[meta-ads-api-connect]] · lark-cli: [[lark-cli-setup]].
- Hợp vào dây chuyền GTM: [[binh-doan-ai-gtm]] (Tầng 2 Ads).
