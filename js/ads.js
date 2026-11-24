'use strict';
// Rewarded-ad STUBS (no real ads yet): offer rules, the fake ad screen state and rewards.
// Only the rules live here; the button and overlay are drawn from AD in main.js. Numbers are in CFG (AD_*).
const AD = { offer: null, stub: null, nextOk: {}, refuelDone: false };

const AD_PLACEMENTS = {
  refuel: { text: () => 'Refuel here', reward: () => {
    G.fuel = fuelMax(); G.outOfFuel = false; AD.refuelDone = true; banner('TANK REFILLED', '#8fe9ff'); } },
  double: { text: o => 'Double it +$' + o.n, reward: o => { G.money += o.n; banner('DOUBLED  +$' + o.n, '#ffe14a'); } },
  crate: { text: o => 'Double crate +$' + o.n, reward: o => { G.money += o.n; banner('CRATE DOUBLED  +$' + o.n, '#ffe14a'); } },
  cargo: { text: () => 'Get cargo back', reward: o => {
    for (const i of o.items) if (G.cargo.length < cargoMax()) G.cargo.push(i);
    banner('CARGO RECOVERED', '#7dff8a'); } },
};

function adOffer(placement, data) {
  const cur = AD.offer;
  if (AD.stub || (cur && cur.placement === 'refuel')) return;         // never interrupt an ad or the refuel offer
  if (placement !== 'refuel' || !G.outOfFuel) { if (G.time < (AD.nextOk[placement] || 0)) return; }
  AD.nextOk[placement] = G.time + CFG.AD_COOLDOWN;   // cooldown per placement, so a crate offer does not block the first 'double'
  const o = Object.assign({ placement, left: placement === 'refuel' ? Infinity : CFG.AD_OFFER_SECONDS }, data);
  o.text = AD_PLACEMENTS[placement].text(o);
  AD.offer = o;
  emit('ad-offer', { placement });
}
function adTap() {
  const o = AD.offer; if (!o || AD.stub) return;
  emit('ad-tap', { placement: o.placement });
  showRewarded(o.placement, () => { AD_PLACEMENTS[o.placement].reward(o); AD.offer = null; emit('ad-done', { placement: o.placement }); saveGame(); });
}
// the fake ad screen; a real ad SDK call replaces this later, the callback contract stays the same
function showRewarded(placement, onReward) { AD.stub = { placement, left: CFG.AD_STUB_SECONDS, onReward }; }

// runs every frame; returns true while an ad screen is up (the game must not update)
function adsFrame(dt) {
  const s = AD.stub; if (!s) return false;
  s.left -= dt;
  if (s.left <= 0) { AD.stub = null; s.onReward(); }
  return true;
}
const adNeedsFuel = () => G.drill.ty >= 0 && !AD.refuelDone && (G.outOfFuel || G.fuel / fuelMax() < CFG.LOW_FUEL_FRAC);
function adsTick(dt) {
  const o = AD.offer;
  if (o && o.placement === 'refuel') { if (!adNeedsFuel()) AD.offer = null; }
  else if (o && (o.left -= dt) <= 0) AD.offer = null;
  if (!AD.offer && adNeedsFuel()) adOffer('refuel');
}

onEvent((name, d) => {
  if (name === 'sell' && d.total > 0) adOffer('double', { n: d.total });
  if (name === 'daily') adOffer('crate', { n: d.reward });
  if (name === 'cargo-lost') adOffer('cargo', { items: d.items });
  if (name === 'surface') { AD.refuelDone = false; if (AD.offer && AD.offer.placement === 'refuel') AD.offer = null; }
});
