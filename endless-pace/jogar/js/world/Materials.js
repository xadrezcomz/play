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
    init: function () {
      // cenário: cores por vértice, um material só para quase tudo
      M.world = bent(new THREE.MeshLambertMaterial({ vertexColors: true }));
      // luzes: janelas e lâmpadas (acendem à noite pela cor do material)
      M.glow = bent(new THREE.MeshBasicMaterial({ vertexColors: true }));
      // água: um pouco brilhante
      M.water = bent(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 80, specular: new THREE.Color('#9fd8ff') }));
      // corredores
      M.runner = bent(new THREE.MeshLambertMaterial({ vertexColors: true }));
      // sombra redonda embaixo de cada corredor (mais barato que sombra de verdade)
      M.shadow = bent(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
      return M;
    },
    // placa com texto (canvas): material próprio, também curvado
    sign: function (canvas) {
      var tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 4;
      return bent(new THREE.MeshBasicMaterial({ map: tex }));
    }
  };
})(window.EP);
