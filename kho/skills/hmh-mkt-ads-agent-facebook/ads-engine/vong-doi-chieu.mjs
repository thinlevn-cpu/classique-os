#!/usr/bin/env node
// vong-doi-chieu.mjs — VÒNG ĐỐI CHIẾU THỰC vs MỤC TIÊU (bộ não tự lái Ads Agent).
// Đọc NGƯỠNG từ Bảng 0 (Tổng tư lệnh) + SỐ THẬT (Meta insights / file) → quyết định can thiệp.
// Triết lý: quảng cáo bị CHIẾN LƯỢC LÃI cầm cương. Tăng doanh thu, KHÔNG vượt chi phí.
//
//   node vong-doi-chieu.mjs --demo                         # 6 kịch bản chứng minh logic
//   node vong-doi-chieu.mjs --targets b0.json --metrics m.json
//
// b0.json = output của: lark-cli base record-list (Bảng 0, --format json)
// m.json  = {daysRunning, spendTotal, leads, spendToday, cpl?, frequency?, ctr?, prevCtr?}

const SEV = { STOP:'🛑 DỪNG', KILL:'🔴 TẮT GẤP', FIX:'🟠 SỬA', WATCH:'🟡 THEO DÕI', SCALE:'🟢 SCALE', KEEP:'🟢 DUY TRÌ', LEARN:'⚪ HỌC' };
const MIN_LEADS_FLOOR = 10;   // sàn dữ liệu tối thiểu trước khi phán (lý tưởng 50/tuần — cảnh báo nếu thấp)
const SCALE_STEP = 0.20;      // mỗi lần scale +20%/ngày

const num = (v) => { const n = Number(String(v ?? '').toString().replace(/[^\d.\-]/g,'')); return isFinite(n) ? n : 0; };

// ---- Trích NGƯỠNG từ record-list JSON của Bảng 0 ----
export function parseTargets(b0) {
  const d = b0.data || b0;
  const fields = d.fields, row = (d.data && d.data[0]) || [];
  const m = {}; fields.forEach((n,i)=> m[n]=row[i]);
  return parseTargetsFromMap(m);
}

// ---- Trích NGƯỠNG từ 1 map {tên cột: giá trị} (dùng cho cả Bảng 0 lẫn Bảng 1) ----
export function parseTargetsFromMap(m) {
  const g = (sub) => { for (const n in m){ if (n.toLowerCase().includes(sub)){ let v=m[n]; if(Array.isArray(v)&&v.length){v=v[0]; v=(v&&typeof v==='object')?(v.text||v.name):v;} return v; } } return null; };
  return {
    ten:           g('tên chuẩn ads') || g('tên lệnh') || g('tên chiến dịch') || 'Chiến dịch',
    cplTarget:     num(g('cpl mục tiêu')),
    cplBreakeven:  num(g('cpl hòa vốn')),
    cpaTarget:     num(g('cpa mục tiêu')),
    roasTarget:    num(g('roas mục tiêu')),
    beROAS:        num(g('break-even roas')),
    killMult:      num(g('ngưỡng tắt')) || 1.5,
    learningDays:  num(g('cửa sổ học')) || 4,
    totalCap:      num(g('tổng trần chi tiêu')),
    dailyMax:      num(g('trần ngân sách tối đ')),
    dailyBudget:   num(g('ngân sách ngày')),
    goalLeads:     num(g('mục tiêu lead')),
    goalPeriod:    g('kỳ mục tiêu') || 'Tháng',
    autonomy:      g('mức tự quyết') || 'Báo & chờ anh duyệt',
    startDate:     g('ngày chạy') || null,
  };
}

