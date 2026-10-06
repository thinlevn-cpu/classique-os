"""ChatGPT Live cho Classique OS: nói chuyện thời gian thực qua gói ChatGPT (Plus trở lên).

Cách chạy (học theo Javis OS, server/codex_realtime.py + voice_live.py, giấy phép MIT):
- Một `codex app-server` sống lâu (JSON-RPC qua stdin/stdout). Codex lo đăng nhập ChatGPT, OS không cầm token.
- Trình duyệt tạo offer WebRTC → `thread/realtime/start` → Codex trả answer. Âm thanh đi THẲNG trình duyệt ↔ OpenAI.
- Model giọng tự trò chuyện. Câu cần dữ liệu thật thì nó GIAO VIỆC (`handoff_request`): OS cho bộ não chính
  (Claude + công cụ Lark/Pancake/Meta...) làm, rồi đưa kết quả vào `thread/realtime/appendSpeech` để model đọc lại.
- Mỗi lần giao việc Codex tự mở một lượt agent: chặn ngay bằng `turn/interrupt` (Codex không được tự làm việc trên máy).

Đo 04/10/2026 trên VPS: gói Go bị 404 (realtime qua Codex chỉ dành cho Plus trở lên); lên Plus + đăng nhập lại là chạy.
"""
import asyncio
import json
import os
import shutil
import tempfile
import time
import uuid

GIONG_LIVE = ["juniper", "maple", "spruce", "ember", "vale", "breeze", "arbor", "sol", "cove"]

import ho_so as HSO

PROMPT_LIVE = HSO.doi_xung_ho(
    HSO.gioi_thieu() + ". "
    "Bạn đang nói chuyện với anh qua cuộc gọi bằng giọng nói tiếng Việt. Xưng em, gọi anh. "
    "Nói tự nhiên như người qua điện thoại, ấm áp, ngắn 1 đến 2 câu. Chuyện trò, hỏi thăm, kiến thức chung, "
    "chuyện gia đình, sức khoẻ thì trả lời thẳng, tận tình. Mọi câu cần SỐ LIỆU hay HÀNH ĐỘNG thật của công ty "
    "(doanh thu, đơn hàng, khách, lead, sản phẩm, quảng cáo, bài viết web, công việc, ghi nhớ, sửa dữ liệu), tra kiến thức "
    "trong bộ não công ty, hay việc cần LÀM ra sản phẩm (viết bài, kịch bản, kế hoạch, phân tích theo kỹ năng) thì KHÔNG tự làm: "
    "nói một câu đệm rất ngắn kiểu 'Để em xem nhé' rồi giao việc cho hệ thống. Đang chờ kết quả mà anh chỉ nói 'ok', "
    "'cảm ơn', 'xong thì báo anh' thì không giao việc lần nữa, chỉ đáp ngắn là em đang xem. Khi hệ thống trả kết quả "
    "thì đọc lại tự nhiên, ngắn gọn, giữ đúng con số, không thêm số liệu. Bị chen ngang thì dừng ngay và nghe."
)

PROMPT_NGHE = (
    "Bạn là máy ghi lời (gỡ băng) tiếng Việt. Người dùng đang ghi lại một buổi học, cuộc họp hoặc cuộc gọi. "
    "TUYỆT ĐỐI KHÔNG trả lời, không bình luận, không hỏi lại, không chào. Nếu bắt buộc phải phản hồi thì chỉ viết đúng một dấu chấm. "
    "Tên riêng, thương hiệu và thuật ngữ nước ngoài viết đúng chính tả gốc."
)

_TU_XAC_NHAN = set("ok oke okay ừ ừm vâng dạ được rồi nhé nha nhỉ thế vậy thì xong xem báo lại cho anh em biết đi "
                   "cảm ơn cám chờ đợi tí chút xíu cứ làm khi nào có kết quả đó đấy nghe hiểu ạ à luôn".split())


def la_xac_nhan(t):
    tu = [w for w in "".join(c if c.isalpha() or c.isspace() else " " for c in (t or "").lower()).split()]
    return 0 < len(tu) <= 12 and all(w in _TU_XAC_NHAN for w in tu)


