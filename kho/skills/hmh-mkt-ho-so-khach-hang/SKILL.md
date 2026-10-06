---
name: hmh-mkt-ho-so-khach-hang
description: >
  Dựng TRỌN BỘ HỒ SƠ KHÁCH HÀNG (9 tệp) từ MỘT phiếu đã điền + MỘT thư mục tài liệu, chạy một lèo
  không dừng hỏi lại. Chủ doanh nghiệp tải phiếu ở trienkhaihskh.hoangminhhoa.com, điền 19 ô, thả
  file vào `raw/hskh/nguyen-lieu/`, gọi skill một lần là có: tóm tắt điều hành · hồ sơ chính 6 phần ·
  thẻ chân dung 1 trang · bản đồ nỗi đau/sung sướng có chấm điểm từng biến · ngân hàng câu chốt cho
  sale · ngân hàng hook + 10 cụm nội dung cho content · map offer theo Value Proposition Canvas ·
  bảng khoảng trống · mục lục nguồn. Có engine kiểm kê deterministic (zero-dep) chấm mức A/B/C/D và
  đánh MÃ BẰNG CHỨNG (FB-01, Q-07…) để mọi luận điểm truy vết được — không có mã thì bị gạch.
  Dùng khi người dùng muốn: dựng hồ sơ khách hàng / chân dung khách hàng chuyên sâu cho thương hiệu
  mình hoặc cho khách, biến đống feedback-inbox-bảng giá thành tài liệu dùng được cho content và
  sale, hoặc triển khai bộ hồ sơ khách hàng cho học viên/khách hàng dịch vụ.
  Kích hoạt khi có từ: hồ sơ khách hàng, hskh, dựng hồ sơ khách, phiếu hồ sơ khách hàng, chân dung
  khách hàng chuyên sâu, buyer persona đầy đủ, tài liệu khách hàng cho sale, ngân hàng câu chốt,
  ngân hàng hook, bản đồ nỗi đau, kiểm kê nguyên liệu khách hàng, mã bằng chứng, trienkhaihskh.
---

# Skill: Hồ sơ khách hàng — từ phiếu tới trọn bộ 9 tệp

Nhận **một phiếu đã điền** + **một thư mục tài liệu**, trả về **9 tệp** dùng được ngay cho chủ
doanh nghiệp, đội sale và đội content. Chạy **một lèo, không dừng hỏi lại** — vì mọi thứ máy cần
hỏi đã nằm trong phiếu.

Thứ skill này canh giữ không phải độ dài, mà là **độ thật**: mọi luận điểm phải neo được vào một
mã bằng chứng có thật trong thư mục nguyên liệu, cái nào không neo được thì bị gạch ở vòng 5.

## Triết lý gốc (grounded — không bịa)

Nén từ **QUY TRÌNH TẠO HỒ SƠ KHÁCH HÀNG CHUẨN ĐÉT v2** — bản biên soạn 2026-08-01 dựa trên bài
giảng gốc 5 bước và mổ xẻ một hồ sơ mẫu 112 trang có thật:
`output/2026-08-01-phan-tich-quy-trinh-ho-so-khach-hang-chuan-det/`.

Bốn khung lý thuyết được dùng đúng chỗ, không dùng làm trang trí:

| Khung | Của ai | Dùng ở đâu |
|---|---|---|
| **Value Equation** — giá trị = (khát khao × khả thi) / (độ trễ × công sức) | Alex Hormozi | Chấm điểm bản đồ sung sướng (vòng 3) |
| **Value Proposition Canvas** — Pains↔Relievers, Gains↔Creators | Alexander Osterwalder | Fit check offer (vòng 4) |
| **Buyer persona 7 tiêu chí + "nhân khẩu học chỉ là vỏ"** | Adele Revella / HubSpot | Chân dung tổng & phụ (vòng 3) |
| **Mass desire — khát khao phải CÓ THẬT, copy chỉ kênh lại** | Eugene Schwartz | Luật grounding, xuyên suốt |

Và một nguyên tắc thống kê quan trọng hơn cả bốn khung trên: **thiên lệch sống sót**. Mọi hồ sơ
khách hàng đều chỉ nghe tiếng người **đã mua** — mà người đã mua thì đương nhiên nói tốt. Vì vậy
loại nguyên liệu số 3 (*ca hỏi kỹ nhưng KHÔNG chốt + lý do thật*) được ép thành hạng mục riêng,
dù nó là thứ hiếm ai chịu ghi.

## Khi nào dùng / KHÔNG dùng

- **DÙNG:** cần trọn bộ tài liệu khách hàng có bằng chứng, làm cho mình hoặc làm dịch vụ cho khách;
  đã có sẵn feedback/inbox/bảng giá mà chưa biến thành tài liệu dùng được.
