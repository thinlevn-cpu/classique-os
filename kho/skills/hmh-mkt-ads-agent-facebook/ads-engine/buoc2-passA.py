#!/usr/bin/env python3
# PASS A của Bước 2: đọc Bảng 0 (lệnh "1. Chờ xử lý") -> _camp.json + _adsets.json (placeholder __CAMP__, có Tệp dùng LK) + _cctx.json (ngữ cảnh content) + _rec0.txt + _ten.txt
# QUY TẮC CAPTION: 4 phần — Hook (FOMO + có số) / Vấn đề khách / Giải pháp / CTA. KHÔNG ghi chú nội bộ. KHÔNG icon, KHÔNG em-dash.
import json,sys,unicodedata,re
DIR=sys.argv[1]
def k(s): return unicodedata.normalize('NFC',str(s)).lower()
def g(m,sub):
    for n,v in m.items():
        if sub in k(n):
            if isinstance(v,list) and v:
                v=v[0]; v=(v.get('text') or v.get('name') or (list(v.values())[0] if v else None)) if isinstance(v,dict) else v
            return v
    return None
def gid(m,sub):   # lấy record_id của ô link (vd Nhóm đối tượng / Tệp)
    for n,v in m.items():
        if sub in k(n) and isinstance(v,list) and v and isinstance(v[0],dict) and v[0].get('id'):
            return v[0]['id']
    return None
def gtok(m,sub):
    for n,v in m.items():
        if sub in k(n) and isinstance(v,list) and v and isinstance(v[0],dict) and v[0].get('file_token'):
            return v[0]['file_token']
    return None
d=json.load(open(DIR+'/_b0.json',encoding='utf-8'))['data']; f=d['fields']; rows=d['data']; rid=d['record_id_list']
cmd=None
for r,i in zip(rows,rid):
    m=dict(zip(f,r))
    if 'chờ xử lý' in k(g(m,'trạng thái') or ''):
        cmd=(i,m); break
if not cmd:
    open(DIR+'/_rec0.txt','w',encoding='utf-8').write('NONE'); sys.exit(0)
rec0,m=cmd
def num(x):
    try: return float(str(x).replace(',','').strip())
    except: return None
sp=g(m,'tên lệnh') or 'Sản phẩm'
ngay_raw=str(g(m,'ngày chạy') or ''); mn=re.search(r'(\d{4})-(\d{2})-(\d{2})',ngay_raw)
ngay=(mn.group(3)+mn.group(2)+mn.group(1)) if mn else '01012026'
muc=k(g(m,'mức độ') or 'chuyển đổi'); nsach=g(m,'ngân sách ngày') or 200000; cbo=k(g(m,'chế độ ngân sách') or '')
sonhom=int(float(g(m,'số nhóm') or 2)); sobai=int(float(g(m,'số bài') or 2))
url_recid=gid(m,'url'); url=''; vitri=g(m,'vị trí') or 'VN'   # "URL" Bảng 0 là field LINK -> Bảng 7
tuoitu=int(float(g(m,'tuổi từ') or 22)); tuoiden=int(float(g(m,'tuổi đến') or 55)); gioi=g(m,'giới tính') or 'Tất cả'
pixel_recid=gid(m,'pixel id')   # "Pixel ID" Bảng 0 là field LINK -> Bảng 9
skien=g(m,'sự kiện chuyển đổi') or ''; page=g(m,'page chạy') or ''
giaP=g(m,'giá bán p'); cpV=g(m,'chi phí biến đổi v'); bienLN=g(m,'biên ln'); tlLead=g(m,'tỷ lệ lead'); tlChat=g(m,'tỷ lệ chat')
tongtran=g(m,'tổng trần'); mongmuon=g(m,'mong muốn') or ''
noidau=g(m,'nỗi đau') or ''; suong=g(m,'sự sung sướng') or ''; img=gtok(m,'video') or gtok(m,'hình')
tep=gid(m,'nhóm đối tượng') or gid(m,'tệp')   # record id tệp ở Bảng 4
target=g(m,'target') or ''                    # Target (thủ công) -> Nhắm mục tiêu chi tiết (Bảng 2)
pmid=re.search(r'(\d{6,})',str(page)); page_id=pmid.group(1) if pmid else ''
if 'chuyển đổi' in muc: muctieu='Chuyển đổi - Lead (form/leadpage)'; pheu='SĂN BẮN'
elif 'tin nhắn' in muc or 'tương tác' in muc: muctieu='Tin nhắn (Messenger)'; pheu='NUÔI DƯỠNG'
else: muctieu='Chuyển đổi - Lead (form/leadpage)'; pheu='SĂN BẮN'
chedo='CBO/Advantage (ngân sách ở chiến dịch)' if ('cbo' in cbo or 'advantage' in cbo) else 'ABO (ngân sách ở Nhóm QC)'
camp={"Tên chiến dịch":sp,"Ngày (DDMMYYYY)":ngay,"Loại phễu":pheu,"Mục tiêu":muctieu,
      "Ngân sách ngày":int(num(nsach) or 0),"Chế độ ngân sách":chedo,"URL đích (leadpage/sale)":url,
      "Trạng thái":"2. Chờ duyệt Base","Lệnh gốc (LK)":[{"id":rec0}],"Sự kiện chuyển đổi":skien}
