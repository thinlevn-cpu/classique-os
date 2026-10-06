#!/usr/bin/env python3
# Trích tham số cho Bước 3 từ Bảng 0 (lệnh REC0) + Bảng 1 (chiến dịch linked) + Bảng 2/3 (nhóm/content linked).
# Ghi: _c_meta.json, _c_adsets.json, _c_content.json, _c_camprec.txt, _c_ten.txt, _c_imgtoken.txt
import json,sys,unicodedata,re
DIR,REC0=sys.argv[1],sys.argv[2]
def k(s): return unicodedata.normalize('NFC',str(s)).lower()
def load(n): return json.load(open(DIR+'/'+n,encoding='utf-8'))['data']
def rowmap(d,i_rid):
    f=d['fields']; return [(rid,dict(zip(f,row))) for row,rid in zip(d['data'],d['record_id_list'])]
def g(m,sub):
    for n,v in m.items():
        if sub in k(n):
            if isinstance(v,list) and v: v=v[0]; v=(v.get('text') or v.get('name')) if isinstance(v,dict) else v
            return v
    return None
def gid(m,sub):
    for n,v in m.items():
        if sub in k(n) and isinstance(v,list) and v and isinstance(v[0],dict) and v[0].get('id'): return v[0]['id']
    return None
def gtok(m,sub):
    for n,v in m.items():
        if sub in k(n) and isinstance(v,list) and v and isinstance(v[0],dict) and v[0].get('file_token'): return v[0]['file_token']
    return None
def gtokname(m,*subs):
    for sub in subs:
        for n,v in m.items():
            if sub in k(n) and isinstance(v,list) and v and isinstance(v[0],dict) and v[0].get('file_token'):
                return v[0]['file_token'], v[0].get('name','')
    return '',''
def linked_ids(m,sub):
    for n,v in m.items():
        if sub in k(n) and isinstance(v,list): return [x.get('id') for x in v if isinstance(x,dict) and x.get('id')]
    return []
def num(x):
    try: return float(str(x).replace(',','').strip())
    except: return None

b0=load('_c_b0.json'); b1=load('_c_b1.json'); b2=load('_c_b2.json'); b3=load('_c_b3.json'); b9=load('_c_b9.json')
# Lệnh gốc (Bảng 0)
m0=None
for rid,m in rowmap(b0,0):
    if rid==REC0: m0=m; break
if not m0:
    open(DIR+'/_c_camprec.txt','w').write('NONE'); sys.exit(0)
sp=g(m0,'tên lệnh') or 'Sản phẩm'
# "Pixel ID" Bảng 0 là LINK -> Bảng 9 -> lấy số pixel_id
pixel_recid=gid(m0,'pixel id'); pixelNum=''
if pixel_recid:
    for rid,m9 in rowmap(b9,0):
        if rid==pixel_recid: pixelNum=re.sub(r'\D','',str(g(m9,'pixel_id') or '')); break
pageId=''.join(re.findall(r'\d', str(g(m0,'page chạy') or '')))  # số trong "Hoàng Minh Hóa (103...)"
mpid=re.search(r'(\d{6,})', str(g(m0,'page chạy') or '')); pageId=mpid.group(1) if mpid else pageId
event=g(m0,'sự kiện chuyển đổi') or 'Hoàn tất đăng ký'
budget=num(g(m0,'ngân sách ngày')) or 100000
budgetMode=g(m0,'chế độ ngân sách') or 'CBO'
objective=g(m0,'mức độ') or 'Chuyển đổi'
imgtoken,medianame=gtokname(m0,'video','hình')
mediaType='video' if str(medianame).lower().endswith(('.mp4','.mov','.avi','.mkv','.webm','.m4v')) else 'image'

# Chiến dịch (Bảng 1) linked tới REC0
camprec=None
for rid,m in rowmap(b1,0):
    if REC0 in linked_ids(m,'lệnh gốc'): camprec=rid; cm=m  # giữ cái mới nhất
if not camprec:
    open(DIR+'/_c_camprec.txt','w').write('NONE'); sys.exit(0)
url=g(cm,'url đích') or ''   # URL chuỗi nằm ở Bảng 1 "URL đích" (Bước 2 đã resolve)

# Nhóm QC (Bảng 2) linked tới camprec
adsets=[]
for rid,m in rowmap(b2,0):
    if camprec in linked_ids(m,'chiến dịch'):
        adsets.append({"name":g(m,'tên nhóm') or sp,"geo":g(m,'khu vực') or 'VN',
                       "ageMin":int(num(g(m,'tuổi từ')) or 22),"ageMax":int(num(g(m,'tuổi đến')) or 55),
                       "gender":g(m,'giới tính') or 'Tất cả'})
# Content (Bảng 3) linked tới camprec
contents=[]
for rid,m in rowmap(b3,0):
    if camprec in linked_ids(m,'chiến dịch'):
        contents.append({"caption":g(m,'caption') or '',"hook":g(m,'góc hook') or ''})

meta={"name":sp,"pixelNum":pixelNum,"pageId":pageId,"event":event,"objective":objective,"mediaType":mediaType,
      "budget":budget,"budgetMode":budgetMode,"url":url,"advAudience":0,"tepNums":[]}  # advAudience=0: đối tượng chỉ định. tepNums rỗng (tránh ToS)
json.dump(meta,open(DIR+'/_c_meta.json','w',encoding='utf-8'),ensure_ascii=False)
json.dump(adsets,open(DIR+'/_c_adsets.json','w',encoding='utf-8'),ensure_ascii=False)
json.dump(contents,open(DIR+'/_c_content.json','w',encoding='utf-8'),ensure_ascii=False)
open(DIR+'/_c_camprec.txt','w',encoding='utf-8').write(camprec)
open(DIR+'/_c_ten.txt','w',encoding='utf-8').write(sp)
open(DIR+'/_c_imgtoken.txt','w',encoding='utf-8').write(imgtoken)
open(DIR+'/_c_medianame.txt','w',encoding='utf-8').write(medianame or '')
print(f"OK camp={camprec} adsets={len(adsets)} content={len(contents)} pixel={pixelNum} page={pageId} media={mediaType} event={event}")