- **KHÔNG dùng:**
  - Chỉ cần chân dung + bản đồ đau/sướng nhanh, không cần bộ tài liệu → [[hmh-mkt-chan-dung-dau-suong]].
  - Cần *định giá / thiết kế offer* → [[hmh-sale-dinh-gia-offer]] (ăn đầu ra `06` của skill này).
  - Cần *viết content* → [[hmh-mkt-content-30-ngay]] (ăn đầu ra `05`).
  - Cần *nghiên cứu thị trường/đối thủ từ đầu* → [[hmh-mkt-research-thi-truong]].

## Tiền điều kiện

- **Node** (chạy engine kiểm kê). PATH máy này: `export PATH="$PATH:/c/Program Files/nodejs"`.
  Engine **zero-dep** — không cần cài gói.
- **Một thư mục nguyên liệu** theo đúng khuôn dưới. Không có thì tạo rồi bảo người dùng thả file vào.

**Thư mục này do SKILL tự dựng, không phải việc của người dùng** (xem bước 1):

```
raw/hskh/                        ← làm cho nhiều khách thì raw/hskh/<ten-khach>/
├── PHIEU-HSKH.md                ← skill ghi ra từ khối phiếu người dùng dán vào
└── nguyen-lieu/                 ← skill chép vào từ ảnh kéo thả / thư mục người dùng chỉ
    ├── feedback-*.md/jpg/pdf
    ├── cauhoi-*.md/txt
    ├── khongchot-*.md
    ├── banggia-*.md/xlsx
    ├── doithu-*.md/png
    └── dinhvi-*.md/pdf
```

> Đặt tên tệp có từ khoá (`feedback-`, `cauhoi-`, `khongchot-`, `banggia-`, `doithu-`, `dinhvi-`)
> thì engine tự gán mã — nên **khi chính skill chép tệp vào thì phải đặt đúng tiền tố này**.
> Tệp người dùng bỏ sẵn mà tên không có từ khoá cũng chạy: máy đọc nội dung rồi tự phân loại.

## Quy trình thực thi

**Đọc [references/quy-trinh-5-vong.md](references/quy-trinh-5-vong.md) trước khi viết chữ nào** —
đó là SOP đầy đủ. Tóm tắt để biết đường đi:

1. **Nhận nguyên liệu — người dùng KHÔNG phải tạo thư mục hay di chuyển tệp.** Ba đường vào, xử
   lý xong là quy về một chỗ `raw/hskh/`:

   | Người dùng đưa kiểu gì | Việc của skill |
   |---|---|
   | **Phiếu dán thẳng trong lệnh** (khối `===== PHIẾU CỦA TÔI =====`) | `mkdir -p raw/hskh` rồi ghi **nguyên khối** thành `raw/hskh/PHIEU-HSKH.md`, **giữ nguyên mọi dòng `<!-- qN -->`** — đừng sửa chữ, đừng "viết lại cho hay" |
   | **Ảnh kéo thả vào cửa sổ chat** | Đọc ảnh, **chép nguyên văn** chữ trong đó ra `raw/hskh/nguyen-lieu/<loại>-NN.md` (`feedback` · `cauhoi` · `khongchot` · `banggia` · `doithu` · `dinhvi`). Giữ đúng chữ khách dùng, kể cả sai chính tả. Mỗi tệp ghi đầu dòng: nguồn là ảnh nào, ngày nào |
   | **"Tệp của tôi ở thư mục X"** | Tự vào đó lấy, tự chép vào `raw/hskh/nguyen-lieu/`. **Không bắt người dùng tự chuyển tệp.** Chép, đừng di chuyển — nguồn gốc phải còn nguyên chỗ cũ |
   | Đã có sẵn `raw/hskh/` | Dùng luôn, không hỏi lại |

   Rồi đọc `PHIEU-HSKH.md` lấy tên thương hiệu (câu 1) → đặt tên thư mục kết quả
   `output/YYYY-MM-DD-hskh-<thuong-hieu-khong-dau>/`. Không có phiếu lẫn tài liệu → **vẫn chạy**,
   nhưng nói thẳng ngay từ đầu rằng hồ sơ sẽ ở mức D.

   > **Ảnh chỉ sống trong cuộc trò chuyện.** Chép nội dung ảnh ra tệp văn bản **ngay ở bước này**,
   > trước khi làm bất cứ việc gì khác — bỏ qua thì mã bằng chứng trỏ vào hư không, và sang phiên
   > sau không ai truy vết lại được.

2. **VÒNG 1 — kiểm kê (chạy script, đừng làm tay):**
   ```bash
   export PATH="$PATH:/c/Program Files/nodejs"
   node .claude/skills/hmh-mkt-ho-so-khach-hang/scripts/kiem-ke.mjs raw/hskh \
     --md "output/<ngày>-hskh-<thương-hiệu>/KIEM-KE.md"
   ```
   Nhận: mức **A/B/C/D** + bảng 6 loại + **bảng mã bằng chứng**. Rồi **đọc nội dung thật** từng tệp
   (ảnh thì xem ảnh) để biết số *mẩu* — script chỉ đếm số *tệp*. Tệp nào script để mã `—` thì tự gán.

