// FASE 18 — ACENDA TODAS AS LUZES · só duas ficam acesas: a mais antiga apaga.
// Mas se duas forem ligadas ao mesmo tempo, ninguém sabe qual é a mais antiga.
// Dá para ligar duas juntas com dois dedos, ou empilhando um interruptor em
// cima do outro e tocando na pilha (funciona com mouse e com um dedo só).
RULES.registerLevel({
  id: 18, chapter: 2,
  instruction: 'LEVEL_018_TITLE',
  hints: ['LEVEL_018_HINT_1', 'LEVEL_018_HINT_2', 'LEVEL_018_HINT_3'],
  objects: [
    { id: 'wiring', type: 'marker', x: 50, y: 0, w: 1, passive: true,
      behaviors: { group: { members: ['s1', 's2', 's3'], key: 'on', max: 2, tieMs: 250 } } },
    { id: 's1', type: 'switch', x: 22, y: 96, w: 15, h: 25, behaviors: { clickable: { toggle: 'on', sound: 'click', fx: 'squash' }, draggable: {}, stackPress: {} } },
    { id: 's2', type: 'switch', x: 50, y: 96, w: 15, h: 25, behaviors: { clickable: { toggle: 'on', sound: 'click', fx: 'squash' }, draggable: {}, stackPress: {} } },
    { id: 's3', type: 'switch', x: 78, y: 96, w: 15, h: 25, behaviors: { clickable: { toggle: 'on', sound: 'click', fx: 'squash' }, draggable: {}, stackPress: {} } },
    { id: 'b1', type: 'bulb', x: 22, y: 40, w: 19, h: 27, behaviors: { mirror: { from: 's1', key: 'on' } } },
    { id: 'b2', type: 'bulb', x: 50, y: 40, w: 19, h: 27, behaviors: { mirror: { from: 's2', key: 'on' } } },
    { id: 'b3', type: 'bulb', x: 78, y: 40, w: 19, h: 27, behaviors: { mirror: { from: 's3', key: 'on' } } }
  ],
  reactions: [
    { on: 'replaced', cooldown: 600, do: [{ say: 'FB_OLDEST' }] }
  ],
  win: [
    { type: 'state', target: 'b1', key: 'on' },
    { type: 'state', target: 'b2', key: 'on' },
    { type: 'state', target: 'b3', key: 'on' }
  ],
  onWin: [{ fx: 'pop', target: 'b1' }, { fx: 'pop', target: 'b2' }, { fx: 'pop', target: 'b3' }]
});
