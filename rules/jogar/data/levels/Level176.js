// FASE 176 — ENCHA O COPO ATÉ A METADE · segure a jarra em cima do copo e solte na hora certa.
RULES.registerLevel({
  id: 176, chapter: 18,
  instruction: 'LEVEL_176_TITLE',
  hints: ['LEVEL_176_HINT_1', 'LEVEL_176_HINT_2', 'LEVEL_176_HINT_3'],
  objects: [
    {id: 'cup', type: 'cup', x: 50, y: 92, w: 20, h: 26, z: 2, state: {fill: 0}},
    {id: 'mark', type: 'bar', x: 50, y: 92, w: 24, h: 0.8, z: 3, passive: true, props: {color: 'coral'}},
    {id: 'jug', type: 'jug', x: 76, y: 50, w: 22, z: 4, behaviors: {draggable: {}, pourer: {target: 'cup', rate: 0.25}}}
  ],
  reactions: [
    {on: 'tap', target: 'cup', 'do': [{state: 'cup', key: 'fill', value: 0}, {state: 'cup', key: 'full', value: false}, {fx: 'wobble'}]}
  ],
  triggers: [
    {when: {type: 'state', target: 'cup', key: 'fill', min: 0.62}, 'do': [{fail: 'FB_TOO_MUCH'}, {wait: 600}, {say: 'FB_TAP_TO_EMPTY'}], once: false}
  ],
  win: {type: 'state', target: 'cup', key: 'fill', min: 0.38, max: 0.62},
  onWin: [{fx: 'pop', target: 'cup'}]
});
