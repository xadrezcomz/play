// FASE 287 — TOQUE NA ESTERLA · a palavra está errada: troque duas letras para virar ESTRELA e depois toque nela.
RULES.registerLevel({
  id: 287, chapter: 29,
  instruction: 'LEVEL_287_TITLE',
  hints: ['LEVEL_287_HINT_1', 'LEVEL_287_HINT_2', 'LEVEL_287_HINT_3'],
  objects: [
    {id: 'la', inText: true, behaviors: {draggable: {}}},
    {id: 'lb', inText: true, behaviors: {draggable: {}}},
    {id: 'star', type: 'star', x: 50, y: 66, w: 22, z: 2},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {wordSwap: {ids: ['la', 'lb'], tol: 6}}}
  ],
  reactions: [
    {on: 'swapped', 'do': [{toggle: 'ctl', key: 'fixed'}]},
    {on: 'tap', target: 'star', unless: {type: 'state', target: 'ctl', key: 'fixed'}, 'do': [{forget: 'star'}, {fx: 'shake'}, {fail: 'FB_NO_SUCH_THING'}]}
  ],
  win: [{type: 'state', target: 'ctl', key: 'fixed'}, {type: 'tapped', target: 'star'}],
  onWin: [{fx: 'pop', target: 'star'}]
});
