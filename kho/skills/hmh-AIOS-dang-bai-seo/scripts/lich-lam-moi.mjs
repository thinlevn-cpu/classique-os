#!/usr/bin/env node
/**
 * lich-lam-moi.mjs — liệt kê bài blog classique.vn đến hạn làm mới (gói C1, 24/09/2026).
 * Vì sao: Ahrefs đo 76% trang ChatGPT trích nhiều nhất được cập nhật trong 30 ngày; bài trụ để quá 60 ngày là tụt.
 *
 *   node .claude/skills/hmh-AIOS-dang-bai-seo/scripts/lich-lam-moi.mjs [--ngay 45] [--json]
 *
 * "Làm mới" = thêm 1 ca/quan sát mới từ kho phiếu, soát lại link ngoài còn 200, kiểm cổng văn hiện hành,
 * rồi đăng lại bằng publisher `--cap-nhat` (Yoast tự đổi dateModified, plugin classique-aeo hiện "Cập nhật ngày").
 * KHÔNG đổi ngày đăng giả: chỉ cập nhật khi thật sự có sửa nội dung.
 */
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const NGAY = Number(arg('--ngay', 45));
const bai = [];
for (let page = 1; ; page++) {
  const r = await fetch(`https://classique.vn/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=id,slug,link,date,modified,title`);
  if (!r.ok) break;
  const d = await r.json(); if (!d.length) break; bai.push(...d);
  if (d.length < 100) break;
}
const nay = Date.now();
const ds = bai.map(p => ({ id: p.id, link: p.link, tieu_de: p.title.rendered, tuoi_sua: Math.floor((nay - Date.parse(p.modified + '+07:00')) / 864e5) }))
  .filter(p => p.tuoi_sua >= NGAY).sort((a, b) => b.tuoi_sua - a.tuoi_sua);
if (process.argv.includes('--json')) { console.log(JSON.stringify(ds, null, 2)); process.exit(0); }
console.log(`${bai.length} bài; ${ds.length} bài chưa sửa từ ${NGAY} ngày trở lên.`);
for (const p of ds) console.log(`${String(p.tuoi_sua).padStart(4)} ngày  ${p.id}  ${p.link}`);
console.log(`LAM_MOI ${ds.length}`);
