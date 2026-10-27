// FASE 183 — QUE HORAS SÃO DE VERDADE? · o relógio está no espelho: ele mostra 3, mas são 9.
RULES.registerLevel({
  id: 183, chapter: 19,
  instruction: 'LEVEL_183_TITLE',
  hints: ['LEVEL_183_HINT_1', 'LEVEL_183_HINT_2', 'LEVEL_183_HINT_3'],
  objects: [
    {id: 'frame', type: 'bar', x: 50, y: 56, w: 58, h: 54, z: 1, passive: true, props: {color: '#BDE3FF'}},
    {id: 'clock', type: 'clock', x: 50, y: 56, w: 44, z: 2, passive: true, cls: 'flipx', props: {numbers: true}},
    {id: 'hm', type: 'hand', x: 50, y: 56, w: 44, z: 3, passive: true, props: {len: 36, width: 4}},
    {id: 'hh', type: 'hand', x: 50, y: 56, w: 44, z: 3, passive: true, rot: 90, props: {len: 24, width: 7, color: 'coral'}},
    {id: 'o3', type: 'word', textKey: 'LEVEL_183_A', fontU: 7, x: 22, y: 102, z: 3, cls: 'card'},
    {id: 'o9', type: 'word', textKey: 'LEVEL_183_B', fontU: 7, x: 50, y: 102, z: 3, cls: 'card'},
    {id: 'o6', type: 'word', textKey: 'LEVEL_183_C', fontU: 7, x: 78, y: 102, z: 3, cls: 'card'}
  ],
  reactions: [
    {on: 'tap', target: 'o3', 'do': [{fx: 'shake'}, {fail: 'FB_MIRROR'}]},
    {on: 'tap', target: 'o6', 'do': [{fx: 'shake'}, {fail: 'FB_HMM'}]}
  ],
  win: {type: 'tapped', target: 'o9'},
  onWin: [{fx: 'pop', target: 'o9'}]
});
