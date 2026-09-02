/* ==========================================================================
   SHEPER — abertura 3D
   Marca extrudada em metal polido, iluminada por um HDRI de estúdio gerado
   em runtime, montada a partir de estilhaços e entregue à página com um
   estouro de luz. Sem dependência externa: three.js vive em assets/vendor.
   ========================================================================== */
import * as THREE from '../assets/vendor/three.module.js';

window.__sheperIntroBooting = true;

var root = document.documentElement;
var overlay = null;

/* Aparelho modesto: menos resolução, menos passes, menos shader para compilar.
   O que decide não é a largura da tela, é o que costuma vir junto com ela. */
var LOW = Math.min(window.innerWidth, window.innerHeight) < 760 ||
          (navigator.hardwareConcurrency || 8) <= 4;

/* A abertura fica mais curta no celular: mesma coreografia, passo mais rápido. */
var RATE = LOW ? 1.3 : 1;

/* O instante da entrega, em segundos de animação. Precisa estar declarado aqui
   em cima: se o documento já terminou de carregar quando este módulo roda,
   boot() começa na linha seguinte e não enxerga atribuição nenhuma feita
   depois dela. */
var OUT_BEAT = 3.05;

/* O contorno já sai buscando aqui, em paralelo com o three e com o estúdio.
   Quando o renderer estiver de pé, ele quase sempre já chegou. */
var shapeReq = fetch('assets/logo/mark-shape.json', { credentials: 'omit' })
  .then(function (r) { return r.json(); })
  .catch(function () { return null; });

