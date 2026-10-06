// FASE 10 — NÃO TOQUE EM NADA · ensina WAIT: 3 segundos sem tocar.
RULES.registerLevel({
  id: 10, chapter: 1,
  instruction: 'LEVEL_010_TITLE',
  hints: ['LEVEL_010_HINT_1', 'LEVEL_010_HINT_2', 'LEVEL_010_HINT_3'],
  objects: [],
  reactions: [
    { on: 'input', cooldown: 900, do: [{ fail: 'FB_HMM' }] }
  ],
  win: { type: 'idle', seconds: 3 }
});
