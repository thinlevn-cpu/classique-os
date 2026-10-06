#!/usr/bin/env bash
# nap-media.sh — Tải video/ảnh anh ĐÍNH trong Bảng Nội dung (Lark) → đẩy lên Trang FB → ghi Media ID.
# Chạy trước khi dựng. Bỏ qua dòng đã có Media ID (khử trùng).
set -e
B=<BASE_TOKEN_CUA_BAN>
T2=tbl6kluXKbAn8orp
PAGE=<PAGE_ID_CUA_BAN>
DIR="$(cd "$(dirname "$0")" && pwd)"
export PYTHONIOENCODING=utf-8
mkdir -p "$DIR/media"

lark-cli base +record-list --base-token $B --table-id $T2 --format json --as user > ./_t_b2.json 2>/dev/null

# Lấy (record_id, file_token, tên file) các dòng có đính video nhưng chưa có Media ID
python - "$DIR" <<'PY' > ./_t_media_todo.txt
import json,sys,unicodedata
d=json.load(open('./_t_b2.json',encoding='utf-8'))
f=d['data']['fields'];rows=d['data']['data'];rid=d['data']['record_id_list']
def key(s): return unicodedata.normalize('NFC',s).lower()
li=[i for i,n in enumerate(f) if 'link hình' in key(n)]
mi=[i for i,n in enumerate(f) if 'media id' in key(n)]
li=li[0] if li else None; mi=mi[0] if mi else None
for r,rec in zip(rows,rid):
    if li is None: continue
    att=r[li]; mid=(r[mi] if mi is not None else None)
    if mid: continue                      # đã có Media ID → bỏ
    if isinstance(att,list) and att and isinstance(att[0],dict):
        ft=att[0].get('file_token'); nm=att[0].get('name','file')
        if ft: print(rec+'\t'+ft+'\t'+nm)
PY

N=$(wc -l < ./_t_media_todo.txt | tr -d ' ')
echo "▶ $N media cần nạp."
[ "$N" = "0" ] && { echo "✓ Không có gì để nạp."; exit 0; }

while IFS=$'\t' read -r rec ft nm; do
  [ -z "$rec" ] && continue
  echo "  • tải: $nm"
  lark-cli base +record-download-attachment --base-token $B --table-id $T2 --record-id "$rec" --file-token "$ft" --output "./output/2026-06-19-yt-facebook-messenger-ads/ads-engine/media/" --as user >/dev/null 2>&1 || { echo "    ✗ tải lỗi"; continue; }
  VID=$(node "$DIR/lib/meta.mjs" upload-video-page --page $PAGE --file "$DIR/media/$nm" --published false --desc "$nm" 2>/dev/null | grep -oE '"id":"[0-9]+"' | grep -oE '[0-9]+' | head -1)
  if [ -n "$VID" ]; then
    lark-cli base +record-upsert --base-token $B --table-id $T2 --record-id "$rec" --json "{\"Media ID (Meta)\":\"video:$VID\"}" --as user >/dev/null 2>&1
    echo "    ✅ Media ID = video:$VID"
  else echo "    ✗ upload lỗi"; fi
done < ./_t_media_todo.txt
echo "✓ Nạp media xong."
