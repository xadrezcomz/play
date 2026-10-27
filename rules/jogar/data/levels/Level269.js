// FASE 269 — DESÇA ATÉ A BANDEIRA · o balão puxa o Ruli para cima: estoure o balão.
RULES.registerLevel({
  id: 269, chapter: 27,
  instruction: 'LEVEL_269_TITLE',
  hints: ['LEVEL_269_HINT_1', 'LEVEL_269_HINT_2', 'LEVEL_269_HINT_3'],
  objects: [
    {id: 'ground', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'flag', type: 'flag', x: 50, y: 96, w: 9, h: 14, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 50, y: 60, w: 13, h: 14.6, z: 3, state: {balloon: true, lifted: true}, behaviors: {draggable: {axis: 'x', minX: 10, maxX: 90}, floats: {needs: 'lifted', speed: 0.12, ceil: 26}, gravity: {solids: ['ground']}}}
  ],
  reactions: [
    {on: 'tap', target: 'ruli', when: {type: 'state', target: 'ruli', key: 'lifted'}, 'do': [{state: 'ruli', key: 'balloon', value: false}, {state: 'ruli', key: 'lifted', value: false}, {sound: 'pop'}, {expr: 'surprised', target: 'ruli'}]}
  ],
  win: [{type: 'touching', a: 'ruli', b: 'flag'}, {type: 'state', target: 'ruli', key: 'landed'}],
  onWin: [{expr: 'happy', target: 'ruli'}]
});
