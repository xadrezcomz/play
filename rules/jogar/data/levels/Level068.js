// FASE 68 — TROQUE O DIA PELA NOITE · leve a palavra NOITE até o sol.
RULES.registerLevel({
  id: 68, chapter: 7,
  instruction: 'LEVEL_068_TITLE',   // contém [[w_day|DIA]] e [[w_night|NOITE]]
  hints: ['LEVEL_068_HINT_1', 'LEVEL_068_HINT_2', 'LEVEL_068_HINT_3'],
  objects: [
    { id: 'w_day', inText: true, behaviors: { draggable: { returnOnDrop: true } } },
    { id: 'w_night', inText: true, behaviors: { draggable: {} } },
    { id: 'sky', type: 'sky', x: 50, y: 56, w: 92, h: 76, z: 1, passive: true },
    { id: 'sun', type: 'sun', x: 50, y: 48, w: 26, z: 3,
      behaviors: { receives: { from: ['w_night'], set: { gone: true }, consume: true } } },
    { id: 'moon', type: 'moon', x: 50, y: 48, w: 20, z: 3, hidden: true, passive: true }
  ],
  reactions: [
    { on: 'drop', target: 'w_day', cooldown: 700, do: [{ say: 'FB_ALREADY_DAY' }] },
    { on: 'tap', target: 'sun', cooldown: 600, do: [{ fx: 'wobble' }, { sound: 'tap' }] }
  ],
  win: { type: 'state', target: 'sun', key: 'gone' },
  onWin: [{ state: 'sky', key: 'night', value: true }, { hide: 'sun' }, { show: 'moon' }]
});
