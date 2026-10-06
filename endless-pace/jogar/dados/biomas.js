// BIOMAS (GDD §27, §75) E CICLO DE DIA E NOITE (§31)
// O MVP tem só a cidade. Um bioma novo é um item novo nesta lista, com os seus
// módulos (dados/modulos.js), cores e iluminação.
(function (EP) {
  EP.data.biomes = [
    {
      id: 'cidade',
      text: 'biome.cidade',
      requiredDistance: 0,       // km acumulados para desbloquear
      startRoute: 'bairro',
      palette: {
        asphalt: '#4d5260', asphaltAlt: '#555a68', line: '#f3efe2', curb: '#e6e1d6',
        sidewalk: '#cfc8ba', sidewalkAlt: '#c4bdae', ground: '#8fbf6e', lot: '#b9b2a2',
        grass: '#86c06a', grassAlt: '#7ab25f', path: '#96604c', water: '#4fb0d8', stone: '#a7a39a',
        facades: ['#f2d0a4', '#e8a87c', '#c9d6df', '#f6e7cb', '#a8d5ba', '#f7b7a3', '#d4c1ec', '#ffe0ac', '#bfe0e8'],
        towers: ['#9fb6cd', '#c7d3dd', '#7d93ab', '#e0d6c8', '#b8c4b0', '#d9c2b0'],
        roofs: ['#b5543c', '#9a4a36', '#5b6574', '#7a5a48'],
        awnings: ['#ff6a3d', '#2fb5ff', '#20c997', '#ffd23f', '#ff4f6d'],
        trunk: '#7a5236', leaves: ['#4fa65a', '#5cb85c', '#3f9a50', '#6cc26a'], blossom: ['#ff8fb8', '#ffd23f', '#c792ea'],
        metal: '#5d6470', wood: '#b07a4f', skyline: '#9aaccc'
      },
      // conjuntos de peças (as peças são desenhadas em js/world/Assets.js)
      buildings: ['casa', 'sobrado', 'predio-baixo', 'predio-alto', 'loja'],
      vegetation: ['redonda', 'pinheiro', 'palmeira', 'arbusto', 'florida'],
      props: ['poste', 'banco', 'lixeira', 'placa', 'hidrante'],
      lighting: 'padrao',
      weatherOptions: ['sol'],
      musicProfile: 'cidade'
    }
  ];

  EP.data.dayNight = {
    cycleSeconds: 600,          // um dia inteiro em 10 minutos de corrida
    startPhase: 0.27,           // primeira corrida: de manhã
    newDayFrom: 0.84, newDayTo: 0.18, newDayPhase: 0.2,   // corrida nova no meio da noite começa ao amanhecer
    // fase (0–1 do dia) → cores. glow = luzes acesas (janelas, postes) de 0 a 1
    keys: [
      { t: 0.00, id: 'noite', top: '#0b1530', horizon: '#26365f', fog: '#1e2b4c', sun: '#8fa6ff', sunI: 0.38, hemiSky: '#6377b0', hemiGround: '#1f2538', hemiI: 0.62, glow: 1 },
      { t: 0.20, id: 'amanhecer', top: '#40609e', horizon: '#ffb48c', fog: '#e9b9a0', sun: '#ffb070', sunI: 0.8, hemiSky: '#a7bbe2', hemiGround: '#6d5c58', hemiI: 0.78, glow: 0.45 },
      { t: 0.30, id: 'manha', top: '#3d8fe0', horizon: '#c2e4ff', fog: '#d2e8f6', sun: '#fff1d6', sunI: 1.12, hemiSky: '#d2e9ff', hemiGround: '#8e8b72', hemiI: 0.86, glow: 0 },
      { t: 0.50, id: 'tarde', top: '#2f7fd6', horizon: '#acd9ff', fog: '#c6e2f5', sun: '#ffffff', sunI: 1.2, hemiSky: '#d6ecff', hemiGround: '#908d76', hemiI: 0.9, glow: 0 },
      { t: 0.68, id: 'por-do-sol', top: '#4c509c', horizon: '#ff9a5c', fog: '#f0aa86', sun: '#ff8a4a', sunI: 0.92, hemiSky: '#cfa4c4', hemiGround: '#5c4b52', hemiI: 0.74, glow: 0.55 },
      { t: 0.80, id: 'anoitecer', top: '#1d2752', horizon: '#6b5190', fog: '#4b4a7a', sun: '#a492ff', sunI: 0.48, hemiSky: '#8a86c8', hemiGround: '#2a2a42', hemiI: 0.66, glow: 0.9 }
    ],
    fog: { near: 26, far: 150 }
  };
})(window.EP);