for key,val in [("Giá bán P",giaP),("Chi phí biến đổi V",cpV),("Lợi nhuận muốn giữ",bienLN),
                ("Tỷ lệ lead to đơn",tlLead),("Tỷ lệ chat to đơn",tlChat),("Trần chi tiêu cứng",tongtran)]:
    nv=num(val)
    if nv is not None: camp[key]=nv
if pixel_recid: camp["pixel_id"]=[{"id":pixel_recid}]   # Bảng 1 pixel_id link cùng record Bảng 9
if page_id: camp["page_id"]=page_id
# URL: (a) nếu Bảng 0 đã LINK 1 record Bảng 7 -> lấy URL record đó; (b) nếu trống -> TỰ KHỚP Bảng 7 theo số offer
try:
    b7=json.load(open(DIR+'/_b7.json',encoding='utf-8'))['data']; f7=b7['fields']
    def url_in(s):
        mm=re.search(r'https?://[^\s\]\)]+', str(s)); return mm.group(0) if mm else ''
    rows7=[(rid,dict(zip(f7,row))) for row,rid in zip(b7['data'],b7['record_id_list'])]
    if url_recid:                                  # (a) đã chọn link
        for rid,m7 in rows7:
            if rid==url_recid: url=url_in(g(m7,'url') or ''); break
    if not url:                                     # (b) auto-match theo số (vd 1000)
        mp=re.search(r'(\d{3,})', sp); pnum=mp.group(1) if mp else None
        for rid,m7 in rows7:
            u7=url_in(g(m7,'url') or ''); name7=str(g(m7,'tên') or '')
            if u7 and pnum and (pnum in name7 or pnum in u7): url=u7; break
except Exception: pass
camp["URL đích (leadpage/sale)"]=url
json.dump(camp,open(DIR+'/_camp.json','w',encoding='utf-8'),ensure_ascii=False)
open(DIR+'/_url.txt','w',encoding='utf-8').write(url)
# Geo: ƯU TIÊN "Vị trí phân phối" (không dùng Mong muốn để tránh sai). Tất cả nhóm cùng geo này.
vt=k(vitri)
if 'hồ chí minh' in vt or 'hcm' in vt: geo1='Hồ Chí Minh'
elif 'hà nội' in vt or 'ha noi' in vt: geo1='Hà Nội'
elif 'đà nẵng' in vt: geo1='Đà Nẵng'
elif 'toàn quốc' in vt or 'cả nước' in vt or vt.strip() in ('vn','việt nam',''): geo1='VN'
else: geo1=vitri
geos=[geo1]*sonhom
# ----- NHÓM QC: gắn Tệp đối tượng (Tệp dùng (LK)) -----
tepcell=[{"id":tep}] if tep else []
nrows=[]
for i in range(sonhom):
    geo=geos[i] if i<len(geos) else 'VN'
    nrows.append([f"{sp} — {geo}", [{"id":"__CAMP__"}], tepcell, geo, tuoitu, tuoiden, gioi,
                  "OFFSITE_CONVERSIONS (chuyển đổi web)", "Advantage+ (tự động)", "Chờ dựng", target])
