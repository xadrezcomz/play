// FASE 267 — TIRE TUDO DA CAIXA · inclusive a palavra TUDO que está lá dentro.
RULES.registerLevel({
  id: 267, chapter: 27,
  instruction: 'LEVEL_267_TITLE',
  hints: ['LEVEL_267_HINT_1', 'LEVEL_267_HINT_2', 'LEVEL_267_HINT_3'],
  objects: [
    {id: 'box', type: 'box', x: 50, y: 66, w: 50, h: 40, z: 2, passive: true},
    {id: 'ball', type: 'ball', x: 40, y: 64, w: 11, z: 3, props: {color: 'blue'}, behaviors: {draggable: {}}},
    {id: 'star', type: 'star', x: 58, y: 62, w: 11, z: 3, behaviors: {draggable: {}}},
    {id: 'all', type: 'word', textKey: 'LEVEL_267_ALL', fontU: 5, x: 50, y: 76, z: 3, behaviors: {draggable: {}}}
  ],
  triggers: [
    {when: [{type: 'not', of: {type: 'inside', objects: ['ball'], container: 'box'}}, {type: 'not', of: {type: 'inside', objects: ['star'], container: 'box'}}, {type: 'inside', objects: ['all'], container: 'box'}], 'do': [{wait: 300}, {say: 'FB_NOT_ALL'}]}
  ],
  win: [{type: 'not', of: {type: 'inside', objects: ['ball'], container: 'box'}}, {type: 'not', of: {type: 'inside', objects: ['star'], container: 'box'}}, {type: 'not', of: {type: 'inside', objects: ['all'], container: 'box'}}],
  onWin: [{fx: 'squash', target: 'box'}]
});
