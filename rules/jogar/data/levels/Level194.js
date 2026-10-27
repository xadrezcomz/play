// FASE 194 — DEIXE O RULI FELIZ · a placa diz que ele está TRISTE; leve a palavra FELIZ até TRISTE.
RULES.registerLevel({
  id: 194, chapter: 20,
  instruction: 'LEVEL_194_TITLE',
  hints: ['LEVEL_194_HINT_1', 'LEVEL_194_HINT_2', 'LEVEL_194_HINT_3'],
  objects: [
    {id: 'w_happy', inText: true, behaviors: {draggable: {}}},
    {id: 'sign', type: 'paper', x: 50, y: 44, w: 50, h: 26, z: 1, passive: true, props: {blank: true}},
    {id: 's1', type: 'word', textKey: 'LEVEL_194_A', fontU: 6, x: 50, y: 38, z: 3, passive: true},
    {id: 'sad', type: 'word', textKey: 'LEVEL_194_B', fontU: 6, x: 50, y: 49, z: 3, behaviors: {receives: {from: ['w_happy'], consume: true, set: {changed: true}}}},
    {id: 'ruli', type: 'ruli', x: 50, y: 88, w: 18, h: 20, z: 3, state: {expr: 'confused'}, behaviors: {rubbable: {count: 10}}}
  ],
  reactions: [
    {on: 'rubbing', target: 'ruli', cooldown: 1500, 'do': [{expr: 'happy', target: 'ruli'}, {wait: 500}, {expr: 'confused', target: 'ruli'}, {say: 'FB_SIGN_SAYS'}]},
    {on: 'used', target: 'sad', 'do': [{setText: 'sad', key: 'LEVEL_194_C'}]}
  ],
  win: {type: 'state', target: 'sad', key: 'changed'},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
