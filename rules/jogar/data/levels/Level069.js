// FASE 69 — TOQUE NO QUE NÃO É REDONDO · tudo no cenário é redondo; a frase não é.
RULES.registerLevel({
  id: 69, chapter: 7,
  instruction: 'LEVEL_069_TITLE',   // a frase inteira é [[w_all|...]]
  hints: ['LEVEL_069_HINT_1', 'LEVEL_069_HINT_2', 'LEVEL_069_HINT_3'],
  objects: [
    { id: 'w_all', inText: true },
    { id: 'c1', type: 'circle', x: 24, y: 46, w: 20, props: { color: 'coral' } },
    { id: 'c2', type: 'ball', x: 70, y: 52, w: 18, props: { color: 'blue' } },
    { id: 'c3', type: 'circle', x: 36, y: 92, w: 16, props: { color: 'yellow' } },
    { id: 'c4', type: 'ruli', x: 72, y: 94, w: 18, h: 20 }
  ],
  reactions: [
    { on: 'tap', target: 'c1', cooldown: 400, do: [{ fx: 'wobble' }, { fail: 'FB_ROUND' }] },
    { on: 'tap', target: 'c2', cooldown: 400, do: [{ fx: 'wobble' }, { fail: 'FB_ROUND' }] },
    { on: 'tap', target: 'c3', cooldown: 400, do: [{ fx: 'wobble' }, { fail: 'FB_ROUND' }] },
    { on: 'tap', target: 'c4', cooldown: 400, do: [{ fx: 'hop' }, { fail: 'FB_ROUND' }] }
  ],
  win: { type: 'tapped', target: 'w_all' },
  onWin: [{ fx: 'pop', target: 'w_all' }]
});
