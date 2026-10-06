// Shared helpers: đọc config.env + gọi lark-cli, chuẩn hoá tín hiệu lead.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import path from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadConfig() {
  const file = join(HERE, "config.env");
  if (!existsSync(file)) {
    console.error(
      "\n✖ Chưa có file cấu hình `config.env`.\n\n" +
      "  Chạy 2 lệnh sau rồi mở file ra điền Base/bảng/webhook của bạn:\n" +
      `    cd "${HERE}"\n` +
      "    cp config.env.example config.env\n\n" +
      "  (Xem HUONG-DAN-KHACH.md — Bước 2 và Bước 3 chỉ cách lấy từng giá trị.)\n"
    );
    process.exit(1);
  }
  const txt = readFileSync(file, "utf8");
  const cfg = {};
  for (const raw of txt.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    let val = line.slice(i + 1);
    val = val.replace(/\s+#.*$/, "").trim(); // gỡ comment inline "  # ..."
    cfg[line.slice(0, i).trim()] = val;
  }
  cfg.FREE_SET = new Set(
    (cfg.FREE_EMAIL_DOMAINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  return cfg;
}

// Gọi lark-cli, trả stdout (string). Ném lỗi nếu exit != 0.
export function lark(args) {
  // Windows: `execFileSync("lark-cli")` → ENOENT (bin thật là .cmd/.ps1); gọi thẳng .cmd → Node ≥20
  // ném EINVAL; đi qua `cmd.exe /c` thì cmd TÁCH chuỗi ở dấu cách/& → vỡ JSON tiếng Việt.
  // Cách duy nhất an toàn: chạy thẳng file JS của lark-cli bằng node (shell:false, giữ UTF-8).
  const opts = { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 };
  if (process.platform !== "win32") return execFileSync("lark-cli", args, opts);
  const runJs = path.join(process.env.APPDATA || "", "npm", "node_modules", "@larksuite", "cli", "scripts", "run.js");
  return existsSync(runJs)
    ? execFileSync(process.execPath, [runJs, ...args], opts)
    : execFileSync("cmd.exe", ["/c", "lark-cli.cmd", ...args], opts);
}

// Gọi lark-cli KHÔNG ném lỗi: luôn trả về envelope JSON của CLI ({ok, data} hoặc {ok:false, error}).
// Khi lệnh thất bại, CLI vẫn in JSON lỗi ra stdout — cần bóc nó ra thay vì chỉ thấy "Command failed".
export function larkTry(args) {
  try { return JSON.parse(lark(args)); }
  catch (e) {
    // CLI in JSON lỗi ra stderr (stdout rỗng), còn e.message chỉ là dòng lệnh + "Command failed"
    // — trong đó có cả JSON của tham số --data, nên phải chọn đúng khối có `ok`/`error`.
    for (const nguon of [e.stderr, e.stdout, e.message]) {
      const j = envelopeTrong(String(nguon || ""));
      if (j) return j;
    }
    return { ok: false, error: { message: String(e.message || e).slice(0, 200) } };
  }
}

// Tìm khối JSON là ENVELOPE của CLI (có `ok`/`error`/`data`) trong một chuỗi lẫn text.
function envelopeTrong(t) {
  let tu = 0;
  for (;;) {
    const i = t.indexOf("{", tu);
    if (i < 0) return null;
    const j = jsonTaiViTri(t, i);
    if (j && ("ok" in j || "error" in j || "data" in j)) return j;
    tu = i + 1;
  }
}

// Bóc khối JSON bắt đầu tại vị trí i (đếm ngoặc, bỏ qua ngoặc nằm trong chuỗi).
function jsonTaiViTri(t, i) {
  if (t[i] !== "{") return null;
  let sau = 0, trongChuoi = false, thoat = false;
  for (let k = i; k < t.length; k++) {
    const c = t[k];
    if (trongChuoi) {
      if (thoat) thoat = false;
      else if (c === "\\") thoat = true;
      else if (c === '"') trongChuoi = false;
      continue;
    }
    if (c === '"') trongChuoi = true;
    else if (c === "{") sau++;
    else if (c === "}" && --sau === 0) {
      try { return JSON.parse(t.slice(i, k + 1)); } catch { return null; }
    }
  }
  return null;
}

// Đọc toàn bộ record (phân trang) → [{record_id, fields}]
// Lưu ý: `base +record-list --format json` trả CỘT (columnar):
//   data.fields = [tên cột...] ; data.data = [[ô...] song song] ; data.record_id_list = [id...]
export function listAllRecords(cfg) {
  const out = [];
  let offset = 0;
  for (;;) {
    const args = [
      "base", "+record-list",
      "--base-token", cfg.BASE_TOKEN,
      "--table-id", cfg.TABLE_ID,
      "--format", "json",
      "--limit", "200",
      "--offset", String(offset),
      "--as", cfg.IDENTITY || "user",
    ];
    const env = JSON.parse(lark(args));
    const data = env.data || env;
    const colNames = data.fields || [];
    const rows = data.data || [];
    const ids = data.record_id_list || [];
    for (let i = 0; i < rows.length; i++) {
      const fields = {};
      for (let j = 0; j < colNames.length; j++) fields[colNames[j]] = rows[i][j];
      out.push({ record_id: ids[i], fields });
    }
    if (!data.has_more || rows.length === 0) break;
    offset += rows.length;
    if (offset > 100000) break; // an toàn
  }
  return out;
}

// Ghi patch cho MỘT record. patch = { "Tên cột": value, ... }
export function updateRecord(cfg, recordId, patch) {
  const body = JSON.stringify({ record_id_list: [recordId], patch });
  const args = [
    "base", "+record-batch-update",
    "--base-token", cfg.BASE_TOKEN,
    "--table-id", cfg.TABLE_ID,
    "--json", body,
    "--as", cfg.IDENTITY || "user",
  ];
  return lark(args);
}

// ---- Chuẩn hoá & validate tín hiệu ----

// Lấy text từ cell (Lark trả string | [{text}] | v.v.)
export function cellText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === "object" ? x.text || x.name || "" : String(x))).join(" ").trim();
  if (typeof v === "object") return (v.text || v.name || "").trim();
  return String(v).trim();
}

