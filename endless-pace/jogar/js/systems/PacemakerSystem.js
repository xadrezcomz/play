// PacemakerSystem — o corredor-guia (GDD §23). Durante o desafio PACER um
// corredor com colete e bandeirinha aparece à frente num ritmo fixo; o
// jogador acompanha. Ele usa um corredor do NPCManager (sem criar nada novo).
(function (EP) {
  'use strict';

  function PacemakerSystem(npcs) { this.npcs = npcs; this.npc = null; }
  var P = PacemakerSystem.prototype;

  // começa a 18 m à frente, um pouco mais rápido no início para abrir espaço
  P.start = function (player, speed) {
    this.stop();
    this.speed = speed;
    this.npc = this.npcs.spawnPacer(player, speed, 18);
    return this.npc;
  };

  P.stop = function () {
    if (this.npc) this.npcs.releasePacer(this.npc);
    this.npc = null;
  };

  // metros que o jogador está atrás do pacer (negativo: à frente); null sem pacer
  P.gap = function (player) {
    if (!this.npc || !this.npc.active) return null;
    return player.z - this.npc.z;
  };

  EP.PacemakerSystem = PacemakerSystem;
})(window.EP);
