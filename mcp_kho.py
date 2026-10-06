"""Thư viện MCP: danh mục kết nối chép từ Javis OS (system/mcp-catalog.json, giấy phép MIT).

Anh chọn một kết nối, dán khoá hoặc file JSON theo hướng dẫn, OS dựng máy chủ MCP (stdio hoặc http) và đưa nó cho
Claude/Codex như mọi MCP ngoài. Giá trị bí mật nằm ở khoa-mcp.json và mcp-tep/ (chmod 600), không bao giờ trả ra
giao diện. Kết nối cần luồng đăng nhập riêng (OAuth có trình duyệt, quét QR, code nội bộ của Javis) chỉ hiện để biết.
"""
import json
import os
import subprocess
import threading
import time
from pathlib import Path

import requests

GOC = Path(__file__).resolve().parent
DANH_MUC = GOC / "mcp-catalog.json"
TEP_KHOA = GOC / "khoa-mcp.json"
THU_MUC_TEP = GOC / "mcp-tep"


def danh_muc():
    try:
        return json.loads(DANH_MUC.read_text(encoding="utf-8"))["connectors"]
    except Exception:
        return []


def lay(cid):
    return next((c for c in danh_muc() if c["id"] == cid), None)


def ho_tro(c):
    """(được không, lý do nếu không)."""
    a = c.get("auth") or {}
    if c.get("transport") == "internal" or c.get("internal"):
        return False, "Chạy bằng code riêng bên trong Javis, không chép sang được."
    if a.get("type") == "qr":
        return False, "Cần quét QR bằng app Zalo. Làm cùng khối Chatbot Zalo."
    if a.get("type") == "oauth" or c.get("needs_local_browser"):
        return False, "Cần đăng nhập qua trình duyệt (OAuth). Bản sau."
    if c.get("inject_args") or (c.get("transport") == "http" and not (c.get("url") or c.get("url_template"))):
        return False, "Dùng cơ chế riêng của Javis, chưa chép sang được."
    return True, ""


def truong(c):
    """Các ô anh cần điền: chỉ ô có đích (biến môi trường hoặc header), ô khác là luồng riêng của Javis."""
    out = []
    for f in (c.get("auth") or {}).get("fields", []):
        if not (f.get("env") or f.get("header") or f.get("url_base")):
            continue
        out.append({"key": f["key"], "label": f.get("label", f["key"]), "placeholder": f.get("placeholder", ""),
                    "nhieu_dong": bool(f.get("multiline") or f.get("file")), "tuy_chon": bool(f.get("optional")), "mac_dinh": f.get("default", ""),
                    "bi_mat": not f.get("url_base") and (not f.get("optional") or "token" in f["key"] or "password" in f["key"])})
    return out


def doc_khoa():
    try:
        return json.loads(TEP_KHOA.read_text())
    except Exception:
        return {}


def _ghi_khoa(d):
    TEP_KHOA.write_text(json.dumps(d))
    os.chmod(TEP_KHOA, 0o600)


def dung(cid, gia_tri):
    """Dựng mục MCP ngoài từ danh mục + giá trị anh điền. Trả mục (không chứa bí mật) để lưu vào cấu hình."""
    c = lay(cid)
    if not c:
        raise ValueError("Không có kết nối này")
    ok, ly_do = ho_tro(c)
    if not ok:
        raise ValueError(ly_do)
    env, headers, url_gt = dict(c.get("env") or {}), {}, {}
    for f in (c.get("auth") or {}).get("fields", []):
        v = str(gia_tri.get(f["key"]) or f.get("default") or "").strip()
        if not v:
            if not f.get("optional") and (f.get("env") or f.get("header") or f.get("url_base")):
                raise ValueError(f"Thiếu: {f.get('label', f['key'])}")
            continue
        if f.get("url_base"):                  # vd n8n: địa chỉ máy chủ của anh ghép vào mẫu URL
            v = v.rstrip("/")
            if not v.startswith(("http://", "https://")):
                v = "https://" + v
            url_gt[f["key"]] = v
            continue
        if f.get("file"):                      # dán nội dung file JSON → ghi ra tệp riêng, biến môi trường trỏ tới tệp
            try:
                json.loads(v)
            except Exception:
                raise ValueError(f"{f.get('label', f['key'])}: không phải JSON hợp lệ")
            d = THU_MUC_TEP / cid
            d.mkdir(parents=True, exist_ok=True)
            os.chmod(THU_MUC_TEP, 0o700)
            p = d / f"{f['key']}.json"
            p.write_text(v)
            os.chmod(p, 0o600)
            v = str(p)
        if f.get("env"):
            env[f["env"]] = v
        if f.get("header"):
            ten, mau = f["header"].split(":", 1)
            headers[ten.strip()] = mau.strip().replace("{" + f["key"] + "}", v)
    k = doc_khoa()
    k[cid] = {"env": env, "headers": headers}
    _ghi_khoa(k)
    muc = {"ten": cid, "kho": cid, "bat": True}
    if c.get("transport") == "http":
        url = c.get("url") or ""
        if c.get("url_template"):
            url = c["url_template"]
            for k2, v2 in url_gt.items():
                url = url.replace("{" + k2 + "}", v2)
        muc.update(url=url, lenh="", tham_so=[])
    else:
        muc.update(lenh=c["command"], tham_so=list(c.get("args") or []), url="")
    return muc


