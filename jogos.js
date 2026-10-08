// Lista de jogos da página inicial, na ordem em que aparecem.
//
// Campos de cada jogo:
//   nome, desc        nome e uma ou duas frases sobre o jogo
//   capa              imagem 1200×630 em img/ (ex.: img/capa-meu-jogo.jpg)
//   jogar             pasta onde o jogo roda (ex.: 'meu-jogo/jogar/')
//   saiba             (opcional) página com mais detalhes do jogo
//   contagem          (opcional) caminho do GoatCounter, ex.: '/jogo/meu-jogo'
//   selos             (opcional) etiquetas curtas: gênero, plataformas, idiomas
//   encaixe, fundoCapa (opcional) 'contain' e uma cor, para a capa não ser cortada
//
// Jogo que ainda não saiu: { nome: 'Nome', desc: 'Uma frase', emBreve: true }
// (a capa é opcional). Ele aparece numa seção "Em breve", sem botão de jogar.
// Quando o jogo sair, apague o emBreve e preencha os outros campos.
window.JOGOS = [
  {
    nome: 'Imobiliário 3D',
    desc: 'Compre, construa e negocie numa cidade em miniatura. O clássico jogo de tabuleiro em 3D, com amigos no mesmo aparelho ou contra o computador.',
    capa: 'img/capa-imobiliario.jpg',
    jogar: 'imobiliario/jogar/',
    contagem: '/jogo/imobiliario',
    selos: ['Tabuleiro', 'Negociação', '2 a 6 jogadores', 'Celular e computador']
  },
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
    nome: 'Slide Chess',
    desc: 'Abra caminho, coroe o peão e leve a dama para casa. Um quebra-cabeça de xadrez com peças que deslizam, desafio do dia e níveis sem fim.',
    capa: 'img/capa-slide-chess.jpg',
    encaixe: 'contain', fundoCapa: '#12161f',   // capa inteira, sem cortar as laterais
    jogar: 'slide-chess/jogar/',
    contagem: '/jogo/slide-chess',
    selos: ['Quebra-cabeça', 'Xadrez', 'Celular e computador', 'Português, inglês e espanhol']
  },
  {
    nome: 'RULES',
    desc: 'Cada fase tem uma instrução simples. O difícil é descobrir como interpretá-la. 100 fases para pensar diferente, com o Ruli.',
    capa: 'img/capa-rules.jpg',
    jogar: 'rules/jogar/',
    contagem: '/jogo/rules',
    selos: ['Quebra-cabeça', 'Celular e computador', 'Português, inglês e espanhol']
  }
];
