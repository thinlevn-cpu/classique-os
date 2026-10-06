#!/usr/bin/env node
/**
 * lib-image.mjs — Nén/giảm kích thước ảnh về mức "web-friendly" bằng ffmpeg.
 *
 * VÌ SAO: máy ảnh / điện thoại xuất ảnh 6-10MB. Trước đây select-article BỎ THẲNG ảnh >5MB
 * (a.size > 5MB) → bài đăng KHÔNG có ảnh (lỗi 20-28/06). Ảnh blog không cần > ~1600px;
 * nén xuống còn vừa upload (Royal MCP base64) VỪA tốt cho tốc độ tải = SEO.
 *
 * Không có sharp/ImageMagick trên máy này; CÓ ffmpeg (winget Gyan.FFmpeg) — đủ để scale + nén JPEG.
 * ffmpeg KHÔNG nằm trên PATH ổn định (không có shim trong WinGet\Links) nên phải tự dò.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let _FFMPEG = undefined;

/**
 * Đổi tên file, chịu lỗi EPERM/EBUSY trên Windows (antivirus giữ handle file tạm sau khi ffmpeg vừa ghi).
 * Thử lại vài nhịp; nếu vẫn kẹt thì fallback copy đè + xoá tmp. Tránh cả pipeline chết vì 1 file bị khoá tạm.
 */
function renameOrCopy(src, dest, tries = 8, delayMs = 200) {
  for (let i = 0; i < tries; i++) {
    try { fs.renameSync(src, dest); return; }
    catch (e) {
      const transient = ['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'].includes(e.code);
      if (!transient) throw e;
      if (i < tries - 1) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs); continue; }
      // Hết lượt thử: copy đè rồi xoá tmp (copyFileSync mặc định ghi đè file đích).
      fs.copyFileSync(src, dest);
      try { fs.unlinkSync(src); } catch { /* ignore */ }
      return;
    }
  }
}

/** Tìm ffmpeg: env FFMPEG_PATH → trên PATH → shim WinGet\Links → glob WinGet\Packages. Trả null nếu không có. */
export function findFfmpeg() {
  if (_FFMPEG !== undefined) return _FFMPEG;
  const tryExe = (exe) => { try { const r = spawnSync(exe, ['-version'], { shell: true, windowsHide: true, encoding: 'utf8' }); return r.status === 0; } catch { return false; } };

  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return (_FFMPEG = process.env.FFMPEG_PATH);
  if (tryExe('ffmpeg')) return (_FFMPEG = 'ffmpeg');

  const home = os.homedir();
  const candidates = [path.join(home, 'AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe')];
  const pkgs = path.join(home, 'AppData\\Local\\Microsoft\\WinGet\\Packages');
  try {
    for (const d of fs.readdirSync(pkgs)) {
      if (!/ffmpeg/i.test(d)) continue;
      const base = path.join(pkgs, d);
      for (const sub of fs.readdirSync(base)) {
        const cand = path.join(base, sub, 'bin', 'ffmpeg.exe');
        if (fs.existsSync(cand)) candidates.push(cand);
      }
    }
  } catch { /* ignore */ }
  for (const c of candidates) if (fs.existsSync(c)) return (_FFMPEG = c);
  return (_FFMPEG = null);
}

/**
 * Nén 1 ảnh về web-friendly (mặc định max 1600px, JPEG ~q3). Ghi đè ngay tại chỗ bằng file .jpg.
 * - Trả { ok, path, filename, before, after, note }.
 * - Nếu ffmpeg KHÔNG có hoặc nén lỗi: trả ok theo `keepIfTooBig` (giữ ảnh gốc nếu <= maxBytesHard).
 *
 * @param {string} inPath  đường dẫn ảnh đã tải về
 * @param {object} opt
 *   maxW         chiều rộng tối đa (px), mặc định 1600
 *   quality      -q:v của ffmpeg (2 đẹp nhất ~ 31 xấu nhất), mặc định 3
 *   onlyIfBytes  chỉ nén nếu file > ngưỡng này (byte), mặc định 1.2MB
 *   maxBytesHard trần tuyệt đối: nếu sau nén (hoặc không nén được) vẫn > ngưỡng này thì coi là FAIL,
 *                mặc định 9MB (Royal MCP base64 ~ x1.33 -> ~12MB JSON, an toàn)
 */
export function compressImage(inPath, opt = {}) {
  const maxW = opt.maxW ?? 1600;
  const quality = opt.quality ?? 3;
  const onlyIfBytes = opt.onlyIfBytes ?? 1.2 * 1024 * 1024;
  const maxBytesHard = opt.maxBytesHard ?? 9 * 1024 * 1024;

  const before = fs.existsSync(inPath) ? fs.statSync(inPath).size : 0;
  const dir = path.dirname(inPath);
  const stem = path.basename(inPath).replace(/\.[a-z0-9]+$/i, '');
  const fmt = (process.env.IMAGE_FORMAT || 'webp').toLowerCase(); // 15/09/2026: mặc định WebP cho LCP; đặt IMAGE_FORMAT=jpg để quay lại
  const outPath = path.join(dir, stem + (fmt === 'webp' ? '.webp' : '.jpg'));

  // Ảnh đã nhỏ + đã là .jpg → không cần làm gì.
  if (fmt !== 'webp' && before > 0 && before <= onlyIfBytes && /\.jpe?g$/i.test(inPath)) {
    return { ok: true, path: inPath, filename: path.basename(inPath), before, after: before, note: 'đã nhỏ, giữ nguyên' };
  }

  const ffmpeg = findFfmpeg();
  if (ffmpeg) {
    const tmp = path.join(dir, stem + (fmt === 'webp' ? '.__tmp__.webp' : '.__tmp__.jpg'));
    const encArgs = fmt === 'webp' ? ['-c:v', 'libwebp', '-quality', '80', '-compression_level', '6'] : ['-q:v', String(quality)];
    // shell:true chỉ cần trên Windows (spawn .exe trong WinGet); trên macOS/Linux shell sẽ nuốt dấu nháy của filter scale -> "No such filter".
    const useShell = process.platform === 'win32';
    const r = spawnSync(ffmpeg, ['-y', '-i', inPath, '-vf', `scale='min(${maxW},iw)':-2`, ...encArgs, tmp],
      { shell: useShell, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (r.status === 0 && fs.existsSync(tmp) && fs.statSync(tmp).size > 0) {
      const after = fs.statSync(tmp).size;
      // dùng bản nén nếu nhỏ hơn gốc; nếu gốc đã nhỏ hơn (hiếm) thì bỏ tmp
      if (after < before || fmt === 'webp' || !/\.jpe?g$/i.test(inPath)) {
        if (outPath !== inPath && fs.existsSync(inPath)) { try { fs.unlinkSync(inPath); } catch {} }
        renameOrCopy(tmp, outPath);
        return { ok: after <= maxBytesHard, path: outPath, filename: path.basename(outPath), before, after, note: ffmpeg === 'ffmpeg' ? 'nén ffmpeg' : 'nén ffmpeg(dò)' };
      }
      try { fs.unlinkSync(tmp); } catch {}
    } else {
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
    }
  }

  // Không nén được (không có ffmpeg / lỗi): giữ gốc nếu còn trong trần cứng.
  return { ok: before > 0 && before <= maxBytesHard, path: inPath, filename: path.basename(inPath), before, after: before, note: ffmpeg ? 'nén lỗi, giữ gốc' : 'không có ffmpeg, giữ gốc' };
}
