#!/usr/bin/env bash
# nhan-lenh.sh — TỔNG TƯ LỆNH: đọc Bảng 0 NHẬN LỆNH → tạo Chiến dịch + phân sub-agent
# (Content: hook-gen tạo N bài có hook; Setup: tạo N Nhóm QC + Tệp + liên kết) → báo cáo Lark.
B=<BASE_TOKEN_CUA_BAN>
T0=tbl6CP7IPqxgPZFZ; T1=tblVZUVFczZR0enA; T_NHOM=tblRpLFrgdgx2VsL; T_CONTENT=tbl6kluXKbAn8orp
T_TEP=tblutjkd4zn0uah0; T_NK=tbluiFGok8muFkrJ
CHAT=<CHAT_ID_CUA_BAN>
LL=<AUDIENCE_LOOKALIKE>; TT=<AUDIENCE_TUONGTAC>
DIR="$(cd "$(dirname "$0")" && pwd)"; export PYTHONIOENCODING=utf-8
newid(){ python -c "import sys,json;print(json.load(sys.stdin)['data']['record']['record_id_list'][0])" 2>/dev/null; }

lark-cli base +record-list --base-token $B --table-id $T0 --format json --as user > ./_t_cmd.json 2>/dev/null

# 1) Trích lệnh "1. Chờ xử lý" → ghi ./_t_camp.json (payload Chiến dịch) + ./_t_vars.txt
python - <<'PY'
import json,unicodedata
def k(s): return unicodedata.normalize('NFC',str(s)).lower()
def g(m,sub):
    for n,v in m.items():
        if sub in k(n):
            if isinstance(v,list) and v:
                v=v[0]; v=(v.get('text') or v.get('name') or list(v.values())[0]) if isinstance(v,dict) else v
            return v
    return None
d=json.load(open('./_t_cmd.json',encoding='utf-8'));f=d['data']['fields'];rows=d['data']['data'];rid=d['data']['record_id_list']
cmd=None
for r,i in zip(rows,rid):
    m=dict(zip(f,r))
    if '1. chờ xử lý' in k(g(m,'trạng thái') or '') or 'chờ xử lý' in k(g(m,'trạng thái') or ''):
        cmd=(i,m); break
if not cmd:
    open('./_t_vars.txt','w',encoding='utf-8').write('NONE\n'); raise SystemExit
rec0,m=cmd
sp=g(m,'tên lệnh') or 'Sản phẩm'
ngay=g(m,'ngày chạy') or '01012026'
muc=k(g(m,'mức độ') or 'chuyển đổi')
chudich=g(m,'chủ đích') or 'phát triển kinh doanh'
nsach=g(m,'ngân sách') or 200000
cbo=g(m,'chế độ ngân sách') or ''
sonhom=int(g(m,'số nhóm') or 2); sobai=int(g(m,'số bài') or 3)
link=g(m,'link quảng cáo') or ''
khuvuc=g(m,'khu vực') or 'VN'
tuoitu=g(m,'tuổi từ') or 22; tuoiden=g(m,'tuổi đến') or 55
gioi=g(m,'giới tính') or 'Tất cả'
# Map mức độ → Mục tiêu + Loại phễu
if 'chuyển đổi' in muc: muctieu='Chuyển đổi - Lead (form/leadpage)'; pheu='SĂN BẮN'
elif 'tương tác' in muc: muctieu='Tin nhắn (Messenger)'; pheu='NUÔI DƯỠNG'
else: muctieu='Tin nhắn (Messenger)'; pheu='NUÔI DƯỠNG'
chedo='CBO/Advantage (ngân sách ở Chiến dịch)' if 'cbo' in k(cbo) else 'ABO (ngân sách ở Nhóm QC)'
camp={"Tên chiến dịch":sp,"Ngày (DDMMYYYY)":str(ngay),"Loại phễu":pheu,"Mục tiêu":muctieu,
      "Ngân sách ngày":int(float(nsach)) if str(nsach).strip() else 200000,"Chế độ ngân sách":chedo,
      "URL đích (leadpage/sale)":link,"Trạng thái":"1. Chờ dựng (đầu bài)","Lệnh gốc (LK)":[{"id":rec0}]}
json.dump(camp,open('./_t_camp.json','w',encoding='utf-8'),ensure_ascii=False)
with open('./_t_vars.txt','w',encoding='utf-8') as o:
    o.write('\t'.join([rec0,sp,str(sobai),str(sonhom),chudich,khuvuc,str(tuoitu),str(tuoiden),gioi])+'\n')
PY

IFS=$'\t' read -r REC0 SP SOBAI SONHOM CHUDICH KHUVUC TUOITU TUOIDEN GIOI < ./_t_vars.txt
[ "$REC0" = "NONE" ] || [ -z "$REC0" ] && { echo "Không có lệnh '1. Chờ xử lý' trong Bảng 0."; exit 0; }
echo "🎖️ TỔNG TƯ LỆNH nhận lệnh: $SP — $SOBAI bài, $SONHOM nhóm, khu vực $KHUVUC, tuổi $TUOITU-$TUOIDEN"

# LOCK NGAY — đổi sang "2. Đang xử lý" trước khi làm gì, tránh chạy lại trùng
lark-cli base +record-upsert --base-token $B --table-id $T0 --record-id "$REC0" --json '{"Trạng thái":"2. Đang xử lý"}' --as user >/dev/null 2>&1

# 2) Tạo Chiến dịch → lấy CAMP_REC
CAMP_REC=$(lark-cli base +record-upsert --base-token $B --table-id $T1 --json "$(cat ./_t_camp.json)" --as user 2>/dev/null | newid)
echo "  ✓ Tạo Chiến dịch: $CAMP_REC"

