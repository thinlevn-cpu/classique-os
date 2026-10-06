"""Bộ não của Classique OS: chỗ trợ lý đọc kiến thức và ghi nhớ lâu dài (thư mục markdown, mở được bằng Obsidian).

Hai kiểu, chọn ở Cài đặt → Bộ não (học theo Javis OS, server/git_brain.py):
- local : thư mục `brains/<id>/` trên VPS. Chỉ có ở máy đó.
- github: bản clone riêng của một repo. Mỗi lần ghi là một commit rồi push, nên có lịch sử và hoàn tác.
  Repo có thể đang được tiến trình khác ghi, nên OS giữ bản clone riêng, pull --rebase trước khi push
  để không giẫm lên commit của người khác.

Luật an toàn khi ghi: chỉ trong thư mục bộ não; không ghi `raw/` (nguồn bất biến), `.git`,
`.claude`, `.agents`, `.obsidian`, `.env`; không có lệnh xoá; chỉ `git add` đúng tệp vừa ghi (không `add -A`).
"""
import json
import os
import re
import subprocess
import threading
import time
from datetime import date
from pathlib import Path

GOC = Path(__file__).resolve().parent
NAO_DIR = GOC / "brains"
SO = GOC / "nao.json"
KHOA_SSH = Path.home() / ".ssh" / "nao_newbrain"
CAM_GHI = ("raw/", ".git/", ".claude/", ".agents/", ".obsidian/", ".env")
DUOI_CHU = (".md", ".txt", ".json", ".csv", ".yaml", ".yml")
_lock = threading.Lock()

# Mặc định chỉ có bộ não cục bộ; thêm repo GitHub ở trang Bộ não (lưu vào nao.json, không lên git).
MAC_DINH = {
    "dang_dung": "vps",
    "ds": [
        {"id": "vps", "ten": "Bộ não trên máy chủ", "kieu": "local",
         "mo_ta": "Thư mục brains/vps/ trên máy chạy OS: không lên GitHub."},
    ],
}
TRANG_THAI = {}          # id → {luc_dong_bo, loi, ...}


def doc_so():
    try:
        return json.loads(SO.read_text(encoding="utf-8"))
    except Exception:
        return json.loads(json.dumps(MAC_DINH))


def ghi_so(d):
    SO.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")


def lay(nid=None):
    d = doc_so()
    nid = nid or d.get("dang_dung")
    return next((x for x in d["ds"] if x["id"] == nid), d["ds"][0])


def thu_muc(n):
    return NAO_DIR / n["id"]


# ---------------- git ----------------
def _env():
    e = dict(os.environ)
    if KHOA_SSH.exists():
        e["GIT_SSH_COMMAND"] = f"ssh -i {KHOA_SSH} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
    e["GIT_TERMINAL_PROMPT"] = "0"
    return e


def git(goc, *args, timeout=60):
    r = subprocess.run(["git", "-C", str(goc), *args], capture_output=True, text=True, timeout=timeout, env=_env())
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def _loi_de_hieu(t):
    if "Permission denied" in t or "publickey" in t or "Repository not found" in t:
        return "GitHub chưa cấp quyền: thêm khoá deploy của OS vào repo (Settings → Deploy keys, bật Allow write access)."
    if "Could not resolve host" in t:
        return "Không kết nối được GitHub."
    return t.strip()[-300:]


