// FASE 237 — REPITA O CAMINHO · a luz passa por quatro botões; toque na mesma ordem.
RULES.registerLevel({
  id: 237, chapter: 24,
  instruction: 'LEVEL_237_TITLE',
  hints: ['LEVEL_237_HINT_1', 'LEVEL_237_HINT_2', 'LEVEL_237_HINT_3'],
  objects: [
    {id: 't0', type: 'button', x: 28, y: 48, w: 16, z: 2, props: {color: 'teal'}},
    {id: 't1', type: 'button', x: 50, y: 48, w: 16, z: 2, props: {color: 'teal'}},
    {id: 't2', type: 'button', x: 72, y: 48, w: 16, z: 2, props: {color: 'teal'}},
    {id: 't3', type: 'button', x: 28, y: 70, w: 16, z: 2, props: {color: 'teal'}},
    {id: 't4', type: 'button', x: 50, y: 70, w: 16, z: 2, props: {color: 'teal'}},
    {id: 't5', type: 'button', x: 72, y: 70, w: 16, z: 2, props: {color: 'teal'}},
    {id: 't6', type: 'button', x: 28, y: 92, w: 16, z: 2, props: {color: 'teal'}},
    {id: 't7', type: 'button', x: 50, y: 92, w: 16, z: 2, props: {color: 'teal'}},
    {id: 't8', type: 'button', x: 72, y: 92, w: 16, z: 2, props: {color: 'teal'}},
    {id: 'sim', type: 'marker', x: 0, y: 0, w: 1, passive: true, behaviors: {simon: {seq: ['t0', 't4', 't5', 't8'], show: 520, delay: 900}}}
  ],
  win: {type: 'state', target: 'sim', key: 'done'},
  onWin: [{fx: 'pop', target: 't0'}, {fx: 'pop', target: 't1'}, {fx: 'pop', target: 't2'}, {fx: 'pop', target: 't3'}, {fx: 'pop', target: 't4'}, {fx: 'pop', target: 't5'}, {fx: 'pop', target: 't6'}, {fx: 'pop', target: 't7'}, {fx: 'pop', target: 't8'}]
});
