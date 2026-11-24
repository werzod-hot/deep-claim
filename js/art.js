'use strict';
// Procedural tile textures, drawn once into offscreen canvases (cached by band / kind / variant) and blitted by render.js.
// kind: 0 solid, 1 tunnel back wall, 2 rock, 3 gas, 4 magma, 10+i ore i. Layers (animated overlays) are band-independent.
const ART = { n: 0, comp: new Map(), lay: new Map(), shadow: null, rows: [] };

(function () {   // per-row band blend table: a (upper band), b (lower band), t (share of b)
  const B = CFG.BANDS, half = CFG.BAND_BLEND / 2;
  for (let y = 0; y < ROWS; y++) {
    const c = y + 0.5; let a = 0;
    for (let i = 0; i < B.length; i++) if (c >= B[i].from) a = i;
    let b = a, t = 0;
    for (let i = 1; i < B.length; i++) {
      const d = c - B[i].from;
      if (Math.abs(d) < half) { a = i - 1; b = i; t = (d + half) / (2 * half); }
    }
    ART.rows[y] = { a, b, t };
  }
})();

const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const shadeHex = (h, k) => { const c = hexRGB(h); return 'rgb(' + Math.min(255, c[0] * k | 0) + ',' + Math.min(255, c[1] * k | 0) + ',' + Math.min(255, c[2] * k | 0) + ')'; };
function mkRand(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function mkCanvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }

// call once per frame: rebuild the caches when the tile size in device pixels changes
function artPrep() {
  const n = Math.max(8, Math.ceil(TS * DPR));
  if (n === ART.n) return;
  ART.n = n; ART.comp.clear(); ART.lay.clear();
  const L = Math.round(n * CFG.SHADOW_FRAC), a = CFG.SHADOW_A;
  const mk = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const c = mkCanvas(n), g = c.getContext('2d'), gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); return c;
  };
  ART.shadow = [mk(0, 0, 0, L, 0, 0, n, L), mk(n, 0, n - L, 0, n - L, 0, L, n), mk(0, n, 0, n - L, 0, n - L, n, L), mk(0, 0, L, 0, 0, 0, L, n)];
}
function artTile(bi, kind, v) {
  const key = bi * 10000 + kind * 10 + v; let c = ART.comp.get(key);
  if (!c) { c = mkCanvas(ART.n); buildTile(c.getContext('2d'), bi, kind, v); ART.comp.set(key, c); }
  return c;
}
function artLayer(kind, v) {
  const key = kind * 10 + v; let c = ART.lay.get(key);
  if (!c) { c = mkCanvas(ART.n); buildLayer(c.getContext('2d'), kind, v); ART.lay.set(key, c); }
  return c;
}

function speckle(g, n, R, cnt, cols, maxS, alpha) {
  g.globalAlpha = alpha;
  for (let i = 0; i < cnt; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; const s = 1 + ((R() * maxS) | 0); g.fillRect((R() * n) | 0, (R() * n) | 0, s, s); }
  g.globalAlpha = 1;
}
function bevel(g, n, B) {
  const b = Math.max(1, Math.round(n / 26));
  g.fillStyle = B.hi; g.fillRect(0, 0, n, b); g.globalAlpha = 0.5; g.fillRect(0, 0, b, n);
  g.fillStyle = B.lo; g.globalAlpha = 1; g.fillRect(0, n - b, n, b); g.globalAlpha = 0.5; g.fillRect(n - b, 0, b, n); g.globalAlpha = 1;
}
function crackPts(R, n) {
  const pts = []; let x = R() < 0.5 ? R() * n * 0.4 : n * (0.6 + R() * 0.4), y = R() * n * 0.3;
  for (let i = 0; i < 4; i++) { pts.push([x, y]); x += (R() - 0.4) * n * 0.35; y += n * (0.18 + R() * 0.15); }
  return pts;
}
function strokePts(g, pts, ox, oy) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy)); g.stroke(); }