def chuan_bi(n):
    """Tạo bộ não nếu chưa có: local thì dựng khung, github thì clone."""
    goc = thu_muc(n)
    if n["kieu"] == "local":
        if not (goc / "memory").exists():
            for p in ("memory/facts", "wiki", "output"):
                (goc / p).mkdir(parents=True, exist_ok=True)
            (goc / "memory" / "MEMORY.md").write_text("# Trí nhớ\n\n", encoding="utf-8")
            (goc / "index.md").write_text(f"# Mục lục {n['ten']}\n\n> Trang đọc đầu tiên. Trợ lý cập nhật khi thêm trang.\n", encoding="utf-8")
            (goc / "log.md").write_text("# Nhật ký\n", encoding="utf-8")
        if not (goc / ".git").exists():                  # local cũng có git cục bộ: xem lịch sử + hoàn tác
            git(goc, "init", "-q")
            git(goc, "config", "user.name", "Classique OS")
            git(goc, "config", "user.email", "os@classique.local")
            git(goc, "add", ".")
            git(goc, "commit", "-qm", "chore: tạo bộ não")
        return {"ok": True}
    if (goc / ".git").exists():
        return {"ok": True}
    NAO_DIR.mkdir(exist_ok=True)
    r = subprocess.run(["git", "clone", "-q", "--depth", "50", "-b", n.get("nhanh", "main"), n["repo"], str(goc)],
                       capture_output=True, text=True, timeout=300, env=_env())
    if r.returncode:
        TRANG_THAI.setdefault(n["id"], {})["loi"] = _loi_de_hieu(r.stderr)
        return {"ok": False, "loi": TRANG_THAI[n["id"]]["loi"]}
    git(goc, "config", "user.name", "Classique OS")
    git(goc, "config", "user.email", "os@classique.local")
    return {"ok": True}


def dong_bo(n=None):
    n = n or lay()
    st = TRANG_THAI.setdefault(n["id"], {})
    with _lock:
        c = chuan_bi(n)
        if not c["ok"]:
            return c
        if n["kieu"] != "github":
            st.update(luc_dong_bo=time.time(), loi="")
            return {"ok": True}
        goc = thu_muc(n)
        rc, out = git(goc, "pull", "-q", "--rebase", "--autostash", "origin", n.get("nhanh", "main"), timeout=120)
        if rc:
            git(goc, "rebase", "--abort")
            st["loi"] = _loi_de_hieu(out)
            return {"ok": False, "loi": st["loi"]}
        rc, out = git(goc, "push", "-q", "origin", "HEAD:" + n.get("nhanh", "main"), timeout=120)
        if rc and "Everything up-to-date" not in out:
            st["loi"] = _loi_de_hieu(out)
            return {"ok": False, "loi": st["loi"]}
        st.update(luc_dong_bo=time.time(), loi="")
        return {"ok": True}


def _day_nen(n):
    threading.Thread(target=dong_bo, args=(n,), daemon=True).start()


# ---------------- đọc / ghi ----------------
def _duong(n, rel, ghi=False):
    rel = str(rel or "").strip().lstrip("/").replace("\\", "/")
    goc = thu_muc(n).resolve()
    p = (goc / rel).resolve()
    if p != goc and goc not in p.parents:
        raise ValueError("Đường dẫn ra ngoài bộ não")
    if ghi:
        if any(rel == c.rstrip("/") or rel.startswith(c) for c in CAM_GHI):
            raise ValueError(f"Không được ghi vào {rel.split('/')[0]} (vùng cấm ghi của bộ não)")
        if not rel.lower().endswith(DUOI_CHU):
            raise ValueError("Chỉ ghi tệp chữ (.md, .txt, .json, .csv, .yaml)")
    return p, rel


def doc(rel, n=None, gioi_han=20000):
    n = n or lay()
    p, rel = _duong(n, rel)
    if p.is_dir():
        return {"thu_muc": rel or "/", "ds": sorted((x.name + ("/" if x.is_dir() else "")) for x in p.iterdir() if not x.name.startswith("."))[:300]}
    if not p.exists():
        raise ValueError(f"Không có tệp {rel}")
    t = p.read_text(encoding="utf-8", errors="replace")
    return {"tep": rel, "noi_dung": t[:gioi_han], "cat_bot": len(t) > gioi_han}


def tim(cau, n=None, toi_da=30):
    n = n or lay()
    goc = thu_muc(n)
    tu = [w for w in re.split(r"\s+", (cau or "").strip().lower()) if w]
    if not tu:
        return []
    kq = []
    for p in goc.rglob("*.md"):
        rel = p.relative_to(goc).as_posix()
        if rel.startswith((".", "raw/")) or "/." in rel:
            continue
        try:
            t = p.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        thap = t.lower()
        ten = p.stem.lower()
        diem = sum(min(thap.count(w), 8) for w in tu) + 15 * sum(w in rel.lower() for w in tu) + (40 if " ".join(tu) in ten else 0)
        if rel in ("log.md", "index.md"):
            diem //= 4
        if diem and all(w in thap or w in rel.lower() for w in tu):
            i = min((thap.find(w) for w in tu if w in thap), default=0)
            kq.append({"tep": rel, "diem": diem, "doan": re.sub(r"\s+", " ", t[max(0, i - 120): i + 220])})
    return sorted(kq, key=lambda x: -x["diem"])[:toi_da]


