'use strict';
// Game rules: shop, drill movement, ores, hazards, update step.
/* ---------------- shop ---------------- */
const UP_KEYS = ['speed', 'cargo', 'fuel'];
const UP_NAMES = { speed: 'DRILL SPEED', cargo: 'CARGO HOLD', fuel: 'FUEL TANK' };
function shopRects() {
  const ph = H * CFG.SHOP_PANEL_FRAC, py = H - ph, pad = 10 * U;
  const sell = { x: pad, y: py + pad, w: W - 2 * pad, h: ph * 0.34 };
  const bw = (W - 4 * pad) / 3, by = sell.y + sell.h + pad, bh = H - by - pad * 1.6;
  return { py, ph, sell, ups: UP_KEYS.map((k, i) => ({ k, x: pad + i * (bw + pad), y: by, w: bw, h: bh })) };
}
const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function tap(x, y) {
  if (!atSurface()) return;
  const s = shopRects();
  if (inRect(s.sell, x, y)) return sellCargo();
  for (const b of s.ups) if (inRect(b, x, y)) return buyUpgrade(b.k, b);
}
function sellCargo() {
  if (!G.cargo.length) return;
  const full = G.cargo.length >= cargoMax(), total = cargoValue();
  const groups = {}; G.cargo.forEach(i => { groups[i] = (groups[i] || 0) + 1; });
  const d = G.drill, sx = (d.x + 0.5) * TS, sy = (d.y - G.camY) * TS;
  Object.keys(groups).forEach((k, n) => {
    const o = CFG.ORES[k], sum = o.value * groups[k];
    after(n * 0.16, () => {
      floatText('+$' + sum, sx + rnd(-60, 60) * U, sy - 10 * U - n * 6 * U, o.value >= 100 ? '#ffe14a' : '#7dff8a', (22 + Math.min(18, sum / 40)) * U, 1.5);
      burst(d.x + 0.5, d.y + 0.3, 14, '#ffd84a', 6, 0.9, 0.2);
      sndSell(1 + n * 0.12);
    });
  });
  G.money += total; G.cargo = [];
  emit('sell', { total, full });
  shake(full ? CFG.SHAKE_SELL : CFG.SHAKE_SELL * 0.5);
  if (full) { flash('#ffe14a', 0.45); banner('FULL LOAD  +$' + total, '#ffe14a'); burst(d.x + 0.5, d.y + 0.3, 60, '#ffd84a', 10, 1.3, 0.24); }
}
function buyUpgrade(k, r) {
  const c = upCost(k);
  if (G.money < c) { floatText('NEED $' + c, r.x + r.w / 2, r.y, '#ff6a5a', 16 * U, 0.9); return; }
  G.money -= c; G.lv[k]++;
  emit('upgrade', { k, lv: G.lv[k] + 1 });
  if (k === 'fuel') G.fuel = fuelMax();
  flash('#ffffff', 0.75); shake(CFG.SHAKE_SELL);
  banner(UP_NAMES[k] + '  LV ' + (G.lv[k] + 1), '#8fe9ff');
  burst(G.drill.x + 0.5, G.drill.y + 0.5, 50, '#8fe9ff', 9, 1.1, 0.2);
  sndSell(1.5);
}

