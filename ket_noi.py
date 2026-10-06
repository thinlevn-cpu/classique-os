"""Kết nối (MCP Hub) của Classique OS.

Mỗi kết nối khai báo: tên, khoá cần (tên biến trong .env của dự án), cách kiểm tra,
và bộ công cụ. Mỗi công cụ gắn loại "doc" (chỉ đọc) hoặc "ghi" (thay đổi dữ liệu ở dịch vụ ngoài).
server.py là nơi DUY NHẤT quyết định một lệnh ghi được chạy thẳng, thành đề xuất chờ duyệt, hay bị chặn,
theo mức quyền anh chọn cho từng kết nối. File này chỉ biết gọi dịch vụ.
"""
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

GOC = Path(__file__).resolve().parent
KET_NOI = {}


def doc_khoa():
    """Khoá từ .env của chính dự án (không bao giờ gửi ra trình duyệt)."""
    env = {}
    tep = [GOC / ".env"]
    for f in tep:
        try:
            for l in open(f, encoding="utf-8"):
                if "=" in l and not l.lstrip().startswith("#"):
                    k, v = l.strip().split("=", 1)
                    env.setdefault(k, v.strip().strip("\"'"))
        except OSError:
            pass
    return env


KHOA = doc_khoa()


def luu_khoa(moi):
    """Ghi khoá nhập từ trang Kết nối vào .env (thay dòng cũ cùng tên), chmod 600, rồi nạp lại."""
    tep = GOC / ".env"
    dong = tep.read_text(encoding="utf-8").splitlines() if tep.exists() else []
    con = dict(moi)
    for i, l in enumerate(dong):
        k = l.split("=", 1)[0].strip()
        if "=" in l and not l.lstrip().startswith("#") and k in con:
            dong[i] = f"{k}={con.pop(k)}"
    dong += [f"{k}={v}" for k, v in con.items()]
    tep.write_text("\n".join(dong) + "\n", encoding="utf-8")
    tep.chmod(0o600)
    KHOA.clear()
    KHOA.update(doc_khoa())


def dang_ky(id_, ten, mo_ta, nhom, can, kiem_tra, cong_cu, mac_dinh="doc"):
    KET_NOI[id_] = {"id": id_, "ten": ten, "mo_ta": mo_ta, "nhom": nhom, "can": can,
                    "kiem_tra": kiem_tra, "cong_cu": cong_cu, "mac_dinh": mac_dinh}


def cc(ten, mo_ta, loai, fn, props=None, bat_buoc=(), tom_tat=None):
    """Khai một công cụ. tom_tat(args) → dict ngắn để hiện trên thẻ đề xuất (công cụ ghi)."""
    return {"ten": ten, "mo_ta": mo_ta, "loai": loai, "fn": fn, "tom_tat": tom_tat,
            "schema": {"type": "object", "properties": props or {}, "required": list(bat_buoc)}}


def thieu_khoa(can):
    return [k for k in can if not KHOA.get(k)]


# ======================= PANCAKE POS =======================
PK = "https://pos.pages.fm/api/v1"
_pk_dem = {}


def _pk_het(duong, ttl=600):
    """Lấy hết các trang của một danh sách Pancake, đệm 10 phút (câu hỏi bằng giọng cần trả lời nhanh)."""
    if duong in _pk_dem and time.time() - _pk_dem[duong][0] < ttl:
        return _pk_dem[duong][1]
    out, p = [], 1
    while True:
        d = requests.get(f"{PK}/shops/{KHOA['PANCAKE_SHOP_ID']}{duong}", timeout=60,
                         params={"api_key": KHOA["PANCAKE_API_KEY"], "page_size": 100, "page_number": p}).json()
        if d.get("success") is False:
            raise RuntimeError(f"Pancake từ chối: {d.get('message')}")
        out += d.get("data") or []
        if p >= d.get("total_pages", 1) or p >= 30:
            break
        p += 1
    _pk_dem[duong] = (time.time(), out)
    return out


def _ngay(s):
    return (s or "")[:10]


def _khoang(a):
    """Khoảng ngày từ tham số: tu_ngay/den_ngay (YYYY-MM-DD) hoặc so_ngay gần nhất (mặc định 30)."""
    den = a.get("den_ngay") or datetime.now().strftime("%Y-%m-%d")
    tu = a.get("tu_ngay") or (datetime.strptime(den, "%Y-%m-%d") - timedelta(days=int(a.get("so_ngay") or 30) - 1)).strftime("%Y-%m-%d")
    return tu, den


