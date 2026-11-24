'use strict';
// Drawing only: reads the state, never changes the rules.
/* ---------------- draw ---------------- */
function txt(s, x, y, size, color, align, stroke) {
  ctx.font = '800 ' + Math.round(size) + 'px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(2, size * 0.16); ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawTile(t, x, y, px, py) {
  const h = hash(x, y), s = TS + 0.6;
  if (t === T_EMPTY) { const c = dirtRGB(y, 0.5); ctx.fillStyle = 'rgb(' + (c[0] * 0.28 | 0) + ',' + (c[1] * 0.28 | 0) + ',' + (c[2] * 0.3 | 0) + ')'; ctx.fillRect(px, py, s, s); return; }
  ctx.fillStyle = dirtColor(y, h); ctx.fillRect(px, py, s, s);
  if (t === T_ROCK) {
    ctx.fillStyle = '#7a7a84'; rr(px + TS * 0.06, py + TS * 0.06, TS * 0.88, TS * 0.88, TS * 0.22); ctx.fill();
    ctx.fillStyle = '#9a9aa6'; ctx.fillRect(px + TS * 0.22, py + TS * 0.2, TS * 0.3, TS * 0.14);
  } else if (t === T_GAS) {
    ctx.fillStyle = 'rgba(150,255,90,' + (0.2 + 0.1 * Math.sin(G.time * 3 + h * 9)) + ')';
    ctx.beginPath(); ctx.arc(px + TS * (0.3 + h * 0.2), py + TS * 0.4, TS * 0.16, 0, 7); ctx.arc(px + TS * 0.68, py + TS * (0.5 + h * 0.2), TS * 0.11, 0, 7); ctx.fill();
  } else if (t >= T_ORE) {
    const o = CFG.ORES[t - T_ORE];
    ctx.fillStyle = o.color;
    ctx.fillRect(px + TS * (0.12 + h * 0.1), py + TS * 0.14, TS * 0.36, TS * 0.32);
    ctx.fillRect(px + TS * 0.52, py + TS * (0.3 + h * 0.12), TS * 0.34, TS * 0.3);
    ctx.fillRect(px + TS * (0.2 + h * 0.15), py + TS * 0.58, TS * 0.3, TS * 0.28);
    const tw = 0.5 + 0.5 * Math.sin(G.time * 4 + h * 40);
    ctx.globalAlpha = 0.35 + 0.65 * tw; ctx.fillStyle = o.shine;
    ctx.fillRect(px + TS * (0.18 + h * 0.1), py + TS * 0.18, TS * 0.12, TS * 0.1);
    ctx.fillRect(px + TS * 0.62, py + TS * (0.36 + h * 0.12), TS * 0.1, TS * 0.1);
    ctx.globalAlpha = 1;
  }
}
function drawWorld() {
  const cam = G.camY;
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, -cam * TS));
  g.addColorStop(0, '#3a6ea8'); g.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = cam < 0 ? g : '#000'; ctx.fillRect(0, 0, W, H);
  if (cam < 0) {
    const gy = -cam * TS;
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(W * 0.8, gy - TS * 5, TS * 0.9, 0, 7); ctx.fill();
    // shop building
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(TS * 0.6, gy - TS * 2.2, TS * 3.2, TS * 2.2);
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(TS * 0.3, gy - TS * 2.2); ctx.lineTo(TS * 2.2, gy - TS * 3.3); ctx.lineTo(TS * 4.1, gy - TS * 2.2); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(TS * 1.0, gy - TS * 1.7, TS * 2.4, TS * 0.7);
    txt('SHOP', TS * 2.2, gy - TS * 1.34, TS * 0.52, '#5a2d12');
    ctx.fillStyle = '#4c9a3a'; ctx.fillRect(0, gy - TS * 0.12, W, TS * 0.14);
  }
  const r0 = Math.max(0, Math.floor(cam)), r1 = Math.min(ROWS - 1, Math.ceil(cam + H / TS));
  for (let y = r0; y <= r1; y++) for (let x = 0; x < COLS; x++) drawTile(world[y * COLS + x], x, y, x * TS, (y - cam) * TS);
  if (r1 >= ROWS - 1) { ctx.fillStyle = '#111'; ctx.fillRect(0, (ROWS - cam) * TS, W, H); }
}
function drawRocks() {
  for (const r of G.rocks) {
    const warn = r.warn > 0, jx = warn ? rnd(-1, 1) * TS * 0.06 : 0;
    const px = r.x * TS + jx, py = (r.y - G.camY) * TS;
    if (warn && Math.sin(G.time * 30) > 0) {
      ctx.fillStyle = 'rgba(255,50,40,0.22)'; ctx.fillRect(r.x * TS, py, TS, (G.drill.y - r.y + 1) * TS);
      txt('!', px + TS / 2, py + TS * 1.6, TS * 1.2, '#ff3a2a', 'center', true);
    }
    ctx.fillStyle = '#6f6f7a'; rr(px + TS * 0.05, py + TS * 0.05, TS * 0.9, TS * 0.9, TS * 0.25); ctx.fill();
    ctx.fillStyle = '#9a9aa6'; ctx.fillRect(px + TS * 0.22, py + TS * 0.2, TS * 0.3, TS * 0.14);
  }
}
function drawDrill() {
  const d = G.drill, dig = d.move && d.move.dig;
  const cx = (d.x + 0.5) * TS + (dig ? rnd(-1, 1) * TS * 0.04 : 0), cy = (d.y + 0.5 - G.camY) * TS + (dig ? rnd(-1, 1) * TS * 0.04 : 0);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(d.face.y, d.face.x));
  // drill bit (points along +x)
  const spin = Math.sin(G.time * 40) * 0.5 + 0.5;
  ctx.fillStyle = '#b8bcc6'; ctx.beginPath(); ctx.moveTo(TS * 0.2, -TS * 0.3); ctx.lineTo(TS * 0.56, 0); ctx.lineTo(TS * 0.2, TS * 0.3); ctx.fill();
  ctx.strokeStyle = '#5d616b'; ctx.lineWidth = Math.max(1, TS * 0.05);
  for (let i = 0; i < 3; i++) { const k = ((i + (dig ? spin : 0)) / 3); const x = TS * (0.22 + k * 0.3), hgt = TS * 0.3 * (1 - k * 0.95); ctx.beginPath(); ctx.moveTo(x, -hgt); ctx.lineTo(x, hgt); ctx.stroke(); }
  // body
  ctx.fillStyle = G.outOfFuel ? '#8a8f99' : '#ffb21f'; rr(-TS * 0.38, -TS * 0.34, TS * 0.62, TS * 0.68, TS * 0.12); ctx.fill();
  ctx.fillStyle = '#2b3a55'; ctx.fillRect(-TS * 0.12, -TS * 0.2, TS * 0.22, TS * 0.4);
  ctx.fillStyle = '#333'; ctx.fillRect(-TS * 0.4, -TS * 0.42, TS * 0.6, TS * 0.1); ctx.fillRect(-TS * 0.4, TS * 0.32, TS * 0.6, TS * 0.1);
  ctx.restore();
}
function drawHUD() {
  const pad = 10 * U, low = G.fuel / fuelMax() < CFG.LOW_FUEL_FRAC && G.drill.ty >= 0;
  ctx.fillStyle = 'rgba(8,10,18,0.72)'; ctx.fillRect(0, 0, W, 84 * U);
  txt('$' + Math.round(G.moneyShown), pad, 22 * U, 26 * U, '#ffe14a', 'left', true);
  txt('DEPTH ' + Math.max(0, Math.round(G.drill.y + 1)), W - pad, 22 * U, 20 * U, '#fff', 'right', true);
  const bw = (W - pad * 3) / 2, by = 46 * U, bh = 24 * U;
  const bar = (x, frac, col, label) => {
    ctx.fillStyle = '#20242e'; rr(x, by, bw, bh, 6 * U); ctx.fill();
    if (frac > 0.01) { ctx.fillStyle = col; rr(x, by, Math.max(bh * 0.5, bw * Math.min(1, frac)), bh, 6 * U); ctx.fill(); }
    txt(label, x + bw / 2, by + bh / 2 + 1, 13 * U, '#fff', 'center', true);
  };
  const blink = Math.sin(G.time * 14) > 0;
  bar(pad, G.fuel / fuelMax(), low ? (blink ? '#ff3a2a' : '#7a1a12') : '#3fb7ff', 'FUEL ' + Math.ceil(G.fuel) + '/' + fuelMax());
  const full = G.cargo.length >= cargoMax();
  bar(pad * 2 + bw, G.cargo.length / cargoMax(), full ? '#ff9a2a' : '#5fd068', 'CARGO ' + G.cargo.length + '/' + cargoMax());
  if (low) {
    const a = blink ? 0.35 : 0.12;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,20,10,' + a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (blink) txt(G.outOfFuel ? 'OUT OF FUEL' : 'LOW FUEL - GO UP!', W / 2, 106 * U, 24 * U, '#ff4a3a', 'center', true);
  }
}
function drawShop() {
  if (!atSurface()) return;
  const s = shopRects();
  ctx.fillStyle = 'rgba(14,16,26,0.92)'; ctx.fillRect(0, s.py, W, s.ph);
  ctx.fillStyle = '#ffb21f'; ctx.fillRect(0, s.py, W, 3 * U);
  const val = cargoValue(), has = G.cargo.length > 0, pulse = has ? 1 + 0.03 * Math.sin(G.time * 8) : 1;
  ctx.save(); ctx.translate(s.sell.x + s.sell.w / 2, s.sell.y + s.sell.h / 2); ctx.scale(pulse, pulse);
  ctx.fillStyle = has ? '#2fbf5a' : '#2a2f3a'; rr(-s.sell.w / 2, -s.sell.h / 2, s.sell.w, s.sell.h, 12 * U); ctx.fill();
  txt(has ? 'SELL CARGO  +$' + val : 'CARGO EMPTY', 0, 1, 24 * U, has ? '#fff' : '#69707e', 'center', has);
  ctx.restore();
  for (const b of s.ups) {
    const c = upCost(b.k), ok = G.money >= c;
    ctx.fillStyle = ok ? '#2a6fd6' : '#232836'; rr(b.x, b.y, b.w, b.h, 10 * U); ctx.fill();
    if (ok) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(G.time * 6)) + ')'; ctx.lineWidth = 2 * U; rr(b.x, b.y, b.w, b.h, 10 * U); ctx.stroke(); }
    const cx = b.x + b.w / 2, col = ok ? '#fff' : '#7a8190';
    txt(UP_NAMES[b.k], cx, b.y + b.h * 0.2, 12.5 * U, col);
    txt('LV ' + (G.lv[b.k] + 1), cx, b.y + b.h * 0.47, 20 * U, col);
    txt('$' + c, cx, b.y + b.h * 0.78, 18 * U, ok ? '#ffe14a' : '#8c7a3a');
  }
}
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.save();
  if (G.shake) ctx.translate(rnd(-1, 1) * G.shake, rnd(-1, 1) * G.shake);
  drawWorld(); drawRocks(); drawDrill();
  for (const p of G.particles) {
    ctx.globalAlpha = Math.min(1, p.life / p.max * 1.6); ctx.fillStyle = p.color;
    const s = p.size * TS; ctx.fillRect(p.x * TS - s / 2, (p.y - G.camY) * TS - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  // start hint: a bouncing arrow under the drill until the first dig
  if (G.dug === 0 && !G.drill.move) {
    const cx = (G.drill.x + 0.5) * TS, cy = (G.drill.y + 1.9 - G.camY) * TS + Math.sin(G.time * 6) * TS * 0.25;
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.moveTo(cx - TS * 0.5, cy - TS * 0.3); ctx.lineTo(cx + TS * 0.5, cy - TS * 0.3); ctx.lineTo(cx, cy + TS * 0.4); ctx.fill();
  }
  ctx.restore();
  drawShop(); drawHUD();
  for (const f of G.floats) {
    const k = f.t / f.dur, pop = Math.min(1, f.t * 10);
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    txt(f.text, Math.max(50 * U, Math.min(W - 50 * U, f.x)), f.y, f.size * (0.6 + 0.4 * pop), f.color, 'center', true);
  }
  ctx.globalAlpha = 1;
  if (G.banners.length) {
    const b = G.banners[0], inK = Math.min(1, b.t * 7), s = 1 + (1 - inK) * 0.8 + 0.03 * Math.sin(G.time * 12);
    let size = 30 * U; ctx.font = '800 ' + size + 'px system-ui,sans-serif';
    ctx.save(); ctx.translate(W / 2, 150 * U); ctx.scale(s, s);
    ctx.font = '800 ' + Math.round(size) + 'px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
    const tw = ctx.measureText(b.text).width; if (tw > W * 0.9) size *= W * 0.9 / tw;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(-W * 0.48, -size * 0.85, W * 0.96, size * 1.7, 10 * U); ctx.fill();
    txt(b.text, 0, 1, size, b.color, 'center', true);
    ctx.restore();
  }
  if (ptr && ptr.moved) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ptr.sx, ptr.sy, CFG.JOY_RADIUS, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(ptr.x, ptr.y, 20, 0, 7); ctx.fill();
  }
  if (G.flash) { ctx.globalAlpha = Math.max(0, G.flash.a); ctx.fillStyle = G.flash.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
