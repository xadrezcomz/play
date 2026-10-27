// FASE 250 — LEVE A TORRE PARA O ÚLTIMO PINO · um disco por vez e nunca um grande em cima de um pequeno.
RULES.registerLevel({
  id: 250, chapter: 25,
  instruction: 'LEVEL_250_TITLE',
  hints: ['LEVEL_250_HINT_1', 'LEVEL_250_HINT_2', 'LEVEL_250_HINT_3'],
  objects: [
    {id: 'base', type: 'plank', x: 50, y: 98, w: 92, h: 5, z: 1, passive: true},
    {id: 'p1', type: 'stick', x: 20, y: 80, w: 2.5, h: 32, z: 1, passive: true, props: {color: 'wood'}},
    {id: 'p2', type: 'stick', x: 50, y: 80, w: 2.5, h: 32, z: 1, passive: true, props: {color: 'wood'}},
    {id: 'p3', type: 'stick', x: 80, y: 80, w: 2.5, h: 32, z: 1, passive: true, props: {color: 'wood'}},
    {id: 'd1', type: 'disc', x: 20, y: 90, w: 14, h: 6, z: 5, props: {color: 'yellow'}, behaviors: {draggable: {}}},
    {id: 'd2', type: 'disc', x: 20, y: 90, w: 22, h: 6, z: 5, props: {color: 'teal'}, behaviors: {draggable: {}}},
    {id: 'd3', type: 'disc', x: 20, y: 90, w: 30, h: 6, z: 5, props: {color: 'coral'}, behaviors: {draggable: {}}},
    {id: 'ctl', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {hanoi: {pegs: ['p1', 'p2', 'p3'], discs: ['d1', 'd2', 'd3'], base: 95.5, h: 6}}}
  ],
  reactions: [
    {on: 'hanoiblocked', cooldown: 800, 'do': [{say: 'FB_TOP_ONLY'}]}
  ],
  win: {type: 'state', target: 'ctl', key: 'done'},
  onWin: [{fx: 'pop', target: 'd1'}, {fx: 'pop', target: 'd2'}, {fx: 'pop', target: 'd3'}]
});