def ghi(rel, noi_dung, thong_diep="", them_vao=False, n=None):
    n = n or lay()
    with _lock:
        c = chuan_bi(n)
        if not c["ok"]:
            raise ValueError(c["loi"])
        p, rel = _duong(n, rel, ghi=True)
        p.parent.mkdir(parents=True, exist_ok=True)
        if them_vao and p.exists():
            cu = p.read_text(encoding="utf-8", errors="replace")
            noi_dung = cu + ("" if cu.endswith("\n") else "\n") + noi_dung
        p.write_text(noi_dung if noi_dung.endswith("\n") else noi_dung + "\n", encoding="utf-8")
        goc = thu_muc(n)
        bi_loai = git(goc, "check-ignore", "-q", "--", rel)[0] == 0      # nằm trong .gitignore: không lên GitHub
        if not bi_loai:
            git(goc, "add", "--", rel)
            git(goc, "commit", "-qm", (thong_diep or f"os: ghi {rel}")[:200], "--", rel)
    if n["kieu"] == "github" and not bi_loai:
        _day_nen(n)
    r = {"ok": True, "tep": rel, "bo_nao": n["ten"], "len_github": n["kieu"] == "github" and not bi_loai}
    if bi_loai:
        r["canh_bao"] = f"{rel} nằm trong vùng .gitignore của bộ não: chỉ lưu trên VPS, KHÔNG lên GitHub, không về máy Mac."
    return r


