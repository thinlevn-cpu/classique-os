// build-pdf.mjs — Ebook Markdown -> HTML -> PDF (Chrome headless) cho pipeline hmh-mkt-ebook-sach-lat.
// Dùng: node build-pdf.mjs <duong-dan.md> [out.pdf]
//
// Đọc CẤU HÌNH bìa từ frontmatter YAML của file .md (đều có default):
//   book_title:     Tiêu đề lớn trên bìa (cho phép "|" để xuống dòng; có thể bọc 1 cụm bằng "1 TRANG" để tô vàng)
//   book_subtitle:  Phụ đề dưới tiêu đề
//   book_author:    Tên tác giả
//   book_ribbon:    Dòng chữ nhỏ phía trên tiêu đề (vd "EBOOK PHÁT TRIỂN BẢN THÂN")
//   brand_word1:    Nửa đầu wordmark logo (mặc định MENTOR)
//   brand_word2:    Nửa sau wordmark logo (mặc định CAMP)
//   brand_tagline:  Tagline dưới logo (mặc định PHÁT TRIỂN CON NGƯỜI · PHÁT TRIỂN KINH DOANH)
//
// QUY ƯỚC NỘI DUNG:
//   - "# PHẦN ..."  -> trang phân Phần riêng có logo.
//   - Blockquote CHỨA URL (http...) -> render thành BOX CTA đỏ-vàng + nút link bấm được (seed kêu gọi hành động).
//   - "<div ...page-break...>" -> ngắt trang thủ công.
//
// GOTCHA (máy này): path "<thư-mục-bộ-não>/" có dấu cách + tiếng Việt -> Chrome ra PDF trắng.
//   => luôn render trong %TEMP% (ASCII) rồi copy về. Font tiêu đề dùng Cambria cho dấu tiếng Việt chuẩn.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { execFileSync } from "node:child_process";

const SRC = process.argv[2] || fs.readdirSync(".").find(f => f.endsWith(".md") && !/^wiki-/.test(f));
if (!SRC || !fs.existsSync(SRC)) { console.error("Không thấy file .md nguồn. Dùng: node build-pdf.mjs <file.md> [out.pdf]"); process.exit(1); }
const raw = fs.readFileSync(SRC, "utf8");

