'use strict';
// Start-up and the main loop.
const WAITLIST_URL = 'https://forms.gle/NuG2c8A9no4ZCLeYA';

if (!loadGame()) generate();
progressStart();

// waitlist button: at the surface, after the first sale, under the HUD and above the shop
const wl = document.getElementById('wl');
wl.href = WAITLIST_URL;
wl.addEventListener('click', () => emit('waitlist'));
function updateWaitlist() {
  const played = G.sold;   // has sold at least once
  const show = played && atSurface() && !G.drill.move;
  wl.style.display = show ? 'block' : 'none';
  if (show) { const r = cv.getBoundingClientRect(); wl.style.left = (r.left + r.width / 2) + 'px'; wl.style.top = (r.top + 118 * U) + 'px'; }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); draw(); saveTick(dt); updateWaitlist();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// debug handle for tuning from the console
window.DBG = { G, CFG, world, update, tap, shopRects, tile, setDir(d) { autoDir = d; }, saveGame, loadGame, resetGame };
