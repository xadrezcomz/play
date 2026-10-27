// FASE 151 — ENCHA O BALÃO · segure a bomba de ar apertada.
RULES.registerLevel({
  id: 151, chapter: 16,
  instruction: 'LEVEL_151_TITLE',
  hints: ['LEVEL_151_HINT_1', 'LEVEL_151_HINT_2', 'LEVEL_151_HINT_3'],
  objects: [
    {id: 'balloon', type: 'balloon', x: 50, y: 58, w: 22, h: 40, scale: 0.35, z: 3, passive: true, behaviors: {scalable: {anchor: 'bottom', min: 0.3, max: 1.2}}},
    {id: 'pump', type: 'button', x: 50, y: 98, w: 22, z: 4, props: {color: 'teal'}, behaviors: {holdable: {ms: 1300}}}
  ],
  reactions: [
    {on: 'tap', target: 'pump', cooldown: 500, 'do': [{fx: 'squash'}, {fx: 'wiggle', target: 'balloon'}, {say: 'FB_JUST_A_PUFF'}]},
    {on: 'hold', target: 'pump', 'do': [{state: 'pump', key: 'pressed', value: true}, {grow: 'balloon', to: 1, ms: 700, await: true}, {state: 'balloon', key: 'full', value: true}]}
  ],
  win: {type: 'state', target: 'balloon', key: 'full'},
  onWin: [{fx: 'pop', target: 'balloon'}]
});
