// FASE 155 — ENCONTRE A ESTRELA · está na última página do livro; deslize para virar as páginas.
RULES.registerLevel({
  id: 155, chapter: 16,
  instruction: 'LEVEL_155_TITLE',
  hints: ['LEVEL_155_HINT_1', 'LEVEL_155_HINT_2', 'LEVEL_155_HINT_3'],
  objects: [
    {id: 'book', type: 'book', x: 50, y: 66, w: 76, h: 51, z: 2, state: {page: 1}},
    {id: 'a1', type: 'circle', x: 34, y: 62, w: 14, z: 3, passive: true, props: {color: 'coral'}},
    {id: 'a2', type: 'triangle', x: 66, y: 62, w: 14, h: 13, z: 3, passive: true, hidden: true},
    {id: 'star', type: 'star', x: 66, y: 62, w: 15, z: 3, hidden: true}
  ],
  reactions: [
    {on: 'tap', target: 'book', cooldown: 700, 'do': [{fx: 'wobble'}, {say: 'FB_HMM'}]},
    {on: 'swipe', target: 'book', dir: 'left', when: {type: 'state', target: 'book', key: 'page', equals: 1}, 'do': [{hide: 'a1'}, {state: 'book', key: 'page', value: 2}, {show: 'a2'}, {sound: 'whoosh'}]},
    {on: 'swipe', target: 'book', dir: 'left', when: {type: 'state', target: 'book', key: 'page', equals: 2}, 'do': [{hide: 'a2'}, {state: 'book', key: 'page', value: 3}, {show: 'star'}, {sound: 'whoosh'}]}
  ],
  win: {type: 'tapped', target: 'star'},
  onWin: [{fx: 'pop', target: 'star'}]
});
