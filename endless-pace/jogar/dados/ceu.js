// CÉU: CICLO DE DIA E NOITE (GDD §31)
// Cores de cada momento do dia (escritas como no CSS; o jogo converte para a
// luz linear). Cada bioma pode tingir o céu em lighting (dados do bioma).
(function (EP) {
  EP.data.dayNight = {
    cycleSeconds: 600,          // um dia inteiro em 10 minutos de corrida
    startPhase: 0.27,           // primeira corrida: de manhã
    newDayFrom: 0.84, newDayTo: 0.18, newDayPhase: 0.2,   // corrida nova no meio da noite começa ao amanhecer
    // fase (0–1 do dia) → cores. glow = luzes acesas (janelas, postes) de 0 a 1
    keys: [
      { t: 0.00, id: 'noite', top: '#0a1838', horizon: '#2b3f6e', fog: '#24345a', sun: '#9fb4ff', sunI: 0.55, hemiSky: '#5f78b8', hemiGround: '#1d2236', hemiI: 0.55, glow: 1 },
      { t: 0.20, id: 'amanhecer', top: '#3d5fa8', horizon: '#ffc29a', fog: '#f2c6aa', sun: '#ffb27a', sunI: 1.2, hemiSky: '#aac0ea', hemiGround: '#6d5c58', hemiI: 0.6, glow: 0.4 },
      { t: 0.30, id: 'manha', top: '#2f86e6', horizon: '#bfe2ff', fog: '#cfe6f8', sun: '#fff0d2', sunI: 1.75, hemiSky: '#cfe6ff', hemiGround: '#8a8a6c', hemiI: 0.62, glow: 0 },
      { t: 0.50, id: 'tarde', top: '#2479de', horizon: '#a8d6ff', fog: '#c3e0f6', sun: '#fff8ea', sunI: 1.85, hemiSky: '#d2eaff', hemiGround: '#8e8a70', hemiI: 0.62, glow: 0 },
      { t: 0.68, id: 'por-do-sol', top: '#4a55a8', horizon: '#ffa766', fog: '#f5b48c', sun: '#ff9a52', sunI: 1.45, hemiSky: '#d6a8c8', hemiGround: '#5c4b52', hemiI: 0.56, glow: 0.5 },
      { t: 0.80, id: 'anoitecer', top: '#1c2a5e', horizon: '#7a5a9c', fog: '#56528a', sun: '#b0a0ff', sunI: 0.7, hemiSky: '#8a86c8', hemiGround: '#2a2a42', hemiI: 0.55, glow: 0.9 }
    ],
    fog: { near: 48, far: 175 }
  };
})(window.EP);
