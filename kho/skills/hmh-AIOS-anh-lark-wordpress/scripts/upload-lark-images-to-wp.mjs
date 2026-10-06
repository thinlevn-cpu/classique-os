/**
 * upload-lark-images-to-wp.mjs
 * Upload local image files lên WordPress Media Library
 *
 * Usage:
 *   node upload-lark-images-to-wp.mjs <path1.jpg> [path2.jpg] ...
 *
 * Hoặc import và gọi uploadImages(list) từ script khác.
 *
 * Env (đọc từ .secrets/wordpress.env hoặc process.env):
 *   WP_URL, WP_USER, WP_APP_PASSWORD
 */

import { readFileSync, existsSync } from 'fs'
import { basename, join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

// --- Load config: KHÔNG hardcode credential. Đọc từ biến môi trường hoặc .secrets/wordpress.env ---
const _PROJ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
function loadWpEnv() {
  const out = {}
  for (const p of [join(_PROJ, '.secrets', 'wordpress.env'), '.secrets/wordpress.env']) {
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      if (m && out[m[1]] === undefined) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return out
}
const wpEnv = loadWpEnv()
const WP_URL = process.env.WP_URL || wpEnv.WP_URL || ''
const WP_USER = process.env.WP_USER || wpEnv.WP_USER || ''
const WP_PASS = process.env.WP_APP_PASSWORD || wpEnv.WP_APP_PASSWORD || ''
if (!WP_URL || !WP_USER || !WP_PASS) {
  console.error('THIẾU WP_URL / WP_USER / WP_APP_PASSWORD — điền vào .secrets/wordpress.env (xem HUONG-DAN-CAI-DAT.md)')
  process.exit(1)
}
const AUTH = Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')

/**
 * Upload một file ảnh lên WP Media Library
 * @param {string} filePath - Đường dẫn local tới file jpg/png
 * @param {object} meta - { filename, title, alt, caption }
 * @returns {{ id, url, filename }}
 */
export async function uploadImage(filePath, meta = {}) {
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const bytes = readFileSync(filePath)
  const filename = meta.filename || basename(filePath)
  const boundary = `----FormBoundary${Math.random().toString(36).slice(2)}`

  const ext = filename.split('.').pop().toLowerCase()
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ])

  // Upload file
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${AUTH}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Disposition': `attachment; filename="${filename}"`
    },
    body
  })

  const json = await res.json()
  if (!json.id) throw new Error(`WP upload failed: ${JSON.stringify(json).slice(0, 300)}`)

  // Cập nhật title + alt nếu có
  if (meta.title || meta.alt || meta.caption) {
    await fetch(`${WP_URL}/wp-json/wp/v2/media/${json.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...(meta.title && { title: meta.title }),
        ...(meta.alt && { alt_text: meta.alt }),
        ...(meta.caption && { caption: meta.caption })
      })
    })
  }

  return { id: json.id, url: json.source_url, filename }
}

/**
 * Upload nhiều ảnh từ danh sách
 * @param {Array<{path, filename?, title?, alt?, caption?}>} list
 * @returns {Array<{id, url, filename}>}
 */
export async function uploadImages(list) {
  const results = []
  for (const item of list) {
    try {
      const result = await uploadImage(item.path, item)
      results.push(result)
      console.log(JSON.stringify(result))
    } catch (e) {
      console.error(`FAIL ${item.path}: ${e.message}`)
    }
  }
  return results
}

// --- CLI mode ---
if (process.argv[1] === new URL(import.meta.url).pathname ||
    process.argv[1].endsWith('upload-lark-images-to-wp.mjs')) {
  const paths = process.argv.slice(2)
  if (paths.length === 0) {
    console.error('Usage: node upload-lark-images-to-wp.mjs <path1.jpg> [path2.jpg] ...')
    process.exit(1)
  }
  const list = paths.map(p => ({ path: p }))
  await uploadImages(list)
}
