// FASE 207 — LEVE O SUCO ATÉ A MESA · devagar, senão derrama.
RULES.registerLevel({
  id: 207, chapter: 21,
  instruction: 'LEVEL_207_TITLE',
  hints: ['LEVEL_207_HINT_1', 'LEVEL_207_HINT_2', 'LEVEL_207_HINT_3'],
  objects: [
    {id: 'table', type: 'outline', x: 78, y: 60, w: 30, h: 22, z: 1, passive: true, props: {color: 'wood'}},
    {id: 'tray', type: 'tray', x: 24, y: 100, w: 30, h: 5, z: 3, behaviors: {draggable: {}, carries: {ids: ['g1', 'g2']}, fragile: {max: 0.07}}},
    {id: 'g1', type: 'glass', x: 18, y: 92, w: 8, h: 13, z: 4, passive: true},
    {id: 'g2', type: 'glass', x: 30, y: 92, w: 8, h: 13, z: 4, passive: true, props: {color: 'coral'}}
  ],
  reactions: [
    {on: 'spill', target: 'tray', 'do': [{fail: 'FB_SLOWLY'}, {reset: 'tray'}, {reset: 'g1'}, {reset: 'g2'}]}
  ],
  win: {type: 'inside', objects: ['tray'], container: 'table'},
  onWin: [{fx: 'pop', target: 'g1'}, {fx: 'pop', target: 'g2'}]
});
