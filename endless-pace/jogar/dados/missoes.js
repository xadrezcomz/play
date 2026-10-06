// MISSÕES DO DIA (GDD §56): três por dia, sorteadas pela data do aparelho
// (o mesmo dia dá as mesmas missões). As metas crescem um pouco com o nível.
// metric: o que conta · base: meta no nível 1 · perLevel: quanto sobe por
// nível · step: arredondamento · mode 'max' = melhor valor do dia (não soma).
(function (EP) {
  EP.data.missions = {
    perDay: 3,
    levelCap: 30,                 // depois disso as metas não sobem mais
    list: [
      { id: 'dist', metric: 'distance', base: 1500, perLevel: 120, step: 100, max: 6000, reward: { coins: 60, xp: 120 }, text: 'mis.dist', unit: 'km' },
      { id: 'dist-longa', metric: 'distance', base: 3000, perLevel: 200, step: 500, max: 10000, reward: { coins: 110, xp: 200 }, text: 'mis.dist', unit: 'km', minLevel: 4 },
      { id: 'flow', metric: 'flowTime', base: 45, perLevel: 6, step: 15, max: 300, reward: { coins: 60, xp: 120 }, text: 'mis.flow', unit: 's' },
      { id: 'perfect', metric: 'perfects', base: 60, perLevel: 8, step: 10, max: 400, reward: { coins: 50, xp: 100 }, text: 'mis.perfect' },
      { id: 'overtake', metric: 'overtakes', base: 15, perLevel: 2, step: 5, max: 80, reward: { coins: 50, xp: 100 }, text: 'mis.overtake' },
      { id: 'combo', metric: 'combo', base: 3, perLevel: 0.25, step: 1, max: 10, mode: 'max', reward: { coins: 70, xp: 120 }, text: 'mis.combo' },
      { id: 'challenge', metric: 'challenges', base: 1, perLevel: 0.1, step: 1, max: 4, reward: { coins: 70, xp: 130 }, text: 'mis.challenge' },
      { id: 'speed', metric: 'topSpeed', base: 14, perLevel: 0.3, step: 1, max: 20, mode: 'max', reward: { coins: 50, xp: 100 }, text: 'mis.speed', unit: 'kmh' },
      { id: 'draft', metric: 'draftTime', base: 20, perLevel: 3, step: 10, max: 120, reward: { coins: 60, xp: 110 }, text: 'mis.draft', unit: 's', minLevel: 2 },
      { id: 'pacer', metric: 'pacers', base: 1, perLevel: 0, step: 1, max: 1, reward: { coins: 90, xp: 150 }, text: 'mis.pacer', minLevel: 3 },
      { id: 'runs', metric: 'runs', base: 2, perLevel: 0, step: 1, max: 2, reward: { coins: 40, xp: 80 }, text: 'mis.runs' }
    ],
    // completar as três do dia
    bonus: { coins: 150, xp: 250 }
  };
})(window.EP);
