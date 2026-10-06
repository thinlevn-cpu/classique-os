#!/usr/bin/env node
// 21-zalo-login-qr.mjs — GIỮ MÃ QR LUÔN SỐNG để đăng nhập lại Zalo.
//
// Vì sao cần (đo 04/09/2026): `zalo-agent login` chỉ sinh MỘT mã QR, hết hạn sau
// khoảng 2 phút là in "QR expired!" rồi THOÁT (mã 1). Nếu bạn không ngồi sẵn
// bên máy đúng lúc đó thì lỡ nhịp, phải gọi lại lệnh từ đầu. Thêm nữa: trang QR
// của CLI chỉ tự làm mới khi CHƯA có ảnh — có ảnh rồi là đứng im, nên tab đang mở
// vẫn hiện mã CŨ đã chết.
//
// Script này lo cả hai:
//   · chạy lại `zalo-agent login` mỗi khi QR hết hạn, cho tới khi quét được (hoặc hết giờ)
//   · mở TRANG RIÊNG ở cổng cố định, tự làm mới 3s/lần → anh mở một tab rồi để đó
//
// Dùng:  node 21-zalo-login-qr.mjs [--port 18930] [--phut 20]
// Xong:  script tự dừng, in "✔ ĐĂNG NHẬP XONG".

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { kiemPhien } from "./_zalo.mjs";

const args = process.argv.slice(2);
const doc = (c, mac) => { const i = args.indexOf(c); return i >= 0 && args[i + 1] ? args[i + 1] : mac; };
const PORT = Number(doc("--port", 18930));
const HAN_MS = Number(doc("--phut", 20)) * 60 * 1000;

const QR_PATH = path.join(os.homedir(), ".zalo-agent-cli", "qr.png");
const CLI_JS = path.join(process.env.APPDATA || "", "npm", "node_modules", "zalo-agent-cli", "src", "index.js");

let trangThai = "Đang sinh mã QR…";
let luot = 0;
let xong = false;

// ── Trang QR: tự làm mới, luôn đọc lại ảnh mới nhất trên đĩa ────────────────
const server = http.createServer((req, res) => {
  if (req.url.startsWith("/anh")) {
    try {
      const img = fs.readFileSync(QR_PATH);
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
      return res.end(img);
    } catch { res.writeHead(404); return res.end(); }
  }
  let tuoi = "";
  try { tuoi = Math.round((Date.now() - fs.statSync(QR_PATH).mtimeMs) / 1000) + " giây trước"; } catch {}
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(`<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="3">
<title>Đăng nhập Zalo — quét mã</title>
<style>
 body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#0d1424;color:#e8eefc;font-family:system-ui,Segoe UI,sans-serif}
 .the{background:#141d33;border:1px solid #24324f;border-radius:18px;padding:28px;text-align:center;max-width:420px}
 h1{font-size:19px;margin:0 0 4px} .phu{color:#8fa3c8;font-size:13px;margin:0 0 18px}
 img{width:280px;height:280px;background:#fff;border-radius:12px;padding:10px}
 .tt{margin-top:16px;font-size:14px;color:#9fd0a0} .nho{margin-top:6px;font-size:12px;color:#6f83a6}
 ${xong ? ".the{border-color:#2f7d4f}" : ""}
</style></head><body><div class="the">
<h1>${xong ? "✅ Đã đăng nhập xong" : "Quét mã bằng Zalo trên điện thoại"}</h1>
<p class="phu">${xong ? "Có thể đóng tab này." : "Zalo → biểu tượng quét QR cạnh ô tìm kiếm"}</p>
${xong ? "" : `<img src="/anh?t=${Date.now()}" alt="QR">`}
<div class="tt">${trangThai}</div>
<div class="nho">Mã hiện tại sinh ${tuoi} · lượt ${luot} · trang tự làm mới 3s</div>
</div></body></html>`);
});
server.listen(PORT, () => {
  console.log(`\n  ➜ MỞ TRANG NÀY ĐỂ QUÉT:  http://localhost:${PORT}`);
  console.log(`    (trang tự làm mới, QR hết hạn sẽ tự thay mã mới)\n`);
});

// ── Vòng lặp: chạy lại `login` mỗi khi QR hết hạn ───────────────────────────
function motLuot() {
  return new Promise((resolve) => {
    luot++;
    trangThai = `Mã QR đang sống — quét đi anh (lượt ${luot})`;
    // Mac/Linux: bin `zalo-agent` nằm sẵn trên PATH; CLI_JS (APPDATA) chỉ có trên Windows.
    const p = process.platform === "win32"
      ? spawn(process.execPath, [CLI_JS, "login"], { stdio: ["ignore", "pipe", "pipe"] })
      : spawn("zalo-agent", ["login"], { stdio: ["ignore", "pipe", "pipe"] });
    let het = false;
    const doc = (b) => {
      const s = String(b);
      if (/QR expired/i.test(s)) { het = true; trangThai = "Mã cũ hết hạn — đang sinh mã mới…"; }
      if (/Logged in as|Login successful|Đăng nhập thành công/i.test(s)) trangThai = "Đăng nhập thành công!";
    };
    p.stdout.on("data", doc);
    p.stderr.on("data", doc);
    p.on("close", (code) => resolve({ code, het }));
  });
}

(async () => {
  const batDau = Date.now();
  while (Date.now() - batDau < HAN_MS) {
    const r = await motLuot();
    if (kiemPhien().ok) {
      xong = true; trangThai = "Phiên Zalo đã sống lại.";
      console.log("\n✔ ĐĂNG NHẬP XONG — phiên Zalo đã sống lại.");
      setTimeout(() => { server.close(); process.exit(0); }, 4000);
      return;
    }
    if (!r.het) {
      console.log(`\n✖ Lượt ${luot} hỏng (mã thoát ${r.code}) mà không phải do QR hết hạn — dừng để xem lại bằng tay.`);
      trangThai = "Có lỗi lạ — xem cửa sổ lệnh.";
      setTimeout(() => { server.close(); process.exit(1); }, 4000);
      return;
    }
  }
  console.log(`\n⏳ Hết ${HAN_MS / 60000} phút mà chưa ai quét — dừng. Chạy lại khi anh sẵn sàng.`);
  trangThai = "Hết giờ chờ.";
  server.close(); process.exit(3);
})();
