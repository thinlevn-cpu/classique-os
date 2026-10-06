# Checklist Viết Bài Blog Chuẩn SEO (tri thức lõi)

> Đây là tri thức nền BẮT BUỘC mỗi khi viết một bài blog cho website classique.vn.
> ⚖️ **Luật EEAT/YMYL gốc nằm ở `CLAUDE.md` mục 11.** File này chỉ cụ thể hoá cho blog; chỗ nào lệch thì CLAUDE.md thắng.
> Tổng hợp từ thực hành copywriting + on-page SEO kinh điển (Yoast SEO, Brian Dean/Backlinko,
> nguyên lý headline của David Ogilvy & cookbook tiêu đề, và quy trình content nội bộ).
> AI đọc file này TRƯỚC khi viết, rồi tự rà từng mục như một biên tập viên khó tính.

Mục tiêu cuối: **bài lên top 1 cho từ khoá chính** + **người đọc thật sự muốn đọc hết và hành động**.

---

## HÀNH VĂN, GIỌNG BLOG (đọc trước cả phần SEO)

> Luật gốc: `wiki/concepts/Hai làn giọng.md` và `wiki/concepts/Giọng Anh Cả Hàng Hiệu.md`.
> Chép nguyên vào đây vì bản chạy trên VPS không đọc được `wiki/`. Chỗ nào lệch thì trang wiki thắng.

**Blog classique.vn chạy LÀN CỬA HÀNG** (chốt 18/09/2026):
- **Xưng "bên em", gọi "anh chị".** Nhất quán cả bài. Không chuyển sang "mình/bạn" giữa bài.
- Người nói là **The Classique đang làm nghề**, không phải Anh Cả kể chuyện đời. **Không kể chuyện cá nhân, không kể vết thương** trong bài blog (chất liệu đó thuộc làn nhân hiệu: TikTok, Facebook).
- **Chuyên môn lộ qua thao tác cụ thể**, không qua tuyên bố. Viết "chi tiết bên em nhìn đầu tiên", "xoay vòng dưới đèn thì cạnh bắt một đường sáng liền". CẤM "với nhiều năm kinh nghiệm", "chúng tôi là chuyên gia".
- Câu ngắn, mỗi đoạn dẫn tới **một chỗ nhìn được bằng mắt**. Không tính từ hoa mỹ.

**CẤM tuyệt đối trong mọi câu:**
1. **Thổ ngữ Nam bộ**: tui, à nha, nghen, hết trơn. Đó là diễn, phản chữ THẬT.
2. **Bốn dạng "văn AI"**: câu khẩu hiệu vế đối vế · nhân cách hoá thơ thẩn · bộ ba song song · kiểu "không phải X mà là Y" lặp máy móc.
3. **Cụm sáo rỗng**: "trong thế giới...", "hãy cùng khám phá", "không chỉ... mà còn", "chìa khoá thành công".
4. **Từ kích động trong tiêu đề và heading**: bí mật, sốc, không thể tin, sự thật bất ngờ, đừng bao giờ. Tiêu đề vẫn có số và lợi ích, nhưng giọng điềm tĩnh. (VIẾT HOA toàn bộ là quy ước kỹ thuật của publisher, không phải giọng hét.)
5. **Tự nhận đã thành công**, "chuyên gia tài chính", mở chủ đề dạy làm giàu.
6. **Hô hào động lực.** "Tích cực" ở đây là sự vững chãi của người đã qua địa ngục rồi trở về tỉnh táo.

**NÊN có (gợi ý, không bắt buộc):**
- **Một cặp so sánh đời thường cụ thể** khi giảng giá trị. Ví dụ gốc: cái máy xay mua trên sàn chưa bóc seal, so với chiếc túi hiệu dùng mỗi ngày chưa tới 100 nghìn.
- **Phản diện là hệ thống hoặc quan niệm sai** (hàng nhái, mua vì hình ảnh), không bao giờ là một con người cụ thể. Không công kích người mua.

**CỔNG VĂN, rà trước khi sang bước đăng** (chuẩn đo từ 6 bài trang sức tiếng Việt cùng ngành, gốc ở `wiki/concepts/Sổ nhịp văn.md`):

```bash
python3 van-hanh/cong-van/cham.py <đường dẫn bài>.html
```

