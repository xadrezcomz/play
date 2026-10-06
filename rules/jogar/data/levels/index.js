// Ordem jogável e capítulos. Para lançar mais fases, crie o arquivo
// LevelNNN.js, carregue-o no index.html e acrescente o id aqui.
(function () {
  'use strict';
  var R = window.RULES;
  R.LAST_LEVEL = 50;

  // Todas as fases que existem, na ordem (1, 2, 3...).
  R.LEVEL_ORDER = [];
  for (var i = 1; i <= R.LAST_LEVEL; i++) R.LEVEL_ORDER.push(i);

  R.CHAPTERS = [
    { id: 1, title: 'CHAPTER_1', theme: 'ch1' },
    { id: 2, title: 'CHAPTER_2', theme: 'ch2' },
    { id: 3, title: 'CHAPTER_3', theme: 'ch3' },
    { id: 4, title: 'CHAPTER_4', theme: 'ch4' },
    { id: 5, title: 'CHAPTER_5', theme: 'ch5' },
    { id: 6, title: 'CHAPTER_6', theme: 'ch1' },
    { id: 7, title: 'CHAPTER_7', theme: 'ch2' },
    { id: 8, title: 'CHAPTER_8', theme: 'ch3' },
    { id: 9, title: 'CHAPTER_9', theme: 'ch4' },
    { id: 10, title: 'CHAPTER_10', theme: 'ch5' }
  ];
})();
