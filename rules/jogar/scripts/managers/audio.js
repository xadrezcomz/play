// AudioManager: todos os sons são sintetizados na hora (Web Audio), então o
// jogo não baixa nenhum arquivo de áudio. Para trocar por arquivos depois,
// basta mudar SOUNDS: o resto do jogo só chama RULES.Audio.play('nome').
(function () {
  'use strict';
  var R = window.RULES;
  var ctx = null, master, sfxBus, musicBus, noiseBuf;
  var musicTimer = null, musicNext = 0, musicStep = 0;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function tone(o) {
    var t0 = ctx.currentTime + (o.delay || 0), len = o.t || 0.12;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + len);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.v || 0.2, t0 + (o.a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + len + 0.05);
  }

  function noise(o) {
    var t0 = ctx.currentTime + (o.delay || 0), len = o.t || 0.2;
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(o.f || 800, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + len);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.v || 0.15, t0 + len * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t0); src.stop(t0 + len + 0.05);
  }

  var SOUNDS = {
    tap: function () { tone({ f: 640, f2: 520, t: 0.07, v: 0.18 }); },
    pop: function () { tone({ f: 320, f2: 880, t: 0.09, v: 0.28 }); tone({ f: 1320, t: 0.05, v: 0.06, delay: 0.05 }); },
    drag: function () { tone({ type: 'triangle', f: 380, f2: 460, t: 0.07, v: 0.1 }); },
    drop: function () { tone({ type: 'triangle', f: 300, f2: 220, t: 0.08, v: 0.14 }); },
    click: function () { tone({ type: 'square', f: 1400, f2: 900, t: 0.025, v: 0.05 }); tone({ type: 'square', f: 900, f2: 700, t: 0.025, v: 0.04, delay: 0.06 }); },
    collision: function () { tone({ f: 190, f2: 90, t: 0.16, v: 0.3 }); noise({ f: 400, t: 0.08, v: 0.08 }); },
    fail: function () { tone({ type: 'triangle', f: 392, t: 0.12, v: 0.14 }); tone({ type: 'triangle', f: 311, t: 0.18, v: 0.14, delay: 0.11 }); },
    ruli: function () { tone({ f: 700, f2: 1150, t: 0.08, v: 0.13 }); tone({ f: 1050, f2: 900, t: 0.1, v: 0.11, delay: 0.08 }); },
    whoosh: function () { noise({ f: 500, f2: 2400, t: 0.22, v: 0.12 }); },
    scale: function (p) { tone({ type: 'sine', f: 300 + 500 * (p || 0.5), t: 0.04, v: 0.05 }); },
    success: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone({ type: 'triangle', f: f, t: 0.22, v: 0.16, delay: i * 0.07 });
        tone({ f: f * 2, t: 0.12, v: 0.04, delay: i * 0.07 });
      });
    }
  };

  // Trilha minimalista: plucks numa escala pentatônica sobre 4 acordes.
  var CHORDS = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]];
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  var STEP = 0.3;
  function midiHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function scheduleMusic() {
    while (musicNext < ctx.currentTime + 0.4) {
      var bar = Math.floor(musicStep / 8) % CHORDS.length, pos = musicStep % 8;
      var chord = CHORDS[bar];
      if (pos === 0) tone({ type: 'sine', f: midiHz(48 + chord[0]), t: 1.9, v: 0.07, a: 0.05, bus: musicBus, delay: musicNext - ctx.currentTime });
      if (pos % 2 === 0 || Math.random() < 0.35) {
        var n = Math.random() < 0.6 ? chord[Math.floor(Math.random() * 3)] : PENTA[Math.floor(Math.random() * PENTA.length)];
        tone({ type: 'sine', f: midiHz(72 + n), t: 0.45, v: 0.035, a: 0.01, bus: musicBus, delay: musicNext - ctx.currentTime });
      }
      musicNext += STEP; musicStep++;
    }
  }

  R.Audio = {
    unlocked: false,

    // Navegadores só liberam áudio depois de um toque.
    unlock: function () {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!this.unlocked) {
        this.unlocked = true;
        if (R.Save.setting('music')) this.startMusic();
      }
    },

    play: function (name, arg) {
      if (!R.Save.setting('sfx') || !ctx || !this.unlocked || !SOUNDS[name]) return;
      try { SOUNDS[name](arg); } catch (e) { /* ignora */ }
    },

    startMusic: function () {
      if (!ctx || musicTimer || !R.Save.setting('music')) return;
      musicNext = ctx.currentTime + 0.1;
      musicTimer = setInterval(scheduleMusic, 120);
    },
    stopMusic: function () { clearInterval(musicTimer); musicTimer = null; },

    setMusic: function (on) {
      R.Save.setSetting('music', on);
      if (on) { this.unlock(); this.startMusic(); } else this.stopMusic();
    },

    suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume: function () { if (ctx && this.unlocked) ctx.resume(); },

    vibrate: function (ms) {
      if (!R.Save.setting('vibration') || !navigator.vibrate) return;
      try { navigator.vibrate(ms); } catch (e) { /* ignora */ }
    }
  };
})();
