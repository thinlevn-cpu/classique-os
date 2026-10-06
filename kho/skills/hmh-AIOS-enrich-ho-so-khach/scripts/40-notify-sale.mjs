// 40-notify-sale.mjs — BÁO SALE: mỗi khách đã có hồ sơ = MỘT card riêng gửi vào nhóm Lark.
//
// Vì sao mỗi khách một tin: sale mở nhóm là đọc được ngay hồ sơ của đúng một người rồi bấm
// gọi/mở bản ghi — không phải dò trong một bản tổng hợp dài.
//
// Chống gửi trùng bằng cột checkbox "Đã báo sale" (không dùng thời gian) → chạy lại vô hại.
// Điều kiện gửi: "Đã enrich" = true VÀ "Đã báo sale" trống.
//
// Dùng:  node 40-notify-sale.mjs [--limit N] [--dry] [--only-kd] [--mark-all]
//   --dry       chỉ in ra, KHÔNG gửi, KHÔNG tick cờ
//   --limit N   nhiều nhất N khách trong lượt này (mặc định 20)
//   --only-kd   chỉ gửi khách "Có kinh doanh" = Có
//   --mark-all  KHÔNG gửi gì, chỉ tick cờ "Đã báo sale" cho toàn bộ record đang chờ
//               (dùng một lần để bỏ qua tồn kho cũ, từ đó chỉ báo khách mới)

import { loadConfig, listAllRecords, updateRecord, cellText } from "./_lib.mjs";
import { scanAnchors, findAnchor, replyCardInThread } from "./_thread.mjs";

const cfg = loadConfig();
const argHas = (f) => process.argv.includes(f);
const argVal = (f, d) => { const i = process.argv.indexOf(f); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DRY = argHas("--dry");
const ONLY_KD = argHas("--only-kd");
const MARK_ALL = argHas("--mark-all");
const LIMIT = Number(argVal("--limit", 20));
// Card gọn: bật bằng cờ --gon hoặc CARD_GON=true trong config.env
const CARD_GON = argHas("--gon") || String(cfg.CARD_GON || "").toLowerCase() === "true";
// --xem: in nội dung card ra màn hình để duyệt trước, KHÔNG gửi, KHÔNG tick cờ
const PREVIEW = argHas("--xem");

const one = (v) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));
const txt = (v) => cellText(one(v)).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Màu tiêu đề card theo mức đáng chăm: khách có kinh doanh nổi bật nhất.
function headerColor(chatluong, coKd) {
  if (chatluong === "Rác") return "grey";
  if (coKd === "Có") return "green";
  if (chatluong === "Lead thật") return "blue";
  return "orange";
}