// Chuẩn hoá SĐT VN → 0xxxxxxxxx, hoặc null nếu không hợp lệ.
export function normPhone(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/[^\d+]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  else if (s.startsWith("84") && s.length >= 11) s = "0" + s.slice(2);
  // di động: 03/05/07/08/09 + 8 số = 10 ký tự
  if (/^0(3|5|7|8|9)\d{8}$/.test(s)) return s;
  // cố định: 02x + 8 số
  if (/^02\d{8,9}$/.test(s)) return s;
  return null;
}

// Phân tích email → {valid, domain, isBusiness}
export function analyzeEmail(raw, freeSet) {
  const s = String(raw || "").trim().toLowerCase();
  const m = s.match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  if (!m) return { valid: false, domain: "", isBusiness: false };
  const domain = m[1];
  const isBusiness = !freeSet.has(domain);
  return { valid: true, domain, isBusiness };
}

// Tên yếu? (1 token hoặc quá ngắn / rác rõ ràng)
export function nameIsWeak(name) {
  const t = String(name || "").trim();
  if (t.length < 2) return true;
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 && t.length <= 3) return true;
  return false;
}

// Phân loại chất lượng data → { quality, reason, needsResearch }
export function classify({ name, phoneOk, email }) {
  const weak = nameIsWeak(name);
  if (!phoneOk && !email.valid) {
    return { quality: "Rác", reason: "SĐT sai & email không hợp lệ — không có cách liên hệ/tra cứu", needsResearch: false };
  }
  const flags = [];
  if (!phoneOk) flags.push("SĐT không hợp lệ");
  if (weak) flags.push("tên cụt/yếu");
  if (email.valid && email.isBusiness) {
    return { quality: "Lead thật", reason: "Có email tên miền doanh nghiệp", needsResearch: true };
  }
  if (flags.length >= 2) {
    return { quality: "Cần kiểm tra", reason: flags.join(" + "), needsResearch: true };
  }
  return { quality: "Lead thật", reason: flags.length ? flags.join(" + ") : "Tín hiệu đủ để tra cứu", needsResearch: true };
}
