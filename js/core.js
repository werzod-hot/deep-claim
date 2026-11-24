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

function generate() {
  world.fill(T_DIRT);
  CFG.ORES.forEach((o, i) => {
    const y0 = o.min - 1, y1 = Math.min(o.max, ROWS) - 1;
    for (let v = 0; v < o.veins; v++) {
      let x = rint(0, COLS - 1), y = rint(y0, y1);
      const n = rint(o.veinSize[0], o.veinSize[1]);
      for (let k = 0, placed = 0; k < 40 && placed < n; k++) {
        if (y >= y0 && y <= y1 && world[y * COLS + x] === T_DIRT) { world[y * COLS + x] = T_ORE + i; placed++; }
        if (Math.random() < 0.5) x += Math.random() < 0.5 ? -1 : 1; else y += Math.random() < 0.5 ? -1 : 1;
        x = Math.max(0, Math.min(COLS - 1, x));
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
