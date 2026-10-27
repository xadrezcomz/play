// FASE 231 — ONDE ESTÁ A ESTRELA? · ela fica embaixo do copo da esquerda; preste atenção antes dos copos descerem.
RULES.registerLevel({
  id: 231, chapter: 24,
  instruction: 'LEVEL_231_TITLE',
  hints: ['LEVEL_231_HINT_1', 'LEVEL_231_HINT_2', 'LEVEL_231_HINT_3'],
  objects: [
    {id: 'table', type: 'bar', x: 50, y: 100, w: 90, h: 4, z: 1, passive: true, props: {color: 'wood'}},
    {id: 'star', type: 'star', x: 24, y: 92, w: 11, z: 2, passive: true},
    {id: 'k0', type: 'cup2', x: 24, y: 52, w: 18, h: 20, z: 4},
    {id: 'k1', type: 'cup2', x: 50, y: 52, w: 18, h: 20, z: 4},
    {id: 'k2', type: 'cup2', x: 76, y: 52, w: 18, h: 20, z: 4},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {timer: {delay: 1800, times: 1, 'do': [{move: 'k0', to: [24, 89], ms: 350}, {move: 'k1', to: [50, 89], ms: 350}, {move: 'k2', to: [76, 89], ms: 350}, {wait: 400}, {state: 'ctl', key: 'covered', value: true}]}}}
  ],
  reactions: [
    {on: 'tap', target: 'k1', when: {type: 'state', target: 'ctl', key: 'covered'}, 'do': [{move: 'k1', by: [0, -16], ms: 200, await: true}, {fail: 'FB_EMPTY'}, {move: 'k1', by: [0, 16], ms: 200}]},
    {on: 'tap', target: 'k2', when: {type: 'state', target: 'ctl', key: 'covered'}, 'do': [{move: 'k2', by: [0, -16], ms: 200, await: true}, {fail: 'FB_EMPTY'}, {move: 'k2', by: [0, 16], ms: 200}]},
    {on: 'tap', target: 'k0', unless: {type: 'state', target: 'ctl', key: 'covered'}, 'do': [{forget: 'k0'}]}
  ],
  win: [{type: 'tapped', target: 'k0'}, {type: 'state', target: 'ctl', key: 'covered'}],
  onWin: [{move: 'k0', by: [0, -18], ms: 250}, {fx: 'pop', target: 'star'}]
});
