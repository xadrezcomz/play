// Ordem jogável e capítulos. Para lançar mais fases, crie o arquivo
// LevelNNN.js, carregue-o no index.html e acrescente o id aqui.
(function () {
  'use strict';
  var R = window.RULES;

  // MVP 0.1: as dez fases que testam tap, drag, escala, texto, espera e interpretação.
  R.LEVEL_ORDER = [1, 2, 3, 5, 9, 10, 11, 12, 16, 20];

  R.CHAPTERS = [
    { id: 1, title: 'CHAPTER_1', theme: 'ch1' },
    { id: 2, title: 'CHAPTER_2', theme: 'ch2' },
    { id: 3, title: 'CHAPTER_3', theme: 'ch3' },
    { id: 4, title: 'CHAPTER_4', theme: 'ch4' },
    { id: 5, title: 'CHAPTER_5', theme: 'ch5' }
  ];
})();
