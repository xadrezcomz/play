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
    // conjuntos dos corredores da rua: [camiseta, short/legging, tênis, detalhe do tênis]
    // paleta esportiva (azul, verde, vermelho, laranja, branco, preto, cinza, rosa, roxo) em combinações que combinam
    npcKits: [
      ['#2f6fd6', '#1f2430', '#f2f3f5', '#2f6fd6'], ['#e9ecef', '#2a3142', '#3a4250', '#ff6a3d'], ['#1f9e6e', '#22262e', '#f2f3f5', '#1f9e6e'],
      ['#d9434f', '#1d2129', '#f4f4f4', '#d9434f'], ['#ff8a3d', '#2b3140', '#ffffff', '#ff8a3d'], ['#e85d9a', '#26232e', '#f7f2f6', '#e85d9a'],
      ['#7a5ad6', '#1e1d2b', '#ecebf3', '#7a5ad6'], ['#2b2f38', '#2b2f38', '#f2f2f2', '#ff4f6d'], ['#8a929e', '#20242c', '#ffffff', '#20c997'],
      ['#f4f4f2', '#4a5568', '#e8ecf2', '#3ba0ff'], ['#3ba0ff', '#f2f3f5', '#3ba0ff', '#ffffff'], ['#c6e85a', '#22262e', '#2b2f38', '#c6e85a'],
      ['#f6c443', '#2d3340', '#f4f4f4', '#2d3340'], ['#4fb3c8', '#24303a', '#ffffff', '#ff8a3d'], ['#b23a48', '#e9e9e9', '#f4f4f4', '#b23a48'],
      ['#ffb3c8', '#3d3a4e', '#ffffff', '#e85d9a']
    ],
    defaults: { gender: 'm', skin: 1, hairStyle: 'curto', hairColor: 1, shirt: 0, shorts: 0, shoes: 0 },
    nameMax: 15
  };
})(window.EP);
