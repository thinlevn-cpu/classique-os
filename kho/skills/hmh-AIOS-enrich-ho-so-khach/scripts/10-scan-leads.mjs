// Quét bảng → phân loại chất lượng data → xuất worklist các lead CHƯA enrich.
// Dùng:
//   node 10-scan-leads.mjs               # in tổng quan + ghi worklist.json
//   node 10-scan-leads.mjs --limit 5     # chỉ lấy 5 lead cần research đầu tiên
//   node 10-scan-leads.mjs --all         # kể cả record đã enrich (để soi lại)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig, listAllRecords, cellText, normPhone, analyzeEmail, classify } from "./_lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const limit = (() => { const i = argv.indexOf("--limit"); return i >= 0 ? parseInt(argv[i + 1], 10) : 0; })();
const includeAll = argv.includes("--all");

const cfg = loadConfig();
const recs = listAllRecords(cfg);

const rows = [];
for (const r of recs) {
  const f = r.fields;
  const already = f[cfg.F_DA_ENRICH] === true;
  if (already && !includeAll) continue;

  const name = cellText(f[cfg.F_HOTEN]);
  const phoneRaw = cellText(f[cfg.F_SDT]);
  const emailRaw = cellText(f[cfg.F_EMAIL]).replace(/^\[|\]\(.*$/g, ""); // gỡ markdown [email](...)
  const phone = normPhone(phoneRaw);
  const email = analyzeEmail(emailRaw, cfg.FREE_SET);
  const cls = classify({ name, phoneOk: !!phone, email });

  rows.push({
    record_id: r.record_id,
    ho_ten: name,
    sdt_raw: phoneRaw,
    sdt: phone,               // đã chuẩn hoá hoặc null
    email: email.valid ? emailRaw.toLowerCase() : "",
    email_domain: email.domain,
    email_is_business: email.isBusiness,
    nguon: cellText(f[cfg.F_NGUON]),
    ghi_chu: cellText(f[cfg.F_GHICHU]),
    quality: cls.quality,
    quality_reason: cls.reason,
    needs_research: cls.needsResearch,
    already_enriched: already,
  });
}

const toResearch = rows.filter((x) => x.needs_research && !x.already_enriched);
const junk = rows.filter((x) => !x.needs_research && !x.already_enriched);

const worklist = limit > 0 ? toResearch.slice(0, limit) : toResearch;
const outPath = join(HERE, "worklist.json");
writeFileSync(outPath, JSON.stringify({ generated_records: recs.length, to_research: worklist, junk }, null, 2));

console.log("================ SCAN LEADS ================");
console.log(`Tổng record đọc            : ${recs.length}`);
console.log(`Chưa enrich                : ${rows.length}`);
console.log(`  → Cần research           : ${toResearch.length}  (ghi ${worklist.length} vào worklist)`);
console.log(`  → Rác (bỏ qua, uncontact): ${junk.length}`);
const biz = toResearch.filter((x) => x.email_is_business).length;
console.log(`  → Trong đó email DN mạnh : ${biz}`);
console.log(`worklist.json → ${outPath}`);
