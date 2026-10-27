// FASE 167 — REPITA AO CONTRÁRIO · as luzes piscam numa ordem; toque de trás para frente.
RULES.registerLevel({
  id: 167, chapter: 17,
  instruction: 'LEVEL_167_TITLE',
  hints: ['LEVEL_167_HINT_1', 'LEVEL_167_HINT_2', 'LEVEL_167_HINT_3'],
  objects: [
    {id: 'l1', type: 'button', x: 28, y: 52, w: 22, z: 2, props: {color: 'coral'}},
    {id: 'l2', type: 'button', x: 72, y: 52, w: 22, z: 2, props: {color: 'yellow'}},
    {id: 'l3', type: 'button', x: 28, y: 88, w: 22, z: 2, props: {color: 'blue'}},
    {id: 'l4', type: 'button', x: 72, y: 88, w: 22, z: 2, props: {color: 'green'}},
    {id: 'sim', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {simon: {seq: ['l1', 'l4', 'l2'], answer: ['l2', 'l4', 'l1'], show: 600, delay: 900}}}
  ],
  win: {type: 'state', target: 'sim', key: 'done'},
  onWin: [{fx: 'pop', target: 'l1'}, {fx: 'pop', target: 'l2'}, {fx: 'pop', target: 'l3'}, {fx: 'pop', target: 'l4'}]
});
