'use strict';
// Generated WebAudio sounds: dig, ore chime, sell, upgrade, explosion, low-fuel beep, depth drone, mute.
let AC = null, noiseBuf = null, master = null, drone = null, beepAt = 0, droneAt = 0;
let muted = false;
try { muted = localStorage.getItem(CFG.MUTE_KEY) === '1'; } catch (e) { /* storage may be blocked */ }

function audioInit() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination);
      startDrone();
    }
    if (AC.state === 'suspended' && !document.hidden) AC.resume();
  } catch (e) { AC = null; }
}
function startDrone() {
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
  o1.type = 'sine'; o2.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 160; g.gain.value = 0;
  o1.frequency.value = o2.frequency.value = CFG.SND.DRONE_F_TOP;
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(master); o1.start(); o2.start();
  drone = { o1, o2, g };
}
function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(CFG.MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, AC.currentTime, 0.03);
}
document.addEventListener('visibilitychange', () => {
  if (!AC) return;
  try { if (document.hidden) AC.suspend(); else AC.resume(); } catch (e) { /* ignore */ }
});

function noise(dur, freq, vol) {
  if (!AC) return;
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime;
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(vol * CFG.VOLUME, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5, dur);
}
function tone(f0, f1, dur, vol, type, delay) {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + (delay || 0);
  o.type = type || 'square'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol * CFG.VOLUME, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
// crunch: lower and duller the deeper you are; an ore adds its chime
function sndDig(ore, depth, type) {
  const S = CFG.SND, k = Math.min(1, Math.max(0, (depth || 0) / ROWS));
  noise(0.09, lerp(S.DIG_F_TOP, S.DIG_F_BOTTOM, k) * rnd(0.85, 1.15), S.DIG_VOL);
  tone(lerp(S.DIG_THUD_TOP, S.DIG_THUD_BOTTOM, k) * rnd(0.9, 1.1), 40, 0.08, S.DIG_VOL * 0.5, 'sine');
  if (ore) sndOre(type - T_ORE);
}
// chime: pitch rises with the ore value (log scale over ORE_OCTAVES)
function sndOre(i) {
  const S = CFG.SND, vals = CFG.ORES.map(o => o.value), lo = Math.min(...vals), hi = Math.max(...vals);
  const k = Math.log(CFG.ORES[i].value / lo) / Math.log(hi / lo), f = S.ORE_BASE * Math.pow(2, k * S.ORE_OCTAVES);
  tone(f, f, 0.22, S.ORE_VOL, 'triangle');
  tone(f * 1.5, f * 1.5, 0.28, S.ORE_VOL * 0.7, 'sine', 0.07);
  if (k > 0.5) tone(f * 2, f * 2, 0.3, S.ORE_VOL * 0.4, 'sine', 0.14);
}
function sndSell(pitch) { [523, 659, 784, 1047].forEach((f, i) => tone(f * (pitch || 1), f * (pitch || 1), 0.12, 0.18, 'square', i * 0.07)); }
function sndUpgrade() {
  const v = CFG.SND.UP_VOL;
  tone(240, 1000, 0.34, v, 'sawtooth');
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.14, v, 'square', 0.1 + i * 0.07));
  tone(1568, 1568, 0.4, v * 0.8, 'triangle', 0.5);
}
function sndExplosion() { noise(0.8, 500, 1.0); tone(120, 30, 0.6, 0.6, 'sine'); }

// called every frame from draw(): depth drone and low-fuel beep
function audioTick() {
  if (!AC || !drone) return;
  const S = CFG.SND, t = AC.currentTime, depth = G.drill.y + 1;
  const low = G.fuel / fuelMax() < CFG.LOW_FUEL_FRAC && G.drill.ty >= 0;
  if (low && !muted) { if (t >= beepAt) { tone(S.BEEP_FREQ, S.BEEP_FREQ, 0.09, S.BEEP_VOL, 'sine'); beepAt = t + S.BEEP_EVERY; } }
  else beepAt = 0;
  if (t < droneAt) return;
  droneAt = t + 0.1;
  const f = lerp(S.DRONE_F_TOP, S.DRONE_F_BOTTOM, depth / ROWS);
  drone.o1.frequency.setTargetAtTime(f, t, 0.4); drone.o2.frequency.setTargetAtTime(f * 1.01, t, 0.4);
  drone.g.gain.setTargetAtTime(depth > 0 && !document.hidden ? S.DRONE_VOL * Math.min(1, depth / S.DRONE_FADE_DEPTH) : 0, t, 0.4);
}
