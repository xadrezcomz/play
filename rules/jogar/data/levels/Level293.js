// FASE 293 — NÃO TOQUE EM NADA · nem no botão que pisca, nem na mosca.
RULES.registerLevel({
  id: 293, chapter: 30,
  instruction: 'LEVEL_293_TITLE',
  hints: ['LEVEL_293_HINT_1', 'LEVEL_293_HINT_2', 'LEVEL_293_HINT_3'],
  objects: [
    {id: 'btn', type: 'button', x: 50, y: 90, w: 26, z: 2, props: {color: 'coral'}, cls: 'breathe'},
    {id: 'tap', type: 'word', textKey: 'LEVEL_293_TAP', fontU: 5, x: 50, y: 74, z: 3, passive: true, cls: 'sign'},
    {id: 'fly', type: 'ant', x: 20, y: 40, w: 7, h: 4.2, z: 4, behaviors: {patrol: {points: [[20, 40], [70, 46], [80, 70], [30, 60]], ms: 900}}}
  ],
  reactions: [
    {on: 'tap', target: 'btn', 'do': [{fx: 'squash'}, {fail: 'FB_PRESSED'}]},
    {on: 'tap', target: 'fly', 'do': [{fail: 'FB_FLY_AWAY'}]}
  ],
  win: {type: 'idle', seconds: 5},
  onWin: [{mascot: 'happy'}]
});
