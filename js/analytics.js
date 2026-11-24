'use strict';
// Player counting with GoatCounter (no cookies). Empty code = counting is off, the game works the same.
// What is counted: visits (automatic), first sale, depth milestones, upgrades, waitlist clicks,
// and returns: "return-d1" when a player comes back on the next calendar day, "-d2", "-d3", "-d7"...
const GC_CODE = 'deepclaim';                    // GoatCounter site code, e.g. 'deepclaim' for deepclaim.goatcounter.com
const DEPTH_MARKS = [10, 25, 50, 100, 150, 200];
const RETURN_DAYS = [1, 2, 3, 7, 14, 30];
const META_KEY = 'deepclaim.meta.v1';

const GC = (() => {
  const queue = [];
  function send(path, title) {
    if (!GC_CODE) return;
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title: title || path, event: true });
    else queue.push([path, title]);
  }
  if (GC_CODE) {
    window.goatcounter = { no_onload: false };
    const s = document.createElement('script');
    s.async = true; s.src = 'https://gc.zgo.at/count.js';
    s.dataset.goatcounter = 'https://' + GC_CODE + '.goatcounter.com/count';
    s.onload = () => { while (queue.length) send(...queue.shift()); };
    document.head.appendChild(s);
  }
  return { send };
})();

(function trackPlayer() {
  let meta;
  try { meta = JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch (e) { meta = null; }
  const today = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);   // local calendar day
  if (!meta) { meta = { first: today, days: {}, sold: false, depth: 0 }; GC.send('new-player'); }
  const n = today - meta.first;
  if (n > 0 && !meta.days[n]) {
    meta.days[n] = 1;
    GC.send('return-any');
    if (RETURN_DAYS.includes(n)) GC.send('return-d' + n);
  }
  const store = () => { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} };
  store();
  onEvent((name, d) => {
    if (name === 'sell' && !meta.sold) { meta.sold = true; GC.send('first-sale'); store(); }
    if (name === 'upgrade') GC.send('upgrade-' + d.k + '-' + d.lv);
    if (name === 'record') for (const m of DEPTH_MARKS) if (d.depth >= m && meta.depth < m) { meta.depth = m; GC.send('depth-' + m); store(); }
    if (name === 'waitlist') GC.send('waitlist-click');
  });
})();
