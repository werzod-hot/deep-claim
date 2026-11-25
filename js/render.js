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
const KIND_OF = t => t === T_EMPTY ? 1 : t === T_DIRT ? 0 : t === T_ROCK ? 2 : t === T_GAS ? 3 : t === T_MAGMA ? 4 : 10 + (t - T_ORE);
function drawTile(t, x, y, px, py) {
  const hh = hash(x, y), v = (hh * 4) | 0, s = TS + 0.6, rb = ART.rows[y], k = KIND_OF(t), ph = hh * 40;
  if (k === 4) {   // magma: crust + pulsing glow cracks
    ctx.drawImage(artTile(0, 4, v), px, py, s, s);
    ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(G.time * 3 + ph)); ctx.drawImage(artLayer(4, v), px, py, s, s); ctx.globalAlpha = 1;
    return;
  }
  const bk = k === 2 ? 0 : k;
  ctx.drawImage(artTile(rb.a, bk, v), px, py, s, s);
  if (rb.t > 0) { ctx.globalAlpha = rb.t; ctx.drawImage(artTile(rb.b, bk, v), px, py, s, s); ctx.globalAlpha = 1; }
  if (k === 2) ctx.drawImage(artLayer(2, v), px, py, s, s);
  else if (k === 3) { ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(G.time * 2.2 + ph)); ctx.drawImage(artLayer(3, v), px, py, s, s); ctx.globalAlpha = 1; }
  else if (k >= 10) { ctx.globalAlpha = Math.max(0, Math.sin(G.time * 4 + ph)) * 0.9; ctx.drawImage(artLayer(k, v), px, py, s, s); ctx.globalAlpha = 1; }
  else if (k === 1 && y >= 0) {   // tunnel: soft inner shadow next to solid tiles
    const sh = ART.shadow;
    if (y > 0 && world[(y - 1) * COLS + x]) ctx.drawImage(sh[0], px, py, s, s);
    if (x >= COLS - 1 || world[y * COLS + x + 1]) ctx.drawImage(sh[1], px, py, s, s);
    if (y >= ROWS - 1 || world[(y + 1) * COLS + x]) ctx.drawImage(sh[2], px, py, s, s);
    if (x <= 0 || world[y * COLS + x - 1]) ctx.drawImage(sh[3], px, py, s, s);
  }
}
function drawHills(gy, color, amp, f1, f2, ph, base) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, gy);
  const st = Math.max(4, W / 40);
  for (let x = 0; x <= W + st; x += st) ctx.lineTo(x, gy - TS * (base + amp * (Math.sin(x * f1 + ph) * 0.6 + Math.sin(x * f2 + ph * 2) * 0.4)));
  ctx.lineTo(W + st, gy); ctx.closePath(); ctx.fill();
}
function drawCloud(x, y, s) {
  ctx.fillStyle = CFG.CLOUD_COLOR; ctx.beginPath();
  ctx.arc(x, y, s * 0.55, 0, 7); ctx.arc(x + s * 0.6, y - s * 0.25, s * 0.7, 0, 7); ctx.arc(x + s * 1.3, y, s * 0.55, 0, 7); ctx.fill();
  rr(x - s * 0.3, y, s * 2.1, s * 0.5, s * 0.25); ctx.fill();
}
function drawSurface(cam) {
  const gy = -cam * TS, S = CFG.SKY;
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, gy));
  g.addColorStop(0, S[0]); g.addColorStop(0.55, S[1]); g.addColorStop(1, S[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // sun with a soft halo
  ctx.fillStyle = 'rgba(255,240,190,0.25)'; ctx.beginPath(); ctx.arc(W * 0.82, gy - TS * 5, TS * 1.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(W * 0.82, gy - TS * 5, TS * 0.9, 0, 7); ctx.fill();
  // drifting clouds
  const span = W + 200 * U;
  [[0.1, 3.7, 0.7, 5], [0.45, 4.7, 0.9, 3.5], [0.8, 3.3, 0.55, 7], [0.3, 5.4, 0.6, 4.5]].forEach(c => {
    const x = ((c[0] * span + G.time * c[3] * U) % span) - 100 * U;
    drawCloud(x, gy - TS * c[1], TS * c[2]);
  });
  drawHills(gy, CFG.HILL_FAR, 0.9, 0.011, 0.027, 1.3, 1.6);
  drawHills(gy, CFG.HILL_NEAR, 0.5, 0.019, 0.05, 4.1, 0.55);
  // shop: planks, roof, door, hanging sign
  const bx = TS * 0.6, bw = TS * 3.2, bh = TS * 2.2, top = gy - bh;
  ctx.fillStyle = '#8a5530'; ctx.fillRect(bx, top, bw, bh);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 1; i < 8; i++) ctx.fillRect(bx + bw * i / 8, top, Math.max(1, U), bh);
  ctx.fillStyle = '#5d3719'; ctx.fillRect(bx, gy - TS * 0.12, bw, TS * 0.12);
  ctx.fillStyle = '#d0432f'; ctx.beginPath(); ctx.moveTo(TS * 0.25, top + 1); ctx.lineTo(TS * 2.2, gy - TS * 3.4); ctx.lineTo(TS * 4.15, top + 1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7a1f12'; ctx.lineWidth = Math.max(2, TS * 0.06); ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = '#ffe9a8'; rr(TS * 1.0, gy - TS * 1.7, TS * 1.5, TS * 0.8, TS * 0.08); ctx.fill();   // window
  ctx.fillStyle = 'rgba(120,70,20,0.5)'; ctx.fillRect(TS * 1.74, gy - TS * 1.7, Math.max(1, U), TS * 0.8);
  ctx.fillStyle = '#4a2a12'; rr(TS * 2.75, gy - TS * 1.25, TS * 0.7, TS * 1.13, TS * 0.08); ctx.fill();   // door
  ctx.fillStyle = '#ffcf1f'; ctx.beginPath(); ctx.arc(TS * 3.3, gy - TS * 0.65, TS * 0.05, 0, 7); ctx.fill();
  ctx.fillStyle = '#3b2210'; ctx.fillRect(TS * 1.0, gy - TS * 2.5 + TS * 0.0, Math.max(2, U), TS * 0.2); ctx.fillRect(TS * 3.4, gy - TS * 2.5, Math.max(2, U), TS * 0.2);
  const sway = Math.sin(G.time * 1.5) * 0.02;
  ctx.save(); ctx.translate(TS * 2.2, gy - TS * 2.28); ctx.rotate(sway);
  ctx.fillStyle = '#ffd54a'; rr(-TS * 0.95, 0, TS * 1.9, TS * 0.62, TS * 0.1); ctx.fill();
  ctx.strokeStyle = '#6a4a08'; ctx.lineWidth = Math.max(1.5, TS * 0.05); ctx.stroke();
  txt('SHOP', 0, TS * 0.33, TS * 0.46, '#5a3a06'); ctx.restore();
  // fuel pump next to the shaft
  const px = TS * 8.15, pw = TS * 0.75, ph = TS * 1.25;
  ctx.fillStyle = '#4a4f5c'; ctx.fillRect(px - TS * 0.1, gy - TS * 0.1, pw + TS * 0.2, TS * 0.1);
  ctx.fillStyle = '#d93a30'; rr(px, gy - ph, pw, ph - TS * 0.1, TS * 0.1); ctx.fill();
  ctx.strokeStyle = '#7a1a14'; ctx.lineWidth = Math.max(1.5, TS * 0.05); ctx.stroke();
  ctx.fillStyle = '#1f2a24'; rr(px + pw * 0.15, gy - ph + TS * 0.15, pw * 0.7, TS * 0.38, TS * 0.05); ctx.fill();
  txt('FUEL', px + pw / 2, gy - ph + TS * 0.34, TS * 0.2, '#7dff8a');
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(px + pw * 0.15, gy - ph + TS * 0.68, pw * 0.7, TS * 0.1);
  ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = Math.max(2, TS * 0.07); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px + pw, gy - TS * 0.7); ctx.quadraticCurveTo(px + pw + TS * 0.4, gy - TS * 0.7, px + pw + TS * 0.35, gy - TS * 0.3); ctx.stroke();
  ctx.fillStyle = '#888d99'; ctx.fillRect(px + pw + TS * 0.28, gy - TS * 0.3, TS * 0.14, TS * 0.18);
  ctx.fillStyle = CFG.GRASS; ctx.fillRect(0, gy - TS * 0.08, W, TS * 0.1);
}
function drawWorld() {
  artPrep();
  const cam = G.camY;
  if (cam < 0) drawSurface(cam); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  const r0 = Math.max(0, Math.floor(cam)), r1 = Math.min(ROWS - 1, Math.ceil(cam + H / TS));
  for (let y = r0; y <= r1; y++) for (let x = 0; x < COLS; x++) drawTile(world[y * COLS + x], x, y, x * TS, (y - cam) * TS);
  if (r0 === 0) {   // grass cap on the top row
    const py = -cam * TS, h = Math.max(3, TS * 0.2);
    for (let x = 0; x < COLS; x++) if (world[x]) {
      ctx.fillStyle = CFG.GRASS; ctx.fillRect(x * TS, py - TS * 0.06, TS + 0.6, h);
      ctx.fillStyle = CFG.GRASS_DARK; ctx.fillRect(x * TS, py - TS * 0.06 + h, TS + 0.6, Math.max(1, TS * 0.04));
      ctx.fillStyle = CFG.GRASS; for (let k = 0; k < 3; k++) { const gx = x * TS + TS * (0.15 + k * 0.33 + hash(x, k) * 0.1); ctx.fillRect(gx, py - TS * 0.16, Math.max(1, TS * 0.07), TS * 0.12); }
    }
  }
  if (r1 >= ROWS - 1) { ctx.fillStyle = '#05050a'; ctx.fillRect(0, (ROWS - cam) * TS, W, H); }
}
// darkness below LIGHT_FROM: one radial gradient around the drill, plus faint glints for ore / gas / magma / tunnels
// first-time control hint: a ghost finger presses, slides down, and a ring shows the hidden joystick
function drawControlHint() {
  const k = (G.time % 2.2) / 2.2, x = W / 2, y0 = H * 0.56, down = Math.min(1, Math.max(0, (k - 0.2) / 0.45)) * 46 * U;
  const a = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1;
  ctx.save(); ctx.globalAlpha = 0.85 * a;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.arc(x, y0, CFG.JOY_RADIUS, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(x, y0 + down, 17 * U, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
  ctx.restore();
  const ty = y0 - CFG.JOY_RADIUS - 22 * U;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(x - 150 * U, ty - 26 * U, 300 * U, 50 * U, 12 * U); ctx.fill();
  txt('HOLD & SLIDE ANYWHERE', x, ty - 8 * U, 20 * U, '#ffffff', 'center', true);
  txt('to drive the drill', x, ty + 12 * U, 15 * U, '#ffe14a', 'center', true);
}
// fast climb: the button while a dug path leads up, and a fast-forward look while it runs
function drawFastClimb() {
  if (G.ff) {
    const k = G.ff.t / G.ff.dur, a = Math.sin(Math.PI * Math.min(1, k)) ;
    ctx.fillStyle = 'rgba(70,140,255,' + (0.16 * a) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.10 * a) + ')';
    const off = (G.time * 900) % (14 * U);
    for (let y = H + off; y > 0; y -= 14 * U) ctx.fillRect(0, y, W, 2 * U);        // scanlines rushing down
    ctx.globalAlpha = a;
    const bx = W / 2, by = H * 0.24, s = 22 * U;
    for (let j = 0; j < 2; j++) {                                                    // two big up-arrows
      const y = by + j * s * 1.1 - ((G.time * 6) % 1) * s * 0.3;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(bx - s, y + s * 0.6); ctx.lineTo(bx, y - s * 0.4); ctx.lineTo(bx + s, y + s * 0.6); ctx.fill();
    }
    txt('FAST CLIMB', bx, by + s * 2.7, 22 * U, '#bfe3ff', 'center', true);
    ctx.globalAlpha = 1;
    G.ffShown = false; return;
  }
  G.ffShown = !!ffAvailable();
  if (!G.ffShown) return;
  const r = ffRect(), p = 0.5 + 0.5 * Math.sin(G.time * 3);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(r.x + 2 * U, r.y + 4 * U, r.w, r.h, r.h / 2); ctx.fill();
  ctx.fillStyle = 'rgb(' + Math.round(70 + 30 * p) + ',150,255)'; rr(r.x, r.y, r.w, r.h, r.h / 2); ctx.fill();
  const ax = r.x + 26 * U, ay = r.y + r.h / 2, s = 8 * U;
  ctx.fillStyle = '#ffffff';
  for (let j = 0; j < 2; j++) { const y = ay - 3 * U + j * 7 * U; ctx.beginPath(); ctx.moveTo(ax - s, y + s * 0.5); ctx.lineTo(ax, y - s * 0.5); ctx.lineTo(ax + s, y + s * 0.5); ctx.fill(); }
  txt('FAST CLIMB', r.x + r.w / 2 + 12 * U, ay, 18 * U, '#ffffff', 'center', true);
}
function drawDarkness() {
  const d = G.drill, depth = d.y + 1, amt = Math.max(0, Math.min(1, (depth - CFG.LIGHT_FROM) / CFG.LIGHT_RAMP));
  if (amt <= 0) return;
  const cam = G.camY, cx = (d.x + 0.5) * TS, cy = (d.y + 0.5 - cam) * TS;
  const R = lerp(CFG.LIGHT_RADIUS_TOP, CFG.LIGHT_RADIUS_BOTTOM, (depth - CFG.LIGHT_FROM) / (ROWS - CFG.LIGHT_FROM)) * TS * (1 + 0.012 * Math.sin(G.time * 7));
  const D = CFG.LIGHT_DARK * amt, c = CFG.LIGHT_TINT;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, 'rgba(' + c + ',0)'); g.addColorStop(0.45, 'rgba(' + c + ',0)');
  g.addColorStop(0.75, 'rgba(' + c + ',' + (D * 0.55) + ')'); g.addColorStop(1, 'rgba(' + c + ',' + D + ')');
  ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
  const r0 = Math.max(0, Math.floor(cam)), r1 = Math.min(ROWS - 1, Math.ceil(cam + H / TS));
  ctx.globalCompositeOperation = 'lighter';
  for (let y = r0; y <= r1; y++) for (let x = 0; x < COLS; x++) {
    const t = world[y * COLS + x];
    if (t === T_DIRT || t === T_ROCK) continue;
    const px = x * TS, py = (y - cam) * TS, mx = px + TS / 2, my = py + TS / 2;
    const f = Math.max(0, Math.min(1, (Math.hypot(mx - cx, my - cy) / R - 0.5) / 0.35)) * amt;
    if (f <= 0) continue;
    const tw = 0.5 + 0.5 * Math.sin(G.time * 4 + hash(x, y) * 40);
    if (t === T_EMPTY) { ctx.fillStyle = 'rgba(90,115,160,' + CFG.GLINT_TUNNEL * f + ')'; ctx.fillRect(px, py, TS + 0.6, TS + 0.6); }
    else if (t === T_GAS) {
      const p = 0.7 + 0.3 * Math.sin(G.time * 2.2 + hash(x, y) * 40);
      ctx.fillStyle = 'rgba(150,255,100,' + CFG.GLINT_GAS * f * p + ')'; ctx.beginPath(); ctx.arc(mx, my, TS * 0.16, 0, 7); ctx.fill();
    } else if (t === T_MAGMA) {
      const p = 0.55 + 0.45 * Math.sin(G.time * 3 + hash(x, y) * 40);
      ctx.fillStyle = 'rgba(255,100,20,' + CFG.GLINT_MAGMA * f * 0.5 * p + ')'; ctx.beginPath(); ctx.arc(mx, my, TS * 0.38, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,190,70,' + CFG.GLINT_MAGMA * f * p + ')'; ctx.beginPath(); ctx.arc(mx, my, TS * 0.14, 0, 7); ctx.fill();
    } else if (t >= T_ORE) {
      const o = CFG.ORES[t - T_ORE], rgb = hexRGB(o.glint);
      ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + CFG.GLINT_ORE * f * Math.max(0, tw - 0.55) / 0.45 + ')';
      const k = TS * 0.05; ctx.fillRect(mx - k, my - k * 3, k * 2, k * 6); ctx.fillRect(mx - k * 3, my - k, k * 6, k * 2);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
function drawRocks() {
  artPrep();
  for (const r of G.rocks) {
    const warn = r.warn > 0, jx = warn ? rnd(-1, 1) * TS * 0.06 : 0;
    const px = r.x * TS + jx, py = (r.y - G.camY) * TS;
    if (warn && Math.sin(G.time * 30) > 0) {
      ctx.fillStyle = 'rgba(255,50,40,0.22)'; ctx.fillRect(r.x * TS, py, TS, (G.drill.y - r.y + 1) * TS);
      txt('!', px + TS / 2, py + TS * 1.6, TS * 1.2, '#ff3a2a', 'center', true);
    }
    ctx.drawImage(artLayer(2, (r.x | 0) & 3), px, py, TS, TS);
  }
}
// ---- drill ----
const puffs = [];
let trkPhase = 0, spinPhase = 0, lastGT = 0, lastDX = 0, lastDY = 0, puffAcc = 0;
function drawDrill() {
  const d = G.drill, mv = d.move, dig = mv && mv.dig, off = G.outOfFuel, C = CFG;
  const dt = Math.max(0, Math.min(0.1, G.time - lastGT)); lastGT = G.time;
  trkPhase += Math.hypot(d.x - lastDX, d.y - lastDY); lastDX = d.x; lastDY = d.y;
  spinPhase += dt * (dig ? 45 : mv ? 10 : 2);
  // exhaust puffs
  if (mv && !off) {
    puffAcc += dt * 14;
    while (puffAcc >= 1) { puffAcc--; puffs.push({ x: d.x + 0.5 - d.face.x * 0.42 + rnd(-0.05, 0.05), y: d.y + 0.5 - d.face.y * 0.42 - 0.2, vx: rnd(-0.4, 0.4) - d.face.x * 0.8, vy: -rnd(0.8, 1.6), life: 0.7, max: 0.7, r: rnd(0.06, 0.1) }); }
    if (puffs.length > 40) puffs.splice(0, puffs.length - 40);
  }
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i]; p.life -= dt; if (p.life <= 0) { puffs.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    ctx.fillStyle = 'rgba(205,205,212,' + (p.life / p.max * 0.5) + ')'; ctx.beginPath();
    ctx.arc(p.x * TS, (p.y - G.camY) * TS, (p.r + (1 - p.life / p.max) * 0.16) * TS, 0, 7); ctx.fill();
  }
  const cx = (d.x + 0.5) * TS + (dig ? rnd(-1, 1) * TS * 0.04 : 0), cy = (d.y + 0.5 - G.camY) * TS + (dig ? rnd(-1, 1) * TS * 0.04 : 0);
  ctx.save(); ctx.translate(cx, cy);
  if (d.face.x < 0) { ctx.rotate(Math.PI); ctx.scale(1, -1); } else ctx.rotate(Math.atan2(d.face.y, d.face.x));
  ctx.lineJoin = 'round';
  const body = off ? C.DRILL_BODY_OFF : C.DRILL_BODY, line = off ? C.DRILL_OUTLINE_OFF : C.DRILL_OUTLINE, lw = Math.max(1, TS * 0.035);
  // treads (two, top and bottom), lugs move with the distance travelled
  [-1, 1].forEach(sd => {
    const ty = sd < 0 ? -TS * 0.46 : TS * 0.28;
    ctx.fillStyle = C.DRILL_TREAD; rr(-TS * 0.43, ty, TS * 0.72, TS * 0.18, TS * 0.08); ctx.fill();
    ctx.fillStyle = '#5a5f6c'; const ph = (trkPhase * TS * 0.35) % (TS * 0.1);
    for (let i = 0; i < 7; i++) { const lx = -TS * 0.4 + ph + i * TS * 0.1; if (lx < TS * 0.25) ctx.fillRect(lx, ty + TS * 0.02, Math.max(1, TS * 0.035), TS * 0.14); }
    ctx.fillStyle = '#9097a5'; ctx.beginPath(); ctx.arc(-TS * 0.32, ty + TS * 0.09, TS * 0.05, 0, 7); ctx.arc(TS * 0.2, ty + TS * 0.09, TS * 0.05, 0, 7); ctx.fill();
  });
  // bit: cone with moving spiral stripes
  ctx.fillStyle = '#b8bcc6'; ctx.beginPath(); ctx.moveTo(TS * 0.26, -TS * 0.3); ctx.lineTo(TS * 0.64, 0); ctx.lineTo(TS * 0.26, TS * 0.3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#4d515c'; ctx.lineWidth = lw; ctx.stroke();
  ctx.strokeStyle = '#5d616b'; ctx.lineWidth = Math.max(1, TS * 0.05);
  for (let i = 0; i < 4; i++) { const f = ((i / 4 + spinPhase * 0.12) % 1), x = TS * (0.27 + f * 0.34), h = TS * 0.3 * (1 - f * 0.95); ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x + TS * 0.05, h); ctx.stroke(); }
  // body
  ctx.fillStyle = body; rr(-TS * 0.38, -TS * 0.31, TS * 0.64, TS * 0.62, TS * 0.15); ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(-TS * 0.33, -TS * 0.27, TS * 0.54, TS * 0.1, TS * 0.05); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; rr(-TS * 0.33, TS * 0.2, TS * 0.54, TS * 0.07, TS * 0.03); ctx.fill();
  ctx.fillStyle = '#2f3340'; ctx.fillRect(-TS * 0.34, -TS * 0.37, TS * 0.07, TS * 0.08);   // exhaust pipe
  // cockpit with reflection
  ctx.fillStyle = off ? '#3a3f4a' : C.DRILL_GLASS; rr(-TS * 0.27, -TS * 0.19, TS * 0.3, TS * 0.38, TS * 0.08); ctx.fill();
  ctx.strokeStyle = '#1a2433'; ctx.lineWidth = lw; ctx.stroke();
  ctx.fillStyle = 'rgba(200,235,255,0.65)'; ctx.beginPath();
  ctx.moveTo(-TS * 0.22, -TS * 0.15); ctx.lineTo(-TS * 0.1, -TS * 0.15); ctx.lineTo(-TS * 0.2, TS * 0.0); ctx.lineTo(-TS * 0.22, TS * 0.0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-TS * 0.08, TS * 0.08, TS * 0.05, TS * 0.05);
  if (!off) { ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(TS * 0.22, -TS * 0.2, TS * 0.04, 0, 7); ctx.fill(); }   // headlight
  ctx.restore();
}
function muteRect() { const s = 28 * U; return { x: W - 10 * U - s, y: 112 * U, w: s, h: s }; }
// music on/off, left of the mute icon
function musicRect() { const m = muteRect(); return { x: m.x - m.w - 8 * U, y: m.y, w: m.w, h: m.h }; }
function drawMusic() {
  const r = musicRect(), cx = r.x + r.w / 2, cy = r.y + r.h / 2, u = r.w / 28;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(r.x, r.y, r.w, r.h, 6 * U); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * u;
  ctx.beginPath(); ctx.ellipse(cx - 4 * u, cy + 6 * u, 4 * u, 3 * u, -0.4, 0, 7); ctx.fill();          // note head
  ctx.beginPath(); ctx.moveTo(cx - 0.5 * u, cy + 5 * u); ctx.lineTo(cx - 0.5 * u, cy - 9 * u); ctx.lineTo(cx + 7 * u, cy - 6 * u); ctx.stroke();
  if (!musicOn) { ctx.strokeStyle = '#ff6a5a'; ctx.lineWidth = 2.4 * u; ctx.beginPath(); ctx.moveTo(cx - 10 * u, cy - 10 * u); ctx.lineTo(cx + 10 * u, cy + 10 * u); ctx.stroke(); }
}
// start-over button under the mute icon, only at the surface (two confirmations before the wipe)
function wipeRect() { const s = 28 * U, m = muteRect(); return { x: m.x, y: m.y + m.h + 10 * U, w: s, h: s }; }
function drawWipe() {
  if (!atSurface()) return;
  const r = wipeRect(), cx = r.x + r.w / 2, cy = r.y + r.h / 2, u = r.w / 28;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(r.x, r.y, r.w, r.h, 6 * U); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, 7.5 * u, -Math.PI * 0.35, Math.PI * 1.45); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath();                       // arrow head of the circular arrow
  ctx.moveTo(cx + 8.5 * u, cy - 9.5 * u); ctx.lineTo(cx + 9.5 * u, cy - 2 * u); ctx.lineTo(cx + 2.5 * u, cy - 4.5 * u); ctx.fill();
}
function drawMute() {
  const r = muteRect(), cx = r.x + r.w / 2, cy = r.y + r.h / 2, u = r.w / 28;
  ctx.fillStyle = 'rgba(8,10,18,0.55)'; rr(r.x, r.y, r.w, r.h, 7 * u); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 8 * u, cy - 3 * u); ctx.lineTo(cx - 4 * u, cy - 3 * u); ctx.lineTo(cx + 1 * u, cy - 8 * u); ctx.lineTo(cx + 1 * u, cy + 8 * u); ctx.lineTo(cx - 4 * u, cy + 3 * u); ctx.lineTo(cx - 8 * u, cy + 3 * u); ctx.closePath(); ctx.fill();
  if (muted) { ctx.strokeStyle = '#ff6a5a'; ctx.beginPath(); ctx.moveTo(cx + 4 * u, cy - 4 * u); ctx.lineTo(cx + 10 * u, cy + 4 * u); ctx.moveTo(cx + 10 * u, cy - 4 * u); ctx.lineTo(cx + 4 * u, cy + 4 * u); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(cx + 2 * u, cy, 5 * u, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 2 * u, cy, 9 * u, -0.9, 0.9); ctx.stroke(); }
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
    if (blink) txt(G.outOfFuel ? 'OUT OF FUEL' : 'LOW FUEL - GO UP!', W / 2, 128 * U, 24 * U, '#ff4a3a', 'center', true);
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
  drawWorld(); drawDarkness(); drawRocks(); drawDrill();
  for (const p of G.particles) {
    ctx.globalAlpha = Math.min(1, p.life / p.max * 1.6); ctx.fillStyle = p.color;
    const s = p.size * TS; ctx.fillRect(p.x * TS - s / 2, (p.y - G.camY) * TS - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  // start hint: a bouncing arrow under the drill until the first dig
  if (G.dug < CFG.HINT_DIGS && !G.drill.move && !ptr) drawControlHint();
  if (G.dug === 0 && !G.drill.move && ptr) {   // arrow only while the finger is down; before that the control hint explains it
    const cx = (G.drill.x + 0.5) * TS, cy = (G.drill.y + 1.9 - G.camY) * TS + Math.sin(G.time * 6) * TS * 0.25;
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.moveTo(cx - TS * 0.5, cy - TS * 0.3); ctx.lineTo(cx + TS * 0.5, cy - TS * 0.3); ctx.lineTo(cx, cy + TS * 0.4); ctx.fill();
  }
  ctx.restore();
  drawShop(); drawHUD(); drawContract(); drawMute(); drawMusic(); drawWipe(); drawFastClimb(); audioTick();
  for (const f of G.floats) {
    const k = f.t / f.dur, pop = Math.min(1, f.t * 10);
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    txt(f.text, Math.max(50 * U, Math.min(W - 50 * U, f.x)), f.y, f.size * (0.6 + 0.4 * pop), f.color, 'center', true);
  }
  ctx.globalAlpha = 1;
  if (G.banners.length) {
    const b = G.banners[0], inK = Math.min(1, b.t * 7), s = 1 + (1 - inK) * 0.25 + 0.02 * Math.sin(G.time * 12);
    let size = 30 * U; ctx.font = '800 ' + size + 'px system-ui,sans-serif';
    ctx.save(); ctx.translate(W / 2, 176 * U); ctx.scale(s, s);
    ctx.font = '800 ' + Math.round(size) + 'px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
    const tw = ctx.measureText(b.text).width * s; if (tw > W * 0.86) size *= W * 0.86 / tw;   // fits even while it pops in
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
// the current contract: a strip under the HUD, visible everywhere
function drawContract() {
  const c = G.contract; if (!c) return;
  const y = 84 * U, h = 24 * U;
  ctx.fillStyle = c.done ? 'rgba(30,90,40,0.85)' : 'rgba(8,10,18,0.6)'; ctx.fillRect(0, y, W, h);
  txt('CONTRACT', 10 * U, y + h / 2, 11 * U, '#8c93a3', 'left');
  txt(c.done ? 'DONE!' : contractText(c), 82 * U, y + h / 2, 13 * U, '#fff', 'left');
  txt('+$' + c.reward, W - 10 * U, y + h / 2, 14 * U, '#7dff8a', 'right');
}
