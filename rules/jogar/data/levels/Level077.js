// FASE 77 — FAÇA A BOLA ROLAR ATÉ O BURACO · gire a rampa para ela descer.
RULES.registerLevel({
  id: 77, chapter: 8,
  instruction: 'LEVEL_077_TITLE',
  hints: ['LEVEL_077_HINT_1', 'LEVEL_077_HINT_2', 'LEVEL_077_HINT_3'],
  objects: [
    { id: 'groundL', type: 'platform', x: 14, y: 108, w: 28, h: 24, z: 1, passive: true },
    { id: 'groundR', type: 'platform', x: 70, y: 108, w: 60, h: 24, z: 1, passive: true },
    { id: 'hole', type: 'hole', x: 86, y: 100, w: 12, h: 8, z: 2, passive: true },
    { id: 'ledge', type: 'plank', x: 14, y: 60, w: 18, h: 4, z: 2, passive: true },
    { id: 'ball', type: 'ball', x: 14, y: 54, w: 8, z: 5, props: { color: 'coral' } },
    { id: 'ramp', type: 'plank', x: 48, y: 70, w: 50, h: 4, z: 3, rot: -20, props: { color: '#9C6A43' },
      behaviors: { rotatable: { snap: 10 } } }
  ],
  reactions: [
    { on: 'tap', target: 'ball', cooldown: 600, do: [{ fx: 'hop' }, { say: 'FB_NEEDS_SLOPE' }] }
  ],
  win: { type: 'state', target: 'ramp', key: 'angle', min: 10, max: 40 },
  onWin: [
    { move: 'ball', to: [26, 58], ms: 180, await: true },
    { move: 'ball', to: [70, 80], ms: 450, ease: 'cubic-bezier(.5,0,1,1)', await: true },
    { move: 'ball', to: [86, 98], ms: 260, await: true },
    { fx: 'pop', target: 'hole' }
  ]
});
