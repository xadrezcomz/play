// FASE 158 — ABRA A PORTA · a chave já está na fechadura: gire a chave.
RULES.registerLevel({
  id: 158, chapter: 16,
  instruction: 'LEVEL_158_TITLE',
  hints: ['LEVEL_158_HINT_1', 'LEVEL_158_HINT_2', 'LEVEL_158_HINT_3'],
  objects: [
    {id: 'doorway', type: 'doorway', x: 50, y: 72, w: 30, h: 54, z: 1, passive: true},
    {id: 'door', type: 'door', x: 50, y: 72, w: 28, h: 52, z: 2, passive: true},
    {id: 'key', type: 'key', x: 58, y: 72, w: 20, h: 10, z: 4, behaviors: {rotatable: {snap: 90}}}
  ],
  reactions: [
    {on: 'tap', target: 'key', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_KEY_STUCK'}]}
  ],
  win: {type: 'any', of: [{type: 'state', target: 'key', key: 'angle', equals: 90}, {type: 'state', target: 'key', key: 'angle', equals: 270}]},
  onWin: [{hide: 'key'}, {move: 'door', by: [-26, 0], ms: 400}]
});
