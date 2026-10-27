// FASE 219 — ACHE A SAÍDA · só uma placa diz a verdade: a saída é a porta 2.
RULES.registerLevel({
  id: 219, chapter: 22,
  instruction: 'LEVEL_219_TITLE',
  hints: ['LEVEL_219_HINT_1', 'LEVEL_219_HINT_2', 'LEVEL_219_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'd1', type: 'door', x: 20, y: 86, w: 16, h: 32, z: 2},
    {id: 'd1n', type: 'number', x: 20, y: 62, w: 8, z: 3, passive: true, props: {n: 1}},
    {id: 'd1s', type: 'paper', x: 20, y: 40, w: 28, h: 20, z: 1, passive: true, props: {blank: true}},
    {id: 'd1a', type: 'word', textKey: 'LEVEL_219_A1', fontU: 3.4, x: 20, y: 36, z: 2, passive: true},
    {id: 'd1b', type: 'word', textKey: 'LEVEL_219_A2', fontU: 3.4, x: 20, y: 44, z: 2, passive: true},
    {id: 'd2', type: 'door', x: 50, y: 86, w: 16, h: 32, z: 2},
    {id: 'd2n', type: 'number', x: 50, y: 62, w: 8, z: 3, passive: true, props: {n: 2}},
    {id: 'd2s', type: 'paper', x: 50, y: 40, w: 28, h: 20, z: 1, passive: true, props: {blank: true}},
    {id: 'd2a', type: 'word', textKey: 'LEVEL_219_B1', fontU: 3.4, x: 50, y: 36, z: 2, passive: true},
    {id: 'd2b', type: 'word', textKey: 'LEVEL_219_B2', fontU: 3.4, x: 50, y: 44, z: 2, passive: true},
    {id: 'd3', type: 'door', x: 80, y: 86, w: 16, h: 32, z: 2},
    {id: 'd3n', type: 'number', x: 80, y: 62, w: 8, z: 3, passive: true, props: {n: 3}},
    {id: 'd3s', type: 'paper', x: 80, y: 40, w: 28, h: 20, z: 1, passive: true, props: {blank: true}},
    {id: 'd3a', type: 'word', textKey: 'LEVEL_219_C1', fontU: 3.4, x: 80, y: 36, z: 2, passive: true},
    {id: 'd3b', type: 'word', textKey: 'LEVEL_219_C2', fontU: 3.4, x: 80, y: 44, z: 2, passive: true}
  ],
  reactions: [
    {on: 'tap', target: 'd1', 'do': [{forget: 'd1'}, {fx: 'shake'}, {fail: 'FB_THINK_SIGNS'}]},
    {on: 'tap', target: 'd3', 'do': [{forget: 'd3'}, {fx: 'shake'}, {fail: 'FB_THINK_SIGNS'}]}
  ],
  win: {type: 'tapped', target: 'd2'},
  onWin: [{move: 'd2', by: [-10, 0], ms: 400}]
});