// ---- LÕI QUYẾT ĐỊNH ----
// Hai tầng gác: ROAS thật (cuối phễu, ưu tiên khi đã có đơn) → CPL (đầu phễu, khi backend chưa kịp).
export function decide(t, m) {
  const cpl  = m.cpl != null ? m.cpl : (m.leads ? Math.round(m.spendTotal / m.leads) : Infinity);
  const roas = (m.revenue > 0 && m.spendTotal) ? (m.revenue / m.spendTotal) : (m.roas || 0);
  const hasRevenue = (m.purchases > 0) && (m.revenue > 0);
  const out = (sev, action, reason, recommend, auto=false) => ({ sev, action, reason, recommend, auto, cpl, roas,
    snapshot: { leads:m.leads, purchases:m.purchases, revenue:m.revenue, spendTotal:m.spendTotal, cpl, roas,
                cplTarget:t.cplTarget, cplBreakeven:t.cplBreakeven, roasTarget:t.roasTarget, beROAS:t.beROAS } });

  const perDayGoal = t.goalPeriod==='Ngày' ? t.goalLeads : t.goalPeriod==='Tuần' ? t.goalLeads/7 : t.goalLeads/30;
  const leadsPerDay = m.daysRunning ? m.leads/m.daysRunning : 0;
  const pace = perDayGoal ? `${leadsPerDay.toFixed(1)}/${perDayGoal.toFixed(1)} lead/ngày so mục tiêu` : '';
  const fatigue = (m.frequency && m.frequency >= 3) || (m.prevCtr && m.ctr && m.ctr < m.prevCtr*0.7);

  const scaleOrKeep = (why, autoOk) => {
    const newDaily = Math.min(Math.round(t.dailyBudget * (1+SCALE_STEP)), t.dailyMax || Infinity);
    const room = !t.totalCap || (m.spendTotal + newDaily) <= t.totalCap;
    if (newDaily > t.dailyBudget && room)
      return out(SEV.SCALE, `Scale +${SCALE_STEP*100}% → ${fmt(newDaily)}/ngày`, why, 'Tăng ngân sách từ từ. '+pace, autoOk);
    return out(SEV.KEEP, 'Duy trì — đã kịch trần/ngày hoặc sát tổng trần', why, 'Giữ nguyên, theo dõi. '+pace, true);
  };

  // 1) GÁC TRẦN — ưu tiên tuyệt đối ("không vượt chi phí")
  if (t.totalCap && m.spendTotal >= t.totalCap)
    return out(SEV.STOP, 'Dừng toàn bộ — đã chạm TỔNG TRẦN chi tiêu',
      `Đã tiêu ${fmt(m.spendTotal)} ≥ trần ${fmt(t.totalCap)}`, 'Tắt chiến dịch, tổng kết hiệu quả.', true);

  // 2) CỬA SỔ HỌC — chưa đủ dữ liệu thì KHÔNG đụng vào
  const enough = m.daysRunning >= t.learningDays && m.leads >= MIN_LEADS_FLOOR;
  if (!enough) {
    const warn = m.leads < 50 ? ' (lưu ý: <50 lead → số liệu còn nhiễu, lý tưởng ~50/tuần)' : '';
    return out(SEV.LEARN, 'Giữ nguyên — đang trong cửa sổ học',
      `Mới ${m.daysRunning}/${t.learningDays} ngày, ${m.leads} lead${warn}`,
      'Chưa can thiệp. Để Meta học đủ rồi mới phán.', true);
  }

  // ===== TẦNG 1: GÁC ROAS THẬT (khi đã có đơn Purchase) =====
  if (hasRevenue) {
    if (t.beROAS && roas < t.beROAS)
      return out(SEV.KILL, 'Tắt/sửa gấp — ROAS thực dưới HÒA VỐN (đang LỖ cuối phễu)',
        `ROAS ${roas.toFixed(2)} < hòa vốn ${t.beROAS} | ${m.purchases} đơn, DT ${fmt(m.revenue)}`,
        'Tắt nhóm lỗ; soát offer/tệp/landing. Lỗ thật rồi.', false);
    if (t.roasTarget && roas < t.roasTarget)
      return out(SEV.WATCH, 'Theo dõi — ROAS trên hòa vốn nhưng DƯỚI mục tiêu lãi',
        `ROAS ${roas.toFixed(2)} < mục tiêu ${t.roasTarget} (CPL ${fmt(cpl)}, ${m.purchases} đơn)`,
        'Tối ưu offer/upsell/creative để nâng ROAS, chưa scale vội. '+pace, false);
    if (fatigue)
      return out(SEV.WATCH, 'Đổi creative — ROAS đạt nhưng có dấu hiệu chai',
        `frequency=${m.frequency?.toFixed?.(1)??m.frequency}, ROAS ${roas.toFixed(2)}`,
        'Bơm bài mới giữ hiệu suất trước khi tụt. '+pace, false);
    return scaleOrKeep(`ROAS ${roas.toFixed(2)} ≥ mục tiêu ${t.roasTarget} (${m.purchases} đơn, DT ${fmt(m.revenue)}) — lãi tốt`, t.autonomy.startsWith('Tự động'));
  }

  // ===== TẦNG 2: GÁC CPL (chưa có đơn — backend trễ, đo đầu phễu) =====
  if (cpl > t.cplBreakeven)
    return out(SEV.KILL, 'Tắt gấp — CPL vượt điểm HÒA VỐN (đang LỖ mỗi lead)',
      `CPL ${fmt(cpl)} > hòa vốn ${fmt(t.cplBreakeven)} (chưa có đơn)`,
      'Tắt nhóm/ad lỗ. Soát tệp + hook.', false);
  if (cpl > t.cplTarget * t.killMult)
    return out(SEV.FIX, `Sửa — CPL vượt ngưỡng chịu đựng (×${t.killMult})`,
      `CPL ${fmt(cpl)} > ${fmt(t.cplTarget*t.killMult)} (chưa có đơn)`,
      'Đổi creative/siết tệp/giảm ngân sách nhóm yếu.', false);
  if (cpl > t.cplTarget)
    return out(SEV.WATCH, 'Giữ + tối ưu — CPL trên mục tiêu nhưng chưa quá ngưỡng',
      `CPL ${fmt(cpl)} > mục tiêu ${fmt(t.cplTarget)} (chưa có đơn)`,
      'Làm mới hook, tắt ad set kém nhất. '+pace, false);
  if (fatigue)
    return out(SEV.WATCH, 'Đổi creative — CPL tốt nhưng có dấu hiệu chai',
      `frequency=${m.frequency?.toFixed?.(1)??m.frequency}`,
      'Bơm bài mới giữ CPL thấp. '+pace, false);
  return scaleOrKeep(`CPL ${fmt(cpl)} ≤ mục tiêu (chưa có đơn — chờ backend xác nhận lãi)`, false);
}

