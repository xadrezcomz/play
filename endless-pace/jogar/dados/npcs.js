// CORREDORES DA RUA (GDD §13 e §15)
// Os nomes das categorias são internos e não aparecem para o jogador.
(function (EP) {
  EP.data.npcs = {
    poolSize: 22,            // corredores reaproveitados (nunca cria/destrói durante a corrida)
    baseCount: 10,           // quantos ao mesmo tempo, antes da densidade da rota e do módulo
    categories: [
      // speed: faixa em km/h · weight: peso no começo da corrida → peso depois de warmupDistance
      { id: 'walker', speed: [4.3, 6], weight: [3, 1.2] },
      { id: 'beginner', speed: [7, 9], weight: [3, 2] },
      { id: 'runner', speed: [10, 12], weight: [1.4, 3] },
      { id: 'fast', speed: [13, 16], weight: [0.3, 1.4] },
      { id: 'elite', speed: [17, 19.5], weight: [0.05, 0.5] }
    ],
    warmupDistance: 1200,    // no começo há mais gente devagar: a primeira ultrapassagem vem cedo
    spawnAhead: [125, 150],  // aparecem lá na frente, dentro da neblina
    spawnBehind: [-34, -26], // os mais rápidos que você chegam por trás
    despawnBehind: -40,
    despawnAhead: 165,
    group: { chance: 0.16, size: [3, 5], speed: [10.5, 11.5] },  // grupos de corrida
    wobble: 0.6,             // variação lenta de velocidade (km/h): uns cansam, outros apertam
    spawnInterval: 0.35      // segundos entre um corredor novo e outro
  };
})(window.EP);
