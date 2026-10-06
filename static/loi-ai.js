// Lõi AI của Classique OS: khối cầu năng lượng (dải sáng xoáy) + vòng HUD, vẽ bằng canvas.
// LoiAI.gan(canvas, {vong:true}) gắn một lõi; LoiAI.trangThai("cho"|"nghe"|"nghi"|"noi"|"loi", doLon 0..1) đổi cho mọi lõi.
// Thêm LoiAI.nen(canvas): nền sao + lưới lục giác mờ.
(() => {
  const LOI = [];
  const DT = matchMedia("(max-width: 900px)").matches || matchMedia("(pointer: coarse)").matches;   // điện thoại: vẽ nhẹ
  const GIAM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ST = { tt: "cho", am: 0 };
  const MAU = {
    cho: { a: [63, 232, 255], b: [184, 107, 255], toc: .55 },
    nghe: { a: [255, 214, 140], b: [255, 120, 200], toc: 1.3 },
    nghi: { a: [90, 200, 255], b: [210, 110, 255], toc: 2.3 },
    noi: { a: [63, 240, 255], b: [255, 79, 216], toc: 1.5 },
    loi: { a: [255, 110, 100], b: [255, 60, 140], toc: .9 },
  };
  let mauHien = { a: [...MAU.cho.a], b: [...MAU.cho.b], toc: MAU.cho.toc };
  const tron = (x, y, k) => x + (y - x) * k;

  function taoDai(n) {
    return Array.from({ length: n }, (_, i) => ({ a: 1 + (i % 4), b: 2 + ((i * 7) % 5), p: Math.random() * 6.28, q: Math.random() * 6.28,
      s: .3 + Math.random() * .7, nghieng: Math.random() * 3.14, lech: .55 + Math.random() * .45 }));
  }
  function gan(cv, opt = {}) {
    const o = { cv, ctx: cv.getContext("2d"), vong: opt.vong !== false, dai: null, w: 0, h: 0, t0: Math.random() * 100 };
    LOI.push(o); return o;
  }
  function coGian(o) {
    const r = o.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    if (!r.width) return false;
    if (Math.abs(r.width - o.w) > 1 || Math.abs(r.height - o.h) > 1) {
      o.w = r.width; o.h = r.height; o.cv.width = r.width * d; o.cv.height = r.height * d; o.ctx.setTransform(d, 0, 0, d, 0, 0);
      o.dai = taoDai(DT ? 10 : r.width > 220 ? 20 : 12);
    }
    return true;
  }
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  function ve(o, t) {
    if (!coGian(o)) return;
    const { ctx, w, h } = o, cx = w / 2, cy = h / 2, m = mauHien;
    const R0 = Math.min(w, h) * (o.vong ? .30 : .42), song = ST.tt === "noi" ? ST.am : 0;
    const R = R0 * (1 + song * .08 + (ST.tt === "nghe" ? .03 * Math.sin(t * 6) : 0));
    const tt = (t + o.t0) * m.toc;
    ctx.clearRect(0, 0, w, h);
    // quầng sáng
    let g = ctx.createRadialGradient(cx, cy, R * .2, cx, cy, R * 1.9);
    g.addColorStop(0, rgba(m.a, .28)); g.addColorStop(.45, rgba(m.b, .10)); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.9, 0, 7); ctx.fill();
    // lõi trong
    g = ctx.createRadialGradient(cx - R * .2, cy - R * .25, R * .05, cx, cy, R);
    g.addColorStop(0, rgba([200, 245, 255], .22)); g.addColorStop(.4, rgba(m.a, .10)); g.addColorStop(1, rgba(m.b, .06));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    // dải năng lượng (cộng sáng)
    ctx.globalCompositeOperation = "lighter";
    const quay = tt * .35;
    const lg = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    lg.addColorStop(0, rgba(m.a, .30)); lg.addColorStop(.5, rgba(m.b, .22)); lg.addColorStop(1, rgba(m.a, .28));
    ctx.strokeStyle = lg;
    const SD = o.w > 220 ? 64 : 44;
    for (const [i, d] of o.dai.entries()) {
      ctx.lineWidth = i % 5 === 0 ? 1.4 : .7; ctx.beginPath();
      for (let k = 0; k <= SD; k++) {
        const u = k / SD * Math.PI * 2;
        let x = Math.sin(d.a * u + d.p + tt * d.s) * Math.cos(u * .5 + d.q);
        let y = Math.sin(d.b * u + d.q + tt * d.s * .8) * d.lech;
        let z = Math.cos(d.a * u + d.p) * Math.sin(u + tt * .3);
        const n = Math.hypot(x, y, z) || 1; x /= n; y /= n; z /= n;          // ép lên mặt cầu
        const c1 = Math.cos(quay + d.nghieng), s1 = Math.sin(quay + d.nghieng);
        const xr = x * c1 - z * s1, zr = x * s1 + z * c1;
        const px = cx + xr * R * .96, py = cy + y * R * .96;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    // vòng HUD
    if (o.vong) {
      ctx.save(); ctx.translate(cx, cy);
      const vong = (r, a0, dai, beRong, mau, net = []) => { ctx.strokeStyle = mau; ctx.lineWidth = beRong; ctx.setLineDash(net); ctx.beginPath(); ctx.arc(0, 0, r, a0, a0 + dai); ctx.stroke(); };
      vong(R * 1.28, tt * .25, Math.PI * 1.55, 1.2, rgba(m.a, .55));
      vong(R * 1.36, -tt * .18, Math.PI * 2, 6, rgba(m.a, .35), [1, 7]);
      vong(R * 1.48, tt * .12 + 1, Math.PI * .7, 2, rgba(m.b, .6));
      vong(R * 1.48, tt * .12 + 3.6, Math.PI * .4, 2, rgba(m.b, .6));
      vong(R * 1.62, -tt * .08, Math.PI * 2, 1, rgba(m.a, .18), [2, 10]);
      ctx.setLineDash([]);
      // vạch chia + mũi tên quay
      for (let i = 0; i < 4; i++) { const a = tt * .25 + i * Math.PI / 2; ctx.fillStyle = rgba(m.a, .9);
        ctx.beginPath(); ctx.arc(Math.cos(a) * R * 1.28, Math.sin(a) * R * 1.28, 2.2, 0, 7); ctx.fill(); }
      // quỹ đạo nghiêng (như ảnh điện thoại)
      ctx.rotate(-.18); ctx.scale(1, .32); ctx.strokeStyle = rgba(m.a, .35); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.85, 0, 7); ctx.stroke();
      const ah = tt * .6; ctx.fillStyle = rgba([255, 255, 255], .9); ctx.beginPath(); ctx.arc(Math.cos(ah) * R * 1.85, Math.sin(ah) * R * 1.85, 3.5, 0, 7); ctx.fill();
      ctx.restore();
    }
  }

  // nền sao + lưới
  let nen = null;
  function veNen(t) {
    if (!nen) return; const { cv, ctx } = nen, d = window.devicePixelRatio || 1;
    if (nen.w !== innerWidth || nen.h !== innerHeight) { nen.w = innerWidth; nen.h = innerHeight;   // so theo kích thước CSS: tỉ lệ điểm ảnh lẻ (2.625) làm width làm tròn, so trực tiếp sẽ vẽ lại mỗi khung
      cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d); ctx.setTransform(d, 0, 0, d, 0, 0);
      nen.sao = Array.from({ length: Math.round(innerWidth * innerHeight / 6000) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.2 + .2, p: Math.random() * 6 }));
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const s of nen.sao) { ctx.fillStyle = `rgba(190,230,255,${.2 + .45 * Math.random()})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
    }
  }

  let truoc = 0;
  function vong(ms) {
    requestAnimationFrame(vong);
    if (document.hidden || ms - truoc < (DT ? 50 : 33)) return; truoc = ms;   // 30 khung/giây (điện thoại 20), tab ẩn thì nghỉ
    const t = ms / 1000, muc = MAU[ST.tt] || MAU.cho, k = .06;
    mauHien = { a: mauHien.a.map((v, i) => tron(v, muc.a[i], k)), b: mauHien.b.map((v, i) => tron(v, muc.b[i], k)), toc: tron(mauHien.toc, muc.toc, k) };
    if (ST.tt === "noi") ST.am = tron(ST.am, ST.amDich || 0, .3);
    veNen(t);
    for (let i = LOI.length - 1; i >= 0; i--) if (!document.body.contains(LOI[i].cv)) LOI.splice(i, 1);   // lõi của tab đã đóng
    for (const o of LOI) if (o.cv.offsetParent !== null) { if (GIAM && o.daVe) continue; ve(o, t); o.daVe = 1; }
  }
  requestAnimationFrame(vong);

  window.LoiAI = {
    gan,
    nen: cv => { nen = { cv, ctx: cv.getContext("2d") }; },
    trangThai: (tt, am) => { ST.tt = tt || "cho"; if (am != null) ST.amDich = am; },
    am: v => { ST.amDich = v; },
  };
})();