const fmt = (n) => isFinite(n) ? Math.round(n).toLocaleString('vi-VN') + 'đ' : '∞';

// ---- CLI ----
function render(t, m, r) {
  const gate = r.auto ? 'TỰ ĐỘNG thực thi' : 'CẦN ANH DUYỆT (gửi thẻ Lark)';
  const rev = (m.purchases>0) ? ` · ${m.purchases} đơn DT ${fmt(m.revenue)} · ROAS ${r.roas.toFixed(2)}` : ` · chưa có đơn`;
  return [
    `📊 ${t.ten}`,
    `   Thực tế: ${m.leads} lead · tiêu ${fmt(m.spendTotal)} · CPL ${fmt(r.cpl)}${rev} · ${m.daysRunning} ngày`,
    `   Ngưỡng: CPL mt ${fmt(t.cplTarget)} | CPL hòa vốn ${fmt(t.cplBreakeven)} | ROAS mt ${t.roasTarget} | BE ROAS ${t.beROAS} | trần ${fmt(t.totalCap)}`,
    `   ➜ ${r.sev}: ${r.action}`,
    `     Vì: ${r.reason}`,
    `     Đề xuất: ${r.recommend}`,
    `     Cổng: ${gate} (chế độ "${t.autonomy}")`,
  ].join('\n');
}

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i>=0 ? argv[i+1] : null; };

if (has('--demo')) {
  const t = { ten:'Ebook 1000 khách (demo)', cplTarget:22450, cplBreakeven:44900, cpaTarget:224500, roasTarget:2.22, beROAS:1.11,
    killMult:1.5, learningDays:4, totalCap:3500000, dailyMax:300000, dailyBudget:100000,
    goalLeads:100, goalPeriod:'Tháng', autonomy:'Báo & chờ anh duyệt' };
  const cases = [
    ['HỌC',           { daysRunning:2, spendTotal:200000, leads:6 }],
    ['CPL tốt (chưa đơn)',{ daysRunning:6, spendTotal:600000, leads:40 }],                       // tầng CPL: scale
    ['CPL lỗ (chưa đơn)', { daysRunning:6, spendTotal:600000, leads:11 }],                       // tầng CPL: tắt
    ['ROAS đạt → SCALE',  { daysRunning:10, spendTotal:1000000, leads:50, purchases:6, revenue:2994000 }], // ROAS 2.99
    ['ROAS dưới mục tiêu',{ daysRunning:10, spendTotal:1000000, leads:50, purchases:3, revenue:1497000 }], // ROAS 1.5
    ['ROAS LỖ → TẮT',     { daysRunning:10, spendTotal:1000000, leads:50, purchases:1, revenue:499000 }],  // ROAS 0.5
    ['CHẠM TRẦN',         { daysRunning:30, spendTotal:3500000, leads:160, purchases:20, revenue:9980000 }],
  ];
  console.log('=== DEMO VÒNG ĐỐI CHIẾU (ngưỡng từ Ebook 1000 khách) ===\n');
  for (const [name, m] of cases) { console.log(`[${name}]`); console.log(render(t, m, decide(t, m))); console.log(); }
  process.exit(0);
}

const tf = val('--targets'), mf = val('--metrics');
if (tf && mf) {
  const fs = await import('node:fs');
  const t = parseTargets(JSON.parse(fs.readFileSync(tf,'utf8')));
  const m = JSON.parse(fs.readFileSync(mf,'utf8'));
  const r = decide(t, m);
  console.log(render(t, m, r));
  console.log('\nJSON:', JSON.stringify({ targets:t, decision:r }, null, 2));
  process.exit(0);
}

console.log('Dùng: node vong-doi-chieu.mjs --demo  |  --targets b0.json --metrics m.json');
