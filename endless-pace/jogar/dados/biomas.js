// BIOMA CIDADE (GDD §27, §75) — a região inicial.
// Cada região mora no seu próprio arquivo e entra no registro EP.data.biomes
// (as outras ficam em dados/biomas/). Os módulos de rua da cidade estão em
// dados/modulos.js.
(function (EP) {
  EP.data.biomes = EP.data.biomes || [];
  EP.data.biomes.push(
    {
      id: 'cidade',
      text: 'biome.cidade',
      requiredDistance: 0,       // km acumulados para desbloquear
      startRoute: 'bairro',
      palette: {
        asphalt: '#56555a', asphaltAlt: '#5c5b60', line: '#efe9dc', curb: '#ddd6c9',
        sidewalk: '#d6cfc2', sidewalkAlt: '#c9c1b2', ground: '#88b062', lot: '#b3ab9c',
        grass: '#79a352', grassAlt: '#70994b', path: '#c2a27e', water: '#4fb0d8', stone: '#a7a39a',
        facades: ['#f3d9b1', '#eab48f', '#cfdde6', '#f7ecd6', '#b5dcc4', '#f5c2b0', '#dccdf0', '#ffe6b8', '#c8e6ec', '#f0d0d8'],
        towers: ['#9fb6cd', '#c7d3dd', '#7d93ab', '#e0d6c8', '#b8c4b0', '#d9c2b0'],
        roofs: ['#b5543c', '#9a4a36', '#5b6574', '#7a5a48'],
        awnings: ['#ff6a3d', '#2fb5ff', '#20c997', '#ffd23f', '#ff4f6d'],
        trunk: '#6f5440', leaves: ['#6e9e4a', '#7aa84e', '#5f9147', '#86b057', '#6a9a52', '#8fb35a'], blossom: ['#ffa3c4', '#ffd447', '#d7a3f0', '#ff9e7a'],
        metal: '#5d6470', wood: '#b07a4f', skyline: '#9aaccc'
      },
      // conjuntos de peças (as peças são desenhadas em js/world/Assets.js)
      buildings: ['casa', 'sobrado', 'predio-baixo', 'predio-alto', 'loja'],
      vegetation: ['redonda', 'pinheiro', 'palmeira', 'arbusto', 'florida'],
      props: ['poste', 'banco', 'lixeira', 'placa', 'hidrante'],
      lighting: 'padrao',
      // ao fundo: morros e, do lado do rio, o horizonte de prédios da cidade
      backdrop: { city: true, hills: '#7fae6a', hillsAlt: '#93bb78', mountains: '#9aaecb' },
      weatherOptions: ['sol'],
      musicProfile: 'cidade'
    }
  );

})(window.EP);
