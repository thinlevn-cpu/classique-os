"""Hồ sơ của người cài Classique OS: ai là chủ, doanh nghiệp làm gì, Base Lark tổ chức ra sao.

Nằm ở `ho-so.json` (không lên git). Chưa có thì dùng mặc định trung tính, OS vẫn chạy.
Mẫu đầy đủ: `ho-so.example.json`. Khoá bí mật KHÔNG để ở đây mà ở `.env` (nhập ở trang Kết nối).
"""
import json
import re
from pathlib import Path

GOC = Path(__file__).resolve().parent
TEP = GOC / "ho-so.json"

MAC_DINH = {
    "ten_chu": "",              # tên hiển thị của chủ, vd "Lan"
    "goi_chu": "anh",           # trợ lý gọi chủ là gì: anh / chị / bạn...
    "doanh_nghiep": "",         # tên doanh nghiệp
    "mo_ta_doanh_nghiep": "",   # một câu: làm gì, bán gì
    "tu_rieng": [],             # từ riêng cho gỡ băng (tên thương hiệu, thuật ngữ)
    "lark": {
        "ten_base": "Lark Base",
        "phan_he": {},          # số đầu tên bảng → tên phân hệ, vd {"2": "Bán hàng"}
        "phan_he_tay": {},      # tên bảng không có số đầu → số phân hệ
        "chi_doc_tien_to": [],  # bảng có tên bắt đầu bằng các tiền tố này luôn chỉ đọc (ngoài chữ "tự động")
        "bang_chinh": [],       # [{"ten": "Đơn hàng", "id": "tbl..."}] gợi ý cho trợ lý khỏi phải dò
        "bang": {},             # bảng cho trang Điều hành: don, khach, lead, sp, viec, seo, nhat_ky, thu_chi, dong_tien
    },
}


def doc():
    try:
        d = json.loads(TEP.read_text(encoding="utf-8"))
    except Exception:
        d = {}
    ra = {**MAC_DINH, **{k: v for k, v in d.items() if k != "lark"}}
    ra["lark"] = {**MAC_DINH["lark"], **(d.get("lark") or {})}
    return ra


HS = doc()


def ten_chu():
    return f"{HS['goi_chu']} {HS['ten_chu']}".strip() if HS["ten_chu"] else HS["goi_chu"]


def gioi_thieu():
    """Câu mở đầu prompt: trợ lý của ai, doanh nghiệp làm gì."""
    s = f"Bạn là trợ lý riêng của {ten_chu()}"
    if HS["doanh_nghiep"]:
        s += f", chủ {HS['doanh_nghiep']}"
        if HS["mo_ta_doanh_nghiep"]:
            s += f" ({HS['mo_ta_doanh_nghiep']})"
    return s


def doi_xung_ho(van):
    """Prompt viết sẵn với "anh"; người cài chọn cách gọi khác thì thay theo."""
    g = HS["goi_chu"].strip() or "anh"
    if g == "anh":
        return van
    return re.sub(r"\b([Aa])nh\b", lambda m: (g[0].upper() if m.group(1) == "A" else g[0]) + g[1:], van)