function buildTile(g, bi, kind, v) {
  const n = ART.n, B = CFG.BANDS[bi], R = mkRand(bi * 7919 + kind * 131 + v * 17 + 5), lw = Math.max(1, n / 22);
  if (kind === 1) {   // tunnel back wall: dark, faintly textured
    g.fillStyle = shadeHex(B.base, CFG.BACK_DARK); g.fillRect(0, 0, n, n);
    speckle(g, n, R, n / 3 | 0, [shadeHex(B.base, CFG.BACK_DARK * 0.55), shadeHex(B.base, CFG.BACK_DARK * 1.6)], 2, 0.5);
    g.strokeStyle = shadeHex(B.base, CFG.BACK_DARK * 0.6); g.lineWidth = Math.max(1, n / 30); g.globalAlpha = 0.6;
    g.beginPath(); const y0 = R() * n; g.moveTo(0, y0); g.quadraticCurveTo(n * 0.5, y0 + (R() - 0.5) * n * 0.4, n, y0 + (R() - 0.5) * n * 0.3); g.stroke();
    g.globalAlpha = 1; return;
  }
  if (kind === 4) {   // magma: dark crust with dim cracks (the glow is an animated layer)
    g.fillStyle = '#1b0b0e'; g.fillRect(0, 0, n, n);
    speckle(g, n, R, n / 2 | 0, ['#2e1112', '#3c1812', '#0c0408'], 3, 0.8);
    g.strokeStyle = '#8a2f12'; g.lineWidth = lw * 1.2; g.lineJoin = 'round';
    magmaCracks(v, n).forEach(p => strokePts(g, p, 0, 0));
    bevel(g, n, { hi: '#4a2018', lo: '#08030a' }); return;
  }
  // solid base
  g.fillStyle = B.base; g.fillRect(0, 0, n, n);
  speckle(g, n, R, n / 2 | 0, [B.dark], 2, 0.6); speckle(g, n, R, n / 3 | 0, [B.light], 2, 0.5);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (B.style === 'pebbles') {
    for (let k = 0; k < 3; k++) {
      const x = R() * n, y = R() * n, r = n * (0.05 + R() * 0.06);
      g.fillStyle = B.dark; g.beginPath(); g.ellipse(x, y + 1, r * 1.2, r, 0, 0, 7); g.fill();
      g.fillStyle = B.light; g.beginPath(); g.ellipse(x, y, r * 1.2, r, 0, 0, 7); g.fill();
    }
    if (R() < 0.6) {   // a root
      g.strokeStyle = '#5a3a1c'; g.lineWidth = Math.max(1, n / 18);
      let x = R() * n; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + (R() - 0.5) * n * 0.6, n * 0.3, x + (R() - 0.5) * n * 0.5, n * 0.6); g.stroke();
    }
  } else if (B.style === 'streaks') {
    for (let k = 0; k < 3; k++) {
      const y = R() * n, x0 = R() * n * 0.3, x1 = x0 + n * (0.5 + R() * 0.4), c = (R() - 0.5) * n * 0.3;
      g.strokeStyle = B.dark; g.globalAlpha = 0.6; g.lineWidth = Math.max(1, n / 15);
      g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2, y + c, x1, y); g.stroke();
      g.strokeStyle = B.light; g.globalAlpha = 0.25; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, y + lw); g.quadraticCurveTo((x0 + x1) / 2, y + c + lw, x1, y + lw); g.stroke();
    }
    g.globalAlpha = 1;
  } else if (B.style === 'cracks' || B.style === 'glowcracks') {
    g.strokeStyle = B.lo; g.globalAlpha = 0.5; g.lineWidth = Math.max(1, n / 30);   // block seam
    const sy = n * (0.42 + v * 0.05); g.beginPath(); g.moveTo(0, sy); g.lineTo(n, sy); g.stroke();
    g.globalAlpha = 1; g.lineWidth = lw;
    const pts = crackPts(R, n);
    g.strokeStyle = B.lo; strokePts(g, pts, 0, 0);
    g.strokeStyle = B.light; g.globalAlpha = 0.35; g.lineWidth = 1; strokePts(g, pts, 1, 1); g.globalAlpha = 1;
    if (B.style === 'glowcracks' && (v & 1) === 0) { g.strokeStyle = B.crack; g.globalAlpha = 0.45; g.lineWidth = lw * 0.8; strokePts(g, pts, 0, 0); g.globalAlpha = 1; }
  } else if (B.style === 'crystal') {
    for (let k = 0; k < 5; k++) {
      const x = (R() * (n - 3)) | 0, y = (R() * (n - 3)) | 0, s = R() < 0.3 ? 2 : 1;
      g.fillStyle = B.speck; g.globalAlpha = 0.5 + R() * 0.45; g.fillRect(x, y, s, s);
    }
    g.globalAlpha = 0.3; g.strokeStyle = B.speck; g.lineWidth = 1; const x = R() * n, y = R() * n, l = n * 0.07;
    g.beginPath(); g.moveTo(x - l, y); g.lineTo(x + l, y); g.moveTo(x, y - l); g.lineTo(x, y + l); g.stroke(); g.globalAlpha = 1;
  }
  bevel(g, n, B);
  if (kind === 3) {   // gas: dim bubbles (bright pulse is a layer)
    bubbles(v).forEach(b => {
      g.fillStyle = 'rgba(40,100,30,0.6)'; g.strokeStyle = 'rgba(20,50,16,0.85)'; g.lineWidth = Math.max(1, n / 24);
      g.beginPath(); g.arc(b.x * n, b.y * n, b.r * n, 0, 7); g.fill(); g.stroke();
    });
  } else if (kind >= 10) {   // ore: chunky outlined gems
    const o = CFG.ORES[kind - 10];
    gems(kind - 10, v).forEach(m => {
      g.lineJoin = 'round'; g.lineWidth = Math.max(1.5, n * 0.07); g.strokeStyle = 'rgba(8,8,16,0.92)';
      gemPath(g, n, m); g.stroke(); g.fillStyle = o.color; g.fill();
      g.save(); gemPath(g, n, m); g.clip();
      g.fillStyle = o.shine; g.globalAlpha = 0.4;
      g.beginPath(); g.moveTo((m.x - m.r) * n, (m.y - m.r) * n); g.lineTo((m.x + m.r * 0.2) * n, (m.y - m.r) * n); g.lineTo((m.x - m.r) * n, (m.y + m.r * 0.3) * n); g.fill();
      g.fillStyle = '#000'; g.globalAlpha = 0.25;
      g.beginPath(); g.moveTo((m.x + m.r) * n, (m.y - m.r * 0.2) * n); g.lineTo((m.x + m.r) * n, (m.y + m.r) * n); g.lineTo((m.x - m.r * 0.2) * n, (m.y + m.r) * n); g.fill();
      g.restore(); g.globalAlpha = 0.9; g.fillStyle = '#fff';
      g.fillRect((m.x - m.r * 0.5) * n, (m.y - m.r * 0.5) * n, Math.max(1, m.r * n * 0.3), Math.max(1, m.r * n * 0.22)); g.globalAlpha = 1;
    });
  }
}

