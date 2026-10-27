// FASE 279 — TROQUE OS CHAPÉUS · cada amigo quer o chapéu da sua cor; ao soltar um chapéu numa cabeça, os dois trocam.
RULES.registerLevel({
  id: 279, chapter: 28,
  instruction: 'LEVEL_279_TITLE',
  hints: ['LEVEL_279_HINT_1', 'LEVEL_279_HINT_2', 'LEVEL_279_HINT_3'],
  objects: [
    {id: 'w_pink', type: 'ruli', x: 22, y: 86, w: 15, h: 16.8, z: 4, props: {color: 'pink'}},
    {id: 'head_pink', type: 'marker', x: 22, y: 70, w: 4, z: 0, passive: true},
    {id: 'w_yellow', type: 'ruli', x: 50, y: 86, w: 15, h: 16.8, z: 4, props: {color: 'yellow'}},
    {id: 'head_yellow', type: 'marker', x: 50, y: 70, w: 4, z: 0, passive: true},
    {id: 'w_purple', type: 'ruli', x: 78, y: 86, w: 15, h: 16.8, z: 4, props: {color: 'purple'}},
    {id: 'head_purple', type: 'marker', x: 78, y: 70, w: 4, z: 0, passive: true},
    {id: 'hat_yellow', type: 'hat', x: 22, y: 70, w: 10, h: 11.7, z: 6, props: {color: 'yellow'}, state: {at: 'head_pink'}, behaviors: {draggable: {}, snap: {to: ['head_pink', 'head_yellow', 'head_purple'], tol: 10, swap: true}}},
    {id: 'hat_purple', type: 'hat', x: 50, y: 70, w: 10, h: 11.7, z: 6, props: {color: 'purple'}, state: {at: 'head_yellow'}, behaviors: {draggable: {}, snap: {to: ['head_pink', 'head_yellow', 'head_purple'], tol: 10, swap: true}}},
    {id: 'hat_pink', type: 'hat', x: 78, y: 70, w: 10, h: 11.7, z: 6, props: {color: 'pink'}, state: {at: 'head_purple'}, behaviors: {draggable: {}, snap: {to: ['head_pink', 'head_yellow', 'head_purple'], tol: 10, swap: true}}}
  ],
  win: [{type: 'state', target: 'hat_pink', key: 'at', equals: 'head_pink'}, {type: 'state', target: 'hat_yellow', key: 'at', equals: 'head_yellow'}, {type: 'state', target: 'hat_purple', key: 'at', equals: 'head_purple'}],
  onWin: [{expr: 'happy', target: 'w_pink'}, {expr: 'happy', target: 'w_yellow'}, {expr: 'happy', target: 'w_purple'}]
});
