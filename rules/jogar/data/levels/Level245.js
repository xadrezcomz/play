// FASE 245 — QUANTAS BOLAS VALEM UMA ESTRELA? · 2 bolas = 1 cubo e 2 cubos = 1 estrela: 4 bolas.
RULES.registerLevel({
  id: 245, chapter: 25,
  instruction: 'LEVEL_245_TITLE',
  hints: ['LEVEL_245_HINT_1', 'LEVEL_245_HINT_2', 'LEVEL_245_HINT_3'],
  objects: [
    {id: 'e1l0', type: 'ball', x: 16, y: 40, w: 8, z: 2, passive: true, props: {color: 'blue'}},
    {id: 'e1l1', type: 'ball', x: 26, y: 40, w: 8, z: 2, passive: true, props: {color: 'blue'}},
    {id: 'e1eq', type: 'word', textKey: 'LEVEL_245_EQ', fontU: 7, x: 50, y: 40, z: 2, passive: true},
    {id: 'e1r0', type: 'cube', x: 64, y: 40, w: 8, z: 2, passive: true, props: {color: 'green'}},
    {id: 'e2l0', type: 'cube', x: 16, y: 58, w: 8, z: 2, passive: true, props: {color: 'green'}},
    {id: 'e2l1', type: 'cube', x: 26, y: 58, w: 8, z: 2, passive: true, props: {color: 'green'}},
    {id: 'e2eq', type: 'word', textKey: 'LEVEL_245_EQ', fontU: 7, x: 50, y: 58, z: 2, passive: true},
    {id: 'e2r0', type: 'star', x: 64, y: 58, w: 8, z: 2, passive: true, props: {color: 'yellow'}},
    {id: 'e3l0', type: 'star', x: 16, y: 78, w: 8, z: 2, passive: true, props: {color: 'yellow'}},
    {id: 'e3eq', type: 'word', textKey: 'LEVEL_245_EQ', fontU: 7, x: 50, y: 78, z: 2, passive: true},
    {id: 'e3r0', type: 'ball', x: 64, y: 78, w: 8, z: 2, passive: true, props: {color: '#B8BFCC'}},
    {id: 'qm', type: 'word', textKey: 'LEVEL_245_Q', fontU: 6, x: 74, y: 78, z: 3, passive: true},
    {id: 'ans', type: 'display', x: 38, y: 104, w: 26, h: 13, z: 3, state: {n: 0}, behaviors: {cycle: {key: 'n'}}},
    {id: 'ok', type: 'button', x: 66, y: 104, w: 14, z: 3, props: {color: 'green'}}
  ],
  reactions: [
    {on: 'tap', target: 'ok', unless: {type: 'state', target: 'ans', key: 'n', equals: 4}, 'do': [{forget: 'ok'}, {fx: 'shake', target: 'ans'}, {fail: 'FB_THINK_AGAIN'}]}
  ],
  win: [{type: 'state', target: 'ans', key: 'n', equals: 4}, {type: 'tapped', target: 'ok'}],
  onWin: [{fx: 'pop', target: 'ans'}]
});
