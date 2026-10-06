// FASE 12 — CHEGUE À PORTA · um buraco no caminho; traga a porta até Ruli.
RULES.registerLevel({
  id: 12, chapter: 2,
  instruction: 'LEVEL_012_TITLE',
  hints: ['LEVEL_012_HINT_1', 'LEVEL_012_HINT_2', 'LEVEL_012_HINT_3'],
  mascot: false,
  objects: [
    { id: 'groundL', type: 'platform', x: 19, y: 108, w: 38, h: 24, z: 3, passive: true },
    { id: 'groundR', type: 'platform', x: 81, y: 108, w: 38, h: 24, z: 3, passive: true },
    { id: 'hole', type: 'hole', x: 50, y: 108, w: 24, h: 24, z: 1, passive: true,
      hitbox: { x: 50, y: 80, w: 24, h: 60 } },
    { id: 'door', type: 'door', x: 84, y: 79, w: 17, h: 34, z: 6, props: { color: 'purple' },
      behaviors: { draggable: {} } },
    { id: 'ruli', type: 'ruli', x: 16, y: 85, w: 17, h: 19, z: 8,
      behaviors: { draggable: { axis: 'x', minX: 6 }, fallsInto: { zones: ['hole'] }, character: {} } }
  ],
  reactions: [
    { on: 'fell', do: [{ fail: 'FB_OOPS' }] },
    { on: 'tap', target: 'door', do: [{ fx: 'shake' }, { sound: 'click' }] }
  ],
  win: { type: 'touching', a: 'door', b: 'ruli' },
  onWin: [
    { expr: 'happy', target: 'ruli' },
    { move: 'ruli', toObj: 'door', offset: [0, 6], ms: 320, z: 900, await: true },
    { fx: 'enter', target: 'ruli' }
  ]
});
