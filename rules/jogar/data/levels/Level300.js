// FASE 300 — ABRA A ÚLTIMA PORTA · três cadeados: a palavra CHAVE da frase, uma chave pequena o bastante e, por fim, espere.
RULES.registerLevel({
  id: 300, chapter: 30,
  instruction: 'LEVEL_300_TITLE',
  hints: ['LEVEL_300_HINT_1', 'LEVEL_300_HINT_2', 'LEVEL_300_HINT_3'],
  objects: [
    {id: 'floor', type: 'platform', x: 50, y: 110, w: 100, h: 12, z: 0, passive: true},
    {id: 'doorway', type: 'doorway', x: 56, y: 74, w: 30, h: 60, z: 1, passive: true},
    {id: 'door', type: 'door', x: 56, y: 74, w: 28, h: 58, z: 2, passive: true, props: {color: 'purple'}},
    {id: 'w_key', inText: true, behaviors: {draggable: {}}},
    {id: 'l1', type: 'lock', x: 56, y: 56, w: 9, h: 11, z: 3, passive: true, behaviors: {receives: {from: ['w_key'], consume: true, set: {open: true}}}},
    {id: 'l2', type: 'lock', x: 56, y: 74, w: 9, h: 11, z: 3, passive: true},
    {id: 'hole2', type: 'circle', x: 56, y: 76, w: 2.4, z: 4, passive: true, props: {color: 'ink'}},
    {id: 'l3', type: 'lock', x: 56, y: 92, w: 9, h: 11, z: 3, passive: true},
    {id: 'key', type: 'key', x: 22, y: 64, w: 18, h: 9, z: 5, behaviors: {draggable: {}, scalable: {min: 0.3, max: 1.2}}},
    {id: 'ruli', type: 'ruli', x: 26, y: 98, w: 12, h: 13.5, z: 5, state: {expr: 'thinking'}},
    {id: 'f1', type: 'ruli', x: 16, y: 98, w: 11, h: 12.3, z: 4, hidden: true, props: {color: 'pink'}},
    {id: 'f2', type: 'ruli', x: 30, y: 98, w: 11, h: 12.3, z: 4, hidden: true, props: {color: 'yellow'}},
    {id: 'f3', type: 'ruli', x: 84, y: 98, w: 11, h: 12.3, z: 4, hidden: true, props: {color: 'purple'}}
  ],
  reactions: [
    {on: 'drop', target: 'key', when: {type: 'touching', a: 'key', b: 'l2'}, unless: {type: 'scale', target: 'key', max: 0.55}, cooldown: 700, 'do': [{reset: 'key'}, {fx: 'shake', target: 'l2'}, {fail: 'FB_KEY_TOO_BIG'}]},
    {on: 'drop', target: 'key', when: [{type: 'touching', a: 'key', b: 'l2'}, {type: 'scale', target: 'key', max: 0.55}], 'do': [{hide: 'key'}, {state: 'l2', key: 'open', value: true}, {sound: 'click'}]},
    {on: 'tap', target: 'door', cooldown: 700, 'do': [{fx: 'shake'}, {say: 'FB_LOCKED'}]}
  ],
  triggers: [
    {when: [{type: 'state', target: 'l1', key: 'open'}, {type: 'state', target: 'l2', key: 'open'}], 'do': [{say: 'FB_NOW_WAIT'}]},
    {when: [{type: 'state', target: 'l1', key: 'open'}, {type: 'state', target: 'l2', key: 'open'}, {type: 'idle', seconds: 3}], 'do': [{state: 'l3', key: 'open', value: true}, {sound: 'click'}]}
  ],
  win: [{type: 'state', target: 'l1', key: 'open'}, {type: 'state', target: 'l2', key: 'open'}, {type: 'state', target: 'l3', key: 'open'}],
  onWin: [{hide: 'l1'}, {hide: 'l2'}, {hide: 'l3'}, {hide: 'hole2'}, {move: 'door', by: [-26, 0], ms: 600, await: true}, {show: 'f1'}, {show: 'f2'}, {show: 'f3'}, {expr: 'happy', target: 'ruli'}, {expr: 'happy', target: 'f1'}, {expr: 'happy', target: 'f2'}, {expr: 'happy', target: 'f3'}, {fx: 'hop', target: 'f1'}, {fx: 'hop', target: 'f3'}, {move: 'ruli', toObj: 'doorway', offset: [0, 18], ms: 600, z: 900, await: true}, {fx: 'enter', target: 'ruli'}]
});
