// ForkSigns — as placas da bifurcação (GDD §20), desenhadas num canvas com o
// texto no idioma do jogador. Vão presas no pórtico do módulo "bifurcacao".
(function (EP) {
  'use strict';
  var COLORS = { parque: '#2e9e5b', centro: '#2d6fd2', bairro: '#8a5cd6' };

  function draw(canvas, routeId, side) {
    var r = EP.data.routes[routeId], t = EP.i18n.t, g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);
    g.fillStyle = COLORS[routeId] || '#444';
    g.fillRect(10, 10, W - 20, H - 20);
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    var title = '"Chakra Petch","Exo 2",system-ui,sans-serif', body = '"Exo 2",system-ui,sans-serif';
    g.font = '700 92px ' + body;
    g.textAlign = 'center';
    g.fillText(side < 0 ? '←' : '→', side < 0 ? 70 : W - 70, 66);
    g.font = '96px ' + body;
    g.fillText(r.icon, side < 0 ? W - 84 : 84, 70);
    g.font = '700 64px ' + title;
    g.fillText(t(r.text), W / 2, 72);
    g.font = '600 38px ' + body;
    (r.perks || []).forEach(function (p, i) { g.fillText(t(p), W / 2, 150 + i * 48); });
  }

  var cache = {};
  EP.ForkSigns = {
    // grupo de placas de uma bifurcação (um por bifurcação, reaproveitado)
    get: function (fork) { return cache[fork.id] || (cache[fork.id] = EP.ForkSigns.create(fork)); },
    refreshAll: function () { for (var k in cache) EP.ForkSigns.refresh(cache[k]); EP.RegionSign.refreshAll(); },
    create: function (fork) {
      var group = new THREE.Group(), geo = new THREE.PlaneGeometry(3.9, 1.95);
      group.userData.canvases = [];
      [[-1, fork.left], [1, fork.right]].forEach(function (p) {
        var canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 256;
        draw(canvas, p[1], p[0]);
        var mesh = new THREE.Mesh(geo, EP.Materials.sign(canvas));
        mesh.position.set(p[0] * 2.35, 4.95, -10.05);
        mesh.frustumCulled = false;
        group.add(mesh);
        group.userData.canvases.push({ canvas: canvas, route: p[1], side: p[0], mesh: mesh });
      });
      return group;
    },
    // redesenha (troca de idioma ou fontes carregadas)
    refresh: function (group) {
      group.userData.canvases.forEach(function (c) {
        draw(c.canvas, c.route, c.side);
        c.mesh.material.map.needsUpdate = true;
      });
    }
  };

  // Placa de boas-vindas ao entrar numa região (GDD §29): pórtico com o nome.
  var regionCache = {};
  function drawRegion(canvas, biome) {
    var t = EP.i18n.t, g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, c = (biome.sign && biome.sign.color) || '#ff6a3d';
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.fillStyle = c; g.fillRect(10, 10, W - 20, H - 20);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
    g.font = '600 40px "Exo 2",system-ui,sans-serif';
    g.fillText(t('region.welcome'), W / 2, 62);
    g.font = '700 92px "Chakra Petch","Exo 2",system-ui,sans-serif';
    g.fillText(((biome.sign && biome.sign.icon) ? biome.sign.icon + ' ' : '') + t(biome.text).toUpperCase(), W / 2, 150);
  }
  EP.RegionSign = {
    get: function (biome) {
      if (regionCache[biome.id]) return regionCache[biome.id];
      var group = new THREE.Group(), canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 220;
      drawRegion(canvas, biome);
      var M = EP.Materials, pole = new THREE.CylinderGeometry(0.16, 0.2, 7.2, 10);
      var postMat = M.bent(new THREE.MeshPhongMaterial({ color: new THREE.Color('#e9edf2').convertSRGBToLinear(), shininess: 30 }));
      [-1, 1].forEach(function (s) {
        var p = new THREE.Mesh(pole, postMat); p.position.set(s * 5.4, 3.6, -6); p.frustumCulled = false; group.add(p);
      });
      var board = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 2.24), M.sign(canvas));
      board.position.set(0, 6.3, -6); board.frustumCulled = false;
      group.add(board);
      group.userData = { canvas: canvas, biome: biome, board: board };
      regionCache[biome.id] = group;
      return group;
    },
    refreshAll: function () {
      for (var k in regionCache) { var u = regionCache[k].userData; drawRegion(u.canvas, u.biome); u.board.material.map.needsUpdate = true; }
    }
  };
})(window.EP);