| Chỉ số | Chuẩn | Lệch thì sửa thế nào |
|---|---|---|
| Câu trung bình | **≥ 25 từ** | Gộp câu ngắn cùng nói một thứ bằng "còn", "nhưng", "nên", "vì". **Đừng nối bằng một chuỗi dấu phẩy**: cách đó từng đẻ ra câu 79 và 139 từ (sửa 24/09/2026). Gộp xong câu vẫn phải ≤ 50 từ |
| Câu dưới 12 từ | **≤ 15%** số câu | Như trên. Xoá các câu nhãn kiểu "Nhìn chất liệu.", "Đối chiếu thời điểm." |
| Cụm rào mỗi câu | **≤ 0,10** | Rào một lần ở cuối phần, không rào từng câu. Câu rào bản tự nhiên: `wiki/concepts/Kho đoạn mẫu.md` mục A. Câu YMYL bắt buộc ("cần kiểm định trực tiếp", "phụ thuộc tình trạng, giấy tờ…", "không phải lời khuyên…") **không bị tính** là rào, cứ viết đủ |
| Câu tự nói về bài | **= 0** | Xoá hẳn, không thay bằng gì. Không "bài này sẽ", "lưu ý trước", "ở thời điểm bài viết" |
| 🔺 Câu trung bình, **trần** | **≤ 40 từ** | Tách câu dài ở chỗ đổi ý, không chặt vụn (chốt 24/09/2026) |
| 🔺 Câu trên 50 từ | **≤ 10%** số câu | Như trên. Câu mở bài và câu đầu mỗi H2 càng phải gọn |
| 🔺 Trả lời nhanh | **H2 "Trả lời nhanh: …"**, đoạn 50-70 từ, câu đầu ≤ 40 từ | Xem mục 3b |
| **E** · bằng chứng trải nghiệm | **≥1 trong 3 dạng** | ca thật ẩn danh · lỗi từng gặp khi soi · quan sát từ kho phiếu kiểm định |
| **A** · link | **≥2 ngoài, ≥2 nội bộ** | link ngoài phải là **trang sâu** đúng chủ đề (hãng, GIA, nhà đấu giá, Wikipedia), không phải trang chủ; mạng xã hội không tính (nâng 24/09/2026) |
| 🔺 H2 dạng câu hỏi | **≥ 2 H2** kết thúc bằng "?" | Lấy từ People Also Ask / "Tìm kiếm liên quan" / tin nhắn khách trong brief. Xem mục 3 và 3b |
| 🔺 Bảng hoặc danh sách | **≥ 1** | Bảng so sánh, thông số, các bước, hoặc danh sách tiêu chí. AI trích nguyên ô bảng, dòng list |
| **T** · khuyến cáo | **bắt buộc khi bài nêu giá** hoặc giá trị bán lại | bản mẫu ở `Kho đoạn mẫu` mục A3, **không mở bằng "Bài này…"** |

Bài Alhambra 17/09 trượt cả bốn (19,0 từ · 24,1% · 0,103 · 7 câu). Bài mẫu cùng ngành đạt cả bốn (35,8 từ · 4,2% · 0,042 · 0). **Bốn con số này là chỗ khác nhau giữa bài đọc trôi và bài lủng củng**, không phải mức độ chi tiết: bài mình có gấp đôi danh từ vật chất so với họ.

**Văn mẫu:** trước khi viết đọc `wiki/concepts/Kho đoạn mẫu.md` mục A (câu rào) và mục B (gộp câu). Đó là chỗ duy nhất trong bộ não có văn đúng dạng cặp đối chứng.

---

## NGUYÊN TẮC BẤT DI BẤT DỊCH (vi phạm là loại)

