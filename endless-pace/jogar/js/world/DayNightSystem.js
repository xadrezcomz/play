// DayNightSystem — céu, luz, neblina e o ciclo do dia (GDD §31).
// Amanhecer, manhã, tarde, pôr do sol e noite, aos poucos. As cores de cada
// momento ficam em dados/biomas.js (dayNight.keys).
(function (EP) {
  'use strict';
  var U = EP.util;

  var SKY_VERT = 'varying vec3 vDir;\nvoid main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var SKY_FRAG = [
    'uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir; uniform float uNight;',
    'varying vec3 vDir;',
    'void main(){',
    '  vec3 d = normalize(vDir);',
    '  float h = d.y;',
    '  vec3 c = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.6, h), 0.75));',
    '  float s = max(dot(d, normalize(uSunDir)), 0.0);',
    '  c += uSun * (smoothstep(0.9993, 0.9997, s) * 1.1 + pow(s, 14.0) * 0.22);',
    '  if (uNight > 0.01 && h > 0.04) {',
    '    vec3 q = floor(d * 420.0);',
    '    float n = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);',
    '    c += vec3(step(0.9986, n) * uNight * smoothstep(0.04, 0.3, h)) * 1.4;',
    '  }',
    '  gl_FragColor = vec4(c, 1.0);',
    '  #include <tonemapping_fragment>',
    '  #include <encodings_fragment>',
    '}'
  ].join('\n');

  function DayNightSystem(scene, data) {
    this.data = data;
    var lin = function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); };
    this.keys = data.keys.map(function (k) {
      return { t: k.t, id: k.id, top: lin(k.top), horizon: lin(k.horizon), fog: lin(k.fog),
        sun: lin(k.sun), sunI: k.sunI, hemiSky: lin(k.hemiSky), hemiGround: lin(k.hemiGround), hemiI: k.hemiI, glow: k.glow };
    });
    this.phase = data.startPhase;
    this.glow = 0;
    this.current = {
      top: new THREE.Color(), horizon: new THREE.Color(), fog: new THREE.Color(), sun: new THREE.Color(),
      hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), sunI: 1, hemiI: 1, glow: 0, id: ''
    };

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.9);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.position.set(0.45, 1.0, 0.8);   // de trás da câmera: o corredor fica iluminado
    scene.add(this.sun);
    scene.fog = new THREE.Fog(0xcccccc, data.fog.near, data.fog.far);
    this.fog = scene.fog;

    this.skyUniforms = {
      uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(-0.3, 0.3, -1) }, uNight: { value: 0 }
    };
    // O céu e a paisagem distante (morros, montanhas, nuvens) ficam numa cena
    // própria, desenhada antes do mundo: o que está longe some na neblina e o
    // horizonte continua bonito, sem "fantasmas" de prédios na frente dos morros.
    this.back = new THREE.Scene();
    this.backHemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.9);
    this.backSun = new THREE.DirectionalLight(0xffffff, 1);
    this.backSun.position.set(-0.3, 0.6, -1);
    this.back.add(this.backHemi, this.backSun);
    this.sky = new THREE.Group();
    var dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyUniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false
    }));
    dome.frustumCulled = false;
    dome.renderOrder = -10;
    this.sky.add(dome);
    this.clouds = this._clouds();
    this.sky.add(this.clouds);
    this.landscapes = {};
    this.hazeNear = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false });
    this.hazeFar = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false });
    this.back.add(this.sky);
    this.setBiome(EP.data.biomes[0]);
    this._dayGlow = new THREE.Color(0.48, 0.66, 1.35);
    this._nightGlow = new THREE.Color(1.15, 1.05, 0.95);
    this.update(0, new THREE.Vector3(), false);
  }
  var P = DayNightSystem.prototype;

  // nuvens fofas: bolas lisas achatadas, a base um pouco mais escura
  P._clouds = function () {
    var gb = new EP.GeoBuilder(), rnd = U.rng(77);
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * Math.PI * 2 + rnd() * 0.4, r = 520 + rnd() * 220, y = 110 + rnd() * 110;
      var cx = Math.cos(a) * r, cz = Math.sin(a) * r, n = 4 + Math.floor(rnd() * 4), w = 30 + rnd() * 26;
      for (var k = 0; k < n; k++) {
        var s = w * (0.6 + rnd() * 0.6), ox = (k - n / 2) * w * 0.55 + rnd() * 8;
        gb.add('icoS2', cx + ox, y + rnd() * 8, cz + (rnd() - 0.5) * 18, s * 1.5, s * 0.75, s, '#ffffff');
        gb.add('icoS2', cx + ox, y - s * 0.18, cz, s * 1.4, s * 0.35, s * 0.9, '#dfe6f0');
      }
    }
    this.cloudMat = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.92, depthWrite: false, emissive: new THREE.Color(0.35, 0.37, 0.4) });
    var m = new THREE.Mesh(gb.build(), this.cloudMat);
    m.frustumCulled = false;
    m.renderOrder = -9;
    return m;
  };

  // paisagem distante de cada região: morros perto e montanhas mais longe
  // biome.backdrop = { hills, hillsAlt, mountains, snow, hillH: [a,b], mountH: [a,b], mountains: false para sem montanhas }
  P._landscape = function (biome) {
    var bd = biome.backdrop || {}, rnd = U.rng(31 + (biome.order || 1) * 17);
    var near = new EP.GeoBuilder(), far = new EP.GeoBuilder();
    var hills = bd.hills || '#6ea865', hills2 = bd.hillsAlt || '#86b874', mount = bd.mountains || '#8fa3c6';
    var hh = bd.hillH || [16, 38], mh = bd.mountH || [70, 140], i, a, r, w, h;
    var k = 0.55;   // a cor própria vale um pouco mais da metade; o resto é a névoa do horizonte
    for (i = 0; i < 34; i++) {
      a = i / 34 * Math.PI * 2 + rnd() * 0.15; r = 330 + rnd() * 70; w = 80 + rnd() * 90; h = U.range(hh, rnd);
      near.add('icoS2', Math.cos(a) * r, -h * 0.32, Math.sin(a) * r, w, h * 2, 70 + rnd() * 40,
        EP.GeoBuilder.shade(rnd() < 0.5 ? hills : hills2, (0.85 + rnd() * 0.25) * k), -a);
    }
    if (bd.mountains !== false) {
      for (i = 0; i < 20; i++) {
        a = i / 20 * Math.PI * 2 + rnd() * 0.2; r = 560 + rnd() * 90; w = 150 + rnd() * 120; h = U.range(mh, rnd);
        var x = Math.cos(a) * r, z = Math.sin(a) * r, c = EP.GeoBuilder.shade(mount, (0.85 + rnd() * 0.25) * 0.5);
        far.add('cone12', x, h / 2 - 28, z, w, h, w * 0.8, c, rnd() * 6);
        if (bd.snow) far.add('cone12', x, h - 28 - h * 0.14, z, w * 0.3, h * 0.29, w * 0.24, EP.GeoBuilder.shade('#ffffff', 0.5), rnd() * 6);
      }
    }
    var g = new THREE.Group(), m1 = new THREE.Mesh(near.build(), this.hazeNear);
    m1.frustumCulled = false; g.add(m1);
    if (far.count()) { var m2 = new THREE.Mesh(far.build(), this.hazeFar); m2.frustumCulled = false; g.add(m2); }
    return g;
  };

  // cada região tinge o céu e tem a sua paisagem ao fundo (biome.lighting e biome.backdrop)
  P.setBiome = function (biome) {
    if (!biome) return;
    if (this.landscape) this.sky.remove(this.landscape);
    this.landscape = this.landscapes[biome.id] || (this.landscapes[biome.id] = this._landscape(biome));
    this.sky.add(this.landscape);
    var L = biome.lighting && typeof biome.lighting === 'object' ? biome.lighting : {};
    var lin = function (hex) { return new THREE.Color(hex || '#ffffff').convertSRGBToLinear(); };
    this.tint = { sky: lin(L.skyTint), fog: lin(L.fogTint), sun: lin(L.sunTint), sunBoost: L.sunBoost || 1, hemiBoost: L.hemiBoost || 1 };
    this.fog.near = L.fogNear || this.data.fog.near;
    this.fog.far = L.fogFar || this.data.fog.far;
  };

  // fase do dia em que uma corrida nova começa (no meio da noite, amanhece)
  P.startPhaseFor = function (saved) {
    var d = this.data, p = ((saved % 1) + 1) % 1;
    if (p >= d.newDayFrom || p < d.newDayTo) return d.newDayPhase;
    return p;
  };

  P._sample = function (phase) {
    var keys = this.keys, n = keys.length, a = keys[n - 1], b = keys[0], i;
    for (i = 0; i < n; i++) {
      if (phase < keys[i].t) { b = keys[i]; a = keys[(i - 1 + n) % n]; break; }
      if (i === n - 1) { a = keys[i]; b = keys[0]; }
    }
    var span = ((b.t - a.t) + 1) % 1 || 1, t = U.smooth((((phase - a.t) + 1) % 1) / span);
    var c = this.current;
    c.top.copy(a.top).lerp(b.top, t);
    c.horizon.copy(a.horizon).lerp(b.horizon, t);
    c.fog.copy(a.fog).lerp(b.fog, t);
    c.sun.copy(a.sun).lerp(b.sun, t);
    c.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
    c.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);
    c.sunI = U.lerp(a.sunI, b.sunI, t);
    c.hemiI = U.lerp(a.hemiI, b.hemiI, t);
    c.glow = U.lerp(a.glow, b.glow, t);
    c.id = t < 0.5 ? a.id : b.id;
    return c;
  };

  // advance: o tempo do dia passa (só durante a corrida)
  P.update = function (dt, cameraPos, advance) {
    if (advance) this.phase = (this.phase + dt / this.data.cycleSeconds) % 1;
    var c = this._sample(this.phase), u = this.skyUniforms, T = this.tint;
    c.top.multiply(T.sky); c.fog.multiply(T.fog); c.sun.multiply(T.sun);
    this.hemi.color.copy(c.hemiSky);
    this.hemi.groundColor.copy(c.hemiGround);
    this.hemi.intensity = c.hemiI * T.hemiBoost;
    this.sun.color.copy(c.sun);
    this.sun.intensity = c.sunI * T.sunBoost;
    this.fog.color.copy(c.fog);
    this.backHemi.color.copy(c.hemiSky); this.backHemi.groundColor.copy(c.hemiGround); this.backHemi.intensity = this.hemi.intensity;
    this.backSun.color.copy(c.sun); this.backSun.intensity = this.sun.intensity * 0.8;
    this.hazeNear.emissive.copy(c.fog).multiplyScalar(0.45);
    this.hazeFar.emissive.copy(c.fog).multiplyScalar(0.62);
    u.uTop.value.copy(c.top);
    u.uHorizon.value.copy(c.fog);   // horizonte = neblina: o que some na neblina some no céu
    u.uSun.value.copy(c.sun);
    u.uNight.value = U.smooth((c.glow - 0.6) / 0.4);
    // sol (ou lua) visível à frente: sobe e desce ao longo do dia
    var p = this.phase, dayT = (p - 0.2) / 0.6, elev;
    if (dayT >= 0 && dayT <= 1) elev = Math.sin(dayT * Math.PI) * 0.7 + 0.02;
    else elev = Math.sin(((p - 0.8 + 1) % 1) / 0.4 * Math.PI) * 0.55 + 0.02;
    u.uSunDir.value.set(-0.38, elev, -1);
    this.glow = c.glow;
    EP.Materials.glow.color.copy(this._dayGlow).lerp(this._nightGlow, U.smooth(c.glow));
    EP.Materials.lightPool.opacity = 0.55 * U.smooth((c.glow - 0.3) / 0.6);
    this.cloudMat.emissive.copy(c.fog).multiplyScalar(0.55);
    this.cloudMat.color.setRGB(1, 1, 1).multiplyScalar(0.35 + c.hemiI * 0.4);
    this.sky.position.set(cameraPos.x, 0, cameraPos.z);
    if (this.landscape) this.landscape.position.y = -cameraPos.y * 0.0;
    this.clouds.rotation.y += dt * 0.004;
  };

  EP.DayNightSystem = DayNightSystem;
})(window.EP);
