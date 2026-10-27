// FASE 270 — FAÇA O CONTRÁRIO DA PLACA · a placa diz: NÃO TOQUE NA LUA, DEIXE A BOLA FORA DA CAIXA, APAGUE A LUZ.
RULES.registerLevel({
  id: 270, chapter: 27,
  instruction: 'LEVEL_270_TITLE',
  hints: ['LEVEL_270_HINT_1', 'LEVEL_270_HINT_2', 'LEVEL_270_HINT_3'],
  objects: [
    {id: 'sign', type: 'paper', x: 50, y: 40, w: 84, h: 26, z: 1, passive: true, props: {blank: true}},
    {id: 'l1', type: 'word', textKey: 'LEVEL_270_A', fontU: 4, x: 50, y: 33, z: 2, passive: true},
    {id: 'l2', type: 'word', textKey: 'LEVEL_270_B', fontU: 4, x: 50, y: 40, z: 2, passive: true},
    {id: 'l3', type: 'word', textKey: 'LEVEL_270_C', fontU: 4, x: 50, y: 47, z: 2, passive: true},
    {id: 'moon', type: 'moon', x: 20, y: 72, w: 13, z: 2},
    {id: 'bulb', type: 'bulb', x: 50, y: 70, w: 12, h: 17, z: 2, state: {on: true}},
    {id: 'switch', type: 'switch', x: 64, y: 74, w: 8, h: 13, z: 2, state: {on: true}, behaviors: {clickable: {toggle: 'on', sound: 'click'}}},
    {id: 'box', type: 'box', x: 74, y: 100, w: 26, h: 20, z: 2, behaviors: {container: {}}},
    {id: 'ball', type: 'ball', x: 30, y: 100, w: 10, z: 4, props: {color: 'coral'}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'switch', 'do': [{toggle: 'bulb'}]}
  ],
  win: [{type: 'tapped', target: 'moon'}, {type: 'inside', objects: ['ball'], container: 'box'}, {type: 'state', target: 'bulb', key: 'on'}],
  onWin: [{fx: 'pop', target: 'moon'}, {fx: 'pop', target: 'ball'}, {fx: 'pop', target: 'bulb'}]
});
