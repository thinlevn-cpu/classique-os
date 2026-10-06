#!/usr/bin/env node
// engine.mjs — Lõi Ads Agent ĐA NGÀNH (zero-dep).
// Đọc 1 "đầu bài" (mirror 1 dòng Lark Base) -> tính 4 ngưỡng quyết định.
// Đọc số liệu hằng ngày -> áp scorecard + cây quyết định -> ra ĐỀ XUẤT kèm lý do bằng số.
// Công thức PHỔ QUÁT: không phụ thuộc ngành, chỉ input đổi theo dòng Base.
//
// Dùng:
//   node engine.mjs thresholds <brief.json>
//   node engine.mjs decide <brief.json> <metrics.json>
//   node engine.mjs demo

import fs from "node:fs";

const VND = n => (n == null || Number.isNaN(n)) ? "—" : Math.round(n).toLocaleString("vi-VN") + "đ";
const PCT = n => (n == null) ? "—" : (n * 100).toFixed(1) + "%";

// ---------- 1) Tính ngưỡng từ đầu bài (PHỔ QUÁT mọi ngành) ----------
export function computeThresholds(b) {
  const P = +b.gia_P, V = +b.chi_phi_bien_doi_V;
  const M = P - V;                       // lãi gộp / đơn
  const m = P > 0 ? M / P : 0;           // biên lãi gộp
  const beROAS = m > 0 ? 1 / m : Infinity;   // ROAS hòa vốn
  const beCPA = M;                        // chi tối đa/đơn để hòa vốn
  const keep = b.loi_nhuan_muon_giu ?? 0.5;
  const targetCPA = M * (1 - keep);       // CPA mục tiêu (giữ % lãi)
  const targetCPMC = targetCPA * (+b.ty_le_chat_to_don); // giá 1 hội thoại tối đa
  const targetCPL = targetCPA * (+b.ty_le_lead_to_don);  // giá 1 lead tối đa
  return { P, V, M, m, beROAS, beCPA, targetCPA, targetCPMC, targetCPL };
}

