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
    '    vec3 q = floor(d * 150.0);',
    '    float n = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);',
    '    c += vec3(step(0.9972, n) * uNight * smoothstep(0.04, 0.3, h));',
    '  }',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  function DayNightSystem(scene, data) {
    this.data = data;
    this.keys = data.keys.map(function (k) {
      return { t: k.t, id: k.id, top: new THREE.Color(k.top), horizon: new THREE.Color(k.horizon), fog: new THREE.Color(k.fog),
        sun: new THREE.Color(k.sun), sunI: k.sunI, hemiSky: new THREE.Color(k.hemiSky), hemiGround: new THREE.Color(k.hemiGround), hemiI: k.hemiI, glow: k.glow };
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
    this.sky = new THREE.Group();
    var dome = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 14), new THREE.ShaderMaterial({
      uniforms: this.skyUniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false
    }));
    dome.frustumCulled = false;
    dome.renderOrder = -10;
    this.sky.add(dome);
    this.clouds = this._clouds();
    this.sky.add(this.clouds);
    scene.add(this.sky);
    this._dayGlow = new THREE.Color(0.48, 0.66, 1.35);
    this._nightGlow = new THREE.Color(1.15, 1.05, 0.95);
    this.update(0, new THREE.Vector3(), false);
  }
  var P = DayNightSystem.prototype;

  P._clouds = function () {
    var gb = new EP.GeoBuilder(), rnd = U.rng(77);
    for (var i = 0; i < 9; i++) {
      var a = i / 9 * Math.PI * 2 + rnd() * 0.5, r = 330 + rnd() * 120, y = 70 + rnd() * 60;
      var cx = Math.cos(a) * r, cz = Math.sin(a) * r, n = 3 + Math.floor(rnd() * 3);
      for (var k = 0; k < n; k++) {
        var s = 26 + rnd() * 24;
        gb.add('ico1', cx + (k - n / 2) * 18 + rnd() * 6, y + rnd() * 6, cz + rnd() * 10, s * 1.5, s * 0.55, s, '#ffffff');
      }
    }
    this.cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.85, depthWrite: false });
    var m = new THREE.Mesh(gb.build(), this.cloudMat);
    m.frustumCulled = false;
    m.renderOrder = -9;
    return m;
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
    var c = this._sample(this.phase), u = this.skyUniforms;
    this.hemi.color.copy(c.hemiSky);
    this.hemi.groundColor.copy(c.hemiGround);
    this.hemi.intensity = c.hemiI;
    this.sun.color.copy(c.sun);
    this.sun.intensity = c.sunI;
    this.fog.color.copy(c.fog);
    u.uTop.value.copy(c.top);
    u.uHorizon.value.copy(c.fog);   // horizonte = neblina: o que some na neblina some no céu
    u.uSun.value.copy(c.sun);
    u.uNight.value = c.glow;
    // sol (ou lua) visível à frente: sobe e desce ao longo do dia
    var p = this.phase, dayT = (p - 0.2) / 0.6, elev;
    if (dayT >= 0 && dayT <= 1) elev = Math.sin(dayT * Math.PI) * 0.7 + 0.02;
    else elev = Math.sin(((p - 0.8 + 1) % 1) / 0.4 * Math.PI) * 0.55 + 0.02;
    u.uSunDir.value.set(-0.38, elev, -1);
    this.glow = c.glow;
    EP.Materials.glow.color.copy(this._dayGlow).lerp(this._nightGlow, U.smooth(c.glow));
    this.cloudMat.color.copy(c.fog).lerp(new THREE.Color(1, 1, 1), 0.55).multiplyScalar(0.55 + c.hemiI * 0.5);
    this.sky.position.set(cameraPos.x, 0, cameraPos.z);
    this.clouds.rotation.y += dt * 0.004;
  };

  EP.DayNightSystem = DayNightSystem;
})(window.EP);
