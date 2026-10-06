# Nguồn ảnh cho bài SEO classique.vn (quy trình tự động, KHÔNG hỏi chủ nhân chụp thêm)

> Luật 15/09/2026: bài nào cũng phải tự lo đủ ảnh từ kho có sẵn. Chỉ báo lại khi kho thật sự không có và ảnh đó không được phép tạo bằng AI.

## Thứ tự nguồn (dừng ở nguồn đầu tiên đủ ảnh)

| # | Nguồn | Dùng cho | Cách lấy |
|---|---|---|---|
| 1 | **Google Drive "Ảnh hàng Classique"** `1ZGNxvBUCQok5YAOE-WXkvckDAJ9v7WPB` (mở công khai qua link) | Ảnh sản phẩm thật: hộp, sổ cert, tua vít, ốc vít cận, bản lề, cầm găng, tổng thể | Liệt kê: `https://drive.google.com/embeddedfolderview?id=<folder_id>#list` (regex `file/d/<id>` + `flip-entry-title`). Tải: `https://drive.google.com/uc?export=download&id=<file_id>`. HEIC → JPG bằng `sips -s format jpeg --resampleWidth 1600`. |
| 2 | Video của mình trong Drive (thư mục "Video hướng dẫn" `12OTCIQfgPEWsgXp5zomv7NCMcopekjIU`) | Khung hình thao tác (mở vòng, đo size) | ffmpeg `fps=1/2` cắt khung; lưu ý một số mục là thư mục con, không phải file. |
| 3 | Ảnh giấy phép mở: Openverse API `https://api.openverse.org/v1/images/?q=&license=by,cc0,pdm`, Wikimedia Commons | Ảnh dụng cụ chung (kính lúp, cân) | Ghi caption tác giả + giấy phép. Thực tế: gần như không có ảnh hàng hiệu dùng được. |
| 4 | **Genful AI** (`output/2026-09-14-ket-noi-genful-tao-anh/genful-tao-anh.mjs`, model `google_image_gen_banana_2`, `--du-an classique.vn`, ~400 credit/ảnh 1k) | Ảnh MINH HOẠ không khí, dụng cụ, bàn thẩm định | Prompt không logo, không chữ, không tên hãng. Caption bắt buộc "Ảnh minh hoạ". |

## Ngoại lệ bài TIN TỨC (luật 17/09/2026, thắng mục Cấm bên dưới)
- **Bài TIN TỨC (chuỗi E) có sản phẩm mới mà kho chưa có ảnh** (luật 17/09/2026): ĐƯỢC lấy ảnh từ trang khác (ưu tiên ảnh hãng cấp cho báo: bài báo thời trang, trang hãng). Chỉ lấy ảnh **KHÔNG có dấu mộc/watermark** của bên khác (mở ảnh ra xem trước; không xoá mộc người khác). Tải về `<thư mục bài>/nguon-web/`, ảnh vuông thì độn nền cùng màu cho đủ 4:3 để không cắt mất sản phẩm, rồi dựng bằng `anh-4x3.py` với `"nguon": "<Hãng>"` trong từng mục spec → **KHÔNG đóng mộc The Classique lên ảnh bên ngoài** (chốt lại 17/09/2026: đóng logo mình lên ảnh hãng là nhận vơ + nặng thêm lỗi bản quyền). **Caption BẮT BUỘC ghi nguồn ở cuối**: `Nguồn ảnh: <Hãng>, qua <a href="<link bài gốc>" target="_blank" rel="noopener"><Tên trang></a>.` Ảnh thật của bên em vẫn ghi "Ảnh thật tại The Classique". Bài mẫu: `output/2026-09-17-viet-chuoi-bai-seo/van-cleef-alhambra-men-hong/` (spec-tin-tuc.json).
- Chỉ áp cho ảnh **sản phẩm mới kho chưa có** trong bài tin tức. Bài thẩm định/so sánh thật giả vẫn chỉ dùng ảnh thật của bên em.
- Nguồn tốt đã thử: Tatler Asia đăng đủ ảnh từng món hãng cấp (URL `cdn.tatlerasia.com/..._cover_1600x1600.jpg`, lọc bằng curl + grep đuôi ảnh). Bỏ ảnh có chữ ký/mộc (ví dụ ảnh RUSSH có chữ ký hoạ sĩ).

## Rủi ro ảnh nguồn ngoài (ghi 17/09/2026, đọc trước khi dùng)
- **Ghi nguồn KHÔNG thay cho quyền sử dụng.** Ảnh hãng/báo vẫn thuộc bản quyền của họ; web có bán hàng thì khó viện dẫn "trích dẫn đưa tin". Rủi ro thực tế: hãng hoặc toà soạn gửi yêu cầu gỡ (DMCA tới Google/host), hiếm khi kiện với site nhỏ, nhưng có thể.
- Giảm rủi ro: chỉ bài TIN TỨC; ưu tiên ảnh **press kit/newsroom của hãng**; 3 đến 6 ảnh, không lấy cả bộ; không cắt bỏ chữ ký/watermark của họ; **không đóng mộc mình**; không dùng lại ảnh đó cho bài Facebook quảng cáo, ads, trang sản phẩm, ảnh đại diện Page; lưu link gốc trong spec/caption để gỡ nhanh khi có yêu cầu.
- **Ảnh chiến dịch có người mẫu** rủi ro cao hơn (thêm quyền hình ảnh của người mẫu, nhiếp ảnh gia): tránh, chỉ dùng ảnh sản phẩm trên nền trơn.
- Có yêu cầu gỡ: gỡ ngay trong 24 giờ, thay ảnh thật hoặc để không ảnh.

