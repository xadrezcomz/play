# Jogos do @xadrezcomz

Site com os jogos criados por @xadrezcomz para jogar direto no navegador, no
celular ou no computador: **https://xadrezcomz.github.io/play/**

| Caminho | O que é |
|---|---|
| `index.html` | Página inicial com os jogos (a lista fica em `jogos.js`) |
| `rock-orbit/` | Página do Rock Orbit: trailer, imagens e recursos (pt, en, es) |
| `rock-orbit/jogar/` | O Rock Orbit em si, jogável no navegador |
| `slide-chess/jogar/` | O Slide Chess, jogável no navegador (com ícone e manifesto para instalar como app) |
| `privacidade.html` | Política de privacidade do site e dos jogos |
| `contador.js` | Contagem de visitas e jogadas pelo GoatCounter (sem cookies) |

## Contagens

As visitas e jogadas vão para **https://xadrezcomz.goatcounter.com**. Cada abertura
de `<jogo>/jogar/` conta como uma jogada (caminhos `/jogo/rock-orbit` e `/jogo/slide-chess`). Para os
números aparecerem nos cartões do site, a opção **"Allow adding visitor counts on
your website"** precisa estar ligada nas configurações do GoatCounter.

## Colocar um jogo novo

1. Crie a pasta do jogo, com o jogo em `<pasta>/jogar/index.html`.
2. No `<head>` do jogo, antes de `</head>`:
   ```html
   <script>window.CONTAGEM = '/jogo/<pasta>';</script>
   <script src="../../contador.js"></script>
   ```
3. Coloque a capa em `img/` (1200×630) e acrescente o jogo em `jogos.js`.
