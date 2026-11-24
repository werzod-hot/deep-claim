'use strict';
// Progress is kept in the browser (localStorage). Saved on every sale, upgrade, trip to the surface,
// every few seconds, and when the tab is hidden or closed.
const SAVE_KEY = 'deepclaim.save.v1';
const SAVE_EVERY = 5;   // seconds

function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
function unb64(s, u8) { const t = atob(s); for (let i = 0; i < t.length && i < u8.length; i++) u8[i] = t.charCodeAt(i); }

function saveGame() {
  try {
    const d = G.drill, m = d.move;
    // mid-move: store where the drill is heading, the tile is cleared on load
    const tx = m ? m.tx : d.tx, ty = m ? m.ty : d.ty;
    const data = {
      v: 1, t: Date.now(), world: b64(world),
      money: G.money, fuel: G.fuel, cargo: G.cargo, lv: G.lv,
      record: G.record, nextRecord: G.nextRecord, dug: G.dug, seenOre: G.seenOre, outOfFuel: G.outOfFuel,
      tx, ty,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* private mode or storage full: the game keeps running without saves */ }
}

function loadGame() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { data = null; }
  if (!data || data.v !== 1) return false;
  unb64(data.world, world);
  Object.assign(G, {
    money: data.money, moneyShown: data.money, fuel: data.fuel, cargo: data.cargo || [], lv: data.lv,
    record: data.record, nextRecord: data.nextRecord, dug: data.dug, seenOre: data.seenOre || {}, outOfFuel: !!data.outOfFuel,
  });
  const d = G.drill; d.tx = d.x = data.tx; d.ty = d.y = data.ty; d.move = null;
  if (d.ty >= 0) setTile(d.tx, d.ty, T_EMPTY);
  G.camY = d.y - (H / TS) * CFG.CAMERA_DRILL_FRAC;
  return true;
}

function resetGame() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); }

onEvent(name => { if (name === 'sell' || name === 'upgrade' || name === 'surface') saveGame(); });
let saveAcc = 0;
function saveTick(dt) { saveAcc += dt; if (saveAcc >= SAVE_EVERY) { saveAcc = 0; saveGame(); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);
