// FASE 212 — ABRA A PORTA · a sombra na porta mostra qual chave serve (a azul, maior).
RULES.registerLevel({
  id: 212, chapter: 22,
  instruction: 'LEVEL_212_TITLE',
  hints: ['LEVEL_212_HINT_1', 'LEVEL_212_HINT_2', 'LEVEL_212_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'doorway', type: 'doorway', x: 76, y: 74, w: 26, h: 52, z: 1, passive: true},
    {id: 'door', type: 'door', x: 76, y: 74, w: 24, h: 50, z: 2, passive: true},
    {id: 'hint', type: 'key', x: 76, y: 66, w: 15, h: 7.5, z: 3, passive: true, cls: 'silhouette'},
    {id: 'k1', type: 'key', x: 22, y: 100, w: 11, h: 5.5, z: 4, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'k2', type: 'key', x: 44, y: 100, w: 11, h: 5.5, z: 4, props: {color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'k3', type: 'key', x: 66, y: 100, w: 15, h: 7.5, z: 4, props: {color: 'blue'}, behaviors: {draggable: {}}},
    {id: 'lock', type: 'marker', x: 76, y: 70, w: 18, h: 20, z: 0, passive: true, behaviors: {receives: {from: ['k3'], consume: true, set: {open: true}}, 'receives#2': {from: ['k1', 'k2'], returnTool: true, set: {}}}}
  ],
  reactions: [
    {on: 'used', target: 'lock', unless: {type: 'state', target: 'lock', key: 'open'}, cooldown: 500, 'do': [{fail: 'FB_WRONG_KEY'}]}
  ],
  win: {type: 'state', target: 'lock', key: 'open'},
  onWin: [{move: 'door', by: [-16, 0], ms: 400}]
});
