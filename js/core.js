'use strict';
// Shared constants, helpers, screen size, the tile world and the game state.
/* ===================================================================== */
const COLS = CFG.COLS, ROWS = CFG.ROWS;
const T_EMPTY = 0, T_DIRT = 1, T_ROCK = 2, T_GAS = 3, T_MAGMA = 4, T_ORE = 10;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let W = 0, H = 0, TS = 0, U = 1, DPR = 1;

const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  H = window.innerHeight;
  W = Math.min(window.innerWidth, Math.round(H * CFG.MAX_ASPECT));
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  TS = W / COLS; U = W / 375;
}
window.addEventListener('resize', resize);
resize();

/* ---------------- world ---------------- */
const world = new Uint8Array(COLS * ROWS);
const tile = (x, y) => (y < 0 ? T_EMPTY : world[y * COLS + x]);
const setTile = (x, y, t) => { if (y >= 0 && y < ROWS && x >= 0 && x < COLS) world[y * COLS + x] = t; };

// random-walk vein inside rows [ya, yb] and columns [xa, xb]; places up to n tiles (at most `room`) of ore index i, returns how many
function walkVein(i, x, y, n, room, ya, yb, xa, xb, cnt) {
  let placed = 0;
  for (let k = 0; k < 40 && placed < n && placed < room; k++) {
    if (world[y * COLS + x] === T_DIRT) { world[y * COLS + x] = T_ORE + i; placed++; if (cnt) cnt[(y / CFG.ORE_QUOTA_SLICE) | 0]++; }
    if (Math.random() < 0.5) x += Math.random() < 0.5 ? -1 : 1; else y += Math.random() < 0.5 ? -1 : 1;
    x = Math.max(xa, Math.min(xb, x)); y = Math.max(ya, Math.min(yb, y));
  }
  return placed;
}

function generate() {
  world.fill(T_DIRT);
  const S = CFG.ORE_QUOTA_SLICE, nS = Math.ceil(ROWS / S);
  CFG.ORES.forEach((o, i) => {
    const y0 = o.min - 1, y1 = Math.min(o.max, ROWS) - 1, q = CFG.ORE_QUOTA[i], cnt = new Array(nS).fill(0);
    if (i === 0) {                                   // guaranteed starter coal: veins close to the shaft, in the first rows
      const cx = Math.floor(COLS / 2), xa = Math.max(0, cx - CFG.START_COAL_COLS), xb = Math.min(COLS - 1, cx + CFG.START_COAL_COLS);
      const yTop = y0, yBot = Math.min(y1, CFG.START_COAL_ROWS - 1), mid = (yTop + yBot) >> 1;
      for (let v = 0; v < CFG.START_COAL_VEINS; v++) {   // one vein per half of the strip, so they are not the same cluster
        const ya = v % 2 ? mid + 1 : yTop, yb = v % 2 ? yBot : mid;
        walkVein(i, rint(xa, xb), rint(ya, yb), rint(Math.max(3, o.veinSize[0]), Math.max(4, o.veinSize[1])), 99, ya, yb, xa, xb, cnt);
      }
    }
    for (let s = Math.floor(y0 / S); s * S <= y1; s++) {
      const ya = Math.max(y0, s * S), yb = Math.min(y1, s * S + S - 1);
      const frac = (yb - ya + 1) / S;
      const mid = (ya + yb) / 2, edge = Math.min(mid - y0, y1 - mid);
      const f = lerp(CFG.ORE_QUOTA_EDGE, 1, edge / CFG.ORE_QUOTA_EDGE_ROWS) * frac;
      const mn = Math.max(1, Math.round(q.min * f)), mx = Math.max(mn, Math.round(q.max * f));
      const target = Math.max(cnt[s], rint(mn, mx));
      for (let tries = 0; cnt[s] < target && tries < 80; tries++) {
        walkVein(i, rint(0, COLS - 1), rint(ya, yb), rint(o.veinSize[0], o.veinSize[1]), Math.max(mx, cnt[s]) - cnt[s], ya, yb, 0, COLS - 1, cnt);
      }
    }
  });
  for (let y = CFG.GAS_FROM - 1; y < ROWS; y++) {
    const p = lerp(CFG.GAS_CHANCE_START, CFG.GAS_CHANCE_END, (y + 1 - CFG.GAS_FROM) / (ROWS - CFG.GAS_FROM));
    for (let x = 0; x < COLS; x++) if (world[y * COLS + x] === T_DIRT && Math.random() < p) world[y * COLS + x] = T_GAS;
  }
  for (let y = CFG.MAGMA_FROM - 1; y < ROWS; y++) {
    const p = lerp(CFG.MAGMA_CHANCE_START, CFG.MAGMA_CHANCE_END, (y + 1 - CFG.MAGMA_FROM) / (ROWS - CFG.MAGMA_FROM));
    for (let x = 0; x < COLS; x++) if (world[y * COLS + x] === T_DIRT && Math.random() < p) world[y * COLS + x] = T_MAGMA;
  }
}

/* ---------------- state ---------------- */
const G = {
  time: 0, money: 0, moneyShown: 0,
  fuel: CFG.FUEL_START, cargo: [],
  lv: { speed: 0, cargo: 0, fuel: 0, hull: 0 },
  contract: null, daily: { last: -1, streak: 0 }, depthBonus: 0, sold: false,
  drill: { tx: Math.floor(COLS / 2), ty: -1, x: Math.floor(COLS / 2), y: -1, face: { x: 0, y: 1 }, move: null },
  camY: -8, record: 0, nextRecord: CFG.RECORD_STEP, dug: 0,
  particles: [], floats: [], rocks: [], timers: [], banners: [],
  shake: 0, flash: null, outOfFuel: false, seenOre: {}, firstOreTime: {}, digAcc: 0,
};
const fuelMax = () => CFG.FUEL_START + CFG.FUEL_PER_LEVEL * G.lv.fuel;
const cargoMax = () => CFG.CARGO_START + CFG.CARGO_PER_LEVEL * G.lv.cargo;
const speedMult = () => Math.pow(CFG.SPEED_PER_LEVEL, G.lv.speed);
const upCost = k => Math.round(CFG.UPGRADE_BASE[k] * Math.pow(CFG.UPGRADE_GROWTH, G.lv[k]));
const hullMult = () => Math.max(1 - CFG.HULL_PROTECT_MAX, 1 - CFG.HULL_PROTECT_PER_LEVEL * G.lv.hull);
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);   // local calendar day
const cargoValue = () => G.cargo.reduce((s, i) => s + CFG.ORES[i].value, 0);
const atSurface = () => G.drill.ty === -1 && !(G.drill.move && G.drill.move.ty >= 0);

/* ---------------- game events: save and analytics listen here, the rules do not know about them ---------------- */
const listeners = [];
const onEvent = fn => listeners.push(fn);
function emit(name, data) { for (const fn of listeners) { try { fn(name, data || {}); } catch (e) { /* a listener must never break the game */ } } }