1. **KHÔNG dùng ký tự gạch dài "em dash" (—)** trong bất kỳ nội dung nào. Dùng dấu phẩy, dấu chấm, hoặc "và".
2. **KHÔNG dùng icon/emoji** trong thân bài blog (giữ giọng chuyên gia; luật giọng ở mục "HÀNH VĂN, GIỌNG BLOG" phía trên).
3. **Từ khoá chính BẮT BUỘC xuất hiện trong 100 từ đầu** (lý tưởng: ngay câu đầu / sapo).
4. **Alt text mọi ảnh BẮT BUỘC tả đúng thứ nhìn thấy trong ảnh.** Từ khoá chỉ có mặt khi đọc lên tự nhiên (thường ở ảnh đại diện và 1-2 ảnh chính). CẤM gắn đuôi từ khoá vào mọi alt kiểu "..., dùng trong cách phân biệt X thật giả" (Google coi là nhồi từ khoá).
5. **KHÔNG viết bản tin, KHÔNG trích nguyên văn bài báo.** Đây là bài tri thức/hướng dẫn của chuyên gia. *Ngoại lệ đã khai:* chuỗi bài **TIN TỨC** được dùng **ảnh** từ trang khác có ghi nguồn (luật 17/09), nhưng vẫn tự viết bằng giọng nghề, không chép câu của báo.
6. **Mật độ từ khoá ~1.5-2%** trên toàn bài. 🔺 **Cách đếm, chốt 18/09:** tính **cả biến thể ngắn** của từ khoá. Với từ khoá "Van Cleef Alhambra men hồng" thì "Alhambra men hồng", "dòng men hồng", "chiếc men hồng", "men hồng" đều tính. **Cụm đủ chữ chỉ cần ở bốn vị trí neo**: tiêu đề, slug, 100 từ đầu, một H2. Bài 17/09 lặp cụm sáu chữ **19 lần, bằng 6% thân bài**, vì trước đây chỉ đếm cụm đầy đủ — đó là lỗi cách đếm, không phải lỗi mật độ.
7. **Kiểm tra bài đã lên web thật** trước khi báo "đã đăng".
8. Tên hãng, tên dòng viết **đúng chính tả của hãng** (Van Cleef & Arpels, Juste un Clou…); tiếng lóng nội bộ (đinh, x kim, bọ…) chỉ dùng khi đã giải nghĩa.
9. **YMYL — CẤM hứa hẹn phóng đại** (chi tiết `CLAUDE.md` mục 11.4). Không viết "chắc chắn lên giá", "đầu tư chắc thắng", "giữ giá tuyệt đối", "không bao giờ mất giá", "sinh lời"; không phán thật/giả chỉ qua ảnh. Nêu cả rủi ro.
   🔺 **GIÁ, luật 18/09/2026 (bản 2, thay bản siết 21/08):** ranh giới là **một món cụ thể** so với **toàn bộ hoạt động**.
   ✅ **ĐƯỢC viết, dạng tham khảo:** giá niêm yết chính hãng · giá rao trên sàn bán lại quốc tế · kết quả đấu giá · **và giá thu, giá bán của bên em cho một món cụ thể**. Ghi rõ nguồn hoặc thời điểm, nói rõ là mức tham khảo chứ không phải báo giá, không kèm suy diễn "nên sẽ lên giá".
   ❌ **CẤM TUYỆT ĐỐI, không ngoại lệ:** con số nói về **toàn bộ hoạt động** — doanh thu, tỷ trọng theo dòng, biên lợi nhuận, biên theo kênh, giá vốn, tồn kho, vòng quay vốn, **giá trung vị theo dòng**, số món đã bán, lãi từng món.
   ⚠️ Không đặt **giá thu của bên em** và **giá bán lại công khai của cùng dòng** trong một bài: người đọc trừ ra được biên lãi, tức lộ đúng nhóm cấm bằng đường phái sinh. Cổng máy cảnh báo ca này.
   Câu mẫu dùng được: `wiki/concepts/Kho đoạn mẫu.md` mục A4.
10. **Mỗi bài phải có ≥1 bằng chứng TRẢI NGHIỆM THẬT** (Experience). Đủ **một trong ba dạng** là đạt (chốt 18/09, để nhịp 3 bài/ngày không cạn chất liệu mà phải bịa):
    - **(a) Ca thẩm định/thu mua có thật**, ẩn danh hoàn toàn, không giá. Ca Van Cleef nối dây 07/2026 được kể công khai.
    - **(b) Một ca lỗi có thật đã được chủ nhân duyệt kể** (ví dụ ca Van Cleef dư mắt dây 07/2026). ⚠️ **Nguồn này gần như cạn và rất dễ thành bịa** — lỗi trong nghề chỉ đến từ thiếu kinh nghiệm nên không có nhiều ca, và không có kho lỗi nào để rút. **Không tự dựng "lỗi từng gặp".** Chưa được duyệt thì dùng dạng (c).
    - **(c) Quan sát rút từ kho phiếu kiểm định**: dòng nào về nhiều, kiểu hỏng nào hay gặp, phụ kiện nào thường thiếu. ⛔ **CHỈ dùng tỉ lệ tương đối** ("gần một nửa", "cứ mười chiếc thì bốn"), **cấm con số tuyệt đối** (chủ nhân chốt 18/09). Bảng số và 7 câu mẫu dùng ngay: `wiki/concepts/Quan sát từ kho phiếu kiểm định.md`.
    Lấy từ `wiki/`, **KHÔNG bịa ca, KHÔNG trộn ca**, KHÔNG dùng con số giá làm "bằng chứng". Hết chất liệu thì dùng dạng (c), hoặc gắn `⚠️ CHỜ CHẤT LIỆU` và báo lại. **Dạng (c) là nguồn chính cho nhịp 3 bài mỗi ngày**, không phải dạng (b).

---

## E-E-A-T & YMYL — TÍN HIỆU TIN CẬY (bắt buộc với classique.vn)

