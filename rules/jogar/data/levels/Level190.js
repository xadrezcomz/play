// FASE 190 — CHEGUE À PORTA · a porta só existe no espelho: afaste o Ruli do espelho e o reflexo chega nela.
RULES.registerLevel({
  id: 190, chapter: 19,
  instruction: 'LEVEL_190_TITLE',
  hints: ['LEVEL_190_HINT_1', 'LEVEL_190_HINT_2', 'LEVEL_190_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 108, w: 100, h: 12, z: 1, passive: true},
    {id: 'glass', type: 'bar', x: 75, y: 72, w: 50, h: 60, z: 0, passive: true, props: {color: '#E3F2FF'}},
    {id: 'mirror', type: 'mirrorline', x: 50, y: 72, w: 3, h: 60, z: 3, passive: true},
    {id: 'door', type: 'door', x: 88, y: 88, w: 12, h: 24, z: 1, passive: true},
    {id: 'ruli', type: 'ruli', x: 34, y: 93, w: 12, h: 13.5, z: 5, behaviors: {draggable: {axis: 'x', minX: 6, maxX: 44}, character: {}}},
    {id: 'twin', type: 'ruli', x: 66, y: 93, w: 12, h: 13.5, z: 4, passive: true, cls: 'flipx', behaviors: {mirrorOf: {source: 'ruli', axis: 50}}}
  ],
  reactions: [
    {on: 'dragmove', target: 'ruli', when: {type: 'pos', target: 'ruli', minX: 43}, cooldown: 1500, 'do': [{say: 'FB_GLASS'}]}
  ],
  win: {type: 'touching', a: 'twin', b: 'door'},
  onWin: [{expr: 'happy', target: 'twin'}, {expr: 'happy', target: 'ruli'}, {fx: 'enter', target: 'twin'}]
});
