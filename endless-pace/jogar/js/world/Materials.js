// Materiais compartilhados e a curvatura do mundo (GDD §60: poucos shaders,
// materiais compartilhados).
//
// Curvatura: em vez de modelar curvas e subidas de verdade, o vértice é
// deslocado no shader conforme a distância à frente da câmera. A rua parece
// fazer curvas e o horizonte "cai" como um planeta pequeno, mas a lógica do
// jogo continua numa linha reta (barato e sem erro de posição).
(function (EP) {
  'use strict';

  var BEND = {
    uBendX: { value: 0 },        // curva lateral (sinal = direção)
    uBendY: { value: 0.00032 },  // queda do horizonte
    uBendOrigin: { value: 0 }    // z da câmera
  };

  var VERT_DECL = 'uniform float uBendX;\nuniform float uBendY;\nuniform float uBendOrigin;\n';
  var PROJECT = [
    'vec4 mvPosition = vec4( transformed, 1.0 );',
    '#ifdef USE_INSTANCING',
    '  mvPosition = instanceMatrix * mvPosition;',
    '#endif',
    'vec4 bendW = modelMatrix * mvPosition;',
    'float bendD = max( 0.0, uBendOrigin - bendW.z );',
    'bendW.x += uBendX * bendD * bendD;',
    'bendW.y -= uBendY * bendD * bendD;',
    'mvPosition = viewMatrix * bendW;',
    'gl_Position = projectionMatrix * mvPosition;'
  ].join('\n');

  function bend(shader) {
    shader.uniforms.uBendX = BEND.uBendX;
    shader.uniforms.uBendY = BEND.uBendY;
    shader.uniforms.uBendOrigin = BEND.uBendOrigin;
    shader.vertexShader = VERT_DECL + shader.vertexShader.replace('#include <project_vertex>', PROJECT);
  }

  function bent(material) {
    material.onBeforeCompile = bend;
    return material;
  }

  var M = EP.Materials = {
    BEND: BEND,
    bent: bent,
    // quality: 'low' usa luz por vértice (mais leve); as outras, luz por pixel (formas lisas)
    init: function (quality) {
      var lite = quality === 'low';
      var surface = function (opts) {
        return lite ? new THREE.MeshLambertMaterial(opts)
          : new THREE.MeshPhongMaterial(Object.assign({ specular: new THREE.Color(0x0b0b0b), shininess: 14 }, opts));
      };
      // cenário: cores por vértice, um material só para quase tudo
      M.world = bent(surface({ vertexColors: true }));
      // luzes: janelas e lâmpadas (acendem à noite pela cor do material)
      M.glow = bent(new THREE.MeshBasicMaterial({ vertexColors: true }));
      // água: brilhante
      M.water = bent(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: new THREE.Color('#bfe6ff') }));
      // corredores: pele e tecido com um brilho leve
      M.runner = bent(surface({ vertexColors: true, specular: new THREE.Color(0x161616), shininess: 22 }));
      // sombra redonda embaixo de cada corredor
      M.shadow = bent(new THREE.MeshBasicMaterial({ map: M.blobTexture(), color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }));
      // sombras suaves do cenário (árvores, postes, prédios), num objeto só por módulo
      M.shadowDecal = bent(new THREE.MeshBasicMaterial({ map: M.blobTexture(), color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      // poças de luz dos postes à noite (somam luz no chão)
      M.lightPool = bent(new THREE.MeshBasicMaterial({ alphaMap: M.blobTexture(true), color: new THREE.Color('#ffb860').convertSRGBToLinear(), transparent: true,
        opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      return M;
    },
    // degradê redondo (transparente na borda) para as sombras
    blobTexture: function (gray) {
      var key = gray ? '_blobGray' : '_blob';
      if (M[key]) return M[key];
      var c = document.createElement('canvas');
      c.width = c.height = 64;
      var g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      if (gray) {   // alphaMap usa o canal verde: branco no centro, preto na borda
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#8a8a8a'); grad.addColorStop(1, '#000000');
      } else {
        grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.55, 'rgba(0,0,0,0.7)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      }
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      M[key] = new THREE.CanvasTexture(c);
      return M[key];
    },
    // placa com texto (canvas): material próprio, também curvado
    sign: function (canvas) {
      var tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 4;
      tex.encoding = THREE.sRGBEncoding;
      return bent(new THREE.MeshBasicMaterial({ map: tex }));
    }
  };
})(window.EP);
