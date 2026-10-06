# RULES

Puzzle minimalista de quebra de expectativa: cada fase tem uma instrução
simples, e o desafio é descobrir como interpretá-la. Para celular (toque), PC
(mouse) e web, na vertical, em português, inglês e espanhol.

**Jogar:** `rules/jogar/` no site (https://xadrezcomz.github.io/play/rules/jogar/)
ou abrindo `rules/jogar/index.html` direto no navegador. Não tem build nem
dependência: é HTML, CSS e JavaScript puros.

## Estado: capítulos 1 a 3 (fases 1–30)

As 30 primeiras fases do documento de design estão prontas e testadas:
**Capítulo 1 — Aprenda as regras** (1–10), **Capítulo 2 — Não confie nas
regras** (11–20) e **Capítulo 3 — Mexa em tudo** (21–30).

Mecânicas usadas: toque, arraste, pinça (escala), segurar em cima (despejar),
toque simultâneo com dois dedos, esfregar, espera, gravidade, encaixe em
lugares, palavras da instrução como objetos e como ferramentas, objetos que
fogem, buracos, mover o cenário inteiro e observar uma animação diferente.

Também já funcionam: menu, mapa de fases por capítulo, ajustes (música,
efeitos, vibração, reduzir animações, idioma, apagar progresso), dicas em três
níveis, reiniciar na hora, salvamento local, cartões de capítulo, celebração
com partículas e som, Ruli (e amigos de outras cores) com 6 expressões e
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
  stick, fish, chest, wall, gem, feather, tree, apple, marker (invisível),
  ruli (com `props.color`: teal, pink, yellow, purple), word.
  Novos visuais: `RULES.Renderers.register('nome', { view, svg })`.
- **Comportamentos** (`behaviors`): `draggable`, `scalable`, `holdable`,
  `clickable`, `container`, `door`, `flee`, `fallsInto`, `character`,
  `mirror`, `group`, `pourer`, `gravity`, `snap`, `receives`, `rubbable`,
  `carries`. A lista
  de opções de cada um está no topo de `scripts/puzzles/behaviors.js`.
- **Condições de vitória** (`win`): `tapped`, `inside`, `touching`, `moved`,
  `state`, `idle`, `scale`, e as combinações `all`, `any`, `not`.
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
```

O teste joga as 30 fases com toque, pinça, toque simultâneo e esfregar de
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

- Etapa 6: testar em celulares de verdade (Android/iOS) e ajustar.
- Etapa 9: fases 31–50 e o final ("...OU NÃO.").
