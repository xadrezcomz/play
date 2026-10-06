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
    uBendOrigin: { value: 0 },   // z da câmera
    // neblina com luz: olhando para o sol, a névoa fica dourada (atmosfera barata)
    uSunView: { value: new THREE.Vector3(0, 0.3, -1) },   // direção do sol no espaço da câmera
    uSunFog: { value: new THREE.Color(1, 0.8, 0.6) }
  };

  var VERT_DECL = 'uniform float uBendX;\nuniform float uBendY;\nuniform float uBendOrigin;\nvarying vec3 vFogDir;\n';
  var FRAG_DECL = 'uniform vec3 uSunView;\nuniform vec3 uSunFog;\nvarying vec3 vFogDir;\n';
  var FOG = [
    '#ifdef USE_FOG',
    '  float fogFactor = smoothstep( fogNear, fogFar, fogDepth );',
    '  float sunAmt = pow( max( dot( normalize( vFogDir ), uSunView ), 0.0 ), 5.0 );',
    '  gl_FragColor.rgb = mix( gl_FragColor.rgb, mix( fogColor, uSunFog, sunAmt * 0.5 ), fogFactor );',
    '#endif'
  ].join('\n');
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
    'gl_Position = projectionMatrix * mvPosition;',
    'vFogDir = mvPosition.xyz;'
  ].join('\n');

  function bend(shader) {
    shader.uniforms.uBendX = BEND.uBendX;
    shader.uniforms.uBendY = BEND.uBendY;
    shader.uniforms.uBendOrigin = BEND.uBendOrigin;
    shader.uniforms.uSunView = BEND.uSunView;
    shader.uniforms.uSunFog = BEND.uSunFog;
    shader.vertexShader = VERT_DECL + shader.vertexShader.replace('#include <project_vertex>', PROJECT);
    shader.fragmentShader = FRAG_DECL + shader.fragmentShader.replace('#include <fog_fragment>', FOG);
    if (this.rim) {   // luz de contorno (corredores): borda dourada contra o sol
      shader.uniforms.uRim = BEND.uRim;
      shader.fragmentShader = 'uniform vec3 uRim;\n' + shader.fragmentShader.replace('#include <aomap_fragment>',
        '#include <aomap_fragment>\n  float rimF = pow( 1.0 - max( dot( normalize( vViewPosition ), normal ), 0.0 ), 3.0 );\n' +
        '  reflectedLight.indirectDiffuse += uRim * rimF * diffuseColor.rgb * ( 0.6 + 0.4 * max( dot( normal, uSunView ), 0.0 ) );');
    }
  }

  BEND.uRim = { value: new THREE.Color(0.5, 0.4, 0.3) };
  BEND.tDetail = { value: null };
  BEND.uTime = { value: 0 };
  BEND.uSkyRefl = { value: new THREE.Color(0.6, 0.75, 0.9) };

  // água: ondinhas animadas na normal (sem geometria) e reflexo do céu nas
  // bordas (fresnel); o sol faz o brilho pelo especular do Phong
  function watery(material) {
    material.onBeforeCompile = function (shader) {
      bend.call(material, shader);
      shader.uniforms.uTime = BEND.uTime;
      shader.uniforms.uSkyRefl = BEND.uSkyRefl;
      shader.vertexShader = 'varying vec3 vWaterP;\n' + shader.vertexShader.replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWaterP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = 'uniform float uTime;\nuniform vec3 uSkyRefl;\nvarying vec3 vWaterP;\n' + shader.fragmentShader
        .replace('#include <normal_fragment_begin>', [
          '#include <normal_fragment_begin>',
          'vec2 wp = vWaterP.xz; float wt = uTime;',
          'vec3 wn = vec3( sin( wp.x * 0.8 + wt * 1.1 ) * 0.07 + sin( wp.y * 1.9 - wt * 1.3 ) * 0.05 + sin( ( wp.x + wp.y ) * 4.1 + wt * 2.3 ) * 0.025, 1.0,',
          '  cos( wp.y * 1.2 + wt * 0.9 ) * 0.07 + sin( ( wp.x - wp.y ) * 2.7 - wt * 1.7 ) * 0.04 + cos( wp.x * 5.3 - wt * 2.0 ) * 0.02 );',
          'normal = normalize( mat3( viewMatrix ) * normalize( wn ) );'
        ].join('\n'))
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n  float wfr = pow( 1.0 - max( dot( normalize( vViewPosition ), normal ), 0.0 ), 4.0 );\n  reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse, uSkyRefl, clamp( wfr * 1.3, 0.0, 0.85 ) );');
    };
    material.customProgramCacheKey = function () { return 'water'; };
    return material;
  }

  // textura de detalhe: canal escolhido pelo atributo "detail"; projeção pelo
  // plano mais alinhado à superfície (chão: xz; paredes: xy ou zy)
  var DET_VERT = 'attribute float detail;\nvarying float vDetail;\nvarying vec3 vWP;\nvarying vec3 vWN;\n';
  var DET_FRAG = 'uniform sampler2D tDetail;\nvarying float vDetail;\nvarying vec3 vWP;\nvarying vec3 vWN;\n';
  var DET_APPLY = [
    '#include <color_fragment>',
    'if ( vDetail > 0.5 ) {',
    '  vec3 an = abs( vWN );',
    '  vec2 duv = an.y > 0.6 ? vWP.xz : ( an.x > an.z ? vWP.zy : vWP.xy );',
    '  float dk;',
    '  if ( vDetail < 1.5 ) dk = 0.62 + 0.85 * texture2D( tDetail, duv * 0.09 ).r;',
    '  else if ( vDetail < 2.5 ) dk = 0.55 + 0.95 * texture2D( tDetail, duv * 0.5 ).g;',
    '  else if ( vDetail < 3.5 ) dk = 0.62 + 0.8 * texture2D( tDetail, duv * 0.3 ).b;',
    '  else dk = 0.78 + 0.45 * texture2D( tDetail, duv * 0.22 ).a;',
    '  diffuseColor.rgb *= dk;',
    '}'
  ].join('\n');
  function detailed(material) {
    material.onBeforeCompile = function (shader) {
      bend.call(material, shader);
      shader.uniforms.tDetail = BEND.tDetail;
      shader.vertexShader = DET_VERT + shader.vertexShader.replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvDetail = detail;\nvWP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvWN = normalize( mat3( modelMatrix ) * objectNormal );');
      shader.fragmentShader = DET_FRAG + shader.fragmentShader.replace('#include <color_fragment>', DET_APPLY);
    };
    material.customProgramCacheKey = function () { return 'detail'; };
    return material;
  }

  function bent(material, rim) {
    material.rim = !!rim;
    material.onBeforeCompile = bend;
    if (rim) material.customProgramCacheKey = function () { return 'rim'; };
    return material;
  }

  // Curva de tons + "color grading" do jogo inteiro, sem passe extra de tela:
  // ACES ajustado (mais saturado que o ACES padrão do three), saturação um
  // pouco acima e um S suave de contraste. Vale para todos os materiais.
  var GRADE = [
    'vec3 CustomToneMapping( vec3 color ) {',
    '  color *= toneMappingExposure;',
    '  vec3 c = clamp( ( color * ( 2.51 * color + 0.03 ) ) / ( color * ( 2.43 * color + 0.59 ) + 0.14 ), 0.0, 1.0 );',
    '  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );',
    '  c = mix( vec3( l ), c, 1.1 );',
    '  c = mix( c, c * c * ( 3.0 - 2.0 * c ), 0.22 );',
    '  c *= vec3( 1.015, 1.0, 0.975 );',
    '  return clamp( c, 0.0, 1.0 );',
    '}'
  ].join('\n');
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace('vec3 CustomToneMapping( vec3 color ) { return color; }', GRADE);

  var M = EP.Materials = {
    BEND: BEND,
    bent: bent,
    // quality: 'low' usa luz por vértice (mais leve); as outras, luz por pixel (formas lisas)
    init: function (quality) {
      var lite = quality === 'low';
      BEND.tDetail.value = EP.Textures.detail();
      var surface = function (opts) {
        return lite ? new THREE.MeshLambertMaterial(opts)
          : new THREE.MeshPhongMaterial(Object.assign({ specular: new THREE.Color(0x0b0b0b), shininess: 14 }, opts));
      };
      // cenário: cores por vértice, um material só para quase tudo, com a textura
      // de detalhe (asfalto, placas, grama, reboco) projetada pela posição no mundo
      M.world = detailed(surface({ vertexColors: true }));
      // folhagem: cartões recortados do atlas (copas, flores, grama), dos dois lados
      M.leaf = bent(surface({ vertexColors: true, map: EP.Textures.foliage(), alphaTest: 0.5, side: THREE.DoubleSide }));
      // vidro: opaco, escuro, com reflexo do céu pintado e brilho do sol
      M.glass = bent(lite ? new THREE.MeshLambertMaterial({ vertexColors: true })
        : new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: new THREE.Color('#9fb7c9') }));
      // faixas da marca nos postes
      M.banner = bent(surface({ map: EP.Textures.banners(), side: THREE.DoubleSide }));
      // luzes: janelas e lâmpadas (acendem à noite pela cor do material)
      M.glow = bent(new THREE.MeshBasicMaterial({ vertexColors: true }));
      // água: brilhante
      M.water = lite ? bent(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: new THREE.Color('#bfe6ff') }))
        : watery(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 120, specular: new THREE.Color('#fff1d6') }));
      // corredores: pele e tecido com um brilho leve
      M.runner = bent(surface({ vertexColors: true, specular: new THREE.Color(0x161616), shininess: 22 }), !lite);
      M.runnerSkin = bent(surface({ vertexColors: true, skinning: true, specular: new THREE.Color(0x161616), shininess: 22 }), !lite);
      // sombra redonda embaixo de cada corredor
      M.shadow = bent(new THREE.MeshBasicMaterial({ map: M.blobTexture(), color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }));
      // sombra de contato do jogador (a sombra de verdade vem do sol)
      M.shadowSoft = lite ? M.shadow : bent(new THREE.MeshBasicMaterial({ map: M.blobTexture(), color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
      // sombras suaves do cenário (árvores, postes, prédios), num objeto só por módulo
      M.shadowDecal = bent(new THREE.MeshBasicMaterial({ map: EP.Textures.shadow(), color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false,
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
