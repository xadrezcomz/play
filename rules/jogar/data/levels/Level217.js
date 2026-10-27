// FASE 217 — ENTRE NA LOJA · a porta automática só vê quem é alto: aumente o Ruli.
RULES.registerLevel({
  id: 217, chapter: 22,
  instruction: 'LEVEL_217_TITLE',
  hints: ['LEVEL_217_HINT_1', 'LEVEL_217_HINT_2', 'LEVEL_217_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'doorway', type: 'doorway', x: 72, y: 78, w: 26, h: 54, z: 1, passive: true},
    {id: 'door', type: 'door', x: 72, y: 78, w: 24, h: 52, z: 2, passive: true},
    {id: 'sensor', type: 'sensor', x: 72, y: 46, w: 10, h: 5, z: 3, passive: true},
    {id: 'ruli', type: 'ruli', x: 46, y: 96, w: 10, h: 11.2, z: 4, behaviors: {draggable: {axis: 'x', minX: 8, maxX: 58}, scalable: {anchor: 'bottom', min: 0.8, max: 4.4}, character: {}}}
  ],
  reactions: [
    {on: 'tap', target: 'door', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_TOO_SHORT'}]},
    {on: 'dragmove', target: 'ruli', when: {type: 'pos', target: 'ruli', minX: 52}, unless: {type: 'scale', target: 'ruli', min: 2.4}, cooldown: 1500, 'do': [{say: 'FB_TOO_SHORT'}]}
  ],
  win: [{type: 'scale', target: 'ruli', min: 2.4}, {type: 'pos', target: 'ruli', minX: 48}],
  onWin: [{state: 'sensor', key: 'on', value: true}, {move: 'door', by: [-20, 0], ms: 400}, {expr: 'happy', target: 'ruli'}]
});
