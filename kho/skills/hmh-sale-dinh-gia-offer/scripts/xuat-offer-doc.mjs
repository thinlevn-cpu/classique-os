#!/usr/bin/env node
// xuat-offer-doc.mjs — Tự sinh TÀI LIỆU OFFER trình bày đẹp NGAY TRONG Base (mục "Tài liệu").
// Luồng: input.json -> engine dinhGia() -> renderDoc() (markdown trình bày) ->
//        base-block-create docx trong Base -> docs update append markdown -> (link vào record Offer).
//
// Dùng:
//   node xuat-offer-doc.mjs <input.json> --base-token <t> [--name "<tên doc>"] [--link-record <recId>] [--out <dir>]
//   node xuat-offer-doc.mjs <input.json> --md-only            # chỉ in markdown trình bày, KHÔNG tạo doc
//   node xuat-offer-doc.mjs --demo --md-only
// Yêu cầu scope base:block:create (đã cấp 2026-06-15). PATH cần Node.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { dinhGia, renderDoc, DEMO } from "./dinh-gia-offer.mjs";

const RUN = "@larksuite/cli/scripts/run.js";
const args = process.argv.slice(2);
const getA = (k) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : undefined; };
const file = args.find((a) => !a.startsWith("--") && a.endsWith(".json"));
const BASE = getA("--base-token"), NAME = getA("--name"), LINKREC = getA("--link-record");
const OUT = getA("--out") || ".";
const MD_ONLY = args.includes("--md-only");

if (!file && !args.includes("--demo")) { console.error("Cần <input.json> (hoặc --demo)."); process.exit(1); }

// Lấy kết quả engine: input.json -> dinhGia(); --demo -> chạy engine CLI lấy DEMO.
const k = dinhGia(file ? JSON.parse(readFileSync(file, "utf8")) : DEMO);
const md = renderDoc(k);

mkdirSync(OUT, { recursive: true });
const safe = (k.meta.ten || "offer").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().replace(/^-|-$/g, "");
const mdPath = join(OUT, `offer-doc-${safe}.md`);
writeFileSync(mdPath, md, "utf8");

if (MD_ONLY) { console.log(md); process.exit(0); }
if (!BASE) { console.error("Cần --base-token để tạo doc trong Base (hoặc dùng --md-only)."); process.exit(1); }

function lark(a) {
  let out; try { out = execFileSync("node", [RUN, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const st = out.indexOf("{"); let dp = 0, en = -1, q = false, esc = false;
  for (let i = st; i < out.length; i++) { const c = out[i];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') q = false; }
    else if (c === '"') q = true; else if (c === "{") dp++; else if (c === "}") { dp--; if (!dp) { en = i; break; } } }
  const j = JSON.parse(out.slice(st, en + 1)); if (j.ok === false) throw new Error(JSON.stringify(j.error)); return j;
}

const docName = NAME || `Offer — ${k.meta.ten}`;
// 1) tạo docx node trong Base
const blk = lark(["base", "+base-block-create", "--base-token", BASE, "--type", "docx", "--name", docName, "--format", "json"]);
const docxToken = blk.data?.block?.docx_token;
if (!docxToken) throw new Error("Không lấy được docx_token: " + JSON.stringify(blk.data));
console.log("Tạo tài liệu trong Base:", docxToken);
// 2) đổ nội dung markdown
lark(["docs", "+update", "--api-version", "v2", "--doc", docxToken, "--command", "append", "--doc-format", "markdown", "--content", "@" + mdPath, "--format", "json"]);
console.log("Đã đổ nội dung offer.");
// 3) lấy URL + (tùy chọn) link vào record Offer
const base = lark(["base", "+base-get", "--base-token", BASE, "--format", "json"]);
const host = (base.data?.base?.url || base.data?.url || "").split("/base/")[0] || "https://studiosuccess.sg.larksuite.com";
const docUrl = `${host}/docx/${docxToken}`;
if (LINKREC) {
  try {
    lark(["base", "+record-upsert", "--base-token", BASE, "--table-id", "Offer & Định giá", "--record-id", LINKREC, "--as", "user", "--json", JSON.stringify({ "📄 Doc trình bày": docUrl })]);
    console.log("Đã gắn link doc vào record:", LINKREC);
  } catch (e) { console.error("(Không gắn được link record — bỏ qua):", e.message); }
}
console.log("XONG. Doc trong Base:", docUrl);
