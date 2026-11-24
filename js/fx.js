'use strict';
// Juice: particles, floating text, banners, flash, shake.
/* ---------------- juice helpers ---------------- */
function burst(x, y, n, color, speed, life, size) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(0.3, 1) * speed;
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life: rnd(0.5, 1) * life, max: life, color, size: rnd(0.5, 1) * (size || 0.16) });
  }
  if (G.particles.length > 900) G.particles.splice(0, G.particles.length - 900);
}
function floatText(text, x, y, color, size, dur) { G.floats.push({ text, x, y, color, size: size || 20, t: 0, dur: dur || 1.2 }); }
function banner(text, color) { G.banners.push({ text, color: color || '#fff', t: 0 }); if (G.banners.length > 3) G.banners.shift(); }
function flash(color, a) { G.flash = { color, a: a || 0.6 }; }
function shake(v) { G.shake = Math.max(G.shake, v * U); }
function after(t, fn) { G.timers.push({ t, fn }); }
const dirtRGB = (y, h) => {
  let b = CFG.BANDS[0];
  for (const x of CFG.BANDS) if (y >= x.from) b = x;
  const n = parseInt(b.base.slice(1), 16), m = 0.85 + 0.3 * h;
  return [Math.min(255, (n >> 16) * m | 0), Math.min(255, ((n >> 8) & 255) * m | 0), Math.min(255, (n & 255) * m | 0)];
};
const dirtColor = (y, h) => { const c = dirtRGB(y, h); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };
