// FASE 97 — DEIXE TODOS IGUAIS · mesma cor e mesmo tamanho.
(function () {
  var paint = { from: ['pc', 'pb', 'py'], copyColor: true, returnTool: true };
  RULES.registerLevel({
    id: 97, chapter: 10,
    instruction: 'LEVEL_097_TITLE',
    hints: ['LEVEL_097_HINT_1', 'LEVEL_097_HINT_2', 'LEVEL_097_HINT_3'],
    objects: [
      { id: 'c1', type: 'circle', x: 22, y: 50, w: 12, z: 3, state: { color: 'coral' }, behaviors: { scalable: { min: 0.4, max: 3 }, receives: paint } },
      { id: 'c2', type: 'circle', x: 50, y: 50, w: 20, z: 3, state: { color: 'blue' }, behaviors: { scalable: { min: 0.4, max: 2 }, receives: paint } },
      { id: 'c3', type: 'circle', x: 78, y: 50, w: 28, z: 3, state: { color: 'yellow' }, behaviors: { scalable: { min: 0.3, max: 1.5 }, receives: paint } },
      { id: 'pc', type: 'bucket', x: 26, y: 98, w: 13, h: 15, z: 5, props: { color: 'coral' }, behaviors: { draggable: {} } },
      { id: 'pb', type: 'bucket', x: 50, y: 98, w: 13, h: 15, z: 5, props: { color: 'blue' }, behaviors: { draggable: {} } },
      { id: 'py', type: 'bucket', x: 74, y: 98, w: 13, h: 15, z: 5, props: { color: 'yellow' }, behaviors: { draggable: {} } }
    ],
    triggers: [
      { when: { type: 'same', ids: ['c1', 'c2', 'c3'], key: 'color' }, do: [{ wait: 300 }, { fail: 'FB_ALMOST' }] }
    ],
    win: { type: 'same', ids: ['c1', 'c2', 'c3'], key: 'color', scaleTol: 0.15 },
    onWin: [{ fx: 'pop', target: 'c1' }, { fx: 'pop', target: 'c2' }, { fx: 'pop', target: 'c3' }]
  });
})();
