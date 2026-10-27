// FASE 290 — FAÇA O QUE A ÚLTIMA DICA DIZ · abra as dicas até a terceira: toque no triângulo azul.
RULES.registerLevel({
  id: 290, chapter: 29,
  instruction: 'LEVEL_290_TITLE',
  hints: ['LEVEL_290_HINT_1', 'LEVEL_290_HINT_2', 'LEVEL_290_HINT_3'],
  objects: [
    {id: 's1', type: 'triangle', x: 22, y: 50, w: 14, h: 12.6, z: 2, props: {color: 'coral'}},
    {id: 's2', type: 'triangle', x: 50, y: 86, w: 14, h: 12.6, z: 2, props: {color: 'blue'}},
    {id: 's3', type: 'circle', x: 78, y: 50, w: 14, h: 14, z: 2, props: {color: 'blue'}},
    {id: 's4', type: 'cube', x: 22, y: 86, w: 14, h: 14, z: 2, props: {color: 'yellow'}},
    {id: 's5', type: 'star', x: 50, y: 50, w: 14, h: 14, z: 2, props: {color: 'blue'}},
    {id: 's6', type: 'triangle', x: 78, y: 86, w: 14, h: 12.6, z: 2, props: {color: 'green'}}
  ],
  reactions: [
    {on: 'tap', target: 's1', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_READ_LAST_HINT'}]},
    {on: 'tap', target: 's3', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_READ_LAST_HINT'}]},
    {on: 'tap', target: 's4', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_READ_LAST_HINT'}]},
    {on: 'tap', target: 's5', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_READ_LAST_HINT'}]},
    {on: 'tap', target: 's6', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_READ_LAST_HINT'}]}
  ],
  win: [{type: 'tapped', target: 's2'}],
  onWin: [{fx: 'pop', target: 's2'}]
});
