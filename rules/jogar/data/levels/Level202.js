// FASE 202 — FAÇA UMA TORRADA · coloque o pão e abaixe a alavanca (toque na torradeira).
RULES.registerLevel({
  id: 202, chapter: 21,
  instruction: 'LEVEL_202_TITLE',
  hints: ['LEVEL_202_HINT_1', 'LEVEL_202_HINT_2', 'LEVEL_202_HINT_3'],
  objects: [
    {id: 'toaster', type: 'toaster', x: 50, y: 86, w: 40, h: 32, z: 3, hitbox: {x: 50, y: 80, w: 40, h: 30}, behaviors: {clickable: {toggle: 'on', sound: 'click'}, container: {slots: [[-0.2, -0.45]]}}},
    {id: 'bread', type: 'bread', x: 22, y: 46, w: 18, h: 14, z: 2, behaviors: {draggable: {}, bake: {in: 'toaster', ms: 2600, requires: {on: true}, set: {toasted: true}}}}
  ],
  reactions: [
    {on: 'baked', target: 'bread', 'do': [{state: 'toaster', key: 'on', value: false}, {move: 'bread', by: [0, -16], ms: 250}, {sound: 'pop'}]}
  ],
  triggers: [
    {when: [{type: 'inside', objects: ['bread'], container: 'toaster'}, {type: 'idle', seconds: 3}, {type: 'not', of: {type: 'state', target: 'toaster', key: 'on'}}], 'do': [{say: 'FB_NOTHING_HAPPENS'}]}
  ],
  win: {type: 'state', target: 'bread', key: 'toasted'},
  onWin: [{fx: 'hop', target: 'bread'}]
});