/* ---------- đọc frontmatter ---------- */
function frontmatter(t) {
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/); const o = {};
  if (m) for (const ln of m[1].split(/\r?\n/)) { const mm = ln.match(/^([a-z0-9_]+):\s*(.*)$/i); if (mm) o[mm[1]] = mm[2].replace(/^["']|["']$/g, ""); }
  return o;
}
const fm = frontmatter(raw);
const CFG = {
  title:    fm.book_title    || "EBOOK",
  subtitle: fm.book_subtitle || "",
  author:   fm.book_author   || fm.author || "Hoàng Minh Hóa",
  ribbon:   fm.book_ribbon   || "E B O O K",
  w1:       fm.brand_word1   || "MENTOR",
  w2:       fm.brand_word2   || "CAMP",
  tagline:  fm.brand_tagline || "PHÁT TRIỂN CON NGƯỜI · PHÁT TRIỂN KINH DOANH",
};
const OUT = process.argv[3] || (SRC.replace(/\.md$/, "") + ".pdf");

/* ---------- LOGO Mentorcamp (ảnh thật, nhúng base64) ----------
   white = bản trắng (nền tối: bìa, trang cuối) · dark = bản đen (nền sáng: trang phân Phần).
   Đặt 2 file trong  ../assets/  : logo-mentorcamp-white.png · logo-mentorcamp-dark.png  */
const ASSETS = path.join(import.meta.dirname, "..", "assets");
const logoData = v => { const f = path.join(ASSETS, v === "dark" ? "logo-mentorcamp-dark.png" : "logo-mentorcamp-white.png"); return fs.existsSync(f) ? "data:image/png;base64," + fs.readFileSync(f).toString("base64") : ""; };
const LOGO_WHITE = logoData("white"), LOGO_DARK = logoData("dark");
const logo = (sz, variant = "white") => { const src = variant === "dark" ? LOGO_DARK : LOGO_WHITE; return `<div class="logo ${sz}">${src ? `<img class="logo-img" src="${src}" alt="Mentorcamp">` : ""}${CFG.tagline ? `<div class="wmsub">${CFG.tagline}</div>` : ""}</div>`; };

/* ---------- Markdown -> HTML ---------- */
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function inline(s) {
  s = esc(s);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
  s = s.replace(/\[\[([^\]]+)\]\]/g, "$1");
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/(^|[\s(])((https?:\/\/)[^\s<)"']+)/g, '$1<a href="$2">$2</a>');
  return s;
}
function stripFM(t) { return t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""); }
function mdToHtml(md) {
  let body = stripFM(md);
  const cut = body.search(/^##\s+M[ỤU]C L[ỤU]C/m);            // bỏ tiêu đề/ghi chú trước MỤC LỤC nếu có
  if (cut > 0) body = body.slice(cut);
  const lines = body.split(/\r?\n/); let html = "", i = 0, para = "";
  const flush = b => { if (b.trim()) html += `<p>${inline(b.trim())}</p>\n`; return ""; };
  while (i < lines.length) {
    let ln = lines[i];
    if (/^\s*<div[^>]*page-break/i.test(ln)) { para = flush(para); html += `<div class="pb"></div>\n`; i++; continue; }
    if (/^\s*<\/?div/i.test(ln)) { i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(ln) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")) {
      para = flush(para);
      const head = ln.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()); i += 2; let rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim())); i++; }
      html += "<table><thead><tr>" + head.map(c => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>";
      for (const r of rows) html += "<tr>" + r.map(c => `<td>${inline(c)}</td>`).join("") + "</tr>";
      html += "</tbody></table>\n"; continue;
    }
    let m;
    if ((m = ln.match(/^(#{1,4})\s+(.*)$/))) {
      para = flush(para); const lv = m[1].length, txt = m[2].trim();
      if (lv === 1 && /^PH[ẦA]N/i.test(txt)) html += `<div class="partdiv">${logo("mid", "dark")}<div class="parttitle">${inline(txt)}</div></div>\n`;
      else html += `<h${lv}>${inline(txt)}</h${lv}>\n`;
      i++; continue;
    }
    if (/^---\s*$/.test(ln)) { para = flush(para); html += "<hr>\n"; i++; continue; }
    if (/^>\s?/.test(ln)) {
      para = flush(para); let q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
      const inner = q.map(x => inline(x)).join("<br>");
      html += /https?:\/\//.test(q.join(" ")) ? `<div class="cta">${inner}</div>\n` : `<blockquote>${inner}</blockquote>\n`;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(ln)) {
      para = flush(para); const ordered = /^\s*\d+\.\s+/.test(ln); const tag = ordered ? "ol" : "ul"; html += `<${tag}>`;
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) { html += `<li>${inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>`; i++; }
      html += `</${tag}>\n`; continue;
    }
    if (/^\s*$/.test(ln)) { para = flush(para); i++; continue; }
    para += (para ? " " : "") + ln; i++;
  }
  flush(para); return html;
}

/* ---------- CSS ---------- */
const css = `
@page{size:A4;margin:20mm 17mm}*{box-sizing:border-box}
body{font:11.5pt/1.6 "Segoe UI","Palatino Linotype",Georgia,serif;color:#2a2118;margin:0}
h1{font-size:19pt;color:#7a1f1f;margin:18pt 0 8pt;text-align:center;letter-spacing:.5px}
h2{font-size:15pt;color:#8a4b12;margin:16pt 0 6pt;border-left:5px solid #c9a24b;padding-left:9pt}
h3{font-size:12.5pt;color:#7a1f1f;margin:13pt 0 4pt}
h4{font-size:11.5pt;color:#2a2118;margin:9pt 0 3pt;font-style:italic}
p{margin:5pt 0;text-align:justify}ul,ol{margin:5pt 0;padding-left:20pt}li{margin:2.5pt 0}
strong{color:#5c1414}em{color:#555}
code{background:#f3ecdd;padding:1px 4px;border-radius:3px;font-family:Consolas,monospace;font-size:9.5pt;color:#5c1414}
blockquote{margin:9pt 0;padding:9pt 14pt;background:#fbf4e6;border-left:4px solid #c9a24b;color:#3a2f20;font-size:12pt;page-break-inside:avoid}
blockquote strong{color:#7a1f1f}
hr{border:none;border-top:1px solid #e0d4ba;margin:11pt 0}
table{border-collapse:collapse;width:100%;margin:8pt 0;font-size:10pt;page-break-inside:avoid}
th,td{border:1px solid #d8c79c;padding:5pt 7pt;text-align:left;vertical-align:top}
th{background:#5c1414;color:#f3e3bd}tr:nth-child(even) td{background:#fbf4e6}
h2,h3{page-break-after:avoid}.pb{page-break-after:always}
.cta{margin:13pt 0;padding:13pt 18pt;background:linear-gradient(135deg,#5c1414,#7a1f1f);color:#f3e3bd;border:1.5px solid #c9a24b;border-radius:9px;page-break-inside:avoid;text-align:center;font-size:11pt;line-height:1.55}
.cta strong{color:#e8c877;letter-spacing:.6px;font-size:11.5pt}.cta em{color:#f6e9c6}
.cta a{display:inline-block;margin-top:3pt;color:#1f1108;background:#e8c877;padding:4pt 14pt;border-radius:20px;font-weight:700;text-decoration:none;word-break:break-all}
.logo{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px}
.logo-img{display:block;height:auto}.logo.big .logo-img{width:300px}.logo.mid .logo-img{width:185px}
.wmsub{font-size:7.5pt;letter-spacing:2.5px;color:#8a6a2f;font-family:"Segoe UI",sans-serif}.logo.mid .wmsub{font-size:6.5pt}
.cover{height:257mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(circle at 50% 32%,#3a241a,#241710 70%);color:#f3e3bd;page-break-after:always;margin:-20mm -17mm 0;padding:0 24mm}
.cover .ribbon{font-size:11pt;letter-spacing:6px;color:#c9a24b;margin-top:6mm}
.cover .title{font-family:Cambria,"Times New Roman",serif;font-size:40pt;font-weight:700;line-height:1.08;margin:8mm 0 0;color:#f6e9c6;text-shadow:0 2px 12px rgba(0,0,0,.5)}
.cover .title .one{color:#e8c877}
.cover .sub{font-size:14pt;color:#d8c79c;margin-top:7mm;font-style:italic;letter-spacing:1px}
.cover .rule{width:70mm;height:2px;background:linear-gradient(90deg,transparent,#c9a24b,transparent);margin:11mm 0}
.cover .author{font-size:16pt;color:#f3e3bd;letter-spacing:3px}.cover .author small{display:block;font-size:9pt;letter-spacing:4px;color:#c9a24b;margin-top:3mm}
.cover .logo .wmsub{color:#c9a24b}
.partdiv{page-break-before:always;page-break-after:always;height:240mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18mm}
.parttitle{font-family:Cambria,"Times New Roman",serif;font-size:30pt;font-weight:700;color:#7a1f1f;line-height:1.15;border-top:2px solid #c9a24b;border-bottom:2px solid #c9a24b;padding:7mm 0;letter-spacing:1px}
.endmark{margin-top:18mm;text-align:center}
`;

/* ---------- bìa + kết ---------- */
const titleHtml = esc(CFG.title).replace(/\|/g, "<br>").replace(/\[(.+?)\]/g, '<span class="one">$1</span>');
const cover = `<div class="cover">${logo("big")}
<div class="ribbon">${esc(CFG.ribbon)}</div>
<div class="title">${titleHtml}</div>
${CFG.subtitle ? `<div class="sub">${esc(CFG.subtitle)}</div>` : ""}
<div class="rule"></div>
<div class="author">${esc(CFG.author)}<small>TÁC GIẢ</small></div></div>`;
const ending = `<hr><div class="endmark">${logo("mid", "dark")}${CFG.subtitle ? `<p style="text-align:center;color:#8a6a2f;font-style:italic;margin-top:6mm">${esc(CFG.subtitle)}</p>` : ""}</div>`;

const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>${css}</style></head><body>${cover}${mdToHtml(raw)}${ending}</body></html>`;
const htmlPath = SRC.replace(/\.md$/, "") + ".html";
fs.writeFileSync(htmlPath, html);
console.log("OK -> " + htmlPath + " (" + (html.length / 1024).toFixed(0) + " KB)");

/* ---------- render PDF qua TEMP (retry nếu file đích bị khoá) ---------- */
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(p => fs.existsSync(p));
if (!CHROME) throw new Error("Không tìm thấy Chrome/Edge");
const W = fs.mkdtempSync(path.join(os.tmpdir(), "hmhpdf-"));
fs.writeFileSync(path.join(W, "r.html"), html);
execFileSync(CHROME, ["--headless","--disable-gpu","--no-sandbox",`--user-data-dir=${path.join(W,"p")}`,"--no-pdf-header-footer",`--print-to-pdf=${path.join(W,"out.pdf")}`,"file:///"+path.join(W,"r.html").replace(/\\/g,"/")], { stdio: "ignore" });
let dest = OUT;
for (let k = 0; ; k++) {
  try { fs.copyFileSync(path.join(W, "out.pdf"), dest); break; }
  catch (e) { if (k >= 4) { dest = OUT.replace(/\.pdf$/, "-CTA.pdf"); fs.copyFileSync(path.join(W, "out.pdf"), dest); break; } execFileSync("cmd", ["/c", "ping", "127.0.0.1", "-n", "2", ">nul"], { stdio: "ignore" }); }
}
fs.rmSync(W, { recursive: true, force: true });
const pages = (fs.readFileSync(dest).toString("latin1").match(/\/MediaBox/g) || []).length;
console.log("OK -> " + dest + " (" + pages + " trang, " + (fs.statSync(dest).size / 1024).toFixed(0) + " KB)");
