// hook-lead-new.snippet.mjs — đoạn route để DÁN vào gateway HTTP Node sẵn có của bạn.
//
// Nhiệm vụ: nhận cú bắn từ Lark Base Automation khi có lead mới → chạy một lượt dựng hồ sơ
// ở chế độ nền → trả 200 NGAY (Lark không phải chờ 8 phút).
//
// Không có gateway? Bỏ qua file này, dùng Cách A trong HUONG-DAN-KHACH.md
// (`node enrich-watcher.mjs` canh theo vòng 60 giây).

import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// Sửa đường dẫn cho khớp nơi bạn đặt skill:
const ENRICH_ONCE = resolve(BRAIN_ROOT, '.claude', 'skills', 'hmh-AIOS-enrich-ho-so-khach', 'scripts', 'enrich-watcher.mjs');
const HOOK_LEAD_LOG = resolve(DATA_DIR, 'hook-lead-new.jsonl');

// ─── Dán khối này vào chỗ xử lý request của gateway ──────────────────────────
// Script tự quét bảng nên KHÔNG phụ thuộc nội dung body; bắn trùng vô hại nhờ
// cờ "Đã enrich" trong Base + khoá enrich.lock giữa các tiến trình.
if (req.method === 'POST' && path === '/hook/lead-new') {
  const body = await readBody(req);
  const received_at = new Date(Date.now() + 7 * 3600e3).toISOString().replace('T', ' ').slice(0, 19); // GMT+7
  try { appendFileSync(HOOK_LEAD_LOG, JSON.stringify({ received_at, ...(body || {}) }) + '\n'); } catch { /* log lỗi không chặn */ }

  let started = false;
  try {
    const c = spawn(process.execPath, [ENRICH_ONCE, '--once'], {
      cwd: dirname(ENRICH_ONCE), detached: true, stdio: 'ignore', windowsHide: true,
    });
    c.unref();          // tách hẳn khỏi gateway — lượt chạy 8 phút không giữ kết nối HTTP
    started = true;
  } catch { started = false; }

  return send(res, 200, { ok: true, hook: 'lead-new', received_at, dispatched: started });
}
