// FASE 223 — ACHE A CHAVE · as três caixas estão vazias; a chave está embaixo da caixa do meio.
RULES.registerLevel({
  id: 223, chapter: 23,
  instruction: 'LEVEL_223_TITLE',
  hints: ['LEVEL_223_HINT_1', 'LEVEL_223_HINT_2', 'LEVEL_223_HINT_3'],
  objects: [
    {id: 'key', type: 'key', x: 50, y: 88, w: 12, h: 6, z: 1},
    {id: 'c0', type: 'chest', x: 22, y: 84, w: 22, h: 20, z: 3, behaviors: {clickable: {toggle: 'open', fx: 'squash'}, draggable: {}}},
    {id: 'c1', type: 'chest', x: 50, y: 84, w: 22, h: 20, z: 3, behaviors: {clickable: {toggle: 'open', fx: 'squash'}, draggable: {}}},
    {id: 'c2', type: 'chest', x: 78, y: 84, w: 22, h: 20, z: 3, behaviors: {clickable: {toggle: 'open', fx: 'squash'}, draggable: {}}}
  ],
  reactions: [
    {on: 'state', target: 'c0', key: 'open', value: true, cooldown: 300, 'do': [{say: 'FB_EMPTY'}]},
    {on: 'state', target: 'c1', key: 'open', value: true, cooldown: 300, 'do': [{say: 'FB_EMPTY'}]},
    {on: 'state', target: 'c2', key: 'open', value: true, cooldown: 300, 'do': [{say: 'FB_EMPTY'}]}
  ],
  win: {type: 'tapped', target: 'key'},
  onWin: [{fx: 'pop', target: 'key'}]
});
