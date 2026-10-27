// FASE 248 — QUANTOS TRIÂNGULOS EXISTEM? · o da esquerda, o da direita e o grande: 3.
RULES.registerLevel({
  id: 248, chapter: 25,
  instruction: 'LEVEL_248_TITLE',
  hints: ['LEVEL_248_HINT_1', 'LEVEL_248_HINT_2', 'LEVEL_248_HINT_3'],
  objects: [
    {id: 'tri', type: 'wire', x: 50, y: 62, w: 60, h: 48, z: 1, passive: true, props: {pts: [[50, 0], [100, 100], [0, 100], [50, 0], [50, 100]], width: 4, color: 'purple'}},
    {id: 'ans', type: 'display', x: 38, y: 104, w: 26, h: 13, z: 3, state: {n: 0}, behaviors: {cycle: {key: 'n'}}},
    {id: 'ok', type: 'button', x: 66, y: 104, w: 14, z: 3, props: {color: 'green'}}
  ],
  reactions: [
    {on: 'tap', target: 'ok', unless: {type: 'state', target: 'ans', key: 'n', equals: 3}, 'do': [{forget: 'ok'}, {fx: 'shake', target: 'ans'}, {fail: 'FB_THINK_AGAIN'}]}
  ],
  win: [{type: 'state', target: 'ans', key: 'n', equals: 3}, {type: 'tapped', target: 'ok'}],
  onWin: [{fx: 'pop', target: 'ans'}]
});
