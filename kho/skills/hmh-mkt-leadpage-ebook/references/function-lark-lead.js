/**
 * POST /api/lead — thu lead từ leadpage rồi ghi thẳng vào Lark Base.
 *
 * Chạy như Cloudflare Pages Function → CÙNG TÊN MIỀN với trang.
 * Trình duyệt KHÔNG bao giờ thấy LARK_APP_SECRET, và không có CORS/preflight.
 *
 * Biến môi trường (đặt trên Cloudflare Pages → Settings → Variables):
 *   LARK_APP_ID        (biến thường)
 *   LARK_APP_SECRET    (BẮT BUỘC là SECRET — không bao giờ nằm trong mã nguồn)
 *   LARK_BASE_TOKEN    (biến thường) — app_token của Base
 *   LARK_TABLE_ID      (biến thường) — table_id của bảng nhận lead
 *   LARK_HOST          (tuỳ chọn)    — mặc định https://open.larksuite.com
 */

const DEFAULT_HOST = 'https://open.larksuite.com';

/* Đầu số di động Việt Nam đang lưu hành (Viettel/Vina/Mobi/Vietnamobile/Gmobile). */
const VN_PHONE_RE = /^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$/;

/* ── tiện ích ────────────────────────────────────────────────────── */

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Chuẩn hoá SĐT về dạng 0xxxxxxxxx để so trùng cho chuẩn. */
function normalizePhone(raw) {
  let p = String(raw || '').replace(/[\s.\-()]/g, '');
  if (p.startsWith('+84')) p = '0' + p.slice(3);
  else if (p.startsWith('84') && p.length >= 11) p = '0' + p.slice(2);
  return p;
}

function clean(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max || 500);
}

/** created_time của Lark lúc là giây, lúc là mili giây → quy về mili giây. */
function toMillis(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1e12 ? n * 1000 : n;
}

/** Ô Lark có thể là chuỗi, mảng đoạn văn bản, hoặc object {text}. Rút ra chuỗi phẳng. */
function cellText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(cellText).join('');
  if (typeof v === 'object') return String(v.text || v.name || '');
  return String(v);
}