> classique.vn là **YMYL** (Your Money or Your Life) vì người đọc sắp **chi hàng chục đến hàng trăm triệu** cho một món đã qua sử dụng và có rủi ro hàng giả. KHÔNG phải vì site nói chuyện tài chính: cấm mở chủ đề dạy tài chính/làm giàu. Luật gốc: `CLAUDE.md` mục 11.

**E-E-A-T = 4 tín hiệu, viết bài phải nhắm cả 4:**

| Chữ | Nghĩa | Cách thể hiện TRONG bài |
|---|---|---|
| **E — Experience** | Trải nghiệm thật | ≥1 ca thẩm định/thu mua có thật (ẩn danh) · lỗi từng gặp khi soi hàng · cảm giác cầm món hàng. Không bịa ca |
| **E — Expertise** | Chuyên môn | Đúng kỹ thuật (tem, số seri, chất liệu, cơ chế khoá…), dẫn về trang wiki dòng hàng |
| **A — Authoritativeness** | Thẩm quyền | ≥2 external link uy tín, trang sâu (trang chính hãng, GIA, nhà đấu giá lớn, tài liệu kỹ thuật) + 2-3 internal link cùng cụm |
| **T — Trustworthiness** | Đáng tin | Trung thực, có điều kiện, nêu hạn chế/rủi ro; **không phóng đại**; giá chỉ theo luật mục 9 (một món cụ thể, có nguồn và thời điểm, không số liệu toàn hoạt động); tách giá trị sử dụng / cảm xúc / bán lại |

**Author box:** KHÔNG cần tự viết trong thân bài — **publisher tự chèn deterministic** "Về tác giả: Anh Cả Hàng Hiệu (The Classique)" + tiểu sử + link (cấu hình ở `.secrets/seo-web.env`: `AUTHOR_NAME`, `AUTHOR_BIO`…). Người viết chỉ cần lo nội dung. **Vì vậy thân bài CẤM tuyên bố tư cách** ("với X năm kinh nghiệm", "chúng tôi là chuyên gia"): author box là chỗ hợp pháp duy nhất để nêu tư cách.

**Luật YMYL ngành hàng hiệu:**
- ❌ CẤM: "chắc chắn lên giá", "đầu tư chắc thắng", "giữ giá tuyệt đối", "không bao giờ mất giá", "sinh lời", "hàng thật 100% nhìn ảnh là biết", mọi số liệu **toàn bộ hoạt động** của Classique (doanh thu, biên, tồn kho, giá trung vị theo dòng…). Giá **một món cụ thể** có nguồn thì được, xem mục 9 (luật 18/09/2026, thống nhất 24/09/2026).
- ✅ THAY bằng: phát biểu có điều kiện ("giá bán lại phụ thuộc tình trạng, giấy tờ và thời điểm"), nói **cách định giá** thay vì **mức giá**, luôn kèm "cần kiểm định trực tiếp" khi bàn thật/giả.
- ✅ **Khuyến cáo** cuối bài có nói giá trị bán lại / chi tiêu lớn (1-2 câu): *"Nội dung chia sẻ kinh nghiệm thẩm định, không phải lời khuyên đầu tư. Giá trị bán lại của mỗi món phụ thuộc tình trạng, giấy tờ và thời điểm; hãy kiểm định trực tiếp trước khi quyết định."*

---

## 9 KHỐI CỦA MỘT BÀI BLOG (rà từng mục)

### 1. Headline (Tiêu đề chính)
Gây ấn tượng, làm người đọc dừng lại. Rà checklist:
- [ ] Rõ ràng, chỉ **1 ý chính**, đọc hiểu trong 10 giây.
- [ ] Dài **1-2 dòng**.
- [ ] Nói **rõ lợi ích** của người đọc (họ được gì).
- [ ] **Cụ thể** + **chứa con số** (vd "4 cấp độ", "7 cách").
- [ ] Có **lời hứa** rõ ràng.
- [ ] Có **tính từ** tạo cảm xúc (thật sự, toàn diện, đơn giản...).
- [ ] Dùng **công thức tiêu đề (cookbook)**: "X là gì", "N cách để...", "Làm thế nào để...", "X và Y khác nhau thế nào". (Bỏ "Bí mật của...": trái luật từ kích động ở mục HÀNH VĂN, sửa 23/09/2026.) Tiêu đề **rõ trước, tò mò sau**.
- [ ] **Từ khoá chính nằm ở ĐẦU headline** (và trong Title thẻ + slug).
- [ ] **Tiêu đề bài VIẾT HOA TOÀN BỘ** (luật 17/09/2026; publisher tự ép, meta title Yoast giữ chữ thường).