function buildCard(f, recordId) {
  const ten = txt(f[cfg.F_HOTEN]) || "(không tên)";
  const sdt = txt(f[cfg.F_SDT]) || "—";
  const email = txt(f[cfg.F_EMAIL]) || "—";
  const chatluong = txt(f[cfg.F_CHATLUONG]);
  const coKd = txt(f[cfg.F_CO_KD]);
  const nganh = txt(f[cfg.F_NGANHNGHE]) || "Chưa rõ";
  const dkkd = txt(f[cfg.F_DKKD]);
  const tincay = txt(f[cfg.F_TINCAY]);
  const hoso = txt(f[cfg.F_HOSO]) || "(chưa có)";
  const goc = txt(f[cfg.F_GOCTUVAN]);
  const link = txt(f[cfg.F_LINK]);
  const trangThai = txt(f["Trạng thái TT"]);
  const hangVe = txt(f["Hạng vé"]);
  const ghiChu = txt(f[cfg.F_GHICHU]);
  const nguon = txt(f[cfg.F_NGUON]);

  // Hồ sơ mềm = dựng khi Zalo hỏng, chưa tick "Đã enrich". Sale phải nhìn ra ngay là hồ sơ
  // này mỏng, đừng đọc như hồ sơ đầy đủ — nhất là chỗ "chưa rõ" (thiếu tin, không phải khách rác).
  const laMem = f[cfg.F_DA_ENRICH] !== true;

  const badge = [coKd === "Có" ? "🟢 CÓ KINH DOANH" : "", chatluong, tincay ? `tin cậy ${tincay}` : "",
    laMem ? "⏳ HỒ SƠ TẠM" : ""].filter(Boolean).join(" · ");

  const lines = [
    ...(laMem ? ["⏳ *Hồ sơ tạm — chưa tra được Zalo. Sẽ tự tra lại và cập nhật khi Zalo sống.*", ""] : []),
    `**📞 ${sdt}**${trangThai ? `  ·  ${trangThai}` : ""}${hangVe ? `  ·  ${hangVe}` : ""}`,
    `✉️ ${email}${nguon ? `  ·  nguồn: ${nguon}` : ""}`,
    `🏷️ **Ngành:** ${nganh}${dkkd && dkkd !== "Không tìm thấy công khai" ? `  ·  ĐKKD: ${dkkd}` : ""}`,
  ];
  // Card gọn: chỉ 3 dòng nhận diện + nút mở bản ghi (hồ sơ đầy đủ & góc tư vấn đọc trong Base).
  // Dùng khi muốn nhóm ngắn lại mà vẫn giữ thông báo cho từng khách.
  if (!CARD_GON) {
    lines.push("", "**HỒ SƠ**", hoso);
    if (goc) lines.push("", "**GÓC TƯ VẤN**", goc);
    if (ghiChu) lines.push("", `**Sale đã ghi:** ${ghiChu}`);
    if (link) lines.push("", `🔗 ${link}`);
  } else if (hoso && hoso !== "(chưa có)") {
    const dong1 = hoso.split("\n").find((l) => /^NGHỀ\/CHỨC DANH:/i.test(l.trim()));
    if (dong1) lines.push(dong1.trim());
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      template: headerColor(chatluong, coKd),
      title: { tag: "plain_text", content: `👤 ${ten}` },
      subtitle: { tag: "plain_text", content: badge || "Hồ sơ khách mới" },
    },
    elements: [
      { tag: "div", text: { tag: "lark_md", content: lines.join("\n") } },
      { tag: "hr" },
      {
        tag: "action",
        actions: [{
          tag: "button",
          text: { tag: "plain_text", content: "Mở bản ghi trong Base" },
          type: "primary",
          url: (cfg.BASE_URL || "") + recordId,
        }],
      },
    ],
  };
}

// Gửi tin RỜI vào nhóm (đường lùi khi không tìm thấy tin gốc để trả lời trong chuỗi).
async function send(card) {
  const r = await fetch(cfg.SALE_WEBHOOK, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg_type: "interactive", card }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.code && j.code !== 0) throw new Error(`webhook lỗi ${j.code}: ${j.msg}`);
  return true;
}

if (!cfg.SALE_WEBHOOK) { console.error("Thiếu SALE_WEBHOOK trong config.env"); process.exit(1); }

// ── HỒ SƠ MỀM (08/09/2026) ────────────────────────────────────────────────────
// Hồ sơ dựng khi Zalo hỏng KHÔNG có cờ "Đã enrich" (cố ý, để còn tra lại), nên bộ lọc
// mặc định sẽ bỏ sót đúng những khách mà phương án mềm sinh ra — sale chẳng nhận được gì.
// Cờ này nới điều kiện: có nội dung ở cột "Hồ sơ khách" là đủ để báo.
const HO_SO_MEM = process.env.ENRICH_HO_SO_MEM === "1" || process.argv.includes("--ho-so-mem");
const coHoSo = (r) => r.fields[cfg.F_DA_ENRICH] === true
  || (HO_SO_MEM && txt(r.fields[cfg.F_HOSO]).trim() !== "");

const recs = listAllRecords(cfg);
// --xem: xem thử card của khách ĐÃ báo (không cần chờ lead mới)
let cho = PREVIEW
  ? recs.filter(coHoSo)
  : recs.filter((r) => coHoSo(r) && r.fields[cfg.F_DA_BAO_SALE] !== true);
