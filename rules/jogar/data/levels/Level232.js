// FASE 232 — ONDE ESTÁ A BOLA? · acompanhe o copo da bola enquanto eles trocam de lugar.
RULES.registerLevel({
  id: 232, chapter: 24,
  instruction: 'LEVEL_232_TITLE',
  hints: ['LEVEL_232_HINT_1', 'LEVEL_232_HINT_2', 'LEVEL_232_HINT_3'],
  objects: [
    {id: 'table', type: 'bar', x: 50, y: 100, w: 90, h: 4, z: 1, passive: true, props: {color: 'wood'}},
    {id: 'ball', type: 'ball', x: 50, y: 94, w: 8, z: 2, passive: true, props: {color: 'coral'}},
    {id: 'k0', type: 'cup2', x: 24, y: 89, w: 18, h: 20, z: 4},
    {id: 'k1', type: 'cup2', x: 50, y: 70, w: 18, h: 20, z: 4, behaviors: {carries: {ids: ['ball']}}},
    {id: 'k2', type: 'cup2', x: 76, y: 89, w: 18, h: 20, z: 4},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {delay: 1200, times: 1, 'do': [{move: 'k1', to: [50, 89], ms: 300, await: true}, {move: 'ball', to: [50, 94], ms: 0}, {wait: 400}, {swap: ['k1', 'k0'], ms: 420, await: true}, {wait: 80}, {swap: ['k0', 'k2'], ms: 420, await: true}, {wait: 80}, {swap: ['k1', 'k2'], ms: 420, await: true}, {wait: 80}, {swap: ['k2', 'k0'], ms: 420, await: true}, {wait: 80}, {swap: ['k0', 'k1'], ms: 420, await: true}, {wait: 80}, {swap: ['k1', 'k2'], ms: 420, await: true}, {wait: 80}, {state: 'ctl', key: 'ready', value: true}]}}}
  ],
  reactions: [
    {on: 'tap', target: 'k0', when: {type: 'state', target: 'ctl', key: 'ready'}, 'do': [{move: 'k0', by: [0, -16], ms: 200, await: true}, {fail: 'FB_EMPTY'}, {move: 'k0', by: [0, 16], ms: 200}]},
    {on: 'tap', target: 'k2', when: {type: 'state', target: 'ctl', key: 'ready'}, 'do': [{move: 'k2', by: [0, -16], ms: 200, await: true}, {fail: 'FB_EMPTY'}, {move: 'k2', by: [0, 16], ms: 200}]},
    {on: 'tap', target: 'k1', unless: {type: 'state', target: 'ctl', key: 'ready'}, 'do': [{forget: 'k1'}]}
  ],
  win: [{type: 'tapped', target: 'k1'}, {type: 'state', target: 'ctl', key: 'ready'}],
  onWin: [{move: 'k1', by: [0, -18], ms: 250}, {fx: 'pop', target: 'ball'}]
});
