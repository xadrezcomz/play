// FASE 222 — QUANTOS RULIS EXISTEM? · um atrás da nuvem e um bem pequenininho: são 4.
RULES.registerLevel({
  id: 222, chapter: 23,
  instruction: 'LEVEL_222_TITLE',
  hints: ['LEVEL_222_HINT_1', 'LEVEL_222_HINT_2', 'LEVEL_222_HINT_3'],
  objects: [
    {id: 'r1', type: 'ruli', x: 24, y: 84, w: 14, h: 16, z: 2, passive: true},
    {id: 'r2', type: 'ruli', x: 56, y: 88, w: 14, h: 16, z: 2, passive: true, props: {color: 'pink'}},
    {id: 'r3', type: 'ruli', x: 74, y: 36, w: 12, h: 13.5, z: 1, passive: true, props: {color: 'yellow'}},
    {id: 'cloud', type: 'cloud', x: 74, y: 38, w: 34, h: 20, z: 3, behaviors: {draggable: {}}},
    {id: 'r4', type: 'ruli', x: 14, y: 40, w: 3, h: 3.4, z: 2, passive: true, props: {color: 'purple'}},
    {id: 'ans', type: 'display', x: 38, y: 108, w: 26, h: 13, z: 3, state: {n: 0}, behaviors: {cycle: {key: 'n'}}},
    {id: 'ok', type: 'button', x: 66, y: 108, w: 14, z: 3, props: {color: 'green'}}
  ],
  reactions: [
    {on: 'tap', target: 'ok', unless: {type: 'state', target: 'ans', key: 'n', equals: 4}, 'do': [{forget: 'ok'}, {fx: 'shake', target: 'ans'}, {fail: 'FB_COUNT_AGAIN'}]}
  ],
  win: [{type: 'state', target: 'ans', key: 'n', equals: 4}, {type: 'tapped', target: 'ok'}],
  onWin: [{fx: 'pop', target: 'ans'}]
});
