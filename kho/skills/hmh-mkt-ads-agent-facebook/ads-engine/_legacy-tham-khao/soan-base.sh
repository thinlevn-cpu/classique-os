#!/usr/bin/env bash
# soan-base.sh — BƯỚC 2: Tổng chỉ huy HOÀN THIỆN trên Lark Base (chưa đụng Meta).
# Với mỗi chiến dịch "1. Chờ dựng": tạo 2 Nhóm QC + 3 Content gắn link, rà soát đầu bài,
# đổi trạng thái "2. Chờ duyệt Base" + gửi thẻ rà soát lên Lark cho anh duyệt.
B=<BASE_TOKEN_CUA_BAN>
T_CAMP=tblVZUVFczZR0enA; T_NHOM=tblRpLFrgdgx2VsL; T_CONTENT=tbl6kluXKbAn8orp
T_TEP=tblutjkd4zn0uah0; T_URL=tblKbw29UEO3hGKC; T_NK=tbluiFGok8muFkrJ
CHAT=<CHAT_ID_CUA_BAN>
LL=<AUDIENCE_LOOKALIKE>; TT=<AUDIENCE_TUONGTAC>   # audience_id Lookalike / Tương tác
export PYTHONIOENCODING=utf-8

lark-cli base +record-list --base-token $B --table-id $T_CAMP --format json --as user > ./_t_c.json 2>/dev/null
lark-cli base +record-list --base-token $B --table-id $T_URL  --format json --as user > ./_t_u.json 2>/dev/null
lark-cli base +record-list --base-token $B --table-id $T_TEP  --format json --as user > ./_t_t.json 2>/dev/null

# Tìm chiến dịch "Chờ dựng" + rà soát đầu bài + khớp URL
read REC TEN NHA RASOAT <<<"$(python - <<'PY'
import json,unicodedata
def k(s): return unicodedata.normalize('NFC',s).lower()
def cell(m,sub):
    for n,v in m.items():
        if sub in k(n):
            if isinstance(v,list) and v: v=v[0]; v=v.get('text') or v.get('name') or list(v.values())[0] if isinstance(v,dict) else v
            return v
    return None
d=json.load(open('./_t_c.json',encoding='utf-8'));f=d['data']['fields'];rows=d['data']['data'];rid=d['data']['record_id_list']
for r,i in zip(rows,rid):
    m=dict(zip(f,r))
    if 'chờ dựng' in k(str(cell(m,'trạng thái') or '')):
        ten=cell(m,'tên chiến dịch') or '?'
        miss=[x for x,fn in [('Ngày','ngày (ddmmyyyy)'),('Loại phễu','loại phễu'),('Giá','giá bán'),('Ngân sách','ngân sách ngày')] if not cell(m,fn)]
        print(i, ten.replace(' ','_'), k(ten).replace(' ',''), ('THIEU:'+','.join(miss)) if miss else 'OK')
        break
PY
)"
[ -z "$REC" ] && { echo "Không có chiến dịch '1. Chờ dựng'."; exit 0; }
TEN="${TEN//_/ }"
echo "▶ Soạn Base cho: $TEN ($REC) — rà soát đầu bài: $RASOAT"

# Đảm bảo có 2 tệp trong Bảng Tệp, lấy record_id
ensure_tep() { # $1=tên $2=loại $3=audience_id
  local id=$(python - "$1" <<'PY'
import json,sys,unicodedata
d=json.load(open('./_t_t.json',encoding='utf-8'));f=d['data']['fields'];rows=d['data']['data'];rid=d['data']['record_id_list']
want=unicodedata.normalize('NFC',sys.argv[1]).lower()
ti=[i for i,n in enumerate(f) if 'tên tệp' in unicodedata.normalize('NFC',n).lower()]
ti=ti[0] if ti else 0
for r,i in zip(rows,rid):
    v=r[ti]; v=v[0] if isinstance(v,list) and v else v
    if v and want in unicodedata.normalize('NFC',str(v)).lower(): print(i); break
PY
)
  if [ -z "$id" ]; then
    id=$(lark-cli base +record-upsert --base-token $B --table-id $T_TEP --json "{\"Tên tệp\":\"$1\",\"Loại\":\"$2\",\"audience_id\":\"$3\",\"Trạng thái\":\"Đã tạo\"}" --as user 2>/dev/null | grep -oE 'rec[A-Za-z0-9]{8,}' | head -1)
  fi
  echo "$id"
}
TEP_LL=$(ensure_tep "Lookalike DREAM100 1%" "Lookalike" "$LL")
TEP_TT=$(ensure_tep "Tương tác page MAD" "Custom - Tương tác (Page/IG/Video)" "$TT")

