// Ordem jogável e capítulos. Para lançar mais fases, crie o arquivo
// LevelNNN.js, carregue-o no index.html e acrescente o id aqui.
(function () {
  'use strict';
  var R = window.RULES;

  // Capítulos 1–3 completos (fases 1–30).
  R.LEVEL_ORDER = [];
  for (var i = 1; i <= 30; i++) R.LEVEL_ORDER.push(i);

  R.CHAPTERS = [
    { id: 1, title: 'CHAPTER_1', theme: 'ch1' },
    { id: 2, title: 'CHAPTER_2', theme: 'ch2' },
    { id: 3, title: 'CHAPTER_3', theme: 'ch3' },
    { id: 4, title: 'CHAPTER_4', theme: 'ch4' },
    { id: 5, title: 'CHAPTER_5', theme: 'ch5' }
  ];
})();
