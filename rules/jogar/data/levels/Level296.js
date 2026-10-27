// FASE 296 — FAÇA O RULI SORRIR · ele perdeu o balão: pegue o balão que está fugindo e entregue para ele.
RULES.registerLevel({
  id: 296, chapter: 30,
  instruction: 'LEVEL_296_TITLE',
  hints: ['LEVEL_296_HINT_1', 'LEVEL_296_HINT_2', 'LEVEL_296_HINT_3'],
  objects: [
    {id: 'ruli', type: 'ruli', x: 30, y: 92, w: 16, h: 18, z: 3, state: {expr: 'confused'}, behaviors: {rubbable: {count: 10}, receives: {from: ['balloon'], consume: true, set: {balloon: true}}}},
    {id: 'balloon', type: 'balloon', x: 70, y: 90, w: 10, h: 18, z: 4, behaviors: {draggable: {}, floats: {speed: 0.16, ceil: 22, escape: true}}}
  ],
  reactions: [
    {on: 'rubbing', target: 'ruli', cooldown: 1500, 'do': [{say: 'FB_WANTS_BALLOON'}]},
    {on: 'escaped', target: 'balloon', cooldown: 1000, 'do': [{say: 'FB_FLEW'}]}
  ],
  win: {type: 'state', target: 'ruli', key: 'balloon'},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
