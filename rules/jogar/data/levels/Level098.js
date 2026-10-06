// FASE 98 — PINTE A FOLHA DE VERDE · não há verde: misture azul com amarelo.
RULES.registerLevel({
  id: 98, chapter: 10,
  instruction: 'LEVEL_098_TITLE',
  hints: ['LEVEL_098_HINT_1', 'LEVEL_098_HINT_2', 'LEVEL_098_HINT_3'],
  objects: [
    { id: 'leaf', type: 'leaf', x: 50, y: 44, w: 36, h: 25, z: 2,
      behaviors: {
        receives: { from: ['green'], copyColor: true, consume: true },
        'receives#2': { from: ['blue', 'yellow'], copyColor: true, returnTool: true }
      } },
    { id: 'green', type: 'drop', x: 50, y: 92, w: 14, h: 19, z: 4, hidden: true, props: { color: 'green' }, behaviors: { draggable: {} } },
    { id: 'blue', type: 'drop', x: 28, y: 94, w: 11, h: 15, z: 5, props: { color: 'blue' }, behaviors: { draggable: {}, merge: { 'with': ['yellow'], into: 'green' } } },
    { id: 'yellow', type: 'drop', x: 72, y: 94, w: 11, h: 15, z: 5, props: { color: 'yellow' }, behaviors: { draggable: {}, merge: { 'with': ['blue'], into: 'green' } } }
  ],
  reactions: [
    { on: 'used', target: 'leaf', unless: { type: 'state', target: 'leaf', key: 'color', equals: 'green' }, cooldown: 500, do: [{ fail: 'FB_NOT_GREEN_YET' }] }
  ],
  win: { type: 'state', target: 'leaf', key: 'color', equals: 'green' },
  onWin: [{ fx: 'pop', target: 'leaf' }]
});
