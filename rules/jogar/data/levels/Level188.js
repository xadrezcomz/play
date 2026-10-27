// FASE 188 — COMPLETE A BORBOLETA · a asa solta está virada: toque para virar e encaixe.
RULES.registerLevel({
  id: 188, chapter: 19,
  instruction: 'LEVEL_188_TITLE',
  hints: ['LEVEL_188_HINT_1', 'LEVEL_188_HINT_2', 'LEVEL_188_HINT_3'],
  objects: [
    {id: 'body', type: 'stick', x: 50, y: 62, w: 4, h: 26, z: 3, passive: true},
    {id: 'wl', type: 'leaf', x: 38, y: 58, w: 22, h: 16, z: 2, passive: true, props: {color: 'purple'}, state: {flip: true}},
    {id: 'slot', type: 'leaf', x: 62, y: 58, w: 22, h: 16, z: 1, passive: true, cls: 'silhouette'},
    {id: 'wr', type: 'leaf', x: 30, y: 98, w: 22, h: 16, z: 4, props: {color: 'purple'}, state: {flip: true}, behaviors: {draggable: {}, clickable: {toggle: 'flip', fx: 'squash'}, snap: {to: ['slot'], tol: 9}}}
  ],
  reactions: [
    {on: 'snapped', target: 'wr', when: {type: 'state', target: 'wr', key: 'flip'}, 'do': [{reset: 'wr'}, {state: 'wr', key: 'at', value: null}, {fail: 'FB_WRONG_SIDE'}]}
  ],
  win: [{type: 'state', target: 'wr', key: 'at', equals: 'slot'}, {type: 'state', target: 'wr', key: 'flip', equals: false}],
  onWin: [{fx: 'pop', target: 'wl'}, {fx: 'pop', target: 'wr'}]
});
