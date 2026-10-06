// FASE 79 — NÃO DEIXE O SORVETE DERRETER · faça sombra (nuvem no sol ou guarda-chuva).
RULES.registerLevel({
  id: 79, chapter: 8,
  instruction: 'LEVEL_079_TITLE',
  hints: ['LEVEL_079_HINT_1', 'LEVEL_079_HINT_2', 'LEVEL_079_HINT_3'],
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
    { id: 'sun', type: 'sun', x: 76, y: 22, w: 20, z: 2, passive: true },
    { id: 'ice', type: 'icecream', x: 50, y: 92, w: 14, h: 24, z: 3,
      behaviors: { melts: { heat: 'sun', shade: ['cloud', 'umbrella'], rate: 0.09, safeMs: 3000 } } },
    { id: 'cloud', type: 'cloud', x: 22, y: 30, w: 30, h: 18, z: 5, behaviors: { draggable: {} } },
    { id: 'umbrella', type: 'umbrella', x: 84, y: 92, w: 18, h: 18, z: 5, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'melted', target: 'ice', do: [{ fail: 'FB_MELTED' }] },
    { on: 'tap', target: 'ice', cooldown: 600, do: [{ fx: 'wobble' }, { say: 'FB_HOT' }] }
  ],
  win: { type: 'state', target: 'ice', key: 'safe' },
  onWin: [{ fx: 'hop', target: 'ice' }]
});
