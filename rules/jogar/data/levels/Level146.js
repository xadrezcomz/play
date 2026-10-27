// FASE 146 — DEIXE O CÍRCULO BRANCO · não existe tinta branca: esfregue para limpar.
RULES.registerLevel({
  id: 146, chapter: 15,
  instruction: 'LEVEL_146_TITLE',
  hints: ['LEVEL_146_HINT_1', 'LEVEL_146_HINT_2', 'LEVEL_146_HINT_3'],
  objects: [
    {id: 'c', type: 'circle', x: 50, y: 54, w: 32, z: 2, props: {color: '#FFFFFF'}, state: {color: 'coral'}, behaviors: {rubbable: {count: 14, set: {color: null}}, receives: {from: ['p1', 'p2', 'p3'], copyColor: true, returnTool: true}}},
    {id: 'p1', type: 'bucket', x: 22, y: 100, w: 12, h: 13.5, z: 6, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'p2', type: 'bucket', x: 50, y: 100, w: 12, h: 13.5, z: 6, props: {color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'p3', type: 'bucket', x: 78, y: 100, w: 12, h: 13.5, z: 6, props: {color: 'blue'}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'used', target: 'c', cooldown: 600, 'do': [{fail: 'FB_NOT_WHITE'}]}
  ],
  win: {type: 'state', target: 'c', key: 'color', equals: null},
  onWin: [{fx: 'pop', target: 'c'}]
});
