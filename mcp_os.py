#!/usr/bin/env python3
"""Máy chủ MCP (stdio) của Classique OS: đưa cho bộ não AI (Claude, Codex) bộ công cụ của MỌI kết nối đang bật.

Danh sách công cụ và mọi lệnh gọi đều đi về server.py (/api/agent/cong-cu, /api/agent/goi), nơi DUY NHẤT
kiểm quyền (Chỉ đọc / Đề xuất / Toàn quyền). File này chỉ chuyển tiếp, không tự quyết gì.
Tự viết JSON-RPC thay vì SDK `mcp`: SDK vừa đổi lớn ở bản 2.x, mà ở đây chỉ cần 4 lệnh.
Thay cho mcp_lark.py (bản chỉ có Lark).
"""
import json
import os
import sys

import requests

GOC = "http://127.0.0.1:8790/api/agent"
H = {"X-OS-Token": os.environ.get("OS_AGENT_TOKEN", "")}   # thẻ nội bộ do server.py cấp


def tra(id_, result=None, error=None):
    m = {"jsonrpc": "2.0", "id": id_}
    m["error" if error else "result"] = error or result
    sys.stdout.write(json.dumps(m, ensure_ascii=False) + "\n")
    sys.stdout.flush()


for dong in sys.stdin:
    try:
        req = json.loads(dong)
    except Exception:
        continue
    m, id_ = req.get("method"), req.get("id")
    if id_ is None:
        continue
    if m == "initialize":
        tra(id_, {"protocolVersion": (req.get("params") or {}).get("protocolVersion", "2024-11-05"),
                  "capabilities": {"tools": {}}, "serverInfo": {"name": "classique-os", "version": "2.0"}})
    elif m == "tools/list":
        try:
            tra(id_, {"tools": requests.get(f"{GOC}/cong-cu", headers=H, timeout=30).json()})
        except Exception as e:
            tra(id_, error={"code": -32000, "message": f"Không lấy được công cụ: {e}"})
    elif m == "tools/call":
        p = req.get("params") or {}
        try:
            r = requests.post(f"{GOC}/goi", headers=H, json={"ten": p.get("name"), "args": p.get("arguments") or {}}, timeout=180)
            d = r.json()
            loi = r.status_code >= 400
            chu = (d.get("detail") or str(d)) if loi else json.dumps(d, ensure_ascii=False)
        except Exception as e:
            loi, chu = True, f"Không gọi được Classique OS: {e}"
        tra(id_, {"content": [{"type": "text", "text": chu[:60000]}], "isError": loi})
    elif m == "ping":
        tra(id_, {})
    else:
        tra(id_, error={"code": -32601, "message": f"không hỗ trợ {m}"})
