// FASE 149 — PINTE O RULI DE VERDE · misture azul com amarelo na paleta.
RULES.registerLevel({
  id: 149, chapter: 15,
  instruction: 'LEVEL_149_TITLE',
  hints: ['LEVEL_149_HINT_1', 'LEVEL_149_HINT_2', 'LEVEL_149_HINT_3'],
  objects: [
    {id: 'ruli', type: 'ruli', x: 50, y: 50, w: 18, h: 20, z: 3, behaviors: {receives: {from: ['pal', 'pb', 'py', 'pr'], copyColor: true, returnTool: true}}},
    {id: 'pal', type: 'palette', x: 50, y: 84, w: 26, h: 21, z: 4, behaviors: {draggable: {}, palette: {from: ['pb', 'py', 'pr']}}},
    {id: 'pr', type: 'bucket', x: 18, y: 104, w: 12, h: 13.5, z: 6, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'py', type: 'bucket', x: 50, y: 108, w: 12, h: 13.5, z: 6, props: {color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'pb', type: 'bucket', x: 82, y: 104, w: 12, h: 13.5, z: 6, props: {color: 'blue'}, behaviors: {draggable: {}}}
  ],
  reactions: [
    {on: 'used', target: 'ruli', unless: {type: 'state', target: 'ruli', key: 'color', equals: 'green'}, cooldown: 600, 'do': [{expr: 'confused', target: 'ruli'}, {fail: 'FB_NOT_GREEN_YET'}]}
  ],
  win: {type: 'state', target: 'ruli', key: 'color', equals: 'green'},
  onWin: [{expr: 'happy', target: 'ruli'}, {fx: 'hop', target: 'ruli'}]
});
