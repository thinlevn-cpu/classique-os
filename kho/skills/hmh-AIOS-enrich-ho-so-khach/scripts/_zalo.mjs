// _zalo.mjs — NGUỒN SỰ THẬT DUY NHẤT cho việc gọi & ĐỌC KẾT QUẢ zalo-agent.
//
// Vì sao tách riêng (17/08/2026): logic "kết quả này nghĩa là gì" từng nằm rải rác,
// và mỗi chỗ hiểu một kiểu. Hậu quả thật:
//   · 20-lookup-zalo.mjs (bản cũ): catch rỗng → "Not logged in" thành "khách không có Zalo"
//     → 4 ngày ghép nhầm người, 147 record dính dấu vết.
//   · 90-ra-soat-zalo-hong.mjs (bản đầu): lặp lại y hệt lỗi đó với lỗi rate-limit
//     → báo nhầm "09xxxxxxxx thật sự không có Zalo" trong khi số đó có Zalo (một khách có Zalo thật).
// ⇒ Mọi script muốn tra Zalo PHẢI dùng `traZalo()` ở đây. Không tự viết catch riêng.
//
// LUẬT LÕI: chỉ được kết luận "khách không có Zalo" khi CLI nói rõ điều đó.
// Mọi tình huống khác (chưa đăng nhập, bị chặn, output rỗng, JSON vỡ) = KHÔNG BIẾT,
// và "không biết" thì không được ghi thành đặc điểm của khách hàng.

import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

// Gọi CLI, trả { text } gộp stdout + stderr. KHÔNG ném lỗi — người gọi tự phân loại.
//
// 🚨 VÌ SAO PHẢI LÀ spawnSync, KHÔNG ĐƯỢC execFileSync (sự cố tìm ra 08/09/2026):
//   zalo-agent in MỌI thông báo — kể cả "✗ Find user failed: User không hợp lệ" và
//   "Not logged in" — ra STDERR, rồi vẫn thoát MÃ 0. Mà execFileSync chỉ trả stdout;
//   stderr của nó chỉ lấy được qua nhánh catch, tức là CHỈ KHI lệnh thoát khác 0.
//   ⇒ Với mã thoát 0, mọi thông báo bị vứt sạch, zaloRaw trả chuỗi RỖNG.
//   ⇒ Số khách KHÔNG có Zalo (kết luận hợp lệ) bị đọc thành lỗi "EMPTY",
//     cầu chì an toàn nổ, watcher DỪNG và bắn card đỏ "phiên Zalo hết hạn"
//     trong khi phiên vẫn đang "Logged in as …". Đo thật ngày 08/09: lượt nào có lead
//     mới mà số không có Zalo là lượt đó chết — enrich đứng cả ngày.
//   Chẩn đoán cũ ghi trong file này ("CLI chỉ in lỗi ra TTY thật") là SAI:
//   stderr vẫn qua pipe bình thường, chỉ là execFileSync không đưa nó cho ta.
export function zaloRaw(args) {
  const isWin = process.platform === "win32";
  const opts = { encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 };
  // Ưu tiên chạy thẳng file JS (giữ UTF-8, không bị cmd.exe cắt chuỗi); rơi về .cmd nếu không thấy.
  const js = path.join(process.env.APPDATA || "", "npm", "node_modules", "zalo-agent-cli", "src", "index.js");
  const r = (isWin && fs.existsSync(js))
    ? spawnSync(process.execPath, [js, ...args], opts)
    : isWin
      ? spawnSync("cmd.exe", ["/c", "zalo-agent.cmd", ...args], opts)
      : spawnSync("zalo-agent", args, opts);
  // stdout TRƯỚC stderr: hồ sơ JSON nằm ở stdout, docKetQua() đọc JSON trước tiên.
  return {
    text: String(r.stdout || "") + String(r.stderr || "") + (r.error ? String(r.error.message || "") : ""),
  };
}