if (ONLY_KD) cho = cho.filter((r) => txt(r.fields[cfg.F_CO_KD]) === "Có");

console.log(`Đã có hồ sơ: ${recs.filter((r) => r.fields[cfg.F_DA_ENRICH] === true).length} · chờ báo sale: ${cho.length}`
  + `${ONLY_KD ? " (lọc: chỉ khách CÓ kinh doanh)" : ""}${DRY ? " · DRY" : ""}`);

if (MARK_ALL) {
  let n = 0;
  for (const r of cho) {
    if (!DRY) updateRecord(cfg, r.record_id, { [cfg.F_DA_BAO_SALE]: true });
    n++;
  }
  console.log(`✔ Đã đánh dấu ${n} record là "Đã báo sale" (KHÔNG gửi tin nào).`);
  process.exit(0);
}

const lot = cho.slice(0, LIMIT);
if (cho.length > lot.length) console.log(`(lượt này gửi ${lot.length}, còn ${cho.length - lot.length} để lượt sau)`);

// Trả lời TRONG CHUỖI: quét lịch sử nhóm MỘT LẦN cho cả lượt, lấy bản đồ SĐT/email → tin gốc.
const THREAD = String(cfg.REPLY_IN_THREAD || "").toLowerCase() === "true" && !!cfg.SALE_CHAT_ID;
let anchors = { byPhone: new Map(), byEmail: new Map() };
if (THREAD && lot.length) {
  anchors = scanAnchors(cfg);
  console.log(`Chuỗi: quét ${cfg.THREAD_SCAN_PAGES || 6} trang lịch sử → ${anchors.byPhone.size} tin data có SĐT để trả lời vào.`);
}

let ok = 0, fail = 0, inThread = 0, roi = 0;
for (const r of lot) {
  const ten = txt(r.fields[cfg.F_HOTEN]) || r.record_id;
  const anchor = THREAD ? findAnchor(anchors, {
    phone: txt(r.fields[cfg.F_SDT]),
    email: txt(r.fields[cfg.F_EMAIL]),
  }) : null;
  let cach = anchor ? "chuỗi" : "tin rời";
  if (PREVIEW) {
    const card = buildCard(r.fields, r.record_id);
    console.log(`\n──── ${ten} ${CARD_GON ? "(card gọn)" : "(card đầy đủ)"} · gửi kiểu: ${cach} ────`);
    console.log(`👤 ${ten} — ${card.header.subtitle.content}`);
    console.log(card.elements[0].text.content);
    ok++;
    continue;
  }
  try {
    if (!DRY) {
      const card = buildCard(r.fields, r.record_id);
      if (anchor) {
        // idempotency key = record_id → chạy lại cũng không nhân đôi tin trong chuỗi
        const res = replyCardInThread(cfg, anchor, card, { idempotencyKey: `hoso-${r.record_id}` });
        if (res.ok) cach = `chuỗi (${res.as})`;
        else { await send(card); cach = "tin rời (chuỗi lỗi: " + res.error.slice(0, 60) + ")"; }
      } else {
        await send(card);
      }
      updateRecord(cfg, r.record_id, { [cfg.F_DA_BAO_SALE]: true });
      await sleep(700);          // nhịp nhẹ để không bị webhook chặn tần suất
    }
    ok++;
    if (cach.startsWith("chuỗi")) inThread++; else roi++;
    console.log(`  ${DRY ? "(dry) " : "✓ "}${ten} — ${txt(r.fields[cfg.F_NGANHNGHE]) || "chưa rõ ngành"}  [${cach}]`);
  } catch (e) {
    fail++;
    console.error(`  ✗ ${ten}: ${String(e.message || e).slice(0, 160)}`);
  }
}
console.log(`\nĐã báo sale: ${ok} khách (trong chuỗi: ${inThread} · tin rời: ${roi}) · lỗi: ${fail}`);
