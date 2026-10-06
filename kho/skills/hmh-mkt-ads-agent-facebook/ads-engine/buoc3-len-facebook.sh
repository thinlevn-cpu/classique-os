#!/usr/bin/env bash
# buoc3-len-facebook.sh — BƯỚC 3: đẩy giả chiến (Bảng 1/2/3) lên Facebook Ads (PAUSED).
#   bash buoc3-len-facebook.sh                # xử lý chiến dịch của lệnh ID gốc mặc định
#   bash buoc3-len-facebook.sh <REC0_Bảng0>   # chỉ định lệnh gốc khác
set +e
DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/config.env"   # B, T0..T9, T_NK, CHAT, DOMAIN, ACT — cấu hình riêng của bạn
REC0="${1:-$REC0_DEFAULT}"
export PATH="$PATH:/c/Program Files/nodejs:/c/Users/Admin/AppData/Roaming/npm"
export PYTHONIOENCODING=utf-8

for t in "0:$T0" "1:$T1" "2:$T2" "3:$T3" "4:$T4" "9:$T9"; do
  lark-cli base +record-list --base-token $B --table-id ${t#*:} --format json --as user 2>/dev/null > "$DIR/_c_b${t%%:*}.json"
done

# Trích tham số Meta + adsets + content (python) -> _c_meta.json / _c_adsets.json / _c_content.json / _c_camprec.txt / _c_imgtoken.txt
python "$DIR/buoc3-extract.py" "$DIR" "$REC0" 2>&1
CAMPREC=$(cat "$DIR/_c_camprec.txt" 2>/dev/null)
if [ -z "$CAMPREC" ] || [ "$CAMPREC" = "NONE" ]; then echo "Không tìm thấy chiến dịch cho lệnh $REC0 (cần chạy Bước 2 trước)."; rm -f "$DIR"/_c_*.json "$DIR"/_c_*.txt; exit 0; fi
TEN=$(cat "$DIR/_c_ten.txt" 2>/dev/null)
echo "🚀 Đẩy lên Facebook: $TEN (camp Base $CAMPREC)"

# Tải media (ảnh/video) từ Bảng 0 — tên file cố định (đuôi không quan trọng, driver đọc bytes)
IMGTOKEN=$(cat "$DIR/_c_imgtoken.txt" 2>/dev/null)
MEDIA=""
if [ -n "$IMGTOKEN" ]; then
  echo "  ⏳ tải media (có thể lâu nếu video lớn)..."
  for try in 1 2 3; do
    rm -f "$DIR/_c_mediafile"
    # --output yêu cầu PATH TƯƠNG ĐỐI (path tuyệt đối bị từ chối) -> cd vào DIR rồi dùng tên tương đối
    ( cd "$DIR" && lark-cli base +record-download-attachment --base-token $B --table-id $T0 --record-id $REC0 --file-token "$IMGTOKEN" --output "_c_mediafile" --overwrite --as user >/dev/null 2>"_c_dlerr.txt" )
    [ -f "$DIR/_c_mediafile" ] && [ "$(wc -c < "$DIR/_c_mediafile")" -gt 1000 ] && break
    echo "    (thử lại tải $try)"; sleep 5
  done
  if [ -f "$DIR/_c_mediafile" ] && [ "$(wc -c < "$DIR/_c_mediafile")" -gt 1000 ]; then MEDIA="$DIR/_c_mediafile"; echo "  ✓ tải media ($(wc -c < "$DIR/_c_mediafile") bytes)"; else echo "  ✗ tải media lỗi:"; head -3 "$DIR/_c_dlerr.txt"; fi
fi

# Gọi driver Meta (PAUSED)
OUT=$(node "$DIR/buoc3.mjs" --dir "$DIR" --media "$MEDIA" 2>&1)
RES=$(echo "$OUT" | grep '^RESULT::' | sed 's/^RESULT:://')
echo "$OUT" | grep -v '^RESULT::'
if [ -z "$RES" ]; then echo "✗ Driver không trả kết quả:"; echo "$OUT" | head; rm -f "$DIR"/_c_*; exit 1; fi
echo "$RES" > "$DIR/_c_res.json"

# Ghi ngược campaign_id + status + báo Lark
python - "$DIR" "$CAMPREC" <<'PY' > "$DIR/_c_wb.txt"
import json,sys
DIR,CAMPREC=sys.argv[1],sys.argv[2]
r=json.load(open(DIR+'/_c_res.json',encoding='utf-8'))
print(r.get('campaign_id') or '')
print('OK' if r.get('ok') else 'FAIL')
print(' | '.join(r.get('log',[]))[:400])
PY
CID=$(sed -n '1p' "$DIR/_c_wb.txt"); OK=$(sed -n '2p' "$DIR/_c_wb.txt"); LOG=$(sed -n '3p' "$DIR/_c_wb.txt")
echo "  Kết quả: $OK | $LOG"
if [ -n "$CID" ]; then
  lark-cli base +record-upsert --base-token $B --table-id $T1 --record-id "$CAMPREC" --json "{\"campaign_id\":\"$CID\",\"Trạng thái\":\"4. Đã lên Meta (PAUSED)\"}" --as user >/dev/null 2>&1
  lark-cli base +record-upsert --base-token $B --table-id $T0 --record-id "$REC0" --json '{"Trạng thái":"4. Đã lên Meta (PAUSED)"}' --as user >/dev/null 2>&1
  NOW=$(node -e "const d=new Date(Date.now()+7*3600*1000);console.log(d.toISOString().slice(0,16).replace('T',' '))" 2>/dev/null)
  lark-cli base +record-batch-create --base-token $B --table-id $T_NK --json "{\"fields\":[\"Thời điểm\",\"Chiến dịch\",\"Hành động\",\"Người duyệt\",\"Kết quả\"],\"rows\":[[\"$NOW\",\"$TEN\",\"Bước 3: đẩy lên Facebook Ads (PAUSED)\",\"TÔM\",\"campaign $CID PAUSED, chờ anh bật trong Ads Manager\"]]}" --as user >/dev/null 2>&1
  lark-cli im +messages-send --chat-id $CHAT --text "[BƯỚC 3 — Đã lên Facebook (PAUSED)]
Lệnh: $TEN
✓ Campaign Meta: $CID (PAUSED)
$LOG

🔗 Kiểm tra trên điện thoại:
• Ads Manager: https://www.facebook.com/adsmanager/manage/adsets?act=$ACT&selected_campaign_ids=$CID
• Base (record): $DOMAIN/base/$B?table=$T1&record=$CAMPREC

👉 BẬT trong Ads Manager để chạy. Agent tự canh 3 nhịp/ngày." --as user >/dev/null 2>&1
fi
rm -f "$DIR"/_c_*.json "$DIR"/_c_*.txt "$DIR"/_c_img.png
echo "✓ Xong Bước 3."