def pk_don(a):
    tu, den = _khoang(a)
    q = (a.get("tu_khoa") or "").lower()
    tt = (a.get("trang_thai") or "").lower()
    ds = []
    for o in _pk_het("/orders"):
        if not (tu <= _ngay(o.get("inserted_at")) <= den):
            continue
        if tt and tt not in (o.get("status_name") or "").lower():
            continue
        ten = " ".join(str(o.get(k) or "") for k in ("bill_full_name", "bill_phone_number", "note"))
        sp = ", ".join((it.get("variation_info") or {}).get("name", "") for it in o.get("items") or [])
        if q and q not in (ten + " " + sp).lower():
            continue
        ds.append({"ma": o.get("id"), "ngay": _ngay(o.get("inserted_at")), "trang_thai": o.get("status_name"),
                   "khach": o.get("bill_full_name"), "sdt": o.get("bill_phone_number"), "tong_tien": o.get("total_price"),
                   "nguon": o.get("order_sources_name"), "san_pham": sp[:200]})
    gh = min(int(a.get("gioi_han") or 30), 100)
    return {"tu_ngay": tu, "den_ngay": den, "so_don": len(ds), "don": ds[:gh]}


def pk_doanh_thu(a):
    tu, den = _khoang(a)
    theo_ngay, theo_tt, tong, so = {}, {}, 0, 0
    for o in _pk_het("/orders"):
        n = _ngay(o.get("inserted_at"))
        if not (tu <= n <= den):
            continue
        tien = o.get("total_price") or 0
        t = o.get("status_name") or "?"
        g = theo_tt.setdefault(t, {"so_don": 0, "tien": 0})
        g["so_don"] += 1
        g["tien"] += tien
        if t not in ("canceled", "deleted", "returned"):
            d = theo_ngay.setdefault(n, {"so_don": 0, "tien": 0})
            d["so_don"] += 1
            d["tien"] += tien
            tong += tien
            so += 1
    return {"tu_ngay": tu, "den_ngay": den, "tong_don_hop_le": so, "tong_tien_hop_le": tong,
            "ghi_chu": "Hợp lệ = trừ đơn huỷ/xoá/hoàn. Tiền tính theo total_price của Pancake (VND).",
            "theo_trang_thai": theo_tt, "theo_ngay": dict(sorted(theo_ngay.items()))}


def pk_khach(a):
    q = (a.get("tu_khoa") or "").lower()
    ds = []
    for c in _pk_het("/customers"):
        sdt = ", ".join(c.get("phone_numbers") or [])
        if q and q not in f"{c.get('name', '')} {sdt}".lower():
            continue
        ds.append({"ten": c.get("name"), "sdt": sdt, "so_don": c.get("order_count"),
                   "da_mua": c.get("purchased_amount"), "don_cuoi": _ngay(c.get("last_order_at"))})
    ds.sort(key=lambda x: -(x["da_mua"] or 0))
    return {"so_khach": len(ds), "khach": ds[:min(int(a.get("gioi_han") or 30), 100)]}


def pk_san_pham(a):
    q = (a.get("tu_khoa") or "").lower()
    ds = []
    for v in _pk_het("/products/variations"):
        ten = (v.get("product") or {}).get("name") or v.get("name") or ""
        if q and q not in f"{ten} {v.get('display_id', '')} {v.get('barcode', '')}".lower():
            continue
        ds.append({"ten": ten, "ma": v.get("display_id"), "gia_ban": v.get("retail_price"),
                   "ton": v.get("remain_quantity"), "an": v.get("is_hidden")})
    return {"so_mau": len(ds), "san_pham": ds[:min(int(a.get("gioi_han") or 30), 100)]}


KHOANG = {"tu_ngay": {"type": "string", "description": "YYYY-MM-DD"}, "den_ngay": {"type": "string", "description": "YYYY-MM-DD"},
          "so_ngay": {"type": "integer", "description": "N ngày gần nhất nếu không có tu_ngay (mặc định 30)"}}

