// FASE 295 — ENCONTRE A ESTRELA · ela está escondida nos pontos: ligue de 1 a 5 com o dedo.
RULES.registerLevel({
  id: 295, chapter: 30,
  instruction: 'LEVEL_295_TITLE',
  hints: ['LEVEL_295_HINT_1', 'LEVEL_295_HINT_2', 'LEVEL_295_HINT_3'],
  draw: true,
  objects: [
    {id: 'p1', type: 'number', x: 50.0, y: 40.0, w: 8, z: 3, passive: true, props: {n: 1, color: 'purple'}},
    {id: 'p2', type: 'number', x: 66.5, y: 90.7, w: 8, z: 3, passive: true, props: {n: 2, color: 'purple'}},
    {id: 'p3', type: 'number', x: 23.4, y: 59.3, w: 8, z: 3, passive: true, props: {n: 3, color: 'purple'}},
    {id: 'p4', type: 'number', x: 76.6, y: 59.3, w: 8, z: 3, passive: true, props: {n: 4, color: 'purple'}},
    {id: 'p5', type: 'number', x: 33.5, y: 90.7, w: 8, z: 3, passive: true, props: {n: 5, color: 'purple'}},
    {id: 'star', type: 'star', x: 50, y: 70, w: 54, z: 1, hidden: true, passive: true},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {connect: {dots: ['p1', 'p2', 'p3', 'p4', 'p5', 'p1'], spawn: 'star', tol: 8, failSay: 'FB_ORDER'}}}
  ],
  win: {type: 'state', target: 'ctl', key: 'done'},
  onWin: [{fx: 'pop', target: 'star'}]
});
