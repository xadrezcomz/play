# ENDLESS PACE — MVP 0.1

*Até onde você consegue correr?* Uma corrida de rua em terceira pessoa que nunca
termina. O jogador cria o seu corredor, controla o ritmo tocando na tela, entra
no FLOW, ultrapassa quem estiver pela frente e escolhe o caminho nas bifurcações.

Jogar: **https://xadrezcomz.github.io/play/endless-pace/jogar/** (depois de
publicado) ou abrir `endless-pace/jogar/index.html` direto no navegador.

Para mandar o jogo para alguém testar (ou jogar sem internet), gere um arquivo só:

```
node endless-pace/ferramentas/arquivo-unico.mjs saida.html         # tudo embutido (~1,1 MB)
node endless-pace/ferramentas/arquivo-unico.mjs saida.html --cdn   # three.js e fontes da internet (~220 KB)
```

O arquivo avulso não conta jogadas no site.

Esta versão responde à pergunta do MVP (GDD §84): **correr é divertido?** Por
isso tem só o loop principal, bem acabado, e a arquitetura pronta para crescer.

## O que tem no 0.1

| GDD | No jogo |
|---|---|
| §4 Criação do corredor | 4 passos: corredor/corredora, nome (15 letras), pele (5 tons), cabelo (3 estilos, 5 cores), camiseta, short e tênis |
| §6–9 Toque, cadência, avaliação | cada toque é uma passada; o ritmo regular dá GOOD, GREAT e PERFECT; tocar rápido demais não passa de GOOD e gasta energia |
| §8 FLOW | 5 PERFECT ×1, 10 ×2, 20 ×3, 30 ×4 (até ×12); menos gasto de energia, +velocidade, mais moedas, música mais rica, câmera mais aberta |
| §10–11 Energia | caminhada recupera, corrida normal é estável, forte e sprint gastam; zerada limita a 7 km/h, nunca encerra a corrida |
| §13–15 NPCs | 5 categorias internas (de caminhada a elite), grupos de corrida, desvios sem colisão, pooling |
| §14 Ultrapassagens | contador e COMBO com moedas extras |
| §20–21 Bifurcação | Parque (energia +10%, menos gente) ou Centro (moedas +20%, mais gente), escolhida com deslize |
| §22 Mini-desafio | FLOW: N PERFECT seguidos (10, 15, 20), com tempo |
| §24–26, §62 Mundo infinito | 10 módulos de rua encaixados na hora, 5 à frente e 2 atrás, sem repetir os recentes |
| §27, §81 Cidade | 5 prédios, 5 árvores, 5 objetos urbanos, parque com lago, quadra, praça com fonte, ponte e túnel |
| §31 Dia e noite | amanhecer → manhã → tarde → pôr do sol → noite, com janelas e postes acendendo |
| §34–35 Música | cada toque é uma batida; o FLOW acrescenta baixo, chimbal, acordes, arpejo e caixa |
| §41 Moedas | por distância, ultrapassagens, FLOW e desafios |
| §48 Save | `localStorage` (chave `endlesspace.save`), com versão e migração; salva a cada 10 s de corrida |
| §53–54 Recordes | perfil e melhores marcas; recordes novos aparecem no resumo da corrida |
| §64–67 Câmera, HUD, controles | câmera atrás do corredor que abre com a velocidade; HUD mínimo; toque, deslize e teclado |
| §68 Tutorial | TOQUE PARA CORRER → MANTENHA O RITMO → PERFECT! → DESLIZE PARA ESCOLHER |
| §71 Acessibilidade | música, efeitos, vibração, reduzir movimento da câmera, interface maior |
| §72 Idiomas | português, inglês e espanhol (nenhum texto no código) |
| §79 Analytics | eventos internos (`run_started`, `flow_started`, `challenge_completed`...) e contagens anônimas no site |

Ficou para as próximas versões, como pede o GDD: equipamentos, loja, progresso
offline, pacemaker, os outros desafios (0.2); segundo bioma, conquistas de
distância e música completa (0.3). O save já guarda os campos que essas versões
vão usar (`inventory`, `equipped`, `achievements`, `level`, `xp`, `lastSeenAt`).

## Arquitetura (GDD §77–78)

Conteúdo e lógica separados: **tudo que é conteúdo ou número fica em `dados/`**.
Um tênis, um módulo de rua, um desafio ou um texto novo não mexe nos sistemas.

