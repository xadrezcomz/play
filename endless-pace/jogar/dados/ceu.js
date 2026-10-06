// CÉU: CICLO DE DIA E NOITE (GDD §31)
// Cores de cada momento do dia (escritas como no CSS; o jogo converte para a
// luz linear). Cada bioma pode tingir o céu em lighting (dados do bioma).
(function (EP) {
  EP.data.dayNight = {
    cycleSeconds: 720,          // um dia inteiro em 12 minutos de corrida
    startPhase: 0.25,           // primeira corrida: manhã dourada
    newDayFrom: 0.84, newDayTo: 0.18, newDayPhase: 0.2,   // corrida nova no meio da noite começa ao amanhecer
    // fase (0–1 do dia) → cores. glow = luzes acesas (janelas, postes) de 0 a 1
    // haze: o brilho quente perto do sol (céu e neblina naquela direção) · rim: contorno dourado nos corredores
    keys: [
      { t: 0.00, id: 'noite', top: '#0a1838', horizon: '#2b3f6e', fog: '#24345a', haze: '#3a4d80', sun: '#9fb4ff', sunI: 0.55, hemiSky: '#5f78b8', hemiGround: '#1d2236', hemiI: 0.55, glow: 1, rim: 0.15 },
      { t: 0.20, id: 'amanhecer', top: '#4a72c4', horizon: '#ffd6ae', fog: '#ecd4bc', haze: '#ffb878', sun: '#ffb47e', sunI: 1.55, hemiSky: '#b4c8ee', hemiGround: '#7a6656', hemiI: 0.62, glow: 0.35, rim: 0.8 },
      { t: 0.30, id: 'manha', top: '#2f7ee0', horizon: '#c6def2', fog: '#cfdfea', haze: '#ffd497', sun: '#ffdcaa', sunI: 2.1, hemiSky: '#b4d2f2', hemiGround: '#8a7656', hemiI: 0.55, glow: 0, rim: 0.7 },
      { t: 0.50, id: 'tarde', top: '#2f7fe0', horizon: '#bfe0fa', fog: '#cde2f2', haze: '#ffeccf', sun: '#fff0da', sunI: 2.0, hemiSky: '#c8e2ff', hemiGround: '#968c70', hemiI: 0.6, glow: 0, rim: 0.5 },
      { t: 0.68, id: 'por-do-sol', top: '#5160b0', horizon: '#ffb47a', fog: '#f3bf9a', haze: '#ff9a55', sun: '#ffa45e', sunI: 1.65, hemiSky: '#d8b0c8', hemiGround: '#6a5450', hemiI: 0.58, glow: 0.45, rim: 0.9 },
      { t: 0.80, id: 'anoitecer', top: '#1c2a5e', horizon: '#7a5a9c', fog: '#56528a', haze: '#8a6aa8', sun: '#b0a0ff', sunI: 0.7, hemiSky: '#8a86c8', hemiGround: '#2a2a42', hemiI: 0.55, glow: 0.9, rim: 0.3 }
    ],
    fog: { near: 85, far: 290 }   // neblina leve: dá profundidade e esconde o fim do mundo
  };
})(window.EP);
