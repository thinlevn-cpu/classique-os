#!/usr/bin/env node
// enrich-watcher.mjs — TIẾN TRÌNH CANH: có lead mới đổ về bảng salepage → tự dựng hồ sơ khách.
//
// Vì sao là tiến trình riêng (không nằm trong bridge Tôm): bridge chạy ở quyền cao
// (Scheduled Task), phiên thường không restart được để nạp ENRICH_WATCH. Bản này chạy
// dưới quyền người dùng, tự lo vòng lặp + khoá chống chồng lượt.
//
// Vòng đời mỗi nhịp (mặc định 60s):
//   1. node 10-scan-leads.mjs --limit N   → worklist.json   (RẺ, không tốn Claude)
//   2. Không có lead chưa enrich → ngủ tiếp (KHÔNG gọi Claude)
//   3. Có lead → gọi `claude -p` CÔ LẬP chạy skill hmh-AIOS-enrich-ho-so-khach
//      → research web → 30-write-enrich.mjs ghi ngược vào bảng + bật cờ "Đã enrich"
//   4. (tuỳ chọn — mặc định TẮT) Báo 1 dòng tổng kết vào nhóm Lark; bật bằng ENRICH_NOTIFY=1.
//      Card báo sale từng khách (40-notify-sale.mjs) KHÔNG bị ảnh hưởng bởi cờ này.
//
// Chống trùng: cờ "Đã enrich" trong Base (idempotent) + lock file dưới đây.
// Dùng: node enrich-watcher.mjs        (chạy nền, không tự thoát)
//       node enrich-watcher.mjs --once (chạy đúng 1 lượt rồi thoát — để test)

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAIN_ROOT = path.resolve(__dirname, "..", "..", "..", "..");   // gốc thư mục làm việc
const LOG_DIR = path.join(__dirname, "logs");
const PID_FILE = path.join(__dirname, "enrich-watcher.pid");
const ONCE = process.argv.includes("--once");

const INTERVAL_MS = Number(process.env.ENRICH_INTERVAL_MS || 60000);
const MAX_LEADS = Number(process.env.ENRICH_MAX || 10);
const CLAUDE_TIMEOUT_MS = Number(process.env.ENRICH_TIMEOUT_MS || 1800000); // 30 phút/lượt
const NOTIFY = process.env.ENRICH_NOTIFY === "1";
const isWin = process.platform === "win32";

