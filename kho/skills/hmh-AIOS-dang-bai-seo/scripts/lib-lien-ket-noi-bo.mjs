/**
 * Khối liên kết nội bộ "Hàng đang có tại The Classique" cho mỗi bài blog.
 *
 * Vì sao có file này (23/09/2026): đo được 35 bài đang có 788 link nội bộ nhưng
 * KHÔNG link nào trỏ tới 303 trang sản phẩm. Sản phẩm không có link vào thì
 * Google "đã phát hiện, chưa lập chỉ mục" (183 trang, đo 22/09).
 * Sửa từ gốc: mọi bài đăng từ nay tự mang theo link sang hàng đang bán.
 *
 * LUẬT: không nêu giá trong bài viết (wiki/concepts/Ranh giới nội dung hàng hiệu).
 * Giọng blog: "bên em – anh chị" (wiki/concepts/Hai làn giọng).
 */
export const MOC_LIEN_KET = 'hmh-lk-noi-bo';

const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function lay(wp, duong) {
  let all = [];
  for (let pg = 1; pg <= 5; pg++) {
    const a = await wp('/wc/v3' + duong + (duong.includes('?') ? '&' : '?') + 'per_page=100&page=' + pg);
    if (!Array.isArray(a)) break;
    all = all.concat(a);
    if (a.length < 100) break;
  }
  return all;
}

/**
 * @param {Function} wp  hàm gọi REST của publish-wordpress.mjs (nhận '/wc/v3/...')
 * @param {string} van   tiêu đề + thân bài (để dò tên dòng và tên hãng)
 * @param {string} base  https://classique.vn
 * @returns {Promise<string>} HTML khối, hoặc '' nếu không dựng được
 */
export async function khoiLienKet(wp, van, base) {
  let sp = [], the = [], hang = [];
  try {
    sp = (await lay(wp, '/products?status=publish')).filter(p => p.catalog_visibility !== 'hidden');
    the = (await lay(wp, '/products/tags')).filter(t => t.slug !== 'fullbox');
    hang = await lay(wp, '/products/brands');
  } catch (e) {
    console.error('[lien-ket] không lấy được hàng: ' + e.message.slice(0, 160));
    return '';
  }
  if (!sp.length) return '';

  const v = norm(van).slice(0, 6000);
  const dong = the.filter(t => v.includes(norm(t.name)));
  const hieu = hang.filter(b => v.includes(norm(b.name)));

  const theoDong = sp.filter(p => p.tags.some(t => dong.some(x => x.slug === t.slug)));
  const theoHang = sp.filter(p => p.brands.some(b => hieu.some(x => x.slug === b.slug)));
  const pool = theoDong.length >= 3 ? theoDong : (theoHang.length ? theoHang : sp);

  // ưu tiên món còn hàng, rồi món mới nhất
  const mon = [...pool]
    .sort((a, b) => (b.stock_status === 'instock') - (a.stock_status === 'instock') || b.id - a.id)
    .slice(0, 4);
  if (!mon.length) return '';

  const xem = [];
  if (dong[0]) xem.push(`<a href="${base}/product-tag/${dong[0].slug}/">Tất cả ${esc(dong[0].name)} đang có</a>`);
  if (hieu[0]) xem.push(`<a href="${base}/thuong-hieu/${hieu[0].slug}/">Trang ${esc(hieu[0].name)}</a>`);
  xem.push(`<a href="${base}/bo-suu-tap/">Toàn bộ bộ sưu tập</a>`);

  const li = mon.map(p => `<li><a href="${p.permalink}">${esc(p.name)}</a></li>`).join('\n');
  return `\n<div class="${MOC_LIEN_KET}" style="margin:32px 0;padding:20px 22px;border:1px solid #e3ded3;border-radius:10px;background:#faf8f4">
<p style="margin:0 0 10px;font-weight:700;font-size:1.05em">Hàng đang có tại The Classique</p>
<p style="margin:0 0 10px;color:#444">Bên em đang có sẵn mấy món cùng hướng bài này, ảnh thật đúng món, kiểm định trước khi giao:</p>
<ul style="margin:0 0 12px;padding-left:20px">
${li}
</ul>
<p style="margin:0">${xem.join(' · ')}</p>
</div>\n`;
}
