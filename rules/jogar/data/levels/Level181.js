// FASE 181 — ENCAIXE CADA UM NA SUA SOMBRA · inclusive o Ruli, que também tem sombra.
RULES.registerLevel({
  id: 181, chapter: 19,
  instruction: 'LEVEL_181_TITLE',
  hints: ['LEVEL_181_HINT_1', 'LEVEL_181_HINT_2', 'LEVEL_181_HINT_3'],
  objects: [
    {id: 's_star', type: 'star', x: 22, y: 44, w: 14, z: 1, passive: true, cls: 'silhouette'},
    {id: 's_apple', type: 'apple', x: 50, y: 44, w: 13, z: 1, passive: true, cls: 'silhouette'},
    {id: 's_ruli', type: 'ruli', x: 78, y: 44, w: 14, z: 1, passive: true, cls: 'silhouette', h: 16},
    {id: 'star', type: 'star', x: 78, y: 96, w: 14, z: 4, behaviors: {draggable: {}, snap: {to: ['s_star'], tol: 8}}},
    {id: 'apple', type: 'apple', x: 22, y: 96, w: 13, z: 4, behaviors: {draggable: {}, snap: {to: ['s_apple'], tol: 8}}},
    {id: 'ruli', type: 'ruli', x: 50, y: 94, w: 14, h: 16, z: 5, behaviors: {draggable: {}, character: {}, snap: {to: ['s_ruli'], tol: 8}}}
  ],
  triggers: [
    {when: [{type: 'state', target: 'star', key: 'at', equals: 's_star'}, {type: 'state', target: 'apple', key: 'at', equals: 's_apple'}, {type: 'not', of: {type: 'state', target: 'ruli', key: 'at', equals: 's_ruli'}}], 'do': [{wait: 500}, {say: 'FB_ONE_SHADOW_LEFT'}]}
  ],
  win: [{type: 'state', target: 'star', key: 'at', equals: 's_star'}, {type: 'state', target: 'apple', key: 'at', equals: 's_apple'}, {type: 'state', target: 'ruli', key: 'at', equals: 's_ruli'}],
  onWin: [{expr: 'happy', target: 'ruli'}]
});
