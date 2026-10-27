# RULES

Puzzle minimalista de quebra de expectativa: cada fase tem uma instrução
simples, e o desafio é descobrir como interpretá-la. Para celular (toque), PC
(mouse) e web, na vertical ou na horizontal, em português, inglês e espanhol.

**Jogar:** `rules/jogar/` no site (https://xadrezcomz.github.io/play/rules/jogar/)
ou abrindo `rules/jogar/index.html` direto no navegador. Não tem build nem
dependência: é HTML, CSS e JavaScript puros.

## Estado: 300 fases em 30 capítulos

| Capítulo | Fases | Ideia |
|---|---|---|
| 1. Aprenda as regras | 1–10 | toque, arraste, pinça, palavra TUDO, espera |
| 2. Não confie nas regras | 11–20 | a chave foge, o "O" gigante, só duas luzes acesas, gravidade |
| 3. Mexa em tudo | 21–30 | paredes, palitos 2 + 2 = 5, cócegas, palavras como ferramenta, mover o cenário |
| 4. Pense diferente | 31–40 | juntar metades, esticar a ponte, dividir a bola, ordem certa, girar o relógio |
| 5. Quebre as regras | 41–50 | mudar a cor, inverter dentro/fora, empilhar caixas, o final "...OU NÃO." |
| 6. A tela também joga | 51–60 | dica e reiniciar como solução, peças no rótulo FASE, tirar o NÃO da frase |
| 7. Palavras que mudam tudo | 61–70 | trocar letras, palavra vira ponte e tinta, trocar palavras de lugar |
| 8. Física de brinquedo | 71–80 | balão, balança, água que sobe, gangorra, ímã, fogueira, sorvete |
| 9. Olhe de novo | 81–90 | copos embaralhados, o que mudou, lanterna, espelho, memória |
| 10. Fora da caixa | 91–100 | desenhar com o dedo, canos, cofre, ficar quieto, a "última" fase |
| 11. Números mentem | 101–110 | 9 vira 6, somar na bandeja, contar o que está escondido, relógio |
| 12. Liga e desliga | 111–120 | fios trocados, apagar luzes (vizinhas), tomada, velas, cortina |
| 13. Empurre | 121–130 | caixas que só andam empurradas, dominó, nichos (estilo Sokoban) |
| 14. Labirintos | 131–140 | paredes, bloco solto, fresta, escuro, portais, gato, paredes invisíveis |
| 15. Cores que enganam | 141–150 | palavra azul, misturar tintas, paleta, ilusão de ótica, arco-íris |
| 16. Gestos | 151–160 | segurar, três toques, sacudir, soprar, virar página, desenhar em volta |
| 17. Na hora certa | 161–170 | estrela que cochila, parar o ponteiro, semáforo, ratinho, adiantar o tempo |
| 18. Peso e equilíbrio | 171–180 | balança, 1 kg de penas, alavanca, moeda leve, encher até a metade, gangorra |
| 19. Espelhos e sombras | 181–190 | sombras, espelho móvel, relógio no espelho, lâmpada e sombra, porta no reflexo |
| 20. A frase é o jogo | 191–200 | palavras como objetos, trocar palavras na placa, frase embaralhada, "esta frase tem três palavras" |
| 21. Na cozinha | 201–210 | sanduíche, torrada, massa, bandeja frágil, formigas no açúcar, bolo |
| 22. Chaves e portas | 211–220 | tapete, senha atrás do quadro, anel, bater na porta, placas que mentem, sala de fuga |
| 23. Escondido | 221–230 | camaleão, lua de dia, estrela gigante, Ruli na multidão |
| 24. Memória | 231–240 | copos embaralhados, jogo da memória, o que sumiu, quem trocou de lugar |
| 25. Lógica | 241–250 | sequências, quadrado mágico, fios cruzados, relógio, torre de Hanói |
| 26. Dois dedos | 251–260 | botões juntos, abrir com pinça, segurar a porta, lupa (sempre com saída para mouse) |
| 27. Ao contrário | 261–270 | setas trocadas, chegar em último, girar para trás, fazer o contrário da placa |
| 28. Ruli e amigos | 271–280 | amigo tímido, presentes, fila que segue o Ruli, chapéus, festa |
| 29. A tela mente | 281–290 | número da fase, dicas mentirosas, tentativas, hora real do aparelho |
| 30. O fim? | 291–300 | portas dentro de portas, 300 no rótulo, a última porta com três cadeados |

Também funcionam: menu, mapa de fases por capítulo, ajustes (música,
efeitos, vibração, reduzir animações, idioma, apagar progresso), dicas em três
níveis, reiniciar na hora, salvamento local, cartões de capítulo, celebração
com partículas e som, Ruli (e amigos de outras cores) com 7 expressões e
eventos de analytics.

A numeração mostrada no jogo ("FASE 04") é a posição na ordem de jogo
(`LEVEL_ORDER`); hoje ela coincide com o número do arquivo.

| Controle | Celular | PC |
|---|---|---|
| Tocar | toque | clique |
| Arrastar | arrastar | arrastar com o mouse |
| Aumentar/diminuir | pinça com dois dedos | rodinha do mouse (ou pinça do touchpad) |
| Atalhos | – | `R` reinicia, `H` dica, `Esc` volta ao mapa |

## Estrutura

```
rules/
  jogar/
    index.html               telas + ordem de carregamento dos scripts
    manifest.webmanifest     instalar como app (PWA)
    styles/main.css          visual, animações, responsividade
    assets/ui/               ícones
    scripts/
      core/                  ENGINE
        util.js              utilitários e barramento de eventos
        stage.js             tabuleiro lógico 100×120 encaixado em qualquer tela
        objects.js           GameObject (posição, escala, estado, animações)
        renderers.js         desenho SVG de cada tipo de objeto
        ruli.js              o personagem e as expressões
        input.js             InteractionSystem: tap, drag, hold, swipe, pinça, rodinha
        engine.js            PuzzleEngine: carrega a fase, reações, gatilhos, vitória
        effects.js           partículas e toque visual
      puzzles/
        behaviors.js         componentes: draggable, scalable, container, door, flee...
        conditions.js        WinConditionSystem: tapped, inside, touching, idle...
      managers/
        level-manager.js     registro, ordem, capítulos, desbloqueio
        save.js              SaveManager (localStorage)
        audio.js             AudioManager (sons sintetizados, sem arquivos)
        hints.js             HintController (3 níveis)
        transition.js        TransitionManager
        localization.js      LocalizationSystem
        analytics.js         eventos de analytics
        monetization.js      ganchos de monetização futura (hoje tudo liberado)
      ui/game.js             telas e fluxo entre fases
    data/levels/             LEVEL DATA: uma fase por arquivo, só configuração
      index.js               ordem jogável (LEVEL_ORDER) e capítulos
      Level001.js ...
    localization/            pt-BR.js, en-US.js, es-ES.js
  ferramentas/
    valida-fases.js          confere fases e traduções (node, sem dependências)
    testa-fases.js           joga o MVP inteiro no navegador (Playwright)
```

## Como uma fase é definida

Uma fase é **só dados**. O engine nunca tem código específico de uma fase.

```js
// data/levels/Level009.js
RULES.registerLevel({
  id: 9, chapter: 1,
  instruction: 'LEVEL_009_TITLE',            // "COLOQUE [[w_all|TUDO]] NA CAIXA"
  hints: ['LEVEL_009_HINT_1', 'LEVEL_009_HINT_2', 'LEVEL_009_HINT_3'],
  objects: [
    { id: 'box',  type: 'box',  x: 50, y: 92, w: 50, h: 40, z: 5, behaviors: { container: { slots: [...] } } },
    { id: 'ball', type: 'ball', x: 20, y: 34, w: 15, behaviors: { draggable: {} } },
    { id: 'w_all', inText: true, behaviors: { draggable: {} } }   // a palavra TUDO
  ],
  triggers: [{ when: { type: 'inside', objects: ['ball', 'star', 'cube'], container: 'box' },
               do: [{ wait: 350 }, { fail: 'FB_ALMOST' }] }],
  win: { type: 'inside', objects: ['ball', 'star', 'cube', 'w_all'], container: 'box' },
  onWin: [{ fx: 'pop', target: 'box' }]
});
```

- **Coordenadas**: o centro do objeto, num tabuleiro de 100 (largura) × 120
  (altura) unidades. `w`/`h` também em unidades. O tabuleiro é encaixado na
  área central da tela, então funciona em qualquer proporção.
- **Tipos de objeto** (`type`): circle, ball, star, cube, box, slot, door,
  doorway, key, platform, hole, button, bulb, switch, sun, cloud, cup, jug,
  stick, fish, chest, wall, gem, feather, tree, apple, triangle, halftri,
  plank, plant, can, moon, sky, clock, hand, flag, bucket, divider, shelf,
  cushion, vase, balloon, rock, seesaw, basket, magnet, clip, glassbox, tank,
  cork, dark, flashlight, traffic, campfire, twig, icecream, umbrella, pipe,
  faucet, dial, safe, radio, drop, leaf, xmark, mirrorline, card, cup2, paper,
  outline, blackout, number (peça com número; `props.plain` sem fundo), arrow,
  heart, egg, chick, candle, bell, coin, piggy, battery, lock, cheese, mouse,
  gift, curtain, plug, socket, snowman, flower, carrot, bone, dog, cat,
  display (marcador), trophy, pan, fried, bin, bar (parede fina), bush,
  bubble, rope, book, palette, rainbow, frame, ring, ice, sensor, mcard (carta
  da memória), wire, disc, lens, snake, hat, thought, camera, candy, bread,
  toaster, bowl, flour, milk, oven, cake, banana, stove, pot, knob, jar, ant,
  tray, glass, marker (invisível), ruli (com `props.color` ou `state.color`:
  teal, pink, yellow, purple, green, blue, coral, orange), word (com `textKey`
  vira uma palavra solta no cenário; também pode ser pintada).
  Novos visuais: `RULES.Renderers.register('nome', { view, svg })`.
- **Comportamentos** (`behaviors`): `draggable`, `scalable`, `holdable`,
  `rotatable`, `clickable`, `container`, `door`, `flee`, `fallsInto`,
  `character`, `mirror`, `group`, `stackPress`, `pourer`, `gravity`, `snap`,
  `receives`, `rubbable`, `carries`, `merge`, `splitOnStretch`, `floats`,
  `magnet`, `tank`, `melts`, `mirrorOf`, `spotlight`, `timer`, `order`,
  `simon`, `drawZone`, `connect`, `balance`, `pushes` (empurrar e paredes),
  `cycle`, `multitap`, `patrol`, `spinner`, `sumDisplay`, `palette`,
  `encircle`, `bake`, `fragile`, `pairs`, `hanoi`, `magnify`, `stickTo`,
  `follows`, `wordSwap`, `textCycle`, `mirrorOf` com eixo móvel e `shadowOf`.
  Dois do mesmo tipo num objeto:
  `receives` e `'receives#2'`. A lista
  de opções de cada um está no topo de `scripts/puzzles/behaviors.js`.
- **Condições de vitória** (`win`): `tapped`, `inside`, `touching`, `moved`,
  `state`, `idle`, `scale`, `hint`, `text` (cobrir / ficar atrás / sair da
  instrução), `pos`, `same`, `balanced`, `split`, `count`, `countState`,
  `sorted`, `bigger`, `attempt`, `attemptIs`, `value`, `sum`, `stacked`,
  `wordsIn`, `wordText`, `realHour`, e as combinações `all`, `any`, `not`.
- **Extras de fase**: `label` (rótulo "FASE NN" com palavras-objeto, objetos
  `inLabel: true`), `draw: true` (desenhar com o dedo), `minAttempt` num objeto
  (só aparece ao tentar de novo), `finale: 'mid'` (o final da fase 50).
- **Reações** (`reactions`): respondem a eventos (`tap`, `drop`, `hold`,
  `swipe`, `rub`, `rubbing`, `scaledenied`, `flee`, `fell`, `rejected`,
  `snapped`, `used`, `input`...) com ações em sequência: `fx`, `sound`, `say`,
  `fail`, `expr`, `move`, `reset`, `hide`, `show`, `state`, `toggle`, `wait`,
  `vibrate`, `add`, `jump`, `turn`, `grow`, `setText`, `swapText`, `swap`,
  `drop`, `cls`. Reações podem filtrar por `dir` (deslizar), `tool`
  (ferramenta usada), `key` e `value` (mudança de estado).
- **Classes visuais** (`cls`): `breathe` / `breathe-odd` (fase 17), `flop`,
  `big-letter` e `word-blue` (para letras e palavras da instrução).
- **Palavras da instrução** viram objetos com `[[id|PALAVRA]]` no texto de
  cada idioma e um objeto `{ id, inText: true }` na fase. Cada idioma escolhe a
  própria palavra (TUDO / EVERYTHING / TODO) sem mexer na fase.

## Adicionar uma fase

1. Crie `rules/jogar/data/levels/LevelNNN.js` (copie uma parecida).
2. Coloque os textos `LEVEL_NNN_TITLE` e `LEVEL_NNN_HINT_1..3` nos três
   arquivos de `localization/`.
3. Carregue o arquivo no `index.html` (junto das outras fases) e coloque o id
   em `LEVEL_ORDER` (`data/levels/index.js`).
4. Rode `node rules/ferramentas/valida-fases.js`.

Só é preciso programar quando a fase pede uma mecânica que ainda não existe;
aí entra um comportamento, condição ou ação novos, que ficam disponíveis para
todas as fases seguintes.

## Testar

```
node rules/ferramentas/valida-fases.js
npx http-server -p 8123 .                     # na pasta play/
node rules/ferramentas/testa-fases.js         # precisa do Playwright
START=71 node rules/ferramentas/testa-fases.js # começa de uma fase
START=201 END=210 node rules/ferramentas/testa-fases.js # só um trecho
VW=844 VH=390 node rules/ferramentas/testa-fases.js # tela na horizontal
```

O teste joga as 300 fases com toque, pinça, toque simultâneo e esfregar de
verdade (os roteiros das fases 101+ ficam em `roteiros-101.js` e
`roteiros-201.js`), confere que as soluções "óbvias" não completam (tocar na porta,
círculo grande demais, Ruli indo até a chave, ligar as luzes uma por vez,
deixar a bola cair, arrastar o Ruli na fase 30...), que o progresso fica
salvo e que não aparecem erros no console.

## Analytics

Eventos internos: `level_started`, `level_completed`, `level_attempt`,
`hint_used`, `level_abandoned`, `chapter_completed`. No site eles vão para o
GoatCounter com o prefixo `ru/` (anônimos, sem cookies):
`ru/comecou`, `ru/comecou/fase-NN`, `ru/tentou/fase-NN`, `ru/venceu/fase-NN`,
`ru/dica/fase-NN-T`, `ru/abandonou/fase-NN`, `ru/capitulo/N`.
Comparar `tentou` com `venceu` mostra onde as pessoas travam.

## Monetização

O jogo está 100% liberado. Todas as decisões de "pode ou não pode" (fase
jogável, dica 2 e 3) passam por `scripts/managers/monetization.js`, então os
modelos do documento (fases 1–20 grátis, compra única, anúncio opcional só
para dicas) podem ser ligados depois sem mexer nas fases nem nas telas.

## Próximos passos (documento de design)

- Testar em celulares de verdade (Android/iOS) e ajustar.
- Etapa 10 do documento: polimento.