// ---------- 2) Ra quyết định từ số liệu ----------
// metrics: { results, days, cpm, ctr, hookRate, cpmc, cpl, cpa, roas, frequency }
export function decide(b, metrics) {
  const t = computeThresholds(b);
  const g = b.guardrail || {};
  const minResults = g.min_results ?? 50;
  const minDays = g.min_days ?? 3;
  const stepUp = g.tang_toi_da_moi_lan ?? 0.2;
  const budget = +b.ngan_sach_ngay;
  const cap = +b.tran_chi_tieu_cung;
  const out = { thresholds: t, flags: [], action: null, reason: "", suggested_budget: budget };

  // --- Cảnh báo phễu (đọc từ trên xuống) ---
  if (metrics.ctr != null && metrics.ctr < 0.015) out.flags.push(`CTR ${PCT(metrics.ctr)} < 1.5% → hook/hình yếu`);
  if (metrics.hookRate != null && metrics.hookRate < 0.25) out.flags.push(`Hook rate ${PCT(metrics.hookRate)} < 25% → 3 giây đầu chưa chặn ngón cái`);
  if (metrics.frequency != null && metrics.frequency > 3) out.flags.push(`Frequency ${metrics.frequency} > 3 → đối tượng cháy, làm mới creative/mở rộng`);

  // --- Đủ dữ liệu chưa? ---
  if ((metrics.results ?? 0) < minResults && (metrics.days ?? 0) < minDays) {
    out.action = "HỌC";
    out.reason = `Mới ${metrics.results ?? 0} hội thoại / ${metrics.days ?? 0} ngày (< ${minResults} hoặc < ${minDays} ngày). Để yên, KHÔNG can thiệp — tránh reset pha học.`;
    return out;
  }

  // --- Có ROAS thật (đã ra đơn) → quyết theo ROAS ---
  if (metrics.roas != null && metrics.roas > 0) {
    const r = metrics.roas, be = t.beROAS;
    if (r >= 1.5 * be) {
      out.action = "TĂNG";
      out.suggested_budget = Math.min(cap, Math.round(budget * (1 + stepUp)));
      out.reason = `ROAS ${r.toFixed(2)} ≥ 1.5×hòa-vốn(${be.toFixed(2)}). Người thắng → TĂNG +${PCT(stepUp)} (lên ${VND(out.suggested_budget)}${out.suggested_budget>=cap?", CHẠM trần":""}). Nhân bản creative/đối tượng thắng.`;
    } else if (r >= be) {
      out.action = "DUY TRÌ";
      out.reason = `ROAS ${r.toFixed(2)} ≥ hòa-vốn(${be.toFixed(2)}) nhưng < 1.5×. Giữ ngân sách, thay creative yếu nhất để đẩy lên nhóm TĂNG.`;
    } else {
      // ROAS < hòa vốn — phễu trên khỏe hay hỏng?
      const phuTrenKhoe = (metrics.cpmc != null && metrics.cpmc <= t.targetCPMC) ||
                          (metrics.cpl != null && metrics.cpl <= t.targetCPL);
      if (phuTrenKhoe) {
        out.action = "GIỮ — SỬA CHỐT SALE";
        out.reason = `ROAS ${r.toFixed(2)} < hòa-vốn(${be.toFixed(2)}) NHƯNG CPMC/CPL còn tốt (CPMC ${VND(metrics.cpmc)} ≤ mục tiêu ${VND(t.targetCPMC)}). Lỗi ở KHÂU CHỐT, không phải ads → KHÔNG tắt ads; sửa kịch bản chốt + tốc độ phản hồi + offer.`;
      } else {
        out.action = "GIẢM/TẮT";
        out.suggested_budget = Math.round(budget * 0.5);
        out.reason = `ROAS ${r.toFixed(2)} < hòa-vốn(${be.toFixed(2)}) VÀ phễu trên hỏng (CPMC ${VND(metrics.cpmc)} > mục tiêu ${VND(t.targetCPMC)}). Đủ data rồi → GIẢM 50% (${VND(out.suggested_budget)}) hoặc TẮT creative tệ nhất trước.`;
      }
    }
    return out;
  }

  // --- Chưa có ROAS (chưa ra đơn) → quyết theo CPMC (giá hội thoại) ---
  if (metrics.cpmc != null) {
    const c = metrics.cpmc, tgt = t.targetCPMC;
    if (c <= tgt) {
      out.action = "DUY TRÌ/TĂNG";
      out.suggested_budget = Math.min(cap, Math.round(budget * (1 + stepUp)));
      out.reason = `Chưa có đơn nhưng CPMC ${VND(c)} ≤ mục tiêu ${VND(tgt)} → phễu khỏe. Giữ/đẩy nhẹ (${VND(out.suggested_budget)}) & theo dõi đơn về. Kiểm tra chốt sale nếu hội thoại nhiều mà không ra đơn.`;
    } else if (c <= tgt * 1.6) {
      out.action = "TỐI ƯU";
      out.reason = `CPMC ${VND(c)} cao hơn mục tiêu ${VND(tgt)} (trong vùng 1.6×). Tối ưu creative/đối tượng/câu chào trước khi quyết tắt.`;
    } else {
      out.action = "GIẢM/TẮT";
      out.suggested_budget = Math.round(budget * 0.5);
      out.reason = `CPMC ${VND(c)} > 1.6× mục tiêu ${VND(tgt)} sau đủ data → GIẢM 50% (${VND(out.suggested_budget)}) hoặc TẮT.`;
    }
    return out;
  }

  out.action = "THIẾU SỐ";
  out.reason = "Chưa đủ chỉ số (cần tối thiểu CPMC hoặc ROAS). Kiểm tra đo lường Pixel/CAPI.";
  return out;
}

