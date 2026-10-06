// bao-google-index.mjs — báo Google Indexing API "URL_UPDATED" cho một hoặc nhiều URL vừa đăng.
// Không cần thư viện ngoài: tự ký JWT RS256 bằng khoá tài khoản dịch vụ (.secrets/google-indexing.json).
// Dùng:  node bao-google-index.mjs <url> [<url> ...]      hoặc   node bao-google-index.mjs --sitemap   (mọi bài trong post-sitemap.xml)
// Quota Google: 200 URL/ngày/dự án. Kết quả in từng dòng: INDEX_OK <url> | INDEX_FAIL <url> <lý do>.
// Lưu ý (ghi 22/09/2026): Google công bố API này cho trang JobPosting/BroadcastEvent; với bài thường Google có thể chỉ
// dùng như tín hiệu phát hiện URL. Vẫn đáng gọi vì site mới bị kẹt ở "đã phát hiện, chưa lập chỉ mục".
import { readFileSync, existsSync } from "node:fs";
import { createSign } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const PROJ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const KEY_FILE = process.env.GOOGLE_INDEXING_KEY || path.join(PROJ, ".secrets", "google-indexing.json");
if (!existsSync(KEY_FILE)) { console.log("INDEX_FAIL - thiếu khoá tài khoản dịch vụ: " + KEY_FILE); process.exit(1); }
const key = JSON.parse(readFileSync(KEY_FILE, "utf8"));
const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
async function token() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64({ alg: "RS256", typ: "JWT" }) + "." + b64({ iss: key.client_email, scope: "https://www.googleapis.com/auth/indexing", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const sig = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}` });
  const j = await r.json(); if (!j.access_token) throw new Error("token: " + JSON.stringify(j).slice(0, 200)); return j.access_token;
}
let urls = process.argv.slice(2).filter(u => u.startsWith("http"));
if (process.argv.includes("--sitemap")) {
  const xml = await (await fetch("https://classique.vn/post-sitemap.xml")).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => !/post-sitemap|\.xml$/.test(u));
}
if (!urls.length) { console.log("INDEX_FAIL - không có URL"); process.exit(2); }
const t = await token(); let ok = 0;
for (const url of urls) {
  const r = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", { method: "POST", headers: { authorization: "Bearer " + t, "content-type": "application/json" }, body: JSON.stringify({ url, type: "URL_UPDATED" }) });
  const j = await r.json().catch(() => ({}));
  if (r.ok) { ok++; console.log("INDEX_OK " + url); } else console.log(`INDEX_FAIL ${url} ${r.status} ${(j.error && j.error.message || "").slice(0, 160)}`);
  await new Promise(s => setTimeout(s, 300));
}
console.log(`INDEX_DONE ${ok}/${urls.length}`);
