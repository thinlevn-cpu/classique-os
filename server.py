#!/usr/bin/env python3
"""Classique OS - buồng lái trên Lark Base.

Giao diện tự dựng từ chính cấu trúc Base Lark của người cài: mỗi bảng = một màn hình, mỗi cột = một ô
theo đúng kiểu cột Lark. Không lập trình từng màn hình. Thông tin riêng (chủ, doanh nghiệp, bảng) ở ho-so.json.

Nguyên tắc:
- Khoá chỉ nằm phía máy chủ (.env của dự án), không bao giờ gửi ra trình duyệt.
- Chỉ nghe 127.0.0.1.
- Ghi lên Lark mặc định TẮT; bật bằng công tắc trên giao diện (chỉ sống tới khi tắt server).
- Bảng do tiến trình tự động ghi (tên có "tự động", hoặc tiền tố khai ở ho-so.json) luôn CHỈ ĐỌC:
  luật "một bảng chỉ một người ghi".
- Có bản đệm SQLite để không đốt hạn mức API Lark (gói Starter ~10.000 lệnh/tháng):
  mở lại bảng thì đọc đệm, bấm Làm mới mới gọi Lark.

Chạy:  ./.venv/bin/python server.py   →  http://127.0.0.1:8790
"""
import json
import re
import sqlite3
import subprocess
import threading
import time
from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

GOC = Path(__file__).resolve().parent
import ho_so as HSO

HS = HSO.HS
PORT = 8790

# Phân hệ theo số đầu tên bảng (khai ở ho-so.json → lark.phan_he); bảng không có số đầu → phan_he_tay.
PHAN_HE = HS["lark"]["phan_he"]
PHAN_HE_TAY = HS["lark"]["phan_he_tay"]

# Kiểu cột Lark cho phép sửa từ giao diện. Còn lại (công thức, tra cứu, liên kết, người,
# tệp, tự sinh) chỉ hiển thị.
SUA_DUOC = {1, 2, 3, 4, 5, 7, 13, 15}


def doc_env():
    env = {}
    (GOC / ".env").touch(mode=0o600, exist_ok=True)
    for l in open(GOC / ".env", encoding="utf-8"):
        if "=" in l and not l.lstrip().startswith("#"):
            k, v = l.strip().split("=", 1)
            env[k] = v.strip().strip("\"'")
    return env


ENV = doc_env()
HOST = (ENV.get("LARK_API_HOST") or "https://open.larksuite.com").rstrip("/")
if not HOST.startswith("http"):
    HOST = "https://" + HOST
# Khoá Lark nhập ở trang Kết nối (ghi vào .env): app nội bộ có quyền đọc/ghi Base + mã Base.
LARK_KHOA = ["LARK_BASE_APP_ID", "LARK_BASE_APP_SECRET", "LARK_BASE_TOKEN"]

_tok = {"v": None, "het": 0}
_tok_lock = threading.Lock()
TRANG_THAI = {"ghi": False, "goi_api": 0}


def token():
    with _tok_lock:
        if _tok["v"] and time.time() < _tok["het"] - 120:
            return _tok["v"]
        if KN.thieu_khoa(LARK_KHOA):
            raise HTTPException(400, "Chưa kết nối Lark: nhập khoá ở trang Kết nối.")
        r = requests.post(f"{HOST}/open-apis/auth/v3/tenant_access_token/internal",
                          json={"app_id": KN.KHOA["LARK_BASE_APP_ID"], "app_secret": KN.KHOA["LARK_BASE_APP_SECRET"]}, timeout=30).json()
        if not r.get("tenant_access_token"):
            raise HTTPException(502, f"Lark từ chối cấp token: {r.get('msg')}")
        _tok["v"], _tok["het"] = r["tenant_access_token"], time.time() + int(r.get("expire", 7200))
        return _tok["v"]


def lark(method, path, **kw):
    TRANG_THAI["goi_api"] += 1
    h = {"Authorization": "Bearer " + token()}       # báo "chưa kết nối" trước khi đụng tới mã Base
    r = requests.request(method, f"{HOST}/open-apis/bitable/v1/apps/{KN.KHOA['LARK_BASE_TOKEN']}{path}",
                         headers=h, timeout=60, **kw)
    d = r.json()
    if d.get("code") != 0:
        raise HTTPException(502, f"Lark lỗi {d.get('code')}: {d.get('msg')}")
    return d.get("data") or {}


def lay_het(path, params=None):
    out, pt = [], None
    while True:
        p = dict(params or {}, page_size=500 if "records" in path else 100)
        if pt:
            p["page_token"] = pt
        d = lark("GET", path, params=p)
        out += d.get("items") or []
        if not d.get("has_more"):
            return out
        pt = d.get("page_token")


# ---------- bản đệm ----------
DB = GOC / "cache.db"
_db_lock = threading.Lock()


def db():
    c = sqlite3.connect(DB, check_same_thread=False)
    c.execute("CREATE TABLE IF NOT EXISTS dem (khoa TEXT PRIMARY KEY, gia_tri TEXT, luc REAL)")
    return c


def dem_doc(khoa):
    with _db_lock, db() as c:
        r = c.execute("SELECT gia_tri, luc FROM dem WHERE khoa=?", (khoa,)).fetchone()
    return (json.loads(r[0]), r[1]) if r else (None, None)


def dem_ghi(khoa, gia_tri):
    with _db_lock, db() as c:
        c.execute("REPLACE INTO dem VALUES (?,?,?)", (khoa, json.dumps(gia_tri, ensure_ascii=False), time.time()))


def la_chi_doc(ten):
    t = ten.lower()
    return ("tự động" in t) or any(t.startswith(x.lower()) for x in HS["lark"]["chi_doc_tien_to"])


def phan_he(ten):
    if ten in PHAN_HE_TAY:
        so = PHAN_HE_TAY[ten]
    else:
        m = re.match(r"\s*(\d+)\.", ten)
        so = m.group(1) if m else ""
    return so, PHAN_HE.get(so, "Khác")


def ds_bang(lam_moi=False):
    v, luc = dem_doc("bang")
    if v is None or lam_moi:
        v = [{"id": t["table_id"], "ten": t["name"]} for t in lay_het("/tables")]
        dem_ghi("bang", v)
        luc = time.time()
    for b in v:
        b["so"], b["phan_he"] = phan_he(b["ten"])
        b["chi_doc"] = la_chi_doc(b["ten"])
        b["mau_cu"] = "mẫu cũ" in b["ten"].lower()
    return v, luc


def ds_cot(bang, lam_moi=False):
    v, luc = dem_doc(f"cot:{bang}")
    # Bản đệm cũ chưa có "lien_ket" (bảng mà cột liên kết trỏ tới) → lấy lại một lần cho đồ thị.
    if v is None or lam_moi or (v and "lien_ket" not in v[0]):
        v = [{"id": f["field_id"], "ten": f["field_name"], "kieu": f["type"],
              "chinh": f.get("is_primary", False),
              "lua_chon": [o["name"] for o in ((f.get("property") or {}).get("options") or [])],
              "lien_ket": (f.get("property") or {}).get("table_id") if f["type"] in (18, 21) else None}
             for f in lay_het(f"/tables/{bang}/fields")]
        dem_ghi(f"cot:{bang}", v)
        luc = time.time()
    for c in v:
        c["sua_duoc"] = c["kieu"] in SUA_DUOC
    return v, luc


def ds_dong(bang, lam_moi=False):
    v, luc = dem_doc(f"dong:{bang}")
    if v is None or lam_moi:
        v = [{"id": r["record_id"], "o": r.get("fields") or {}} for r in lay_het(f"/tables/{bang}/records")]
        dem_ghi(f"dong:{bang}", v)
        luc = time.time()
    return v, luc


def tim_bang(bang):
    for b in ds_bang()[0]:
        if b["id"] == bang:
            return b
    raise HTTPException(404, "Không có bảng này")


# ---------- API ----------
app = FastAPI(title="Classique OS")


@app.get("/api/trang-thai")
def trang_thai():
    return {**TRANG_THAI, "base": APP_TOKEN}


class CheDo(BaseModel):
    ghi: bool


@app.post("/api/che-do")
def che_do(b: CheDo):
    TRANG_THAI["ghi"] = b.ghi
    return TRANG_THAI


@app.get("/api/bang")
def api_bang(lam_moi: bool = False):
    v, luc = ds_bang(lam_moi)
    return {"bang": v, "luc": luc}


@app.get("/api/bang/{bang}")
def api_mot_bang(bang: str, lam_moi: bool = False):
    b = tim_bang(bang)
    cot, _ = ds_cot(bang, lam_moi)
    dong, luc = ds_dong(bang, lam_moi)
    return {"bang": b, "cot": cot, "dong": dong, "luc": luc}


class GhiDong(BaseModel):
    o: dict


def kiem_ghi(bang):
    b = tim_bang(bang)
    if not TRANG_THAI["ghi"]:
        raise HTTPException(403, "Chế độ ghi đang TẮT. Bật ở góc trên bên phải rồi thử lại.")
    if b["chi_doc"]:
        raise HTTPException(403, f"Bảng \"{b['ten']}\" do tiến trình tự động ghi, chỉ được xem.")
    cot = {c["ten"]: c for c in ds_cot(bang)[0]}
    return cot


def loc_o(cot, o):
    sach = {}
    for k, v in o.items():
        c = cot.get(k)
        if not c or not c["sua_duoc"]:
            raise HTTPException(400, f"Cột \"{k}\" không sửa được từ đây.")
        sach[k] = v
    return sach


def cap_nhat_dem(bang, rec):
    v, _ = dem_doc(f"dong:{bang}")
    if v is None:
        return
    moi = {"id": rec["record_id"], "o": rec.get("fields") or {}}
    for i, d in enumerate(v):
        if d["id"] == moi["id"]:
            v[i] = moi
            break
    else:
        v.insert(0, moi)
    dem_ghi(f"dong:{bang}", v)


@app.put("/api/bang/{bang}/dong/{dong}")
def api_sua(bang: str, dong: str, b: GhiDong):
    cot = kiem_ghi(bang)
    d = lark("PUT", f"/tables/{bang}/records/{dong}", json={"fields": loc_o(cot, b.o)})
    cap_nhat_dem(bang, d["record"])
    return d["record"]


@app.post("/api/bang/{bang}/dong")
def api_them(bang: str, b: GhiDong):
    cot = kiem_ghi(bang)
    d = lark("POST", f"/tables/{bang}/records", json={"fields": loc_o(cot, b.o)})
    cap_nhat_dem(bang, d["record"])
    return d["record"]


# ================= TRỢ LÝ AI (thao tác Lark qua MCP) =================
import asyncio
import itertools
import unicodedata
from fastapi.responses import StreamingResponse, Response

NHAT_KY = []                 # hoạt động gần đây (hiện ở trang Hoạt động)
DE_XUAT = {}                 # id → đề xuất ghi chờ anh duyệt
PHIEN = {}                   # phiên chat → session_id của Claude (để nhớ mạch)
_dem_id = itertools.count(1)


def ghi_nhat_ky(loai, noi_dung, bang=None):
    NHAT_KY.insert(0, {"luc": time.time(), "loai": loai, "noi_dung": noi_dung, "bang": bang})
    del NHAT_KY[300:]


def chu(v):
    """Giá trị ô Lark → chữ thường để đưa cho AI đọc."""
    if v is None:
        return ""
    if isinstance(v, list):
        return ", ".join(x for x in (chu(i) for i in v) if x)
    if isinstance(v, dict):
        for k in ("text", "name", "full_name", "link"):
            if k in v:
                return chu(v[k])
        if "value" in v:
            return chu(v["value"])
        return ""
    return str(v)


