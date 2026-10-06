# RULES

Puzzle minimalista de quebra de expectativa: cada fase tem uma instrução
simples, e o desafio é descobrir como interpretá-la. Para celular (toque), PC
(mouse) e web, na vertical, em português, inglês e espanhol.

**Jogar:** `rules/jogar/` no site (https://xadrezcomz.github.io/play/rules/jogar/)
ou abrindo `rules/jogar/index.html` direto no navegador. Não tem build nem
dependência: é HTML, CSS e JavaScript puros.

## Estado: 100 fases em 10 capítulos

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
  outline, blackout, marker (invisível), ruli (com `props.color`: teal, pink,
  yellow, purple), word (com `textKey` vira uma palavra solta no cenário).
  Novos visuais: `RULES.Renderers.register('nome', { view, svg })`.
- **Comportamentos** (`behaviors`): `draggable`, `scalable`, `holdable`,
  `rotatable`, `clickable`, `container`, `door`, `flee`, `fallsInto`,
  `character`, `mirror`, `group`, `stackPress`, `pourer`, `gravity`, `snap`,
  `receives`, `rubbable`, `carries`, `merge`, `splitOnStretch`, `floats`,
  `magnet`, `tank`, `melts`, `mirrorOf`, `spotlight`, `timer`, `order`,
  `simon`, `drawZone`, `connect`, `balance`. Dois do mesmo tipo num objeto:
  `receives` e `'receives#2'`. A lista
  de opções de cada um está no topo de `scripts/puzzles/behaviors.js`.
- **Condições de vitória** (`win`): `tapped`, `inside`, `touching`, `moved`,
  `state`, `idle`, `scale`, `hint`, `text` (cobrir / ficar atrás / sair da
  instrução), `pos`, `same`, `balanced`, `split`, e as combinações `all`,
  `any`, `not`.
- **Extras de fase**: `label` (rótulo "FASE NN" com palavras-objeto, objetos
  `inLabel: true`), `draw: true` (desenhar com o dedo), `minAttempt` num objeto
  (só aparece ao tentar de novo), `finale: 'mid'` (o final da fase 50).
- **Reações** (`reactions`): respondem a eventos (`tap`, `drop`, `hold`,
  `swipe`, `rub`, `rubbing`, `scaledenied`, `flee`, `fell`, `rejected`,
  `snapped`, `used`, `input`...) com ações em sequência: `fx`, `sound`, `say`,
  `fail`, `expr`, `move`, `reset`, `hide`, `show`, `state`, `toggle`, `wait`,
  `vibrate`.
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
```

O teste joga as 100 fases com toque, pinça, toque simultâneo e esfregar de
verdade, confere que as soluções "óbvias" não completam (tocar na porta,
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
- Capa e entrada na página inicial do site, e lançamento.
- Etapa 10 do documento: polimento.
