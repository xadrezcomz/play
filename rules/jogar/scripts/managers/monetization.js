// Monetização futura: o jogo é construído sem ela, mas todas as decisões de
// "pode ou não pode" passam por aqui. Para ligar um modelo depois
// (fases 1–20 grátis, compra única, anúncio opcional só para dicas), basta
// mudar estas funções; nenhuma fase ou tela precisa ser reprogramada.
(function () {
  'use strict';
  var R = window.RULES;

  R.Monetization = {
    model: 'free',          // 'free' | 'premium-unlock' | 'hint-ads'
    freeLevelsUpTo: 20,     // usado só quando model = 'premium-unlock'
    ownsFullGame: false,

    isLevelPlayable: function (levelId) {
      if (this.model !== 'premium-unlock' || this.ownsFullGame) return true;
      return levelId <= this.freeLevelsUpTo;
    },

    // Dica 1 é sempre grátis. As outras poderão depender de anúncio/compra.
    canRevealHint: function (levelId, tier) {
      if (tier <= 1) return true;
      return this.model !== 'hint-ads' || this.ownsFullGame;
    },

    // Ponto de entrada para pedir a dica paga (anúncio, loja...). Hoje libera direto.
    requestHint: function (levelId, tier) { return Promise.resolve(true); }
  };
})();
