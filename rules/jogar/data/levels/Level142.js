// FASE 142 — PINTE O CÍRCULO DE LARANJA · não há laranja: junte o vermelho com o amarelo.
RULES.registerLevel({
  id: 142, chapter: 15,
  instruction: 'LEVEL_142_TITLE',
  hints: ['LEVEL_142_HINT_1', 'LEVEL_142_HINT_2', 'LEVEL_142_HINT_3'],
  objects: [
    {id: 'c', type: 'circle', x: 50, y: 50, w: 30, z: 2, props: {color: '#E9E4DA'}, behaviors: {receives: {from: ['orange'], copyColor: true, consume: true}, 'receives#2': {from: ['red', 'yellow', 'blue'], copyColor: true, returnTool: true}}},
    {id: 'orange', type: 'drop', x: 50, y: 94, w: 12, h: 15.96, z: 5, props: {color: 'orange'}, behaviors: {draggable: {}}, hidden: true},
    {id: 'red', type: 'drop', x: 22, y: 96, w: 10, h: 13.3, z: 5, props: {color: 'coral'}, behaviors: {draggable: {}, merge: {'with': ['yellow'], into: 'orange'}}},
    {id: 'yellow', type: 'drop', x: 50, y: 96, w: 10, h: 13.3, z: 5, props: {color: 'yellow'}, behaviors: {draggable: {}, merge: {'with': ['red'], into: 'orange'}}},
    {id: 'blue', type: 'drop', x: 78, y: 96, w: 10, h: 13.3, z: 5, props: {color: 'blue'}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'used', target: 'c', unless: {type: 'state', target: 'c', key: 'color', equals: 'orange'}, cooldown: 500, 'do': [{fail: 'FB_NOT_ORANGE'}]}
  ],
  win: {type: 'state', target: 'c', key: 'color', equals: 'orange'},
  onWin: [{fx: 'pop', target: 'c'}]
});