// Webhook báo tiến độ. Thứ tự ưu tiên (máy nào cũng chạy được, không gắn cứng vào 1 máy):
//   1) biến môi trường LARK_WEBHOOK
//   2) NOTIFY_WEBHOOK trong scripts/config.env
//   3) .env của bridge Lark nếu máy đó có (chỉ đúng với máy đã cài bridge)
function readEnvValue(file, key) {
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`));
      if (m) return m[1].replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  return "";
}
const WEBHOOK = process.env.LARK_WEBHOOK
  || readEnvValue(path.join(__dirname, "config.env"), "NOTIFY_WEBHOOK")
  || readEnvValue(path.join(BRAIN_ROOT, "output", "2026-06-14-cau-noi-lark-claude", ".env"), "LARK_WEBHOOK");

const stamp = () => new Date(Date.now() + 7 * 3600e3).toISOString().replace("T", " ").slice(0, 19); // GMT+7
function log(...x) {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
  const line = `[${stamp()}] ${x.join(" ")}`;
  console.log(line);
  try { fs.appendFileSync(path.join(LOG_DIR, `enrich-${stamp().slice(0, 10)}.log`), line + "\n"); } catch {}
}

async function notify(text) {
  if (!NOTIFY || !WEBHOOK) return;
  try {
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg_type: "text", content: { text } }),
    });
  } catch (e) { log("notify lỗi:", e.message); }
}

// ── BÁO ĐỘNG SỰ CỐ ────────────────────────────────────────────────────────────
// Khác `notify` (thông báo thường, tắt được bằng ENRICH_NOTIFY=0): đây là báo hỏng hệ
// nên LUÔN gửi. Bài học 13–17/08: hệ hỏng 4 ngày mà không ai biết vì chẳng có kênh nào kêu.
// Rơi về SALE_WEBHOOK trong config.env nếu không có webhook riêng.
// Chống spam: mỗi loại sự cố chỉ kêu 1 lần/giờ (gateway spawn 1 tiến trình mỗi lead).
const EXIT_SESSION_DEAD = 2;   // khớp với mã thoát của 20-lookup-zalo.mjs (_zalo.mjs)
const EXIT_RATE_LIMITED = 3;
const ALERT_WEBHOOK = WEBHOOK || readEnvValue(path.join(__dirname, "config.env"), "SALE_WEBHOOK");
const ALERT_STAMP = path.join(__dirname, ".alert-stamp.json");
const ALERT_QUIET_MS = Number(process.env.ENRICH_ALERT_QUIET_MS || 60 * 60 * 1000);

async function baoDong(text, loai = "zalo-session") {
  try {
    const stamps = JSON.parse(fs.readFileSync(ALERT_STAMP, "utf8"));
    if (Date.now() - Number(stamps[loai] || 0) < ALERT_QUIET_MS) {
      log("  (đã báo động gần đây → không gửi lại)");
      return;
    }
  } catch { /* chưa có file → cứ báo */ }
  if (!ALERT_WEBHOOK) { log("⚠ không có webhook để báo động"); return; }
  try {
    await fetch(ALERT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg_type: "text", content: { text } }),
    });
    let stamps = {};
    try { stamps = JSON.parse(fs.readFileSync(ALERT_STAMP, "utf8")); } catch {}
    stamps[loai] = Date.now();
    fs.writeFileSync(ALERT_STAMP, JSON.stringify(stamps));
    log("  ⚠ đã bắn báo động vào Lark");
  } catch (e) { log("báo động lỗi:", e.message); }
}

// ⚠️ Vì sao phải taskkill /T và phải có chốt hạ (phát hiện khi thử chế độ mềm 08/09/2026):
// spawn dùng shell:true trên Windows nên tiến trình con là cmd.exe, còn `claude` là tiến trình
// CHÁU. `p.kill()` chỉ giết cmd.exe — đứa cháu sống tiếp, giữ stdout, sự kiện 'close' không bao
// giờ bắn ⇒ Promise treo vĩnh viễn ⇒ watcher đứng im, ôm luôn enrich.lock 45 phút mà không kêu
// một tiếng nào. Đo thật: một lượt treo 5 phút liền, phải kill tay mới thoát.
//   · `taskkill /T /F` giết cả cây tiến trình.
//   · Chốt hạ resolve cưỡng bức sau đó 15s, để dù cây tiến trình có cứng đầu thì lượt vẫn
//     kết thúc, nhả khoá và ghi log — thà báo lỗi còn hơn đứng im.
function run(cmd, args, { cwd, timeoutMs, input, env } = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, shell: isWin, windowsHide: true, env: { ...process.env, ...(env || {}) } });
    let out = "", err = "", xong = false;
    const ketThuc = (r) => {
      if (xong) return;
      xong = true;
      clearTimeout(timer); clearTimeout(chotHa);
      resolve(r);
    };
    const timer = setTimeout(() => {
      try {
        if (isWin && p.pid) spawn("taskkill", ["/PID", String(p.pid), "/T", "/F"], { windowsHide: true });
        else p.kill();
      } catch {}
    }, timeoutMs || 120000);
    const chotHa = setTimeout(() => {
      ketThuc({ code: -2, stdout: out, stderr: err + "\n[watcher] quá giờ, không kết thúc được tiến trình con — bỏ lượt." });
    }, (timeoutMs || 120000) + 15000);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => ketThuc({ code, stdout: out, stderr: err }));
    p.on("error", (e) => ketThuc({ code: -1, stdout: out, stderr: String(e.message) }));
    if (input != null) { try { p.stdin.write(input); p.stdin.end(); } catch {} }
  });
}

const PROMPT = [
  "Chạy skill hmh-AIOS-enrich-ho-so-khach ở CHẾ ĐỘ TỰ ĐỘNG, KHÔNG hỏi lại, KHÔNG chờ xác nhận.",
  "Đã có sẵn .claude/skills/hmh-AIOS-enrich-ho-so-khach/scripts/worklist.json (watcher vừa quét)",
  "VÀ scripts/zalo.json (kết quả tra Zalo theo SĐT — ĐỌC TRƯỚC, đây là nguồn chắc nhất:",
  "zalo_name = tên thật, status = nghề/chức danh tự khai).",
  "QUAN TRỌNG khi đọc zalo.json — chỉ có HAI cách hiểu hợp lệ:",
  "  · found:true            → khách có Zalo, dùng tên thật + status làm mỏ neo.",
  "  · found:false KHÔNG kèm 'error' → CLI khẳng định SĐT không có Zalo → nghi số ảo.",
  "  · found:false CÓ kèm 'error' (SESSION_DEAD/RATE_LIMITED/EMPTY/LOOKUP_FAILED)",
  "    → KHÔNG BIẾT. TUYỆT ĐỐI không được viết 'SĐT không có Zalo' vào hồ sơ,",
  "      không dùng nó để hạ Chất lượng data, không suy ra số ảo. Ghi 'Chưa tra được Zalo'.",
  "Với MỖI lead trong to_research: research theo references/waterfall-research-sop.md,",
  "TRUNG THỰC, thà 'Chưa rõ' còn hơn bịa. ĐI ĐỦ 5 CỬA trước khi kết luận — bỏ cửa nào là kết án oan khách:",
  "  1. Zalo theo SĐT (zalo.json); có thì khai thác tên thật + status nghề.",
  "  2. ĐỌC PHẦN TÊN EMAIL (trước dấu @): người Việt hay tự khai nghề/thương hiệu/địa bàn ở đó",
  "     — dangkiemanphu=đăng kiểm, minstudio088=studio, minhhuongtanlachb=Tân Lạc Hoà Bình.",
  "     GMAIL KHÔNG CÓ NGHĨA LÀ BỎ QUA EMAIL. Đây là manh mối, không phải kết luận.",
  "  3. WebSearch \"<SĐT>\" (đặt trong ngoặc kép).",
  "  4. WebSearch \"<địa chỉ email>\" — BƯỚC HAY BỊ BỎ SÓT NHẤT; email là chuỗi DUY NHẤT nên",
  "     ra kết quả là chắc chắn đúng người, không dính bẫy trùng tên.",
  "  5. masothue tra theo SĐT trước, tên doanh nghiệp sau; họ tên người chỉ để tham khảo.",
  "Chỉ nhận kết quả web khi KHỚP CHÉO (tên + ngành + địa bàn); tên gần giống KHÔNG được coi là trùng.",
  "masothue ra >=2 người trùng tên = CỜ ĐỎ, CẤM gán MST nào cho khách, ghi 'có N người trùng tên'.",
  "WebSearch là index MỸ, yếu với dữ liệu Việt Nam: RỖNG KHÔNG CÓ NGHĨA LÀ KHÔNG TỒN TẠI.",
  "  Rỗng thì ghi 'chưa tra được bằng Google Việt Nam', TUYỆT ĐỐI không ghi 'không có thông tin'.",
  "CHƯA đi hết 5 cửa thì CHƯA được ghi 'Rác' hoặc 'Độ tin cậy: Thấp'.",
  "Chạy SONG SONG: mỗi lead một sub-agent general-purpose (Agent tool), gom kết quả lại.",
  "Mỗi lead phải ra ĐỦ: record_id, chatluong, co_kd, nganhnghe, dkkd, tincay, nguon,",
  "hoso (6 dòng có nhãn NGHỀ/CHỨC DANH · DOANH NGHIỆP · QUY MÔ & ĐỊA BÀN · TỪNG LÀM ·",
  "DẤU VẾT ONLINE · NHU CẦU SUY RA — thiếu data thì ghi 'Chưa rõ'),",
  "goctuvan (MỞ LỜI: … | ĐÒN BẨY: … | RÀO CẢN: … | GÓI PHÙ HỢP: …), link (các URL cách nhau ' · ').",
  "Với mỗi lead trong junk: đánh dấu Chất lượng data = Rác.",
  "Gom tất cả thành output/<YYYY-MM-DD>-enrich-salepage/results.json rồi chạy:",
  "node .claude/skills/hmh-AIOS-enrich-ho-so-khach/scripts/30-write-enrich.mjs <đường-dẫn-results.json>",
  "Ghi 1 dòng vào log.md. Cuối cùng in ĐÚNG 1 dòng: ENRICH_DONE <số lead đã ghi>.",
].join("\n");

// Phần dặn THÊM khi Zalo không dùng được (chế độ mềm — chốt 08/09/2026).
// Mục tiêu: sale vẫn có hồ sơ để gọi, nhưng tuyệt đối không được lấp chỗ trống bằng suy đoán.
const PROMPT_MEM = [
  "",
  "⚠️ LƯỢT NÀY CHẠY Ở CHẾ ĐỘ MỀM — ZALO KHÔNG DÙNG ĐƯỢC.",
  "zalo.json lượt này KHÔNG có giá trị: mọi lead đều thiếu mỏ neo mạnh nhất.",
  "  · TUYỆT ĐỐI KHÔNG viết 'SĐT không có Zalo', không suy ra số ảo, không vì thế mà hạ Chất lượng data.",
  "  · Cửa 1 (Zalo) coi như ĐÓNG. Bù lại phải đi thật kỹ cửa 2 (đọc tên email), 3, 4 (WebSearch",
  "    theo SĐT và theo email) và 5 (masothue) — đừng bỏ cuộc sớm vì thiếu Zalo.",
  "  · Dòng NGHỀ/CHỨC DANH nếu không có căn cứ thì ghi 'Chưa rõ — chưa tra được Zalo', KHÔNG đoán.",
  "  · tincay: tối đa 'Trung bình' (chỉ khi khớp chéo được ít nhất 2 nguồn web); còn lại để 'Thấp'.",
  "  · chatluong: KHÔNG được ghi 'Rác' chỉ vì thiếu thông tin — chưa đi hết 4 cửa còn lại thì chưa kết án.",
  "  · goctuvan phải mở đầu bằng: 'HỒ SƠ TẠM (chưa tra được Zalo) — ' rồi mới tới MỞ LỜI.",
  "Lệnh ghi giữ nguyên; biến môi trường ENRICH_HO_SO_MEM=1 đã được đặt sẵn nên 30-write-enrich.mjs",
  "sẽ tự KHÔNG tick cờ 'Đã enrich' — hệ sẽ tra lại lead này khi Zalo sống. Đừng tự tick bằng cách khác.",
].join("\n");

let busy = false;

// ── KHOÁ LIÊN TIẾN TRÌNH ──────────────────────────────────────────────────────
// Biến `busy` chỉ chặn chồng lượt TRONG một tiến trình. Nhưng gateway spawn một
// tiến trình MỚI cho mỗi cú POST /hook/lead-new — 5 lead về cùng lúc = 5 tiến trình
// cùng ghi đè worklist.json/zalo.json và cùng gọi Claude. Nên phải khoá bằng file.
const LOCK_FILE = path.join(__dirname, "enrich.lock");
const LOCK_STALE_MS = Number(process.env.ENRICH_LOCK_STALE_MS || 45 * 60 * 1000);

function lockAlive() {
  try {
    const raw = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
    if (Date.now() - Number(raw.at || 0) > LOCK_STALE_MS) return false;   // khoá mồ côi
    try { process.kill(Number(raw.pid), 0); return true; }                 // tiến trình còn sống
    catch (e) { return e.code === "EPERM"; }
  } catch { return false; }
}
const acquireLock = () => { try { fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, at: Date.now() })); return true; } catch { return false; } };
const releaseLock = () => { try { fs.unlinkSync(LOCK_FILE); } catch { /* đã bị xoá */ } };

// ── SỔ HỒ SƠ MỀM ──────────────────────────────────────────────────────────────
// Chốt 08/09/2026: Zalo hỏng thì ĐỪNG đứng cả dây chuyền — vẫn dựng hồ sơ từ
// email + Google VN để sale có cái mà gọi, nhưng KHÔNG tick "Đã enrich" để còn tra lại.
//
// Hệ quả phải xử lý: lead không tick cờ thì lượt sau `10-scan-leads` lại nhặt lên,
// và nếu Zalo vẫn hỏng thì cứ thế gọi Claude lại mãi trên cùng một lead — đốt tiền vô hạn.
// Nên phải có sổ này: đã dựng hồ sơ mềm cho ai rồi thì THÔI, chờ Zalo sống lại mới làm tiếp.
// Zalo sống lại ⇒ xoá sổ ⇒ những lead đó vào hàng chờ như bình thường và được ghi đè đầy đủ.
const MEM_FILE = path.join(__dirname, "ho-so-mem.json");
const docSoMem = () => { try { return JSON.parse(fs.readFileSync(MEM_FILE, "utf8")); } catch { return {}; } };
function ghiSoMem(ids, lyDo) {
  const so = docSoMem();
  for (const id of ids) so[id] = { at: Date.now(), ly_do: lyDo };
  try { fs.writeFileSync(MEM_FILE, JSON.stringify(so, null, 1)); } catch {}
}

async function tick() {
  if (busy) return;
  if (lockAlive()) { log("· có lượt khác đang chạy → bỏ qua nhịp này"); return; }
  busy = true;
  acquireLock();
  try {
    const scan = await run("node", ["10-scan-leads.mjs", "--limit", String(MAX_LEADS)],
      { cwd: __dirname, timeoutMs: 180000 });
    if (scan.code !== 0) { log("✖ scan lỗi:", String(scan.stderr || "").slice(-300)); return; }

    let n = 0, j = 0;
    try {
      const wl = JSON.parse(fs.readFileSync(path.join(__dirname, "worklist.json"), "utf8"));
      n = (wl.to_research || []).length; j = (wl.junk || []).length;
    } catch {}
    if (n + j <= 0) return;   // không có lead mới → KHÔNG gọi Claude

    // Tầng B0 — tra Zalo theo SĐT (rẻ, không tốn Claude, chính xác vì khớp đúng số khách khai).
    // Ra tên thật + status nghề nghiệp + xác thực SĐT sống/ảo → làm mồi cho research tầng sau.
    //
    // ⚠️ CỔNG CHẶN (thêm 17/08/2026 sau sự cố 4 ngày): mã thoát 2 = PHIÊN ZALO CHẾT.
    // Trước đây watcher "bỏ qua, vẫn research tiếp" — chính câu đó đã để hệ chạy tiếp
    // với zalo.json toàn found:false, khiến Claude mất mỏ neo và ghép nhầm người hàng loạt.
    // Nay: phiên hỏng ⇒ DỪNG LƯỢT, KHÔNG gọi Claude (khỏi đốt tiền để sản xuất hồ sơ sai),
    // báo động đỏ vào Lark, và KHÔNG bật cờ "Đã enrich" nên lead vẫn nằm chờ, chạy lại được.
    // ZALO_DELAY_MS: giãn nhịp tra Zalo (VPS mới đăng nhập hay bị RATE_LIMITED; 18/09/2026 đặt 8000 trên VPS).
    const zl = await run("node", ["20-lookup-zalo.mjs", "--delay", String(process.env.ZALO_DELAY_MS || 2000)], { cwd: __dirname, timeoutMs: 900000 });

    // CHẾ ĐỘ MỀM: Zalo hỏng thì đi tiếp bằng email + Google VN, KHÔNG tick cờ.
    // Luật sống còn giữ nguyên từ sự cố 13–17/08: không được dịch lỗi hạ tầng thành
    // đặc điểm của khách. Nên hồ sơ mềm phải ghi "Chưa tra được Zalo", cấm ghi "số ảo".
    let hoSoMem = false;
    if (zl.code === EXIT_SESSION_DEAD || zl.code === EXIT_RATE_LIMITED) {
      const chet = zl.code === EXIT_SESSION_DEAD;
      hoSoMem = true;

      // Lọc bỏ lead đã dựng hồ sơ mềm ở lượt trước — nếu không sẽ research lại vô hạn.
      const so = docSoMem();
      const wlPath = path.join(__dirname, "worklist.json");
      let conLai = [];
      try {
        const wl = JSON.parse(fs.readFileSync(wlPath, "utf8"));
        conLai = (wl.to_research || []).filter((l) => !so[l.record_id]);
        wl.to_research = conLai;
        wl.junk = (wl.junk || []).filter((l) => !so[l.record_id]);
        fs.writeFileSync(wlPath, JSON.stringify(wl, null, 2));
        n = conLai.length; j = wl.junk.length;
      } catch {}

      if (n + j <= 0) {
        log(`· Zalo hỏng (${chet ? "phiên chết" : "bị chặn"}) — ${Object.keys(so).length} lead đã có hồ sơ tạm, chờ Zalo sống để tra lại.`);
        return;
      }

      log(`⚠ ${chet ? "PHIÊN ZALO CHẾT" : "ZALO KHÔNG TRA ĐƯỢC"} → chạy CHẾ ĐỘ MỀM cho ${n} lead (email + Google VN, không tick cờ).`);
      await baoDong(
        (chet ? "🟡 ZALO KHÔNG DÙNG ĐƯỢC — enrich chuyển CHẾ ĐỘ MỀM\n" : "🟡 ZALO KHÔNG TRA ĐƯỢC — enrich chuyển CHẾ ĐỘ MỀM\n") +
        `${n} lead vẫn được dựng hồ sơ từ email + Google Việt Nam để sale có cái mà gọi.\n` +
        "Hồ sơ ghi rõ \"Chưa tra được Zalo\", KHÔNG đánh dấu đã xử lý — hệ sẽ tự tra lại và ghi đè khi Zalo sống.\n" +
        (chet ? "Khắc phục để có hồ sơ đầy đủ: chạy `node 21-zalo-login-qr.mjs` trên máy chạy watcher rồi quét QR."
              : "Khắc phục: chờ Zalo mở lại (thường vài giờ), rồi giãn nhịp tra."),
        chet ? "zalo-session" : "zalo-ratelimit"
      );
    } else {
      if (zl.code !== 0) log("⚠ tra Zalo lỗi (bỏ qua, vẫn research tiếp):", String(zl.stderr || "").slice(-200));
      else log("  " + String(zl.stdout || "").split("\n").filter(s => s.includes("Có Zalo")).join(" "));

      // Zalo sống lại → xoá sổ mềm để những lead hồ sơ tạm được tra lại đầy đủ,
      // và gỡ cờ "Đã báo sale" để sale nhận card MỚI thay cho card tạm trước đó.
      const so = docSoMem();
      const ids = Object.keys(so);
      if (ids.length) {
        log(`  Zalo sống lại → ${ids.length} lead hồ sơ tạm sẽ được tra lại đầy đủ.`);
        try {
          const { loadConfig, updateRecord } = await import("./_lib.mjs");
          const cfg = loadConfig();
          for (const id of ids) {
            try { updateRecord(cfg, id, { [cfg.F_DA_BAO_SALE]: false }); } catch {}
          }
        } catch (e) { log("  ⚠ không gỡ được cờ báo sale:", e.message); }
        try { fs.unlinkSync(MEM_FILE); } catch {}
      }
    }

    log(`▶ ${n} lead cần research + ${j} rác → gọi Claude…${hoSoMem ? " (CHẾ ĐỘ MỀM)" : ""}`);
    const r = await run("claude",
      ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--model", "sonnet"],
      {
        cwd: BRAIN_ROOT, timeoutMs: CLAUDE_TIMEOUT_MS,
        input: hoSoMem ? PROMPT + "\n" + PROMPT_MEM : PROMPT,
        env: hoSoMem ? { ENRICH_HO_SO_MEM: "1" } : undefined,
      });

    let done = "";
    try {
      const jr = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
      const m = String(jr.result || "").match(/ENRICH_DONE\s+(\d+)/);
      if (m) done = m[1];
    } catch {}
    log(`✔ xong lượt${done ? ` — ${done} lead` : ""}${r.code !== 0 ? ` (exit ${r.code})` : ""}`);
    if (!done && r.code !== 0) log("  stderr:", String(r.stderr || "").slice(-300));

    // Ghi sổ hồ sơ mềm SAU khi Claude ghi xong, để lượt sau không research lại cùng lead.
    if (hoSoMem) {
      try {
        const wl = JSON.parse(fs.readFileSync(path.join(__dirname, "worklist.json"), "utf8"));
        const ids = [...(wl.to_research || []), ...(wl.junk || [])].map((l) => l.record_id).filter(Boolean);
        ghiSoMem(ids, zl.code === EXIT_SESSION_DEAD ? "phiên Zalo chết" : "Zalo không tra được");
        log(`  ghi sổ hồ sơ tạm: ${ids.length} lead (sẽ tra lại khi Zalo sống)`);
      } catch (e) { log("  ⚠ không ghi được sổ hồ sơ tạm:", e.message); }
    }

    // Báo sale: mỗi khách vừa có hồ sơ = 1 card riêng vào nhóm. Cờ "Đã báo sale" lo chống trùng.
    // Ở chế độ mềm phải truyền cờ, vì hồ sơ tạm không có "Đã enrich" nên bộ lọc mặc định bỏ qua.
    const nt = await run("node", ["40-notify-sale.mjs", "--limit", String(MAX_LEADS), ...(hoSoMem ? ["--ho-so-mem"] : [])],
      { cwd: __dirname, timeoutMs: 300000 });
    const m2 = String(nt.stdout || "").match(/Đã báo sale:\s*(\d+)/);
    log(`  báo sale: ${m2 ? m2[1] : "?"} khách${nt.code !== 0 ? ` (lỗi: ${String(nt.stderr || "").slice(-160)})` : ""}`);

    await notify(`🔎 Đã dựng hồ sơ ${done || "?"} khách mới từ salepage (bảng đăng ký).`);
  } catch (e) {
    log("✖ lỗi:", e.message);
  } finally {
    releaseLock();
    busy = false;
  }
}

try { fs.writeFileSync(PID_FILE, String(process.pid)); } catch {}
log(`Enrich-watcher BẬT — quét mỗi ${Math.round(INTERVAL_MS / 1000)}s, tối đa ${MAX_LEADS} lead/lượt. PID ${process.pid}`);

if (ONCE) { await tick(); process.exit(0); }
await tick();
setInterval(() => { tick().catch(() => {}); }, INTERVAL_MS);