/* ---------------- drill logic ---------------- */
function hardness(y, t) {
  return lerp(1, CFG.HARDNESS_AT_BOTTOM, y / (ROWS - 1)) * (t === T_ROCK ? CFG.ROCK_HARDNESS : 1);
}
function tryStartMove() {
  const d = G.drill;
  const out = G.fuel <= 0 && d.ty >= 0;
  let dir = out ? { x: 0, y: -1 } : inputDir();
  if (!dir) return;
  d.face = dir;
  const nx = d.tx + dir.x, ny = d.ty + dir.y;
  if (nx < 0 || nx >= COLS || ny < -1 || ny >= ROWS) return;
  const t = tile(nx, ny), solid = t !== T_EMPTY;
  let dur;
  if (out) dur = CFG.CRAWL_TIME;
  else if (solid) dur = CFG.DIG_TIME * hardness(ny, t) / speedMult();
  else dur = CFG.MOVE_TIME / speedMult();
  if (!out && (ny >= 0 || d.ty >= 0)) {
    G.fuel = Math.max(0, G.fuel - (solid ? CFG.FUEL_PER_DIG : CFG.FUEL_PER_MOVE));
    if (G.fuel <= 0 && ny >= 0 && !G.outOfFuel) { G.outOfFuel = true; banner('OUT OF FUEL - CRAWLING UP', '#ff5a4a'); shake(8);
      const n = loseCargo(CFG.OUT_OF_FUEL_CARGO_LOSS);
      if (n) floatText('-' + n + ' CARGO', (d.x + 0.5) * TS, (d.y - G.camY) * TS, '#ff5a4a', 24 * U, 1.6); }
  }
  d.move = { fx: d.tx, fy: d.ty, tx: nx, ty: ny, t: 0, dur, dig: solid, type: t };
  if (solid) sndDig(t >= T_ORE);
}
function finishMove(m) {
  const d = G.drill, wasBelow = m.fy >= 0;
  d.tx = m.tx; d.ty = m.ty; d.x = m.tx; d.y = m.ty; d.move = null;
  if (m.ty >= 0) setTile(m.tx, m.ty, T_EMPTY);
  if (m.dig) {
    G.dug++;
    const t = m.type, cx = m.tx + 0.5, cy = m.ty + 0.5;
    if (t >= T_ORE) collectOre(t - T_ORE, cx, cy);
    else if (t === T_GAS) explode(m.tx, m.ty);
    else shake(CFG.SHAKE_DIG);
    burst(cx, cy, 8, dirtColor(m.ty, 0.5), 4, 0.6, 0.18);
    if (m.fy <= m.ty) maybeCaveIn();
  }
  const depth = d.ty + 1;
  if (depth > G.record) {
    G.record = depth; emit('record', { depth });
    if (depth >= G.nextRecord) {
      G.nextRecord = Math.floor(depth / CFG.RECORD_STEP) * CFG.RECORD_STEP + CFG.RECORD_STEP;
      banner('NEW DEPTH RECORD  ' + depth, '#ffffff'); flash('#ffffff', 0.25);
    }
  }
  if (d.ty === -1 && wasBelow) arriveSurface();
}
function collectOre(i, cx, cy) {
  const o = CFG.ORES[i], sx = cx * TS, sy = (cy - G.camY) * TS;
  burst(cx, cy, 16, o.color, 6, 0.8, 0.2); burst(cx, cy, 8, o.shine, 7, 0.6, 0.12);
  shake(CFG.SHAKE_ORE);
  if (G.cargo.length < cargoMax()) {
    G.cargo.push(i);
    floatText('+' + o.name, sx, sy - 8 * U, o.shine, 15 * U, 0.8);
    if (G.cargo.length === cargoMax()) floatText('CARGO FULL', sx, sy - 30 * U, '#ffb347', 20 * U, 1.4);
  } else floatText('CARGO FULL', sx, sy - 8 * U, '#ff6a5a', 18 * U, 1.0);
  if (!G.seenOre[i]) {
    G.seenOre[i] = true; G.firstOreTime[i] = G.time;
    banner('FIRST ' + o.name.toUpperCase() + ' VEIN!', o.shine); flash(o.color, 0.4);
    burst(cx, cy, 50, o.shine, 10, 1.2, 0.2); shake(CFG.SHAKE_SELL);
  }
}
function loseCargo(frac) {
  const n = Math.ceil(G.cargo.length * frac);
  for (let i = 0; i < n; i++) G.cargo.splice(rint(0, G.cargo.length - 1), 1);
  return n;
}
function explode(x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || xx >= COLS || yy < 0 || yy >= ROWS) continue;
    const t = tile(xx, yy);
    if (t !== T_EMPTY && t < T_ORE) setTile(xx, yy, T_EMPTY);
  }
  const n = loseCargo(CFG.GAS_CARGO_LOSS);
  shake(CFG.SHAKE_EXPLOSION); flash('#ff8a2a', 0.7); sndExplosion();
  burst(x + 0.5, y + 0.5, 70, '#ff9a2a', 12, 1.1, 0.26); burst(x + 0.5, y + 0.5, 40, '#fff0a0', 8, 0.7, 0.18);
  burst(x + 0.5, y + 0.5, 30, '#444', 6, 1.5, 0.3);
  banner('GAS POCKET!', '#ff8a2a');
  if (n) floatText('-' + n + ' CARGO', (x + 0.5) * TS, (y - G.camY) * TS, '#ff5a4a', 24 * U, 1.6);
}
function maybeCaveIn() {
  const d = G.drill, depth = d.ty + 1;
  if (depth < CFG.CAVE_FROM || G.rocks.length) return;
  const p = lerp(CFG.CAVE_CHANCE_START, CFG.CAVE_CHANCE_END, (depth - CFG.CAVE_FROM) / (ROWS - CFG.CAVE_FROM));
  if (Math.random() >= p) return;
  let y = d.ty - 1; if (y < 0) return;
  const t = tile(d.tx, y);
  if (t >= T_ORE || t === T_GAS) return;
  if (t !== T_EMPTY) setTile(d.tx, y, T_EMPTY);            // the ceiling breaks loose
  else { let n = 0; while (y - 1 >= 0 && tile(d.tx, y - 1) === T_EMPTY && n < CFG.CAVE_MAX_HEIGHT) { y--; n++; } }
  G.rocks.push({ x: d.tx, y, warn: CFG.CAVE_WARN });
  noise(0.5, 220, 0.5);
}
function updateRocks(dt) {
  const d = G.drill;
  for (let i = G.rocks.length - 1; i >= 0; i--) {
    const r = G.rocks[i];
    if (r.warn > 0) { r.warn -= dt; if (Math.random() < dt * 30) burst(r.x + rnd(0.1, 0.9), r.y + 1, 1, '#998', 1.5, 0.5, 0.1); continue; }
    r.y += CFG.CAVE_FALL_SPEED * dt;
    if (Math.abs(d.x - r.x) < 0.5 && r.y >= d.y - 0.8 && r.y <= d.y + 0.5) {       // hit the drill
      const n = loseCargo(CFG.CAVE_CARGO_LOSS);
      G.fuel = Math.max(0, G.fuel - CFG.CAVE_FUEL_LOSS);
      shake(CFG.SHAKE_ROCK); flash('#ff3a2a', 0.5); sndExplosion();
      burst(r.x + 0.5, d.y, 40, '#8a8a92', 9, 1.0, 0.24);
      banner('CAVE-IN!', '#ff5a4a');
      floatText((n ? '-' + n + ' CARGO  ' : '') + '-' + CFG.CAVE_FUEL_LOSS + ' FUEL', (r.x + 0.5) * TS, (d.y - G.camY) * TS, '#ff5a4a', 20 * U, 1.6);
      G.rocks.splice(i, 1); continue;
    }
    const below = Math.ceil(r.y);
    if (below >= ROWS || tile(r.x, below) !== T_EMPTY) {                           // landed
      const row = below - 1;
      if (row >= 0 && !(d.tx === r.x && d.ty === row)) setTile(r.x, row, T_ROCK);
      shake(CFG.SHAKE_ROCK * 0.5); noise(0.25, 300, 0.6);
      burst(r.x + 0.5, row + 0.8, 18, '#8a8a92', 5, 0.7, 0.2);
      G.rocks.splice(i, 1);
    }
  }
}
function arriveSurface() {
  const frac = G.fuel / fuelMax();
  if (G.outOfFuel) banner('RESCUED - TANK REFILLED', '#8fe9ff');
  else if (frac < CFG.CLOSE_CALL_FRAC) { banner('CLOSE CALL!', '#7dff8a'); flash('#7dff8a', 0.4); shake(CFG.SHAKE_SELL); burst(G.drill.x + 0.5, -0.5, 50, '#7dff8a', 9, 1.2, 0.2); }
  G.fuel = fuelMax(); G.outOfFuel = false;
  emit('surface', {});
}