### 2. Tóm tắt / Sapo (đoạn mở đầu, trước thẻ "read more")
- [ ] Có **NEO móc (anchor)** kéo người đọc đi tiếp.
- [ ] **Câu đầu trả lời thẳng câu hỏi của từ khoá** (answer-first, để Google AI Overview và ChatGPT trích được), tối đa 1-2 câu khung cảnh nghề trước đó. Không mở bằng câu hỏi gây sốc hay chuyện đời (làn cửa hàng, sửa 23/09/2026).
- [ ] **Từ khoá chính xuất hiện ngay dòng đầu** (trong 100 từ đầu, tốt nhất câu 1).
- [ ] Ngắn gọn 3-5 dòng, hứa hẹn giá trị cụ thể của bài.

### 3. Heading (H2/H3/H4 — chia phần)
Heading làm bài trực quan + **SEO đọc heading trước**. Mỗi heading tự nó phải hấp dẫn. Rà:
- [ ] Tạo cảm giác **hấp dẫn / tò mò / ngạc nhiên / cá nhân hoá / cảm xúc**.
- [ ] Dùng **từ "ma thuật"**: "anh chị" (không "bạn", làn cửa hàng), "bởi vì" + lợi ích người đọc mong muốn.
- [ ] Dùng **từ tương phản** và **cụm nối** (và, nhưng, bởi vì) để tạo nhịp.
- [ ] **≥ 2 H2 là câu hỏi người mua thật**, có dấu "?" (cổng văn chặn, 24/09/2026). Lấy từ People Also Ask trong brief; mỗi câu hỏi ≤ 14 từ, có tên hãng/dòng khi hợp lý. Google AI Mode tách một câu hỏi thành 10-30 câu hỏi con: heading khớp câu hỏi con thì đoạn đó được trích.
- [ ] Heading **đập tan suy nghĩ tiêu cực** của người đọc (xử lý phản đối ngầm).
- [ ] **Từ khoá chính/phụ xuất hiện ở các heading** (ít nhất H2 đầu + vài H2/H3).
- [ ] Mỗi heading kiểm 4 tiêu chí: rõ ý, hấp dẫn, đúng nội dung phần, có keyword khi hợp lý.

### 3b. Khối "Trả lời nhanh" và đoạn tự đứng được (AEO, thêm 23/09/2026)
Nguồn: Ahrefs, Ethan Smith (Graphite), Surfer, HubSpot; tổng hợp ở `output/2026-09-23-yt-viet-blog-copywriting/`.
- [ ] H2 đầu tiên là **"Trả lời nhanh: …"**, đoạn ngay dưới **50-70 từ**, **câu đầu ≤ 40 từ** tự trả lời trọn câu hỏi của từ khoá (bài mẫu Juste un Clou đã làm, nay thành luật). Cổng văn chặn khi lệch (chốt 24/09/2026).
- [ ] **Câu đầu mỗi H2 trả lời luôn điều heading hỏi**, rồi mới giải thích. AI cắt trang thành từng đoạn để trích, nên mỗi phần phải hiểu được khi đứng riêng: gọi đủ tên dòng hàng (Cartier Love, Van Cleef Alhambra), không viết "chiếc này", "như trên".
- [ ] Heading H2/H3 đặt **sát câu hỏi người mua thật** (lấy từ tin nhắn tư vấn, People Also Ask).
- [ ] Có ≥1 **bảng hoặc danh sách** (cổng văn chặn, 24/09/2026): bảng khi có so sánh/thông số/các bước, danh sách khi có tiêu chí. AI hay trích nguyên ô bảng, dòng list. Ahrefs: 43,8% trang được AI trích là dạng list, so sánh, review.
- [ ] **Một dữ kiện gốc từ kho phiếu kiểm định**, viết dạng tỉ lệ tương đối ("cứ mười chiếc Alhambra về bàn kiểm thì…", "phần lớn phiếu ghi…"), không số tiền, không số món đã bán. Đây là thứ AI không tự sinh được và đối thủ không có (5/9 guru: dữ liệu gốc).
- [ ] **Không độn chữ.** Ahrefs soi 174.000 trang được AI trích: hơn nửa dưới 1.000 từ. Số từ mục tiêu là sàn cho đủ ý, không phải lý do kéo dài.
- [ ] **Câu dài vẫn phải đọc một lần là hiểu.** Câu trung bình **25-40 từ**, câu trên 50 từ **≤ 10%** (cổng văn chặn, chốt 24/09/2026). Tách câu dài ở chỗ đổi ý, không chặt vụn.