# Tạo 2 Nhóm QC gắn link chiến dịch + tệp (geo VN mặc định)
mk_nhom() { # $1=tên $2=tep_rec
  lark-cli base +record-batch-create --base-token $B --table-id $T_NHOM --json "{\"fields\":[\"Tên nhóm QC\",\"Chiến dịch (LK)\",\"Tệp dùng (LK)\",\"Khu vực (Geo)\",\"Tuổi từ\",\"Tuổi đến\",\"Giới tính\",\"Tối ưu\",\"Vị trí chạy\",\"Trạng thái\"],\"rows\":[[\"$1\",[{\"id\":\"$REC\"}],[{\"id\":\"$2\"}],\"VN (cả nước)\",22,55,\"Tất cả\",\"OFFSITE_CONVERSIONS (chuyển đổi web)\",\"Advantage+ (tự động)\",\"Chờ dựng\"]]}" --as user >/dev/null 2>&1
}
mk_nhom "$TEN — Lookalike" "$TEP_LL"
mk_nhom "$TEN — Tương tác page" "$TEP_TT"
echo "  ✓ 2 Nhóm QC (gắn tệp + geo VN)"

# Tạo 3 Content gắn link chiến dịch (caption mẫu; anh thay video/caption sau)
lark-cli base +record-batch-create --base-token $B --table-id $T_CONTENT --json "{\"fields\":[\"Tên creative\",\"Chiến dịch (LK)\",\"Góc hook\",\"Caption\",\"Trạng thái\"],\"rows\":[[\"$TEN - Nỗi đau\",[{\"id\":\"$REC\"}],\"Nỗi đau\",\"(đính video + sửa caption) Đổ tiền quảng cáo mà đơn nhỏ giọt? Thường do chưa có hệ thống đúng. Để lại thông tin nhận tư vấn.\",\"Bật\"],[\"$TEN - Kết quả\",[{\"id\":\"$REC\"}],\"Khát khao / Kết quả\",\"(đính video + sửa caption) Mỗi đồng quảng cáo mang về gấp ba kết quả nhờ quy trình rõ ràng. Đăng ký nhận lộ trình.\",\"Bật\"],[\"$TEN - Phản bác\",[{\"id\":\"$REC\"}],\"Phản bác từ chối\",\"(đính video + sửa caption) Không cần giỏi công nghệ. Chỉ cần làm đúng từng bước. Để lại thông tin bắt đầu.\",\"Bật\"]]}" --as user >/dev/null 2>&1
echo "  ✓ 3 Content (gắn chiến dịch)"

# Đổi trạng thái + nhật ký + thẻ rà soát
lark-cli base +record-upsert --base-token $B --table-id $T_CAMP --record-id "$REC" --json "{\"Trạng thái\":\"2. Chờ duyệt Base\"}" --as user >/dev/null 2>&1
NOW=$(node -e "const d=new Date(Date.now()+7*3600*1000);console.log(d.toISOString().slice(0,16).replace('T',' '))")
lark-cli base +record-batch-create --base-token $B --table-id $T_NK --json "{\"fields\":[\"Thời điểm\",\"Chiến dịch\",\"Hành động\",\"Người duyệt\",\"Kết quả\"],\"rows\":[[\"$NOW\",\"$TEN\",\"Bước 2: Tổng chỉ huy hoàn thiện Base (2 nhóm + 3 content + link). Rà soát: $RASOAT\",\"TÔM\",\"Chờ anh duyệt Base trước khi lên Ads\"]]}" --as user >/dev/null 2>&1
lark-cli im +messages-send --chat-id $CHAT --text "[BƯỚC 2 — Đã soạn xong trên Base, mời anh DUYỆT]
Chiến dịch: $TEN
Đã tạo: 2 Nhóm QC (Lookalike + Tương tác, geo VN) · 3 Content (gắn link)
Rà soát đầu bài: $RASOAT

👉 Mở Lark Base xem lại (nhóm/tệp/content/link). Ưng thì đổi Trạng thái sang '3. Duyệt Base - lên Ads' → em đưa lên Meta (PAUSED). Cần sửa thì sửa thẳng trên Base." --as user >/dev/null 2>&1
echo "✓ Xong Bước 2 — đã gửi thẻ duyệt Base lên Lark."
