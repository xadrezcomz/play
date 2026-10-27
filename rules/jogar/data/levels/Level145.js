// FASE 145 — ESCONDA O RULI · pinte o Ruli de verde e coloque no meio do arbusto.
RULES.registerLevel({
  id: 145, chapter: 15,
  instruction: 'LEVEL_145_TITLE',
  hints: ['LEVEL_145_HINT_1', 'LEVEL_145_HINT_2', 'LEVEL_145_HINT_3'],
  objects: [
    {id: 'bushfill', type: 'bush', x: 70, y: 90, w: 42, h: 28, z: 1, passive: true},
    {id: 'tree', type: 'tree', x: 22, y: 80, w: 20, h: 34, z: 2, passive: true},
    {id: 'ruli', type: 'ruli', x: 40, y: 50, w: 14, h: 16, z: 4, behaviors: {draggable: {}, character: {}, receives: {from: ['pg', 'pr'], copyColor: true, returnTool: true}}},
    {id: 'pg', type: 'bucket', x: 22, y: 30, w: 12, h: 13.5, z: 6, props: {color: 'green'}, behaviors: {draggable: {}}},
    {id: 'pr', type: 'bucket', x: 80, y: 30, w: 12, h: 13.5, z: 6, props: {color: 'coral'}, behaviors: {draggable: {}}}
  ],
  triggers: [
    {when: [{type: 'inside', objects: ['ruli'], container: 'bushfill'}, {type: 'not', of: {type: 'state', target: 'ruli', key: 'color', equals: 'green'}}], once: false, 'do': [{wait: 300}, {say: 'FB_SEEN'}]}
  ],
  win: [{type: 'inside', objects: ['ruli'], container: 'bushfill'}, {type: 'state', target: 'ruli', key: 'color', equals: 'green'}],
  onWin: [{expr: 'happy', target: 'ruli'}]
});
