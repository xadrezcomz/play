// MINI-DESAFIOS (GDD §22)
// O MVP tem um desafio. O ChallengeManager (js/systems/ChallengeManager.js)
// já aceita tipos novos: um tipo é um avaliador registrado lá; um desafio é
// um item desta lista.
(function (EP) {
  EP.data.challenges = {
    firstAt: 160,              // metros na primeira corrida
    every: [450, 750],         // metros entre um desafio e o próximo
    list: [
      {
        id: 'flow',
        type: 'perfectStreak', // PERFECT seguidos
        tiers: [10, 15, 20],   // meta sobe a cada vez que você completa
        timeLimit: 40,
        reward: { coins: 30 },
        text: 'ch.flow'
      }
    ]
  };
})(window.EP);