// Phân loại kết quả tra MỘT số. Đây là chỗ duy nhất được phép kết luận.
//   { found: true, ... }         → có Zalo thật
//   { found: false }             → CLI nói rõ: SĐT không có Zalo (kết luận hợp lệ về khách)
//   { found: false, error: ... } → KHÔNG kết luận được gì về khách:
//        SESSION_DEAD   chưa đăng nhập        → chạy `zalo-agent login`
//        RATE_LIMITED   Zalo chặn vì tra dày  → nghỉ rồi chạy lại, giãn --delay
//        EMPTY          CLI không trả gì      → thường là hệ quả của rate limit
//        LOOKUP_FAILED  không hiểu được       → xem lại bằng tay
export function docKetQua(text) {
  const t = String(text || "");

  // ① ĐỌC HỒ SƠ JSON TRƯỚC — trước khi dò bất kỳ chuỗi lỗi nào.
  //    Vì sao (sự cố thật 21/08 → 01/09/2026): bản cũ dò lỗi trước, mà mẫu lỗi có
  //    token trần "429". Số uid của khách "1364299125107495954" CHỨA chuỗi "429"
  //    ⇒ một lượt tra THÀNH CÔNG bị đọc thành RATE_LIMITED ⇒ cầu chì watcher ngắt
  //    ⇒ cả tuyến enrich chết 11 ngày mà Zalo vẫn khoẻ. Kết quả tốt phải được
  //    nhận diện trước; chỉ khi KHÔNG có hồ sơ hợp lệ mới đi phân loại lỗi.
  const i = t.indexOf("{");
  if (i >= 0) {
    try {
      const j = JSON.parse(t.slice(i));
      if (j && (j.display_name || j.zalo_name || j.uid)) {
        return {
          found: true,
          zalo_name: j.display_name || j.zalo_name || "",
          status: (j.status || "").replace(/\s*\n\s*/g, " · ").trim(),
          uid: j.uid || "",
          gender: j.gender === 0 ? "Nam" : j.gender === 1 ? "Nữ" : "",
          sdob: j.sdob || "",
          avatar: j.avatar || "",
        };
      }
    } catch { /* JSON vỡ → rơi xuống phần phân loại lỗi */ }
  }

  // ② Không có hồ sơ hợp lệ → mới được phép kết luận là lỗi.
  if (/not logged in|chưa đăng nhập|login required|run:\s*zalo-agent login/i.test(t)) {
    return { found: false, error: "SESSION_DEAD" };
  }
  // Chuỗi tiếng Việt của Zalo khi vượt trần — thiếu dòng này là bịa ra "không có Zalo".
  // "429" phải đứng RIÊNG (không kẹp giữa các chữ số) — xem ghi chú ở ①.
  // TÀI KHOẢN KHÁCH bị Zalo khoá — đây là KẾT LUẬN về số đó, KHÔNG phải ta bị chặn.
  // (sự cố 18/09/2026 trên VPS: số ảo 0999999999 trả "Người dùng này đã bị chặn do vi phạm chính sách
  //  của Zalo" → khớp chữ "bị chặn" của luật rate-limit → cầu chì ngắt cả lượt ngay lead thứ hai.)
  if (/người dùng (này )?(đã )?bị (chặn|khoá|khóa)|tài khoản (này )?(đã )?bị (chặn|khoá|khóa)|account (is )?(blocked|banned|suspended)/i.test(t)) {
    return { found: false, khoa: true };
  }
  // Ta bị Zalo chặn vì tra dày. "bị chặn" ở đây phải đi kèm ngữ cảnh trần request, không nhận câu về khách.
  if (/vượt quá số request|vượt quá số lượng|rate ?limit|too many|(?<![0-9])429(?![0-9])|temporarily blocked|thử lại sau|quá nhanh|(bị chặn|blocked) (tạm thời|temporarily)/i.test(t)) {
    return { found: false, error: "RATE_LIMITED" };
  }

  // CHỈ ở đây mới được kết luận "không có Zalo".
  // Zalo trả nhiều biến thể chữ cho CÙNG một ý "số này không có tài khoản":
  //   "User không hợp lệ" · "Không tìm thấy" (gặp 08/09/2026). Thiếu biến thể nào là
  //   số đó bị xếp nhầm thành lỗi hệ thống ⇒ cầu chì nổ ⇒ cả tuyến enrich đứng.
  if (/user không hợp lệ|user not found|không tìm thấy người dùng|invalid user|user does not exist|find user failed:\s*(không tìm thấy|not found)\s*$/im.test(t)) {
    return { found: false };
  }
  if (!t.trim()) return { found: false, error: "EMPTY" };
  // Chuỗi CLI chưa từng gặp: giữ nguyên văn (cắt ngắn) vào kết quả. Nhờ dòng này mà lần
  // sau chỉ cần mở zalo.json là biết Zalo đổi chữ gì, không phải dựng lại hiện trường.
  return { found: false, error: "LOOKUP_FAILED", raw: t.replace(/\s+/g, " ").trim().slice(0, 200) };
}

// Tra một số điện thoại.
export function traZalo(sdt) {
  return docKetQua(zaloRaw(["--json", "friend", "find", sdt]).text);
}

// Kiểm phiên trước khi chạy cả lô → hỏng thì hỏng ngay từ giây đầu, không tra oan 100 số.
//
// ⚠️ CLI CHỈ IN LỖI RA MÀN HÌNH THẬT (TTY). Đo 04/09/2026: chạy `friend find` khi phiên
// chết, nếu stdout/stderr là pipe thì CLI trả về RỖNG HOÀN TOÀN — dòng
// "✗ Find user failed: Not logged in" chỉ hiện khi gõ tay trong cửa sổ lệnh.
// ⇒ Nhánh SESSION_DEAD trong docKetQua() KHÔNG BAO GIỜ chạm tới từ đường pipe.
// ⇒ Việc phát hiện phiên chết PHẢI dựa vào `status` ở đây, không dựa vào kết quả tra.
export function kiemPhien() {
  const t = zaloRaw(["status"]).text;
  if (/logged in as|✓\s*logged in/i.test(t)) return { ok: true };
  if (/not logged in/i.test(t)) {
    return { ok: false, reason: "SESSION_DEAD", hint: "Chạy: zalo-agent login (quét QR)" };
  }
  // CLI có chạy (in được dòng INFO) mà KHÔNG hề có dòng "Logged in as" ⇒ chưa đăng nhập.
  // Đây là cách phiên hết hạn biểu hiện trên bản CLI hiện tại — im lặng, không báo lỗi.
  if (t.trim()) {
    return { ok: false, reason: "SESSION_DEAD", hint: "Chạy: zalo-agent login (quét QR)" };
  }
  // Không in ra gì cả = CLI không chạy nổi (thiếu Node/hỏng cài đặt) — chuyện khác hẳn.
  return { ok: false, reason: "CLI_KHONG_CHAY", hint: "Chạy tay: zalo-agent status" };
}

export const EXIT_SESSION_DEAD = 2;
export const EXIT_RATE_LIMITED = 3;
