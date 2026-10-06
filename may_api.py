"""Model chạy bằng API key (học theo Javis OS: 6 engine API cạnh các CLI dùng gói có sẵn).

Cả sáu hãng đều có cổng tương thích OpenAI Chat Completions + tool calling, nên một vòng lặp dùng chung:
gửi tin + danh sách công cụ của OS → model đòi gọi công cụ → OS chạy (qua đúng chốt quyền của /api/agent/goi)
→ trả kết quả → lặp, tối đa 30 vòng. Khoá lưu ở khoa-model.json (chmod 600), không bao giờ gửi ngược ra giao diện.
"""
import json
import os
import time
from pathlib import Path

import requests

import ket_noi as KN

GOC = Path(__file__).resolve().parent
TEP_KHOA = GOC / "khoa-model.json"
VONG_TOI_DA = 30

NHA = {
    "openrouter": {"ten": "OpenRouter", "base": "https://openrouter.ai/api/v1", "lay_khoa": "https://openrouter.ai/keys",
                   "mo_ta": "Một khoá, hàng trăm model (Claude, GPT, Gemini, Grok, DeepSeek...).",
                   "goi_y": ["anthropic/claude-sonnet-5.5", "openai/gpt-5.5", "google/gemini-3-pro", "x-ai/grok-5"]},
    "openai": {"ten": "OpenAI API", "base": "https://api.openai.com/v1", "lay_khoa": "https://platform.openai.com/api-keys",
               "mo_ta": "GPT qua API key (tính tiền theo token, tách khỏi gói ChatGPT).", "goi_y": ["gpt-5.5", "gpt-5.5-mini"]},
    "anthropic": {"ten": "Anthropic API", "base": "https://api.anthropic.com/v1", "lay_khoa": "https://console.anthropic.com/settings/keys",
                  "mo_ta": "Claude qua API key: an toàn cho chạy nền 24/7 (không dính gói Pro/Max).",
                  "goi_y": ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5-20251001"]},
    "gemini": {"ten": "Google Gemini (API)", "base": "https://generativelanguage.googleapis.com/v1beta/openai",
               "lay_khoa": "https://aistudio.google.com/apikey", "mo_ta": "Gemini qua khoá AI Studio.", "goi_y": ["gemini-3-pro", "gemini-3-flash"]},
    "groq": {"ten": "Groq", "base": "https://api.groq.com/openai/v1", "lay_khoa": "https://console.groq.com/keys",
             "mo_ta": "Model mở chạy rất nhanh.", "goi_y": ["openai/gpt-oss-120b", "llama-4-maverick"]},
    "ollama": {"ten": "Ollama Cloud", "base": "https://ollama.com/v1", "lay_khoa": "https://ollama.com/settings/keys",
               "mo_ta": "Model mở chạy trên mây của Ollama.", "goi_y": ["gpt-oss:120b", "qwen3-coder:480b"]},
}
_ds_model = {}      # nhà → (lúc, [model])


def doc_khoa():
    try:
        return json.loads(TEP_KHOA.read_text())
    except Exception:
        return {}


def luu_khoa(nha, khoa):
    d = doc_khoa()
    if khoa:
        d[nha] = khoa.strip()
    else:
        d.pop(nha, None)
    TEP_KHOA.write_text(json.dumps(d))
    os.chmod(TEP_KHOA, 0o600)
    _ds_model.pop(nha, None)


def _dau(nha):
    k = doc_khoa().get(nha)
    if not k:
        raise ValueError(f"Chưa có API key cho {NHA[nha]['ten']}. Dán khoá ở trang Models.")
    h = {"Authorization": f"Bearer {k}", "Content-Type": "application/json"}
    if nha == "openrouter":
        h.update({"HTTP-Referer": (KN.KHOA.get("OS_PUBLIC_URL") or "http://127.0.0.1:8790"), "X-Title": "Classique OS"})
    return h


def _loi(r):
    try:
        e = r.json().get("error")
        t = e.get("message") if isinstance(e, dict) else (e or r.text)
    except Exception:
        t = r.text
    if r.status_code in (401, 403):
        return f"Khoá bị từ chối ({r.status_code}): {str(t)[:200]}"
    return f"Lỗi {r.status_code}: {str(t)[:300]}"


def ds_model(nha, lam_moi=False):
    """Model hãng cho khoá này dùng (GET /models). Đồng thời là bước kiểm tra khoá."""
    if not lam_moi and nha in _ds_model and time.time() - _ds_model[nha][0] < 3600:
        return _ds_model[nha][1]
    r = requests.get(NHA[nha]["base"] + "/models", headers=_dau(nha), timeout=20)
    if r.status_code != 200:
        raise ValueError(_loi(r))
    d = r.json()
    ms = sorted({str(m.get("id", "")).removeprefix("models/") for m in (d.get("data") or d.get("models") or []) if m.get("id")})
    _ds_model[nha] = (time.time(), ms)
    return ms


def trang_thai():
    k = doc_khoa()
    ra = []
    for nid, n in NHA.items():
        ms = _ds_model.get(nid, (0, []))[1]
        ra.append({"id": nid, "ten": n["ten"], "loai": "api", "co_khoa": nid in k, "cai": True, "dang_nhap": nid in k,
                   "models": ms or n["goi_y"], "huong_dan": n["mo_ta"], "lay_khoa": n["lay_khoa"]})
    return ra


def cong_cu_openai(ds):
    return [{"type": "function", "function": {"name": t["name"], "description": t["description"][:1000],
                                              "parameters": t["inputSchema"] or {"type": "object", "properties": {}}}} for t in ds]


def goi_model(nha, model, tin, cong_cu):
    body = {"model": model, "messages": tin}
    if cong_cu:
        body["tools"] = cong_cu
    r = requests.post(NHA[nha]["base"] + "/chat/completions", headers=_dau(nha), json=body, timeout=180)
    if r.status_code != 200:
        raise ValueError(_loi(r))
    return r.json()["choices"][0]["message"]