def bo(cid):
    k = doc_khoa()
    k.pop(cid, None)
    _ghi_khoa(k)
    d = THU_MUC_TEP / cid
    if d.exists():
        for p in d.iterdir():
            p.unlink()
        d.rmdir()


def bi_mat_cho(ten):
    return doc_khoa().get(ten, {"env": {}, "headers": {}})


# ---------------- kiểm tra: bắt tay MCP thật và đếm công cụ ----------------
_KHOI = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
         "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "classique-os", "version": "1"}}}


def kiem_tra(srv, cho=90):
    if srv.get("url"):
        return _kiem_http(srv)
    return _kiem_stdio(srv, cho)


def _kiem_http(srv):
    h = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream", **(srv.get("headers") or {})}

    def doc(r):
        if "text/event-stream" in r.headers.get("content-type", ""):
            for l in r.text.splitlines():
                if l.startswith("data:"):
                    return json.loads(l[5:])
            return {}
        return r.json()
    r = requests.post(srv["url"], json=_KHOI, headers=h, timeout=30)
    if r.status_code >= 400:
        return {"ok": False, "loi": f"Máy chủ trả {r.status_code}: {r.text[:200]}"}
    if r.headers.get("mcp-session-id"):
        h["mcp-session-id"] = r.headers["mcp-session-id"]
    requests.post(srv["url"], json={"jsonrpc": "2.0", "method": "notifications/initialized"}, headers=h, timeout=15)
    r = requests.post(srv["url"], json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"}, headers=h, timeout=30)
    d = doc(r)
    if d.get("error"):
        return {"ok": False, "loi": str(d["error"])[:300]}
    ts = (d.get("result") or {}).get("tools") or []
    return {"ok": True, "so_cong_cu": len(ts), "cong_cu": [t["name"] for t in ts][:40]}


def _kiem_stdio(srv, cho):
    env = {**os.environ, **(srv.get("env") or {})}
    try:
        p = subprocess.Popen([srv["command"], *srv.get("args", [])], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, text=True, env=env, cwd=str(GOC))
    except FileNotFoundError:
        return {"ok": False, "loi": f"Máy chủ chưa có lệnh {srv['command']}"}
    loi = []
    threading.Thread(target=lambda: loi.extend(p.stderr.readlines()), daemon=True).start()
    kq = {}

    def doc():
        for l in p.stdout:
            try:
                m = json.loads(l)
            except Exception:
                continue
            if m.get("id") in (1, 2):
                kq[m["id"]] = m
                if m["id"] == 2:
                    return
    t = threading.Thread(target=doc, daemon=True)
    t.start()
    try:
        p.stdin.write(json.dumps(_KHOI) + "\n")
        p.stdin.flush()
        han = time.time() + cho                  # lần đầu uvx/npx còn phải tải gói
        while 1 not in kq and time.time() < han and p.poll() is None:
            time.sleep(.2)
        if 1 in kq:
            p.stdin.write(json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"}) + "\n")
            p.stdin.write(json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/list"}) + "\n")
            p.stdin.flush()
            t.join(30)
    except (BrokenPipeError, OSError):
        pass
    finally:
        p.kill()
    if 2 in kq and not kq[2].get("error"):
        ts = kq[2]["result"].get("tools") or []
        return {"ok": True, "so_cong_cu": len(ts), "cong_cu": [x["name"] for x in ts][:40]}
    du = "".join(loi[-6:]).strip()
    return {"ok": False, "loi": (du or ("Hết giờ chờ máy chủ MCP" if 1 not in kq else "Không lấy được danh sách công cụ"))[-400:]}