function start() {
  overlay = document.getElementById('intro');
  if (!overlay || !root.classList.contains('intro-on')) return;
  try { boot(); } catch (err) { kill(); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

/* --------------------------------------------------------------- utilidades */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t)  { return a + (b - a) * t; }
function span(t, a, b)  { return clamp((t - a) / (b - a), 0, 1); }
function outQuint(t)    { return 1 - Math.pow(1 - t, 5); }
function outCubic(t)    { return 1 - Math.pow(1 - t, 3); }
function inOutCubic(t)  { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function kill() {
  if (window.__sheperIntroKill) window.__sheperIntroKill();
}

/* --------------------------------------------------------- HDRI de estúdio
   Equiretangular em float: caixas de luz de verdade, com valores acima de 1.
   É isso que dá o brilho longo e o contraste de cromo — não dá para fingir
   com um gradiente LDR.                                                     */
function studioEnvironment(renderer) {
  var W = LOW ? 256 : 512, H = LOW ? 128 : 256;
  var data = new Float32Array(W * H * 4);

  /* [theta, phi, meia-altura, meia-largura, intensidade, r, g, b] */
  var lights = [
    [0.58, 2.05, 0.58, 0.70, 7.00, 1.00, 0.98, 0.95],  /* softbox principal */
    [1.05, 5.50, 1.00, 0.105, 7.00, 0.86, 0.92, 1.00],  /* ripa à direita */
    [1.28, 3.75, 0.90, 0.090, 4.20, 0.94, 0.96, 1.00],  /* ripa à esquerda */
    [0.95, 0.85, 0.70, 0.20,  3.20, 1.00, 0.94, 0.88],  /* kicker frontal quente */
    [1.42, 0.25, 1.05, 1.30,  1.20, 0.82, 0.88, 1.00],  /* preenchimento frontal */
    [0.20, 0.00, 0.42, 3.20,  1.30, 0.90, 0.94, 1.00],  /* teto */
    [2.50, 0.60, 0.60, 2.60,  0.40, 0.70, 0.76, 0.90],  /* rebote do chão */
    [1.55, 1.75, 0.55, 0.45,  1.60, 0.92, 0.95, 1.00],  /* quebra-luz lateral */
    [0.85, 4.60, 0.45, 0.35,  2.60, 0.88, 0.90, 1.00],  /* alto, atrás à esquerda */
    [0.80, 2.60, 1.70, 2.00,  0.90, 0.86, 0.90, 1.00],  /* parede macia à esquerda */
    [1.70, 5.90, 1.40, 1.60,  0.45, 0.72, 0.78, 0.92]   /* parede fria à direita */
  ];

  var TAU = Math.PI * 2, i = 0;
  for (var y = 0; y < H; y++) {
    var theta = (y + 0.5) / H * Math.PI;
    /* ambiente: um degradê frio de cima para baixo, quase preto */
    var amb = lerp(0.030, 0.003, Math.pow(theta / Math.PI, 0.8));
    for (var x = 0; x < W; x++) {
      var phi = (x + 0.5) / W * TAU;
      var r = amb * 0.86, g = amb * 0.92, b = amb;

      for (var l = 0; l < lights.length; l++) {
        var L = lights[l];
        var dth = (theta - L[0]) / L[2];
        var dph = phi - L[1];
        if (dph >  Math.PI) dph -= TAU;
        if (dph < -Math.PI) dph += TAU;
        dph /= L[3];
        var d = Math.sqrt(dth * dth + dph * dph);
        if (d >= 1) continue;
        var w = 1 - d * d;
        w = w * w * L[4];                       /* borda macia, núcleo forte */
        r += w * L[5]; g += w * L[6]; b += w * L[7];
      }

      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 1;
      i += 4;
    }
  }

  var tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;

  var pmrem = new THREE.PMREMGenerator(renderer);
  var env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}

/* ------------------------------------------------- micro-relevo do material
   Uma face plana reflete uma direção só, e chapa perfeita parece plástico.
   O campo de altura junta ondulação larga (a leve barriga de uma peça
   estampada) com riscos finos de polimento; dele saem o normal e o mapa de
   rugosidade. É o que faz a luz escorrer pela peça em vez de assentar.     */
function scratchMaps() {
  var S = LOW ? 128 : 256;
  var TAU = Math.PI * 2;

  /* riscos primeiro, num canvas que fecha nas bordas */
  var cv = document.createElement('canvas');
  cv.width = cv.height = S;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);

  var tile = function (draw) {
    for (var ox = -1; ox <= 1; ox++) {
      for (var oy = -1; oy <= 1; oy++) {
        ctx.save(); ctx.translate(ox * S, oy * S); draw(); ctx.restore();
      }
    }
  };

  ctx.lineWidth = 1;
  for (var i = 0, nStroke = LOW ? 260 : 520; i < nStroke; i++) {
    (function () {
      var x0 = Math.random() * S, y0 = Math.random() * S;
      var len = 12 + Math.random() * 110;
      var tilt = (Math.random() - .5) * 9;
      var a = 0.05 + Math.random() * 0.14;
      var col = (Math.random() < .5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + a + ')';
      tile(function () {
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + len, y0 + tilt);
        ctx.stroke();
      });
    })();
  }

  var px = ctx.getImageData(0, 0, S, S).data;

  /* campo de altura: ondas largas + os riscos como relevo raso */
  var hgt = new Float32Array(S * S);
  for (var y = 0; y < S; y++) {
    var v = y / S;
    for (var x = 0; x < S; x++) {
      var u = x / S;
      var h = 0.40 * Math.sin(TAU * u + 0.6) * Math.cos(TAU * v + 1.1)
            + 0.22 * Math.sin(TAU * u * 2 + 2.2) * Math.sin(TAU * v + 0.4)
            + 0.13 * Math.cos(TAU * u + 0.3) * Math.cos(TAU * v * 2 + 1.9)
            + 0.07 * Math.sin(TAU * u * 3 + 1.4) * Math.cos(TAU * v * 3 + 0.8)
            + (px[(y * S + x) * 4] / 255 - 0.5) * 0.10;
      hgt[y * S + x] = h;
    }
  }

  /* normal por Sobel sobre o campo */
  var ncv = document.createElement('canvas');
  ncv.width = ncv.height = S;
  var nctx = ncv.getContext('2d');
  var nimg = nctx.createImageData(S, S);
  var H = function (x, y) { return hgt[(((y % S) + S) % S) * S + (((x % S) + S) % S)]; };
  for (var y2 = 0; y2 < S; y2++) {
    for (var x2 = 0; x2 < S; x2++) {
      var dx = (H(x2 + 1, y2) - H(x2 - 1, y2)) * 4.2;
      var dy = (H(x2, y2 + 1) - H(x2, y2 - 1)) * 4.2;
      var nz = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      var o = (y2 * S + x2) * 4;
      nimg.data[o]     = (-dx * nz * .5 + .5) * 255;
      nimg.data[o + 1] = (-dy * nz * .5 + .5) * 255;
      nimg.data[o + 2] = (nz * .5 + .5) * 255;
      nimg.data[o + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);

  /* rugosidade: polimento irregular, puxado do mesmo campo */
  var rcv = document.createElement('canvas');
  rcv.width = rcv.height = S;
  var rctx = rcv.getContext('2d');
  var rimg = rctx.createImageData(S, S);
  for (var y3 = 0; y3 < S; y3++) {
    for (var x3 = 0; x3 < S; x3++) {
      var o3 = (y3 * S + x3) * 4;
      var g = clamp(0.5 + hgt[y3 * S + x3] * 0.42, 0, 1) * 255;
      rimg.data[o3] = rimg.data[o3 + 1] = rimg.data[o3 + 2] = g;
      rimg.data[o3 + 3] = 255;
    }
  }
  rctx.putImageData(rimg, 0, 0);

  var mk = function (canvas, rep) {
    var t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 4;
    return t;
  };

  return { rough: mk(rcv, 1.15), norm: mk(ncv, 1.15) };
}

/* ---------------------------------------------------------- textura radial */
function radialTexture(inner, stops) {
  var S = 256;
  var cv = document.createElement('canvas');
  cv.width = cv.height = S;
  var ctx = cv.getContext('2d');
  var gr = ctx.createRadialGradient(S / 2, S / 2, inner * S / 2, S / 2, S / 2, S / 2);
  stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, S, S);
  var t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/* ================================================================== som
   Nada é baixado: o efeito é sintetizado na hora. Um sub que cresce, cacos
   de metal batendo enquanto a peça se junta, o baque do encaixe com a cauda
   ressoando e um riser que entrega a página. Os tempos vêm da mesma linha
   do tempo da animação, então som e imagem nunca saem de sincronia.        */
function introSound() {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;

  var ctx;
  try { ctx = new AC(); } catch (e) { return null; }

  var master = ctx.createGain();
  master.gain.value = 0.0001;

  /* um limitador leve: no alto-falante do celular a soma estoura fácil */
  var comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 7;
  comp.attack.value = 0.003;
  comp.release.value = 0.22;
  master.connect(comp);
  comp.connect(ctx.destination);

  /* ruído branco reaproveitado por todo mundo */
  var noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  var nd = noise.getChannelData(0);
  for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  var started = false;

  function osc(type, freq, at, dur, peak, dest) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.02, dur * 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(dest || master);
    o.start(at); o.stop(at + dur + 0.05);
    return o;
  }

  function burst(at, dur, freq, q, peak, pan) {
    var src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, at);
    f.Q.value = q;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(f); f.connect(g);
    if (p) { p.pan.value = pan; g.connect(p); p.connect(master); }
    else g.connect(master);
    src.start(at); src.stop(at + dur + 0.05);
  }

  /* Agenda a trilha inteira de uma vez. `at` é o instante real em que ela
     começa a soar, `rate` é o passo da animação e `skipTo` diz em que ponto
     da coreografia a gente está entrando — porque o navegador costuma só
     liberar o áudio depois de um toque, com a animação já rodando. O que já
     passou não toca; o que é contínuo entra no meio, como numa mesa de som. */
  function schedule(at, rate, skipTo) {
    var from = skipTo || 0;
    var T = function (beat) { return at + Math.max(0, beat - from) / rate; };
    var outAt = OUT_BEAT;
    var END = T(outAt + 0.55);

    master.gain.setValueAtTime(0.0001, at);
    master.gain.exponentialRampToValueAtTime(0.78, T(0.3));

    /* --- sub: o chão da coisa ------------------------------------------ */
    var subG = ctx.createGain();
    subG.gain.setValueAtTime(0.0001, at);
    subG.gain.exponentialRampToValueAtTime(0.075, T(0.3));
    subG.gain.exponentialRampToValueAtTime(0.30, T(1.7));
    subG.gain.setValueAtTime(0.30, T(outAt));
    subG.gain.exponentialRampToValueAtTime(0.55, T(outAt + 0.4));
    subG.gain.exponentialRampToValueAtTime(0.0001, END);
    subG.connect(master);

    var sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(30, at);
    sub.frequency.exponentialRampToValueAtTime(44, T(2.0));
    sub.frequency.exponentialRampToValueAtTime(38, T(outAt + 0.4));
    sub.connect(subG);
    sub.start(at); sub.stop(END + 0.1);

    var sub2 = ctx.createOscillator();
    sub2.type = 'triangle';
    sub2.frequency.setValueAtTime(45.5, at);
    sub2.frequency.exponentialRampToValueAtTime(66, T(2.0));
    var sub2g = ctx.createGain();
    sub2g.gain.value = 0.35;
    sub2.connect(sub2g); sub2g.connect(subG);
    sub2.start(at); sub2.stop(END + 0.1);

    /* --- enxame: o ar cortado pelos cacos ------------------------------- */
    var swarm = ctx.createBufferSource();
    swarm.buffer = noise;
    swarm.loop = true;
    var sf = ctx.createBiquadFilter();
    sf.type = 'bandpass';
    sf.Q.value = 1.1;
    sf.frequency.setValueAtTime(700, at);
    sf.frequency.exponentialRampToValueAtTime(4200, T(1.95));
    var sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, at);
    sg.gain.exponentialRampToValueAtTime(0.045, T(0.28));
    sg.gain.exponentialRampToValueAtTime(0.11, T(1.3));
    sg.gain.exponentialRampToValueAtTime(0.012, T(2.35));
    sg.gain.exponentialRampToValueAtTime(0.0001, END);
    swarm.connect(sf); sf.connect(sg); sg.connect(master);
    swarm.start(at); swarm.stop(END + 0.1);

    /* --- cacos: tiques metálicos adensando até o encaixe ---------------- */
    for (var k = 0; k < 26; k++) {
      var u = k / 25;
      var beat = 0.22 + Math.pow(u, 0.75) * 1.68;
      if (beat < from) continue;
      burst(T(beat + Math.random() * 0.05), 0.05 + Math.random() * 0.09,
            1400 + Math.random() * 4800, 7 + Math.random() * 9,
            0.055 + u * 0.05, (Math.random() - 0.5) * 1.6);
    }

    /* --- o encaixe ------------------------------------------------------ */
    if (from < 1.98) {
    var hit = T(1.98);

    var thud = ctx.createOscillator();
    var thudG = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(150, hit);
    thud.frequency.exponentialRampToValueAtTime(40, hit + 0.22);
    thudG.gain.setValueAtTime(0.0001, hit);
    thudG.gain.exponentialRampToValueAtTime(0.80, hit + 0.012);
    thudG.gain.exponentialRampToValueAtTime(0.0001, hit + 0.55);
    thud.connect(thudG); thudG.connect(master);
    thud.start(hit); thud.stop(hit + 0.6);

    burst(hit, 0.12, 3200, 1.2, 0.16, 0);

    /* cauda inarmônica: é o que faz soar metal, e não tambor */
    var ring = ctx.createGain();
    ring.gain.value = 1;
    ring.connect(master);
    var partials = [[311, 0.085, 2.6], [468, 0.06, 2.2], [727, 0.045, 1.9],
                    [1097, 0.03, 1.5], [1583, 0.018, 1.1]];
    for (var q = 0; q < partials.length; q++) {
      osc('sine', partials[q][0] * (1 + (Math.random() - .5) * 0.01),
          hit, partials[q][2], partials[q][1], ring);
    }
    }

    /* --- riser e entrega ------------------------------------------------ */
    var up = ctx.createBufferSource();
    up.buffer = noise;
    up.loop = true;
    var uf = ctx.createBiquadFilter();
    uf.type = 'highpass';
    uf.frequency.setValueAtTime(300, T(outAt - 0.55));
    uf.frequency.exponentialRampToValueAtTime(7000, T(outAt + 0.3));
    var ug = ctx.createGain();
    ug.gain.setValueAtTime(0.0001, T(outAt - 0.55));
    ug.gain.exponentialRampToValueAtTime(0.22, T(outAt + 0.22));
    ug.gain.exponentialRampToValueAtTime(0.0001, END);
    up.connect(uf); uf.connect(ug); ug.connect(master);
    up.start(T(outAt - 0.55)); up.stop(END + 0.1);

    master.gain.setValueAtTime(0.78, T(outAt + 0.3));
    master.gain.exponentialRampToValueAtTime(0.0001, END);
    started = true;
  }

  return {
    ready: function () {
      /* o navegador só solta o áudio depois de um gesto; aqui a gente tenta
         e devolve o que conseguiu, para a interface poder oferecer o botão */
      var r = ctx.resume && ctx.resume();
      if (r && r.then) r.catch(function () {});
      return ctx.state === 'running';
    },
    resume: function () {
      var r = ctx.resume && ctx.resume();
      return r && r.then ? r.catch(function () {}) : Promise.resolve();
    },
    live: function () { return ctx.state === 'running'; },
    playing: function () { return started; },
    schedule: schedule,
    now: function () { return ctx.currentTime; },
    stop: function (fade) {
      try {
        var t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
        master.gain.exponentialRampToValueAtTime(0.0001, t + (fade || 0.18));
        setTimeout(function () { try { ctx.close(); } catch (e) {} }, (fade || 0.18) * 1000 + 120);
      } catch (e) {}
    }
  };
}

/* ================================================================== cena */
function boot() {
  var canvas  = document.getElementById('introCanvas');
  var flash   = document.getElementById('introFlash');
  var skipBt  = document.getElementById('introSkip');
  var soundBt = document.getElementById('introSound');

  var renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: false, alpha: false,
      stencil: false, powerPreference: 'high-performance'
    });
  } catch (e) { kill(); return; }
  if (!renderer || !renderer.getContext()) { kill(); return; }

  var DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.35 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.NoToneMapping;      /* o tonemap é nosso, no passe final */
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 60);

  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 1;
  scene.environmentRotation = new THREE.Euler(0, 0, 0);

  /* ------------------------------------------------------- halo de fundo */
  var halo = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 5.4),
    new THREE.MeshBasicMaterial({
      map: radialTexture(0, [
        [0,   'rgba(120,150,200,0.30)'],
        [.30, 'rgba(70,90,130,0.09)'],
        [1,   'rgba(0,0,0,0)']
      ]),
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, toneMapped: false
    })
  );
  halo.position.z = -2.9;
  halo.renderOrder = -1;
  halo.material.opacity = 0;
  scene.add(halo);

  /* ------------------------------------------------------------- poeira */
  var dustCount = LOW ? 130 : 460;
  var dpos = new Float32Array(dustCount * 3);
  var dseed = new Float32Array(dustCount);
  for (var i = 0; i < dustCount; i++) {
    var rad = 0.9 + Math.pow(Math.random(), .6) * 2.6;
    var ang = Math.random() * Math.PI * 2;
    dpos[i * 3]     = Math.cos(ang) * rad * 0.9;
    dpos[i * 3 + 1] = (Math.random() - .5) * 3.4;
    dpos[i * 3 + 2] = Math.sin(ang) * rad * 0.7 + 0.3;
    dseed[i] = Math.random();
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dseed, 1));

  var dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uOpacity: { value: 0 },
      uSize: { value: (LOW ? 9 : 12) * DPR },
      uSprite: { value: radialTexture(0, [[0, 'rgba(255,255,255,1)'], [.45, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]) }
    },
    vertexShader: [
      'attribute float aSeed;',
      'uniform float uTime, uSize;',
      'varying float vFade;',
      'void main(){',
      '  vec3 p = position;',
      '  p.y += sin(uTime * (0.25 + aSeed * 0.35) + aSeed * 22.0) * 0.13;',
      '  p.x += cos(uTime * (0.18 + aSeed * 0.22) + aSeed * 14.0) * 0.10;',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  vFade = (0.45 + 0.55 * sin(uTime * 1.4 + aSeed * 31.0));',
      '  gl_Position = projectionMatrix * mv;',
      '  gl_PointSize = uSize * (0.25 + aSeed) / max(-mv.z, 0.001);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D uSprite;',
      'uniform float uOpacity;',
      'varying float vFade;',
      'void main(){',
      '  float a = texture2D(uSprite, gl_PointCoord).a;',
      '  gl_FragColor = vec4(vec3(0.72, 0.80, 0.95) * 1.1, a * vFade * uOpacity);',
      '}'
    ].join('\n'),
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  /* ------------------------------------------------------- luzes diretas */
  var key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-2.6, 3.0, 2.4);
  scene.add(key);

  var back = new THREE.DirectionalLight(0xbcd2ff, 2.4);
  back.position.set(2.4, 0.6, -2.6);
  scene.add(back);

  var sweep = new THREE.PointLight(0xffffff, 0, 12, 2);
  sweep.position.set(0, 0, 1.6);
  scene.add(sweep);

  /* ------------------------------------------------------------- o logo */
  var group = new THREE.Group();
  scene.add(group);

  var uAssemble = { value: 0 };
  var maps = scratchMaps();

  shapeReq.then(function (data) {
    if (!data) { kill(); return; }
    try { buildLogo(data); } catch (e) { kill(); }
  });

  function buildLogo(data) {
    var shapes = data.shapes.map(function (s) {
      var sh = new THREE.Shape(s.outer.map(function (p) { return new THREE.Vector2(p[0], p[1]); }));
      s.holes.forEach(function (h) {
        sh.holes.push(new THREE.Path(h.map(function (p) { return new THREE.Vector2(p[0], p[1]); })));
      });
      return sh;
    });

    var geo = new THREE.ExtrudeGeometry(shapes, {
      curveSegments: 1, steps: 1, depth: 0.075,
      bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.008,
      bevelOffset: 0, bevelSegments: 5
    });
    if (geo.index) geo = geo.toNonIndexed();
    geo.center();
    geo.computeBoundingBox();

    /* atributos por triângulo: de onde cada estilhaço chega */
    var pos = geo.attributes.position.array;
    var n = geo.attributes.position.count;
    var seed = new Float32Array(n);
    var dir  = new Float32Array(n * 3);

    for (var t = 0; t < n; t += 3) {
      var cx = (pos[t * 3]     + pos[t * 3 + 3] + pos[t * 3 + 6]) / 3;
      var cy = (pos[t * 3 + 1] + pos[t * 3 + 4] + pos[t * 3 + 7]) / 3;
      var s  = Math.random();
      /* embaixo primeiro, e a nuvem se abre para fora e na direção da câmera */
      var stagger = clamp(0.55 - cy * 0.8, 0, 1) * 0.55 + s * 0.45;
      var len = Math.sqrt(cx * cx + cy * cy) || 1;
      var dx = cx / len * (0.65 + s * 0.85) + (Math.random() - .5) * 0.7;
      var dy = cy / len * (0.65 + s * 0.85) + (Math.random() - .5) * 0.7;
      var dz = 0.45 + Math.random() * 1.5;
      for (var k = 0; k < 3; k++) {
        seed[t + k] = stagger;
        dir[(t + k) * 3]     = dx;
        dir[(t + k) * 3 + 1] = dy;
        dir[(t + k) * 3 + 2] = dz;
      }
    }
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aDir',  new THREE.BufferAttribute(dir, 3));

    var spec = {
      color: 0x8f959e,
      metalness: 1,
      roughness: 0.11,
      normalMap: maps.norm,
      normalScale: new THREE.Vector2(0.38, 0.38),
      envMapIntensity: 0.92
    };
    /* verniz e mapa de rugosidade custam shader; num aparelho modesto o ganho
       não paga o tempo de compilação nem o custo por pixel */
    if (!LOW) {
      spec.roughnessMap = maps.rough;
      spec.clearcoat = 0.35;
      spec.clearcoatRoughness = 0.08;
    }
    var mat = new THREE.MeshPhysicalMaterial(spec);

    mat.onBeforeCompile = function (shader) {
      shader.uniforms.uAssemble = uAssemble;
      shader.vertexShader =
        'attribute float aSeed;\nattribute vec3 aDir;\nuniform float uAssemble;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          [
            '#include <begin_vertex>',
            'float a = clamp((uAssemble - aSeed * 0.42) / 0.58, 0.0, 1.0);',
            'a = 1.0 - pow(1.0 - a, 5.0);',
            'float sw = (1.0 - a) * 0.75;',
            'float cs = cos(sw), sn = sin(sw);',
            'transformed.xy = mat2(cs, -sn, sn, cs) * transformed.xy;',
            'transformed += aDir * (1.0 - a) * 0.95;'
          ].join('\n')
        );
    };
    mat.customProgramCacheKey = function () { return 'sheper-assemble'; };

    var mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(1.15);
    group.add(mesh);

    ready();
  }

  /* =============================================================== passes */
  var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var quadGeo = new THREE.PlaneGeometry(2, 2);
  var quadScene = new THREE.Scene();
  var quad = new THREE.Mesh(quadGeo, null);
  quadScene.add(quad);

  var VERT = 'varying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

  var sceneRT, brightRT, blurA, blurB;
  var blurPasses = LOW ? 1 : 2;

  var brightMat = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: null }, uThreshold: { value: 1.45 } },
    vertexShader: VERT,
    fragmentShader: [
      'uniform sampler2D tScene; uniform float uThreshold; varying vec2 vUv;',
      'void main(){',
      '  vec3 c = texture2D(tScene, vUv).rgb;',
      '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
      '  float k = max(l - uThreshold, 0.0) / max(l, 0.0001);',
      '  gl_FragColor = vec4(c * k, 1.0);',
      '}'
    ].join('\n')
  });

  var blurMat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: VERT,
    fragmentShader: [
      'uniform sampler2D tMap; uniform vec2 uDir; varying vec2 vUv;',
      'void main(){',
      '  vec3 s = texture2D(tMap, vUv).rgb * 0.227027;',
      '  s += (texture2D(tMap, vUv + uDir * 1.3846).rgb + texture2D(tMap, vUv - uDir * 1.3846).rgb) * 0.316216;',
      '  s += (texture2D(tMap, vUv + uDir * 3.2308).rgb + texture2D(tMap, vUv - uDir * 3.2308).rgb) * 0.070270;',
      '  gl_FragColor = vec4(s, 1.0);',
      '}'
    ].join('\n')
  });

  var finalMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null }, tBloom: { value: null },
      uExposure: { value: 0.85 }, uBloom: { value: 0.42 },
      uTime: { value: 0 }, uGrain: { value: 0.030 },
      uVignette: { value: 0.76 }, uAberr: { value: 0.3 }, uFade: { value: 0 }
    },
    vertexShader: VERT,
    fragmentShader: [
      'uniform sampler2D tScene, tBloom;',
      'uniform float uExposure, uBloom, uTime, uGrain, uVignette, uAberr, uFade;',
      'varying vec2 vUv;',
      'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }',
      'float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p + 19.19); return fract((p.x + p.y) * p.x); }',
      'vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(max(c,0.0), vec3(1.0/2.4))-0.055, step(0.0031308, c)); }',
      'void main(){',
      '  vec2 d = vUv - 0.5;',
      '  float r2 = dot(d, d);',
      '  vec2 off = d * uAberr * r2 * 0.02;',
      '  vec3 col;',
      '  col.r = texture2D(tScene, vUv + off).r;',
      '  col.g = texture2D(tScene, vUv).g;',
      '  col.b = texture2D(tScene, vUv - off).b;',
      '  col += texture2D(tBloom, vUv).rgb * uBloom;',
      '  col *= uExposure;',
      '  col = aces(col);',
      '  col *= 1.0 - uVignette * smoothstep(0.06, 0.55, r2);',
      '  vec2 gp = gl_FragCoord.xy + vec2(uTime * 137.0, uTime * 91.0);',
      '  float n = hash(gp);',
      '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
      '  col += (n - 0.5) * uGrain * (0.25 + 0.75 * smoothstep(0.0, 0.30, lum));',
      '  gl_FragColor = vec4(toSRGB(max(col, 0.0)) * uFade, 1.0);',
      '}'
    ].join('\n')
  });

  function makeTargets() {
    var w = Math.max(2, Math.floor(window.innerWidth  * DPR));
    var h = Math.max(2, Math.floor(window.innerHeight * DPR));
    var bw = Math.max(2, w >> 1), bh = Math.max(2, h >> 1);

    if (sceneRT) { sceneRT.dispose(); brightRT.dispose(); blurA.dispose(); blurB.dispose(); }

    sceneRT = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType, samples: LOW ? 0 : 4,
      depthBuffer: true, colorSpace: THREE.NoColorSpace
    });
    var opt = { type: THREE.HalfFloatType, depthBuffer: false, colorSpace: THREE.NoColorSpace };
    brightRT = new THREE.WebGLRenderTarget(bw, bh, opt);
    blurA    = new THREE.WebGLRenderTarget(bw >> 1, bh >> 1, opt);
    blurB    = new THREE.WebGLRenderTarget(bw >> 1, bh >> 1, opt);
    [brightRT, blurA, blurB].forEach(function (rt) {
      rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter;
    });
  }

  function drawQuad(mat, target) {
    quad.material = mat;
    renderer.setRenderTarget(target || null);
    renderer.render(quadScene, quadCam);
  }

  /* ------------------------------------------------------ enquadramento */
  var fitDist = 3;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    makeTargets();

    var tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    var objH = 1.15, objW = 1.15 * 0.726;
    var fillW = camera.aspect < 0.85 ? 0.76 : 0.60;
    var dH = objH / (2 * 0.52 * tan);
    var dW = objW / (2 * fillW * tan * camera.aspect);
    fitDist = Math.max(dH, dW);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ------------------------------------------------------------ pointer */
  var px = 0, py = 0, tx = 0, ty = 0;
  var onPointer = function (e) {
    tx = (e.clientX / window.innerWidth  - .5) * 2;
    ty = (e.clientY / window.innerHeight - .5) * 2;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  /* ------------------------------------------------------------ timeline */
  var t0 = 0, raf = 0, running = false, ending = false;
  var lastFrame = 0, framesSeen = 0, frameAcc = 0, downshifted = false;
  var OUT_AT = OUT_BEAT, OUT_LEN = 0.55;
  var outAt = OUT_AT;

  /* ------------------------------------------------------------------ som */
  var sound = null, soundOn = false;

  function pref(v) {
    try {
      if (v === undefined) return localStorage.getItem('sheper:som');
      localStorage.setItem('sheper:som', v);
    } catch (e) {}
    return null;
  }

  function labelSound() {
    if (!soundBt) return;
    soundBt.setAttribute('aria-pressed', String(soundOn));
    soundBt.classList.toggle('is-on', soundOn);
    var txt = soundBt.querySelector('.intro__sound-txt');
    if (txt) txt.textContent = soundOn ? 'Som' : 'Ativar som';
  }

  /* Entra na trilha no ponto em que a animação está: o navegador pode ter
     liberado o áudio no meio do caminho. */
  function armSound() {
    if (!sound || !running || ending) return;
    sound.resume().then(function () {
      if (!sound.live()) { soundOn = false; labelSound(); return; }
      if (!sound.playing()) {
        var beat = (performance.now() / 1000 - t0) * RATE;
        sound.schedule(sound.now() + 0.02, RATE, beat);
      }
      soundOn = true;
      labelSound();
    });
  }

  function ready() {
    /* primeiro frame já com tudo compilado, para o corte não engasgar */
    uAssemble.value = 1;
    finalMat.uniforms.uFade.value = 0;
    renderTick(0);
    uAssemble.value = 0;

    if (window.__sheperIntroCalm) window.__sheperIntroCalm();
    running = true;
    t0 = performance.now() / 1000;
    setTimeout(function () { if (!ending) finish(); }, 12000);

    if (pref() !== 'off') {
      sound = introSound();
      labelSound();
      /* quase sempre o navegador vai recusar sem um toque antes — daí o botão */
      armSound();
    }
    overlay.classList.add('is-live');
    setTimeout(function () { overlay.classList.add('is-word'); }, 1750 / RATE);
    raf = requestAnimationFrame(loop);
  }

  function renderTick(time) {
    finalMat.uniforms.uTime.value = time;
    dustMat.uniforms.uTime.value = time;

    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    renderer.render(scene, camera);

    brightMat.uniforms.tScene.value = sceneRT.texture;
    drawQuad(brightMat, brightRT);

    var src = brightRT.texture;
    for (var b = 0; b < blurPasses; b++) {
      var step = b + 1;
      blurMat.uniforms.tMap.value = src;
      blurMat.uniforms.uDir.value.set(step / blurA.width, 0);
      drawQuad(blurMat, blurA);
      blurMat.uniforms.tMap.value = blurA.texture;
      blurMat.uniforms.uDir.value.set(0, step / blurA.height);
      drawQuad(blurMat, blurB);
      src = blurB.texture;
    }

    finalMat.uniforms.tScene.value = sceneRT.texture;
    finalMat.uniforms.tBloom.value = blurB.texture;
    drawQuad(finalMat, null);
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);

    var now = performance.now();
    var t = (now / 1000 - t0) * RATE;

    /* Se o aparelho não estiver dando conta, corta qualidade em vez de deixar
       a animação arrastar. Só mede depois que os shaders já compilaram. */
    if (!downshifted && t > 0.35) {
      if (lastFrame) { frameAcc += now - lastFrame; framesSeen++; }
      if (framesSeen === 15) {
        if (frameAcc / framesSeen > 28) downshift();
        else downshifted = true;
      }
    }
    lastFrame = now;

    /* montagem */
    var asm = span(t, 0.18, 2.05);
    uAssemble.value = asm;

    /* câmera: mergulho longo, com folga de lente no fim */
    var cam = outQuint(span(t, 0.0, 2.3));
    var push = inOutCubic(span(t, outAt - 0.25, outAt + OUT_LEN));
    var dist = lerp(fitDist * 1.85, fitDist, cam) - push * fitDist * 0.55;

    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    camera.position.set(px * 0.16, 0.05 + -py * 0.12 + lerp(-0.32, 0, cam), dist);
    camera.lookAt(0, 0, 0);

    /* peça: chega torta e assenta */
    group.rotation.y = lerp(-0.70, -0.10, outQuint(span(t, 0.1, 2.25))) + Math.sin(t * 0.5) * 0.045 + px * 0.07;
    group.rotation.x = lerp(0.22, 0.035, outQuint(span(t, 0.1, 2.4))) + Math.sin(t * 0.42) * 0.02 - py * 0.045;
    group.scale.setScalar(1 + push * 0.22);

    /* o reflexo varre a peça: é o ambiente que gira, não a luz */
    scene.environmentRotation.y = -0.55 + outCubic(span(t, 0.2, 3.0)) * 1.45 + Math.sin(t * 0.22) * 0.05;

    /* estalo no encaixe */
    var lock = span(t, 1.95, 2.12) * (1 - span(t, 2.12, 2.5));
    scene.environmentIntensity = lerp(1.75, 1, outCubic(span(t, 0.2, 2.1))) + lock * 1.4;
    sweep.intensity = lock * 14 + span(t, outAt, outAt + 0.35) * 60;
    back.intensity = 2.4 + lock * 4;

    halo.material.opacity = span(t, 0.1, 1.2) * 0.42;
    dustMat.uniforms.uOpacity.value = span(t, 0.1, 1.4) * 0.5;

    /* revelação e entrega */
    finalMat.uniforms.uFade.value = span(t, 0, 0.5);
    finalMat.uniforms.uExposure.value = 0.85 + span(t, outAt, outAt + OUT_LEN) * 2.9;
    finalMat.uniforms.uBloom.value = 0.42 + lock * 0.6 + span(t, outAt, outAt + OUT_LEN) * 2.6;
    finalMat.uniforms.uAberr.value = 0.3 + push * 2.4;

    renderTick(t);

    if (t > outAt + OUT_LEN * 0.62) finish();
  }

  /* Menos pixels e menos bloom, na hora, sem interromper a cena. */
  function downshift() {
    downshifted = true;
    DPR = Math.max(1, DPR * 0.7);
    blurPasses = 1;
    dustMat.uniforms.uSize.value *= 0.7;
    renderer.setPixelRatio(DPR);
    resize();
  }

  /* ------------------------------------------------------------- entrega */
  function finish() {
    if (ending) return;
    ending = true;
    overlay.classList.add('is-out');
    if (flash) flash.classList.add('is-on');

    setTimeout(function () {
      running = false;
      cancelAnimationFrame(raf);
      detach();
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      if (scene.environment) scene.environment.dispose();
      if (sceneRT) { sceneRT.dispose(); brightRT.dispose(); blurA.dispose(); blurB.dispose(); }
      renderer.dispose();
      if (sound) sound.stop(0.5);
      kill();
    }, 320);
  }

  function skip() {
    if (ending || !running) { kill(); return; }
    var t = (performance.now() / 1000 - t0) * RATE;
    /* não corta seco: joga o final para daqui a pouco */
    outAt = Math.min(outAt, t + 0.12);
    OUT_LEN = 0.4;
    if (sound) sound.stop(0.45 / RATE);
  }

  var onKey = function (e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
  };
  /* aba escondida no meio da abertura: não vale a pena insistir */
  var onHide = function () { if (document.hidden && running) skip(); };
  var onClick = function (e) { if (!e.target.closest('button')) skip(); };

  if (soundBt) soundBt.addEventListener('click', function () {
    if (soundOn) {
      soundOn = false;
      pref('off');
      if (sound) { sound.stop(0.25); sound = null; }
      labelSound();
    } else {
      pref('on');
      if (!sound) sound = introSound();
      armSound();
    }
  });

  if (skipBt) skipBt.addEventListener('click', skip);
  overlay.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', skip, { passive: true });
  window.addEventListener('touchmove', skip, { passive: true });
  document.addEventListener('visibilitychange', onHide);

  function detach() {
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', skip);
    window.removeEventListener('touchmove', skip);
    document.removeEventListener('visibilitychange', onHide);
  }
}
