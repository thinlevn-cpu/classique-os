#!/usr/bin/env bash
# buoc2-setup-lark.sh — BƯỚC 2: từ Bảng 0 (Tổng tư lệnh) dựng "giả chiến" trên Lark Base:
#   Chiến dịch (Bảng 1) -> Nhóm QC (Bảng 2) -> Content + ảnh (Bảng 3). CHƯA đụng Facebook.
# Cổng: chỉ xử lý record Bảng 0 có Trạng thái = "1. Chờ xử lý".
#   bash buoc2-setup-lark.sh
#
# ===== QUY TẮC BẮT BUỘC =====
# 1. CAPTION 4 phần, KHÔNG ghi chú nội bộ kiểu "(đính video...)", KHÔNG icon, KHÔNG em-dash:
#    (a) HOOK: có tính FOMO + CÓ SỐ LIỆU ngay câu mở đầu/tiêu đề.
#    (b) VẤN ĐỀ của khách hàng (nỗi đau).
#    (c) GIẢI PHÁP của mình (sản phẩm/ebook).
#    (d) KÊU GỌI HÀNH ĐỘNG (CTA) kèm yếu tố giới hạn.
# 2. CONTENT (Bảng 3) BẮT BUỘC gắn "Nhóm QC (LK)" — không để trống.
# 3. NHÓM QC (Bảng 2) BẮT BUỘC gắn "Tệp dùng (LK)" lấy từ ô "Nhóm đối tượng / Tệp" của Bảng 0.
# 4. Nếu Bảng 0 có "Target (thủ công)" -> đổ vào ô "Nhắm mục tiêu chi tiết" của từng Nhóm QC (Bảng 2).
set +e
DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/config.env"   # B, T0..T9, T_NK, CHAT, DOMAIN, ACT — cấu hình riêng của bạn
export PATH="$PATH:/c/Program Files/nodejs:/c/Users/Admin/AppData/Roaming/npm"
export PYTHONIOENCODING=utf-8
newid(){ python -c "import sys,json
try:
    d=json.load(sys.stdin); print((d.get('data',{}).get('record',{}).get('record_id_list') or [''])[0])
except Exception: print('')"; }

BASE_URL="$DOMAIN/base/$B"
lark-cli base +record-list --base-token $B --table-id $T0 --format json --as user 2>/dev/null > "$DIR/_b0.json"
lark-cli base +record-list --base-token $B --table-id $T9 --format json --as user 2>/dev/null > "$DIR/_b9.json"
lark-cli base +record-list --base-token $B --table-id $T7 --format json --as user 2>/dev/null > "$DIR/_b7.json"

# ===== PASS A: đọc lệnh "1. Chờ xử lý" -> payload Chiến dịch + context =====
python "$DIR/buoc2-passA.py" "$DIR" 2>&1

REC0=$(cat "$DIR/_rec0.txt" 2>/dev/null)
if [ "$REC0" = "NONE" ] || [ -z "$REC0" ]; then echo "Không có lệnh '1. Chờ xử lý' trong Bảng 0."; rm -f "$DIR"/_b0.json "$DIR"/_rec0.txt; exit 0; fi
TEN=$(cat "$DIR/_ten.txt" 2>/dev/null)
echo "🎖️ Nhận lệnh: $TEN ($REC0)"
# URL đã resolve (link Bảng 7 hoặc auto-match) — ghi vào Bảng 1 "URL đích" (trong _camp.json); chỉ đọc để hiển thị
URLMATCH=$(cat "$DIR/_url.txt" 2>/dev/null)

# ===== Tạo CHIẾN DỊCH (Bảng 1) =====
CAMP_REC=$(lark-cli base +record-upsert --base-token $B --table-id $T1 --json "$(cat "$DIR/_camp.json")" --as user 2>&1 | newid)
if [ -z "$CAMP_REC" ]; then echo "✗ Tạo Chiến dịch lỗi"; cat "$DIR/_camp.json"; exit 1; fi
echo "  ✓ Chiến dịch: $CAMP_REC"

# ===== Thay placeholder __CAMP__ trong _adsets.json (python, KHÔNG dùng sed -i) =====
python "$DIR/buoc2-passB.py" "$DIR" "$CAMP_REC" >/dev/null 2>&1

# ===== Tạo NHÓM QC (Bảng 2) — bắt record_id để gắn vào content =====
R2=$(lark-cli base +record-batch-create --base-token $B --table-id $T2 --json "$(cat "$DIR/_adsets.json")" --as user 2>&1)
if echo "$R2" | grep -q '"ok": *true'; then
  ADSET_IDS=$(echo "$R2" | python -c "import sys,json;print(','.join(json.load(sys.stdin).get('data',{}).get('record_id_list',[])))")
  echo "  ✓ Nhóm QC đã tạo (gắn tệp đối tượng)"
else echo "  ✗ Nhóm QC lỗi"; echo "$R2" | head -3; ADSET_IDS=""; fi

# ===== Tạo CONTENT (Bảng 3) — gắn Chiến dịch + NHÓM QC (LK) + ảnh + caption 4 phần =====
python "$DIR/buoc2-passC.py" "$DIR" "$CAMP_REC" "$ADSET_IDS" >/dev/null 2>&1
R3=$(lark-cli base +record-batch-create --base-token $B --table-id $T3 --json "$(cat "$DIR/_content.json")" --as user 2>&1)
echo "$R3" | grep -q '"ok": *true' && echo "  ✓ Content + ảnh đã tạo (gắn nhóm QC)" || { echo "  ✗ Content lỗi"; echo "$R3" | head -3; }

# ===== Cập nhật Bảng 0 + Nhật ký + thẻ Lark =====
lark-cli base +record-upsert --base-token $B --table-id $T0 --record-id "$REC0" --json '{"Trạng thái":"2. Chờ duyệt Base"}' --as user >/dev/null 2>&1
NOW=$(node -e "const d=new Date(Date.now()+7*3600*1000);console.log(d.toISOString().slice(0,16).replace('T',' '))" 2>/dev/null)
lark-cli base +record-batch-create --base-token $B --table-id $T_NK --json "{\"fields\":[\"Thời điểm\",\"Chiến dịch\",\"Hành động\",\"Người duyệt\",\"Kết quả\"],\"rows\":[[\"$NOW\",\"$TEN\",\"Bước 2: dựng giả chiến trên Lark (Chiến dịch + Nhóm QC + Content + ảnh)\",\"TÔM\",\"Chờ anh duyệt Base trước khi lên Facebook\"]]}" --as user >/dev/null 2>&1
lark-cli im +messages-send --chat-id $CHAT --text "[BƯỚC 2 — Đã dựng giả chiến trên Lark, mời anh DUYỆT]
Lệnh: $TEN
✓ Chiến dịch (Bảng 1) + Nhóm QC (Bảng 2) + Content & ảnh (Bảng 3) đã tạo, liên kết đầy đủ.
URL đích: ${URLMATCH:-（chưa có）}

🔗 Xem trên điện thoại:
• Chiến dịch: $BASE_URL?table=$T1&record=$CAMP_REC
• Nhóm QC: $BASE_URL?table=$T2
• Quảng cáo: $BASE_URL?table=$T3

👉 Ưng thì nhắn TÔM 'lên Facebook $REC0' để đẩy lên Meta (PAUSED)." --as user >/dev/null 2>&1
echo "✓ Xong Bước 2 — đã báo Lark."
rm -f "$DIR"/_b0.json "$DIR"/_b9.json "$DIR"/_b7.json "$DIR"/_rec0.txt "$DIR"/_ten.txt "$DIR"/_url.txt "$DIR"/_camp.json "$DIR"/_adsets.json "$DIR"/_content.json "$DIR"/_cctx.json