def bo_dau(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").replace("đ", "d")


def chu_o(c, v):
    if c["kieu"] in (5, 1001, 1002) and isinstance(v, (int, float)):
        return time.strftime("%Y-%m-%d", time.localtime(v / 1000))
    return chu(v)


def ten_bang(bang):
    try:
        return tim_bang(bang)["ten"]
    except HTTPException:
        return bang


def chuan_hoa_o(cot, o):
    """Giá trị AI đưa (chữ) → đúng dạng Lark cần cho từng kiểu cột."""
    ra = {}
    for k, v in (o or {}).items():
        c = cot.get(k)
        if not c:
            raise HTTPException(400, f"Bảng không có cột \"{k}\".")
        if not c["sua_duoc"]:
            raise HTTPException(400, f"Cột \"{k}\" là cột tự tính/liên kết, không sửa được.")
        if v in ("", None):
            ra[k] = None
        elif c["kieu"] == 2:
            ra[k] = float(str(v).replace(",", "").replace(" ", ""))
        elif c["kieu"] == 5 and isinstance(v, str):
            ra[k] = int(time.mktime(time.strptime(v[:10], "%Y-%m-%d")) * 1000)
        elif c["kieu"] == 7:
            ra[k] = v in (True, "true", "True", 1, "1", "có", "x")
        elif c["kieu"] == 4 and isinstance(v, str):
            ra[k] = [x.strip() for x in v.split(",") if x.strip()]
        elif c["kieu"] == 15 and isinstance(v, str):
            ra[k] = {"text": v, "link": v}
        else:
            ra[k] = v
    return ra


# ---- công cụ Lark (đăng ký vào trung tâm kết nối bên dưới) ----
def ag_ds():
    ra = []
    for b in ds_bang()[0]:
        d, _l = dem_doc(f"dong:{b['id']}")
        ra.append({"id": b["id"], "ten": b["ten"], "phan_he": b["phan_he"], "chi_doc": b["chi_doc"],
                   "mau_cu": b["mau_cu"], "so_dong": len(d) if d is not None else None})
    return ra


def ag_cot(a: dict):
    return [{"ten": c["ten"], "kieu": c["kieu"], "lua_chon": c["lua_chon"], "sua_duoc": c["sua_duoc"]}
            for c in ds_cot(a["bang"])[0]]


def _loc(bang, a):
    cot = ds_cot(bang)[0]
    dong, luc = ds_dong(bang)
    q = bo_dau(a.get("tu_khoa") or "")
    loc = {k: bo_dau(v) for k, v in (a.get("loc") or {}).items()}
    cmap = {c["ten"]: c for c in cot}
    for k in loc:
        if k not in cmap:
            raise HTTPException(400, f"Bảng không có cột \"{k}\". Gọi xem_cot để biết tên đúng.")
    kq = []
    for d in dong:
        if q and not any(q in bo_dau(chu_o(c, d["o"].get(c["ten"]))) for c in cot):
            continue
        if any(v not in bo_dau(chu_o(cmap[k], d["o"].get(k))) for k, v in loc.items()):
            continue
        kq.append(d)
    return cot, kq, len(dong), luc


def ag_tim(a: dict):
    bang = a["bang"]
    cot, kq, tong, luc = _loc(bang, a)
    chon = a.get("cot") or [c["ten"] for c in cot]
    gh = min(int(a.get("gioi_han") or 30), 100)
    cmap = {c["ten"]: c for c in cot}
    return {"bang": ten_bang(bang), "tong_dong_bang": tong, "so_khop": len(kq), "du_lieu_luc": luc,
            "dong": [{"id": d["id"], **{k: chu_o(cmap[k], d["o"].get(k))[:300] for k in chon if k in cmap}}
                     for d in kq[:gh]]}


def ag_tk(a: dict):
    bang = a["bang"]
    cot, kq, tong, luc = _loc(bang, a)
    cmap = {c["ten"]: c for c in cot}
    n, t = a["nhom_theo"], a.get("cot_tong")
    if n not in cmap or (t and t not in cmap):
        raise HTTPException(400, "Sai tên cột. Gọi xem_cot để biết tên đúng.")
    nhom = {}
    for d in kq:
        k = chu_o(cmap[n], d["o"].get(n)) or "(trống)"
        g = nhom.setdefault(k, {"so_dong": 0, "tong": 0.0})
        g["so_dong"] += 1
        if t:
            try:
                g["tong"] += float(chu(d["o"].get(t)) or 0)
            except ValueError:
                pass
    return {"bang": ten_bang(bang), "so_dong_xet": len(kq), "nhom": nhom, "du_lieu_luc": luc}


def ag_lm(a: dict):
    ds_cot(a["bang"], True)
    d, luc = ds_dong(a["bang"], True)
    return {"bang": ten_bang(a["bang"]), "so_dong": len(d), "luc": luc}


# ================= TRUNG TÂM KẾT NỐI (MCP Hub) =================
# Một chỗ duy nhất quyết định công cụ nào AI thấy và lệnh ghi nào được chạy:
#   doc     → chỉ công cụ đọc; công cụ ghi bị chặn
#   de_xuat → công cụ ghi thành THẺ ĐỀ XUẤT, anh bấm Duyệt mới chạy
#   toan    → công cụ ghi chạy thẳng (vẫn ghi nhật ký)
import ket_noi as KN

CAU_HINH_TEP = GOC / "cau-hinh.json"
MAC_DINH = {"ket_noi": {"lark": {"bat": True, "quyen": "de_xuat"}, "pancake": {"bat": True, "quyen": "doc"},
                        "meta": {"bat": True, "quyen": "de_xuat"}, "wordpress": {"bat": True, "quyen": "de_xuat"}},
            "mcp_ngoai": [], "model": {"engine": "claude", "model": "sonnet"}}


def doc_cau_hinh():
    try:
        c = json.loads(CAU_HINH_TEP.read_text(encoding="utf-8"))
    except Exception:
        c = {}
    for k, v in MAC_DINH.items():
        c.setdefault(k, json.loads(json.dumps(v)))
    for k, v in MAC_DINH["ket_noi"].items():
        c["ket_noi"].setdefault(k, dict(v))
    return c


def luu_cau_hinh(c):
    CAU_HINH_TEP.write_text(json.dumps(c, ensure_ascii=False, indent=2), encoding="utf-8")


CAU_HINH = doc_cau_hinh()


# ---- Lark là một kết nối như mọi kết nối khác ----
def _lark_kiem_ghi(a, dong_bat_buoc):
    b = tim_bang(a["bang"])
    if b["chi_doc"]:
        raise HTTPException(403, f"Bảng \"{b['ten']}\" do tiến trình tự động ghi, không được sửa.")
    cot = {c["ten"]: c for c in ds_cot(a["bang"])[0]}
    gia_tri = chuan_hoa_o(cot, a.get("o"))
    cu = {}
    if dong_bat_buoc:
        for d in ds_dong(a["bang"])[0]:
            if d["id"] == a.get("dong"):
                cu = {k: chu_o(cot[k], d["o"].get(k)) for k in gia_tri}
                break
        else:
            raise HTTPException(404, "Không thấy dòng này trong bảng (thử lam_moi_bang).")
    return b, cot, gia_tri, cu


def lark_sua(a):
    b, cot, gia_tri, _ = _lark_kiem_ghi(a, True)
    d = lark("PUT", f"/tables/{a['bang']}/records/{a['dong']}", json={"fields": gia_tri})
    cap_nhat_dem(a["bang"], d["record"])
    return {"ok": True, "bang": b["ten"], "dong": d["record"]["record_id"]}


def lark_them(a):
    b, cot, gia_tri, _ = _lark_kiem_ghi(a, False)
    d = lark("POST", f"/tables/{a['bang']}/records", json={"fields": gia_tri})
    cap_nhat_dem(a["bang"], d["record"])
    return {"ok": True, "bang": b["ten"], "dong": d["record"]["record_id"]}


def _lark_tom_tat(dong_bat_buoc):
    def f(a):
        b, cot, gia_tri, cu = _lark_kiem_ghi(a, dong_bat_buoc)
        return {"_bang": b["ten"], "_bang_id": a["bang"], "_cu": cu,
                **{k: chu_o(cot[k], v) for k, v in gia_tri.items()}}
    return f


_B = {"bang": {"type": "string", "description": "table id, dạng tbl..."}}
_LOC = {"type": "object", "additionalProperties": {"type": "string"}}
KN.dang_ky("lark", f"Lark Base · {HS['lark']['ten_base']}", "Sổ cái của công ty trên Lark Base: khách, đơn, sản phẩm, thu chi...", "Dữ liệu lõi",
           LARK_KHOA, lambda: f"{len(ds_bang(True)[0])} bảng",
           [KN.cc("danh_sach_bang", "Liệt kê mọi bảng: id, tên, phân hệ, số dòng (nếu đã đệm), chỉ đọc hay không. Gọi đầu tiên khi chưa biết bảng nào.", "doc", lambda a: ag_ds()),
            KN.cc("xem_cot", "Xem các cột của một bảng: tên, kiểu, lựa chọn, sửa được không.", "doc", ag_cot, _B, ("bang",)),
            KN.cc("tim_dong", "Tìm dòng: tu_khoa trên mọi cột (bỏ dấu), loc {cột: giá trị}, cot = cột muốn lấy.", "doc", ag_tim,
                  {**_B, "tu_khoa": {"type": "string"}, "loc": _LOC, "cot": {"type": "array", "items": {"type": "string"}}, "gioi_han": {"type": "integer"}}, ("bang",)),
            KN.cc("thong_ke", "Đếm dòng theo nhóm một cột, cộng tổng cột số nếu có cot_tong.", "doc", ag_tk,
                  {**_B, "nhom_theo": {"type": "string"}, "cot_tong": {"type": "string"}, "loc": _LOC}, ("bang", "nhom_theo")),
            KN.cc("lam_moi_bang", "Lấy dữ liệu MỚI NHẤT của một bảng từ Lark (tốn hạn mức API).", "doc", ag_lm, _B, ("bang",)),
            KN.cc("sua_dong", "Sửa một dòng. o = {tên cột: giá trị mới}; ngày dạng YYYY-MM-DD; cột chọn đúng tên lựa chọn.", "ghi", lark_sua,
                  {**_B, "dong": {"type": "string", "description": "record id rec..."}, "o": {"type": "object"}, "ly_do": {"type": "string"}},
                  ("bang", "dong", "o", "ly_do"), tom_tat=_lark_tom_tat(True)),
            KN.cc("them_dong", "Thêm một dòng mới. o = {tên cột: giá trị}.", "ghi", lark_them,
                  {**_B, "o": {"type": "object"}, "ly_do": {"type": "string"}}, ("bang", "o", "ly_do"), tom_tat=_lark_tom_tat(False))],
           mac_dinh="de_xuat")


def cong_cu_dang_bat():
    """Công cụ AI được thấy: của kết nối đang bật, đủ khoá; ở mức Chỉ đọc thì ẩn công cụ ghi."""
    ra = []
    for kid, kn in KN.KET_NOI.items():
        ch = CAU_HINH["ket_noi"].get(kid) or {}
        if not ch.get("bat") or KN.thieu_khoa(kn["can"]):
            continue
        for c in kn["cong_cu"]:
            if c["loai"] == "ghi" and ch.get("quyen") == "doc":
                continue
            mo_ta = c["mo_ta"]
            if c["loai"] == "ghi":
                mo_ta += (" [CHỈ TẠO ĐỀ XUẤT, anh phải bấm Duyệt mới chạy]" if ch.get("quyen") == "de_xuat"
                          else " [CHẠY THẬT NGAY]")
            # readOnlyHint: Codex chỉ tự chạy (không đòi duyệt) công cụ MCP khai là chỉ đọc. Công cụ ghi ở mức
            # Đề xuất cũng chỉ tạo thẻ chờ duyệt nên khai chỉ đọc; ở mức Toàn quyền thì khai thật (Codex sẽ chặn).
            chi_doc = c["loai"] == "doc" or ch.get("quyen") == "de_xuat"
            ra.append({"name": f"{kid}__{c['ten']}", "description": f"[{kn['ten']}] {mo_ta}", "inputSchema": c["schema"],
                       "annotations": {"readOnlyHint": chi_doc, "destructiveHint": not chi_doc}})
    return ra


def tim_cong_cu(ten):
    kid, _, cten = ten.partition("__")
    kn = KN.KET_NOI.get(kid)
    if not kn:
        raise HTTPException(404, f"Không có kết nối {kid}")
    for c in kn["cong_cu"]:
        if c["ten"] == cten:
            return kid, kn, c
    raise HTTPException(404, f"Không có công cụ {ten}")


@app.get("/api/agent/cong-cu")
def api_cong_cu():
    return cong_cu_dang_bat()


class Goi(BaseModel):
    ten: str
    args: dict = {}


@app.post("/api/agent/goi")
def api_goi(g: Goi):
    kid, kn, c = tim_cong_cu(g.ten)
    ch = CAU_HINH["ket_noi"].get(kid) or {}
    if not ch.get("bat"):
        raise HTTPException(403, f"Kết nối {kn['ten']} đang tắt.")
    thieu = KN.thieu_khoa(kn["can"])
    if thieu:
        raise HTTPException(400, f"Kết nối {kn['ten']} thiếu khoá: {', '.join(thieu)}")
    bang = g.args.get("bang") if kid == "lark" else None
    if c["loai"] == "ghi":
        q = ch.get("quyen")
        if q == "doc":
            raise HTTPException(403, f"Kết nối {kn['ten']} đang ở mức Chỉ đọc.")
        if q == "de_xuat":
            return tao_de_xuat(kid, kn, c, g.args)
        ghi_nhat_ky("ghi", f"[Toàn quyền] {kn['ten']} · {c['ten']}", bang)
    try:
        return c["fn"](g.args)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"{kn['ten']}: {e}")


def tao_de_xuat(kid, kn, c, args):
    tom = (c["tom_tat"] or (lambda a: {k: str(v)[:200] for k, v in a.items()}))(args)
    cu = tom.pop("_cu", {}) if isinstance(tom, dict) else {}
    ten_bang_ = tom.pop("_bang", None)
    bang_id = tom.pop("_bang_id", None)
    id_ = f"dx{next(_dem_id)}"
    DE_XUAT[id_] = {"id": id_, "ket_noi": kid, "ten_ket_noi": kn["ten"], "cong_cu": c["ten"], "args": args,
                    "tieu_de": f"{kn['ten']} · {c['ten'].replace('_', ' ')}" + (f" · {ten_bang_}" if ten_bang_ else ""),
                    "hien": {k: str(v) for k, v in tom.items()}, "cu": cu, "bang": bang_id,
                    "ly_do": args.get("ly_do", ""), "trang_thai": "cho", "luc": time.time()}
    ghi_nhat_ky("de_xuat", f"Đề xuất: {DE_XUAT[id_]['tieu_de']}. {args.get('ly_do', '')}", bang_id)
    return {"de_xuat_id": id_, "ghi_chu": "ĐÃ TẠO ĐỀ XUẤT, CHƯA CHẠY. Anh cần bấm Duyệt trên giao diện."}


@app.get("/api/de-xuat")
def api_dx():
    return sorted(DE_XUAT.values(), key=lambda x: -x["luc"])


