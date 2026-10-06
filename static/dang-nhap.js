document.querySelectorAll(".card input:not([type=checkbox])").forEach(i => i.placeholder = i.previousElementSibling.textContent);
document.getElementById("f").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target), b = e.target.querySelector("button"), loi = document.getElementById("loi");
  b.disabled = true; loi.textContent = "";
  try {
    const r = await fetch("/api/dang-nhap", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tai_khoan: f.get("tai_khoan"), mat_khau: f.get("mat_khau"), nho: f.get("nho") === "on" }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.detail || "Không đăng nhập được");
    location.href = "/";
  } catch (err) { loi.textContent = err.message; b.disabled = false; }
};
