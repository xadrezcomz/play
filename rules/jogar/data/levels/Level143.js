// FASE 143 — DEIXE TUDO ROXO · inclusive o Ruli e a própria palavra TUDO.
RULES.registerLevel({
  id: 143, chapter: 15,
  instruction: 'LEVEL_143_TITLE',
  hints: ['LEVEL_143_HINT_1', 'LEVEL_143_HINT_2', 'LEVEL_143_HINT_3'],
  objects: [
    {id: 'w_all', inText: true, behaviors: {receives: {from: ['paint'], copyColor: true, returnTool: true}}},
    {id: 'c1', type: 'circle', x: 24, y: 50, w: 18, z: 2, props: {color: 'coral'}, behaviors: {receives: {from: ['paint'], copyColor: true, returnTool: true}}},
    {id: 'c2', type: 'circle', x: 76, y: 50, w: 18, z: 2, props: {color: 'yellow'}, behaviors: {receives: {from: ['paint'], copyColor: true, returnTool: true}}},
    {id: 'ruli', type: 'ruli', x: 50, y: 74, w: 16, h: 18, z: 3, behaviors: {receives: {from: ['paint'], copyColor: true, returnTool: true}}},
    {id: 'paint', type: 'bucket', x: 50, y: 104, w: 12, h: 13.5, z: 6, props: {color: 'purple'}, behaviors: {draggable: {}}}
  ],
  triggers: [
    {when: [{type: 'state', target: 'c1', key: 'color', equals: 'purple'}, {type: 'state', target: 'c2', key: 'color', equals: 'purple'}, {type: 'state', target: 'ruli', key: 'color', equals: 'purple'}, {type: 'not', of: {type: 'state', target: 'w_all', key: 'color', equals: 'purple'}}], 'do': [{wait: 400}, {say: 'FB_NOT_ALL'}]}
  ],
  win: [{type: 'state', target: 'c1', key: 'color', equals: 'purple'}, {type: 'state', target: 'c2', key: 'color', equals: 'purple'}, {type: 'state', target: 'ruli', key: 'color', equals: 'purple'}, {type: 'state', target: 'w_all', key: 'color', equals: 'purple'}],
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'pop', target: 'ruli'}]
});