json.dump({"fields":["Tên nhóm QC","Chiến dịch (LK)","Tệp dùng (LK)","Khu vực (Geo)","Tuổi từ","Tuổi đến","Giới tính","Tối ưu","Vị trí chạy","Trạng thái","Nhắm mục tiêu chi tiết"],"rows":nrows},
          open(DIR+'/_adsets.json','w',encoding='utf-8'),ensure_ascii=False)
# ----- CAPTION 4 phần: Hook(FOMO+số) / Vấn đề / Giải pháp / CTA -----
def firstline(t):
    for ln in str(t).split('\n'):
        ln=ln.strip()
        if ln and not ln.startswith('(') and (ln[0].isdigit() or len(ln)>15):
            return re.sub(r'^\d+\.\s*','',ln)
    return ''
def clean(t):  # bỏ em-dash/gạch dài (quy tắc content), gọn khoảng trắng
    return re.sub(r'\s+',' ', str(t).replace('—',',').replace('–',',').replace(' - ', ', ')).strip().rstrip('.,')
pain=clean(firstline(noidau)); want=clean(firstline(suong))
mnum=re.search(r'(\d[\d.]{2,})', sp); n=mnum.group(1) if mnum else '1000'
# Linh hoạt theo loại: ebook/lead-magnet (tải miễn phí) vs chương trình/engagement (xem/tìm hiểu)
is_eng = ('tương tác' in muc) or ('tin nhắn' in muc) or ('engagement' in muc)
is_ebook = 'ebook' in k(sp)
noun = 'Ebook' if is_ebook else ('Chương trình' if 'chương trình' in k(sp) else '')
ten_q = '"'+re.sub(r'^([Ee]book|[Cc]hương trình)\s+','',sp).strip()+'"'
prod = (noun+' '+ten_q).strip()
cta = "Xem ngay và tìm hiểu chi tiết bên dưới." if is_eng else ("Nhận miễn phí ngay hôm nay, số lượng có hạn." if is_ebook else "Đăng ký ngay hôm nay, số lượng có hạn.")
def caption(angle):
    if angle=='Nỗi đau':
        hook=f"Hơn 90% chủ doanh nghiệp đang bỏ lỡ tới {n} khách hàng tiềm năng mỗi tháng chỉ vì làm marketing sai cách."
        prob=(pain+'.') if pain else "Khách đến nhỏ giọt, tháng có tháng không, vì chưa có hệ thống marketing bài bản."
        sol=f"{prod} chỉ bạn cách dựng hệ thống marketing kéo khách về đều đặn."
    elif angle.startswith('Khát'):
        hook=f"Hình dung mỗi ngày có thêm hàng chục khách hàng tiềm năng tìm đến, hướng tới mốc {n} khách."
        prob=("Bạn khao khát "+want.lower()+".") if want else "Nhiều chủ doanh nghiệp loay hoay mãi vì làm marketing thiếu hệ thống."
        sol=f"{prod} trao bạn lộ trình marketing bài bản, tự ra khách đều đặn."
    else:
        hook=f"Không cần giỏi công nghệ, vẫn có thể chạm mốc {n} khách hàng tiềm năng."
        prob="Bạn nghĩ marketing online phức tạp và tốn kém? Đó là lý do nhiều người bỏ cuộc giữa chừng."
        sol=f"{prod} chia nhỏ thành từng bước đơn giản, ai cũng làm theo được."
    return f"{hook}\n\n{prob}\n\n{sol}\n\n{cta}"
angles=['Nỗi đau','Khát khao / Kết quả','Phản bác từ chối'][:max(sobai,1)]
caps=[(a, caption(a)) for a in angles]
json.dump({"sp":sp,"caps":caps,"img":img}, open(DIR+'/_cctx.json','w',encoding='utf-8'),ensure_ascii=False)
open(DIR+'/_rec0.txt','w',encoding='utf-8').write(rec0)
open(DIR+'/_ten.txt','w',encoding='utf-8').write(sp)
print("OK")
