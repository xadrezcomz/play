// FASE 168 — FAÇA A PLANTA CRESCER · regue e depois deixe ela em paz por um tempo.
RULES.registerLevel({
  id: 168, chapter: 17,
  instruction: 'LEVEL_168_TITLE',
  hints: ['LEVEL_168_HINT_1', 'LEVEL_168_HINT_2', 'LEVEL_168_HINT_3'],
  objects: [
    {id: 'plant', type: 'plant', x: 50, y: 82, w: 22, h: 38, z: 2, behaviors: {receives: {from: ['can'], set: {watered: true}, returnTool: true}}},
    {id: 'can', type: 'can', x: 22, y: 46, w: 22, h: 15, z: 4, behaviors: {draggable: {}}},
    {id: 'sun', type: 'sun', x: 78, y: 34, w: 16, z: 1, passive: true}
  ],
  reactions: [
    {on: 'tap', target: 'plant', cooldown: 800, 'do': [{fx: 'wobble'}, {say: 'FB_GROWING_TAKES_TIME'}]}
  ],
  triggers: [
    {when: [{type: 'state', target: 'plant', key: 'watered'}, {type: 'idle', seconds: 3}], 'do': [{state: 'plant', key: 'grown', value: true}]}
  ],
  win: {type: 'state', target: 'plant', key: 'grown'},
  onWin: [{fx: 'hop', target: 'plant'}]
});
