#!/usr/bin/env node
// ve-canvas.mjs — Vẽ Business Model Canvas 9 ô (layout Osterwalder kinh điển) ra HTML + PNG.
// Đọc 1 record từ bảng "Mô hình kinh doanh (BMC)" trong Base.
//
// Dùng:
//   node ve-canvas.mjs --base-token <t> --name "<Tên mô hình>" --out <dir>
//   node ve-canvas.mjs --base-token <t> --record-id <rec...> --out <dir>
// PATH: export PATH="$PATH:/c/Program Files/nodejs:<npm-global>"

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const RUN = "@larksuite/cli/scripts/run.js";
const PS1 = "<thư-mục-bộ-não>/.claude/skills/hmh-mkt-infographic-html/scripts/render-png.ps1";
const args = process.argv.slice(2);
const getA = (k) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : undefined; };
const BASE = getA("--base-token"), NAME = getA("--name"), RID = getA("--record-id");
const OUT = getA("--out") || ".";
if (!BASE || (!NAME && !RID)) { console.error("Cần --base-token và (--name hoặc --record-id)"); process.exit(1); }

function lark(a) {
  let out; try { out = execFileSync("node", [RUN, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const st = out.indexOf("{"); let dp = 0, en = -1, q = false, esc = false;
  for (let i = st; i < out.length; i++) { const c = out[i];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') q = false; }
    else if (c === '"') q = true; else if (c === "{") dp++; else if (c === "}") { dp--; if (!dp) { en = i; break; } } }
  const j = JSON.parse(out.slice(st, en + 1));
  if (j.ok === false) throw new Error(JSON.stringify(j.error));
  return j;
}
const tableId = (n) => (lark(["base", "+table-list", "--base-token", BASE, "--format", "json"]).data.tables || [])
  .filter((t) => t.name === n).pop()?.id;

const tBMC = tableId("Mô hình kinh doanh (BMC)");
if (!tBMC) throw new Error("Chưa có bảng BMC — chạy tao-bang-bmc.mjs trước.");
const fl = lark(["base", "+field-list", "--base-token", BASE, "--table-id", tBMC, "--format", "json"]);
const id2name = Object.fromEntries((fl.data.fields || fl.data.items || []).map((f) => [f.id || f.field_id, f.name]));
const rl = lark(["base", "+record-list", "--base-token", BASE, "--table-id", tBMC, "--format", "json"]);
const ids = rl.data.field_id_list;
const col = (name) => ids.findIndex((id) => id2name[id] === name);
const rows = rl.data.data, rids = rl.data.record_id_list;
let ri = RID ? rids.indexOf(RID) : rows.findIndex((r) => String(r[col("Tên mô hình")] || "").trim() === NAME.trim());
if (ri < 0) ri = rows.findIndex((r) => String(r[col("Tên mô hình")] || "").includes(NAME || ""));
if (ri < 0) throw new Error("Không tìm thấy record BMC khớp.");
const row = rows[ri];
const V = (name) => { const c = col(name); let v = c >= 0 ? row[c] : ""; if (Array.isArray(v)) v = v.map((x) => x.text || x.name || "").join(", "); return String(v ?? "").trim(); };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const body = (s) => { s = esc(s); const lines = s.split(/\r?\n|•|·| - /).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return '<span class="empty">— chưa điền —</span>';
  return "<ul>" + lines.map((l) => `<li>${l}</li>`).join("") + "</ul>"; };

const tenMH = V("Tên mô hình") || "Mô hình kinh doanh";
const block = (icon, title, field, cls) => `<div class="box ${cls}"><div class="bt">${icon} <span>${title}</span></div><div class="bc">${body(V(field))}</div></div>`;

const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif}
body{width:1600px;background:#f4f6f8;padding:34px 38px}
.head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px}
.head h1{font-size:30px;color:#1f2d3d}.head .sub{color:#7b8794;font-size:15px}
.canvas{display:grid;gap:10px;grid-template-columns:repeat(5,1fr);
 grid-template-rows:230px 230px 150px;
 grid-template-areas:"kp ka vp cr cs" "kp kr vp ch cs" "cost cost cost rev rev";}
.box{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;overflow:hidden;display:flex;flex-direction:column}
.box .bt{font-size:14px;font-weight:700;color:#334155;display:flex;align-items:center;gap:6px;margin-bottom:8px;line-height:1.15}
.box .bt span{font-size:14px}
.box .bc{font-size:12.5px;color:#475569;line-height:1.45;overflow:auto}
.box ul{padding-left:15px}.box li{margin-bottom:3px}
.empty{color:#cbd5e1;font-style:italic}
.kp{grid-area:kp;background:#eef2ff}.ka{grid-area:ka;background:#eef2ff}.kr{grid-area:kr;background:#eef2ff}
.vp{grid-area:vp;background:#fff7ed;border-color:#fdba74}
.cr{grid-area:cr;background:#fef2f2}.ch{grid-area:ch;background:#fef2f2}.cs{grid-area:cs;background:#fef2f2}
.cost{grid-area:cost;background:#fdf4ff}.rev{grid-area:rev;background:#f0fdf4}
.vp .bt{color:#c2410c}
.foot{margin-top:14px;color:#94a3b8;font-size:12px;display:flex;justify-content:space-between}
.tag{display:inline-block;padding:2px 9px;border-radius:20px;background:#1f2d3d;color:#fff;font-size:12px}
</style></head><body>
<div class="head"><h1>🧭 Business Model Canvas — ${esc(tenMH)}</h1>
<div class="sub">Ngày lập: ${esc(V("Ngày lập") || "—")} · Kiểm chứng: <span class="tag">${esc(V("Trạng thái kiểm chứng") || "Chưa")}</span></div></div>
<div class="canvas">
${block("🤝", "8. Đối tác chính", "8. Đối tác chính", "kp")}
${block("⚙️", "7. Hoạt động chính", "7. Hoạt động chính", "ka")}
${block("🎁", "2. Giá trị mang lại", "2. Giá trị mang lại", "vp")}
${block("❤️", "4. Quan hệ khách hàng", "4. Quan hệ khách hàng", "cr")}
${block("👥", "1. Phân khúc khách hàng", "1. Phân khúc khách hàng", "cs")}
${block("🏗️", "6. Nguồn lực chính", "6. Nguồn lực chính", "kr")}
${block("📣", "3. Kênh tiếp cận", "3. Kênh tiếp cận", "ch")}
${block("💸", "9. Cơ cấu chi phí", "9. Cơ cấu chi phí", "cost")}
${block("💰", "5. Dòng doanh thu", "5. Dòng doanh thu", "rev")}
</div>
<div class="foot"><span>🎯 Giả định rủi ro nhất: ${esc(V("🎯 Giả định rủi ro nhất") || "—")}</span><span>Business Model Canvas · Osterwalder &amp; Pigneur</span></div>
</body></html>`;

mkdirSync(OUT, { recursive: true });
const safe = tenMH.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().replace(/^-|-$/g, "") || "canvas";
const htmlPath = join(OUT, `bmc-${safe}.html`);
const pngPath = join(OUT, `bmc-${safe}.png`);
writeFileSync(htmlPath, html, "utf8");
console.log("HTML:", htmlPath);
try {
  const o = execFileSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", PS1, "-Html", htmlPath, "-Out", pngPath, "-Width", "1600", "-Height", "1000", "-Scale", "2"], { encoding: "utf8" });
  console.log(o.trim());
} catch (e) { console.error("Render PNG lỗi:", e.message); console.log("(vẫn có file HTML để mở thủ công)"); }
