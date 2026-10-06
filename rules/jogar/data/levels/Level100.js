// FASE 100 — ESTA É A ÚLTIMA FASE · tire a palavra ÚLTIMA da frase. (Quem disse que é a última?)
RULES.registerLevel({
  id: 100, chapter: 10,
  instruction: 'LEVEL_100_TITLE',   // "ESTA É A [[w_last|ÚLTIMA]] FASE"
  hints: ['LEVEL_100_HINT_1', 'LEVEL_100_HINT_2', 'LEVEL_100_HINT_3'],
  mascot: false,
  objects: [
    { id: 'w_last', inText: true, behaviors: { draggable: {} } },
    { id: 'floor', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
    { id: 'door', type: 'door', x: 70, y: 84, w: 18, h: 36, z: 3 },
    { id: 'sign', type: 'word', textKey: 'LEVEL_100_SIGN', fontU: 5, cls: 'sign', x: 70, y: 56, z: 4, passive: true },
    { id: 'ruli', type: 'ruli', x: 30, y: 95, w: 16, h: 18, z: 5, state: { expr: 'thinking' } }
  ],
  reactions: [
    { on: 'tap', target: 'ruli', cooldown: 600, do: [{ fx: 'hop' }, { say: 'FB_BYE' }] },
    { on: 'tap', target: 'door', cooldown: 600, do: [{ fx: 'shake' }, { fail: 'FB_THE_END' }] }
  ],
  win: { type: 'text', target: 'w_last', mode: 'outside' },
  onWin: [{ expr: 'happy', target: 'ruli' }, { move: 'ruli', toObj: 'door', offset: [0, 10], ms: 400, z: 900, await: true }, { fx: 'enter', target: 'ruli' }]
});
