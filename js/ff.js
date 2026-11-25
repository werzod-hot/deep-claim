'use strict';
// Fast climb: when a dug path leads to the surface, one tap carries the drill up it in ~2 s
// (fuel is spent as for a normal climb; with too little fuel it still works, just slower). Rules here, drawing in drawFastClimb(), tap in input.js.

// shortest dug path from the drill to the surface (list of tiles, last one is y = -1), or null
function ffPath() {
  const d = G.drill;
  if (d.ty < 0) return null;
  const start = d.ty * COLS + d.tx, prev = new Int32Array(COLS * ROWS).fill(-2);
  prev[start] = -1;
  const q = [start];
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % COLS, y = (i - x) / COLS;
    if (y === 0) {                                     // the row under the surface: one more step up and we are out
      const path = [{ x, y: -1 }];
      for (let j = i; j !== -1; j = prev[j]) path.push({ x: j % COLS, y: Math.floor(j / COLS) });
      return path.reverse();
    }
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const n = ny * COLS + nx;
      if (prev[n] !== -2 || world[n] !== T_EMPTY) continue;
      prev[n] = i; q.push(n);
    }
  }
  return null;
}
// the button shows when this returns a path: deep enough and a dug way up exists (fuel or not, moving or not)
function ffAvailable() {
  const d = G.drill;
  if (G.ff || d.ty + 1 < CFG.FF_MIN_DEPTH) return null;
  return ffPath();                                     // also with an empty tank: losing cargo and diving again is penalty enough
}
function ffStart() {
  const p = ffAvailable();
  if (!p) return false;
  G.drill.move = null; G.drill.x = G.drill.tx; G.drill.y = G.drill.ty;   // drop a step in progress (e.g. crawling), start from its tile
  const enough = !G.outOfFuel && G.fuel >= (p.length - 1) * CFG.FUEL_PER_MOVE;
  G.ff = { path: p, t: 0, dur: enough ? CFG.FF_TIME : CFG.FF_TIME_EMPTY, spent: 0 };   // slower when the tank cannot pay for the climb
  G.drill.face = { x: 0, y: -1 };
  G.rocks = [];                                        // nothing falls on you while you rewind up
  sndFastClimb();
  emit('fast-climb', { depth: G.drill.ty + 1 });
  return true;
}
// runs instead of normal movement while active
function ffUpdate(dt) {
  const f = G.ff, d = G.drill, n = f.path.length - 1;
  f.t += dt;
  const k = Math.min(1, f.t / f.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // ease in-out
  const pos = e * (n - 1), i = Math.min(n - 2, Math.floor(pos)), r = pos - i;
  const a = f.path[Math.max(0, i)], b = f.path[Math.max(0, i) + 1] || a;
  d.x = a.x + (b.x - a.x) * r; d.y = a.y + (b.y - a.y) * r;
  const steps = Math.floor(pos);
  if (steps > f.spent) { G.fuel = Math.max(0, G.fuel - (steps - f.spent) * CFG.FUEL_PER_MOVE); f.spent = steps; }
  if (Math.random() < dt * 40) G.particles.push({ x: d.x + rnd(0.1, 0.9), y: d.y + 1, vx: rnd(-1, 1), vy: rnd(2, 6), life: rnd(0.2, 0.4), max: 0.4, color: '#bfe3ff', size: rnd(0.05, 0.12) });
  if (k >= 1) {
    // stand on the last tile under the surface and make the final step a normal move, so arrival works as usual
    const last = f.path[n - 1], top = f.path[n];
    d.tx = d.x = last.x; d.ty = d.y = last.y;
    d.move = { fx: last.x, fy: last.y, tx: top.x, ty: top.y, t: 0, dur: 0.12, dig: false, type: T_EMPTY };
    G.ff = null;
  }
}
function ffRect() { const w = 190 * U, h = 46 * U; return { x: W / 2 - w / 2, y: H - h - 26 * U, w, h }; }
