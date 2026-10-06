// ECONOMIA: espaços de equipamento, raridades, atributos, loja e progresso
// offline (GDD §37–47). Os itens em si ficam em dados/itens.js.
(function (EP) {
  EP.data.itemSlots = [
    { id: 'head', text: 'slot.head', icon: '🧢' },
    { id: 'eyes', text: 'slot.eyes', icon: '🕶️' },
    { id: 'ears', text: 'slot.ears', icon: '🎧' },
    { id: 'shirt', text: 'slot.shirt', icon: '👕' },
    { id: 'shorts', text: 'slot.shorts', icon: '🩳' },
    { id: 'shoes', text: 'slot.shoes', icon: '👟' },
    { id: 'wrist', text: 'slot.wrist', icon: '⌚' }
  ];

  EP.data.rarities = {
    comum: { text: 'rarity.comum', color: '#9aa5b1', order: 0 },
    raro: { text: 'rarity.raro', color: '#3ba0ff', order: 1 },
    epico: { text: 'rarity.epico', color: '#b06bff', order: 2 },
    lendario: { text: 'rarity.lendario', color: '#ffb020', order: 3 }
  };

  // atributos (pontos inteiros nos itens) e o efeito de cada ponto
  EP.data.stats = [
    { id: 'speed', text: 'stat.speed', icon: '⚡', max: 20 },
    { id: 'energy', text: 'stat.energy', icon: '🔋', max: 20 },
    { id: 'recovery', text: 'stat.recovery', icon: '💚', max: 20 },
    { id: 'flow', text: 'stat.flow', icon: '🌀', max: 20 },
    { id: 'flowWindow', text: 'stat.flowWindow', icon: '🎯', max: 20 },
    { id: 'flowBonus', text: 'stat.flowBonus', icon: '🎵', max: 20 },
    { id: 'efficiency', text: 'stat.efficiency', icon: '🍃', max: 20 },
    { id: 'offline', text: 'stat.offline', icon: '🌙', max: 20 }
  ];
  // Itens melhores facilitam, mas não substituem a habilidade (GDD §43):
  // um conjunto lendário completo dá uns +10% de velocidade, não o dobro.
  EP.data.statEffects = {
    speed: 0.008,        // velocidade alvo e máxima ×(1 + 0,008 por ponto)
    energy: 3,           // +3 de energia máxima por ponto
    recovery: 0.03,      // recuperação ×(1 + 0,03 por ponto)
    flow: 0.04,          // FLOW sobe 4% mais rápido e escorre 4% mais devagar por ponto
    flowWindow: 0.03,    // janelas de PERFECT e GREAT 3% maiores por ponto
    flowBonus: 0.04,     // moedas no FLOW +4% por ponto
    efficiency: 0.025,   // gasto de energia −2,5% por ponto (no máximo −35%)
    efficiencyCap: 0.35,
    offline: 0.5,        // +0,5 h de limite offline por ponto
    offlineRate: 0.03    // e +3% de ritmo offline por ponto
  };

  EP.data.shopCategories = [
    { id: 'tenis', slots: ['shoes'], text: 'shop.cat.tenis', icon: '👟' },
    { id: 'roupas', slots: ['shirt', 'shorts'], text: 'shop.cat.roupas', icon: '👕' },
    { id: 'bones', slots: ['head'], text: 'shop.cat.bones', icon: '🧢' },
    { id: 'oculos', slots: ['eyes'], text: 'shop.cat.oculos', icon: '🕶️' },
    { id: 'fones', slots: ['ears'], text: 'shop.cat.fones', icon: '🎧' },
    { id: 'relogios', slots: ['wrist'], text: 'shop.cat.relogios', icon: '⌚' }
  ];

  // presente de boas-vindas (uma vez por save) para estrear a loja
  EP.data.welcomeGift = 300;

  // Progresso offline (GDD §45–47): o corredor "continua treinando" enquanto o
  // jogo está fechado, num ritmo bem menor que o seu (20–40%) e com limite.
  EP.data.offline = {
    baseHours: 8,        // relógios aumentam
    minMinutes: 5,       // menos que isso não conta
    rateOfAvg: 0.25,     // fração da sua velocidade média de corrida
    defaultAvgKmh: 9,
    maxKmh: 3,           // teto do ritmo offline (8 h ≈ 24 km no máximo)
    coinsPerKm: 28,      // GDD: 4,7 km → +135 moedas
    xpPerKm: 40
  };
})(window.EP);