def doc_duoc(chu, gioi_han=600):
    """Markdown → câu đọc được (bỏ ký hiệu, giữ số)."""
    import re
    s = re.sub(r"```.*?```", " ", str(chu or ""), flags=re.S)
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    dong = []
    for l in s.splitlines():
        l = l.strip()
        if re.fullmatch(r"\|?[\s:\-|]+\|?", l) and "-" in l:
            continue
        if l.startswith("|"):
            l = ", ".join(c.strip() for c in l.strip("|").split("|") if c.strip())
        dong.append(re.sub(r"^(#{1,6}|[>\-*+•])\s*", "", l))
    s = re.sub(r"[*_`#>]+", "", " ".join(x for x in dong if x))
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > gioi_han:
        cat = max(s.rfind(x, 0, gioi_han) for x in ".!?")
        s = s[:cat + 1] if cat > 100 else s[:gioi_han]
    return s


class AppServer:
    """Một `codex app-server` cho cả máy chủ (khởi động ~1 giây, mở thread mới ~0,1 giây)."""

    def __init__(self, codex):
        self.codex, self.p, self.n = codex, None, 0
        self.cho = {}        # id yêu cầu → future
        self.dk = {}         # threadId → queue thông báo
        self.khoa = asyncio.Lock()

    @property
    def song(self):
        return self.p is not None and self.p.returncode is None

    async def mo(self):
        async with self.khoa:
            if self.song:
                return
            self.p = await asyncio.create_subprocess_exec(
                self.codex, "-c", "features.realtime_conversation=true", "app-server",
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
                limit=8 * 1024 * 1024)
            asyncio.create_task(self._doc(self.p))
            await self.goi("initialize", {"clientInfo": {"name": "classique_os", "title": "Classique OS", "version": "1.0"},
                                          "capabilities": {"experimentalApi": True}}, 20, _mo=True)
            await self._ghi({"method": "initialized", "params": {}})

    async def _ghi(self, m):
        self.p.stdin.write((json.dumps(m, ensure_ascii=False) + "\n").encode())
        await self.p.stdin.drain()

    async def goi(self, method, params=None, timeout=30, _mo=False):
        if not _mo:
            await self.mo()
        self.n += 1
        rid = self.n
        fut = asyncio.get_running_loop().create_future()
        self.cho[rid] = fut
        try:
            await self._ghi({"method": method, "id": rid, "params": params or {}})
            msg = await asyncio.wait_for(fut, timeout)
        finally:
            self.cho.pop(rid, None)
        if msg.get("error"):
            e = msg["error"]
            raise RuntimeError(str(e.get("message") if isinstance(e, dict) else e))
        return msg.get("result") or {}

    async def _doc(self, p):
        try:
            while True:
                l = await p.stdout.readline()
                if not l:
                    break
                try:
                    msg = json.loads(l)
                except Exception:
                    continue
                if "id" in msg and "method" not in msg:
                    f = self.cho.get(msg["id"])
                    if f and not f.done():
                        f.set_result(msg)
                elif "id" in msg and "method" in msg:      # Codex xin duyệt lệnh/file: luôn từ chối
                    try:
                        await self._ghi({"id": msg["id"], "error": {"code": -32000, "message": "Classique OS không cho phiên thoại tự làm việc trên máy."}})
                    except Exception:
                        pass
                else:
                    tid = str((msg.get("params") or {}).get("threadId") or "")
                    q = self.dk.get(tid)
                    if q:
                        q.put_nowait(msg)
        finally:
            for f in self.cho.values():
                if not f.done():
                    f.set_exception(RuntimeError("Codex app-server đã dừng"))
            for q in self.dk.values():
                q.put_nowait({"method": "_exit", "params": {}})


