// FASE 20 — ESPERE. · 5 segundos sem tocar; tocar reinicia a contagem.
RULES.registerLevel({
  id: 20, chapter: 2,
  instruction: 'LEVEL_020_TITLE',
  hints: ['LEVEL_020_HINT_1', 'LEVEL_020_HINT_2', 'LEVEL_020_HINT_3'],
  objects: [],
  reactions: [
    { on: 'input', cooldown: 900, do: [{ fail: 'FB_AGAIN' }] }
  ],
  win: { type: 'idle', seconds: 5 }
});
