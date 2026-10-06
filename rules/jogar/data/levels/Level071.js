// FASE 71 — NÃO DEIXE O BALÃO FUGIR · amarre o balão na pedra.
RULES.registerLevel({
  id: 71, chapter: 8,
  instruction: 'LEVEL_071_TITLE',
  hints: ['LEVEL_071_HINT_1', 'LEVEL_071_HINT_2', 'LEVEL_071_HINT_3'],
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
    { id: 'rock', type: 'rock', x: 78, y: 98, w: 20, h: 14, z: 3,
      behaviors: { receives: { from: ['balloon'], set: { holding: true } } } },
    { id: 'balloon', type: 'balloon', x: 30, y: 84, w: 14, h: 26, z: 5,
      behaviors: { draggable: {}, floats: { speed: 0.09, ceil: -12, escape: true } } }
  ],
  reactions: [
    { on: 'escaped', target: 'balloon', do: [{ fail: 'FB_FLEW' }] },
    { on: 'used', target: 'rock', do: [{ state: 'balloon', key: 'tied', value: true }, { move: 'balloon', toObj: 'rock', offset: [0, -20], ms: 250 }] },
    { on: 'tap', target: 'rock', cooldown: 600, do: [{ fx: 'wobble' }, { sound: 'collision' }] }
  ],
  win: { type: 'state', target: 'balloon', key: 'tied' },
  onWin: [{ fx: 'pop', target: 'balloon' }]
});