### 4. Image (Hình ảnh)
Chuẩn ảnh classique.vn (chốt 16/09/2026):
> 🔒 **QUY TRÌNH ẢNH BỐN BƯỚC, làm đúng thứ tự này (chốt 18/09/2026):**
> 1. **Chọn ảnh trong `raw/kho-anh-classique/1-anh-goc/<Hãng>/<loại>/`** theo tên thư mục.
>    ⛔ **KHÔNG dùng `2-anh-co-moc` nữa (chủ nhân chốt 18/09/2026).** Kho đó đóng mộc **kiểu cũ** (chữ THE CLASSIQUE to giữa ảnh), nhìn xấu và lấy về là ra ảnh **hai mộc**. Dùng ảnh gốc rồi để `anh-4x3.py` đóng **mộc kiểu mới**: logo nhỏ góc phải dưới, đậm 40%, kèm chữ THE CLASSIQUE.
>    ⚙️ `anh-4x3.py` vẫn giữ chốt an toàn: đường dẫn nguồn có chữ `co-moc` thì tự bỏ đóng mộc. **Bản che serial phải lưu ở thư mục KHÔNG có chữ `co-moc`** (ví dụ `/tmp/che-goc/`) để ảnh vẫn được đóng mộc kiểu mới.
> 2. **Mở từng tấm ra NHÌN.** Không đoán nội dung ảnh qua tên thư mục.
> 3. **Đặt tên file mô tả đúng thứ vừa nhìn thấy** trong `spec.json` (`"out": "<slug-bài>-<số>-<mô tả ảnh>"`).
> 4. **Viết alt và caption theo đúng tấm đó.** Đổi ảnh thì sửa cả ba: tên file, alt, caption.
>
> ⚙️ **Có cổng máy canh:** publisher so phần mô tả trong tên file với alt, không trùng chữ nào thì **chặn đăng** (`--allow-alt` để bỏ qua khi bắt nhầm). Nên bước 3 và 4 mà lệch nhau là bị bắt ngay, không cần nhớ.

- [ ] ⚠️ **ALT PHẢI TẢ ĐÚNG TẤM ẢNH CUỐI CÙNG ĐƯỢC CHỌN.** Lỗi 18/09 trên bài nháp #1584: alt viết lúc chưa chọn ảnh, sau đổi ảnh mà quên sửa alt, thành ra alt nói "chữ khắc Au750" trong khi ảnh là khoá móc. **Chọn ảnh trước, mở từng tấm ra nhìn, rồi mới viết alt và caption.** Đổi ảnh thì sửa cả alt lẫn caption.
- [ ] **Thẻ ảnh trong HTML** cứ viết gọn `<figure><img src="__IMG1__" alt="..."><figcaption>…</figcaption></figure>`. Publisher **tự ép** `width`, `height`, `loading`, `decoding`, `class="wp-image-<id>"` và `style="max-width:100%;height:auto;display:block"` (vá 18/09). Thiếu bộ này thì ảnh 1600px **tràn ra ngoài cột nội dung**.
- [ ] **Alt text** tả đúng ảnh, cụ thể, dưới ~125 ký tự. VD tốt: *"Chữ khắc Cartier, số size và ký hiệu Au750 mặt trong vòng Juste un Clou"*. Từ khoá chính có mặt ở alt ảnh đại diện; ảnh khác chỉ khi tự nhiên. Viết alt ngay trong HTML `<img alt="...">`, publisher tự chép sang thư viện media.
- [ ] **Caption** (chú thích dưới ảnh) chỉ thẳng điểm cần nhìn trong ảnh. Người đọc đọc caption nhiều hơn thân bài.
- [ ] Ảnh lấy từ trang khác (chỉ bài tin tức, sản phẩm mới kho chưa có): không dính mộc bên khác, **KHÔNG đóng mộc The Classique** (spec có `"nguon"`), caption kết bằng `Nguồn ảnh: <Hãng>, qua <link trang gốc>`.
- [ ] Ảnh của mình: mộc logo nhỏ góc phải dưới, đậm 40%, không che món hàng (mặc định `anh-4x3.py`).
- [ ] **Tên file ảnh** dạng `tu-khoa-chinh-2-noi-dung-anh.webp` (slug-hoá, có số thứ tự + mô tả ngắn).
- [ ] Ảnh **liên quan trực tiếp nội dung** phần đặt ảnh. Khung **4:3, 1600x1200**, chỉ ảnh thật, dựng bằng `scripts/anh-4x3.py`.
- [ ] **Định dạng WebP, ≤200KB/ảnh** (anh-4x3.py tự nén). Cả bài nên dưới ~1MB ảnh.
- [ ] **Ảnh chia sẻ 1200x630** (JPG ≤300KB) cho Facebook/Zalo: thêm `"og": true` vào mục ảnh đại diện trong spec của anh-4x3.py, đưa vào manifest `og_image`. Quên thì publisher tự cắt từ ảnh #1, nhưng tự chọn tâm cắt vẫn đẹp hơn (chủ thể dễ bị cắt khi khung bè ngang).