# ---------------- trí nhớ (memory/MEMORY.md + memory/facts/) ----------------
def _slug(s):
    import unicodedata
    s = unicodedata.normalize("NFD", s.lower().replace("đ", "d"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60] or "nho"


def ds_nho(n=None):
    n = n or lay()
    f = thu_muc(n) / "memory" / "facts"
    out = []
    if f.exists():
        for p in sorted(f.glob("*.md"), key=lambda x: x.stat().st_mtime):
            t = p.read_text(encoding="utf-8", errors="replace")
            loai = (re.search(r"^type:\s*(\S+)", t, re.M) or [None, "khac"])[1]
            than = re.sub(r"^---.*?---\s*", "", t, flags=re.S).strip()
            out.append({"id": p.stem, "noi_dung": than, "loai": loai, "luc": p.stat().st_mtime})
    return out


def _viet_lai_muc_luc(n):
    dong = ["# Trí nhớ", "", "Mỗi dòng một điều trợ lý nhớ lâu dài. Chi tiết ở memory/facts/.", ""]
    dong += [f"- [{x['noi_dung'].splitlines()[0][:90]}](facts/{x['id']}.md) ({x['loai']})" for x in ds_nho(n)]
    ghi("memory/MEMORY.md", "\n".join(dong), "os: cập nhật mục lục trí nhớ", n=n)


def them_nho(noi_dung, loai="khac", n=None):
    n = n or lay()
    nd = noi_dung.strip()
    if any(x["noi_dung"].strip().lower() == nd.lower() for x in ds_nho(n)):
        return {"ok": True, "trung": True}
    hom_nay = date.today().isoformat()
    sid = f"{_slug(nd)[:40]}-{int(time.time()) % 100000}"
    ghi(f"memory/facts/{sid}.md", f"---\ntype: {loai}\ncreated: {hom_nay}\nupdated: {hom_nay}\nsource: classique-os\n---\n{nd}",
        f"learn: nhớ {nd[:60]}", n=n)
    _viet_lai_muc_luc(n)
    return {"ok": True, "id": sid, "bo_nao": n["ten"]}


def xoa_nho(nid, n=None):
    """Quên một điều nhớ: gỡ tệp bằng git rm (vẫn còn trong lịch sử git, khôi phục được)."""
    n = n or lay()
    if not re.fullmatch(r"[a-z0-9-]+", nid or ""):
        return {"ok": False}
    rel = f"memory/facts/{nid}.md"
    p, rel = _duong(n, rel, ghi=True)
    if not p.exists():
        return {"ok": False}
    with _lock:
        git(thu_muc(n), "rm", "-q", "--", rel)
        git(thu_muc(n), "commit", "-qm", f"learn: quên {nid}", "--", rel)
    _viet_lai_muc_luc(n)
    return {"ok": True}


def phan_prompt(n=None):
    """Đoạn đưa vào lời dặn: bộ não đang dùng + trí nhớ + đầu mục lục."""
    n = n or lay()
    goc = thu_muc(n)
    s = f"\n\nBỘ NÃO ĐANG DÙNG: {n['ten']} ({'GitHub ' + n.get('repo', '') if n['kieu'] == 'github' else 'thư mục trên VPS'})."
    s += ("\nĐọc/tìm/ghi bằng công cụ nao__*. Câu hỏi về công ty, sản phẩm, quy trình, giọng văn, chính sách: tìm trong bộ não TRƯỚC "
          "rồi mới trả lời. Ghi trang wiki/ghi chú thì theo đúng sổ tay CLAUDE.md của bộ não (đọc bằng nao__doc nếu chưa đọc). "
          "Không ghi vào raw/. Điều cần nhớ lâu dài thì dùng nho__ghi. Nếu em có shell riêng (ChatGPT/Codex): thư mục làm việc "
          "hiện tại CHÍNH LÀ bộ não, tìm bằng rg trong đó cũng được; muốn GHI thì phải qua nao__ghi.")
    if n["kieu"] == "github":
        s += (" Bộ não này là BẢN GITHUB (CHỈ CHỮ): raw/ và output/ bị .gitignore loại khỏi GitHub, ghi vào đó thì kẹt trên VPS, "
              "không về máy Mac của anh. Kết quả cần giữ thì ghi vào thư mục có lên GitHub (wiki/..., van-hanh/..., boc-am/...). "
              "nao__ghi trả canh_bao nếu tệp không lên GitHub: khi đó báo anh.")
    nho = ds_nho(n)
    if nho:
        s += "\n\nNHỮNG ĐIỀU EM ĐÃ GHI NHỚ VỀ ANH VÀ CÔNG TY (dùng tự nhiên, không đọc lại nguyên văn):\n" + \
            "\n".join(f"- {x['noi_dung'][:300]}" for x in nho[-80:])
    ml = goc / "index.md"
    if ml.exists():
        s += "\n\nĐẦU MỤC LỤC BỘ NÃO (index.md, đọc đủ bằng nao__doc):\n" + ml.read_text(encoding="utf-8", errors="replace")[:2500]
    return s


def thong_tin(n):
    goc = thu_muc(n)
    st = TRANG_THAI.get(n["id"], {})
    d = {**n, "co_san": (goc / ".git").exists() or (goc / "memory").exists(), "loi": st.get("loi", ""),
         "luc_dong_bo": st.get("luc_dong_bo"), "so_nho": len(ds_nho(n)) if goc.exists() else 0}
    if n["kieu"] == "github":
        ten_repo = n.get("repo", "").replace("git@github.com:", "").removesuffix(".git")
        d["noi_luu"] = [{"nhan": "Bản GitHub (chỉ chữ)", "gia_tri": "github.com/" + ten_repo, "link": "https://github.com/" + ten_repo,
                         "ghi": "chỉ có chữ: không có raw/, output/, ảnh, PDF, video (bị loại trong .gitignore)"},
                        {"nhan": "Bản OS dùng (VPS)", "gia_tri": str(goc), "ghi": "bản sao của bản GitHub; OS đọc và ghi ở đây, ghi xong tự đẩy lên GitHub"}]
        if n.get("mac"):
            d["noi_luu"].append({"nhan": "Bản gốc (máy Mac)", "gia_tri": n["mac"],
                                 "ghi": "đầy đủ nhất, có cả raw/, output/, ảnh. Kéo về (git pull) để nhận những gì OS ghi"})
    else:
        d["noi_luu"] = [{"nhan": "Nằm ở (VPS)", "gia_tri": str(goc)}, {"nhan": "GitHub / máy Mac", "gia_tri": "Không có"}]
    if (goc / ".git").exists():
        rc, out = git(goc, "log", "-8", "--format=%h\t%ar\t%an\t%s")
        d["lich_su"] = [dict(zip(("ma", "luc", "ai", "noi_dung"), l.split("\t", 3))) for l in out.splitlines() if l.count("\t") >= 3]
        d["so_tep"] = sum(1 for p in goc.rglob("*.md") if ".git" not in p.parts)
    return d


def hoan_tac(n, ma):
    """Hoàn tác MỘT commit của OS (git revert), chỉ commit do Classique OS tạo."""
    goc = thu_muc(n)
    rc, ai = git(goc, "log", "-1", "--format=%an", ma)
    if rc or ai.strip() != "Classique OS":
        raise ValueError("Chỉ hoàn tác được thay đổi do Classique OS ghi")
    with _lock:
        rc, out = git(goc, "revert", "--no-edit", ma)
        if rc:
            git(goc, "revert", "--abort")
            raise ValueError("Không hoàn tác được: " + out[-200:])
    if n["kieu"] == "github":
        _day_nen(n)
    return {"ok": True}


def khoa_cong_khai():
    p = KHOA_SSH.with_suffix(".pub")
    return p.read_text().strip() if p.exists() else ""


# ---------------- sơ đồ liên kết (như Graph view của Obsidian) ----------------
NHOM_TEN = {"wiki/entities": "Thực thể", "wiki/concepts": "Khái niệm", "wiki/sources": "Nguồn", "wiki/analyses": "Phân tích",
            "wiki": "Wiki", "memory": "Trí nhớ", "output": "Kết quả", "van-hanh": "Vận hành", "raw": "Nguồn thô", "": "Gốc"}
_do_thi = {}
_LINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")


def _nhom(rel):
    phan = rel.split("/")
    k2 = "/".join(phan[:2]) if len(phan) > 2 else ""
    if k2 in NHOM_TEN:
        return NHOM_TEN[k2]
    k1 = phan[0] if len(phan) > 1 else ""
    return NHOM_TEN.get(k1, k1)


def do_thi(n=None):
    """Mỗi tệp .md là một nút, mỗi [[liên kết]] trỏ tới tệp có thật là một cạnh. Thư mục ẩn (.claude, .agents...) bỏ qua."""
    n = n or lay()
    goc = thu_muc(n)
    if not goc.exists():
        return {"nut": [], "canh": [], "bo_nao": n["ten"]}
    c = _do_thi.get(n["id"])
    if c and time.time() - c[0] < 120:
        return c[1]
    tep = {}
    for p in goc.rglob("*.md"):
        rel = p.relative_to(goc).as_posix()
        if any(x.startswith(".") for x in rel.split("/")):
            continue
        tep[rel] = p
    theo_ten, theo_duong = {}, {}
    for rel in tep:
        khong_duoi = rel[:-3]
        theo_duong[khong_duoi.lower()] = rel
        theo_ten.setdefault(khong_duoi.rsplit("/", 1)[-1].lower(), rel)
    canh, bac = set(), {}
    for rel, p in tep.items():
        try:
            t = p.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for m in _LINK.finditer(t):
            dich = m.group(1).strip().removesuffix(".md").lower()
            toi = theo_duong.get(dich) or theo_ten.get(dich.rsplit("/", 1)[-1])
            if toi and toi != rel and (rel, toi) not in canh and (toi, rel) not in canh:
                canh.add((rel, toi))
                bac[rel] = bac.get(rel, 0) + 1
                bac[toi] = bac.get(toi, 0) + 1
    nut = [{"id": rel, "ten": rel[:-3].rsplit("/", 1)[-1], "phan_he": _nhom(rel), "so_dong": 4 + 3 * bac.get(rel, 0),
            "phu": f"{rel} · {bac.get(rel, 0)} liên kết"} for rel in tep]
    v = {"nut": nut, "canh": [{"tu": a, "toi": b} for a, b in canh], "bo_nao": n["ten"]}
    _do_thi[n["id"]] = (time.time(), v)
    return v
