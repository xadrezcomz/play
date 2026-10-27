// FASE 210 — FAÇA UM BOLO DE ANIVERSÁRIO · ligue o forno, asse a massa e coloque a vela.
RULES.registerLevel({
  id: 210, chapter: 21,
  instruction: 'LEVEL_210_TITLE',
  hints: ['LEVEL_210_HINT_1', 'LEVEL_210_HINT_2', 'LEVEL_210_HINT_3'],
  objects: [
    {id: 'oven', type: 'oven', x: 66, y: 78, w: 38, z: 1, behaviors: {clickable: {toggle: 'on', sound: 'click'}, container: {slots: [[0, 0.12]]}}},
    {id: 'bowl', type: 'bowl', x: 22, y: 98, w: 24, h: 15, z: 3, state: {n: 3, mixed: true}, behaviors: {draggable: {}, bake: {in: 'oven', ms: 2600, requires: {on: true}, set: {baked: true}}}},
    {id: 'cake', type: 'cake', x: 30, y: 100, w: 30, h: 24, z: 2, hidden: true, passive: true},
    {id: 'top', type: 'marker', x: 30, y: 86, w: 3, z: 0, passive: true},
    {id: 'candle', type: 'candle', x: 20, y: 44, w: 6, h: 15, z: 5, props: {lit: true, color: 'blue'}, behaviors: {draggable: {}, snap: {to: ['top'], tol: 9}}}
  ],
  reactions: [
    {on: 'baked', target: 'bowl', 'do': [{hide: 'bowl'}, {state: 'oven', key: 'on', value: false}, {show: 'cake'}]},
    {on: 'snapped', target: 'candle', when: {type: 'not', of: {type: 'state', target: 'bowl', key: 'baked'}}, 'do': [{reset: 'candle'}, {state: 'candle', key: 'at', value: null}, {say: 'FB_NO_CAKE_YET'}]}
  ],
  win: [{type: 'state', target: 'bowl', key: 'baked'}, {type: 'state', target: 'candle', key: 'at', equals: 'top'}],
  onWin: [{fx: 'pop', target: 'cake'}, {mascot: 'happy'}]
});
