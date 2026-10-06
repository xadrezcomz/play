# Jogos do @xadrezcomz

Site com os jogos criados por @xadrezcomz para jogar direto no navegador, no
celular ou no computador: **https://xadrezcomz.github.io/play/**

| Caminho | O que é |
|---|---|
| `index.html` | Página inicial com os jogos (a lista fica em `jogos.js`) |
| `rock-orbit/` | Página do Rock Orbit: trailer, imagens e recursos (pt, en, es) |
| `rock-orbit/jogar/` | O Rock Orbit em si, jogável no navegador |
| `slide-chess/jogar/` | O Slide Chess, jogável no navegador (com ícone e manifesto para instalar como app) |
| `endless-pace/jogar/` | O Endless Pace (MVP 0.1), jogável no navegador. Arquitetura e como mexer: [`endless-pace/README.md`](endless-pace/README.md) |
| `privacidade.html` | Política de privacidade do site e dos jogos |
| `contador.js` | Contagem de visitas e jogadas pelo GoatCounter (sem cookies) |

## Contagens

As visitas e jogadas vão para **https://xadrezcomz.goatcounter.com**. Cada abertura
de `<jogo>/jogar/` conta como uma jogada (caminhos `/jogo/rock-orbit`, `/jogo/slide-chess` e `/jogo/endless-pace`). Para os
números aparecerem nos cartões do site, a opção **"Allow adding visitor counts on
your website"** precisa estar ligada nas configurações do GoatCounter.

### Eventos de uso

Além das jogadas, os jogos mandam eventos anônimos (aparecem no painel com o
prefixo do jogo; no GoatCounter, eventos ficam separados das páginas):

| Evento | Rock Orbit (`ro/…`) | Slide Chess (`sc/…`) | Endless Pace (`ep/…`) |
|---|---|---|---|
| Começou a jogar (1 por abertura) | `ro/decolou` | `sc/comecou` | `ep/comecou` (e `ep/criou-corredor` na primeira vez) |
| Tentou uma fase/nível | `ro/tentou/<planeta>-<fase>` | `sc/tentou/mundo-M/nivel-N`, `desafio-do-dia`, `modo-livre`, `desafio-de-amigo` | `ep/desafio/tentou/<desafio>-<meta>` |
| Venceu | `ro/venceu/<planeta>-<fase>` | `sc/venceu/…` | `ep/desafio/venceu/<desafio>-<meta>` |
| Chegou num planeta / completou um mundo | `ro/planeta/<planeta>` | `sc/mundo-completo/M` | `ep/correu/1-km`, `3-km`, `5-km`, `10-km`… (numa corrida) e `ep/terminou/<faixa>` |
| Terminou o tutorial / zerou | `ro/tutorial`, `ro/zerou` | `sc/zerou` | `ep/tutorial`, `ep/flow` (primeiro FLOW da visita) |
| Escolheu o caminho na bifurcação | — | — | `ep/caminho/parque`, `ep/caminho/centro` |
| Tempo de jogo na mesma visita | `ro/tempo/5-min`, `15-min`, `30-min` | `sc/tempo/…` | `ep/tempo/…` (só correndo) |
| Voltou em outro dia / 7+ dias depois | `ro/voltou`, `ro/voltou-depois-de-7-dias` | `sc/voltou`, `sc/voltou-depois-de-7-dias` | `ep/voltou`, `ep/voltou-depois-de-7-dias` |

Comparar `tentou` com `venceu` mostra as fases difíceis demais. No Endless Pace,
`ep/terminou/…` mostra até onde as pessoas correm antes de parar (a pergunta do
MVP: correr é divertido?). A data da última
visita fica só no aparelho (localStorage); nada que identifique a pessoa é enviado.
Fora do site (apps, arquivo baixado) os eventos não fazem nada.

## Insira uma ficha (apoio por Pix)

A seção "Continue? Insira uma ficha" da página inicial gera o Pix (QR Code e
"copia e cola", com o valor já preenchido) direto no navegador, sem servidor.
Tudo o que muda fica no começo de `apoio.js`:

- **DESBLOQUEIOS**: as metas que as fichas ajudam a destravar. Quando uma
  acontecer, troque `feito: false` por `feito: true`.
- **PLACAR**: quando alguém mandar um Pix com 3 letras na mensagem, coloque no
  topo da lista, por exemplo `{ ini: 'ABC', fichas: 3 }` (1 ficha = R$ 5).
- **pacotes** e **ficha**: quantidades e valor de cada ficha.

No GoatCounter aparecem `site/apoio/abriu`, `site/apoio/escolheu/<n>-fichas`,
`site/apoio/copiou` e `site/apoio/inseriu` (este último é só o clique em
"Pronto, inseri!", não confirma pagamento). O QR Code usa `lib/qrcode.js`
(qrcode-generator, licença MIT).

## Imagem ao compartilhar o link

Cada página tem as tags `og:` com uma imagem 1200×630 (abaixo de 300 KB, que é
o limite seguro do WhatsApp): `img/compartilhar-site.jpg` na página inicial,
`rock-orbit/img/compartilhar-pt.jpg` no Rock Orbit e `img/capa-slide-chess.jpg`
no Slide Chess. O WhatsApp guarda a prévia de um link por um tempo; para testar
uma imagem nova, mande o link com `?v=2` no fim.

## Atualizar um jogo

Troque o arquivo do jogo e deixe o script recolocar o contador e as tags de
compartilhamento (e, no Slide Chess, os eventos):

```
python3 ferramentas/prepara-jogo.py rock-orbit  ../escola/rock-orbit.html
python3 ferramentas/prepara-jogo.py slide-chess caminho/do/slide-chess.html
python3 ferramentas/eventos-slide-chess.py
```

O Endless Pace já mora neste repositório (vários arquivos em `endless-pace/jogar/`),
então não há arquivo para trocar: `python3 ferramentas/prepara-jogo.py endless-pace`
só refaz as tags de compartilhamento no próprio `index.html`.

## Colocar um jogo novo

1. Crie a pasta do jogo, com o jogo em `<pasta>/jogar/index.html`.
2. No `<head>` do jogo, antes de `</head>`:
   ```html
   <script>window.CONTAGEM = '/jogo/<pasta>';</script>
   <script src="../../contador.js"></script>
   ```
3. Coloque a capa em `img/` (1200×630) e acrescente o jogo em `jogos.js`.
4. Acrescente o jogo em `ferramentas/prepara-jogo.py` para ganhar as tags de compartilhamento.