3. **VÒNG 2 — nền:** bạn-là-ai (từ phiếu) · blueprint 6 phần · phân tích đối thủ (ánh sáng/bóng tối).

4. **VÒNG 3 — lõi:** viết `01` `02` `03`. Hai công thức chấm điểm bắt buộc **hiện đủ từng biến**.

5. **VÒNG 4 — công cụ bán:** viết `04` `05` `06` (ngân hàng câu chốt · hook + 10 cụm nội dung ·
   fit check Value Proposition Canvas — phải tìm ra ít nhất 1 lỗ hổng ở mỗi câu).

6. **VÒNG 5 — tự kiểm:** viết `07` `NGUON` + phần đầu `00`. **Truy vết mọi con số/tên/trích dẫn về
   mã bằng chứng; cái nào không chỉ được nguồn thì GẠCH ĐI** và ghi vào mục "đã bị gạch".

7. **Đóng gói:** đủ 9 tệp theo [references/khuon-dau-ra.md](references/khuon-dau-ra.md), cập nhật
   `index.md` + ghi `log.md`.

8. **Báo cáo về cho người dùng** đúng 4 dòng: mức A/B/C/D · chấm bao nhiêu/12 theo checklist nghiệm
   thu · ba việc cần bổ sung ở vòng sau · đường dẫn thư mục kết quả.

## Tham chiếu scripts / references / assets

- `scripts/kiem-ke.mjs` — engine kiểm kê zero-dep: quét thư mục, đọc phiếu (`<!-- qN -->`), đếm 6
  loại, chấm A/B/C/D, đánh mã bằng chứng ổn định. `--md <file>` ghi ra tệp, `--json` trả dữ liệu thô.
  Export `kiemKe / docPhieu / renderMarkdown`.
- `references/quy-trinh-5-vong.md` — SOP đầy đủ: 5 vòng, 2 công thức chấm điểm, luật grounding,
  bảng ký hiệu, 6 lỗi thường gặp, checklist nghiệm thu 12 điểm.
- `references/khuon-dau-ra.md` — đặc tả từng tệp trong bộ 9 tệp: ai đọc, gồm mục gì, dài cỡ nào.
- `assets/PHIEU-HSKH.md` — **phiếu mẫu gốc**. Trang `trienkhaihskh.hoangminhhoa.com` sinh ra đúng
  định dạng này; sửa phiếu thì phải sửa cả hai chỗ cho khớp (marker `<!-- qN -->` là hợp đồng giữa
  trang và engine).

## Lưu ý / gotcha

- **Chạy một lèo KHÔNG có nghĩa là viết cho đủ.** Thiếu nguyên liệu thì vẫn viết, nhưng phải mở
  chương bằng dòng `> ⚠️ Chương này dựng chủ yếu bằng suy luận vì thiếu …`. Cổng chặn cũ biến thành
  **nhãn cảnh báo**, không biến mất.
- **Mức D (thiếu giọng khách) vẫn ra hồ sơ**, nhưng `00` phải mở bằng cảnh báo đỏ và `07` phải dài
  hơn phần nội dung. Đây là điểm khác biệt so với mọi prompt "tạo hồ sơ khách hàng" thông thường —
  vốn luôn cho ra 100 trang bất kể có dữ liệu hay không.
- **AI không đọc được Fanpage/group Facebook** (tường đăng nhập). Có link mà không có ảnh chụp
  trong `nguyen-lieu/` → ghi ⚠️ "chưa có dữ liệu", **không mô tả như đã xem**.
- **Đưa file mẫu của thương hiệu khác thì chỉ rút blueprint**, tuyệt đối không mang theo thuật ngữ,
  ví dụ, tên sản phẩm, con số của ngành gốc.
- **`Ta-giải-được ≤ 3`** → nỗi đau ta không giải nổi; đừng dựng content/offer trụ quanh nó.
- **Value Equation là phép chia** — giảm mẫu số (độ trễ, công sức) mạnh hơn tăng tử số. Đây là hàm ý
  bán hàng quan trọng nhất của cả hồ sơ.
- **Giữ lại ít nhất một lời chê** trong hồ sơ. Đó là chứng chỉ trung thực rẻ nhất mua được.
- Đường dẫn dự án có dấu cách và tiếng Việt — **luôn bọc path trong nháy kép** khi chạy shell.

## Output (bám CLAUDE.md)

- Mỗi lần chạy = một thư mục `output/YYYY-MM-DD-hskh-<thuong-hieu>/` chứa **9 tệp** + `KIEM-KE.md`.
- Cập nhật `index.md` (mục Output) và ghi `log.md`:
  `## [YYYY-MM-DD] query | Hồ sơ khách hàng <thương hiệu> — mức <A/B/C/D>`
- Chạy lại cho cùng thương hiệu → **cập nhật thư mục cũ** (giữ `created`, sửa `updated`), đừng đẻ trùng.
- Tri thức dùng lại lâu dài (ví dụ chân dung của chính thương hiệu mình) → nâng lên `wiki/` và liên kết chéo.
