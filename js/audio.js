'use strict';
// Generated WebAudio sounds.
/* ---------------- sound (WebAudio, 3 generated sounds) ---------------- */
let AC = null, noiseBuf = null;
function audioInit() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { AC = null; }
}
function noise(dur, freq, vol) {
  if (!AC) return;
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime;
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(vol * CFG.VOLUME, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t, Math.random() * 0.5, dur);
}
function tone(f0, f1, dur, vol, type, delay) {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + (delay || 0);
  o.type = type || 'square'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol * CFG.VOLUME, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
}
function sndDig(ore) { noise(0.08, ore ? 2600 : rnd(700, 1300), 0.35); if (ore) tone(900, 1500, 0.09, 0.12, 'triangle'); }
function sndSell(pitch) { [523, 659, 784, 1047].forEach((f, i) => tone(f * (pitch || 1), f * (pitch || 1), 0.12, 0.18, 'square', i * 0.07)); }
function sndExplosion() { noise(0.8, 500, 1.0); tone(120, 30, 0.6, 0.6, 'sine'); }