# 3) Sub-agent CONTENT: sinh N bài có hook → tạo content gắn chiến dịch
node "$DIR/hook-gen.mjs" --product "$SP" --chudich "$CHUDICH" --n "$SOBAI" --cta "Để lại thông tin để được tư vấn." > ./_t_hooks.json 2>/dev/null
python - "$CAMP_REC" <<'PY'
import json,sys
hooks=json.load(open('./_t_hooks.json',encoding='utf-8'))
rec=sys.argv[1]
rows=[[h['goc']+" - "+h['hook'][:24], [{"id":rec}], h['goc'], h['caption'], "Bật"] for h in hooks]
payload={"fields":["Tên creative","Chiến dịch (LK)","Góc hook","Caption","Trạng thái"],"rows":rows}
json.dump(payload,open('./_t_content.json','w',encoding='utf-8'),ensure_ascii=False)
PY
lark-cli base +record-batch-create --base-token $B --table-id $T_CONTENT --json "$(cat ./_t_content.json)" --as user >/dev/null 2>&1
echo "  ✓ Content: $SOBAI bài có hook (gắn chiến dịch)"

# 4) Sub-agent SETUP: tạo N Nhóm QC gắn chiến dịch + tệp + targeting từ lệnh
for n in $(seq 1 "$SONHOM"); do
  if [ "$n" = "1" ]; then NM="$SP — Lookalike"; AUD=$LL; LO="Lookalike"; else NM="$SP — Tương tác page"; AUD=$TT; LO="Custom - Tương tác (Page/IG/Video)"; fi
  # Tạo nhóm gắn chiến dịch + targeting (chắc chắn) trước
  lark-cli base +record-batch-create --base-token $B --table-id $T_NHOM --json "{\"fields\":[\"Tên nhóm QC\",\"Chiến dịch (LK)\",\"Khu vực (Geo)\",\"Tuổi từ\",\"Tuổi đến\",\"Giới tính\",\"Tối ưu\",\"Vị trí chạy\",\"Trạng thái\"],\"rows\":[[\"$NM\",[{\"id\":\"$CAMP_REC\"}],\"$KHUVUC\",$TUOITU,$TUOIDEN,\"$GIOI\",\"OFFSITE_CONVERSIONS (chuyển đổi web)\",\"Advantage+ (tự động)\",\"Chờ dựng\"]]}" --as user >/dev/null 2>&1
  NHOMREC=$(lark-cli base +record-list --base-token $B --table-id $T_NHOM --format json --as user 2>/dev/null | python -c "import sys,json;d=json.load(sys.stdin);print(d['data']['record_id_list'][-1])" 2>/dev/null)
  # Tạo tệp + gắn vào nhóm (nếu được)
  TEPREC=$(lark-cli base +record-upsert --base-token $B --table-id $T_TEP --json "{\"Tên tệp\":\"$NM-tệp\",\"Loại\":\"$LO\",\"audience_id\":\"$AUD\",\"Trạng thái\":\"Đã tạo\"}" --as user 2>/dev/null | newid)
  [ -n "$TEPREC" ] && [ -n "$NHOMREC" ] && lark-cli base +record-upsert --base-token $B --table-id $T_NHOM --record-id "$NHOMREC" --json "{\"Tệp dùng (LK)\":[{\"id\":\"$TEPREC\"}]}" --as user >/dev/null 2>&1
done
echo "  ✓ Setup: $SONHOM Nhóm QC (gắn tệp + khu vực + tuổi)"

# 5) Cập nhật trạng thái + nhật ký + BÁO CÁO Lark
lark-cli base +record-upsert --base-token $B --table-id $T0 --record-id "$REC0" --json "{\"Trạng thái\":\"4. Chờ anh duyệt\"}" --as user >/dev/null 2>&1
lark-cli base +record-upsert --base-token $B --table-id $T1 --record-id "$CAMP_REC" --json "{\"Trạng thái\":\"2. Chờ duyệt Base\"}" --as user >/dev/null 2>&1
NOW=$(node -e "const d=new Date(Date.now()+7*3600*1000);console.log(d.toISOString().slice(0,16).replace('T',' '))")
lark-cli base +record-batch-create --base-token $B --table-id $T_NK --json "{\"fields\":[\"Thời điểm\",\"Chiến dịch\",\"Hành động\",\"Người duyệt\",\"Kết quả\"],\"rows\":[[\"$NOW\",\"$SP\",\"Tổng tư lệnh nhận lệnh Bảng 0 → tạo Chiến dịch + $SOBAI content(hook) + $SONHOM Nhóm QC + tệp, liên kết hết\",\"TÔM\",\"Chờ anh duyệt Base trước khi lên Meta\"]]}" --as user >/dev/null 2>&1
lark-cli im +messages-send --chat-id $CHAT --text "[TỔNG TƯ LỆNH BÁO CÁO — mời anh DUYỆT]
Lệnh: $SP
✓ Đã tạo Chiến dịch + $SONHOM Nhóm QC (Lookalike/Tương tác, khu vực $KHUVUC, tuổi $TUOITU-$TUOIDEN)
✓ $SOBAI bài content có hook (đội Content soạn)
✓ Tệp đối tượng + liên kết tất cả với nhau

👉 Mở Lark Base xem lại. Ưng thì đổi Trạng thái Chiến dịch sang '3. Duyệt Base - lên Ads' → em đăng lên Meta (PAUSED)." --as user >/dev/null 2>&1
echo "✓ Xong — Tổng tư lệnh đã setup Base + báo cáo Lark."
rm -f ./_t_cmd.json ./_t_camp.json ./_t_vars.txt ./_t_hooks.json ./_t_content.json
