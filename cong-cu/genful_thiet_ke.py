#!/usr/bin/env python3
"""Vẽ bản thiết kế giao diện bằng Genful (Nano Banana Pro). Cần GENFUL_API_KEY trong .env.
Dùng: python cong-cu/genful_thiet_ke.py <ten-file-ra.png> "<prompt>" [ratio=16_9] [resolution=2k]"""
import json, sys, time, urllib.request, urllib.error, ssl
from pathlib import Path
try:
    import certifi; CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:
    CTX = ssl.create_default_context()
GOC = Path(__file__).resolve().parents[1]
BASE, DOMAIN, MODEL = "https://v2.api.gommo.net", "genful.ai", "google_image_gen_banana_pro"
KEY = next(l.split("=", 1)[1].strip() for l in open(GOC / ".env", encoding="utf-8") if l.startswith("GENFUL_API_KEY="))


def req(path, data):
    r = urllib.request.Request(BASE + path, data=json.dumps(data).encode(), method="POST",
                               headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json", "User-Agent": "classique-os/1.0"})
    try:
        with urllib.request.urlopen(r, timeout=90, context=CTX) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


out, prompt = sys.argv[1], sys.argv[2]
ratio = sys.argv[3] if len(sys.argv) > 3 else "16_9"
reso = sys.argv[4] if len(sys.argv) > 4 else "2k"
st, j = req(f"/ai/jobs/image/{MODEL}", {"domain": DOMAIN, "prompt": prompt, "ratio": ratio, "resolution": reso, "mode": "vip"})
jid = (j.get("data") or {}).get("id_base") or ((j.get("raw") or {}).get("imageInfo") or {}).get("id_base")
if not jid:
    sys.exit(f"Tạo job lỗi {st}: {j.get('error_code')} {j.get('message')}")
t0, url = time.time(), None
while time.time() - t0 < 400:
    time.sleep(4)
    st, p = req(f"/ai/jobs/{jid}?media=image", {"domain": DOMAIN})
    d = p.get("data") or {}
    url = d.get("result_url") or ((p.get("raw") or {}).get("imageInfo") or {}).get("url")
    if d.get("status") in ("FAILED", "ERROR", "CANCELLED", "REJECTED", "UNSAFE"):
        sys.exit(f"Job thất bại: {d.get('status')}")
    if url and d.get("status") not in ("PENDING", "PROCESSING", "QUEUED", "ACTIVE"):
        break
if not url:
    sys.exit("Quá giờ chưa xong")
with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "classique-os/1.0"}), timeout=120, context=CTX) as r:
    Path(out).write_bytes(r.read())
print(json.dumps({"job": jid, "giay": round(time.time() - t0), "ra": out}))
