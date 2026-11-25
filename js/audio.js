'use strict';
// Generated WebAudio sounds: dig, ore chime, sell, upgrade, explosion, low-fuel beep, dive drone, mine ambience, mute.
let AC = null, noiseBuf = null, master = null, drone = null, beepAt = 0, droneAt = 0, droneSwell = 0, wasUnder = false, ambAt = 0;
let muted = false, musicOn = true, musicBus = null, chordAt = 0, chordIdx = 0, pluckAt = 0, chordNow = null;
try { muted = localStorage.getItem(CFG.MUTE_KEY) === '1'; musicOn = localStorage.getItem(CFG.MUSIC_KEY) !== '0'; } catch (e) { /* storage may be blocked */ }

function audioInit() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination);
      musicBus = AC.createGain(); musicBus.gain.value = musicOn ? 1 : 0; musicBus.connect(master);
      startDrone();
    }
    if (AC.state === 'suspended' && !document.hidden) AC.resume();
  } catch (e) { AC = null; }
}
function startDrone() {
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
  o1.type = 'sine'; o2.type = 'triangle'; f.type = 'lowpass'; f.frequency.value = 160; g.gain.value = 0;
  o1.frequency.value = o2.frequency.value = CFG.SND.DRONE_F_TOP;
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(master); o1.start(); o2.start();
  drone = { o1, o2, g };
}
function toggleMusic() {
  musicOn = !musicOn;
  try { localStorage.setItem(CFG.MUSIC_KEY, musicOn ? '1' : '0'); } catch (e) { /* ignore */ }
  if (musicBus) musicBus.gain.setTargetAtTime(musicOn ? 1 : 0, AC.currentTime, 0.3);
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
  if (musicOn && !muted && !document.hidden) musicTick(t, depth);
  // mine ambience: a rare one-shot (drip, pebbles, creak, distant rumble) every few seconds underground
  const under = G.drill.ty >= 0;
  if (under && depth > S.AMB_FROM) { if (!ambAt) ambAt = t + rnd(S.AMB_MIN, S.AMB_MAX); else if (t >= ambAt) { sndAmbience(depth); ambAt = t + rnd(S.AMB_MIN, S.AMB_MAX); } }
  else ambAt = 0;
  if (t < droneAt) return;
  droneAt = t + 0.1;
  // drone: only swells for a few seconds when a dive starts, then goes silent (a constant hum gets tiring)
  if (under && !wasUnder) droneSwell = 1;
  wasUnder = under;
  droneSwell = Math.max(0, droneSwell - 0.1 / S.DRONE_SWELL_SEC);
  const f = lerp(S.DRONE_F_TOP, S.DRONE_F_BOTTOM, depth / ROWS);
  drone.o1.frequency.setTargetAtTime(f, t, 0.4); drone.o2.frequency.setTargetAtTime(f * 1.01, t, 0.4);
  drone.g.gain.setTargetAtTime(under && !document.hidden ? S.DRONE_VOL * droneSwell : 0, t, 0.8);
}
// one ambience sound; deeper = rumbles and creaks are more likely than drips
function sndAmbience(depth) {
  const S = CFG.SND, k = Math.min(1, depth / ROWS), r = Math.random(), v = S.AMB_VOL;
  if (r < 0.45 - 0.3 * k) {                                   // water drip: a tiny falling blip, sometimes twice
    const f = rnd(1300, 2100); tone(f, f * 0.55, 0.07, v, 'sine');
    if (Math.random() < 0.4) tone(f * 0.9, f * 0.5, 0.06, v * 0.6, 'sine', rnd(0.25, 0.5));
  } else if (r < 0.7 - 0.2 * k) {                             // pebbles trickling
    for (let i = 0, n = 2 + Math.floor(Math.random() * 4); i < n; i++) setTimeout(() => noise(0.03, rnd(1800, 3200), v * 0.8), i * rnd(60, 140));
  } else if (r < 0.88 - 0.1 * k) {                            // rock creak: a slow low glide
    tone(rnd(70, 110), rnd(45, 65), rnd(0.5, 0.9), v * 0.9, 'sawtooth');
  } else {                                                    // distant rumble
    noise(rnd(0.9, 1.5), rnd(120, 220), v * 1.6); tone(rnd(45, 60), 30, 1.0, v, 'sine');
  }
}
// fast climb: a rising tape-wind whoosh
function sndFastClimb() {
  const T = G.ff ? G.ff.dur : CFG.FF_TIME;
  tone(140, 900, T, CFG.SND.FF_VOL, 'sawtooth');
  tone(280, 1800, T, CFG.SND.FF_VOL * 0.5, 'triangle');
  noise(Math.min(T, 0.9), 2500, CFG.SND.FF_VOL * 1.2);
}

/* ---------------- background music: generated, so no rights issues and never the same twice ----------------
   Each depth band has its own key and 4-chord loop (CFG.MUSIC_BANDS). A soft pad changes chord every
   MUSIC_CHORD_SEC, and now and then a quiet high note from the current chord rings out. */
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
function musicBand(depth) { const B = CFG.MUSIC_BANDS; for (const b of B) if (depth < b.to) return b; return B[B.length - 1]; }
function musicTick(t, depth) {
  const M = CFG.MUSIC, b = musicBand(depth);
  if (t >= chordAt) {
    if (chordNow && chordNow.band !== b) chordIdx = 0;
    const ch = b.chords[chordIdx % b.chords.length]; chordIdx++;
    chordNow = { band: b, notes: ch.map(n => b.root + n) };
    for (const m of chordNow.notes) padNote(midiHz(m), M.CHORD_SEC + M.RELEASE, b.cutoff);
    padNote(midiHz(b.root + ch[0] - 12), M.CHORD_SEC + M.RELEASE, b.cutoff * 0.6, 0.8);   // soft bass
    chordAt = t + M.CHORD_SEC;
  }
  if (chordNow && t >= pluckAt) {
    if (pluckAt) { const n = chordNow.notes[Math.floor(Math.random() * chordNow.notes.length)] + 24; pluck(midiHz(n)); }
    pluckAt = t + rnd(M.PLUCK_MIN, M.PLUCK_MAX);
  }
}
function padNote(f, dur, cutoff, vol) {
  const M = CFG.MUSIC, t = AC.currentTime, g = AC.createGain(), lp = AC.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = cutoff;
  const v = M.PAD_VOL * (vol || 1);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + M.ATTACK);
  g.gain.setValueAtTime(v, t + dur - M.RELEASE); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  lp.connect(g); g.connect(musicBus);
  for (const [type, det] of [['triangle', 0], ['sine', 5]]) {
    const o = AC.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  }
}
function pluck(f) {
  const M = CFG.MUSIC, t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(M.PLUCK_VOL, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 1.9);
}
