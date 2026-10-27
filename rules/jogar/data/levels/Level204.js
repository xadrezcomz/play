// FASE 204 — ENCHA O COPO · ele está de cabeça para baixo: toque para desvirar antes.
RULES.registerLevel({
  id: 204, chapter: 21,
  instruction: 'LEVEL_204_TITLE',
  hints: ['LEVEL_204_HINT_1', 'LEVEL_204_HINT_2', 'LEVEL_204_HINT_3'],
  objects: [
    {id: 'cup', type: 'cup', x: 50, y: 94, w: 18, h: 24, z: 2, rot: 180, state: {angle: 180, fill: 0}},
    {id: 'jug', type: 'jug', x: 76, y: 48, w: 22, z: 4, behaviors: {draggable: {}, pourer: {target: 'cup', rate: 0.5}}}
  ],
  reactions: [
    {on: 'tap', target: 'cup', when: {type: 'state', target: 'cup', key: 'angle', equals: 180}, 'do': [{turn: 'cup', by: 180, ms: 250}]},
    {on: 'state', target: 'cup', key: 'fill', when: [{type: 'state', target: 'cup', key: 'angle', equals: 180}, {type: 'state', target: 'cup', key: 'fill', min: 0.1}], 'do': [{state: 'cup', key: 'fill', value: 0}, {fail: 'FB_SPILLED'}]}
  ],
  win: [{type: 'state', target: 'cup', key: 'full'}, {type: 'state', target: 'cup', key: 'angle', equals: 0}],
  onWin: [{fx: 'pop', target: 'cup'}]
});