@app.post("/api/de-xuat/{id_}/{viec}")
def api_dx_viec(id_: str, viec: str):
    dx = DE_XUAT.get(id_)
    if not dx or dx["trang_thai"] != "cho":
        raise HTTPException(404, "Đề xuất không còn chờ duyệt.")
    if viec == "bo":
        dx["trang_thai"] = "bo"
        ghi_nhat_ky("bo", f"Bỏ đề xuất: {dx['tieu_de']}", dx["bang"])
        return dx
    _, kn, c = tim_cong_cu(f"{dx['ket_noi']}__{dx['cong_cu']}")
    try:
        kq = c["fn"](dx["args"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"{kn['ten']}: {e}")
    dx["trang_thai"], dx["ket_qua"] = "da_ghi", kq
    ghi_nhat_ky("ghi", f"Đã chạy: {dx['tieu_de']}", dx["bang"])
    return dx


# ---- trang Kết nối ----
@app.get("/api/ket-noi")
def api_ket_noi():
    ra = []
    for kid, kn in KN.KET_NOI.items():
        ch = CAU_HINH["ket_noi"].get(kid) or {"bat": False, "quyen": kn["mac_dinh"]}
        ra.append({"id": kid, "ten": kn["ten"], "mo_ta": kn["mo_ta"], "nhom": kn["nhom"], "bat": ch.get("bat"),
                   "quyen": ch.get("quyen"), "can": kn["can"], "thieu": KN.thieu_khoa(kn["can"]),
                   "cong_cu": [{"ten": c["ten"], "loai": c["loai"], "mo_ta": c["mo_ta"]} for c in kn["cong_cu"]]})
    return {"ket_noi": ra, "mcp_ngoai": CAU_HINH["mcp_ngoai"]}


class SuaKN(BaseModel):
    bat: bool | None = None
    quyen: str | None = None


@app.post("/api/ket-noi/{kid}")
def api_sua_kn(kid: str, s: SuaKN):
    if kid not in KN.KET_NOI:
        raise HTTPException(404, "Không có kết nối này")
    ch = CAU_HINH["ket_noi"].setdefault(kid, {"bat": False, "quyen": KN.KET_NOI[kid]["mac_dinh"]})
    if s.bat is not None:
        ch["bat"] = s.bat
    if s.quyen in ("doc", "de_xuat", "toan"):
        ch["quyen"] = s.quyen
    luu_cau_hinh(CAU_HINH)
    ghi_nhat_ky("cau_hinh", f"Kết nối {KN.KET_NOI[kid]['ten']}: {'bật' if ch['bat'] else 'tắt'}, quyền {ch['quyen']}")
    return ch


class KhoaKN(BaseModel):
    khoa: dict[str, str]


@app.post("/api/ket-noi/{kid}/khoa")
def api_khoa_kn(kid: str, k: KhoaKN):
    """Nhập khoá cho một kết nối từ giao diện: chỉ nhận đúng tên khoá kết nối đó cần, ô để trống thì giữ khoá cũ."""
    kn = KN.KET_NOI.get(kid)
    if not kn:
        raise HTTPException(404, "Không có kết nối này")
    moi = {t: v.strip() for t, v in k.khoa.items() if t in kn["can"] and v.strip() and "\n" not in v}
    if not moi:
        raise HTTPException(400, "Chưa nhập khoá nào.")
    KN.luu_khoa(moi)
    if kid == "lark":
        _tok.update(v=None, het=0)
    ghi_nhat_ky("cau_hinh", f"Cập nhật khoá kết nối {kn['ten']}: {', '.join(moi)}")
    return {"ok": True, "thieu": KN.thieu_khoa(kn["can"])}


@app.post("/api/ket-noi/{kid}/kiem-tra")
def api_kiem_kn(kid: str):
    kn = KN.KET_NOI.get(kid)
    if not kn:
        raise HTTPException(404, "Không có kết nối này")
    thieu = KN.thieu_khoa(kn["can"])
    if thieu:
        return {"ok": False, "thong_bao": "Chưa nhập khoá: " + ", ".join(thieu)}
    try:
        return {"ok": True, "thong_bao": kn["kiem_tra"]()}
    except Exception as e:
        return {"ok": False, "thong_bao": str(e)[:300]}


class MCPNgoai(BaseModel):
    ten: str
    lenh: str = ""
    tham_so: list[str] = []
    url: str = ""


@app.post("/api/mcp-ngoai")
def api_them_mcp(m: MCPNgoai):
    ten = re.sub(r"[^a-z0-9_-]", "", m.ten.lower())
    if not ten or ten in ("os", "lark"):
        raise HTTPException(400, "Tên không hợp lệ (chỉ chữ thường, số, - _).")
    if not (m.lenh or m.url):
        raise HTTPException(400, "Cần lệnh chạy (stdio) hoặc URL (http).")
    CAU_HINH["mcp_ngoai"] = [x for x in CAU_HINH["mcp_ngoai"] if x["ten"] != ten] + \
        [{"ten": ten, "lenh": m.lenh, "tham_so": m.tham_so, "url": m.url, "bat": True}]
    luu_cau_hinh(CAU_HINH)
    ghi_nhat_ky("cau_hinh", f"Thêm MCP ngoài: {ten}")
    return CAU_HINH["mcp_ngoai"]


@app.get("/api/mcp-kho")
def api_mcp_kho():
    da = {x.get("kho"): x for x in CAU_HINH["mcp_ngoai"] if x.get("kho")}
    out = []
    for c in MK.danh_muc():
        ok, ly_do = MK.ho_tro(c)
        a = c.get("auth") or {}
        out.append({"id": c["id"], "ten": c["name"], "nhom": c.get("category", ""), "mo_ta": c.get("description", ""),
                    "icon": c.get("icon", ""), "ho_tro": ok, "ly_do": ly_do, "truong": MK.truong(c) if ok else [],
                    "huong_dan": a.get("guide", ""), "huong_dan_url": a.get("guide_url", ""),
                    "da_noi": c["id"] in da, "bat": bool(da.get(c["id"], {}).get("bat"))})
    return out


@app.post("/api/mcp-kho/{cid}")
async def api_noi_mcp_kho(cid: str, b: dict):
    """Anh điền khoá theo hướng dẫn → dựng MCP, bắt tay thử thật (đếm công cụ), lưu khi chạy được."""
    try:
        muc = MK.dung(cid, b.get("gia_tri") or {})
    except ValueError as e:
        raise HTTPException(400, str(e))
    kq = await asyncio.to_thread(MK.kiem_tra, may_chu_mcp(muc))
    if not kq["ok"]:
        MK.bo(cid)
        raise HTTPException(400, "Chưa nối được: " + kq["loi"])
    CAU_HINH["mcp_ngoai"] = [x for x in CAU_HINH["mcp_ngoai"] if x["ten"] != cid] + [muc]
    luu_cau_hinh(CAU_HINH)
    ghi_nhat_ky("cau_hinh", f"Nối MCP {cid}: {kq['so_cong_cu']} công cụ")
    return kq


@app.post("/api/mcp-ngoai/{ten}/kiem-tra")
async def api_kiem_mcp(ten: str):
    x = next((x for x in CAU_HINH["mcp_ngoai"] if x["ten"] == ten), None)
    if not x:
        raise HTTPException(404, "Không có MCP này")
    return await asyncio.to_thread(MK.kiem_tra, may_chu_mcp(x))


@app.post("/api/mcp-ngoai/{ten}/{viec}")
def api_sua_mcp(ten: str, viec: str):
    if viec == "xoa":
        x = next((x for x in CAU_HINH["mcp_ngoai"] if x["ten"] == ten), None)
        if x and x.get("kho"):
            MK.bo(ten)
        CAU_HINH["mcp_ngoai"] = [x for x in CAU_HINH["mcp_ngoai"] if x["ten"] != ten]
    else:
        for x in CAU_HINH["mcp_ngoai"]:
            if x["ten"] == ten:
                x["bat"] = viec == "bat"
    luu_cau_hinh(CAU_HINH)
    return CAU_HINH["mcp_ngoai"]


# ---- trang Models ----
def _chay(cmd, timeout=15):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, (r.stdout or "") + (r.stderr or "")
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        return None, str(e)


def models_codex():
    """Model ChatGPT mà tài khoản thật sự dùng được: Codex tự cập nhật ~/.codex/models_cache.json theo gói."""
    try:
        d = json.loads((Path.home() / ".codex" / "models_cache.json").read_text())
        ms = [m.get("slug") for m in (d.get("models") if isinstance(d, dict) else d) if m.get("visibility") == "list" and m.get("slug")]
        if ms:
            return ms
    except Exception:
        pass
    return ["gpt-5.5"]


import may_api as MA


def trang_thai_engine():
    import shutil
    ra = []
    p = shutil.which("claude")
    tt = {"id": "claude", "ten": "Claude Code", "cai": bool(p), "models": ["sonnet", "opus", "haiku"],
          "huong_dan": "Cài: npm i -g @anthropic-ai/claude-code · Đăng nhập: claude auth login"}
    if p:
        _, ver = _chay(["claude", "--version"])
        _, au = _chay(["claude", "auth", "status"])
        tt["phien_ban"] = ver.strip().split("\n")[0]
        tt["dang_nhap"] = '"loggedIn": true' in au
    ra.append(tt)
    p = shutil.which("codex")
    tt = {"id": "codex", "ten": "ChatGPT (Codex CLI)", "cai": bool(p), "models": models_codex(),
          "huong_dan": "Cài: npm i -g @openai/codex · Đăng nhập: codex login"}
    if p:
        _, ver = _chay(["codex", "--version"])
        _, lg = _chay(["codex", "login", "status"])
        tt["phien_ban"] = ver.strip().split("\n")[0]
        tt["dang_nhap"] = "Logged in" in lg
    ra.append(tt)
    p = shutil.which("agy")
    ra.append({"id": "agy", "ten": "Antigravity CLI (Google)", "cai": bool(p), "models": [], "chua_ho_tro": True,
               "huong_dan": "Dùng gói Google có sẵn, có cả Claude. Chưa nối vào Classique OS."})
    p = shutil.which("grok")
    ra.append({"id": "grok", "ten": "Grok Build (xAI)", "cai": bool(p), "models": [], "chua_ho_tro": True,
               "huong_dan": "Dùng gói SuperGrok / X Premium+. Chưa nối vào Classique OS."})
    for e in ra:
        e["loai"] = "cli"
    return ra + MA.trang_thai()


@app.get("/api/models")
def api_models():
    return {"engine": trang_thai_engine(), "dang_dung": CAU_HINH["model"]}


class ChonModel(BaseModel):
    engine: str
    model: str


@app.post("/api/models")
def api_chon_model(m: ChonModel):
    if m.engine not in ("claude", "codex") and m.engine not in MA.NHA:
        raise HTTPException(400, "Engine này chưa hỗ trợ.")
    if m.engine in MA.NHA and not MA.doc_khoa().get(m.engine):
        raise HTTPException(400, f"Chưa có API key cho {MA.NHA[m.engine]['ten']}.")
    md = {"claude": "sonnet", "codex": "gpt-5.5"}.get(m.engine) or MA.NHA.get(m.engine, {}).get("goi_y", [""])[0]
    CAU_HINH["model"] = {"engine": m.engine, "model": m.model.strip() or md}
    luu_cau_hinh(CAU_HINH)
    PHIEN.clear()        # đổi bộ não thì mở mạch hội thoại mới
    for ps in list(SONG.values()):
        asyncio.get_event_loop().create_task(ps.dong())
    SONG.clear()
    ghi_nhat_ky("cau_hinh", f"Đổi bộ não: {CAU_HINH['model']['engine']} · {CAU_HINH['model']['model']}")
    return CAU_HINH["model"]


@app.post("/api/models/{nha}/khoa")
async def api_luu_khoa(nha: str, b: dict):
    """Anh dán API key ở trang Models. Lưu xong kiểm tra ngay bằng cách lấy danh sách model."""
    if nha not in MA.NHA:
        raise HTTPException(404, "Không có hãng này")
    khoa = str(b.get("khoa") or "").strip()
    if khoa and (len(khoa) < 16 or " " in khoa):
        raise HTTPException(400, "Khoá không đúng dạng")
    MA.luu_khoa(nha, khoa)
    ghi_nhat_ky("cau_hinh", f"{'Lưu' if khoa else 'Xoá'} API key {MA.NHA[nha]['ten']}")
    if not khoa:
        return {"ok": True}
    try:
        ms = await asyncio.to_thread(MA.ds_model, nha, True)
        return {"ok": True, "so_model": len(ms)}
    except ValueError as e:
        if "từ chối" in str(e):          # khoá sai thì không giữ lại
            MA.luu_khoa(nha, "")
            raise HTTPException(400, str(e))
        return {"ok": False, "loi": str(e)}


@app.post("/api/models/{nha}/kiem-tra")
async def api_kiem_khoa(nha: str):
    try:
        ms = await asyncio.to_thread(MA.ds_model, nha, True)
        return {"ok": True, "so_model": len(ms)}
    except (ValueError, KeyError) as e:
        return {"ok": False, "loi": str(e)}


# ---- chat: chạy bộ não đã chọn (Claude / Codex) với công cụ của mọi kết nối đang bật (SSE) ----
HUONG_DAN = """{gioi_thieu}, chạy trong Classique OS.
Xưng "em", gọi người dùng là "anh". Trả lời tiếng Việt, ngắn gọn, ấm áp, đi thẳng vào kết quả. Không bao giờ dùng dấu gạch ngang dài.
Em lo cả công việc lẫn đời sống của anh: câu hỏi việc riêng, gia đình, sức khoẻ, thủ tục... vẫn trả lời tận tình bằng hiểu biết chung, nói rõ chỗ nào cần hỏi chuyên gia. Không từ chối vì "ngoài phạm vi cửa hàng".
Tin bắt đầu bằng [KHỞI ĐỘNG] là tin hệ thống: chỉ đáp "sẵn", không nhắc lại về sau.
Khối [Bối cảnh: ...] ở đầu tin là đoạn hội thoại anh và em đã nói ở chế độ khác hoặc trước đó: coi như em đã nghe, không nhắc lại là có khối đó.
TRÍ NHỚ DÀI HẠN: khi anh bảo "nhớ giúp em/anh", hoặc nói ra điều bền vững về bản thân, gia đình, sở thích, cách làm việc, quyết định kinh doanh, thì gọi nho__ghi để nhớ lâu (dùng ở mọi hội thoại sau). Anh bảo quên thì nho__xem rồi nho__xoa.
Câu bắt đầu bằng [GIỌNG NÓI] là anh đang NÓI CHUYỆN trực tiếp: trả lời như người thật nói qua điện thoại, 1 đến 3 câu ngắn, câu đầu đi thẳng vào ý, không gạch đầu dòng, không ký hiệu. SỐ LIỆU GIỮ NGUYÊN CHỮ SỐ đúng như công cụ trả về (vd "318,7 triệu", "541,3 triệu", "tăng 225%"): giọng đọc tự đọc đúng, TUYỆT ĐỐI không tự đổi số ra chữ, không làm tròn sai, không tự so sánh nếu dữ liệu không có. Cần tra số liệu thì vẫn gọi công cụ, nhưng chỉ nói kết quả chính.
GIỌNG NÓI: Classique OS TỰ ĐỌC câu trả lời của em thành tiếng (giọng Việt) khi anh bật chế độ "Chữ + giọng" hoặc "Rảnh tay". Vì vậy không bao giờ nói em không có giọng hay không phát được âm thanh. Anh bảo "trả lời bằng giọng" thì cứ trả lời bình thường, câu ngắn, dễ nghe.
Bạn làm việc qua các công cụ của Classique OS, tên dạng <kết nối>__<công cụ>:
- lark__*: Lark Base "{ten_base}" (sổ cái của công ty). Câu hỏi tổng quát (doanh thu, đơn, lead hôm nay/tuần/tháng, cảnh báo): gọi lark__chi_so_dieu_hanh trước, một lần là đủ.
{bang_chinh}  Bảng khác: lark__danh_sach_bang; chưa biết cột: lark__xem_cot; đếm/tổng: lark__thong_ke; tìm: lark__tim_dong.
- pancake__*: đơn, khách, sản phẩm, doanh thu Pancake POS (VND).
- meta__*: chiến dịch và hiệu quả quảng cáo Meta.
- wordpress__*: bài viết trên website WordPress của công ty.
- kho__*: kỹ năng đã cài trong Classique Store.
- nho__*: trí nhớ dài hạn của em về anh và công ty.
Chỉ dùng được công cụ của kết nối anh đã bật; không có công cụ nào thì nói rõ kết nối đó đang tắt.
- Luôn trả lời bằng SỐ THẬT lấy từ công cụ, không đoán. Không thấy thì nói không thấy. Nói rõ khoảng ngày của số liệu.
- Bảng Lark có chữ "mẫu cũ" là bảng bỏ: ưu tiên bảng thay thế cùng tên.
- Công cụ ghi có ghi chú [CHỈ TẠO ĐỀ XUẤT]: gọi xong nói "em đã tạo đề xuất, anh bấm Duyệt ở thẻ bên dưới", không được nói là đã làm.
- Công cụ ghi có ghi chú [CHẠY THẬT NGAY]: chỉ gọi khi anh yêu cầu rõ ràng việc đó.
- Câu trả lời sẽ được đọc thành tiếng: câu ngắn, rõ; gạch đầu dòng khi liệt kê từ 3 ý."""
HUONG_DAN = HSO.doi_xung_ho(HUONG_DAN.replace("{gioi_thieu}", HSO.gioi_thieu()).replace("{ten_base}", HS["lark"]["ten_base"]).replace(
    "{bang_chinh}", ("  Bảng chính (dùng thẳng id, khỏi dò): " + " · ".join(f"{b['ten']} {b['id']}" for b in HS["lark"]["bang_chinh"]) + ".\n")
    if HS["lark"]["bang_chinh"] else ""))


# ================= CLASSIQUE STORE (kỹ năng hmh-* trong kho/skills) =================
KHO = GOC / "kho" / "skills"
NHOM_KN = {"mkt": "Marketing", "sale": "Bán hàng", "AIOS": "Vận hành"}
_kn_dem = {"luc": 0, "ds": []}


def _doc_frontmatter(p):
    t = p.read_text(encoding="utf-8", errors="replace")
    if not t.startswith("---"):
        return {}, t
    dau, _, than = t[3:].partition("\n---")
    meta, khoa, gom = {}, None, []
    for dong in dau.splitlines():
        m = re.match(r"^([A-Za-z_-]+):\s*(.*)$", dong)
        if m and not dong.startswith(" "):
            if khoa and gom:
                meta[khoa] = " ".join(gom).strip()
            khoa, gt = m.group(1), m.group(2).strip()
            gom = [] if gt in (">", ">-", "|", "|-", "") else [gt.strip("\"'")]
        elif khoa and dong.strip():
            gom.append(dong.strip())
    if khoa and gom:
        meta[khoa] = " ".join(gom).strip()
    return meta, than.lstrip("\n")


def ds_ky_nang():
    if time.time() - _kn_dem["luc"] < 30:
        return _kn_dem["ds"]
    ds = []
    for d in sorted(KHO.glob("*/SKILL.md")):
        meta, than = _doc_frontmatter(d)
        thu_muc = d.parent
        ten = meta.get("name") or thu_muc.name
        tien_to = (ten.split("-") + ["", ""])[1]
        script = [str(f.relative_to(thu_muc)) for f in thu_muc.rglob("*") if f.suffix in (".py", ".js", ".mjs", ".sh", ".ts")]
        khoa = sorted(set(re.findall(r"\b([A-Z][A-Z0-9]+_(?:API_KEY|TOKEN|KEY|SECRET|CLIENT_ID|APP_ID))\b", than)))
        tai_lieu = [str(f.relative_to(thu_muc)) for f in thu_muc.rglob("*.md") if f.name != "SKILL.md"]
        ds.append({"ten": ten, "thu_muc": thu_muc.name, "nhom": NHOM_KN.get(tien_to, "Khác"),
                   "mo_ta": meta.get("description", "")[:1200], "so_dong": than.count("\n"),
                   "can_script": script[:20], "can_khoa": khoa[:10], "tai_lieu": tai_lieu[:40]})
    _kn_dem.update(luc=time.time(), ds=ds)
    return ds


def da_cai():
    return set(CAU_HINH.setdefault("ky_nang", []))


@app.get("/api/store")
def api_store():
    cai = da_cai()
    return [{**k, "da_cai": k["ten"] in cai} for k in ds_ky_nang()]


@app.get("/api/store/{ten}")
def api_store_xem(ten: str):
    for k in ds_ky_nang():
        if k["ten"] == ten:
            return {**k, "noi_dung": _doc_frontmatter(KHO / k["thu_muc"] / "SKILL.md")[1][:60000], "da_cai": ten in da_cai()}
    raise HTTPException(404, "Không có kỹ năng này")


@app.post("/api/store/{ten}/{viec}")
def api_store_cai(ten: str, viec: str):
    if ten not in {k["ten"] for k in ds_ky_nang()}:
        raise HTTPException(404, "Không có kỹ năng này")
    cai = da_cai()
    cai.add(ten) if viec == "cai" else cai.discard(ten)
    CAU_HINH["ky_nang"] = sorted(cai)
    luu_cau_hinh(CAU_HINH)
    ghi_nhat_ky("cau_hinh", f"{'Cài' if viec == 'cai' else 'Gỡ'} kỹ năng {ten}")
    return {"ten": ten, "da_cai": ten in cai}


def _kn_cai(ten):
    if ten not in da_cai():
        raise HTTPException(403, f"Kỹ năng {ten} chưa cài. Anh vào Store bấm Cài trước.")
    for k in ds_ky_nang():
        if k["ten"] == ten:
            return k
    raise HTTPException(404, "Không có kỹ năng này")


def kho_ds(a):
    cai = da_cai()
    return [{"ten": k["ten"], "nhom": k["nhom"], "mo_ta": k["mo_ta"][:300]} for k in ds_ky_nang() if k["ten"] in cai]


def kho_dung(a):
    k = _kn_cai(a["ten"])
    than = _doc_frontmatter(KHO / k["thu_muc"] / "SKILL.md")[1]
    return {"ky_nang": k["ten"], "huong_dan": than[:45000], "tai_lieu_kem": k["tai_lieu"],
            "luu_y": ("Trong Classique OS em KHÔNG chạy được script/lệnh máy. Làm phần nghiên cứu, suy nghĩ, viết; "
                      "dữ liệu thì lấy qua công cụ kết nối (lark__, pancake__, meta__, wordpress__). "
                      "Bước nào cần chạy script (" + ", ".join(k["can_script"][:5]) + ") thì nói rõ để anh chạy tay.") if k["can_script"] else
                     "Làm theo hướng dẫn; dữ liệu thật lấy qua công cụ kết nối. Không lưu được file: trả kết quả ngay trong câu trả lời."}


def kho_doc_tep(a):
    k = _kn_cai(a["ten"])
    goc = (KHO / k["thu_muc"]).resolve()
    p = (goc / a["tep"]).resolve()
    if goc not in p.parents or p.suffix not in (".md", ".txt", ".json", ".csv"):
        raise HTTPException(400, "Chỉ đọc được tệp tài liệu (.md/.txt/.json/.csv) bên trong thư mục kỹ năng.")
    return {"tep": a["tep"], "noi_dung": p.read_text(encoding="utf-8", errors="replace")[:45000]}


KN.dang_ky("kho", "Classique Store", "Kỹ năng hmh-* đã cài: AI đọc hướng dẫn kỹ năng rồi làm theo.", "Kỹ năng", [],
           lambda: f"{len(da_cai())}/{len(ds_ky_nang())} kỹ năng đã cài",
           [KN.cc("danh_sach_ky_nang", "Liệt kê kỹ năng đã cài (viết hook, leadpage, phễu LTV, định giá offer, SEO...). Gọi khi anh nhờ việc marketing, bán hàng, vận hành.", "doc", kho_ds),
            KN.cc("dung_ky_nang", "Nạp toàn bộ hướng dẫn của một kỹ năng đã cài để làm theo đúng quy trình.", "doc", kho_dung,
                  {"ten": {"type": "string", "description": "tên kỹ năng, vd hmh-mkt-hook-video"}}, ("ten",)),
            KN.cc("doc_tep_ky_nang", "Đọc một tệp tài liệu kèm theo trong thư mục kỹ năng (references/...md).", "doc", kho_doc_tep,
                  {"ten": {"type": "string"}, "tep": {"type": "string"}}, ("ten", "tep"))])
CAU_HINH["ket_noi"].setdefault("kho", {"bat": True, "quyen": "doc"})


# ================= TRÍ NHỚ: sổ hội thoại + nhớ dài hạn =================
# Trước 04/10 trợ lý quên vì: (1) phiên giọng và phiên chữ tách nhau, (2) mã phiên chỉ nằm trong RAM nên khởi động
# lại server là mất mạch, (3) tải lại trang mất lịch sử, (4) không có trí nhớ dài hạn. Khối này vá cả bốn.
HT_DB = GOC / "hoi-thoai.db"
PHIEN_TEP = GOC / "phien.json"
NHO_TEP = GOC / "tri-nho.json"


def ht():
    c = sqlite3.connect(HT_DB, check_same_thread=False)
    c.execute("CREATE TABLE IF NOT EXISTS luot (id INTEGER PRIMARY KEY AUTOINCREMENT, phien TEXT, vai TEXT, che_do TEXT, noi_dung TEXT, luc REAL)")
    return c


def ghi_luot(phien, vai, che_do, noi_dung):
    if not (noi_dung or "").strip():
        return None
    with _db_lock, ht() as c:
        return c.execute("INSERT INTO luot (phien, vai, che_do, noi_dung, luc) VALUES (?,?,?,?,?)",
                         (phien, vai, che_do, noi_dung.strip(), time.time())).lastrowid


def doc_luot(phien, sau_id=0, tru_che_do=None, gioi_han=40):
    q, p = "SELECT id, vai, che_do, noi_dung, luc FROM luot WHERE phien=? AND id>?", [phien, sau_id]
    if tru_che_do:
        q += " AND che_do<>?"
        p.append(tru_che_do)
    with _db_lock, ht() as c:
        rows = c.execute(q + " ORDER BY id DESC LIMIT ?", p + [gioi_han]).fetchall()
    return [{"id": r[0], "vai": r[1], "che_do": r[2], "noi_dung": r[3], "luc": r[4]} for r in reversed(rows)]


def luot_cuoi(phien):
    with _db_lock, ht() as c:
        r = c.execute("SELECT MAX(id) FROM luot WHERE phien=?", (phien,)).fetchone()
    return r[0] or 0


def luu_phien():
    try:
        PHIEN_TEP.write_text(json.dumps(PHIEN, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass


try:
    PHIEN.update(json.loads(PHIEN_TEP.read_text(encoding="utf-8")))
except Exception:
    pass


def boi_canh(luot, tieu_de):
    if not luot:
        return ""
    dong = [f"{'Anh' if x['vai'] == 'me' else 'Em'}: {x['noi_dung'][:600]}" for x in luot]
    return f"[{tieu_de}]\n" + "\n".join(dong) + "\n[Hết bối cảnh]\n\n"


# ---- nhớ dài hạn: nằm trong BỘ NÃO đang chọn (memory/facts/*.md), xem nao.py ----
import nao as NAO


def doc_nho():
    try:
        return NAO.ds_nho()
    except Exception:
        return []


def nho_ghi(a):
    nd = (a.get("noi_dung") or "").strip()
    if not nd:
        raise HTTPException(400, "Thiếu nội dung cần nhớ")
    try:
        r = NAO.them_nho(nd[:500], a.get("loai") or "khac")
    except ValueError as e:
        raise HTTPException(400, str(e))
    ghi_nhat_ky("cau_hinh", f"Ghi nhớ ({r.get('bo_nao', '')}): {nd[:80]}")
    return r


def nho_xem(a):
    return doc_nho()


def nho_xoa(a):
    return NAO.xoa_nho(a.get("id", ""))


KN.dang_ky("nho", "Trí nhớ", "Những điều trợ lý ghi nhớ lâu dài về anh và công ty, lưu trong bộ não đang chọn.", "Trợ lý", [],
           lambda: f"{len(doc_nho())} điều đang nhớ · {NAO.lay()['ten']}",
           [KN.cc("ghi", "Ghi nhớ LÂU DÀI một điều quan trọng (sở thích, thói quen, quyết định, thông tin người/công ty) khi anh bảo 'nhớ giúp' hoặc khi anh nói ra một điều bền vững. Không ghi chuyện vụn vặt hay số liệu thay đổi hằng ngày.",
                  "doc", nho_ghi, {"noi_dung": {"type": "string"}, "loai": {"type": "string", "enum": ["user", "preference", "business", "decision", "khac"]}}, ("noi_dung",)),
            KN.cc("xem", "Xem danh sách điều đang ghi nhớ.", "doc", nho_xem),
            KN.cc("xoa", "Quên một điều nhớ theo id (khi anh bảo quên đi hoặc điều đó đã sai). Vẫn khôi phục được qua lịch sử git.", "doc", nho_xoa, {"id": {"type": "string"}}, ("id",))])
CAU_HINH["ket_noi"].setdefault("nho", {"bat": True, "quyen": "doc"})


def _bao_loi(fn):
    def boc(a):
        try:
            return fn(a)
        except ValueError as e:
            return {"loi": str(e)}
    return boc


KN.dang_ky("nao", "Bộ não", "Kho kiến thức markdown (wiki, SOP, ghi chú) của bộ não đang chọn: repo GitHub hoặc thư mục trên máy chủ.", "Trợ lý", [],
           lambda: NAO.lay()["ten"],
           [KN.cc("tim", "Tìm trong bộ não theo từ khoá (tên trang, nội dung). Dùng TRƯỚC khi trả lời câu về công ty, sản phẩm, thương hiệu, quy trình, giọng văn, chính sách.",
                  "doc", _bao_loi(lambda a: NAO.tim(a.get("cau", ""))), {"cau": {"type": "string"}}, ("cau",)),
            KN.cc("doc", "Đọc một tệp hoặc liệt kê một thư mục trong bộ não (đường dẫn tương đối, vd index.md, CLAUDE.md, wiki/concepts/).",
                  "doc", _bao_loi(lambda a: NAO.doc(a.get("tep", ""))), {"tep": {"type": "string"}}, ("tep",)),
            KN.cc("ghi", "Ghi (tạo/ghi đè) hoặc nối thêm vào một tệp chữ trong bộ não, theo đúng sổ tay CLAUDE.md của bộ não. Mỗi lần ghi là một commit, hoàn tác được. Không ghi raw/.",
                  "ghi", _bao_loi(lambda a: NAO.ghi(a.get("tep", ""), a.get("noi_dung", ""), a.get("thong_diep", ""), bool(a.get("them_vao")))),
                  {"tep": {"type": "string"}, "noi_dung": {"type": "string"}, "thong_diep": {"type": "string", "description": "mô tả ngắn cho commit"},
                   "them_vao": {"type": "boolean", "description": "true = nối vào cuối tệp (vd log.md)"}}, ("tep", "noi_dung"),
                  lambda a: {"Tệp": a.get("tep", ""), "Cách ghi": "Nối thêm" if a.get("them_vao") else "Tạo / ghi đè", "Nội dung": str(a.get("noi_dung", ""))[:600]})])
CAU_HINH["ket_noi"].setdefault("nao", {"bat": True, "quyen": "toan"})


def phan_nho():
    try:
        return NAO.phan_prompt()
    except Exception:
        return ""


@app.get("/api/tri-nho")
def api_tri_nho():
    return doc_nho()


@app.post("/api/tri-nho")
def api_them_nho(a: dict):
    return nho_ghi(a)


@app.post("/api/tri-nho/{id_}/xoa")
def api_xoa_nho(id_: str):
    return nho_xoa({"id": id_})


def huong_dan_day_du(co_nho=True):
    cai = kho_ds({})
    s = HUONG_DAN
    if cai:
        s += "\n- Kỹ năng đã cài trong Store (việc khớp kỹ năng nào thì gọi kho__dung_ky_nang trước rồi làm theo):\n" + \
            "\n".join(f"  · {k['ten']}: {k['mo_ta'][:160]}" for k in cai)
    s += f"\n- Bộ não đang dùng: {NAO.lay()['ten']}."
    return s + (phan_nho() if co_nho else "")


import mcp_kho as MK


def cau_hinh_mcp():
    py, sv = str(GOC / ".venv/bin/python"), str(GOC / "mcp_os.py")
    servers = {"os": {"command": py, "args": [sv], "env": {"OS_AGENT_TOKEN": AGENT_TOKEN}}}
    for x in CAU_HINH["mcp_ngoai"]:
        if x.get("bat"):
            servers[x["ten"]] = may_chu_mcp(x)
    return servers


def may_chu_mcp(x):
    """Một MCP ngoài → cấu hình máy chủ, kèm env/header bí mật (chỉ đọc lúc chạy, từ khoa-mcp.json)."""
    bm = MK.bi_mat_cho(x["ten"]) if x.get("kho") else {"env": {}, "headers": {}}
    if x.get("url"):
        v = {"type": "http", "url": x["url"]}
        if bm["headers"]:
            v["headers"] = bm["headers"]
        return v
    v = {"command": x["lenh"], "args": x.get("tham_so") or []}
    if bm["env"]:
        v["env"] = bm["env"]
    return v


def lenh_claude(sid, model):
    servers = cau_hinh_mcp()
    cmd = ["claude", "-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages",
           "--model", model, "--tools", "", "--strict-mcp-config", "--mcp-config", json.dumps({"mcpServers": servers}),
           "--allowedTools", *[f"mcp__{k}" for k in servers], "--append-system-prompt", huong_dan_day_du()]
    if sid:
        cmd += ["--resume", sid]
    return cmd


def lenh_codex(sid, model):
    """ChatGPT qua Codex CLI (đã chạy trên VPS với gói Plus, 04/10)."""
    cmd = ["codex", "exec"] + (["resume", sid] if sid else []) + [
        "--json", "--skip-git-repo-check", "-m", model, "-c", 'approval_policy="never"', "-c", 'sandbox_mode="read-only"']
    for k, v in cau_hinh_mcp().items():
        if v.get("url"):
            cmd += ["-c", f'mcp_servers.{k}.url={json.dumps(v["url"])}']
            for hk, hv in (v.get("headers") or {}).items():      # tên header KHÔNG bọc nháy (Codex giữ nguyên dấu nháy)
                cmd += ["-c", f'mcp_servers.{k}.http_headers.{hk}={json.dumps(hv)}']
        else:
            cmd += ["-c", f'mcp_servers.{k}.command={json.dumps(v["command"])}', "-c", f'mcp_servers.{k}.args={json.dumps(v["args"])}']
            for ek, ev in (v.get("env") or {}).items():
                cmd += ["-c", f'mcp_servers.{k}.env.{ek}={json.dumps(ev)}']
        # Công cụ ghi của OS tự chạy (không chờ duyệt): mức quyền từng kết nối vẫn do /api/agent/goi giữ
        # (Chỉ đọc / Đề xuất / Toàn quyền). Shell riêng của Codex vẫn sandbox read-only.
        if k == "os":
            cmd += ["-c", f'mcp_servers.{k}.default_tools_approval_mode="approve"']
    return cmd + ["-"]


def thu_muc_codex():
    """Codex có shell riêng và hay tự tìm bằng lệnh trong thư mục làm việc: cho nó đứng NGAY trong bộ não đang chọn
    (sandbox read-only), để lệnh tìm của nó trúng kiến thức thật thay vì thư mục code của OS."""
    d = NAO.thu_muc(NAO.lay())
    return str(d) if d.exists() else str(GOC)


class Chat(BaseModel):
    cau: str
    phien: str = "mac-dinh"
    giong: bool = False          # câu nói bằng giọng: trả lời ngắn như nói chuyện, model nhanh
    lam_viec: dict | None = None  # {engine, model}: việc ChatGPT Live giao, chạy trên "model làm việc" anh chọn
    ghi: bool = True             # False: không ghi sổ hội thoại (Live đã tự ghi lời thoại)


def sse(d):
    return f"data: {json.dumps(d, ensure_ascii=False)}\n\n"


def su_kien_cong_cu(ten_day, args):
    # Claude gọi tên dạng mcp__os__pancake__doanh_thu; Codex gọi thẳng pancake__doanh_thu.
    ten = ten_day[9:] if ten_day.startswith("mcp__os__") else ten_day[5:] if ten_day.startswith("mcp__") else ten_day
    bang = (args or {}).get("bang") if ten.startswith("lark__") else None
    if ten.startswith("nao__") and (args or {}).get("tep"):      # đọc/ghi trang nào thì nút đó sáng trên sơ đồ
        tep = str(args["tep"]).strip().lstrip("/")
        return {"t": "cong_cu", "ten": ten.replace("__", " · "), "bang": tep, "ten_bang": tep.rsplit("/", 1)[-1].removesuffix(".md")}
    nhan = ten.replace("__", " · ")
    ghi_nhat_ky("cong_cu", f"{nhan} {ten_bang(bang) if bang else ''}".strip(), bang)
    return {"t": "cong_cu", "ten": nhan, "bang": bang, "ten_bang": ten_bang(bang) if bang else None}


def de_xuat_trong(noi):
    return [DE_XUAT[i] for i in sorted(set(re.findall(r"dx\d+", noi))) if i in DE_XUAT]


LOI_DANG_NHAP = {"claude": "Claude trên máy này chưa đăng nhập. Mở Terminal chạy: claude auth login (một lần), rồi hỏi lại.",
                 "codex": "ChatGPT (Codex) chưa đăng nhập. Mở Terminal chạy: codex login, rồi hỏi lại."}


# ---- Phiên Claude chạy sẵn (stream-json): bỏ thời gian khởi động mỗi câu ----
# Đo trên VPS 04/10: claude -p mỗi câu tốn ~6-7 giây khởi động (CLI + nạp MCP) trước khi nghĩ. Giữ MỘT tiến trình sống
# cho mỗi hội thoại, câu sau chỉ còn ~1,5 giây. Tiến trình chết thì mở lại bằng --resume để không mất mạch.
class PhienSong:
    def __init__(self, khoa, model):
        self.khoa, self.model, self.p, self.sid, self.lock = khoa, model, None, PHIEN.get(khoa), asyncio.Lock()
        self.dau, self.luc, self.loi = None, time.time(), ""

    async def mo(self):
        dau = huong_dan_day_du(False) + json.dumps(cau_hinh_mcp(), sort_keys=True)
        if self.p and self.p.returncode is None and dau == self.dau:
            return
        await self.dong()
        servers = cau_hinh_mcp()
        cmd = ["claude", "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
               "--include-partial-messages", "--model", self.model, "--tools", "", "--strict-mcp-config",
               "--mcp-config", json.dumps({"mcpServers": servers}), "--allowedTools", *[f"mcp__{k}" for k in servers],
               "--append-system-prompt", huong_dan_day_du()]
        if self.sid:
            cmd += ["--resume", self.sid]
        self.p = await asyncio.create_subprocess_exec(*cmd, cwd=str(GOC), stdin=asyncio.subprocess.PIPE,
                                                      stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                                                      limit=10 * 1024 * 1024)
        self.dau = dau
        asyncio.create_task(self._doc_loi(self.p))

    async def _doc_loi(self, p):
        try:
            self.loi = (await p.stderr.read()).decode(errors="replace")[-800:]
        except Exception:
            pass

    async def dong(self):
        if self.p and self.p.returncode is None:
            try:
                self.p.kill()
                await self.p.wait()
            except Exception:
                pass
        self.p = None

    async def hoi(self, cau):
        """Gửi một câu, trả về từng sự kiện stream-json cho tới khi có 'result'."""
        async with self.lock:
            self.luc = time.time()
            for lan in range(2):
                await self.mo()
                try:
                    self.p.stdin.write((json.dumps({"type": "user", "message": {"role": "user", "content": cau}}, ensure_ascii=False) + "\n").encode())
                    await self.p.stdin.drain()
                except (BrokenPipeError, ConnectionResetError):
                    await self.dong()
                    continue
                co_ket_qua = False
                while True:
                    raw = await self.p.stdout.readline()
                    if not raw:
                        break
                    try:
                        ev = json.loads(raw)
                    except Exception:
                        continue
                    if ev.get("session_id") and ev["session_id"] != self.sid:
                        self.sid = PHIEN[self.khoa] = ev["session_id"]
                        luu_phien()
                    yield ev
                    if ev.get("type") == "result":
                        co_ket_qua = True
                        break
                if co_ket_qua:
                    self.luc = time.time()
                    return
                await asyncio.sleep(.2)
                loi = self.loi
                await self.dong()
                if "Not logged in" in loi or "/login" in loi:
                    yield {"type": "result", "is_error": True, "result": "Not logged in"}
                    return
                if lan == 1:
                    yield {"type": "result", "is_error": True, "result": (loi or "Claude dừng bất thường")[-400:]}


SONG = {}


def lay_phien(khoa, model):
    ps = SONG.get(khoa)
    if not ps or ps.model != model:
        if ps:
            asyncio.create_task(ps.dong())
        ps = SONG[khoa] = PhienSong(khoa, model)
    return ps


async def don_phien_nhan_roi():
    while True:
        await asyncio.sleep(120)
        for k, ps in list(SONG.items()):
            if time.time() - ps.luc > 1200 and not ps.lock.locked():
                await ps.dong()


@app.on_event("startup")
async def _khoi_dong_don():
    asyncio.create_task(don_phien_nhan_roi())


def model_cho(c):
    """Câu nói bằng giọng dùng model nhanh (mặc định haiku) để trả lời gần như ngay."""
    if c.lam_viec:
        return c.lam_viec["model"], c.phien + "#live"
    if c.giong:
        return {**GIONG_MD, **CAU_HINH.get("giong", {})}.get("model_giong", "haiku"), c.phien + "#giong"
    return CAU_HINH["model"]["model"], c.phien


@app.post("/api/chat/khoi-dong")
async def api_khoi_dong(c: dict):
    """Mở sẵn phiên (lúc anh bật chế độ trò chuyện) để câu đầu không phải chờ khởi động."""
    if CAU_HINH["model"]["engine"] != "claude":
        return {"ok": False}
    model, khoa = model_cho(Chat(cau="", phien=c.get("phien", "mac-dinh"), giong=bool(c.get("giong"))))
    ps = lay_phien(khoa, model)
    if ps.p and ps.p.returncode is None and getattr(ps, "da_am", False):
        return {"ok": True, "model": model, "san": True}

    async def am_may():
        # Tiến trình stream-json chỉ thật sự khởi động (CLI + MCP + model) ở câu đầu tiên. Chạy ngầm một lượt
        # ngắn để câu thật đầu tiên của anh không phải chờ ~4 giây khởi động.
        try:
            async for _ in ps.hoi("[KHỞI ĐỘNG] Đây là tin hệ thống, không phải anh hỏi. Chỉ trả lời đúng một chữ: sẵn"):
                pass
            ps.da_am = True
        except Exception:
            pass
    asyncio.create_task(am_may())
    return {"ok": True, "model": model}


@app.post("/api/chat")
async def api_chat(c: Chat):
    ghi_nhat_ky("hoi", c.cau)
    md = c.lam_viec or CAU_HINH["model"]
    eng, model = md["engine"], md["model"]
    kp = c.phien + ("#live" if c.lam_viec else "")      # mạch Codex riêng cho việc Live giao

    def ghi(*a):
        if c.ghi:
            ghi_luot(*a)

    async def chay():
        if eng == "claude":
            async for x in chay_song():
                yield x
            return
        if eng in MA.NHA:
            async for x in chay_api():
                yield x
            return
        # Việc Live giao: luôn mạch Codex MỚI. Nối mạch cũ thì hai việc gần nhau tranh khoá thread ("Phiên cũ hết hạn")
        # và mạch phình tới ~600 nghìn token sau vài lần tra bộ não (đo 05/10). 20 lượt gần nhất đi kèm làm bối cảnh.
        sid = None if c.lam_viec else PHIEN.get(kp)
        lenh = lenh_codex(sid, model)
        # Codex: mạch mới thì kèm lời dặn + 20 lượt gần nhất (vd vừa đổi từ Claude sang) để không mất ngữ cảnh
        bc = "" if sid else boi_canh(doc_luot(c.phien, gioi_han=20), "Bối cảnh: đoạn anh và em đã trao đổi trước đó")
        ghi(c.phien, "me", "giong" if c.giong else "chu", c.cau)
        # Codex ≥0.160 luôn giấu công cụ MCP sau tool_search; không nhắc thì model tưởng không có công cụ (đo 04/10).
        nhac = ("[Hệ thống: công cụ của OS (lark__, nao__, nho__, pancake__, meta__, wp__, kho__) nằm sau tool_search. "
                "Cần số liệu, tra bộ não hay ghi gì thì gọi tool_search với tên nhóm trước rồi dùng công cụ đó.]\n")
        dau_vao = nhac + c.cau if sid else f"{huong_dan_day_du()}\n\n---\n\n{bc}{nhac}{c.cau}"
        tra_loi_cx = []
        try:
            p = await asyncio.create_subprocess_exec(*lenh, cwd=thu_muc_codex(), stdin=asyncio.subprocess.PIPE,
                                                     stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                                                     limit=10 * 1024 * 1024)
        except FileNotFoundError:
            yield sse({"t": "loi", "text": f"Máy chưa cài {eng}. Xem trang Models."})
            yield sse({"t": "het"})
            return
        p.stdin.write(dau_vao.encode())
        await p.stdin.drain()
        p.stdin.close()
        da_tra = False
        async for raw in p.stdout:
            try:
                ev = json.loads(raw)
            except Exception:
                continue
            ty = ev.get("type")
            # ---------- Claude ----------
            if ty == "system" and ev.get("session_id"):
                PHIEN[kp] = ev["session_id"]
            elif ty == "stream_event":
                e = ev.get("event") or {}
                dl = e.get("delta") or {}
                if e.get("type") == "content_block_delta" and dl.get("type") == "text_delta":
                    da_tra = True
                    yield sse({"t": "chu", "text": dl.get("text", "")})
                elif e.get("type") == "message_start":
                    yield sse({"t": "luot"})
            elif ty == "assistant":
                for b in (ev.get("message") or {}).get("content") or []:
                    if b.get("type") == "tool_use":
                        yield sse(su_kien_cong_cu(b.get("name", ""), b.get("input")))
            elif ty == "user":
                for b in (ev.get("message") or {}).get("content") or []:
                    if b.get("type") == "tool_result":
                        for dx in de_xuat_trong(json.dumps(b.get("content"), ensure_ascii=False)):
                            yield sse({"t": "de_xuat", "dx": dx})
                        yield sse({"t": "xong_cong_cu"})
            elif ty == "result":
                if ev.get("is_error") or (ev.get("subtype") not in (None, "success")):
                    t = str(ev.get("result") or ev.get("subtype"))
                    if "Not logged in" in t or "/login" in t:
                        PHIEN.pop(kp, None)
                        t = LOI_DANG_NHAP["claude"]
                    da_tra = True
                    yield sse({"t": "loi", "text": t[:500]})
                elif not da_tra and ev.get("result"):
                    yield sse({"t": "chu", "text": ev["result"]})
            # ---------- Codex ----------
            elif ty == "thread.started":
                if not c.lam_viec:
                    PHIEN[kp] = ev.get("thread_id")
            elif ty in ("item.started", "item.completed"):
                it = ev.get("item") or {}
                if it.get("type") == "command_execution" and ty == "item.started":
                    lenh_sh = str(it.get("command") or "")
                    yield sse({"t": "cong_cu", "ten": "bộ não · " + ("tìm" if re.search(r"\b(rg|grep|find)\b", lenh_sh) else "đọc"), "bang": None, "ten_bang": None})
                    yield sse({"t": "xong_cong_cu"})
                elif it.get("type") == "mcp_tool_call":
                    if ty == "item.started":
                        a = it.get("arguments")
                        a = json.loads(a) if isinstance(a, str) else a
                        yield sse(su_kien_cong_cu(f"{it.get('tool')}", a))
                    else:
                        for dx in de_xuat_trong(json.dumps(it.get("result"), ensure_ascii=False)):
                            yield sse({"t": "de_xuat", "dx": dx})
                        yield sse({"t": "xong_cong_cu"})
                elif it.get("type") == "agent_message" and ty == "item.completed":
                    if da_tra:
                        yield sse({"t": "luot"})
                    da_tra = True
                    tra_loi_cx.append(it.get("text", ""))
                    yield sse({"t": "chu", "text": it.get("text", "")})
            elif ty in ("turn.failed", "error"):
                t = str((ev.get("error") or {}).get("message") or ev.get("message") or "Codex lỗi")
                if "login" in t.lower() or "auth" in t.lower():
                    PHIEN.pop(kp, None)
                    t = LOI_DANG_NHAP["codex"]
                da_tra = True
                yield sse({"t": "loi", "text": t[:500]})
        loi = (await p.stderr.read()).decode(errors="replace")
        await p.wait()
        if p.returncode and not da_tra:
            if "Not logged in" in loi or "/login" in loi or "codex login" in loi.lower():
                PHIEN.pop(kp, None)
                yield sse({"t": "loi", "text": LOI_DANG_NHAP[eng]})
            elif sid and ("session" in loi.lower() or "thread" in loi.lower()):
                PHIEN.pop(kp, None)
                yield sse({"t": "loi", "text": "Phiên cũ hết hạn, anh hỏi lại một lần nhé."})
            elif loi:
                yield sse({"t": "loi", "text": loi[-500:]})
        ghi(c.phien, "bot", "giong" if c.giong else "chu", "\n\n".join(tra_loi_cx))
        luu_phien()
        yield sse({"t": "het"})

    async def chay_api():
        """Model API key: vòng gọi công cụ do OS tự chạy (tối đa 30 vòng), mỗi công cụ qua đúng chốt quyền."""
        che_do = "giong" if c.giong else "chu"
        tin = [{"role": "system", "content": huong_dan_day_du()}]
        for x in doc_luot(c.phien, gioi_han=20):
            tin.append({"role": "user" if x["vai"] == "me" else "assistant", "content": x["noi_dung"][:4000]})
        ghi(c.phien, "me", che_do, c.cau)
        tin.append({"role": "user", "content": (f"[GIỌNG NÓI] {c.cau}") if c.giong else c.cau})
        cc = MA.cong_cu_openai(cong_cu_dang_bat())
        tra_loi = ""
        try:
            for vong in range(MA.VONG_TOI_DA):
                m = await asyncio.to_thread(MA.goi_model, eng, model, tin, cc)
                goi = m.get("tool_calls") or []
                if not goi:
                    tra_loi = m.get("content") or ""
                    yield sse({"t": "chu", "text": tra_loi or "(model không trả lời)"})
                    break
                tin.append({"role": "assistant", "content": m.get("content") or "", "tool_calls": goi})
                for g in goi:
                    f = g.get("function") or {}
                    try:
                        args = json.loads(f.get("arguments") or "{}")
                    except Exception:
                        args = {}
                    yield sse(su_kien_cong_cu(f.get("name", ""), args))
                    try:
                        kq = await asyncio.to_thread(api_goi, Goi(ten=f.get("name", ""), args=args))
                    except HTTPException as e:
                        kq = {"loi": e.detail}
                    except Exception as e:
                        kq = {"loi": str(e)}
                    noi = json.dumps(kq, ensure_ascii=False, default=str)
                    for dx in de_xuat_trong(noi):
                        yield sse({"t": "de_xuat", "dx": dx})
                    yield sse({"t": "xong_cong_cu"})
                    tin.append({"role": "tool", "tool_call_id": g.get("id"), "content": noi[:20000]})
            else:
                yield sse({"t": "loi", "text": "Dừng sau 30 vòng gọi công cụ (model có thể đang lặp)."})
        except ValueError as e:
            yield sse({"t": "loi", "text": str(e)})
        except Exception as e:
            yield sse({"t": "loi", "text": f"{MA.NHA[eng]['ten']}: {e}"[:500]})
        ghi(c.phien, "bot", che_do, tra_loi)
        yield sse({"t": "het"})

    async def chay_song():
        model_s, khoa = model_cho(c)
        che_do = "giong" if c.giong else "chu"
        ps = lay_phien(khoa, model_s)
        moc_key = khoa + "@dong_bo"
        moc = PHIEN.get(moc_key, 0)
        if not ps.sid:      # mạch mới hoàn toàn (vd mất phiên): đưa 20 lượt gần nhất làm bối cảnh
            bc = boi_canh(doc_luot(c.phien, gioi_han=20), "Bối cảnh: đoạn anh và em đã trao đổi trước đó trong hội thoại này")
        else:               # đưa phần anh nói ở chế độ kia (giọng ↔ chữ) mà mạch này chưa biết
            bc = boi_canh(doc_luot(c.phien, sau_id=moc, tru_che_do=che_do, gioi_han=20),
                          "Bối cảnh: đoạn anh và em vừa trao đổi ở chế độ " + ("gõ chữ" if c.giong else "nói chuyện bằng giọng"))
        ghi(c.phien, "me", che_do, c.cau)
        cau = bc + ((f"[GIỌNG NÓI] {c.cau}") if c.giong else c.cau)
        da_tra = False
        tra_loi = []
        try:
            async for ev in ps.hoi(cau):
                ty = ev.get("type")
                if ty == "stream_event":
                    e = ev.get("event") or {}
                    dl = e.get("delta") or {}
                    if e.get("type") == "content_block_delta" and dl.get("type") == "text_delta":
                        da_tra = True
                        tra_loi.append(dl.get("text", ""))
                        yield sse({"t": "chu", "text": dl.get("text", "")})
                    elif e.get("type") == "message_start":
                        if tra_loi:
                            tra_loi.append("\n\n")
                        yield sse({"t": "luot"})
                elif ty == "assistant":
                    for b in (ev.get("message") or {}).get("content") or []:
                        if b.get("type") == "tool_use":
                            yield sse(su_kien_cong_cu(b.get("name", ""), b.get("input")))
                elif ty == "user":
                    for b in (ev.get("message") or {}).get("content") or []:
                        if b.get("type") == "tool_result":
                            for dx in de_xuat_trong(json.dumps(b.get("content"), ensure_ascii=False)):
                                yield sse({"t": "de_xuat", "dx": dx})
                            yield sse({"t": "xong_cong_cu"})
                elif ty == "result":
                    if ev.get("is_error") or ev.get("subtype") not in (None, "success"):
                        t = str(ev.get("result") or ev.get("subtype"))
                        if "Not logged in" in t or "/login" in t:
                            t = LOI_DANG_NHAP["claude"]
                        yield sse({"t": "loi", "text": t[:500]})
                    elif not da_tra and ev.get("result"):
                        tra_loi.append(ev["result"])
                        yield sse({"t": "chu", "text": ev["result"]})
        except FileNotFoundError:
            yield sse({"t": "loi", "text": "Máy chưa cài claude. Xem trang Models."})
        ghi(c.phien, "bot", che_do, "".join(tra_loi))
        PHIEN[moc_key] = luot_cuoi(c.phien)      # mạch này đã biết tới lượt mới nhất
        luu_phien()
        yield sse({"t": "het"})

    return StreamingResponse(chay(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/phien-moi")
async def api_phien_moi(c: dict):
    p = c.get("phien", "mac-dinh")
    for k in (p, p + "#giong"):
        PHIEN.pop(k, None)
        PHIEN.pop(k + "@dong_bo", None)
        ps = SONG.pop(k, None)
        if ps:
            await ps.dong()
    with _db_lock, ht() as cn:      # hội thoại mới: sổ hội thoại cũ chuyển sang phiên lưu trữ, khung chat trống lại
        cn.execute("UPDATE luot SET phien=? WHERE phien=?", (f"{p}~{int(time.time())}", p))
    luu_phien()
    return {"ok": True}


# ---- giọng đọc tiếng Việt (Edge TTS, gửi chữ tới Microsoft) ----
@app.get("/api/tts")
async def api_tts(chu_doc: str, giong: str = "", toc_do: int | None = None):
    import edge_tts
    g = {**GIONG_MD, **CAU_HINH.get("giong", {})}
    giong = giong if giong in {x["id"] for x in GIONG} else g["giong"]
    td = g["toc_do"] if toc_do is None else max(-30, min(40, toc_do))
    sach = re.sub(r"[*_#`>|<&\[\]{}]", " ", chu_doc)
    sach = re.sub(r"\s+", " ", sach).strip()[:2500]
    if not sach:
        raise HTTPException(400, "Không có chữ để đọc")

    async def doc(chu, gi):
        out = bytearray()
        async for ch in edge_tts.Communicate(chu, gi, rate=f"{td:+d}%").stream():
            if ch["type"] == "audio":
                out += ch["data"]
        return bytes(out)

    # Edge đôi khi trả NoAudioReceived với một đoạn dài/lạ: thử lại theo từng câu, rồi giọng dự phòng.
    for gi in (giong, "vi-VN-HoaiMyNeural"):
        try:
            return Response(await doc(sach, gi), media_type="audio/mpeg")
        except Exception:
            try:
                cau = [c for c in re.split(r"(?<=[.!?…])\s+", sach) if c.strip()]
                return Response(b"".join([await doc(c, gi) for c in cau]), media_type="audio/mpeg")
            except Exception:
                continue
    raise HTTPException(502, "Dịch vụ giọng đọc tạm lỗi, thử lại sau.")


# ---- đồ thị Base: bảng = nút, cột liên kết = cạnh ----
@app.get("/api/do-thi")
def api_do_thi(lam_moi: bool = False):
    """Sơ đồ ở trang Trợ lý: các trang của BỘ NÃO đang chọn và [[liên kết]] giữa chúng (như Obsidian)."""
    if lam_moi:
        NAO._do_thi.clear()
    return NAO.do_thi()


# ---- hoạt động & việc định kỳ ----
@app.get("/api/nhat-ky")
def api_nk():
    return NHAT_KY


@app.get("/api/viec")
def api_viec():
    """Các timer systemd chạy kèm trên máy chủ: bản chép trong du-lieu/timers (chỉ để xem, không lên git)."""
    thu_muc = GOC / "du-lieu" / "timers"
    ra = []
    for t in sorted(thu_muc.glob("*.timer")):
        s = t.with_suffix(".service")
        st = s.read_text(encoding="utf-8") if s.exists() else ""
        tt = t.read_text(encoding="utf-8")
        mo_ta = re.findall(r"Description=(.+)", st) or re.findall(r"Description=(.+)", tt)
        chay = re.findall(r"ExecStart=(.+)", st)
        ra.append({"ten": t.stem, "lich": re.findall(r"OnCalendar=(.+)", tt),
                   "mo_ta": mo_ta[0] if mo_ta else "", "lenh": chay[0] if chay else ""})
    return ra



# ================= ĐIỀU HÀNH (dashboard chỉ số từ Lark) =================
from datetime import date, datetime as _dt, timedelta as _td

# Bảng nào là đơn, khách, lead... khai ở ho-so.json → lark.bang. Tên cột theo mẫu Base "CRM Anh Cả";
# bảng chưa khai thì phần đó của trang Điều hành để trống.
BANG = HS["lark"]["bang"]
TTL_DASH = 3 * 3600          # đệm 3 tiếng/bảng: dashboard mở cả ngày vẫn không đốt hạn mức API Lark


def dd(bang_key, lam_moi=False):
    bid = BANG.get(bang_key)
    if not bid:
        return [], None
    v, luc = dem_doc(f"dong:{bid}")
    if lam_moi or v is None or time.time() - (luc or 0) > TTL_DASH:
        v, luc = ds_dong(bid, True)
    return [d["o"] for d in v], luc


def so(v):
    try:
        return float(str(chu(v)).replace(",", "").strip() or 0)
    except ValueError:
        return 0.0


def ngay_cua(v):
    if isinstance(v, (int, float)) and v > 10**11:
        return date.fromtimestamp(v / 1000)
    s = chu(v)[:10]
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def gio_cua(v):
    if isinstance(v, (int, float)) and v > 10**11:
        return _dt.fromtimestamp(v / 1000).strftime("%d/%m %H:%M")
    return chu(v)[:16]


def trong(ngay, tu, den):
    return ngay is not None and tu <= ngay <= den


def xu_huong(nay, truoc):
    if not truoc:
        return None
    return round((nay - truoc) / truoc * 100, 1)


_meta_dem = {}


def meta_7_ngay(lam_moi=False):
    if not lam_moi and "v" in _meta_dem and time.time() - _meta_dem["luc"] < 3600:
        return _meta_dem["v"]
    try:
        if not CAU_HINH["ket_noi"].get("meta", {}).get("bat") or KN.thieu_khoa(KN.KET_NOI["meta"]["can"]):
            v = {"loi": "Kết nối Meta Ads đang tắt"}
        else:
            r = KN.meta_hieu_qua({"so_ngay": 7})
            tong = lambda k: round(sum(so(x.get(k)) for x in r["dong"]), 2)
            v = {"chi_tieu": tong("chi_tieu"), "hien_thi": tong("hien_thi"), "click": tong("click"), "tin_nhan": tong("tin_nhan"),
                 "chien_dich": sorted(r["dong"], key=lambda x: -so(x.get("chi_tieu")))[:6], "tu": r["tu_ngay"], "den": r["den_ngay"]}
            v["ctr"] = round(v["click"] / v["hien_thi"] * 100, 2) if v["hien_thi"] else 0
    except Exception as e:
        v = {"loi": str(e)[:200]}
    _meta_dem.update(v=v, luc=time.time())
    return v


def don_hop_le(o):
    return chu(o.get("Trạng thái")) not in ("Đã huỷ", "Đã hủy", "Đã hoàn", "Đã xoá")


def tinh_dieu_hanh(lam_moi=False):
    hom_nay = date.today()
    don, luc_don = dd("don", lam_moi)
    lead, _ = dd("lead", lam_moi)
    khach, _ = dd("khach", lam_moi)
    sp, _ = dd("sp", lam_moi)
    viec, _ = dd("viec", lam_moi)
    seo, _ = dd("seo", lam_moi)
    nk, _ = dd("nhat_ky", lam_moi)
    thu_chi, _ = dd("thu_chi", lam_moi)
    dong_tien, _ = dd("dong_tien", lam_moi)

    def khoang(n, lui=0):
        den = hom_nay - _td(days=lui)
        return den - _td(days=n - 1), den

    hl = [o for o in don if don_hop_le(o)]
    def dt(tu, den):
        x = [o for o in hl if trong(ngay_cua(o.get("Ngày tạo")), tu, den)]
        return sum(so(o.get("Tổng tiền")) for o in x), len(x)
    dt7, sd7 = dt(*khoang(7)); dt7t, sd7t = dt(*khoang(7, 7))
    dt1, sd1 = dt(hom_nay, hom_nay)
    lead1 = sum(1 for o in lead if ngay_cua(o.get("Ngày tạo")) == hom_nay)
    dt30, sd30 = dt(*khoang(30))
    lead7 = sum(1 for o in lead if trong(ngay_cua(o.get("Ngày tạo")), *khoang(7)))
    lead7t = sum(1 for o in lead if trong(ngay_cua(o.get("Ngày tạo")), *khoang(7, 7)))
    con_thu = sum(so(o.get("Còn thu")) for o in hl)

    theo_ngay = {}
    tu30, _d = khoang(30)
    for i in range(30):
        theo_ngay[(tu30 + _td(days=i)).isoformat()] = 0
    for o in hl:
        n = ngay_cua(o.get("Ngày tạo"))
        if n and n.isoformat() in theo_ngay:
            theo_ngay[n.isoformat()] += so(o.get("Tổng tiền"))
    def nhom(rows, cot, tien=None):
        g = {}
        for o in rows:
            k = chu(o.get(cot)) or "(trống)"
            x = g.setdefault(k, {"so": 0, "tien": 0})
            x["so"] += 1
            if tien:
                x["tien"] += so(o.get(tien))
        return dict(sorted(g.items(), key=lambda kv: -(kv[1]["tien"] or kv[1]["so"])))
    don30 = [o for o in hl if trong(ngay_cua(o.get("Ngày tạo")), *khoang(30))]

    lead_trong = sum(1 for o in lead if not chu(o.get("Trạng Thái")))
    viec_mo = [o for o in viec if chu(o.get("Trạng thái")) != "Hoàn thành"]
    viec_ds = sorted(viec_mo, key=lambda o: chu(o.get("Hạn hoàn thành")) or "9999")[:8]
    dang_ban = [o for o in sp if chu(o.get("Tình trạng bán")) == "Đang bán"]

    lead_ngay = {k: 0 for k in theo_ngay}
    for o in lead:
        n = ngay_cua(o.get("Ngày tạo"))
        if n and n.isoformat() in lead_ngay:
            lead_ngay[n.isoformat()] += 1

    tc_thang = [{"thang": f"{chu(o.get('Tháng'))}/{chu(o.get('Năm'))}", "thu": so(o.get("Tổng Thu")), "chi": so(o.get("Tổng Chi")),
                 "dong_tien": so(o.get("Dòng Tiền"))} for o in thu_chi]
    co_thu_chi = any(x["thu"] or x["chi"] for x in tc_thang)
    quy = {}
    for o in dong_tien:
        q = chu(o.get("Quỹ")) or "(khác)"
        g = quy.setdefault(q, {"thu": 0, "chi": 0, "dong_tien": 0})
        g["thu"] += so(o.get("Số Tiền Thu Vào"))
        g["chi"] += so(o.get("Số Tiền Chi Ra"))
        g["dong_tien"] = so(o.get("Dòng Tiền")) or g["dong_tien"]

    nk_ds = sorted(nk, key=lambda o: so(o.get("Lúc")), reverse=True)[:8]
    seo_tt = nhom(seo, "Trạng thái")
    seo_dang = sorted([o for o in seo if chu(o.get("Trạng thái")) == "Đã đăng"], key=lambda o: chu(o.get("Ngày đăng")), reverse=True)[:6]
    cho_duyet = [d for d in DE_XUAT.values() if d["trang_thai"] == "cho"]

    # ---- Cảnh báo của AI: luật soi số liệu thật (không bịa), mức: do / cam / vang ----
    canh_bao = []
    if lead and lead_trong / len(lead) >= .5:
        canh_bao.append({"muc": "do", "noi_dung": f"{round(lead_trong / len(lead) * 100)}% lead ({lead_trong}/{len(lead)}) chưa được chăm sóc: chưa có trạng thái."})
    if dt7t and (dt7 - dt7t) / dt7t <= -.2:
        canh_bao.append({"muc": "do", "noi_dung": f"Doanh thu 7 ngày giảm {round((dt7t - dt7) / dt7t * 100)}% so với tuần trước."})
    moi_cu = [o for o in hl if chu(o.get("Trạng thái")) == "Mới" and (ngay_cua(o.get("Ngày tạo")) or hom_nay) <= hom_nay - _td(days=3)]
    if moi_cu:
        canh_bao.append({"muc": "cam", "noi_dung": f"{len(moi_cu)} đơn còn trạng thái \"Mới\" quá 3 ngày, chưa xác nhận."})
    if con_thu and dt30 and con_thu > dt30:
        canh_bao.append({"muc": "cam", "noi_dung": f"Còn phải thu {round(con_thu / 1e6, 1)} tr, lớn hơn doanh thu 30 ngày: cần đối soát cột \"Còn thu\"."})
    khong_sale = sum(1 for o in don30 if not chu(o.get("Sale")))
    if khong_sale:
        canh_bao.append({"muc": "vang", "noi_dung": f"{khong_sale}/{len(don30)} đơn 30 ngày chưa gán sale, chưa tính được hoa hồng."})
    so_cho_web = sum(1 for o in sp if chu(o.get("Trạng thái web")) == "Chờ duyệt")
    if so_cho_web:
        canh_bao.append({"muc": "vang", "noi_dung": f"{so_cho_web} sản phẩm đang chờ duyệt đăng web."})
    if BANG.get("thu_chi") and not co_thu_chi:
        canh_bao.append({"muc": "vang", "noi_dung": "Bảng thu chi chưa có số liệu thật: chưa theo dõi được lãi lỗ."})

    return {
        "canh_bao": canh_bao,
        "luc": luc_don, "hom_nay": hom_nay.isoformat(),
        "kpi": {"doanh_thu_hom_nay": dt1, "don_hom_nay": sd1, "lead_hom_nay": lead1, "doanh_thu_7": dt7, "doanh_thu_7_xh": xu_huong(dt7, dt7t), "don_7": sd7, "don_7_xh": xu_huong(sd7, sd7t),
                "lead_7": lead7, "lead_7_xh": xu_huong(lead7, lead7t), "con_thu": con_thu, "doanh_thu_30": dt30, "don_30": sd30,
                "khach": len(khach), "lead_tong": len(lead), "lead_chua_cham": lead_trong,
                "sp_dang_ban": len(dang_ban)},
        "doanh_thu_ngay": theo_ngay,
        "kenh_30": nhom(don30, "Kênh", "Tổng tiền"),
        "sale_30": nhom(don30, "Sale", "Tổng tiền"),
        "trang_thai_don": nhom(don, "Trạng thái", "Tổng tiền"),
        "don_moi": [{"ngay": ngay_cua(o.get("Ngày tạo")).isoformat() if ngay_cua(o.get("Ngày tạo")) else "", "khach": chu(o.get("Khách")),
                     "mon": chu(o.get("Món"))[:60], "tien": so(o.get("Tổng tiền")), "trang_thai": chu(o.get("Trạng thái")), "kenh": chu(o.get("Kênh"))}
                    for o in sorted(hl, key=lambda o: chu_o({"kieu": 5}, o.get("Ngày tạo")), reverse=True)[:8]],
        "viec": {"theo_tt": nhom(viec, "Trạng thái"), "mo": len(viec_mo), "ds": [
            {"ten": chu(o.get("Tên công việc")), "tt": chu(o.get("Trạng thái")), "han": chu_o({"kieu": 5}, o.get("Hạn hoàn thành")),
             "ai": chu(o.get("Người thực hiện")), "uu_tien": chu(o.get("Mức ưu tiên"))} for o in viec_ds],
            "toan_mau": bool(viec) and all(chu(o.get("Tên công việc")).startswith("[MẪU]") for o in viec)},
        # Món đang bán không ghi giá (hàng hiệu báo giá riêng) nên chỉ đếm số món theo hãng.
        "san_pham": {"tong": len(sp), "dang_ban": len(dang_ban), "cho_duyet_web": sum(1 for o in sp if chu(o.get("Trạng thái web")) == "Chờ duyệt"),
                     "theo_hang": dict(list(nhom(dang_ban, "Thương hiệu").items())[:8])},
        "nhat_ky": [{"luc": gio_cua(o.get("Lúc")), "su_kien": chu(o.get("Sự kiện"))[:90], "loai": chu(o.get("Loại"))} for o in nk_ds],
        "lead": {"theo_ngay": lead_ngay, "nguon": nhom(lead, "utm_source"), "trang_thai": nhom(lead, "Trạng Thái"),
                 "da_enrich": sum(1 for o in lead if o.get("Đã enrich"))},
        "khach": {"bac": nhom(khach, "Bậc giao dịch"), "top": [{"ten": chu(o.get("Tên")), "da_mua": so(o.get("Tổng đã mua")), "so_don": so(o.get("Số đơn"))}
                                                              for o in sorted(khach, key=lambda o: -so(o.get("Tổng đã mua")))[:6]]},
        "seo": {"trang_thai": seo_tt, "moi_dang": [{"tieu_de": chu(o.get("Tiêu đề bài viết"))[:80], "ngay": chu_o({"kieu": 5}, o.get("Ngày đăng")),
                                                    "xem": so(o.get("GA4 Lượt xem"))} for o in seo_dang],
                "luot_xem": sum(so(o.get("GA4 Lượt xem")) for o in seo)},
        "tai_chinh": {"co_du_lieu": co_thu_chi, "theo_thang": tc_thang, "quy": quy},
        "cho_duyet": len(cho_duyet),
    }


_dash_dem = {}


@app.get("/api/dieu-hanh")
def api_dieu_hanh(lam_moi: bool = False):
    if not lam_moi and "v" in _dash_dem and time.time() - _dash_dem["luc"] < 120:
        return _dash_dem["v"]
    v = tinh_dieu_hanh(lam_moi)
    _dash_dem.update(v=v, luc=time.time())
    if lam_moi:
        ghi_nhat_ky("cau_hinh", "Làm mới dữ liệu điều hành từ Lark")
    return v


def cc_chi_so(a):
    """Một lần gọi có đủ chỉ số điều hành: dùng cho câu hỏi nhanh (nhất là khi anh nói chuyện bằng giọng)."""
    if "v" in _dash_dem and time.time() - _dash_dem["luc"] < 300:
        d = _dash_dem["v"]
    else:
        d = tinh_dieu_hanh(False)
        _dash_dem.update(v=d, luc=time.time())
    k = d["kpi"]
    return {"hom_nay": d["hom_nay"], "chi_so": k,
            "giai_thich": ("doanh_thu_* tính theo đơn chưa huỷ trong bảng đơn hàng (VND); lead_* theo bảng lead; con_thu = cột Còn thu; "
                           "lead_chua_cham = lead chưa có Trạng Thái; *_7 = 7 ngày gần nhất; *_7_xh = % thay đổi so với 7 ngày liền trước "
                           "(vd doanh_thu_7_xh=225.2 nghĩa là tăng 225,2% so với tuần trước); *_30 = 30 ngày gần nhất."),
            "doc_nhanh": {"doanh_thu_hom_nay": f"{round(k['doanh_thu_hom_nay'] / 1e6, 1)} triệu", "doanh_thu_7_ngay": f"{round(k['doanh_thu_7'] / 1e6, 1)} triệu",
                          "doanh_thu_30_ngay": f"{round(k['doanh_thu_30'] / 1e6, 1)} triệu", "con_phai_thu": f"{round(k['con_thu'] / 1e6, 1)} triệu"},
            "kenh_30_ngay": {x: v["tien"] for x, v in list(d["kenh_30"].items())[:5]},
            "canh_bao": [c["noi_dung"] for c in d.get("canh_bao", [])], "du_lieu_luc": d["luc"]}


KN.KET_NOI["lark"]["cong_cu"].insert(0, KN.cc("chi_so_dieu_hanh",
    "GỌI ĐẦU TIÊN cho câu hỏi tổng quát về kinh doanh: doanh thu/đơn/lead hôm nay, 7 ngày, 30 ngày, còn phải thu, lead chưa chăm sóc, món đang bán, cảnh báo. Một lần gọi là đủ, nhanh.",
    "doc", cc_chi_so))


@app.get("/api/dieu-hanh/meta")
def api_dh_meta(lam_moi: bool = False):
    return meta_7_ngay(lam_moi)


# ================= ĐĂNG NHẬP (thay basic auth của Caddy) =================
import base64
import hashlib
import hmac
import secrets as _sec
from fastapi import Request
from fastapi.responses import JSONResponse, RedirectResponse

TK_TEP = GOC / "tai-khoan.json"


def _bi_mat():
    """Khoá ký phiên: OS_SECRET trong .env, chưa có thì tự sinh và ghi thêm vào .env."""
    if ENV.get("OS_SECRET"):
        return ENV["OS_SECRET"].encode()
    k = _sec.token_urlsafe(48)
    with open(GOC / ".env", "a", encoding="utf-8") as f:
        f.write(f"OS_SECRET={k}\n")
    ENV["OS_SECRET"] = k
    return k.encode()


BI_MAT = _bi_mat()
# Thẻ nội bộ cho mcp_os.py gọi /api/agent/* (đổi mỗi lần khởi động; không nằm ở trình duyệt).
AGENT_TOKEN = _sec.token_urlsafe(32)


def bam(mk, muoi=None):
    muoi = muoi or _sec.token_hex(16)
    return f"pbkdf2${muoi}${hashlib.pbkdf2_hmac('sha256', mk.encode(), muoi.encode(), 240000).hex()}"


def khop(mk, h):
    try:
        _, muoi, _x = h.split("$")
        return hmac.compare_digest(bam(mk, muoi), h)
    except ValueError:
        return False


def doc_tk():
    try:
        return json.loads(TK_TEP.read_text(encoding="utf-8"))
    except Exception:
        return {"nguoi_dung": {}}


def ghi_tk(d):
    TK_TEP.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    TK_TEP.chmod(0o600)


def ky(nd, het):
    raw = f"{nd}|{int(het)}"
    sig = hmac.new(BI_MAT, raw.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{raw}|{sig}".encode()).decode()


def doc_phien(c):
    try:
        nd, het, sig = base64.urlsafe_b64decode(c.encode()).decode().split("|")
        if hmac.compare_digest(hmac.new(BI_MAT, f"{nd}|{het}".encode(), hashlib.sha256).hexdigest(), sig) and time.time() < int(het):
            return nd if nd in doc_tk()["nguoi_dung"] else None
    except Exception:
        pass
    return None


MO = ("/dang-nhap", "/api/dang-nhap", "/static/dang-nhap.css", "/static/dang-nhap.js", "/static/loi-ai.js", "/favicon.ico")
_sai = {}


@app.middleware("http")
async def chan_cua(request: Request, call_next):
    p = request.url.path
    if p.startswith("/api/agent/"):
        if hmac.compare_digest(request.headers.get("x-os-token", ""), AGENT_TOKEN):
            return await call_next(request)
        return JSONResponse({"detail": "Không có quyền."}, 403)
    if p.startswith(MO):
        return await call_next(request)
    nd = doc_phien(request.cookies.get("cos_phien", ""))
    if not nd:
        if p.startswith("/api/"):
            return JSONResponse({"detail": "Chưa đăng nhập."}, 401)
        return RedirectResponse("/dang-nhap")
    request.state.nd = nd
    return await call_next(request)


class DangNhap(BaseModel):
    tai_khoan: str
    mat_khau: str
    nho: bool = True


@app.post("/api/dang-nhap")
def api_dang_nhap(d: DangNhap, request: Request):
    ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for", "").split(",")[0] or (request.client.host if request.client else "?")
    lan = [t for t in _sai.get(ip, []) if time.time() - t < 600]
    if len(lan) >= 6:
        raise HTTPException(429, "Sai quá nhiều lần. Thử lại sau 10 phút.")
    u = doc_tk()["nguoi_dung"].get(d.tai_khoan.strip())
    if not u or not khop(d.mat_khau, u["hash"]):
        _sai[ip] = lan + [time.time()]
        time.sleep(0.6)
        raise HTTPException(401, "Sai tài khoản hoặc mật khẩu.")
    _sai.pop(ip, None)
    het = time.time() + (30 * 86400 if d.nho else 12 * 3600)
    r = JSONResponse({"ok": True})
    r.set_cookie("cos_phien", ky(d.tai_khoan.strip(), het), max_age=int(het - time.time()), httponly=True, samesite="lax",
                 secure=request.headers.get("x-forwarded-proto") == "https" or request.url.scheme == "https")
    ghi_nhat_ky("cau_hinh", f"Đăng nhập: {d.tai_khoan.strip()}")
    return r


@app.post("/api/dang-xuat")
def api_dang_xuat():
    r = JSONResponse({"ok": True})
    r.delete_cookie("cos_phien")
    return r


@app.get("/api/toi")
def api_toi(request: Request):
    return {"ten": getattr(request.state, "nd", None), "ten_chu": HS["ten_chu"], "goi_chu": HS["goi_chu"], "doanh_nghiep": HS["doanh_nghiep"]}


class DoiMK(BaseModel):
    cu: str
    moi: str


@app.post("/api/doi-mat-khau")
def api_doi_mk(d: DoiMK, request: Request):
    nd = request.state.nd
    tk = doc_tk()
    if not khop(d.cu, tk["nguoi_dung"][nd]["hash"]):
        raise HTTPException(400, "Mật khẩu cũ không đúng.")
    if len(d.moi) < 10:
        raise HTTPException(400, "Mật khẩu mới tối thiểu 10 ký tự.")
    tk["nguoi_dung"][nd]["hash"] = bam(d.moi)
    ghi_tk(tk)
    ghi_nhat_ky("cau_hinh", f"Đổi mật khẩu: {nd}")
    return {"ok": True}


@app.get("/dang-nhap")
def trang_dang_nhap():
    return FileResponse(GOC / "static" / "dang-nhap.html")


# ================= GIỌNG NÓI (như Javis) =================
GIONG = [{"id": "vi-VN-NamMinhNeural", "ten": "Nam Minh", "mo_ta": "Nam, trầm, tiếng Việt"},
         {"id": "vi-VN-HoaiMyNeural", "ten": "Hoài My", "mo_ta": "Nữ, tiếng Việt"},
         {"id": "en-US-AndrewMultilingualNeural", "ten": "Andrew", "mo_ta": "Nam, đa ngôn ngữ (tự nói tiếng Việt)"},
         {"id": "en-US-AvaMultilingualNeural", "ten": "Ava", "mo_ta": "Nữ, đa ngôn ngữ"},
         {"id": "en-US-EmmaMultilingualNeural", "ten": "Emma", "mo_ta": "Nữ, đa ngôn ngữ"},
         {"id": "en-US-BrianMultilingualNeural", "ten": "Brian", "mo_ta": "Nam, đa ngôn ngữ"}]
GIONG_MD = {"che_do": "chu_giong", "giong": "vi-VN-NamMinhNeural", "toc_do": 8, "ngat_loi": True, "ngon_ngu_nghe": "vi-VN", "model_giong": "haiku", "giong_live": "juniper", "live_lam_viec": None}


@app.get("/api/giong")
def api_giong():
    return {"cai_dat": {**GIONG_MD, **CAU_HINH.get("giong", {})}, "giong": GIONG,
            "che_do": [{"id": "chu", "ten": "Chỉ chữ", "mo_ta": "Trả lời bằng chữ, không đọc"},
                       {"id": "chu_giong", "ten": "Chữ + giọng", "mo_ta": "Hiện chữ và tự đọc thành tiếng"},
                       {"id": "ranh_tay", "ten": "Trò chuyện", "mo_ta": "Như gọi điện: anh nói, em đáp ngay bằng giọng; nói chen là ngắt"},
                       {"id": "live", "ten": "ChatGPT Live", "mo_ta": "Giọng thật của ChatGPT, nghe nói tức thì; việc cần số liệu giao cho bộ não chính"}],
            "giong_live": [{"id": v, "ten": v.capitalize()} for v in LV.GIONG_LIVE]}


@app.post("/api/giong")
def api_luu_giong(d: dict):
    g = {**GIONG_MD, **CAU_HINH.get("giong", {})}
    for k in GIONG_MD:
        if k in d:
            g[k] = d[k]
    g["toc_do"] = max(-30, min(40, int(g["toc_do"])))
    CAU_HINH["giong"] = g
    luu_cau_hinh(CAU_HINH)
    return g


# ================= CHATGPT LIVE (giọng thời gian thực qua gói ChatGPT Plus) =================
# Âm thanh đi thẳng trình duyệt ↔ OpenAI qua WebRTC; server chỉ chuyển SDP, nghe transcript, và khi model giao việc
# thì cho bộ não chính (Claude + công cụ) làm rồi trả kết quả để model đọc lại. Xem live.py.
import live as LV

LIVE_SRV = None
CUOC = {}


def model_lam_viec():
    """Model làm việc cho ChatGPT Live: chọn ở Cài đặt → Giọng nói; mặc định theo trang Models."""
    g = CAU_HINH.get("giong", {}).get("live_lam_viec")
    if isinstance(g, dict) and g.get("engine") and g.get("model"):
        return g
    return dict(CAU_HINH["model"])


async def hoi_bo_nao(phien, yc):
    """Việc ChatGPT Live giao: chạy trên model làm việc (Claude / Codex / API), cùng công cụ và skills của OS."""
    c = Chat(cau="[ChatGPT Live giao việc, kết quả sẽ được đọc lại cho anh] Làm đúng việc này. Nếu khớp một kỹ năng đã cài "
                 "trong Store thì gọi kho__dung_ky_nang và làm theo kỹ năng đó. Trả lời ngắn, giữ đúng số liệu: " + yc,
             phien=phien, giong=True, lam_viec=model_lam_viec(), ghi=False)
    r = await api_chat(c)
    buf = ""
    async for khoi in r.body_iterator:
        buf += khoi if isinstance(khoi, str) else khoi.decode()
        while "\n\n" in buf:
            mot, buf = buf.split("\n\n", 1)
            if mot.startswith("data: "):
                ev = json.loads(mot[6:])
                if ev.get("t") in ("chu", "cong_cu", "de_xuat", "loi"):
                    if ev["t"] == "de_xuat":
                        ev = {"t": "de_xuat", "dx": ev["dx"]}
                    yield ev


def prompt_live(phien):
    s = LV.PROMPT_LIVE + phan_nho()
    cu = doc_luot(phien, gioi_han=12)
    if cu:
        s += "\n\nĐOẠN ANH VÀ EM VỪA TRAO ĐỔI (để nói tiếp mạch, không nhắc lại):\n" + \
            "\n".join(f"{'Anh' if x['vai'] == 'me' else 'Em'}: {x['noi_dung'][:300]}" for x in cu)
    return s


class BatDauLive(BaseModel):
    sdp: str
    phien: str = "mac-dinh"


@app.post("/api/live/bat-dau")
async def api_live_bat_dau(b: BatDauLive):
    global LIVE_SRV
    codex = LV.tim_codex()
    if not codex:
        raise HTTPException(400, "Máy chưa cài Codex (ChatGPT). Xem trang Models.")
    if LIVE_SRV is None or LIVE_SRV.codex != codex:
        LIVE_SRV = LV.AppServer(codex)
    for k, cg in list(CUOC.items()):          # mỗi lúc một cuộc gọi
        await cg.ket_thuc()
        CUOC.pop(k, None)
    g = {**GIONG_MD, **CAU_HINH.get("giong", {})}
    phien = b.phien

    def ghi(vai, t):
        ghi_luot(phien, vai, "live", t)

    cg = LV.CuocGoi(LIVE_SRV, g.get("giong_live", "juniper"), prompt_live(phien), None,
                    lambda yc: hoi_bo_nao(phien, yc), ghi)
    try:
        sdp = await cg.bat_dau(b.sdp)
    except Exception as e:
        await cg.ket_thuc()
        t = str(e)
        if "404" in t or "entitle" in t.lower():
            t = "Gói ChatGPT chưa có giọng thời gian thực (cần Plus trở lên)."
        elif "401" in t or "token" in t.lower() or "login" in t.lower():
            t = "ChatGPT hết phiên đăng nhập. Trên máy chủ chạy: codex login --device-auth"
        raise HTTPException(502, t[:300])
    CUOC[cg.id] = cg
    ghi_nhat_ky("cau_hinh", "Bắt đầu cuộc gọi ChatGPT Live")
    return {"id": cg.id, "sdp": sdp, "giong": cg.giong}


@app.get("/api/live/su-kien")
async def api_live_su_kien(id: str):
    cg = CUOC.get(id)
    if not cg:
        raise HTTPException(404, "Cuộc gọi không còn")

    async def chay():
        yield sse({"t": "san"})
        while True:
            try:
                ev = await asyncio.wait_for(cg.ra.get(), 20)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
                continue
            if ev.get("t") == "de_xuat":
                ev = {"t": "de_xuat", "dx": ev["dx"]}
            yield sse(ev)
            if ev.get("t") == "het":
                CUOC.pop(id, None)
                return
    return StreamingResponse(chay(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/live/dung")
async def api_live_dung(d: dict):
    cg = CUOC.pop(d.get("id", ""), None)
    if cg:
        await cg.ket_thuc()
    return {"ok": True}


@app.post("/api/live/chu")
async def api_live_chu(d: dict):
    cg = CUOC.get(d.get("id", ""))
    if not cg:
        raise HTTPException(404, "Cuộc gọi không còn")
    await cg.gui_chu(str(d.get("text", ""))[:2000])
    return {"ok": True}



# ================= BỘ NÃO (chọn ở Cài đặt → Bộ não) =================
@app.get("/api/nao")
def api_nao():
    d = NAO.doc_so()
    return {"dang_dung": d["dang_dung"], "ds": [NAO.thong_tin(n) for n in d["ds"]], "khoa_deploy": NAO.khoa_cong_khai()}


@app.post("/api/nao/chon")
async def api_nao_chon(b: dict):
    d = NAO.doc_so()
    n = next((x for x in d["ds"] if x["id"] == b.get("id")), None)
    if not n:
        raise HTTPException(404, "Không có bộ não này")
    r = await asyncio.to_thread(NAO.dong_bo, n)
    if not r["ok"] and not (NAO.thu_muc(n) / ".git").exists():
        raise HTTPException(400, r["loi"])
    d["dang_dung"] = n["id"]
    NAO.ghi_so(d)
    for k, ps in list(SONG.items()):        # lời dặn đổi theo bộ não: mở lại phiên ở câu kế tiếp
        await ps.dong()
    ghi_nhat_ky("cau_hinh", f"Đổi bộ não: {n['ten']}")
    return {"ok": True, "canh_bao": r.get("loi", "")}


@app.post("/api/nao/{nid}/dong-bo")
async def api_nao_dong_bo(nid: str):
    return await asyncio.to_thread(NAO.dong_bo, NAO.lay(nid))


@app.post("/api/nao/{nid}/hoan-tac")
async def api_nao_hoan_tac(nid: str, b: dict):
    try:
        return await asyncio.to_thread(NAO.hoan_tac, NAO.lay(nid), str(b.get("ma", "")))
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/nao/them")
def api_nao_them(b: dict):
    ten = (b.get("ten") or "").strip()
    kieu = b.get("kieu")
    if not ten or kieu not in ("local", "github"):
        raise HTTPException(400, "Thiếu tên hoặc kiểu bộ não")
    repo = (b.get("repo") or "").strip()
    if kieu == "github" and not re.fullmatch(r"(git@github\.com:|https://github\.com/)[\w.-]+/[\w.-]+?(\.git)?", repo):
        raise HTTPException(400, "Địa chỉ repo GitHub không hợp lệ")
    if kieu == "github" and repo.startswith("https://"):
        repo = "git@github.com:" + repo.split("github.com/", 1)[1].removesuffix(".git") + ".git"
    d = NAO.doc_so()
    nid = NAO._slug(ten)
    if any(x["id"] == nid for x in d["ds"]):
        raise HTTPException(400, "Đã có bộ não trùng tên")
    n = {"id": nid, "ten": ten, "kieu": kieu, "mo_ta": b.get("mo_ta", "")}
    if kieu == "github":
        n.update(repo=repo, nhanh=(b.get("nhanh") or "main").strip())
    d["ds"].append(n)
    NAO.ghi_so(d)
    return NAO.thong_tin(n)


def _chuyen_nho_cu():
    """Một lần: trí nhớ cũ ở tri-nho.json chuyển vào bộ não đang chọn."""
    try:
        cu = json.loads(NHO_TEP.read_text(encoding="utf-8"))
    except Exception:
        return
    for x in cu:
        NAO.them_nho(x["noi_dung"], x.get("loai") or "khac")
    NHO_TEP.rename(NHO_TEP.with_suffix(".json.da-chuyen"))


async def _dong_bo_dinh_ky():
    try:
        r = await asyncio.to_thread(NAO.dong_bo)
        if r.get("ok"):
            await asyncio.to_thread(_chuyen_nho_cu)
    except Exception:
        pass
    await asyncio.sleep(600)
    while True:
        try:
            await asyncio.to_thread(NAO.dong_bo)
        except Exception:
            pass
        await asyncio.sleep(600)


@app.on_event("startup")
async def _khoi_dong_nao():
    asyncio.create_task(_dong_bo_dinh_ky())



# ================= BÓC ÂM (trang riêng /boc-am, nhẹ) =================
# Nghe trực tiếp = ChatGPT Live ở chế độ chỉ nghe: lời người nói về THẲNG trình duyệt qua kênh dữ liệu WebRTC
# (sự kiện input_transcript.added, từng từ kèm mốc ms). Máy chủ chỉ mở/đóng phiên. Đo 05/10 với đoạn có
# "Cartier Love, ký gửi, tua vít zin, Van Cleef Alhambra": chép gần đúng từng chữ, model im lặng suốt.
# Bóc từ file = Whisper qua Groq (cần key Groq ở trang Models), ffmpeg cắt đoạn 10 phút.
CUOC_NGHE = {}
TU_BOC_AM_MD = HS["tu_rieng"]


def tu_boc_am():
    return CAU_HINH.get("boc_am", {}).get("tu") or TU_BOC_AM_MD


@app.get("/boc-am")
def trang_boc_am():
    return FileResponse(GOC / "static" / "boc-am.html", headers={"Cache-Control": "no-cache"})


@app.post("/api/boc-am/bat-dau")
async def api_nghe_bat_dau(b: dict):
    global LIVE_SRV
    codex = LV.tim_codex()
    if not codex:
        raise HTTPException(400, "Máy chủ chưa cài Codex (ChatGPT).")
    if LIVE_SRV is None or LIVE_SRV.codex != codex:
        LIVE_SRV = LV.AppServer(codex)
    for k, cg in list(CUOC_NGHE.items()):          # mỗi lúc một phiên nghe
        await cg.ket_thuc()
        CUOC_NGHE.pop(k, None)
    prompt = LV.PROMPT_NGHE + " Từ riêng của người dùng (viết đúng y như vầy): " + ", ".join(tu_boc_am()) + "."
    cg = LV.CuocGoi(LIVE_SRV, "juniper", prompt, None, None, lambda v, t: None, chi_nghe=True)
    try:
        sdp = await cg.bat_dau(str(b.get("sdp") or ""))
    except Exception as e:
        await cg.ket_thuc()
        t = str(e)
        if "401" in t or "token" in t.lower() or "login" in t.lower():
            t = "ChatGPT hết phiên đăng nhập. Trên máy chủ chạy: codex login --device-auth"
        raise HTTPException(502, t[:300])
    CUOC_NGHE[cg.id] = cg
    return {"id": cg.id, "sdp": sdp}


@app.post("/api/boc-am/dung")
async def api_nghe_dung(b: dict):
    cg = CUOC_NGHE.pop(b.get("id", ""), None)
    if cg:
        await cg.ket_thuc()
    return {"ok": True}


@app.get("/api/boc-am/tu-dien")
def api_tu_boc_am():
    return {"tu": tu_boc_am()}


@app.post("/api/boc-am/tu-dien")
def api_luu_tu_boc_am(b: dict):
    tu = [t.strip() for t in (b.get("tu") or []) if str(t).strip()][:200]
    CAU_HINH.setdefault("boc_am", {})["tu"] = tu
    luu_cau_hinh(CAU_HINH)
    return {"tu": tu}


@app.post("/api/boc-am/luu")
def api_luu_boc_am(b: dict):
    """Lưu bản gỡ băng vào bộ não đang chọn: boc-am/<ngày>-<tên>.md. KHÔNG để output/: New Brain loại output/ và raw/
    khỏi GitHub (.gitignore), lưu ở đó thì bản ghi kẹt trên VPS, không bao giờ về máy Mac (phát hiện 05/10)."""
    tieu_de = (b.get("tieu_de") or "Bóc âm").strip()[:120]
    noi_dung = str(b.get("noi_dung") or "").strip()
    if not noi_dung:
        raise HTTPException(400, "Chưa có nội dung")
    ngay = time.strftime("%Y-%m-%d")
    slug = f"{ngay}-{NAO._slug(tieu_de)[:60]}"
    rel = b.get("tep") or f"boc-am/{slug}.md"
    md = (f"---\ntype: output\ntitle: {tieu_de}\ncreated: {ngay}\nupdated: {ngay}\ntags: [boc-am, go-bang]\n"
          f"nguon: {b.get('nguon') or 'ghi âm'}\n---\n\n# {tieu_de}\n\n{noi_dung}\n")
    try:
        r = NAO.ghi(rel, md, f"os: bóc âm {tieu_de[:60]}")
    except ValueError as e:
        raise HTTPException(400, str(e))
    ghi_nhat_ky("ghi", f"Bóc âm lưu vào {r['bo_nao']}: {rel}")
    return r


@app.post("/api/boc-am/ai")
async def api_ai_boc_am(b: dict):
    """Chuẩn hoá (sửa từ nghe sai theo ngữ cảnh) hoặc Biên tập giáo trình, chạy trên model chính, không ghi sổ hội thoại."""
    van = str(b.get("van_ban") or "")[:60000]
    if not van.strip():
        raise HTTPException(400, "Chưa có nội dung")
    if b.get("loai") == "giao_trinh":
        yc = ("Biên tập bản gỡ băng dưới thành tài liệu học dạng markdown: tiêu đề, các mục ## theo ý chính, giữ nguyên ví dụ và số liệu, "
              "định nghĩa đặt trong blockquote, cuối có mục ## Đúc kết 5 ý. Không bịa thêm. Chỉ trả về markdown.")
    else:
        yc = ("Chuẩn hoá bản gỡ băng dưới: sửa từ nghe sai theo ngữ cảnh (tên riêng, thuật ngữ hàng hiệu), thêm dấu câu, bỏ câu rác máy tự bịa, "
              "GIỮ ĐÚNG số dòng và thứ tự, không tóm tắt. Từ riêng viết đúng: " + ", ".join(tu_boc_am()) + ". Chỉ trả về văn bản đã sửa.")
    c = Chat(cau=f"{yc}\n\n---\n{van}", phien=f"boc-am-{int(time.time())}", lam_viec=dict(CAU_HINH["model"]), ghi=False)
    r = await api_chat(c)
    chu, loi, buf = [], "", ""
    async for khoi in r.body_iterator:
        buf += khoi if isinstance(khoi, str) else khoi.decode()
        while "\n\n" in buf:
            mot, buf = buf.split("\n\n", 1)
            if mot.startswith("data: "):
                ev = json.loads(mot[6:])
                if ev.get("t") == "chu":
                    chu.append(ev["text"])
                elif ev.get("t") == "loi":
                    loi = ev["text"]
    if not chu and loi:
        raise HTTPException(502, loi)
    return {"van_ban": "".join(chu).strip()}


from fastapi import UploadFile, File


@app.post("/api/boc-am/tep")
async def api_boc_tep(tep: UploadFile = File(...)):
    """File ghi âm → Whisper large-v3-turbo qua Groq. ffmpeg đổi về mono 16 kHz và cắt đoạn 10 phút."""
    khoa = MA.doc_khoa().get("groq")
    if not khoa:
        raise HTTPException(400, "Bóc từ file cần API key Groq (miễn phí): dán ở trang Models → Groq.")
    import tempfile, shutil as _sh
    d = Path(tempfile.mkdtemp(prefix="cos-bocam-"))
    try:
        goc = d / ("vao" + Path(tep.filename or "a.m4a").suffix[:8])
        with open(goc, "wb") as f:
            while True:
                k = await tep.read(1 << 20)
                if not k:
                    break
                f.write(k)
        r = await asyncio.to_thread(subprocess.run, ["ffmpeg", "-loglevel", "error", "-y", "-i", str(goc), "-ac", "1", "-ar", "16000",
                                                     "-c:a", "libmp3lame", "-b:a", "48k", "-f", "segment", "-segment_time", "600",
                                                     str(d / "doan%03d.mp3")], capture_output=True, text=True, timeout=1800)
        doan = sorted(d.glob("doan*.mp3"))
        if r.returncode or not doan:
            raise HTTPException(400, "Không đọc được file âm thanh: " + (r.stderr or "")[-200:])
        loi_nhac = ", ".join(tu_boc_am())[:800]
        ra = []
        for i, p in enumerate(doan):
            def goi(p=p):
                with open(p, "rb") as f:
                    return requests.post("https://api.groq.com/openai/v1/audio/transcriptions", headers={"Authorization": f"Bearer {khoa}"},
                                         files={"file": (p.name, f, "audio/mpeg")},
                                         data={"model": "whisper-large-v3-turbo", "language": "vi", "temperature": "0",
                                               "response_format": "verbose_json", "prompt": loi_nhac}, timeout=300)
            rr = await asyncio.to_thread(goi)
            if rr.status_code != 200:
                raise HTTPException(502, f"Groq lỗi {rr.status_code}: {rr.text[:200]}")
            for sg in rr.json().get("segments") or []:
                ra.append({"t": round(i * 600 + sg.get("start", 0), 1), "text": sg.get("text", "").strip()})
        return {"doan": ra, "so_phan": len(doan)}
    finally:
        _sh.rmtree(d, ignore_errors=True)



app.mount("/static", StaticFiles(directory=GOC / "static"), name="static")


@app.get("/")
def trang_chu():
    # không cho trình duyệt giữ bản cũ: bản mới deploy là thấy ngay (tệp js/css đã có ?v= riêng)
    return FileResponse(GOC / "static" / "index.html", headers={"Cache-Control": "no-cache"})


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3 and sys.argv[1] == "dat-mat-khau":
        # python server.py dat-mat-khau <tai_khoan>   (mật khẩu đọc từ stdin, không in ra)
        mk = sys.stdin.readline().strip()
        if len(mk) < 10:
            sys.exit("Mật khẩu tối thiểu 10 ký tự")
        tk = doc_tk()
        tk["nguoi_dung"][sys.argv[2]] = {"hash": bam(mk), "tao": time.time()}
        ghi_tk(tk)
        print(f"Đã đặt mật khẩu cho {sys.argv[2]}")
        sys.exit(0)
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT)
