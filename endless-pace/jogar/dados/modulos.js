// MÓDULOS DE RUA, ROTAS E BIFURCAÇÕES (GDD §20, §21, §24–26, §76)
// O mundo infinito é feito encaixando estes módulos. Cada um descreve o piso,
// o que vai nas laterais (slots de prédios, árvores e objetos) e as peças
// especiais. O desenho de cada peça fica em js/world/Assets.js.
(function (EP) {
  EP.data.roadModules = [
    {
      id: 'residencial', biome: 'cidade', ground: 'ground', length: 90, curvature: 0.35, slope: 0,
      entrance: 'rua', exit: 'rua', floor: 'rua', npcDensity: 1,
      sides: {
        buildings: ['casa', 'sobrado'], buildingGap: [2, 5], setback: [9.5, 11],
        trees: ['redonda', 'florida', 'arbusto'], treeEvery: [11, 17],
        props: ['poste', 'lixeira', 'hidrante'], propEvery: [16, 24]
      },
      extras: ['crosswalk']
    },
    {
      id: 'comercial', biome: 'cidade', ground: 'lot', length: 100, curvature: -0.3, slope: 0,
      entrance: 'rua', exit: 'rua', floor: 'rua', npcDensity: 1.15,
      sides: {
        buildings: ['loja', 'predio-baixo', 'loja'], buildingGap: [0.5, 2], setback: [9, 9.5],
        trees: ['redonda'], treeEvery: [16, 22],
        props: ['poste', 'banco', 'lixeira', 'placa'], propEvery: [9, 14]
      },
      extras: ['crosswalk']
    },
    {
      id: 'avenida', biome: 'cidade', ground: 'lot', length: 120, curvature: 0.5, slope: 0,
      entrance: 'rua', exit: 'rua', floor: 'avenida', npcDensity: 1.3,
      sides: {
        buildings: ['predio-alto', 'predio-baixo', 'predio-alto'], buildingGap: [3, 7], setback: [11, 12.5],
        trees: ['palmeira', 'redonda'], treeEvery: [10, 13],
        props: ['poste', 'banco', 'placa'], propEvery: [12, 18]
      },
      extras: ['crosswalk', 'skyline']
    },
    {
      id: 'praca', biome: 'cidade', ground: 'lot', length: 80, curvature: 0, slope: 0,
      entrance: 'rua', exit: 'rua', floor: 'rua', npcDensity: 1.1,
      sides: {
        buildings: ['sobrado', 'loja', 'predio-baixo'], buildingGap: [1, 3], setback: [10, 11],
        trees: ['florida', 'redonda'], treeEvery: [9, 13],
        props: ['banco', 'poste', 'lixeira'], propEvery: [7, 10]
      },
      extras: ['fonte', 'crosswalk']
    },
    {
      id: 'ponte', biome: 'cidade', ground: 'ground', length: 90, curvature: -0.4, slope: 0,
      entrance: 'rua', exit: 'rua', floor: 'ponte', npcDensity: 0.9,
      sides: {
        buildings: [], buildingGap: [0, 0], setback: [0, 0],
        trees: ['pinheiro', 'redonda'], treeEvery: [8, 12],
        props: ['poste'], propEvery: [15, 15]
      },
      extras: ['rio']
    },
    {
      id: 'tunel', biome: 'cidade', ground: 'ground', length: 85, curvature: 0.2, slope: 0,
      entrance: 'rua', exit: 'rua', floor: 'rua', npcDensity: 0.9,
      sides: {
        buildings: ['predio-baixo', 'sobrado'], buildingGap: [2, 4], setback: [10, 11],
        trees: ['arbusto'], treeEvery: [14, 20],
        props: ['poste'], propEvery: [18, 22]
      },
      extras: ['tunel']
    },
    {
      id: 'parque', biome: 'cidade', ground: 'grass', length: 110, curvature: -0.45, slope: 0,
      entrance: 'parque', exit: 'parque', floor: 'parque', npcDensity: 0.8,
      sides: {
        buildings: [], buildingGap: [0, 0], setback: [0, 0],
        trees: ['redonda', 'pinheiro', 'florida', 'arbusto', 'redonda'], treeEvery: [5, 9],
        props: ['banco', 'poste', 'lixeira'], propEvery: [10, 15]
      },
      extras: ['gramado', 'canteiros']
    },
    {
      id: 'parque-lago', biome: 'cidade', ground: 'grass', length: 110, curvature: 0.4, slope: 0,
      entrance: 'parque', exit: 'parque', floor: 'parque', npcDensity: 0.7,
      sides: {
        buildings: [], buildingGap: [0, 0], setback: [0, 0],
        trees: ['pinheiro', 'redonda', 'arbusto'], treeEvery: [6, 10],
        props: ['banco', 'poste'], propEvery: [12, 16]
      },
      extras: ['gramado', 'lago']
    },
    {
      id: 'quadra', biome: 'cidade', ground: 'grass', length: 95, curvature: 0, slope: 0,
      entrance: 'parque', exit: 'parque', floor: 'parque', npcDensity: 0.8,
      sides: {
        buildings: [], buildingGap: [0, 0], setback: [0, 0],
        trees: ['redonda', 'arbusto', 'palmeira'], treeEvery: [7, 11],
        props: ['banco', 'poste', 'lixeira'], propEvery: [11, 15]
      },
      extras: ['gramado', 'quadra']
    },
    {
      id: 'bifurcacao', biome: 'cidade', ground: 'ground', length: 120, curvature: 0, slope: 0,
      entrance: 'rua', exit: 'rua', floor: 'rua', npcDensity: 0.7,
      mirror: false,             // esquerda e direita têm significado: não espelhar
      divider: { from: 18, to: 108, halfWidth: 0.9 },   // canteiro central: escolha um lado
      sides: {
        buildings: [], buildingGap: [0, 0], setback: [0, 0],
        trees: [], treeEvery: [0, 0], props: ['poste'], propEvery: [20, 20]
      },
      extras: ['bifurcacao'],
      fork: true
    }
  ];

  // Rotas: conjuntos de módulos com pequenos modificadores (GDD §20–21).
  // modifiers.energy: 1.10 = recupera 10% mais e gasta 10% menos.
  EP.data.routes = {
    bairro: { text: 'route.bairro', icon: '🏘️', modules: ['residencial', 'comercial', 'praca', 'ponte', 'tunel'], modifiers: {} },
    parque: {
      text: 'route.parque', icon: '🌳', modules: ['parque', 'parque-lago', 'quadra'], length: [4, 6],
      modifiers: { energy: 1.10, npcDensity: 0.6 }, perks: ['perk.energy10', 'perk.fewerRunners']
    },
    centro: {
      text: 'route.centro', icon: '🏙️', modules: ['avenida', 'comercial', 'praca'], length: [4, 6],
      modifiers: { coins: 1.20, npcDensity: 1.5 }, perks: ['perk.coins20', 'perk.moreRunners']
    }
  };

  EP.data.forks = [
    { id: 'parque-centro', module: 'bifurcacao', left: 'parque', right: 'centro' }
  ];

  EP.data.world = {
    ahead: 5, behind: 2,         // GDD §62: 5 módulos à frente, 2 atrás
    recentBlock: 2,              // módulos recentes que não podem se repetir
    variants: 2,                 // versões de cada módulo (mais o espelhamento)
    forkEvery: [6, 9],           // módulos de bairro entre uma bifurcação e outra
    firstForkAfter: 5,           // na primeira corrida, a bifurcação chega cedo (uns 450 m)
    forkPromptAt: 115,           // metros antes do canteiro: aparece a escolha
    forkDecideAt: 55,            // metros antes do canteiro: escolha fechada (o que vem depois ainda está na neblina)
    rebaseEvery: 2000,           // recentra as coordenadas (precisão em corridas longas)
    roadHalf: 4.5, sidewalk: 3.6 // largura da rua (metade) e da calçada
  };
})(window.EP);