async function larkFetch(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    throw new Error(`Lark trả về dữ liệu không đọc được (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (data.code !== 0) {
    throw new Error(`Lark lỗi ${data.code}: ${data.msg || 'không rõ'}`);
  }
  return data;
}

async function getTenantToken(host, appId, appSecret) {
  const data = await larkFetch(`${host}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  if (!data.tenant_access_token) throw new Error('Lark không cấp tenant_access_token.');
  return data.tenant_access_token;
}

/* ── handler chính ───────────────────────────────────────────────── */

async function handlePost(request, env) {
  /* 1) Đọc body. Trang gửi text/plain (tránh preflight) nên tự parse, không tin header. */
  let body;
  try {
    body = JSON.parse(await request.text());
  } catch (_) {
    return json(400, { ok: false, error: 'bad_json', message: 'Dữ liệu gửi lên không hợp lệ.' });
  }
  if (!body || typeof body !== 'object') {
    return json(400, { ok: false, error: 'bad_json', message: 'Dữ liệu gửi lên không hợp lệ.' });
  }

  /* 2) HONEYPOT — bot điền ô ẩn 'website'. Trả 200 cho bot tưởng xong, nhưng KHÔNG ghi bảng. */
  if (clean(body.website, 200) !== '') {
    return json(200, { ok: true, skipped: true });
  }

  /* 3) Kiểm lại Ở MÁY CHỦ — không tin validate của trình duyệt. */
  const fullName = clean(body.full_name, 120);
  const phone = normalizePhone(body.phone_number);
  const email = clean(body.email, 160);

  if (fullName.length < 2) {
    return json(422, { ok: false, error: 'invalid_name', message: 'Họ tên chưa hợp lệ, anh/chị vui lòng nhập lại.' });
  }
  if (!VN_PHONE_RE.test(phone)) {
    return json(422, {
      ok: false,
      error: 'invalid_phone',
      message: 'Số điện thoại chưa đúng định dạng di động Việt Nam, anh/chị vui lòng kiểm tra lại.',
    });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json(422, { ok: false, error: 'invalid_email', message: 'Email chưa hợp lệ, anh/chị vui lòng kiểm tra lại.' });
  }

  /* 4) Cấu hình. Thiếu secret là hỏng hệ thống → 500, và nói rõ để còn sửa. */
  const host = (env.LARK_HOST || DEFAULT_HOST).replace(/\/+$/, '');
  const { LARK_APP_ID: appId, LARK_APP_SECRET: appSecret, LARK_BASE_TOKEN: baseToken, LARK_TABLE_ID: tableId } = env;
  const missing = [
    !appId && 'LARK_APP_ID',
    !appSecret && 'LARK_APP_SECRET',
    !baseToken && 'LARK_BASE_TOKEN',
    !tableId && 'LARK_TABLE_ID',
  ].filter(Boolean);
  if (missing.length) {
    console.error('Thiếu biến môi trường:', missing.join(', '));
    return json(500, {
      ok: false,
      error: 'server_misconfigured',
      message: 'Hệ thống nhận đăng ký đang thiếu cấu hình. Anh/chị vui lòng gọi hotline giúp.',
    });
  }

  /* 5) Gom nguồn khách. Không có utm_source → 'truc-tiep'. */
  const ebook = clean(body.ebook, 250) || clean(body.page, 250) || '(không rõ)';
  /* Giữ nguyên dạng thô. Mặc định 'truc-tiep' CHỈ áp lúc tạo mới —
     nếu áp cả lúc cập nhật thì giá trị mặc định sẽ đè mất nguồn thật ghi ở lần 1. */
  const utmSource = clean(body.utm_source, 120);
  const clickId = clean(body.click_id, 250);
  const clickIdType = clean(body.click_id_type, 20);
  const referrer = clean(body.referrer, 300);
  const landing = clean(body.landing_url, 500) || clean(body.url, 500);

  /* Chỉ ghép phần CÓ THẬT — không bịa chuỗi giữ chỗ, vì chuỗi giữ chỗ
     sẽ bị coi là 'có dữ liệu' rồi đè mất chi tiết nguồn ghi được lần trước. */
  const chiTietNguon = [
    referrer ? `referrer: ${referrer}` : '',
    landing ? `landing: ${landing}` : '',
    clickId ? `${clickIdType || 'click_id'}: ${clickId}` : '',
  ].filter(Boolean).join(' | ').slice(0, 900);

  const fields = {
    'Họ và Tên': fullName,
    'Số điện thoại': phone,
    'Email': email,
    'Ebook': ebook,
    'utm_source': utmSource,
    'utm_medium': clean(body.utm_medium, 120),
    'utm_campaign': clean(body.utm_campaign, 200),
    'utm_content': clean(body.utm_content, 200),
    'utm_term': clean(body.utm_term, 200),
    'SourceID': clickId,
    'Chi tiết nguồn': chiTietNguon,
    'Trạng Thái': 'Đã tạo',
  };
  /* Tạo mới mà không có nguồn nào → ghi rõ 'truc-tiep' (yêu cầu 4). */
  const fieldsForCreate = { ...fields, utm_source: utmSource || 'truc-tiep' };

  const recordsUrl = `${host}/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records`;

  try {
    const token = await getTenantToken(host, appId, appSecret);
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' };

    /* 6) CHỐNG TRÙNG: cùng SĐT + cùng ebook trong 24h → CẬP NHẬT, không tạo dòng mới. */
    let existingId = null;
    try {
      const found = await larkFetch(`${recordsUrl}/search?page_size=50`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          filter: {
            conjunction: 'and',
            conditions: [
              { field_name: 'Số điện thoại', operator: 'is', value: [phone] },
              { field_name: 'Ebook', operator: 'is', value: [ebook] },
            ],
          },
        }),
      });
      const items = (found.data && found.data.items) || [];
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      let newest = 0;
      for (const it of items) {
        const created = toMillis(it.created_time) || toMillis(it.fields && it.fields['Ngày tạo']);
        /* Không đọc được mốc thời gian thì vẫn coi là trùng — thà cập nhật còn hơn nhân đôi dòng. */
        if (!created || created >= cutoff) {
          if (created >= newest) { newest = created; existingId = it.record_id; }
        }
      }
    } catch (e) {
      /* Tìm trùng hỏng thì vẫn phải giữ được lead — ghi log rồi tạo mới. */
      console.error('Bước dò trùng lỗi, chuyển sang tạo mới:', e.message);
    }

    if (existingId) {
      /* Cập nhật KHÔNG ĐƯỢC xoá dữ liệu cũ.
         Lần gửi thứ 2 thường đến từ tab không còn UTM (khách mở lại từ bookmark,
         vào thẳng tên miền...). Nếu ghi đè cả ô rỗng thì nguồn quảng cáo ghi được
         ở lần 1 sẽ bị xoá trắng — mất đúng thứ mục 4 cần giữ.
         → Chỉ ghi đè ô nào lần này THỰC SỰ có dữ liệu. */
      const patch = { 'Trạng Thái': 'Trùng' };
      for (const [k, v] of Object.entries(fields)) {
        if (k !== 'Trạng Thái' && String(v || '').trim() !== '') patch[k] = v;
      }
      await larkFetch(`${recordsUrl}/${existingId}`, {
        method: 'PUT',
        headers: auth,
        body: JSON.stringify({ fields: patch }),
      });
      return json(200, { ok: true, mode: 'updated', record_id: existingId });
    }

    const created = await larkFetch(recordsUrl, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ fields: fieldsForCreate }),
    });
    return json(200, {
      ok: true,
      mode: 'created',
      record_id: created.data && created.data.record && created.data.record.record_id,
    });
  } catch (e) {
    console.error('Ghi Lark thất bại:', e && e.message);
    return json(502, {
      ok: false,
      error: 'lark_write_failed',
      message: 'Chưa lưu được đăng ký của anh/chị. Vui lòng thử lại hoặc gọi hotline 0986666222.',
    });
  }
}

/* MỘT cửa vào duy nhất — tránh nhập nhằng giữa onRequest và onRequestPost. */
export async function onRequest({ request, env }) {
  if (request.method === 'POST') return handlePost(request, env);
  return json(405, {
    ok: false,
    error: 'method_not_allowed',
    message: 'Điểm cuối này chỉ nhận POST.',
  });
}
