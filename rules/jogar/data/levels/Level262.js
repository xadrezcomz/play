// FASE 262 — ESVAZIE O COPO · vire o copo de cabeça para baixo.
RULES.registerLevel({
  id: 262, chapter: 27,
  instruction: 'LEVEL_262_TITLE',
  hints: ['LEVEL_262_HINT_1', 'LEVEL_262_HINT_2', 'LEVEL_262_HINT_3'],
  objects: [
    {id: 'cup', type: 'cup', x: 50, y: 70, w: 22, h: 28, z: 2, state: {fill: 0.9}, behaviors: {rotatable: {snap: 90}}},
    {id: 'sink', type: 'bar', x: 50, y: 100, w: 50, h: 6, z: 1, passive: true, props: {color: '#C9CED6'}}
  ],
  reactions: [
    {on: 'tap', target: 'cup', cooldown: 700, 'do': [{fx: 'wobble'}, {say: 'FB_STILL_FULL'}]},
    {on: 'rotated', target: 'cup', when: {type: 'state', target: 'cup', key: 'angle', equals: 180}, 'do': [{state: 'cup', key: 'fill', value: 0}, {sound: 'whoosh'}]}
  ],
  win: {type: 'state', target: 'cup', key: 'fill', equals: 0},
  onWin: [{fx: 'pop', target: 'cup'}]
});
