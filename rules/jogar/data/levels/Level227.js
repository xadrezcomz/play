// FASE 227 — ACHE AS 5 ESTRELAS · uma atrás da nuvem e uma minúscula no canto.
RULES.registerLevel({
  id: 227, chapter: 23,
  instruction: 'LEVEL_227_TITLE',
  hints: ['LEVEL_227_HINT_1', 'LEVEL_227_HINT_2', 'LEVEL_227_HINT_3'],
  objects: [
    {id: 's1', type: 'star', x: 20, y: 40, w: 10, z: 1},
    {id: 's2', type: 'star', x: 50, y: 60, w: 12, z: 1},
    {id: 's3', type: 'star', x: 80, y: 90, w: 11, z: 1},
    {id: 's4', type: 'star', x: 74, y: 40, w: 10, z: 1},
    {id: 's5', type: 'star', x: 8, y: 112, w: 3, z: 1},
    {id: 'cloud', type: 'cloud', x: 74, y: 42, w: 30, h: 18, z: 3, behaviors: {draggable: {}}},
    {id: 'score', type: 'display', x: 30, y: 100, w: 22, h: 11, z: 2, passive: true, state: {n: 0}}
  ],
  reactions: [
    {on: 'tap', target: 's1', unless: {type: 'state', target: 's1', key: 'found'}, 'do': [{state: 's1', key: 'found', value: true}, {add: 'score', key: 'n'}, {fx: 'pop'}, {cls: 's1', add: 'faint'}]},
    {on: 'tap', target: 's2', unless: {type: 'state', target: 's2', key: 'found'}, 'do': [{state: 's2', key: 'found', value: true}, {add: 'score', key: 'n'}, {fx: 'pop'}, {cls: 's2', add: 'faint'}]},
    {on: 'tap', target: 's3', unless: {type: 'state', target: 's3', key: 'found'}, 'do': [{state: 's3', key: 'found', value: true}, {add: 'score', key: 'n'}, {fx: 'pop'}, {cls: 's3', add: 'faint'}]},
    {on: 'tap', target: 's4', unless: {type: 'state', target: 's4', key: 'found'}, 'do': [{state: 's4', key: 'found', value: true}, {add: 'score', key: 'n'}, {fx: 'pop'}, {cls: 's4', add: 'faint'}]},
    {on: 'tap', target: 's5', unless: {type: 'state', target: 's5', key: 'found'}, 'do': [{state: 's5', key: 'found', value: true}, {add: 'score', key: 'n'}, {fx: 'pop'}, {cls: 's5', add: 'faint'}]}
  ],
  win: {type: 'state', target: 'score', key: 'n', min: 5},
  onWin: [{fx: 'pop', target: 'score'}]
});
