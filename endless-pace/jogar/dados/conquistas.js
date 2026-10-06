// CONQUISTAS (GDD §50–52). As de distância mostram contexto real: a distância
// acumulada comparada a lugares e jornadas conhecidas. Os valores vêm das
// fontes em ref.source (conferidas em outubro de 2026); para corrigir, mude
// só aqui. cond é avaliada pelo AchievementManager (totalDistance em metros).
(function (EP) {
  function a(id, cat, icon, cond, coins, xp, ref) {
    var o = { id: id, cat: cat, icon: icon, cond: cond, text: 'ach.' + id, reward: { coins: coins, xp: xp } };
    if (ref) o.ref = ref;
    return o;
  }
  var KM = function (km) { return { stat: 'totalDistance', gte: km * 1000 }; };
  EP.data.achievementCats = [
    { id: 'distancia', text: 'achcat.distancia', icon: '🗺️' },
    { id: 'corrida', text: 'achcat.corrida', icon: '🏃' },
    { id: 'ritmo', text: 'achcat.ritmo', icon: '🎵' },
    { id: 'desafio', text: 'achcat.desafio', icon: '🎯' },
    { id: 'colecao', text: 'achcat.colecao', icon: '🎒' },
    { id: 'exploracao', text: 'achcat.exploracao', icon: '🧭' }
  ];
  EP.data.achievements = [
    // DISTÂNCIA ACUMULADA (jornada do corredor)
    a('primeiro-km', 'distancia', '👟', KM(1), 20, 40),
    a('5km', 'distancia', '🏅', KM(5), 40, 80),
    a('10km', 'distancia', '🎽', KM(10), 60, 120),
    a('ponte-rio-niteroi', 'distancia', '🌉', KM(13.29), 80, 150, { km: 13.29, source: 'https://www.portaldotransito.com.br/noticias/veja-quais-sao-as-10-maiores-pontes-do-brasil/' }),
    a('meia-maratona', 'distancia', '🥈', KM(21.0975), 100, 200, { km: 21.0975, source: 'https://worldathletics.org/disciplines/road-running/half-marathon' }),
    a('maratona', 'distancia', '🥇', KM(42.195), 150, 300, { km: 42.195, source: 'https://worldathletics.org/disciplines/road-running/marathon' }),
    a('ultra-100', 'distancia', '💯', KM(100), 250, 450),
    a('sp-rio', 'distancia', '🚌', KM(430), 400, 700, { km: 430, source: 'https://www.google.com/maps/dir/S%C3%A3o+Paulo/Rio+de+Janeiro' }),
    a('1000km', 'distancia', '🛣️', KM(1000), 600, 900),
    a('oiapoque-chui', 'distancia', '🇧🇷', KM(4176), 900, 1200, { km: 4176, source: 'https://www.distanciascidades.com/distancia-oiapoque-chui-36538.html' }),
    a('rio-amazonas', 'distancia', '🌊', KM(6400), 1100, 1400, { km: 6400, source: 'https://www.britannica.com/place/Amazon-River' }),
    a('litoral-brasil', 'distancia', '🏖️', KM(7367), 1200, 1500, { km: 7367, source: 'https://anuario.ibge.gov.br/images/aeb/2024/s1/2_pdf/s1t1202.pdf' }),
    a('transiberiana', 'distancia', '🚂', KM(9289), 1400, 1700, { km: 9289, source: 'https://www.britannica.com/topic/Trans-Siberian-Railroad' }),
    a('muralha-china', 'distancia', '🧱', KM(21196), 1700, 2000, { km: 21196, source: 'https://www.livescience.com/20840-great-wall-china-long-thought.html' }),
    a('volta-ao-mundo', 'distancia', '🌎', KM(40075), 2500, 3000, { km: 40075, source: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html' }),
    a('ate-a-lua', 'distancia', '🌙', KM(384400), 10000, 10000, { km: 384400, source: 'https://science.nasa.gov/moon/facts/' }),

    // CORRIDA
    a('primeira-corrida', 'corrida', '🎬', { stat: 'runs', gte: 1 }, 20, 30),
    a('10-corridas', 'corrida', '🔁', { stat: 'runs', gte: 10 }, 80, 120),
    a('100-corridas', 'corrida', '🏟️', { stat: 'runs', gte: 100 }, 500, 600),
    a('corrida-5km', 'corrida', '🛤️', { record: 'longestRun', gte: 5000 }, 120, 200),
    a('corrida-10km', 'corrida', '⛰️', { record: 'longestRun', gte: 10000 }, 250, 400),
    a('veloz-18', 'corrida', '💨', { record: 'topSpeed', gte: 18 }, 60, 100),
    a('veloz-22', 'corrida', '🚀', { record: 'topSpeed', gte: 22 }, 200, 300),
    a('ultrapassa-1', 'corrida', '➡️', { stat: 'overtakes', gte: 1 }, 10, 20),
    a('ultrapassa-100', 'corrida', '🏃', { stat: 'overtakes', gte: 100 }, 80, 120),
    a('ultrapassa-1000', 'corrida', '🌪️', { stat: 'overtakes', gte: 1000 }, 300, 400),
    a('ultrapassa-10000', 'corrida', '🌟', { stat: 'overtakes', gte: 10000 }, 1500, 1500),
    a('dias-3', 'corrida', '📅', { stat: 'daysPlayed', gte: 3 }, 60, 80),
    a('dias-7', 'corrida', '🗓️', { stat: 'daysPlayed', gte: 7 }, 150, 200),
    a('dias-30', 'corrida', '🏆', { stat: 'daysPlayed', gte: 30 }, 700, 800),

    // RITMO
    a('perfect-100', 'ritmo', '✨', { stat: 'perfects', gte: 100 }, 40, 60),
    a('perfect-1000', 'ritmo', '💫', { stat: 'perfects', gte: 1000 }, 150, 250),
    a('perfect-10000', 'ritmo', '🌠', { stat: 'perfects', gte: 10000 }, 800, 1000),
    a('flow-4', 'ritmo', '🌀', { record: 'maxFlow', gte: 4 }, 60, 100),
    a('flow-8', 'ritmo', '🔥', { record: 'maxFlow', gte: 8 }, 200, 300),
    a('flow-12', 'ritmo', '👑', { record: 'maxFlow', gte: 12 }, 600, 700),
    a('combo-5', 'ritmo', '🎯', { record: 'maxCombo', gte: 5 }, 60, 100),
    a('combo-10', 'ritmo', '🎆', { record: 'maxCombo', gte: 10 }, 200, 300),

    // DESAFIOS
    a('desafio-1', 'desafio', '✅', { stat: 'challengesCompleted', gte: 1 }, 30, 50),
    a('desafio-10', 'desafio', '🎖️', { stat: 'challengesCompleted', gte: 10 }, 150, 250),
    a('desafio-50', 'desafio', '🏵️', { stat: 'challengesCompleted', gte: 50 }, 600, 700),
    a('sprint-40', 'desafio', '⏱️', { recordLte: 'sprint200', lte: 40 }, 80, 120),
    a('sprint-32', 'desafio', '⚡', { recordLte: 'sprint200', lte: 32 }, 300, 400),
    a('pacer-1', 'desafio', '🚩', { stat: 'pacersCompleted', gte: 1 }, 60, 100),
    a('pacer-10', 'desafio', '🎌', { stat: 'pacersCompleted', gte: 10 }, 300, 400),
    a('vacuo-300', 'desafio', '🌬️', { stat: 'draftTime', gte: 300 }, 120, 200),

    // COLEÇÃO
    a('primeiro-item', 'colecao', '🛍️', { items: 1 }, 30, 50),
    a('10-itens', 'colecao', '🎒', { items: 10 }, 300, 400),
    a('lendario', 'colecao', '💎', { rarity: 'lendario' }, 500, 600),
    a('nivel-5', 'colecao', '⭐', { level: 5 }, 100, 0),
    a('nivel-10', 'colecao', '🌟', { level: 10 }, 300, 0),
    a('nivel-25', 'colecao', '🏆', { level: 25 }, 1000, 0),

    // EXPLORAÇÃO
    a('regiao-2', 'exploracao', '🧭', { biomes: 2 }, 150, 200),
    a('regiao-4', 'exploracao', '🗺️', { biomes: 4 }, 500, 600),
    a('regiao-8', 'exploracao', '🌐', { biomes: 8 }, 2000, 2000),
    a('offline-10', 'exploracao', '💤', { stat: 'offlineDistance', gte: 10000 }, 100, 150)
  ];
})(window.EP);
