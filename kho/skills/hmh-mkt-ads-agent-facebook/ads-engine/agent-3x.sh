#!/usr/bin/env bash
# agent-3x.sh — Nhịp Ads Agent chạy 3 lần/ngày (Scheduled Task gọi).
# QUÉT Bảng 1 (Chiến dịch) → mọi campaign ĐANG CHẠY có campaign_id → kéo số thật Meta →
# decide → GHI Bảng 5 (Số liệu hằng ngày, link Chiến dịch) → GỬI thẻ cho TÔM/anh trên Lark.
# Im lặng nếu không có campaign đang chạy (không spam).
#   bash agent-3x.sh                 # production (quét Bảng 1, số Meta thật)
#   bash agent-3x.sh --simulate      # test 1 dòng từ Bảng 0 (số giả)
DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/config.env"   # B, T0..T9, T5, CHAT, DOMAIN, ACT — cấu hình riêng của bạn
export PATH="$PATH:/c/Program Files/nodejs:/c/Users/Admin/AppData/Roaming/npm"
export PYTHONIOENCODING=utf-8

if [ "$1" = "--simulate" ]; then
  lark-cli base +record-list --base-token $B --table-id $T0 --format json --as user 2>/dev/null > "$DIR/_b0.json"
  OUT=$(node "$DIR/agent-3x.mjs" --targets "$DIR/_b0.json" --simulate 2>&1)
else
  lark-cli base +record-list --base-token $B --table-id $T1 --format json --as user 2>/dev/null > "$DIR/_b1.json"
  OUT=$(node "$DIR/agent-3x.mjs" --scan "$DIR/_b1.json" 2>&1)
fi

RESULT=$(echo "$OUT" | grep '^RESULT::' | sed 's/^RESULT:://')
if [ -z "$RESULT" ]; then echo "LỖI engine:"; echo "$OUT"; rm -f "$DIR"/_b0.json "$DIR"/_b1.json; exit 1; fi
echo "$RESULT" > "$DIR/_res.json"

# Số campaign xử lý
N=$(python - "$DIR/_res.json" <<'PY'
import json,sys; print(len(json.load(open(sys.argv[1],encoding='utf-8'))))
PY
)
if [ "$N" = "0" ]; then echo "• Không có chiến dịch đang chạy — bỏ qua (không gửi gì)."; rm -f "$DIR"/_b0.json "$DIR"/_b1.json "$DIR"/_res.json; exit 0; fi

# Lặp từng campaign: ghi Bảng 5 (link Chiến dịch nếu có recordId) + gửi thẻ Lark
for i in $(seq 0 $((N-1))); do
  python - "$DIR/_res.json" "$i" "$DIR/_b5.json" "$DIR/_card.txt" <<'PY'
import json,sys
res=json.load(open(sys.argv[1],encoding='utf-8')); it=res[int(sys.argv[2])]
b=dict(it['bang5'])
if it.get('recordId'): b["Chiến dịch (LK)"]=[{"id":it['recordId']}]
fields=list(b.keys()); row=[b[k] for k in fields]
open(sys.argv[3],'w',encoding='utf-8').write(json.dumps({"fields":fields,"rows":[row]},ensure_ascii=False))
open(sys.argv[4],'w',encoding='utf-8').write(it['card'])
PY
  lark-cli base +record-batch-create --base-token $B --table-id $T5 --json "$(cat "$DIR/_b5.json")" --as user >/dev/null 2>&1 && echo "  ✓ Bảng 5 #$i" || echo "  ✗ Bảng 5 #$i"
  lark-cli im +messages-send --chat-id $CHAT --text "$(cat "$DIR/_card.txt")" --as user >/dev/null 2>&1 && echo "  ✓ Thẻ Lark #$i" || echo "  ✗ Thẻ Lark #$i"
done

python - "$DIR/_res.json" <<'PY'
import json,sys
for it in json.load(open(sys.argv[1],encoding='utf-8')):
    print('  ➜',it['severity'],'|',it['bang5'].get('Ad set'),'| cần duyệt:',it['needApprove'])
PY
rm -f "$DIR"/_b0.json "$DIR"/_b1.json "$DIR"/_res.json "$DIR"/_b5.json "$DIR"/_card.txt
