// AudioManager + MusicLayerManager — sons e a trilha que você constrói
// correndo (GDD §34–36). Tudo é sintetizado na hora (Web Audio): nenhum
// arquivo para baixar.
//
// Cada toque é uma batida. Fora do FLOW só a batida e os passos. Com FLOW
// entram camadas: ×1 baixo, ×2 chimbal no contratempo, ×3 acordes, ×4 arpejo,
// ×6 caixa. Quanto mais regular o ritmo, mais rica fica a música.
(function (EP) {
  'use strict';
  var ctx = null, master, sfx, music, amb, noise, ambNodes = null;
  var on = { music: true, sfx: true };
  // progressão I–vi–IV–V em dó (frequência da tônica de cada acorde)
  var CHORDS = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]];
  var tapN = 0, birdTimer = 0, route = 'bairro';

  function now() { return ctx.currentTime; }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(dest, type, freq, t, a, peak, d, freqEnd) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + a + d);
    env(g, t, a, peak, d);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + d + 0.05);
  }

  function burst(dest, t, d, peak, filterType, freq, q) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    f.type = filterType; f.frequency.value = freq; f.Q.value = q || 0.8;
    env(g, t, 0.003, peak, d);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
  }

  var A = EP.AudioManager = {
    ready: function () { return !!ctx; },
    // o navegador só libera o som depois de um toque: chamado no primeiro toque
    unlock: function () {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { ctx = new AC(); } catch (e) { return; }
        var comp = ctx.createDynamicsCompressor();
        comp.connect(ctx.destination);
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
        sfx = ctx.createGain(); sfx.connect(master);
        music = ctx.createGain(); music.connect(master);
        amb = ctx.createGain(); amb.gain.value = 0; amb.connect(sfx);
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        var ch = noise.getChannelData(0);
        for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        A.apply();
      }
      if (ctx.state === 'suspended') ctx.resume();
    },
    set: function (settings) { on.music = settings.music; on.sfx = settings.sfx; A.apply(); },
    apply: function () {
      if (!ctx) return;
      sfx.gain.value = on.sfx ? 1 : 0;
      music.gain.value = on.music ? 0.8 : 0;
    },
    suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume(); },

    // toque: batida + camadas conforme o FLOW
    tap: function (rating, flowLevel, interval) {
      if (!ctx) return;
      var t = now() + 0.005, iv = Math.max(0.16, Math.min(1.2, interval || 0.5));
      // batida (o passo que você dá)
      tone(sfx, 'sine', rating === 'perfect' ? 150 : 120, t, 0.003, 0.5, 0.14, 45);
      burst(sfx, t, 0.03, 0.12, 'lowpass', 1800);
      // brilho da avaliação
      if (rating === 'perfect') tone(sfx, 'triangle', 1318.5, t, 0.004, 0.08, 0.12);
      else if (rating === 'great') tone(sfx, 'triangle', 987.8, t, 0.004, 0.05, 0.09);
      else if (rating === 'off') tone(sfx, 'square', 160, t, 0.004, 0.03, 0.08, 110);
      if (!flowLevel) { tapN = 0; return; }
      var bar = Math.floor(tapN / 4) % 4, beat = tapN % 4, chord = CHORDS[bar];
      tapN++;
      // ×1 baixo
      var bass = [chord[0] / 2, chord[0] / 2, chord[2] / 2, chord[0]][beat];
      tone(music, 'triangle', bass / 2, t, 0.01, 0.22, Math.min(0.35, iv * 0.8));
      // ×2 chimbal no contratempo
      if (flowLevel >= 2) burst(music, t + iv / 2, 0.05, 0.07, 'highpass', 7000);
      // ×3 acorde no começo de cada compasso
      if (flowLevel >= 3 && beat === 0) chord.forEach(function (f, i) { tone(music, 'triangle', f, t + i * 0.012, 0.01, 0.06, iv * 2.2); });
      // ×4 arpejo entre as batidas
      if (flowLevel >= 4) {
        tone(music, 'sine', chord[(beat + 1) % 3] * 2, t + iv / 4, 0.005, 0.05, iv * 0.35);
        tone(music, 'sine', chord[(beat + 2) % 3] * 2, t + iv * 3 / 4, 0.005, 0.045, iv * 0.35);
      }
      // ×6 caixa nos tempos 2 e 4
      if (flowLevel >= 6 && beat % 2 === 1) { burst(music, t, 0.12, 0.12, 'bandpass', 1900, 0.7); tone(music, 'triangle', 220, t, 0.002, 0.06, 0.08, 140); }
    },

    step: function (speed) {
      if (!ctx) return;
      var t = now();
      burst(sfx, t, 0.05, 0.035 + Math.min(speed, 20) * 0.002, 'lowpass', route === 'parque' ? 700 : 1100);
    },
    overtake: function (combo) {
      if (!ctx) return;
      var t = now();
      burst(sfx, t, 0.22, 0.05, 'bandpass', 900 + Math.min(combo, 10) * 120, 1.2);
      if (combo > 1) tone(sfx, 'sine', 660 * Math.pow(1.06, Math.min(combo, 12)), t + 0.02, 0.005, 0.07, 0.15);
    },
    coin: function () {
      if (!ctx) return;
      var t = now();
      tone(sfx, 'square', 1567.98, t, 0.003, 0.025, 0.05);
      tone(sfx, 'square', 2093.0, t + 0.05, 0.003, 0.025, 0.09);
    },
    flowUp: function (level) {
      if (!ctx) return;
      var t = now(), base = 523.25 * Math.pow(1.122, Math.min(level, 8));
      [1, 1.25, 1.5].forEach(function (m, i) { tone(sfx, 'triangle', base * m, t + i * 0.06, 0.005, 0.07, 0.25); });
    },
    flowLost: function () {
      if (!ctx) return;
      tone(sfx, 'sine', 440, now(), 0.01, 0.06, 0.35, 220);
    },
    challenge: function (ok) {
      if (!ctx) return;
      var t = now(), notes = ok ? [523.25, 659.25, 783.99, 1046.5] : [392, 329.63];
      notes.forEach(function (f, i) { tone(sfx, 'triangle', f, t + i * 0.09, 0.005, 0.09, ok ? 0.3 : 0.25); });
    },
    ui: function () {
      if (!ctx) return;
      tone(sfx, 'sine', 880, now(), 0.003, 0.05, 0.06);
    },

    // som ambiente da rota (cidade, parque) e vento conforme a velocidade
    ambience: function (active, routeId) {
      if (!ctx) return;
      route = routeId || route;
      if (active && !ambNodes) {
        var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), w = ctx.createBiquadFilter(), wg = ctx.createGain(), cg = ctx.createGain();
        s.buffer = noise; s.loop = true;
        f.type = 'lowpass'; f.frequency.value = 380; cg.gain.value = 0.6;
        w.type = 'bandpass'; w.frequency.value = 600; w.Q.value = 0.5; wg.gain.value = 0;
        s.connect(f); f.connect(cg); cg.connect(amb);
        s.connect(w); w.connect(wg); wg.connect(amb);
        s.start();
        ambNodes = { src: s, wind: wg, city: cg };
      }
      amb.gain.setTargetAtTime(active ? 0.05 : 0, now(), 0.6);
    },
    // chamado a cada quadro durante a corrida
    tick: function (dt, speedIntensity) {
      if (!ctx || !ambNodes) return;
      ambNodes.wind.gain.setTargetAtTime(speedIntensity * speedIntensity * 0.9, now(), 0.3);
      ambNodes.city.gain.setTargetAtTime(route === 'parque' ? 0.25 : 0.6, now(), 1);
      birdTimer -= dt;
      if (birdTimer <= 0) {
        birdTimer = route === 'parque' ? 1.5 + Math.random() * 3 : 5 + Math.random() * 8;
        var t = now(), f = 2400 + Math.random() * 1600;
        for (var i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(sfx, 'sine', f, t + i * 0.11, 0.005, 0.02, 0.07, f * 1.3);
      }
    }
  };

  // vibração curta (opção nas configurações)
  EP.haptics = {
    enabled: true,
    pulse: function (ms) {
      if (!EP.haptics.enabled || !navigator.vibrate) return;
      try { navigator.vibrate(ms); } catch (e) { /* sem vibração */ }
    }
  };
})(window.EP);
