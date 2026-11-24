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

// rewarded-ad offer button and fake ad screen (rules live in ads.js)
const adBtn = document.getElementById('ad'), adOv = document.getElementById('adov'), adCount = document.getElementById('adcount');
adBtn.addEventListener('click', () => adTap());
let adShownKey = '';
function updateAdUi() {
  const o = AD.offer, show = !!o && !AD.stub;
  adBtn.style.display = show ? 'block' : 'none';
  if (show) {
    if (o.text !== adShownKey) { adShownKey = o.text; adBtn.innerHTML = '<small>&#9654; AD</small>'; adBtn.appendChild(document.createTextNode(o.text)); }
    const r = cv.getBoundingClientRect(), shopTop = r.top + H * (1 - CFG.SHOP_PANEL_FRAC);
    adBtn.style.left = (r.left + r.width / 2) + 'px'; adBtn.style.top = (shopTop - 56 * U) + 'px';
  }
  adOv.style.display = AD.stub ? 'flex' : 'none';
  if (AD.stub) adCount.textContent = Math.ceil(AD.stub.left);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!adsFrame(dt)) { update(dt); saveTick(dt); adsTick(dt); }   // the fake ad screen pauses the game
  draw(); updateWaitlist(); updateAdUi();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// debug handle for tuning from the console
window.DBG = { AD, adsFrame, adsTick, adTap, updateAdUi, emit, G, CFG, world, update, tap, shopRects, tile, setDir(d) { autoDir = d; }, saveGame, loadGame, resetGame };