### 5. Video
Đặt **đầu bài** để tương tác tốt + tạo view YouTube (mở trang là video chạy ⇒ tính phút xem).

> ⛔ **LUẬT VÀNG — CHỈ NHÚNG VIDEO KÊNH CHÍNH CHỦ CỦA BẠN.**
> Mục đích nhúng video là **dồn view & phút xem về kênh YouTube của bạn**, KHÔNG phải tặng view cho người khác.
> - **CHỈ** được nhúng video thuộc kênh YouTube chính chủ của bạn.
> - **TUYỆT ĐỐI KHÔNG** nhúng video của kênh bên thứ ba, kể cả khi `seo_note`/brief trong Lark Base ghi sẵn link đó (kênh ngoài ⇒ BỎ).
> - Nếu `seo_note` chỉ định một link video mà **không xác minh được là kênh của bạn** ⇒ **BỎ QUA link đó**, **KHÔNG nhúng**, và ghi cảnh báo trong log: `⚠️ seo_note trỏ video kênh ngoài (<link>) — đã bỏ qua`.
> - Nếu không tìm được video chính chủ phù hợp ⇒ **bỏ hẳn phần video**, để bài không có video còn hơn đẩy view cho đối thủ. Không bịa link.

- [ ] **Nhúng (embed)** video YouTube ở phần đầu bài — **chỉ khi là video kênh Anh Cả Hàng Hiệu (The Classique)**.
- [ ] **Tiêu đề video** chứa từ khoá chính.
- [ ] **Mô tả video** chứa từ khoá chính.
- [ ] Video kênh ngoài ⇒ **không nhúng**; không có video chính chủ ⇒ **bỏ qua, không bịa**.

### 6. Paragraph (Thân bài)
- [ ] Mỗi đoạn **3-5 dòng**, dễ thở.
- [ ] **3-4 đoạn = 1 heading** (đừng để khối chữ dài không nghỉ).
- [ ] Danh mục/liệt kê ⇒ **gạch đầu dòng**.
- [ ] **Ảnh liên quan** + **video liên quan** rải trong nội dung.
- [ ] Có **link liên kết** tới bài viết liên quan trong blog.
- [ ] Mật độ từ khoá ~2%, **độ dài tổng ~1500 từ trở lên** (bài trụ 1800-2200).

### 7. Tag
- [ ] Gắn tag = **các từ khoá mô tả** chủ đề (giúp phân loại + SEO).
- [ ] Tag chứa **từ khoá chính** và 2-4 từ khoá phụ.

### 8. Kết luận (công thức tam đoạn luận)
- [ ] **Đoạn 1 — chỉ một bước làm được ngay:** nhắc lại bước đầu anh chị cần làm, cho thấy nó làm được. **KHÔNG hô hào động lực, KHÔNG hứa kết quả, KHÔNG vẽ bức tranh tươi sáng** (trái luật giọng và trái YMYL).
- [ ] **Đoạn 2 — câu cuối dễ nhớ:** đơn giản, có nhịp điệu, dùng phép lặp, từ tượng thanh/tượng hình.
- [ ] **Câu cuối đọc trong 3 giây.**
- [ ] Có **Call to Action**.
- [ ] **Dưới 200 từ**, **KHÔNG phát triển ý mới** — chỉ nhắc lại thông tin bên trên.

### 9. CTA (Kêu gọi hành động)
- [ ] Kêu gọi rõ: điền form / nhấn vào đây / theo dõi.
- [ ] Đặt **2 CTA**: 1 giữa bài, 1 cuối bài. Gắn UTM (`utm_campaign=<slug>`, `utm_content=cta-giua-bai` / `cta-cuoi-bai`).

---

## CHECKLIST VỊ TRÍ TỪ KHOÁ CHUẨN SEO (bản tra nhanh)

Từ khoá chính PHẢI nằm ở **tất cả** các vị trí sau:

| # | Vị trí | Ghi chú |
|---|--------|---------|
| 1 | **Tiêu đề** | Ở đầu headline + Title thẻ |
| 2 | **Sapo** | Dòng đầu tiên / 100 từ đầu |
| 3 | **Tag** | Một trong các tag |
| 4 | **Ảnh** | Tên file + alt ảnh đại diện; ảnh khác alt tả đúng ảnh, có từ khoá khi tự nhiên |
| 5 | **Heading** | H1, H2, H3 (ít nhất H1 + 1-2 H2) |
| 6 | **Meta** | Meta Description + Meta Keyword |
| 7 | **Slug / URL** | URL sạch chứa từ khoá |
| 8 | **Link** | Internal link (anchor-text + từ xung quanh chứa keyword); link 2 bài cùng chủ đề |
| 9 | **Category** | Tên category liên quan từ khoá **+ LUÔN có danh mục "BLOG"** (publisher tự gắn) |
| 10 | **Ảnh đại diện** | Featured image có alt chứa keyword + ảnh chia sẻ 1200x630 riêng |
| 11 | **Video nhúng** | ⛔ CHỈ video kênh Anh Cả Hàng Hiệu (The Classique). Kênh ngoài (kể cả `seo_note` ghi sẵn) ⇒ BỎ, không nhúng |

**Mật độ:** từ khoá ~2% toàn bài; bài dài ~1500 từ.

---

## LINK (internal + external)

- **Internal:** link tới **2-3 bài cùng chủ đề** trong blog. Anchor-text chứa từ khoá; từ xung quanh anchor cũng liên quan.
- **External:** link tới **1 bài ngoài "web mạnh"** cùng từ khoá (ưu tiên trang đang top 10 Google cho keyword đó) — tăng độ tin cậy chủ đề.
- **Backlink:** lý tưởng có backlink từ bài ngoài trỏ về (mục "Backlink Targets" trong brief Lark ghi mục tiêu).

---

## QUY TRÌNH SEO LỚN (bối cảnh, làm trước khi viết khi có thời gian)

1. **Nghiên cứu đối thủ:** xem top 10 Google cho từ khoá chính → cấu trúc, độ dài, góc tiếp cận → viết hay hơn.
2. **Viết bài** theo 9 khối trên (chiến lược content trụ: cụm bài quanh 1 chủ đề).
3. **Tổng kiểm tra:**
   - Bật **Yoast SEO** (plugin WordPress) → rà cho **xanh tất cả các mục** rồi mới Publish.
   - Dùng **Google Search Console (webmaster)** đo lường hiệu quả bài sau đăng.
4. **Phân phối:** pin lên Pinterest với ảnh có chữ đọc độc lập (khi mở rộng kênh).

---

## RÀ CUỐI TRƯỚC KHI PUBLISH (gate xanh Yoast)

- [ ] Từ khoá ở: Title, Slug, Meta Description, H1, ≥1 H2, đoạn đầu, alt ảnh đại diện.
- [ ] Mật độ keyword 1-2%, không nhồi.
- [ ] Độ dài ≥1500 từ.
- [ ] ≥2 internal link + ≥2 external link "web mạnh" (trang sâu, không mạng xã hội).
- [ ] Mọi ảnh: 4:3 WebP ≤200KB, tên file slug-keyword, alt tả đúng ảnh (không nhồi đuôi từ khoá). Có ảnh chia sẻ 1200x630.
- [ ] Meta Title ≤60 ký tự, Meta Description 120-156 ký tự, có keyword.
- [ ] Không em dash, không emoji, không trích nguyên văn bài báo.
- [ ] **CỔNG VĂN:** đã chạy `van-hanh/cong-van/cham.py` và **đạt hết** chưa? Nhịp văn (câu TB 25-40 · câu >50 từ ≤10% · câu ngắn ≤15% · rào ≤0,10 · meta = 0) **và các dòng E-E-A-T/AEO** (bằng chứng trải nghiệm · ≥2 link ngoài + ≥2 nội bộ · Trả lời nhanh · ≥2 H2 câu hỏi · bảng/danh sách · khuyến cáo khi có giá).
- [ ] Kết luận <200 từ + CTA. Có 2 CTA (giữa + cuối).
- [ ] **E-E-A-T:** bài có ≥1 bằng chứng trải nghiệm thật (ca thẩm định/lỗi soi hàng thật, không phải con số giá) + ≥2 external link "web mạnh" (Authority)? (Author box do publisher tự chèn.)
- [ ] **YMYL:** qua đủ 5 câu tự hỏi ở `CLAUDE.md` mục 11.3? Đã gỡ MỌI cụm phóng đại và mọi số liệu toàn hoạt động; giá một món (nếu có) đã ghi nguồn + thời điểm? Bài có nói giá trị bán lại đã có câu **khuyến cáo** chưa?
- [ ] Yoast xanh hết → Publish → mở URL kiểm tra thật.
