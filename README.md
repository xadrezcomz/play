# Jogos do @xadrezcomz

Site com os jogos criados por @xadrezcomz para jogar direto no navegador, no
celular ou no computador: **https://xadrezcomz.github.io/play/**

| Caminho | O que é |
|---|---|
| `index.html` | Página inicial com os jogos (a lista fica em `jogos.js`) |
| `rock-orbit/` | Página do Rock Orbit: trailer, imagens e recursos (pt, en, es) |
| `rock-orbit/jogar/` | O Rock Orbit em si, jogável no navegador |
| `slide-chess/jogar/` | O Slide Chess, jogável no navegador (com ícone e manifesto para instalar como app, e `sw.js` para abrir sem internet) |
| `rules/jogar/` | O RULES (puzzle de instruções, 100 fases), jogável no navegador; detalhes em `rules/README.md` |
| `privacidade.html` | Política de privacidade do site e dos jogos |
| `contador.js` | Contagem de visitas e jogadas pelo GoatCounter (sem cookies) |

## Contagens

As visitas e jogadas vão para **https://xadrezcomz.goatcounter.com**. Cada abertura
de `<jogo>/jogar/` conta como uma jogada (caminhos `/jogo/rock-orbit`, `/jogo/slide-chess` e `/jogo/rules`). Para os
números aparecerem nos cartões do site, a opção **"Allow adding visitor counts on
your website"** precisa estar ligada nas configurações do GoatCounter.

### Eventos de uso

Além das jogadas, os jogos mandam eventos anônimos (aparecem no painel com o
prefixo do jogo; no GoatCounter, eventos ficam separados das páginas):

| Evento | Rock Orbit (`ro/…`) | Slide Chess (`sc/…`) |
|---|---|---|
| Começou a jogar (1 por abertura) | `ro/decolou` | `sc/comecou` |
| Tentou uma fase/nível | `ro/tentou/<planeta>-<fase>` | `sc/tentou/mundo-M/nivel-N`, `desafio-do-dia`, `modo-livre`, `desafio-de-amigo` |
| Venceu | `ro/venceu/<planeta>-<fase>` | `sc/venceu/…` |
| Chegou num planeta / completou um mundo | `ro/planeta/<planeta>` | `sc/mundo-completo/M` |
| Terminou o tutorial / zerou | `ro/tutorial`, `ro/zerou` | `sc/zerou` |
| Tempo de jogo na mesma visita | `ro/tempo/5-min`, `15-min`, `30-min` | `sc/tempo/…` |
| Voltou em outro dia / 7+ dias depois | `ro/voltou`, `ro/voltou-depois-de-7-dias` | `sc/voltou`, `sc/voltou-depois-de-7-dias` |

O RULES manda os mesmos tipos de evento com o prefixo `ru/…` (lista em `rules/README.md`).

Comparar `tentou` com `venceu` mostra as fases difíceis demais. A data da última
visita fica só no aparelho (localStorage); nada que identifique a pessoa é enviado.
Fora do site (apps, arquivo baixado) os eventos não fazem nada.

## Imagem ao compartilhar o link

Cada página tem as tags `og:` com uma imagem 1200×630 (abaixo de 300 KB, que é
o limite seguro do WhatsApp): `img/compartilhar-site.jpg` na página inicial,
`rock-orbit/img/compartilhar-pt.jpg` no Rock Orbit, `img/capa-slide-chess.jpg`
no Slide Chess e `img/capa-rules.jpg` no RULES. O WhatsApp guarda a prévia de um link por um tempo; para testar
uma imagem nova, mande o link com `?v=2` no fim.

## Atualizar um jogo

Troque o arquivo do jogo e deixe o script recolocar o contador e as tags de
compartilhamento (e, no Slide Chess, os eventos):

```
python3 ferramentas/prepara-jogo.py rock-orbit  ../escola/rock-orbit.html
python3 ferramentas/prepara-jogo.py slide-chess caminho/do/slide-chess.html
python3 ferramentas/eventos-slide-chess.py
```

## Colocar um jogo novo

A página inicial monta os cartões a partir de `jogos.js` (2 por linha no
computador, 1 no celular), então não é preciso mexer no `index.html`.

- **Anunciar antes de sair:** acrescente em `jogos.js`
  `{ nome: 'Nome', desc: 'Uma frase', emBreve: true }`. Ele aparece na seção
  "Em breve", sem botão de jogar (uma capa é opcional).
- **Publicar:**
  1. Crie a pasta do jogo, com o jogo em `<pasta>/jogar/index.html`.
  2. No `<head>` do jogo, antes de `</head>`:
     ```html
     <script>window.CONTAGEM = '/jogo/<pasta>';</script>
     <script src="../../contador.js"></script>
     ```
  3. Coloque a capa em `img/` (1200×630) e, em `jogos.js`, tire o `emBreve` e
     preencha `capa`, `jogar`, `contagem` e `selos`.
  4. Acrescente o jogo em `ferramentas/prepara-jogo.py` para ganhar as tags de
     compartilhamento.
  5. Se quiser, refaça `img/compartilhar-site.jpg` (a imagem do link do site)
     com os jogos novos.