/* ---------------- update ---------------- */
function update(dt) {
  G.time += dt;
  const d = G.drill;
  if (d.move) {
    const m = d.move; m.t += dt;
    const k = Math.min(1, m.t / m.dur);
    d.x = m.fx + (m.tx - m.fx) * k; d.y = m.fy + (m.ty - m.fy) * k;
    if (m.dig) {
      G.digAcc += dt * CFG.DIG_PARTICLES_PER_SEC;
      while (G.digAcc >= 1) {
        G.digAcc--;
        const o = m.type >= T_ORE ? CFG.ORES[m.type - T_ORE] : null;
        const px = d.x + 0.5 + d.face.x * 0.5 + rnd(-0.3, 0.3), py = d.y + 0.5 + d.face.y * 0.5 + rnd(-0.3, 0.3);
        G.particles.push({ x: px, y: py, vx: -d.face.x * rnd(1, 5) + rnd(-2, 2), vy: -d.face.y * rnd(1, 5) + rnd(-3, 1),
          life: rnd(0.3, 0.7), max: 0.7, color: o && Math.random() < 0.5 ? o.color : dirtColor(m.ty, Math.random()), size: rnd(0.08, 0.2) });
      }
      G.shake = Math.max(G.shake, CFG.SHAKE_DIG * U * 0.6);
    }
    if (k >= 1) finishMove(m);
  }
  if (!d.move) tryStartMove();
  updateRocks(dt);

  for (let i = G.timers.length - 1; i >= 0; i--) { const t = G.timers[i]; t.t -= dt; if (t.t <= 0) { G.timers.splice(i, 1); t.fn(); } }
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i]; p.life -= dt;
    if (p.life <= 0) { G.particles.splice(i, 1); continue; }
    p.vy += 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = G.floats.length - 1; i >= 0; i--) { const f = G.floats[i]; f.t += dt; f.y -= 46 * U * dt; if (f.t >= f.dur) G.floats.splice(i, 1); }
  if (G.banners.length) { G.banners[0].t += dt; if (G.banners[0].t > CFG.BANNER_TIME / (G.banners.length > 1 ? 2 : 1)) G.banners.shift(); }
  G.shake *= Math.exp(-dt * CFG.SHAKE_DECAY); if (G.shake < 0.2) G.shake = 0;
  if (G.flash) { G.flash.a -= dt * 2.2; if (G.flash.a <= 0) G.flash = null; }
  G.moneyShown += (G.money - G.moneyShown) * Math.min(1, dt * 7);
  if (Math.abs(G.money - G.moneyShown) < 0.6) G.moneyShown = G.money;
  const rowsOnScreen = H / TS, target = Math.max(-rowsOnScreen * CFG.CAMERA_DRILL_FRAC - 1, d.y - rowsOnScreen * CFG.CAMERA_DRILL_FRAC);
  G.camY += (target - G.camY) * Math.min(1, dt * CFG.CAMERA_LERP);
}
