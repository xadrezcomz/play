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
    if (this.runnerU) runnerShader(shader, this.runnerU, this.lite);
    if (this.rim) {   // luz de contorno (corredores): borda dourada contra o sol
      shader.uniforms.uRim = BEND.uRim;
      shader.fragmentShader = 'uniform vec3 uRim;\n' + shader.fragmentShader.replace('#include <aomap_fragment>',
        '#include <aomap_fragment>\n  float rimF = pow( 1.0 - max( dot( normalize( vViewPosition ), normal ), 0.0 ), 3.0 );\n' +
        '  reflectedLight.indirectDiffuse += uRim * rimF * diffuseColor.rgb * ( 0.6 + 0.4 * max( dot( normal, uSunView ), 0.0 ) );');
    }
  }

  // ---------------------------------------------------------------- corredores
  // Os corredores assados (js/runner/ModelData.js) são uma malha só, com o espaço de cor de cada vértice
  // (pele, cabelo, camiseta, detalhe do tênis...) no atributo "slot" e a oclusão de ambiente já calculada
  // em "aov". A cor de cada espaço vem de uma paleta por corredor (uniform): a geometria de uma roupa é
  // a mesma para todos e só o material (barato) é de cada um. A pele usa a textura do corpo (tingida pelo
  // tom de pele da paleta) e, fora do modo leve, um mapa de normais suave.
  var RUN_NPAL = 24;   // espaços de cor na paleta (os dados usam 20; folga para dados novos)
  var RUN_VERT = 'attribute float mat;\nattribute float slot;\nattribute float aov;\nuniform vec3 uPal[ ' + RUN_NPAL + ' ];\n' +
    'uniform vec4 uCapC;\nuniform vec4 uCapR;\n' +
    'varying float vMat;\nvarying float vSlot;\nvarying float vAo;\nvarying vec3 vRest;\n';
  // Boné, gorro ou bandana (RunnerRig): o cabelo que passaria da copa é recolhido para dentro dela, na
  // posição de repouso (antes dos ossos; a copa e o cabelo andam juntos com a cabeça). uCapC = base da
  // copa (centro, w = ligado), uCapR = raios (w = primeiro osso de mola: o rabo e o cabelo comprido que
  // balançam ficam como estão).
  var CAP_VERT = [
    '#ifdef USE_SKINNING',
    'if ( uCapC.w > 0.5 && mat > 2.5 && mat < 3.5 ) {',
    '  vec3 cq = ( transformed - uCapC.xyz ) / uCapR.xyz;',
    '  float cr = length( cq );',
    '  if ( cq.y > 0.0 && cr > 0.95 ) {',
    '    float cw = 1.0 - clamp( dot( step( vec4( uCapR.w - 0.5 ), skinIndex ), skinWeight ), 0.0, 1.0 );',
    '    transformed = mix( transformed, uCapC.xyz + cq * ( 0.95 / cr ) * uCapR.xyz, cw );',
    '  }',
    '}',
    '#endif'
  ].join('\n');
  var RUN_FRAG = [
    'uniform vec4 uPatA;',      // estampa da camiseta: tipo (0 nada, 1 faixa, 2 listras, 3 degradê), y inicial, y final, espaço
    'uniform vec4 uPatB;',      // estampa do short
    'uniform vec3 uPatColA;',
    'uniform vec3 uPatColB;',
    'varying float vMat;',
    'varying float vSlot;',
    'varying float vAo;',
    'varying vec3 vRest;',
    'float epPat( float k, float t ) {',
    '  if ( k < 1.5 ) return smoothstep( 0.0, 1.0, ( t - 0.5 ) * 20.0 ) * ( 1.0 - smoothstep( 0.0, 1.0, ( t - 0.72 ) * 20.0 ) );',
    '  if ( k < 2.5 ) return smoothstep( 0.0, 1.0, ( sin( t * 21.99 ) - 0.1 ) * 2.0 );',
    '  return smoothstep( 0.0, 1.0, t * 1.1 - 0.05 );',
    '}',
    ''
  ].join('\n');
  function runnerShader(shader, u, lite) {
    for (var k in u) shader.uniforms[k] = u[k];
    // cor do vértice = paleta[espaço] × oclusão (a pele ainda é multiplicada pela textura)
    shader.vertexShader = RUN_VERT + shader.vertexShader
      .replace('#include <color_vertex>', 'vColor = uPal[ int( slot + 0.5 ) ] * aov;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = mat;\nvSlot = slot;\nvAo = aov;\nvRest = position;\n' + CAP_VERT);
    var color = [
      'vec3 epCol = vColor;',
      'float epS = floor( vSlot + 0.5 );',
      // estampas por pixel na posição de repouso (listras nítidas em qualquer nível de detalhe)
      'if ( uPatA.x > 0.5 && abs( epS - uPatA.w ) < 0.5 ) epCol = mix( epCol, uPatColA * vAo, epPat( uPatA.x, ( vRest.y - uPatA.y ) / ( uPatA.z - uPatA.y ) ) );',
      'else if ( uPatB.x > 0.5 && abs( epS - uPatB.w ) < 0.5 ) epCol = mix( epCol, uPatColB * vAo, epPat( uPatB.x, ( vRest.y - uPatB.y ) / ( uPatB.z - uPatB.y ) ) );',
      'diffuseColor.rgb *= epCol;',
      'float rm = floor( vMat + 0.5 );'
    ];
    if (!lite) color.push(
      // cabelo com mechas; tecido com uma trama bem fina (sem cara de plástico)
      'if ( rm > 2.5 && rm < 3.5 ) {',
      '  float ang = atan( vRest.x, vRest.z );',
      '  diffuseColor.rgb *= 0.88 + 0.2 * pow( abs( sin( ang * 46.0 + vRest.y * 24.0 + sin( ang * 7.0 ) * 2.0 ) ), 3.0 );',
      '} else if ( rm > 0.5 && rm < 2.5 ) {',
      '  diffuseColor.rgb *= 0.965 + 0.035 * sin( vRest.y * 700.0 ) * sin( ( vRest.x + vRest.z ) * 700.0 );',
      '}');
    shader.fragmentShader = RUN_FRAG + shader.fragmentShader.replace('#include <color_fragment>', color.join('\n'));
    if (lite) return;
    // brilho de cada material (pele, algodão, tecido técnico, cabelo, tênis, olho); o do cabelo some nas camadas de dentro
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_phong_fragment>', [
        '#include <lights_phong_fragment>',
        'if ( rm < 0.5 ) { material.specularStrength = 0.5; material.specularShininess = 14.0; }',
        'else if ( rm < 1.5 ) { material.specularStrength = 0.05; material.specularShininess = 4.0; }',
        'else if ( rm < 2.5 ) { material.specularStrength = 0.16; material.specularShininess = 9.0; }',
        'else if ( rm < 3.5 ) { material.specularStrength = 0.3 * vAo; material.specularShininess = 16.0; }',
        'else if ( rm < 4.5 ) { material.specularStrength = 0.5; material.specularShininess = 20.0; }',
        'else { material.specularStrength = 2.5; material.specularShininess = 90.0; }'
      ].join('\n'))
      .replace('#include <aomap_fragment>', [
        '#include <aomap_fragment>',
        'if ( rm < 0.5 ) reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3( 0.09, 0.03, 0.015 );',          // calor da pele
        'if ( rm > 0.5 && rm < 2.5 ) {',                                                                           // brilho aveludado do tecido
        '  float sh = pow( 1.0 - max( dot( normalize( vViewPosition ), normal ), 0.0 ), 2.0 );',
        '  reflectedLight.indirectDiffuse += diffuseColor.rgb * sh * 0.22;',
        '}'
      ].join('\n'));
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
      // acessórios dos corredores (boné, óculos, fone, relógio, bandeira): cor por vértice, brilho leve
      M.runner = bent(lite ? new THREE.MeshLambertMaterial({ vertexColors: true })
        : new THREE.MeshPhongMaterial({ vertexColors: true, specular: new THREE.Color(0x161616), shininess: 22 }), !lite);
      M.lite = lite;
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
    // corpo de um corredor (material próprio: a paleta dele; o programa é o mesmo para todos).
    // map/normalMap (textura de pele do gênero) entram antes do primeiro desenho (RunnerRig).
    // 'low': Lambert (luz por vértice), sem mapa de normais e sem brilho por material.
    runnerBody: function () {
      var lite = !!M.lite, pal = [];
      for (var i = 0; i < RUN_NPAL; i++) pal.push(new THREE.Color(1, 1, 1));
      // cor (2, 2, 2): a textura guarda a pele dividida pela média × 0,5 (ESPEC-corredor §9), o retalho neutro vale 1
      var opts = { vertexColors: true, skinning: true, color: new THREE.Color(2, 2, 2) };
      var m = lite ? new THREE.MeshLambertMaterial(opts)
        : new THREE.MeshPhongMaterial(Object.assign({ specular: new THREE.Color(0x262626), shininess: 22, normalScale: new THREE.Vector2(0.45, -0.45) }, opts));
      m.lite = lite;
      m.rim = !lite;
      m.runnerU = { uPal: { value: pal }, uPatA: { value: new THREE.Vector4() }, uPatB: { value: new THREE.Vector4() },
        uPatColA: { value: new THREE.Color() }, uPatColB: { value: new THREE.Color() },
        uCapC: { value: new THREE.Vector4(0, 0, 0, 0) }, uCapR: { value: new THREE.Vector4(1, 1, 1, 255) } };
      m.onBeforeCompile = bend;
      m.customProgramCacheKey = function () { return lite ? 'runnerMD-lite' : 'runnerMD'; };
      return m;
    },
    RUN_NPAL: RUN_NPAL,
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
