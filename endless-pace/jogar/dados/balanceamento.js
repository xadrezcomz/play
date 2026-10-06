// BALANCEAMENTO DA CORRIDA
// Todos os números que decidem o "feeling" ficam aqui. Mudar um valor muda o
// jogo sem mexer na lógica (js/systems/). Velocidades em km/h, tempos em
// segundos, distâncias em metros, energia de 0 a 100.
(function (EP) {
  EP.data.balance = {
    speed: {
      min: 4,                // caminhada mínima: o corredor nunca para
      maxBase: 20,           // teto sem bônus
      // toques por segundo → velocidade alvo
      tapCurve: [[0, 4], [0.7, 5], [1.1, 7], [1.5, 9], [1.9, 11], [2.4, 13], [2.9, 15], [3.4, 17], [4.0, 19], [5.0, 21]],
      accel: 3.0,            // km/h ganhos por segundo ao acelerar
      decel: 1.4,            // km/h perdidos por segundo ao parar de tocar (gradual)
      lowEnergyCap: 7,       // com a energia zerada, no máximo 7 km/h...
      lowEnergyUntil: 25,    // ...até a energia voltar a 25
      flowBonusPerLevel: 0.02, flowBonusMaxLevel: 4   // +2% por nível de FLOW (até ×4)
    },

    // faixas de ritmo: nome mostrado, câmera e música
    zones: [
      { id: 'walk', from: 0 },
      { id: 'jog', from: 6.5 },
      { id: 'run', from: 9.5 },
      { id: 'fast', from: 13.5 },
      { id: 'sprint', from: 17.5 }
    ],

    energy: {
      max: 100,
      // velocidade → energia por segundo (positivo recupera, negativo gasta)
      // caminhada recupera bem, trote pouco, corrida normal fica estável,
      // corrida forte gasta e sprint gasta muito
      rate: [[4, 7], [6.5, 4.5], [9.5, 1.2], [11.5, 0], [13.5, -1.2], [17.5, -4], [21, -8]],
      spamCost: 0.6,         // gasto extra por toque descontrolado
      flowSavingPerLevel: 0.08, flowSavingMaxLevel: 4   // FLOW gasta 8% menos por nível (até 32%)
    },

    rhythm: {
      // desvio do intervalo entre toques em relação ao seu ritmo atual:
      // fração do intervalo, com um piso em segundos (toque em tela tem atraso)
      perfect: { rel: 0.07, abs: 0.028 },
      great: { rel: 0.14, abs: 0.05 },
      good: { rel: 0.24, abs: 0.085 },
      emaAlpha: 0.35,        // quão rápido o "seu ritmo" acompanha uma mudança de passada
      resetGap: 1.6,         // sem tocar por mais que isso, o ritmo recomeça do zero
      warmupTaps: 2,         // toques para medir o ritmo antes de avaliar
      spamInterval: 0.16,    // toques mais rápidos que isso são descontrole: no máximo GOOD
      ignoreBelow: 0.045     // toques quase juntos (dois dedos) contam como um
    },

    flow: {
      gain: { perfect: 1, great: 0.25, good: -2, off: -5 },
      idleDecay: 3,          // pontos perdidos por segundo sem tocar
      thresholds: [5, 10, 20, 30],   // GDD §8: 5 PERFECT ×1, 10 ×2, 20 ×3, 30 ×4
      extraEvery: 15,        // depois de ×4, mais um nível a cada 15 pontos
      maxLevel: 12,
      maxPoints: 200,
      hysteresis: 2          // folga para o nível não piscar na divisa
    },

    economy: {
      metersPerCoin: 50,     // 20 moedas por km, antes dos bônus
      overtakeCoins: 1,
      comboWindow: 4,        // segundos entre ultrapassagens para manter o combo
      comboBonus: 1,         // moedas extras por passo de combo
      flowCoinPerLevel: 0.25, flowCoinMaxLevel: 4   // FLOW ×4 = moedas ×2
    },

    camera: {
      // por velocidade: distância atrás, altura, campo de visão (graus)
      walk: { dist: 3.4, height: 1.95, fov: 60 },
      sprint: { dist: 4.6, height: 2.25, fov: 70 },
      flowFov: 1.2,          // graus extras por nível de FLOW (até ×4)
      portraitFovBoost: 12   // celular em pé: mais campo de visão
    },

    run: {
      saveEvery: 10,         // salva o progresso a cada 10 s de corrida
      laneStep: 1.25,        // metros por deslize lateral
      laneLimit: 3.3,        // até onde o corredor vai para cada lado
      lateralSpeed: 5.5      // rapidez do movimento lateral
    }
  };
})(window.EP);