## Cấm
- Không tạo AI giả chữ khắc, serial, hallmark, mặt sản phẩm thật (đây là bằng chứng thẩm định, làm giả là lừa người đọc).
- Không lấy ảnh từ web đối thủ (shop bán đồ cũ khác). Ảnh báo/hãng chỉ dùng theo ngoại lệ bài tin tức ở trên, có ghi nguồn.
- Không dùng ảnh mẫu của hãng thay ảnh thật (trái cam kết "ảnh thật đúng món").

## Cấu trúc Drive (quét 15/09/2026)
Gốc → Hãng: BVL, Cartier, Chanel, Chaumet, Chopard, Dior, Hermes, LV, Tiffany, VCA, Video hướng dẫn, VIDEO KÍNH.
Cartier `1-2v4kmOQPfqpdWQ_0w3HTm-JpKBAwH8N` → Bông tai, Dây chuyền, Nhẫn, Vòng `1tALR08iOwsBJotXbWdmbnT6WIi3045T2`.
Vòng có 27 món, 12 thư mục Love (dày/mỏng/đính kim/7 màu, size 15–19), mỗi thư mục 4–24 ảnh. Chỉ số chi tiết: `output/2026-09-15-research-seo-cartier-love-that-gia/anh/drive-index.json`.

## Những gì kho KHÔNG có (tính đến 15/09/2026)
Macro mặt trong khắc chữ/serial, ảnh cân trọng lượng, ảnh soi kính lúp. Bài dùng ảnh mặt trong nghiêng (thấy vị trí khắc) + ảnh minh hoạ AI cho cân và kính lúp. Khi cửa hàng chụp bổ sung thì thay.

## Đặt tên file & alt
`<slug>-<n>-<mo-ta-khong-dau>.jpg`, tối đa 1600px, JPG 85–90. Alt chứa từ khoá chính + mô tả thật của ảnh.

## Đính vào Base
```
lark-cli base +record-upload-attachment --base-token <SEO_BASE_TOKEN> --table-id <SEO_TABLE_ID> \
  --record-id <rec> --field-id "File ảnh" --file a.jpg --file b.jpg --as user
```

## Lưu ý theme classique.vn (hostinger-ai-theme), ghi 15/09/2026
- Theme TỰ hiển thị featured image trên đầu bài. Publisher lấy ảnh #1 làm featured, nên trong thân bài KHÔNG đặt `__IMG1__` nữa (bắt đầu từ `__IMG2__`) để khỏi lặp ảnh. Bài đầu tiên (post 1128) đã sửa tay.
- Theme văng TypeError nếu gán `featured_media` ngay lúc tạo bài → publisher đã đổi sang tạo bài rồi PATCH featured (đã vá trong `publish-wordpress.mjs`).
- Site dùng **Yoast SEO** (cài qua REST 15/09/2026; Rank Math kích hoạt được nhưng không nạp code trên WP 7.1 nên đã gỡ). Publisher đặt meta title/description/focus keyword qua Royal MCP `wp_update_seo_meta`, và tự tách đoạn >90 âm tiết, ảnh xuất WebP (lib-image, `IMAGE_FORMAT=jpg` để tắt).

## Luật bố cục ảnh (chủ nhân chốt 15/09/2026 sau bài đầu tiên)
- **Cùng một khung:** mọi ảnh thân bài và ảnh đại diện cắt về 4:3, 1600x1200 bằng `scripts/anh-4x3.py <spec.json> <out_dir>` (spec: src, out, cx, cy tâm cắt). Không trộn ảnh dọc/ngang.
- **Đúng mục:** ảnh phải cho thấy đúng thứ mục đó nói. Không có ảnh đúng thì mục đó không có ảnh. Không lấp bằng ảnh "gần giống".
- **Chỉ ảnh thật** cho bài thẩm định / so sánh thật giả. Không dùng ảnh AI (Genful) trong loại bài này. Ảnh AI chỉ dành cho bài kể chuyện, không khí, và phải ghi "Ảnh minh hoạ".
- Nhịp: 1 ảnh sau mỗi 2 đến 3 đoạn, khoảng 1 ảnh / 300 đến 400 âm tiết. Thân bài bắt đầu từ ảnh 2 (theme đã hiện ảnh 1).
- Trong `<img>` ghi `width="1600" height="1200" loading="lazy" style="max-width:100%;height:auto;display:block"`. BẮT BUỘC có max-width vì theme classique.vn không tự co ảnh có thuộc tính width, thiếu là ảnh tràn màn hình (lỗi 15/09).