dang_ky("pancake", "Pancake POS", "Đơn hàng, khách, sản phẩm và doanh thu từ Pancake POS.", "Bán hàng",
        ["PANCAKE_SHOP_ID", "PANCAKE_API_KEY"],
        lambda: f"{len(_pk_het('/orders'))} đơn trong POS",
        [cc("don_hang", "Danh sách đơn Pancake trong khoảng ngày, lọc theo trạng thái (new, submitted, shipped, delivered, canceled...) hoặc từ khoá (tên, SĐT, sản phẩm).", "doc", pk_don,
            {**KHOANG, "trang_thai": {"type": "string"}, "tu_khoa": {"type": "string"}, "gioi_han": {"type": "integer"}}),
         cc("doanh_thu", "Tổng doanh thu và số đơn theo ngày và theo trạng thái trong khoảng ngày.", "doc", pk_doanh_thu, KHOANG),
         cc("khach_hang", "Tìm khách trong Pancake theo tên/SĐT, xếp theo số tiền đã mua.", "doc", pk_khach,
            {"tu_khoa": {"type": "string"}, "gioi_han": {"type": "integer"}}),
         cc("san_pham", "Tìm sản phẩm/biến thể: giá bán, tồn kho, mã.", "doc", pk_san_pham,
            {"tu_khoa": {"type": "string"}, "gioi_han": {"type": "integer"}})])


# ======================= META ADS =======================
def _meta(duong, **p):
    v = KHOA.get("META_API_VERSION") or "v21.0"
    r = requests.get(f"https://graph.facebook.com/{v}/{duong}", params={**p, "access_token": KHOA["META_ACCESS_TOKEN"]}, timeout=60).json()
    if "error" in r:
        raise RuntimeError("Meta: " + r["error"].get("message", "lỗi"))
    return r


def _act():
    return "act_" + KHOA["META_AD_ACCOUNT_ID"].replace("act_", "")


def meta_chien_dich(a):
    r = _meta(f"{_act()}/campaigns", fields="id,name,status,effective_status,objective,daily_budget,lifetime_budget", limit=100)
    ds = r.get("data") or []
    tt = (a.get("trang_thai") or "").upper()
    return {"so": len(ds), "chien_dich": [c for c in ds if not tt or tt in c.get("effective_status", "")]}


def meta_hieu_qua(a):
    tu, den = _khoang({**a, "so_ngay": a.get("so_ngay") or 7})
    cap = a.get("cap") or "campaign"
    r = _meta(f"{_act()}/insights", level=cap, time_range=f'{{"since":"{tu}","until":"{den}"}}', limit=200,
              fields=f"{cap}_name,spend,impressions,reach,clicks,ctr,cpc,cpm,actions")
    ds = []
    for x in r.get("data") or []:
        hd = {h["action_type"]: h["value"] for h in x.get("actions") or []}
        ds.append({"ten": x.get(f"{cap}_name"), "chi_tieu": x.get("spend"), "hien_thi": x.get("impressions"), "tiep_can": x.get("reach"),
                   "click": x.get("clicks"), "ctr": x.get("ctr"), "cpc": x.get("cpc"),
                   "tin_nhan": hd.get("onsite_conversion.messaging_conversation_started_7d"), "lead": hd.get("lead"),
                   "mua": hd.get("offsite_conversion.fb_pixel_purchase") or hd.get("purchase")})
    return {"tu_ngay": tu, "den_ngay": den, "cap": cap, "tien_te": "theo tài khoản quảng cáo", "dong": ds}


def meta_doi_trang_thai(a):
    v = KHOA.get("META_API_VERSION") or "v21.0"
    r = requests.post(f"https://graph.facebook.com/{v}/{a['id']}", data={"status": a["trang_thai"], "access_token": KHOA["META_ACCESS_TOKEN"]}, timeout=60).json()
    if "error" in r:
        raise RuntimeError("Meta: " + r["error"].get("message", "lỗi"))
    return {"ok": True, "id": a["id"], "trang_thai": a["trang_thai"]}


