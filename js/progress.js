'use strict';
// Long-term goals: one contract at a time, bonuses for new depth marks, a daily crate with a streak.
// Listens to game events; the core rules do not depend on this file.

const round5 = v => Math.max(5, Math.round(v / 5) * 5);

function newContract() {
  const deep = Math.max(G.record, 5);
  const ores = CFG.ORES.map((o, i) => i).filter(i => CFG.ORES[i].min <= deep + 10);
  const kinds = ['deliver', 'deliver', 'depth', 'full'];
  if (!G.sold) kinds.splice(kinds.indexOf('full'), 1);                     // first contract: keep it simple
  const kind = kinds[rint(0, kinds.length - 1)];
  if (kind === 'deliver') {
    const i = ores[Math.max(0, ores.length - 1 - rint(0, 1))];                 // the deepest or second-deepest ore reached
    const n = rint(CFG.CONTRACT_DELIVER_MIN, CFG.CONTRACT_DELIVER_MAX - Math.min(4, i));
    return { kind, i, n, have: 0, reward: round5(CFG.ORES[i].value * n * CFG.CONTRACT_DELIVER_PAY + 30) };
  }
  if (kind === 'depth') {
    const target = Math.min(ROWS, Math.ceil((G.record + CFG.CONTRACT_DEPTH_AHEAD) / 5) * 5);
    return { kind, target, reward: round5(target * CFG.CONTRACT_DEPTH_PAY) };
  }
  return { kind: 'full', reward: round5(50 + G.record * CFG.CONTRACT_FULL_PAY) };
}

function contractText(c) {
  if (!c) return '';
  if (c.kind === 'deliver') return 'Sell ' + c.n + ' ' + CFG.ORES[c.i].name + '  ' + Math.min(c.have, c.n) + '/' + c.n;
  if (c.kind === 'depth') return 'Reach ' + c.target + ' m  (best ' + G.record + ')';
  return 'Sell a full load';
}

function completeContract() {
  const c = G.contract; if (!c || c.done) return;
  c.done = true;
  G.money += c.reward;
  banner('CONTRACT DONE  +$' + c.reward, '#7dff8a'); flash('#7dff8a', 0.35); shake(CFG.SHAKE_SELL); sndSell(1.3);
  emit('contract', { kind: c.kind, reward: c.reward });
  after(1.2, () => { G.contract = newContract(); saveGame(); });
}

function checkDaily() {
  if (!atSurface()) return;
  const d = today(), daily = G.daily;
  if (daily.last === d) return;
  daily.streak = daily.last === d - 1 ? Math.min(CFG.DAILY_STREAK_MAX, daily.streak + 1) : 1;
  daily.last = d;
  const reward = round5(CFG.DAILY_BASE + CFG.DAILY_PER_STREAK * (daily.streak - 1) + G.record * CFG.DAILY_PER_RECORD);
  G.money += reward;
  banner('DAILY CRATE  +$' + reward, '#ffe14a'); flash('#ffe14a', 0.35); sndSell(1.1);
  banner(daily.streak > 1 ? 'DAY ' + daily.streak + ' IN A ROW!' : 'COME BACK TOMORROW FOR MORE', '#ffffff');
  emit('daily', { streak: daily.streak, reward });
  saveGame();
}

onEvent((name, d) => {
  const c = G.contract;
  if (name === 'sell' && c && !c.done) {
    if (c.kind === 'deliver' && d.groups[c.i]) { c.have += d.groups[c.i]; if (c.have >= c.n) completeContract(); }
    if (c.kind === 'full' && d.full) completeContract();
  }
  if (name === 'record') {
    if (c && !c.done && c.kind === 'depth' && d.depth >= c.target) completeContract();
    const mark = Math.floor(d.depth / CFG.DEPTH_BONUS_STEP) * CFG.DEPTH_BONUS_STEP;
    if (mark > 0 && mark > G.depthBonus) {
      G.depthBonus = mark;
      const bonus = mark * CFG.DEPTH_BONUS_PER_M;
      G.money += bonus;
      banner(mark + ' m BONUS  +$' + bonus, '#ffe14a'); sndSell(1.2);
    }
  }
  if (name === 'surface') checkDaily();
});

function progressStart() {
  if (!G.contract || G.contract.done) G.contract = newContract();
  after(0.8, checkDaily);
}
