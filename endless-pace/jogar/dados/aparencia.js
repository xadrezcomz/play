// APARÊNCIA DO CORREDOR (GDD §4 e §80)
// Poucas opções bem feitas. Para pôr uma cor ou um cabelo novo, acrescente aqui
// e o texto do nome em dados/textos/.
(function (EP) {
  EP.data.appearance = {
    genders: [
      // proporções estilizadas: altura total e larguras em metros
      { id: 'm', text: 'gender.m', body: { height: 1.76, shoulders: 0.42, waist: 0.31, hips: 0.32 }, hairStyle: 'curto' },
      { id: 'f', text: 'gender.f', body: { height: 1.68, shoulders: 0.36, waist: 0.27, hips: 0.33 }, hairStyle: 'rabo' }
    ],
    skin: ['#f6d3b8', '#e8b48e', '#c98d62', '#9c6643', '#6a4029'],
    hairStyles: [
      { id: 'curto', text: 'hair.curto' },
      { id: 'cacheado', text: 'hair.cacheado' },
      { id: 'rabo', text: 'hair.rabo' },
      { id: 'coque', text: 'hair.coque' },
      { id: 'longo', text: 'hair.longo' },
      { id: 'raspado', text: 'hair.raspado' }
    ],
    hairColors: ['#1e1814', '#4b2f1c', '#8b5a32', '#d8b26a', '#a9452b'],
    // roupa inicial: camiseta, short e tênis básicos (as cores são a escolha)
    shirts: ['#ff6a3d', '#2fb5ff', '#9be22d', '#ffd23f', '#f2f2f2', '#b46bff'],
    shorts: ['#22283a', '#3b4a6b', '#e9e9e9', '#c43b3b'],
    shoes: ['#f4f4f4', '#ff4f6d', '#20c997', '#2b2f3a'],
    // cores extras só para os corredores da rua (variedade)
    npcShirts: ['#e85d75', '#ff9f43', '#10ac84', '#5f27cd', '#0abde3', '#ee5253', '#feca57', '#1dd1a1', '#576574', '#c8d6e5'],
    npcShorts: ['#222f3e', '#576574', '#8395a7', '#341f97', '#10ac84', '#2d3436'],
    npcShoes: ['#ffffff', '#ff6b6b', '#48dbfb', '#feca57', '#222f3e', '#1dd1a1'],
    defaults: { gender: 'm', skin: 1, hairStyle: 'curto', hairColor: 1, shirt: 0, shorts: 0, shoes: 0 },
    nameMax: 15
  };
})(window.EP);