class CuocGoi:
    """Một cuộc gọi ChatGPT Live. `hoi_bo_nao(cau) -> async iterator sự kiện` do server.py cấp (bộ não chính)."""

    def __init__(self, srv, giong, prompt, lich_su, hoi_bo_nao, ghi_luot, chi_nghe=False):
        self.id = uuid.uuid4().hex[:12]
        self.srv, self.giong, self.prompt, self.lich_su = srv, giong if giong in GIONG_LIVE else "juniper", prompt, lich_su
        self.hoi_bo_nao, self.ghi_luot = hoi_bo_nao, ghi_luot
        self.tid, self.q, self.ra = "", None, asyncio.Queue()
        self.cwd, self.dong = "", False
        self.nghe = ""                     # câu anh đang nói dở
        self.noi = False                   # model đang nói
        self.luc_chu = 0.0
        self.im_tu = 0.0
        self.hang_doc = []
        self.dang_lam = []                 # việc đang giao cho bộ não
        self.bg = set()
        self.luc = time.time()
        # bóc âm: chỉ lấy lời người nói. Gói ChatGPT chỉ cho WebRTC v3 (luôn trả bằng giọng; v2 trả chữ và appendAudio
        # đòi API key, đo 05/10), nên dặn model im lặng, trang không phát tiếng trả về, và bỏ qua lời model.
        self.chi_nghe = chi_nghe

    async def bat_dau(self, sdp):
        self.cwd = tempfile.mkdtemp(prefix="cos-live-")   # thư mục rỗng: lượt Codex nào lỡ chạy cũng không thấy file thật
        r = await self.srv.goi("thread/start", {"ephemeral": True, "cwd": self.cwd, "sandbox": "read-only",
                                                "approvalPolicy": "never", "developerInstructions": "Reply only: [FINAL]"}, 40)
        self.tid = str((r.get("thread") or {}).get("id") or "")
        if not self.tid:
            raise RuntimeError("Codex không mở được phiên cho ChatGPT Live.")
        self.q = asyncio.Queue()
        self.srv.dk[self.tid] = self.q
        sdp_fut = asyncio.get_running_loop().create_future()
        self._sdp = sdp_fut
        self._chay(self._vong())
        params = {"threadId": self.tid, "version": "v3", "outputModality": "audio",
                  "transport": {"type": "webrtc", "sdp": sdp}, "prompt": self.prompt, "voice": self.giong,
                  "includeStartupContext": False,          # BẮT BUỘC: mặc định Codex nhét ~5.000 token quét máy vào prompt
                  "clientManagedHandoffs": True, "delegationAckFiller": True,
                  "flushTranscriptTailOnSessionEnd": False,
                  "realtimeStartInstructions": "Do no work. Reply only: [FINAL]"}
        if self.lich_su:
            params["initialItems"] = self.lich_su
        await self.srv.goi("thread/realtime/start", params, 30)
        return await asyncio.wait_for(sdp_fut, 25)

    def _chay(self, coro):
        t = asyncio.create_task(coro)
        self.bg.add(t)
        t.add_done_callback(self.bg.discard)

    def _ban(self, ev):
        self.ra.put_nowait(ev)

    async def _vong(self):
        while True:
            msg = await self.q.get()
            m, p = msg.get("method", ""), msg.get("params") or {}
            self.luc = time.time()
            if m == "thread/realtime/sdp":
                if not self._sdp.done():
                    self._sdp.set_result(str(p.get("sdp") or ""))
            elif m == "thread/realtime/error":
                t = str(p.get("message") or "lỗi không rõ")
                if not self._sdp.done():
                    self._sdp.set_exception(RuntimeError(t))
                self._ban({"t": "loi", "text": "ChatGPT Live: " + t[:300]})
            elif m == "thread/realtime/transcript/delta":
                d = str(p.get("delta") or "")
                if p.get("role") == "user":
                    self.nghe += d
                    self._ban({"t": "anh", "text": self.nghe.strip(), "xong": False})
                elif d and not self.chi_nghe:
                    self.noi, self.luc_chu = True, time.monotonic()
                    self._ban({"t": "em", "text": d})
            elif m == "thread/realtime/transcript/done":
                if p.get("role") == "user":
                    t = (str(p.get("text") or "").strip() or self.nghe.strip())
                    self.nghe = ""
                    if t:
                        self.ghi_luot("me", t)
                        self._ban({"t": "anh", "text": t, "xong": True})
                elif not self.chi_nghe:
                    self.noi, self.im_tu = False, time.monotonic()
                    t = str(p.get("text") or "").strip()
                    if t:
                        self.ghi_luot("bot", t)
                    self._ban({"t": "em_xong"})
            elif m == "thread/realtime/itemAdded":
                it = p.get("item") or {}
                if it.get("type") == "handoff_request" and not self.chi_nghe:
                    yc = str(it.get("input_transcript") or "").strip()
                    gan = self.nghe.strip()
                    if gan and (not yc or yc.lower() in gan.lower() or len(yc.split()) < 3):
                        yc = gan
                    self._chay(self._giao_viec(yc or "(không rõ yêu cầu, hãy hỏi lại anh)"))
            elif m == "turn/started":                 # chặn lượt agent Codex tự mở khi giao việc
                tid = str(((p.get("turn") or {}).get("id")) or p.get("turnId") or "")
                if tid:
                    self._chay(self._chan(tid))
            elif m == "thread/realtime/closed":
                if not self.dong:
                    self._ban({"t": "loi", "text": f"ChatGPT Live đã ngắt ({p.get('reason') or 'không rõ lý do'})."})
                self._ban({"t": "het"})
                return
            elif m == "_exit":
                self._ban({"t": "loi", "text": "Codex app-server dừng, cuộc gọi kết thúc."})
                self._ban({"t": "het"})
                return

    async def _chan(self, turn_id):
        try:
            await self.srv.goi("turn/interrupt", {"threadId": self.tid, "turnId": turn_id}, 10)
        except Exception:
            pass

    async def _giao_viec(self, yc):
        if self.dang_lam and la_xac_nhan(yc):
            return
        self.dang_lam.append(yc)
        self._ban({"t": "giao_viec", "text": yc})
        chu, cong_cu = [], []
        try:
            async for ev in self.hoi_bo_nao(yc):
                if ev.get("t") == "chu":
                    chu.append(ev["text"])
                elif ev.get("t") == "cong_cu":
                    cong_cu.append(ev.get("ten"))
                    self._ban(ev)
                elif ev.get("t") == "de_xuat":
                    self._ban(ev)
                elif ev.get("t") == "loi":
                    chu.append("Em gặp lỗi: " + ev.get("text", ""))
        except Exception as e:
            chu.append(f"Em gặp lỗi khi tra: {e}")
        finally:
            self.dang_lam.remove(yc)
        kq = "".join(chu).strip() or "Em chưa có kết quả."
        self._ban({"t": "ket_qua", "text": kq, "cong_cu": cong_cu})
        self.hang_doc.append(doc_duoc(kq))
        await self._doc_hang()

    async def _doc_hang(self):
        """Chỉ đẩy kết quả khi model đang im: đẩy lúc nó đang nói thì hai nội dung bị trộn vào một lượt."""
        while self.hang_doc and not self.dong:
            han = time.monotonic() + 60
            while time.monotonic() < han and (self.nghe.strip() or (self.noi and time.monotonic() - self.luc_chu < 4)
                                              or (self.im_tu and time.monotonic() - self.im_tu < .4)):
                await asyncio.sleep(.05)
            t = self.hang_doc.pop(0)
            try:
                await self.srv.goi("thread/realtime/appendSpeech", {"threadId": self.tid, "text": t}, 15)
            except Exception:
                pass
            await asyncio.sleep(1.5)

    async def gui_chu(self, t):
        await self.srv.goi("thread/realtime/appendText", {"threadId": self.tid, "text": t}, 15)

    async def ket_thuc(self):
        self.dong = True
        self.hang_doc.clear()
        if self.tid:
            try:
                await self.srv.goi("thread/realtime/stop", {"threadId": self.tid}, 5)
            except Exception:
                pass
            self.srv.dk.pop(self.tid, None)
        for t in list(self.bg):
            t.cancel()
        if self.cwd:
            shutil.rmtree(self.cwd, ignore_errors=True)
        self._ban({"t": "het"})


def tim_codex():
    p = shutil.which("codex") or os.path.expanduser("~/.local/bin/codex")
    return p if p and os.path.exists(p) else None
