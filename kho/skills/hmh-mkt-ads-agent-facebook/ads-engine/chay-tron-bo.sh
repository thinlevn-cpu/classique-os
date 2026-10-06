#!/usr/bin/env bash
# chay-tron-bo.sh — ĐÓNG GÓI chạy trọn bộ 1 lệnh "1. Chờ xử lý": Bước 2 (giả chiến Lark) -> Bước 3 (Facebook PAUSED).
#   bash chay-tron-bo.sh
DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/config.env"   # B, T0..T9, CHAT, DOMAIN, ACT — cấu hình riêng của bạn
export PATH="$PATH:/c/Program Files/nodejs:/c/Users/Admin/AppData/Roaming/npm"; export PYTHONIOENCODING=utf-8

# Tìm REC0 đang "1. Chờ xử lý"
lark-cli base +record-list --base-token $B --table-id $T0 --format json --as user 2>/dev/null > "$DIR/_tb.json"
REC0=$(python - "$DIR/_tb.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1],encoding='utf-8'))['data'];f=d['fields']
def g(m,s):
 for n,v in m.items():
  if s in n.lower():
   if isinstance(v,list) and v: v=v[0]; v=v.get('text') if isinstance(v,dict) else v
   return v
for row,i in zip(d['data'],d['record_id_list']):
 if 'chờ xử lý' in str(g(dict(zip(f,row)),'trạng thái') or '').lower(): print(i); break
PY
)
rm -f "$DIR/_tb.json"
[ -z "$REC0" ] && { echo "Không có lệnh '1. Chờ xử lý'."; exit 0; }
echo "════════ ĐÓNG GÓI CHẠY TRỌN BỘ — lệnh $REC0 ════════"
echo "──── BƯỚC 2: giả chiến trên Lark ────"
bash "$DIR/buoc2-setup-lark.sh" 2>&1 | grep -vi traceback
echo "──── BƯỚC 3: đẩy lên Facebook (PAUSED) ────"
bash "$DIR/buoc3-len-facebook.sh" "$REC0" 2>&1 | grep -vi traceback
echo "════════ XONG ════════"
