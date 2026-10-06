// 41-bat-tra-loi-trong-chuoi.mjs — Bật "trả lời trong chuỗi" cho nhóm data.
//
// Chạy MỘT LẦN sau khi app đã được phép dùng ở nhóm liên hệ ngoài
// (Developer Console → App release → Version management → 对外共享 →
//  "Cho phép bot được thêm vào nhóm bên ngoài" → phát hành + admin duyệt).
//
// Việc script làm: thêm bot vào nhóm SALE_CHAT_ID → kiểm tra đọc được lịch sử →
// thử reply thẳng vào chuỗi của tin data gần nhất để chắc chắn đường đi thông.
//
// Dùng:  node 41-bat-tra-loi-trong-chuoi.mjs [--app cli_xxx] [--khong-thu]
//   --khong-thu   chỉ thêm bot + kiểm tra, KHÔNG gửi tin thử vào nhóm

import { loadConfig, larkTry } from "./_lib.mjs";
import { scanAnchors, replyCardInThread } from "./_thread.mjs";

const cfg = loadConfig();
const argVal = (f, d) => { const i = process.argv.indexOf(f); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const KHONG_THU = process.argv.includes("--khong-thu");
const APP_ID = argVal("--app", process.env.LARK_APP_ID || cfg.APP_ID || "");
if (!APP_ID) {
  console.error("Thiếu App ID của bot. Truyền --app cli_xxx, hoặc đặt LARK_APP_ID trong biến môi trường,");
  console.error("hoặc thêm dòng APP_ID=cli_xxx vào config.env. Lấy ở Developer Console → App → Credentials.");
  process.exit(1);
}

const goi = (args) => larkTry(args);

if (!cfg.SALE_CHAT_ID) { console.error("Thiếu SALE_CHAT_ID trong config.env"); process.exit(1); }
console.log(`Nhóm: ${cfg.SALE_CHAT_ID} · app: ${APP_ID}`);

// 1) Thêm bot vào nhóm (đã ở trong nhóm thì Lark trả về danh sách rỗng — vô hại)
const them = goi(["im", "chat.members", "create", "--chat-id", cfg.SALE_CHAT_ID,
  "--member-id-type", "app_id", "--data", JSON.stringify({ id_list: [APP_ID] }),
  "--as", "user", "--format", "json"]);
if (them.ok === false) {
  const code = them.error?.code;
  console.error(`✖ Chưa thêm được bot vào nhóm (${code}: ${them.error?.message})`);
  if (code === 232033) {
    console.error("\n→ App chưa được phép dùng ở nhóm liên hệ ngoài. Vào Developer Console:");
    console.error("  App release → Version management and release → Create version →");
    console.error("  mục External sharing (对外共享) → bật 'Cho phép bot được thêm vào nhóm bên ngoài'");
    console.error("  → Save → Apply for release → admin duyệt. Xong chạy lại lệnh này.");
  }
  process.exit(1);
}
console.log("✔ Bot đã ở trong nhóm.");

// 2) Đọc lịch sử → có bắt được tin data để trả lời vào không
const anchors = scanAnchors(cfg);
console.log(`✔ Đọc lịch sử: ${anchors.byPhone.size} tin data có SĐT (đây là các tin sẽ được trả lời vào chuỗi).`);
if (!anchors.byPhone.size) { console.error("✖ Không thấy tin data nào — kiểm tra lại SALE_CHAT_ID."); process.exit(1); }

// 3) Thử reply vào chuỗi của tin data mới nhất
if (KHONG_THU) { console.log("(bỏ qua bước gửi thử)"); process.exit(0); }
const [sdt, mid] = [...anchors.byPhone.entries()][0];
const card = {
  config: { wide_screen_mode: true },
  header: { template: "green", title: { tag: "plain_text", content: "✅ Đã bật trả lời trong chuỗi" } },
  elements: [{ tag: "div", text: { tag: "lark_md", content: `Từ nay hồ sơ khách sẽ nằm ngay trong chuỗi của tin data (khách ${sdt}), không gửi tin rời ra nhóm nữa.` } }],
};
const res = replyCardInThread(cfg, mid, card, { idempotencyKey: `bat-chuoi-${mid}` });
console.log(res.ok
  ? `✔ Gửi thử vào chuỗi OK (danh tính: ${res.as}). Mở nhóm xem tin data của ${sdt} → có chuỗi trả lời.`
  : `✖ Reply vào chuỗi vẫn lỗi: ${res.error}`);
process.exit(res.ok ? 0 : 1);