function buildLayer(g, kind, v) {
  const n = ART.n, lw = Math.max(1, n / 22);
  if (kind === 2) {   // boulder
    const rot = (v - 1.5) * 0.15, path = () => { g.beginPath(); g.ellipse(n * 0.5, n * 0.54, n * 0.43, n * 0.4, rot, 0, 7); };
    path(); g.fillStyle = '#74747f'; g.fill();
    g.save(); path(); g.clip();
    const gr = g.createLinearGradient(0, 0, n, n); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0.4)');
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    g.strokeStyle = 'rgba(30,30,40,0.6)'; g.lineWidth = lw; g.beginPath(); g.moveTo(n * (0.45 + v * 0.05), n * 0.25); g.lineTo(n * 0.55, n * 0.5); g.lineTo(n * 0.45, n * 0.7); g.stroke();
    g.restore();
    path(); g.strokeStyle = '#23232b'; g.lineWidth = Math.max(1.5, n * 0.06); g.stroke();
    g.fillStyle = 'rgba(220,220,235,0.7)'; g.beginPath(); g.ellipse(n * 0.35, n * 0.34, n * 0.12, n * 0.07, -0.5, 0, 7); g.fill();
  } else if (kind === 3) {   // bright gas bubbles
    bubbles(v).forEach(b => {
      g.fillStyle = 'rgba(170,255,100,0.65)'; g.beginPath(); g.arc(b.x * n, b.y * n, b.r * n, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc((b.x - b.r * 0.3) * n, (b.y - b.r * 0.35) * n, b.r * n * 0.25, 0, 7); g.fill();
    });
  } else if (kind === 4) {   // glowing cracks
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.shadowColor = '#ff6a10'; g.shadowBlur = n * 0.25;
    g.strokeStyle = '#ff9a2a'; g.lineWidth = lw * 1.3; magmaCracks(v, n).forEach(p => strokePts(g, p, 0, 0));
    g.shadowBlur = 0; g.strokeStyle = '#ffe08a'; g.lineWidth = lw * 0.5; magmaCracks(v, n).forEach(p => strokePts(g, p, 0, 0));
  } else if (kind >= 10) {   // ore sparkle crosses
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, n / 20); g.lineCap = 'round';
    gems(kind - 10, v).forEach(m => {
      const x = (m.x - m.r * 0.3) * n, y = (m.y - m.r * 0.35) * n, l = m.r * n * 0.7;
      g.beginPath(); g.moveTo(x - l, y); g.lineTo(x + l, y); g.moveTo(x, y - l); g.lineTo(x, y + l); g.stroke();
    });
  }
}
function magmaCracks(v, n) { const R = mkRand(v * 313 + 777), out = []; for (let i = 0; i < 3; i++) out.push(crackPts(R, n)); return out; }
function bubbles(v) { const R = mkRand(v * 191 + 11), out = []; for (let i = 0; i < 4; i++) out.push({ x: 0.2 + R() * 0.6, y: 0.2 + R() * 0.6, r: 0.07 + R() * 0.08 }); return out; }
function gems(i, v) {
  const R = mkRand(i * 977 + v * 131 + 3);
  return [[0.3, 0.32, 0.2], [0.68, 0.46, 0.19], [0.38, 0.72, 0.2]].map(p => ({ x: p[0] + (R() - 0.5) * 0.08, y: p[1] + (R() - 0.5) * 0.08, r: p[2] * (0.9 + R() * 0.25), rot: R() * 6.28 }));
}
function gemPath(g, n, m) {
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = m.rot + k * Math.PI / 3, r = m.r * (k % 2 ? 0.85 : 1.05), px = (m.x + Math.cos(a) * r) * n, py = (m.y + Math.sin(a) * r) * n;
    if (k) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
}
