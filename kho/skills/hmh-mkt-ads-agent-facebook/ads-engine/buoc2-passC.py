#!/usr/bin/env python3
# PASS C: dựng _content.json — gắn Content vào Chiến dịch + NHÓM QC (LK) + ảnh + caption 4 phần.
#   python buoc2-passC.py <DIR> <CAMP_REC> <adset_id1,adset_id2,...>
import json,sys
DIR,CAMP=sys.argv[1],sys.argv[2]
adset_ids=[a for a in (sys.argv[3].split(',') if len(sys.argv)>3 else []) if a]
c=json.load(open(DIR+'/_cctx.json',encoding='utf-8'))
imgcell=[{"file_token":c['img']}] if c.get('img') else []
nhomlk=[{"id":a} for a in adset_ids]          # gắn content vào TẤT CẢ nhóm QC
crows=[[f"{c['sp']} - {hook}", [{"id":CAMP}], nhomlk, hook, cap, "Bật", imgcell] for hook,cap in c['caps']]
json.dump({"fields":["Tên creative","Chiến dịch (LK)","Nhóm QC (LK)","Góc hook","Caption","Trạng thái","Link hình/video"],"rows":crows},
          open(DIR+'/_content.json','w',encoding='utf-8'),ensure_ascii=False)
print("OK")