// ---------- CLI ----------
function printThresholds(b) {
  const t = computeThresholds(b);
  console.log(`\n=== ĐẦU BÀI: ${b.ten || "(chưa đặt tên)"} | Ngành: ${b.nganh || "?"} ===`);
  console.log(`Giá bán P:           ${VND(t.P)}`);
  console.log(`Chi phí biến đổi V:  ${VND(t.V)}`);
  console.log(`Lãi gộp M:           ${VND(t.M)}   (biên ${PCT(t.m)})`);
  console.log(`-----------------------------------------`);
  console.log(`Break-even ROAS:     ${t.beROAS.toFixed(2)}   (ROAS tối thiểu để hòa vốn)`);
  console.log(`Break-even CPA:      ${VND(t.beCPA)}   (chi tối đa/đơn để hòa vốn)`);
  console.log(`CPA mục tiêu:        ${VND(t.targetCPA)}   (giữ ${PCT(b.loi_nhuan_muon_giu ?? 0.5)} lãi)`);
  console.log(`★ CPMC mục tiêu:     ${VND(t.targetCPMC)}   (giá 1 HỘI THOẠI tối đa, chat→đơn ${PCT(b.ty_le_chat_to_don)})`);
  console.log(`★ CPL mục tiêu:      ${VND(t.targetCPL)}   (giá 1 LEAD tối đa, lead→đơn ${PCT(b.ty_le_lead_to_don)})`);
  return t;
}

function printDecision(b, m) {
  const d = decide(b, m);
  console.log(`\n--- SỐ LIỆU: ${m.results ?? "?"} hội thoại / ${m.days ?? "?"} ngày | CPMC ${VND(m.cpmc)} | ROAS ${m.roas ?? "—"} | Freq ${m.frequency ?? "—"} ---`);
  if (d.flags.length) d.flags.forEach(f => console.log(`  ⚠ ${f}`));
  console.log(`\n  ➜ QUYẾT ĐỊNH: [${d.action}]`);
  console.log(`     ${d.reason}`);
  if (d.suggested_budget != null) console.log(`     Ngân sách đề xuất: ${VND(d.suggested_budget)}`);
}

// Chỉ chạy CLI khi gọi trực tiếp `node engine.mjs ...`, không chạy khi bị import.
const runCli = process.argv[1] && process.argv[1].endsWith("engine.mjs");
const cmd = runCli ? process.argv[2] : null;
if (!runCli) {
  // được import — bỏ qua CLI
} else if (cmd === "thresholds") {
  printThresholds(JSON.parse(fs.readFileSync(process.argv[3], "utf8")));
} else if (cmd === "decide") {
  const b = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
  const m = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
  printThresholds(b); printDecision(b, m);
} else if (cmd === "demo") {
  // Demo: 1 đầu bài đào tạo + 4 kịch bản số liệu khác nhau → thấy engine quyết khác nhau
  const brief = {
    ten: "Khóa AI cho chủ DN", nganh: "dao-tao",
    gia_P: 5000000, chi_phi_bien_doi_V: 1000000,
    ty_le_chat_to_don: 0.05, ty_le_lead_to_don: 0.15,
    loi_nhuan_muon_giu: 0.5, ngan_sach_ngay: 500000, tran_chi_tieu_cung: 2000000,
    guardrail: { min_results: 50, min_days: 3, tang_toi_da_moi_lan: 0.2 }
  };
  const t = printThresholds(brief);
  const scenarios = [
    { label: "① Mới chạy 1 ngày", results: 12, days: 1, cpmc: 90000, ctr: 0.02, frequency: 1.2 },
    { label: "② Thắng (ROAS cao)", results: 80, days: 5, cpmc: 85000, ctr: 0.025, roas: 2.0, frequency: 1.8 },
    { label: "③ Phễu khỏe, chưa ra đơn", results: 60, days: 4, cpmc: 80000, ctr: 0.022, roas: 0, frequency: 2.0 },
    { label: "④ CPMC tốt nhưng ROAS thấp (lỗi chốt)", results: 70, days: 6, cpmc: 95000, ctr: 0.02, roas: 0.8, frequency: 2.3 },
    { label: "⑤ Phễu hỏng (CPMC cao)", results: 65, days: 5, cpmc: 180000, ctr: 0.009, roas: 0.4, frequency: 3.4 },
  ];
  for (const s of scenarios) { console.log(`\n========== ${s.label} ==========`); printDecision(brief, s); }
} else {
  console.log("Dùng: node engine.mjs thresholds <brief.json> | decide <brief.json> <metrics.json> | demo");
}
