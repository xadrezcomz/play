// ITENS: equipamentos da loja (GDD §37–43).
// Balanço: na corrida se ganha ~20 moedas/km (até ~40 com FLOW), mais
// ultrapassagens, desafios e missões. Uma sessão de 5–10 min rende ~100–250.
// Comum ≈ 1–2 sessões · raro ≈ 4–6 · épico ≈ 12–20 · lendário ≈ 35–50.
// Pontos de atributo por raridade: comum 2–3, raro 5–6, épico 8–10, lendário 12–14.
// O visual (visual.kind) é desenhado pelo corredor em js/runner/RunnerRig.js.
(function (EP) {
  function it(id, slot, rarity, price, stats, visual, extra) {
    var o = { id: id, slot: slot, rarity: rarity, price: price, text: 'item.' + id, stats: stats, visual: visual };
    for (var k in extra || {}) o[k] = extra[k];
    return o;
  }
  EP.data.items = [
    // iniciais: a roupa da criação (cor escolhida pelo jogador)
    it('camiseta-basica', 'shirt', 'comum', 0, {}, { kind: 'camiseta', color: 'perfil' }, { starter: true }),
    it('short-basico', 'shorts', 'comum', 0, {}, { kind: 'short', color: 'perfil' }, { starter: true }),
    it('tenis-basico', 'shoes', 'comum', 0, {}, { kind: 'tenis', color: 'perfil' }, { starter: true }),

    // TÊNIS (velocidade e eficiência)
    it('tenis-leve', 'shoes', 'comum', 180, { speed: 2 }, { kind: 'tenis', color: '#e8ecf2', accent: '#ff6a3d' }),
    it('tenis-asfalto', 'shoes', 'comum', 240, { speed: 2, efficiency: 1 }, { kind: 'tenis', color: '#3a4250', accent: '#c6ff3d' }),
    it('tenis-tropical', 'shoes', 'comum', 260, { speed: 2, flow: 1 }, { kind: 'tenis-corrida', color: '#20c997', accent: '#ffd23f' }, { set: 'tropical' }),
    it('tenis-pista', 'shoes', 'comum', 320, { speed: 3 }, { kind: 'tenis-corrida', color: '#ff4f6d', accent: '#ffffff' }),
    it('tenis-nuvem', 'shoes', 'raro', 850, { speed: 4, efficiency: 2 }, { kind: 'tenis-corrida', color: '#f4f6fb', accent: '#3ba0ff' }, { set: 'nuvem' }),
    it('tenis-brisa', 'shoes', 'raro', 780, { speed: 3, efficiency: 2, recovery: 1 }, { kind: 'tenis-corrida', color: '#9fe3ff', accent: '#ffffff' }),
    it('tenis-urbano', 'shoes', 'raro', 900, { speed: 4, efficiency: 1, energy: 1 }, { kind: 'tenis', color: '#1f2430', accent: '#ff9a3d' }),
    it('tenis-trilha', 'shoes', 'raro', 950, { speed: 3, efficiency: 3 }, { kind: 'tenis-corrida', color: '#6b7d3c', accent: '#ff8a3d' }, { set: 'montanha' }),
    it('tenis-cometa', 'shoes', 'epico', 2400, { speed: 6, efficiency: 3 }, { kind: 'tenis-pro', color: '#2b2f6b', accent: '#ff6aa8' }, { set: 'cometa', minLevel: 5 }),
    it('tenis-aurora', 'shoes', 'epico', 2700, { speed: 5, efficiency: 3, flow: 1 }, { kind: 'tenis-pro', color: '#123b4a', accent: '#5dffc8' }, { set: 'aurora', minLevel: 6 }),
    it('tenis-maratona', 'shoes', 'epico', 3000, { speed: 5, efficiency: 4 }, { kind: 'tenis-pro', color: '#f2f2f2', accent: '#ff3d3d' }, { minLevel: 8 }),
    it('tenis-relampago', 'shoes', 'lendario', 7800, { speed: 8, efficiency: 5 }, { kind: 'tenis-pro', color: '#ffd23f', accent: '#ffffff' }, { minLevel: 12 }),

    // CAMISETAS (energia)
    it('camiseta-sol', 'shirt', 'comum', 170, { energy: 2 }, { kind: 'camiseta', color: '#ffc53d', accent: '#ff7a3d', pattern: 'faixa' }),
    it('camiseta-oceano', 'shirt', 'comum', 230, { energy: 2, recovery: 1 }, { kind: 'camiseta', color: '#2f8fdc', accent: '#ffffff', pattern: 'listras' }),
    it('regata-verao', 'shirt', 'comum', 280, { energy: 3 }, { kind: 'regata', color: '#ff7a8a', accent: '#ffffff' }),
    it('regata-tropical', 'shirt', 'raro', 760, { energy: 4, recovery: 1 }, { kind: 'regata', color: '#20c997', accent: '#ffd23f', pattern: 'degrade' }, { set: 'tropical' }),
    it('camiseta-listrada', 'shirt', 'raro', 820, { energy: 4, flow: 1 }, { kind: 'camiseta', color: '#ffffff', accent: '#1f6fd1', pattern: 'listras' }),
    it('manga-longa-neblina', 'shirt', 'raro', 980, { energy: 5, efficiency: 1 }, { kind: 'manga-longa', color: '#8ea4b8', accent: '#e8eef4' }, { set: 'montanha' }),
    it('corta-vento-aurora', 'shirt', 'epico', 2600, { energy: 6, recovery: 2, efficiency: 1 }, { kind: 'corta-vento', color: '#1d4f63', accent: '#5dffc8', pattern: 'degrade' }, { set: 'aurora', minLevel: 6 }),
    it('camiseta-neon', 'shirt', 'epico', 2300, { energy: 5, flowBonus: 2, efficiency: 1 }, { kind: 'camiseta', color: '#c6ff3d', accent: '#1d1f2b', pattern: 'faixa' }, { set: 'neon', minLevel: 4 }),
    it('corta-vento-cometa', 'shirt', 'lendario', 7200, { energy: 8, recovery: 3, efficiency: 2 }, { kind: 'corta-vento', color: '#2b2f6b', accent: '#ff6aa8', pattern: 'faixa' }, { set: 'cometa', minLevel: 12 }),

    // SHORTS (recuperação)
    it('short-classico', 'shorts', 'comum', 160, { recovery: 2 }, { kind: 'short', color: '#2a3550', accent: '#ffffff' }),
    it('short-corrida', 'shorts', 'comum', 230, { recovery: 2, energy: 1 }, { kind: 'short', color: '#1f8a5b', accent: '#c6ff3d', pattern: 'faixa' }),
    it('bermuda-praia', 'shorts', 'comum', 270, { recovery: 3 }, { kind: 'bermuda', color: '#ffb35c', accent: '#2fb5ff', pattern: 'listras' }, { set: 'tropical' }),
    it('legging-noite', 'shorts', 'raro', 820, { recovery: 4, energy: 1 }, { kind: 'legging', color: '#232838', accent: '#7aa7ff', pattern: 'faixa' }),
    it('saia-short-flor', 'shorts', 'raro', 780, { recovery: 4, efficiency: 1 }, { kind: 'saia-short', color: '#ff8fb8', accent: '#ffffff' }),
    it('short-pro', 'shorts', 'epico', 2200, { recovery: 6, energy: 2, efficiency: 1 }, { kind: 'short', color: '#111318', accent: '#ff6a3d', pattern: 'faixa' }, { minLevel: 5 }),
    it('legging-aurora', 'shorts', 'lendario', 6800, { recovery: 8, energy: 3, efficiency: 2 }, { kind: 'legging', color: '#123b4a', accent: '#5dffc8', pattern: 'degrade' }, { set: 'aurora', minLevel: 12 }),

    // CABEÇA (FLOW)
    it('bone-classico', 'head', 'comum', 150, { flow: 2 }, { kind: 'bone', color: '#e84f4f', accent: '#ffffff' }),
    it('viseira-sol', 'head', 'comum', 220, { flow: 2, recovery: 1 }, { kind: 'viseira', color: '#ffffff', accent: '#ff9a3d' }),
    it('faixa-suor', 'head', 'comum', 260, { flow: 3 }, { kind: 'faixa', color: '#3ba0ff', accent: '#ffffff' }),
    it('bandana-tropical', 'head', 'raro', 720, { flow: 4, energy: 1 }, { kind: 'bandana', color: '#20c997', accent: '#ffd23f' }, { set: 'tropical' }),
    it('gorro-montanha', 'head', 'raro', 760, { flow: 4, recovery: 2 }, { kind: 'gorro', color: '#c94f3a', accent: '#f4f1ea' }, { set: 'montanha' }),
    it('bone-aba-reta-neon', 'head', 'raro', 880, { flow: 5 }, { kind: 'bone-aba-reta', color: '#1d1f2b', accent: '#c6ff3d' }, { set: 'neon' }),
    it('viseira-pro', 'head', 'epico', 2300, { flow: 6, flowWindow: 2, recovery: 1 }, { kind: 'viseira', color: '#1d1f2b', accent: '#3ba0ff' }, { minLevel: 5 }),
    it('bone-aurora', 'head', 'lendario', 6500, { flow: 8, flowWindow: 3, flowBonus: 2 }, { kind: 'bone', color: '#123b4a', accent: '#5dffc8' }, { set: 'aurora', minLevel: 10 }),

    // ÓCULOS (janela do PERFECT)
    it('oculos-classico', 'eyes', 'comum', 170, { flowWindow: 2 }, { kind: 'oculos', color: '#3a2d26', lens: '#cfe8ff' }),
    it('oculos-sol-classico', 'eyes', 'comum', 240, { flowWindow: 2, flow: 1 }, { kind: 'oculos-sol', color: '#1d1f2b', lens: '#2a2f3a' }),
    it('oculos-esporte-azul', 'eyes', 'raro', 800, { flowWindow: 4, flow: 1 }, { kind: 'oculos-esporte', color: '#f4f6fb', lens: '#3ba0ff' }, { set: 'nuvem' }),
    it('oculos-sol-praia', 'eyes', 'raro', 760, { flowWindow: 4, energy: 1 }, { kind: 'oculos-sol', color: '#ff7a8a', lens: '#ffb35c' }, { set: 'tropical' }),
    it('oculos-esporte-cometa', 'eyes', 'epico', 2400, { flowWindow: 6, flow: 2, speed: 1 }, { kind: 'oculos-esporte', color: '#2b2f6b', lens: '#ff6aa8' }, { set: 'cometa', minLevel: 6 }),
    it('oculos-aurora', 'eyes', 'lendario', 6600, { flowWindow: 8, flow: 3, flowBonus: 2 }, { kind: 'oculos-esporte', color: '#123b4a', lens: '#5dffc8' }, { set: 'aurora', minLevel: 11 }),

    // FONES (bônus de FLOW)
    it('fone-sem-fio-branco', 'ears', 'comum', 180, { flowBonus: 2 }, { kind: 'fone-sem-fio', color: '#f4f6fb', accent: '#c9ced6' }),
    it('fone-classico', 'ears', 'comum', 250, { flowBonus: 2, flow: 1 }, { kind: 'fone', color: '#3a4250', accent: '#ff6a3d' }),
    it('fone-esporte-azul', 'ears', 'raro', 820, { flowBonus: 4, flow: 1 }, { kind: 'fone-esporte', color: '#3ba0ff', accent: '#ffffff' }, { set: 'nuvem' }),
    it('fone-neon', 'ears', 'raro', 900, { flowBonus: 5 }, { kind: 'fone', color: '#1d1f2b', accent: '#c6ff3d' }, { set: 'neon' }),
    it('fone-estudio', 'ears', 'epico', 2500, { flowBonus: 6, flow: 2, flowWindow: 1 }, { kind: 'fone', color: '#f2f2f2', accent: '#b06bff' }, { minLevel: 6 }),
    it('fone-aurora', 'ears', 'lendario', 6900, { flowBonus: 8, flow: 3, flowWindow: 2 }, { kind: 'fone', color: '#123b4a', accent: '#5dffc8' }, { set: 'aurora', minLevel: 12 }),

    // PULSO (progresso offline)
    it('pulseira-amizade', 'wrist', 'comum', 150, { offline: 2 }, { kind: 'pulseira', color: '#ff8fb8', accent: '#ffd23f' }),
    it('relogio-simples', 'wrist', 'comum', 230, { offline: 2, recovery: 1 }, { kind: 'relogio', color: '#3a4250', accent: '#e8ecf2' }),
    it('relogio-digital', 'wrist', 'raro', 780, { offline: 4, energy: 1 }, { kind: 'relogio', color: '#1d1f2b', accent: '#c6ff3d' }),
    it('pulseira-esporte', 'wrist', 'raro', 740, { offline: 3, recovery: 2 }, { kind: 'pulseira', color: '#20c997', accent: '#ffffff' }, { set: 'tropical' }),
    it('smartwatch-azul', 'wrist', 'epico', 2400, { offline: 6, speed: 1, energy: 2 }, { kind: 'smartwatch', color: '#1f6fd1', accent: '#9fe3ff' }, { set: 'nuvem', minLevel: 5 }),
    it('relogio-explorador', 'wrist', 'epico', 2800, { offline: 5, efficiency: 2, recovery: 2 }, { kind: 'relogio', color: '#6b7d3c', accent: '#ffd23f' }, { set: 'montanha', minLevel: 7 }),
    it('smartwatch-aurora', 'wrist', 'lendario', 7000, { offline: 8, speed: 2, efficiency: 2, recovery: 2 }, { kind: 'smartwatch', color: '#123b4a', accent: '#5dffc8' }, { set: 'aurora', minLevel: 12 })
  ];
})(window.EP);
