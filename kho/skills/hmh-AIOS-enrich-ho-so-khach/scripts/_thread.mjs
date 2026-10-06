// _thread.mjs — Tìm tin gốc của Base Assistant trong nhóm rồi TRẢ LỜI TRONG CHUỖI (thread).
//
// Vì sao: mỗi lead về, Base Assistant đã bắn một card "Data <nguồn> | <tên>" vào nhóm.
// Nếu hồ sơ khách lại là một tin RỜI nữa thì nhóm dài gấp đôi và sale phải tự ghép cặp.
// Trả lời trong chuỗi → hồ sơ nằm gọn ngay dưới đúng lead đó, nhóm chỉ còn 1 dòng thông báo.
//
// Khớp lead ↔ tin gốc bằng SỐ ĐIỆN THOẠI (đã chuẩn hoá) — trường duy nhất luôn có và không trùng.
// Không có SĐT thì khớp bằng email. Không khớp được → trả null để gọi tự rơi về webhook.

import { lark, normPhone } from "./_lib.mjs";

const RX_PHONE = /Số điện thoại:\s*([+\d][\d\s.\-()]{6,})/i;
const RX_EMAIL = /Email:\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i;

// Quét lịch sử nhóm (mới → cũ) → { byPhone: Map, byEmail: Map } trỏ tới message_id tin gốc.
// Chỉ nhận tin do APP gửi và có dòng "Số điện thoại:" — đó là chữ ký của card Base Assistant.
export function scanAnchors(cfg) {
  const byPhone = new Map();
  const byEmail = new Map();
  const pages = Number(cfg.THREAD_SCAN_PAGES || 6);
  let token = "";
  for (let p = 0; p < pages; p++) {
    const args = [
      "im", "+chat-messages-list",
      "--chat-id", cfg.SALE_CHAT_ID,
      "--as", cfg.IDENTITY || "user",
      "--format", "json",
      "--order", "desc",
      "--page-size", "50",
      "--no-reactions",
    ];
    if (token) args.push("--page-token", token);
    let env;
    try { env = JSON.parse(lark(args)); } catch { break; }
    const data = env.data || {};
    for (const m of data.messages || []) {
      if (m.deleted) continue;
      if (m.sender?.sender_type !== "app") continue;
      const c = String(m.content || "");
      const mp = c.match(RX_PHONE);
      const me = c.match(RX_EMAIL);
      if (!mp && !me) continue;                       // không phải card data lead
      const phone = mp ? normPhone(mp[1]) : null;
      const email = me ? me[1].trim().toLowerCase() : "";
      // desc = mới nhất trước → chỉ giữ lần gặp ĐẦU TIÊN (tin gần nhất của khách đó)
      if (phone && !byPhone.has(phone)) byPhone.set(phone, m.message_id);
      if (email && !byEmail.has(email)) byEmail.set(email, m.message_id);
    }
    if (!data.has_more || !data.page_token) break;
    token = data.page_token;
  }
  return { byPhone, byEmail };
}

export function findAnchor(anchors, { phone, email }) {
  const p = normPhone(phone);
  if (p && anchors.byPhone.has(p)) return anchors.byPhone.get(p);
  const e = String(email || "").trim().toLowerCase();
  if (e && anchors.byEmail.has(e)) return anchors.byEmail.get(e);
  return null;
}

// Trả lời card vào chuỗi của tin gốc. Thử --as bot trước (tin hiện dưới tên app),
// bot không ở trong nhóm thì lùi về --as user để hồ sơ vẫn tới được sale.
export function replyCardInThread(cfg, messageId, card, opts = {}) {
  const ids = [];
  const want = (cfg.REPLY_IDENTITY || "bot").toLowerCase();
  ids.push(want);
  if (want !== "user") ids.push("user");
  let lastErr = "";
  for (const as of ids) {
    const args = [
      "im", "+messages-reply",
      "--message-id", messageId,
      "--msg-type", "interactive",
      "--content", JSON.stringify(card),
      "--reply-in-thread",
      "--as", as,
      "--format", "json",
    ];
    if (opts.idempotencyKey) args.push("--idempotency-key", opts.idempotencyKey);
    try {
      const env = JSON.parse(lark(args));
      if (env.ok === false) { lastErr = JSON.stringify(env.error || env).slice(0, 200); continue; }
      return { ok: true, as, message_id: env.data?.message_id || "" };
    } catch (e) {
      lastErr = String(e.stdout || e.message || e).slice(0, 200);
    }
  }
  return { ok: false, error: lastErr };
}
