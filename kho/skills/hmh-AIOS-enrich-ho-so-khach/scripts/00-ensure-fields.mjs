// Tạo (idempotent) các cột ENRICH nếu chưa có. Chạy 1 lần cho mỗi bảng.
// Dùng: node 00-ensure-fields.mjs
import { loadConfig, lark } from "./_lib.mjs";

const cfg = loadConfig();

const WANT = [
  { key: "F_DA_ENRICH", type: "checkbox" },
  { key: "F_CHATLUONG", type: "select", options: ["Lead thật", "Cần kiểm tra", "Rác"] },
  { key: "F_CO_KD", type: "select", options: ["Có", "Không", "Chưa rõ"] },
  { key: "F_NGANHNGHE", type: "text" },
  { key: "F_DKKD", type: "text" },
  { key: "F_HOSO", type: "text" },
  { key: "F_TINCAY", type: "select", options: ["Cao", "Trung bình", "Thấp"] },
  { key: "F_NGUON_ENRICH", type: "text" },
  { key: "F_GOCTUVAN", type: "text" },
  { key: "F_LINK", type: "text" },
  { key: "F_DA_BAO_SALE", type: "checkbox" },
];

// Field hiện có
const env = JSON.parse(lark([
  "base", "+field-list",
  "--base-token", cfg.BASE_TOKEN,
  "--table-id", cfg.TABLE_ID,
  "--as", cfg.IDENTITY || "user",
]));
const existing = new Set(((env.data || env).items || (env.data || env).fields || []).map((f) => f.name));

for (const w of WANT) {
  const name = cfg[w.key];
  if (!name) { console.log(`⚠️  Thiếu biến ${w.key} trong config.env`); continue; }
  if (existing.has(name)) { console.log(`✓ Đã có: ${name}`); continue; }
  const spec = { name, type: w.type };
  if (w.options) spec.options = w.options.map((o) => ({ name: o }));
  lark([
    "base", "+field-create",
    "--base-token", cfg.BASE_TOKEN,
    "--table-id", cfg.TABLE_ID,
    "--json", JSON.stringify(spec),
    "--as", cfg.IDENTITY || "user",
  ]);
  console.log(`＋ Đã tạo: ${name} (${w.type})`);
}
console.log("Xong ensure-fields.");
