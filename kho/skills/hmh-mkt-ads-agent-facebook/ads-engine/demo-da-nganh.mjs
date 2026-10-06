#!/usr/bin/env node
// Chứng minh "ĐA NGÀNH = ĐA DÒNG": cùng 1 engine, đổi input theo ngành -> ngưỡng khác nhau.
import fs from "node:fs";
import { computeThresholds } from "./engine.mjs";

const presets = JSON.parse(fs.readFileSync(new URL("./presets-nganh.json", import.meta.url), "utf8"));
const VND = n => Math.round(n).toLocaleString("vi-VN") + "đ";

// Mỗi ngành 1 ví dụ giá/chi phí thực tế khác nhau (mô phỏng 5 dòng Base)
const vidu = {
  "dao-tao":      { gia_P: 5000000,  V: 1000000 },
  "spa-tham-my":  { gia_P: 3000000,  V: 1200000 },
  "bat-dong-san": { gia_P: 2000000000, V: 200000000 },
  "nha-khoa":     { gia_P: 15000000, V: 6000000 },
  "fnb":          { gia_P: 250000,   V: 150000 },
};

console.log("\n┌─ MỘT ENGINE — NĂM NGÀNH (mỗi dòng Base = 1 ngành) ─────────────────────────");
console.log("│ Ngành            | Giá bán      | BE ROAS | CPA mục tiêu  | CPMC mục tiêu | CPL mục tiêu");
console.log("├──────────────────────────────────────────────────────────────────────────");
for (const p of presets.nganh) {
  const v = vidu[p.ma];
  const brief = {
    gia_P: v.gia_P, chi_phi_bien_doi_V: v.V,
    ty_le_chat_to_don: p.ty_le_chat_to_don, ty_le_lead_to_don: p.ty_le_lead_to_don,
    loi_nhuan_muon_giu: p.loi_nhuan_muon_giu,
  };
  const t = computeThresholds(brief);
  console.log(`│ ${p.ten.padEnd(16)} | ${VND(t.P).padStart(12)} | ${t.beROAS.toFixed(2).padStart(5)}   | ${VND(t.targetCPA).padStart(13)} | ${VND(t.targetCPMC).padStart(13)} | ${VND(t.targetCPL)}`);
}
console.log("└───────────────────────────────────────────────────────────────────────────");
console.log("→ Cùng MỘT công thức. Khác nhau chỉ vì input mỗi dòng khác. Thêm ngành = thêm 1 dòng, KHÔNG đụng code.\n");
