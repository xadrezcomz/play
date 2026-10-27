// FASE 193 — SALVE O RATO · a placa manda: O GATO PEGA O RATO. Troque GATO e RATO de lugar.
RULES.registerLevel({
  id: 193, chapter: 20,
  instruction: 'LEVEL_193_TITLE',
  hints: ['LEVEL_193_HINT_1', 'LEVEL_193_HINT_2', 'LEVEL_193_HINT_3'],
  objects: [
    {id: 'sign', type: 'paper', x: 50, y: 46, w: 56, h: 34, z: 1, passive: true, props: {blank: true}},
    {id: 'w1', type: 'word', textKey: 'LEVEL_193_A', fontU: 6, x: 50, y: 36, z: 3, behaviors: {draggable: {}}},
    {id: 'w2', type: 'word', textKey: 'LEVEL_193_B', fontU: 6, x: 50, y: 46, z: 3, passive: true},
    {id: 'w3', type: 'word', textKey: 'LEVEL_193_C', fontU: 6, x: 50, y: 56, z: 3, behaviors: {draggable: {}}},
    {id: 'cat', type: 'cat', x: 28, y: 94, w: 22, h: 20, z: 2, passive: true},
    {id: 'mouse', type: 'mouse', x: 70, y: 98, w: 16, h: 11, z: 2, passive: true, state: {}}
  ],
  reactions: [
    {on: 'drop', target: 'w1', when: {type: 'touching', a: 'w1', b: 'w3'}, 'do': [{swapText: ['w1', 'w3']}, {state: 'sign', key: 'swapped', value: true}]},
    {on: 'drop', target: 'w3', when: {type: 'touching', a: 'w1', b: 'w3'}, 'do': [{swapText: ['w1', 'w3']}, {state: 'sign', key: 'swapped', value: true}]},
    {on: 'drop', target: 'w1', unless: {type: 'touching', a: 'w1', b: 'w3'}, 'do': [{reset: 'w1'}]},
    {on: 'drop', target: 'w3', unless: {type: 'touching', a: 'w1', b: 'w3'}, 'do': [{reset: 'w3'}]}
  ],
  win: {type: 'state', target: 'sign', key: 'swapped'},
  onWin: [{move: 'mouse', to: [40, 98], ms: 400}, {move: 'cat', to: [84, 94], ms: 400}, {fx: 'shake', target: 'cat'}]
});
