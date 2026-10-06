// NÍVEL DO CORREDOR (GDD §55): XP por distância, desafios, conquistas e FLOW.
// Curva: XP do nível n para o n+1 = base × n^exp. Com ~400 XP por sessão de
// 5–10 min: nível 2 na primeira corrida, ~5 em uma semana, ~10 em um mês.
(function (EP) {
  EP.data.levels = {
    xp: { perKm: 100, perPerfect: 0.5, perChallenge: 60, perPacer: 80, perFlowSecond: 0.5, perMission: 120 },
    curve: { base: 250, exp: 1.45 },
    maxLevel: 99,
    rewards: [
      { every: 1, coins: 40, scale: true },          // moedas = 40 × nível alcançado
      { at: 3, item: 'bone-classico' },
      { at: 5, item: 'oculos-sol-classico' },
      { at: 8, item: 'fone-esporte-azul' },
      { at: 10, item: 'relogio-digital' },
      { at: 15, item: 'tenis-nuvem' },
      { at: 20, item: 'corta-vento-aurora' },
      { at: 30, item: 'tenis-relampago' }
    ],
    titles: [
      { from: 1, text: 'lvl.title.1' }, { from: 3, text: 'lvl.title.2' }, { from: 6, text: 'lvl.title.3' },
      { from: 10, text: 'lvl.title.4' }, { from: 15, text: 'lvl.title.5' }, { from: 25, text: 'lvl.title.6' },
      { from: 40, text: 'lvl.title.7' }
    ]
  };
  EP.data.levels.requiredItems = EP.data.levels.rewards.filter(function (r) { return r.item; }).map(function (r) { return r.item; });
})(window.EP);
