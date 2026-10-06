// MINI-DESAFIOS (GDD §22)
// Cada desafio aponta para um tipo (avaliador em js/systems/ChallengeManager.js).
// tiers: a meta sobe a cada vez que você completa aquele desafio. Para PACE,
// cada meta é [segundos, velocidade alvo]. weight: chance relativa de aparecer.
// minSpeed: só começa se você já estiver nessa velocidade (evita sprint parado).
(function (EP) {
  EP.data.challenges = {
    firstAt: 160,              // metros na primeira corrida
    every: [420, 700],         // metros entre um desafio e o próximo
    list: [
      { id: 'flow', type: 'perfectStreak', tiers: [10, 15, 20, 25], timeLimit: 40, reward: { coins: 30, xp: 50 }, text: 'ch.flow', weight: 1.4 },
      { id: 'pace', type: 'pace', tiers: [[12, 11], [15, 12], [18, 13], [20, 14]], timeLimit: 45, reward: { coins: 35, xp: 60 }, text: 'ch.pace', minLevel: 1 },
      { id: 'overtake', type: 'overtake', tiers: [5, 7, 9, 12], timeLimit: 40, reward: { coins: 35, xp: 60 }, text: 'ch.overtake', minSpeed: 9 },
      { id: 'combo', type: 'combo', tiers: [3, 4, 5, 6], timeLimit: 45, reward: { coins: 40, xp: 70 }, text: 'ch.combo', minLevel: 3, minSpeed: 10 },
      { id: 'energy', type: 'energy', tiers: [15, 20, 25, 30], timeLimit: 50, reward: { coins: 35, xp: 60 }, text: 'ch.energy', minLevel: 2 },
      { id: 'sprint', type: 'sprint', tiers: [200], timeLimit: 45, reward: { coins: 45, xp: 80 }, text: 'ch.sprint', minLevel: 2, minSpeed: 10 },
      { id: 'draft', type: 'draft', tiers: [6, 9, 12, 15], timeLimit: 45, reward: { coins: 40, xp: 70 }, text: 'ch.draft', minLevel: 3, minSpeed: 9 },
      // PACER (GDD §23): um corredor-guia com colete e bandeirinha aparece à frente
      { id: 'pacer', type: 'pacer', tiers: [400, 600, 800, 1000], pacerSpeed: [11, 12, 13, 14], timeLimit: 200, reward: { coins: 70, xp: 100 }, text: 'ch.pacer', minLevel: 2, minSpeed: 8, weight: 1.3 }
    ]
  };

  // VÁCUO (GDD §24): logo atrás de outro corredor o vento é menor.
  EP.data.draft = {
    behind: [0.9, 3.4],        // metros atrás do corredor da frente
    side: 0.55,                // desalinhamento lateral máximo
    minSpeed: 8,               // só vale correndo
    rampIn: 0.6,               // segundos para o efeito entrar inteiro
    consumption: 0.7,          // gasta 30% menos energia
    speedBonus: 0.5            // e ganha +0,5 km/h
  };
})(window.EP);
