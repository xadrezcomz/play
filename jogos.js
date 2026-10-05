// Lista de jogos da página inicial. Para colocar um jogo novo:
// 1. crie a pasta dele (com a página do jogo em <pasta>/jogar/index.html);
// 2. coloque a capa em img/ (1200×630);
// 3. acrescente um item aqui.
window.JOGOS = [
  {
    nome: 'Rock Orbit',
    desc: 'Pilote um foguete, colete cristais e deixe o seu rastro por 6 planetas. 50 fases, mais de 80 itens no Hangar e um mundo secreto.',
    capa: 'img/capa-rock-orbit.jpg',
    jogar: 'rock-orbit/jogar/',
    saiba: 'rock-orbit/',
    contagem: '/jogo/rock-orbit',
    selos: ['Arcade', 'Celular e computador', 'Português, inglês e espanhol']
  },
  {
    nome: 'Novo jogo',
    desc: 'Um projeto novo está em produção. Fique de olho no Instagram @xadrezcomz para ser o primeiro a jogar.',
    emBreve: true
  }
];