dang_ky("meta", "Meta Ads", "Chiến dịch và hiệu quả quảng cáo Facebook/Instagram; bật tắt chiến dịch.", "Quảng cáo",
        ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"],
        lambda: "Tài khoản: " + _meta(_act(), fields="name")["name"],
        [cc("chien_dich", "Danh sách chiến dịch (lọc ACTIVE/PAUSED).", "doc", meta_chien_dich, {"trang_thai": {"type": "string"}}),
         cc("hieu_qua", "Chi tiêu, hiển thị, click, CTR, CPC, tin nhắn, lead, mua theo chiến dịch/nhóm/quảng cáo trong khoảng ngày (mặc định 7 ngày).", "doc", meta_hieu_qua,
            {**KHOANG, "cap": {"type": "string", "enum": ["campaign", "adset", "ad"]}}),
         cc("doi_trang_thai", "Bật (ACTIVE) hoặc tạm dừng (PAUSED) một chiến dịch/nhóm/quảng cáo theo id. Có tác động thật tới chi tiêu.", "ghi", meta_doi_trang_thai,
            {"id": {"type": "string"}, "trang_thai": {"type": "string", "enum": ["ACTIVE", "PAUSED"]}}, ("id", "trang_thai"),
            tom_tat=lambda a: {"Đối tượng": a.get("id"), "Trạng thái mới": a.get("trang_thai")})])


# ======================= WORDPRESS =======================
def _wp(method, duong, **kw):
    r = requests.request(method, KHOA["WP_URL"].rstrip("/") + "/wp-json/wp/v2" + duong,
                         auth=(KHOA["WP_USER"], KHOA["WP_APP_PASSWORD"]), timeout=60, **kw)
    if r.status_code >= 400:
        raise RuntimeError(f"WordPress {r.status_code}: {r.text[:200]}")
    return r


def wp_bai(a):
    p = {"per_page": min(int(a.get("gioi_han") or 20), 100), "status": a.get("trang_thai") or "publish,draft,future",
         "_fields": "id,date,status,link,title"}
    if a.get("tu_khoa"):
        p["search"] = a["tu_khoa"]
    r = _wp("GET", "/posts", params=p)
    return {"tong_bai": r.headers.get("X-WP-Total"),
            "bai": [{"id": x["id"], "ngay": x["date"][:10], "trang_thai": x["status"], "tieu_de": x["title"]["rendered"], "link": x["link"]} for x in r.json()]}


def wp_xem(a):
    x = _wp("GET", f"/posts/{int(a['id'])}", params={"_fields": "id,date,status,link,title,content,excerpt"}).json()
    import re
    chu = re.sub(r"<[^>]+>", " ", x["content"]["rendered"])
    return {"id": x["id"], "tieu_de": x["title"]["rendered"], "trang_thai": x["status"], "link": x["link"],
            "so_tu": len(chu.split()), "noi_dung": " ".join(chu.split())[:6000]}


def wp_tao_nhap(a):
    x = _wp("POST", "/posts", json={"title": a["tieu_de"], "content": a.get("noi_dung", ""), "status": "draft"}).json()
    return {"ok": True, "id": x["id"], "trang_thai": x["status"], "link_sua": KHOA["WP_URL"].rstrip("/") + f"/wp-admin/post.php?post={x['id']}&action=edit"}


dang_ky("wordpress", "WordPress", "Đọc bài viết trên website WordPress; tạo bài NHÁP (không đăng).", "Website",
        ["WP_URL", "WP_USER", "WP_APP_PASSWORD"],
        lambda: f"{_wp('GET', '/posts', params={'per_page': 1}).headers.get('X-WP-Total')} bài đã đăng",
        [cc("bai_viet", "Danh sách/tìm bài viết (publish, draft, future).", "doc", wp_bai,
            {"tu_khoa": {"type": "string"}, "trang_thai": {"type": "string"}, "gioi_han": {"type": "integer"}}),
         cc("xem_bai", "Đọc nội dung một bài theo id.", "doc", wp_xem, {"id": {"type": "integer"}}, ("id",)),
         cc("tao_nhap", "Tạo một bài NHÁP mới (không đăng công khai). Bài SEO phải qua quy chuẩn EEAT/YMYL trước khi đăng.", "ghi", wp_tao_nhap,
            {"tieu_de": {"type": "string"}, "noi_dung": {"type": "string", "description": "HTML"}}, ("tieu_de",),
            tom_tat=lambda a: {"Tiêu đề": a.get("tieu_de"), "Độ dài": f"{len((a.get('noi_dung') or '').split())} từ", "Trạng thái": "nháp"})])
