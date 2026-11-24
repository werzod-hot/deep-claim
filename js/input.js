'use strict';
// One-finger drag control (+ arrow keys on desktop).
/* ---------------- input: one finger drag (+ arrow keys on desktop) ---------------- */
let ptr = null, autoDir = null;
const keys = {};
function evPos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
cv.addEventListener('pointerdown', e => {
  audioInit(); const p = evPos(e);
  if (inRect(muteRect(), p.x, p.y)) { toggleMute(); e.preventDefault(); return; }
  ptr = { sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false };
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  e.preventDefault();
});
cv.addEventListener('pointermove', e => {
  if (!ptr) return; const p = evPos(e); ptr.x = p.x; ptr.y = p.y;
  const dx = ptr.x - ptr.sx, dy = ptr.y - ptr.sy, d = Math.hypot(dx, dy);
  if (d > CFG.DRAG_DEADZONE) ptr.moved = true;
  if (d > CFG.JOY_RADIUS) { ptr.sx = ptr.x - dx / d * CFG.JOY_RADIUS; ptr.sy = ptr.y - dy / d * CFG.JOY_RADIUS; }
});
function pointerEnd(e) { if (!ptr) return; if (!ptr.moved) tap(ptr.x, ptr.y); ptr = null; }
cv.addEventListener('pointerup', pointerEnd);
cv.addEventListener('pointercancel', () => { ptr = null; });
window.addEventListener('keydown', e => { keys[e.key] = true; audioInit(); if (e.key === 'm' || e.key === 'M') toggleMute(); });
window.addEventListener('keyup', e => { keys[e.key] = false; });
document.addEventListener('contextmenu', e => e.preventDefault());

function inputDir() {
  if (autoDir) return autoDir;
  if (keys.ArrowDown) return { x: 0, y: 1 }; if (keys.ArrowUp) return { x: 0, y: -1 };
  if (keys.ArrowLeft) return { x: -1, y: 0 }; if (keys.ArrowRight) return { x: 1, y: 0 };
  if (!ptr || !ptr.moved) return null;
  const dx = ptr.x - ptr.sx, dy = ptr.y - ptr.sy;
  if (Math.hypot(dx, dy) < CFG.DRAG_DEADZONE) return null;
  return Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
}
