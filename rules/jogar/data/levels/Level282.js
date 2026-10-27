// FASE 282 — NÃO CONFIE NAS DICAS · as dicas mandam tocar na estrela, mas a última confessa: é o círculo.
RULES.registerLevel({
  id: 282, chapter: 29,
  instruction: 'LEVEL_282_TITLE',
  hints: ['LEVEL_282_HINT_1', 'LEVEL_282_HINT_2', 'LEVEL_282_HINT_3'],
  objects: [
    {id: 'star', type: 'star', x: 30, y: 66, w: 20, z: 2},
    {id: 'circle', type: 'circle', x: 70, y: 66, w: 18, z: 2, props: {color: 'teal'}}
  ],
  reactions: [
    {on: 'tap', target: 'star', cooldown: 500, 'do': [{fx: 'shake'}, {fail: 'FB_HINT_LIED'}]}
  ],
  win: {type: 'tapped', target: 'circle'},
  onWin: [{fx: 'pop', target: 'circle'}]
});
