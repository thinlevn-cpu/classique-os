#!/usr/bin/env bash
# chay.sh — ĐỘI QUÂN dựng chiến dịch TỪ BASE bằng 1 lệnh.
# Đọc Bảng Chiến dịch + Thư viện URL → dựng mọi dòng "Chờ dựng" trên Meta (PAUSED)
# → ghi campaign_id + đèn "Đã tạo nháp" về Base → gửi thẻ duyệt Lark.
#
#   bash chay.sh           # XEM KẾ HOẠCH (chưa dựng)
#   bash chay.sh --build   # DỰNG THẬT
set -e
B=<BASE_TOKEN_CUA_BAN>
T1=tblVZUVFczZR0enA          # Chiến dịch
T8=tblKbw29UEO3hGKC          # Thư viện URL
T5=tbluiFGok8muFkrJ          # Nhật ký
CHAT=<CHAT_ID_CUA_BAN>
DIR="$(cd "$(dirname "$0")" && pwd)"
export PYTHONIOENCODING=utf-8

T2=tbl6kluXKbAn8orp          # Nội dung

if [ "$1" = "--build" ]; then echo "▶ Nạp media anh đính…"; bash "$DIR/nap-media.sh" || true; fi

echo "▶ Đọc Base…"
lark-cli base +record-list --base-token $B --table-id $T1 --format json --as user > /tmp/_b1.json 2>/dev/null
lark-cli base +record-list --base-token $B --table-id $T8 --format json --as user > /tmp/_url.json 2>/dev/null
lark-cli base +record-list --base-token $B --table-id $T2 --format json --as user > /tmp/_b2.json 2>/dev/null

echo "▶ Dựng…"
node "$DIR/dung-tu-base.mjs" --campaigns /tmp/_b1.json --urllib /tmp/_url.json --content /tmp/_b2.json $1 2>&1 | grep -v "Assertion\|UV_HANDLE"

WB="$DIR/_writeback.json"
if [ "$1" = "--build" ] && [ -f "$WB" ]; then
  echo "▶ Ghi ngược Base + gửi thẻ duyệt…"
  node -e "
    const wb=require('$WB');
    for(const o of wb) console.log(o.record+'\t'+o.campaign_id+'\t'+o.ten);
  " | while IFS=$'\t' read -r rec cid ten; do
    lark-cli base +record-upsert --base-token $B --table-id $T1 --record-id "$rec" --json "{\"campaign_id\":\"$cid\",\"Trạng thái\":\"Đã tạo nháp\"}" --as user >/dev/null 2>&1
    NOW=$(node -e "const d=new Date(Date.now()+7*3600*1000);console.log(d.toISOString().slice(0,16).replace('T',' '))")
    lark-cli base +record-batch-create --base-token $B --table-id $T5 --json "{\"fields\":[\"Thời điểm\",\"Chiến dịch\",\"Hành động\",\"Người duyệt\",\"Kết quả\"],\"rows\":[[\"$NOW\",\"$ten\",\"Đội AI dựng từ Base (form→base→Meta)\",\"TÔM\",\"campaign $cid PAUSED, chờ bật\"]]}" --as user >/dev/null 2>&1
    lark-cli im +messages-send --chat-id $CHAT --text "[Đội AI dựng xong] $ten — campaign $cid (PAUSED). Vào Ads Manager bật để chạy." --as user >/dev/null 2>&1
    echo "  ✅ $ten → $cid (đã ghi Base + báo Lark)"
  done
  rm -f "$WB"
fi
echo "✓ Xong."
