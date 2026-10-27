// FASE 128 — DERRUBE TODAS AS PEÇAS · a última peça está deitada longe; coloque-a em pé no fim da fila antes de empurrar.
RULES.registerLevel({
  id: 128, chapter: 13,
  instruction: 'LEVEL_128_TITLE',
  hints: ['LEVEL_128_HINT_1', 'LEVEL_128_HINT_2', 'LEVEL_128_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 108, w: 100, h: 14, z: 1, passive: true},
    {id: 'd1', type: 'plank', x: 32, y: 91, w: 4, h: 20, z: 4, props: {color: 'purple'}},
    {id: 'd2', type: 'plank', x: 43, y: 91, w: 4, h: 20, z: 4, props: {color: 'purple'}},
    {id: 'd3', type: 'plank', x: 54, y: 91, w: 4, h: 20, z: 4, props: {color: 'purple'}},
    {id: 'd4', type: 'plank', x: 65, y: 91, w: 4, h: 20, z: 4, props: {color: 'purple'}},
    {id: 'slot', type: 'marker', x: 76, y: 91, w: 4, z: 0, passive: true},
    {id: 'd5', type: 'plank', x: 30, y: 46, w: 4, h: 20, z: 4, rot: 90, props: {color: 'purple'}, behaviors: {draggable: {}, snap: {to: ['slot'], tol: 10}}},
    {id: 'ruli', type: 'ruli', x: 14, y: 92, w: 12, h: 13.5, z: 8, behaviors: {draggable: {}, character: {}, pushes: {ids: ['d1'], solids: []}}}
  ],
  reactions: [
    {on: 'pushed', target: 'd1', unless: {type: 'state', target: 'd1', key: 'fallen'}, 'do': [{state: 'd1', key: 'fallen', value: true}, {move: 'd1', by: [3, 6], rot: 72, ms: 180}, {sound: 'drop'}, {wait: 120}, {state: 'd2', key: 'fallen', value: true}, {move: 'd2', by: [3, 6], rot: 72, ms: 180}, {sound: 'drop'}, {wait: 120}, {state: 'd3', key: 'fallen', value: true}, {move: 'd3', by: [3, 6], rot: 72, ms: 180}, {sound: 'drop'}, {wait: 120}, {state: 'd4', key: 'fallen', value: true}, {move: 'd4', by: [3, 6], rot: 72, ms: 180}, {sound: 'drop'}, {wait: 120}]}
  ],
  triggers: [
    {when: [{type: 'state', target: 'd4', key: 'fallen'}, {type: 'state', target: 'd5', key: 'at', equals: 'slot'}], 'do': [{state: 'd5', key: 'fallen', value: true}, {move: 'd5', by: [3, 6], rot: 72, ms: 180}, {sound: 'drop'}, {wait: 120}]},
    {when: [{type: 'state', target: 'd4', key: 'fallen'}, {type: 'not', of: {type: 'state', target: 'd5', key: 'at', equals: 'slot'}}], 'do': [{wait: 600}, {say: 'FB_MISSED_ONE'}]}
  ],
  win: {type: 'countState', ids: ['d1', 'd2', 'd3', 'd4', 'd5'], key: 'fallen', equals: 5},
  onWin: [{expr: 'happy', target: 'ruli'}]
});
