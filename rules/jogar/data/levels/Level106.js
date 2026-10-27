// FASE 106 — DEIXE SÓ OS PARES · os ímpares vão para o lixo, inclusive o 1 do "FASE 106".
RULES.registerLevel({
  id: 106, chapter: 11,
  instruction: 'LEVEL_106_TITLE',
  label: 'LEVEL_106_LABEL',        // "FASE [[d1|1]]06"
  hints: ['LEVEL_106_HINT_1', 'LEVEL_106_HINT_2', 'LEVEL_106_HINT_3'],
  objects: [
    { id: 'd1', inLabel: true, behaviors: { draggable: {} } },
    { id: 't2', type: 'number', x: 18, y: 40, w: 15, z: 3, props: { n: 2 }, behaviors: { draggable: {} } },
    { id: 't3', type: 'number', x: 40, y: 34, w: 15, z: 3, props: { n: 3 }, behaviors: { draggable: {} } },
    { id: 't4', type: 'number', x: 62, y: 40, w: 15, z: 3, props: { n: 4 }, behaviors: { draggable: {} } },
    { id: 't5', type: 'number', x: 84, y: 34, w: 15, z: 3, props: { n: 5 }, behaviors: { draggable: {} } },
    { id: 't8', type: 'number', x: 30, y: 62, w: 15, z: 3, props: { n: 8 }, behaviors: { draggable: {} } },
    { id: 't7', type: 'number', x: 70, y: 62, w: 15, z: 3, props: { n: 7 }, behaviors: { draggable: {} } },
    { id: 'bin', type: 'bin', x: 50, y: 98, w: 24, h: 30, z: 2, behaviors: { container: {} } }
  ],
  triggers: [
    { when: { type: 'inside', objects: ['t3', 't5', 't7'], container: 'bin' }, do: [{ wait: 400 }, { fail: 'FB_ONE_LEFT' }] }
  ],
  reactions: [
    { on: 'contained', target: 't2', do: [{ reset: 't2' }, { say: 'FB_EVEN' }] },
    { on: 'contained', target: 't4', do: [{ reset: 't4' }, { say: 'FB_EVEN' }] },
    { on: 'contained', target: 't8', do: [{ reset: 't8' }, { say: 'FB_EVEN' }] }
  ],
  win: { type: 'inside', objects: ['t3', 't5', 't7', 'd1'], container: 'bin' },
  onWin: [{ fx: 'squash', target: 'bin' }]
});