```
endless-pace/jogar/
├── index.html, estilo.css, icone.svg
├── vendor/three-0.128.0.min.js        motor 3D (o mesmo do Rock Orbit), funciona offline
├── dados/                             CONTEÚDO (data-driven)
│   ├── balanceamento.js               velocidades, energia, janelas de ritmo, FLOW, moedas, câmera
│   ├── aparencia.js                   tons de pele, cabelos, cores de roupa, proporções
│   ├── npcs.js                        categorias de corredores, grupos, quantidade
│   ├── biomas.js                      bioma Cidade (paleta e peças) e cores do ciclo do dia
│   ├── modulos.js                     RoadModules, rotas (bairro, parque, centro) e bifurcações
│   ├── desafios.js                    mini-desafios
│   ├── modelos/                       corredores assados (corpo, roupas, tênis, cabelos; ferramentas/bake-corredor.mjs)
│   └── textos/pt-BR.js, en-US.js, es.js
├── js/core/                           EP.js (utilidades e EventBus), SaveManager, LocalizationManager, Analytics
├── js/systems/                        TapRhythmSystem, FlowSystem, EnergySystem, SpeedSystem, OvertakeSystem,
│                                      EconomyManager, ChallengeManager, ProgressionManager (lógica pura, testada)
├── js/world/                          Materials (curvatura), GeoBuilder, Assets, RoadModules,
│                                      ProceduralWorldGenerator, DayNightSystem, ForkSigns
├── js/runner/                         ModelData (lê os corredores assados), RunnerRig (boneco, roupas, animação),
│                                      RunnerController, NPCManager
├── js/audio/AudioManager.js           sons e camadas de música (MusicLayerManager), tudo sintetizado
├── js/ui/                             Input, CharacterCreator, UIManager
└── js/GameManager.js                  estados, laço do jogo, câmera, ordem dos sistemas
```

Os sistemas não se conhecem: avisam pelo barramento `EP.events` e o
GameManager passa os números de um para o outro. Os sistemas de `js/systems/`
não dependem do 3D e rodam em teste no Node.

Sistemas do GDD que ainda não existem (BiomeManager, WeatherSystem,
EquipmentManager, InventoryManager, OfflineProgressManager, PacemakerSystem,
AchievementManager) entram nas próximas versões; os dados que eles vão usar já
têm lugar (`EP.data.biomes`, campos do save).

## Como acrescentar conteúdo

- **Balancear**: mude os números em `dados/balanceamento.js`. As curvas são tabelas
  `[x, y]` (por exemplo, toques por segundo → km/h, km/h → energia por segundo).
- **Módulo de rua**: um item em `dados/modulos.js` com piso (`rua`, `avenida`,
  `parque`, `ponte`), regras das laterais (prédios, árvores, objetos e espaçamentos)
  e partes especiais (`fonte`, `lago`, `quadra`, `tunel`, `rio`...). Depois inclua o
  `id` nos `modules` de uma rota. Uma peça visual nova (prédio, árvore, objeto) é
  uma função em `js/world/Assets.js`.
- **Rota ou bifurcação**: `EP.data.routes` (módulos, modificadores e textos dos
  bônus) e `EP.data.forks` (qual rota fica de cada lado).
- **Desafio**: um item em `dados/desafios.js`. Um *tipo* novo de desafio (PACE,
  OVERTAKE, ENERGY...) é um avaliador em `ChallengeManager.types` (ganchos
  `onRating`, `onOvertake`, `update`).
- **Texto**: a mesma chave nos três arquivos de `dados/textos/`. O teste confere
  que nenhum idioma ficou sem chave.
- **Bioma**: um item em `EP.data.biomes` com paleta, peças e os seus módulos
  (campo `biome` de cada módulo).

## Desempenho (GDD §60–63)

- Cada módulo de rua é montado uma vez no começo, juntando centenas de peças em
  3 geometrias (cenário, luzes e água) com a cor nos vértices: poucas chamadas de
  desenho e um material só. Os módulos e os corredores são reaproveitados.
- A curva da rua e a queda do horizonte são feitas no shader (`Materials.js`): a
  lógica continua numa reta. Por isso pisos e caixas compridas são divididos em
  pedaços de até 6 m (`GeoBuilder`), senão "afundam" no meio.
- Sombras são discos embaixo dos corredores; não há sombra em tempo real.
- Corredores distantes animam a cada 3 quadros. Qualidade gráfica nas Opções.
- As coordenadas são recentralizadas a cada 2 km (corridas longas sem tremer).

## Testes

```
node --test endless-pace/testes/*.test.mjs
```

Cobrem ritmo, FLOW, energia, velocidade, ultrapassagens, desafio, moedas,
recordes, save (inclusive saves antigos), os três idiomas e a coerência dos dados.

## Eventos

Os nomes internos (`run_started`, `run_finished`, `distance_reached`,
`flow_started`, `flow_lost`, `challenge_started`, `challenge_completed`,
`route_chosen`...) ficam em `EP.Analytics.log`. No site, alguns viram contagens
anônimas `ep/…` no GoatCounter (tabela no README do site).

## Créditos dos modelos

Corredores: Universal Base Characters e Universal Animation Library por Quaternius (CC0) — quaternius.com; decodificador
meshoptimizer (MIT, Arseny Kapoulkine). Licenças em `jogar/modelos/LICENCAS/`; os dados em `jogar/dados/modelos/` são
gerados por `node ferramentas/bake-corredor.mjs` (ver `ferramentas/ESPEC-corredor.md`).
