// FASE 74 — COLOQUE A BOLA NA CESTA · a cesta é alta demais; jogue a pedra na gangorra.
RULES.registerLevel({
  id: 74, chapter: 8,
  instruction: 'LEVEL_074_TITLE',
  hints: ['LEVEL_074_HINT_1', 'LEVEL_074_HINT_2', 'LEVEL_074_HINT_3'],
  objects: [
    { id: 'ground', type: 'platform', x: 50, y: 112, w: 100, h: 16, z: 1, passive: true },
    { id: 'basket', type: 'basket', x: 80, y: 22, w: 20, h: 14, z: 3, passive: true },
    { id: 'seesaw', type: 'seesaw', x: 36, y: 98, w: 48, h: 19, z: 2, passive: true },
    { id: 'rend', type: 'marker', x: 56, y: 92, w: 14, h: 14, z: 1,
      behaviors: { receives: { from: ['rock'], set: { launched: true } } } },
    { id: 'ball', type: 'ball', x: 17, y: 89, w: 9, z: 4, props: { color: 'coral' }, behaviors: { draggable: { minY: 70 } } },
    { id: 'rock', type: 'rock', x: 84, y: 98, w: 14, h: 10, z: 5, behaviors: { draggable: {} } }
  ],
  reactions: [
    { on: 'drop', target: 'ball', cooldown: 700, do: [{ say: 'FB_TOO_HIGH' }] }
  ],
  win: { type: 'state', target: 'rend', key: 'launched' },
  onWin: [
    { move: 'rock', to: [56, 89], ms: 120, await: true },
    { move: 'ball', to: [52, -6], ms: 380, ease: 'cubic-bezier(.2,.7,.4,1)', z: 900, await: true },
    { move: 'ball', to: [80, 20], ms: 300, ease: 'cubic-bezier(.6,0,.9,.6)', await: true },
    { fx: 'pop', target: 'basket' }
  ]
});
