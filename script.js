// Raso di crema color champagne che respira, animato in WebGL (hero e footer)
// La base è un render del raso (img/hero-satin.jpg): lo shader lo fa ondeggiare piano come un
// tessuto, ci fa scorrere sopra un velo di luce e, sotto il cursore, lo rifrange appena come
// attraverso un velo d'acqua lasciando una scia di schiuma bianca che si dirada bolla per bolla.
// Si ferma fuori schermo; con "riduci movimento" resta l'immagine ferma.
const MAX_FOAM = 24;

const CREAM_SHADER = `
precision highp float;
uniform sampler2D uTex;
uniform float uTexAspect;
uniform vec2 uRes;
uniform float uTime;                 // secondi
uniform vec4 uFoam[${MAX_FOAM}];     // schiuma: xy = punto, z = istante, w = quantità
uniform vec3 uPointer;               // cursore: xy = punto, z = pressione (0..1)

// hash con numeri piccoli: stabili su ogni scheda video
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// schiuma e velo d'acqua in un solo giro sulle gocce (i pixel lontani da una goccia la saltano):
// x = schiuma qui, y = schiuma poco più su a sinistra (per l'ombra),
// z = velo d'acqua qui, w libero; dx/dy = velo d'acqua spostato di e (per la pendenza)
const float E = 0.004;
vec4 effects(vec2 p, float t, out float dx, out float dy) {
  vec4 r = vec4(0.0);
  dx = 0.0;
  dy = 0.0;
  for (int i = 0; i < ${MAX_FOAM}; i++) {
    vec4 d = uFoam[i];
    float age = t - d.z;
    if (age < 0.0 || age > 6.0) continue;
    vec2 dd = p - d.xy;
    if (dot(dd, dd) > 0.2) continue;
    // schiuma: si allarga piano e svanisce in ~6 s
    float rr = 0.045 + age * 0.012;
    vec2 ds = dd + vec2(0.010, 0.014);
    float life = d.w * smoothstep(6.0, 1.2, age);
    r.x += life * exp(-dot(dd, dd) / (rr * rr));
    r.y += life * exp(-dot(ds, ds) / (rr * rr));
    // velo d'acqua: un solo rigonfiamento morbido che si allontana piano
    if (age < 2.5) {
      float k = d.w * exp(-age * 1.7) * 0.5;
      float front = age * 0.15;
      float x0 = length(dd) - front;
      float x1 = length(dd + vec2(E, 0.0)) - front;
      float x2 = length(dd + vec2(0.0, E)) - front;
      r.z += k * exp(-x0 * x0 * 110.0);
      dx += k * exp(-x1 * x1 * 110.0);
      dy += k * exp(-x2 * x2 * 110.0);
    }
  }
  // l'incavo morbido sotto il cursore
  vec2 dp = p - uPointer.xy;
  r.z -= uPointer.z * exp(-dot(dp, dp) * 60.0);
  dp.x += E;
  dx -= uPointer.z * exp(-dot(dp, dp) * 60.0);
  dp.x -= E;
  dp.y += E;
  dy -= uPointer.z * exp(-dot(dp, dp) * 60.0);
  return r;
}

// celle di Voronoi per le bollicine: x = distanza dal centro, y = id, zw = posizione nella bolla
vec4 cells(vec2 x, float t) {
  vec2 n = floor(x), f = fract(x);
  vec4 best = vec4(8.0, 0.0, 0.0, 0.0);
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash2(n + g);
    o = 0.5 + 0.35 * sin(t * 0.6 + 6.2831 * o);
    vec2 r = g + o - f;
    float dd = dot(r, r);
    if (dd < best.x) best = vec4(dd, hash(n + g), -r);
  }
  best.x = sqrt(best.x);
  return best;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime;

  // il raso respira: ondeggia lento e si avvicina appena
  vec2 flow = vec2(noise(p * 1.4 + vec2(t * 0.05, 0.0)), noise(p * 1.4 + vec2(3.1, -t * 0.045))) - 0.5;
  vec2 sway = vec2(sin(t * 0.21 + p.y * 2.3), cos(t * 0.17 + p.x * 1.9)) * 0.004;
  float zoom = 1.04 + 0.012 * sin(t * 0.07);

  // schiuma e velo d'acqua; la pendenza del velo rifrange il raso
  float wx, wy;
  vec4 fx = effects(p, t, wx, wy);
  vec2 gw = vec2(wx - fx.z, wy - fx.z) / E;

  // immagine "cover" nel riquadro
  float a = uRes.x / uRes.y;
  vec2 tuv = (uv - 0.5) / zoom;
  if (a > uTexAspect) tuv.y *= uTexAspect / a; else tuv.x *= a / uTexAspect;
  tuv += 0.5 + flow * 0.010 + sway - gw * 0.0035;
  vec3 col = texture2D(uTex, tuv).rgb;

  // un velo di luce che attraversa piano il raso
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float band = uv.x * 0.8 + (1.0 - uv.y) * 0.55 - mod(t * 0.045, 2.6) + 0.6;
  col += exp(-band * band * 9.0) * 0.05 * smoothstep(0.55, 0.95, lum);

  // riflesso bagnato sul velo d'acqua
  vec3 n = normalize(vec3(-gw * 0.05, 1.0));
  float glow = pow(clamp(dot(n, normalize(vec3(-0.5, 0.6, 0.65))), 0.0, 1.0), 40.0);
  col += glow * 0.18 * clamp(length(gw) * 0.8, 0.0, 1.0);

  // schiuma bianca: ombra leggera sotto, velo lattiginoso, bollicine fini che si diradano
  float fa = fx.x;
  col *= 1.0 - clamp(fx.y - fa * 0.6, 0.0, 1.0) * 0.07;
  if (fa > 0.01) {
    float dens = clamp(fa, 0.0, 1.0);
    vec4 c1 = cells(p * 95.0, t);
    vec4 c2 = cells(p * 46.0 + 3.7, t + 1.3);
    float on1 = step(c1.y, dens);
    float on2 = step(c2.y, dens * 0.85);
    float bub = max(on1 * smoothstep(0.46, 0.30, c1.x), on2 * smoothstep(0.46, 0.28, c2.x));
    float rim = max(on1 * smoothstep(0.30, 0.40, c1.x) * smoothstep(0.52, 0.42, c1.x),
                    on2 * smoothstep(0.28, 0.40, c2.x) * smoothstep(0.52, 0.42, c2.x));
    float glint = max(on1 * smoothstep(0.10, 0.0, length(c1.zw - vec2(-0.13, 0.13))),
                      on2 * smoothstep(0.10, 0.0, length(c2.zw - vec2(-0.12, 0.12))));
    vec3 milk = vec3(1.0, 0.988, 0.962);   // schiuma avorio
    col = mix(col, milk, smoothstep(0.03, 0.65, dens) * 0.80);
    col = mix(col, milk, bub * dens * 0.30);
    col -= rim * dens * 0.07;
    col += glint * dens * 0.20;
  }

  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.008;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function initCream(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;

  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }');
  const fs = shader(gl.FRAGMENT_SHADER, CREAM_SHADER);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  // un triangolo che copre tutto lo schermo
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uFoam = gl.getUniformLocation(prog, 'uFoam');
  const uPointer = gl.getUniformLocation(prog, 'uPointer');
  const uTexAspect = gl.getUniformLocation(prog, 'uTexAspect');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now() - 30000;
  const clock = (now) => (now - t0) / 1000;
  let visible = false;
  let loaded = false;
  let ready = false;
  let raf = 0;

  // schiuma e cursore, nelle stesse coordinate dello shader (centro = 0, altezza = 1)
  const foam = new Float32Array(MAX_FOAM * 4).fill(-1000);
  let nextFoam = 0;
  const pointer = { x: 0, y: 0, press: 0, target: 0, lastX: 9, lastY: 9 };

  function addFoam(x, y, amount) {
    foam.set([x, y, clock(performance.now()), amount], nextFoam * 4);
    nextFoam = (nextFoam + 1) % MAX_FOAM;
  }

  function toField(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left - r.width / 2) / r.height, (r.top + r.height / 2 - e.clientY) / r.height];
  }

  // risoluzione: segue lo schermo fino a 1280 px di larghezza (il raso è morbido, basta)
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(dpr, 1280 / Math.max(1, canvas.clientWidth));
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw(now) {
    if (!loaded) return;
    resize();
    pointer.press += (pointer.target - pointer.press) * 0.06;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, clock(now));
    gl.uniform4fv(uFoam, foam);
    gl.uniform3f(uPointer, pointer.x, pointer.y, pointer.press);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!ready) {
      ready = true;
      canvas.classList.add('is-ready');
    }
    if (!still && visible) raf = requestAnimationFrame(draw);
  }

  // il raso
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1f(uTexAspect, img.naturalWidth / img.naturalHeight);
    loaded = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };
  img.src = canvas.dataset.src;

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    cancelAnimationFrame(raf);
    if ((visible && !still) || !ready) raf = requestAnimationFrame(draw);
  }).observe(canvas);

  if (still) {
    window.addEventListener('resize', () => requestAnimationFrame(draw));
    return;
  }

  // muovendo il cursore resta una scia di schiuma; un tocco ne fa sbocciare un po' di più
  const area = canvas.parentElement; // la hero o il pannello del footer
  area.addEventListener('pointermove', (e) => {
    const [x, y] = toField(e);
    pointer.x = x;
    pointer.y = y;
    pointer.target = e.pointerType === 'mouse' ? 1 : 0;
    if (Math.hypot(x - pointer.lastX, y - pointer.lastY) > 0.035) {
      addFoam(x, y, 0.8);
      pointer.lastX = x;
      pointer.lastY = y;
    }
  });
  area.addEventListener('pointerdown', (e) => {
    const [x, y] = toField(e);
    pointer.x = pointer.lastX = x;
    pointer.y = pointer.lastY = y;
    addFoam(x, y, 1.5);
  });
  area.addEventListener('pointerleave', () => { pointer.target = 0; });
}

// lo stesso raso nella hero e nel footer: ognuno si anima solo quando è sullo schermo
document.querySelectorAll('.cream-canvas').forEach(initCream);

// Tendine del menu (Trattamenti / Chi siamo): una aperta alla volta
const menuButtons = [...document.querySelectorAll('.site-menu__btn')];

function closePanels() {
  menuButtons.forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false');
    document.getElementById(btn.getAttribute('aria-controls')).hidden = true;
  });
}

function openPanel(id) {
  closePanels();
  const btn = menuButtons.find((b) => b.getAttribute('aria-controls') === id);
  btn.setAttribute('aria-expanded', 'true');
  document.getElementById(id).hidden = false;
}

menuButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    if (isOpen) closePanels();
    else openPanel(btn.getAttribute('aria-controls'));
  });
});

// Link che aprono una tendina (es. "Chi siamo" nel footer)
document.querySelectorAll('[data-open]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPanel(link.dataset.open);
  });
});

// Un link interno nella tendina la chiude; click fuori o Esc la chiudono
document.querySelectorAll('.menu-panel a[href^="#"]').forEach((a) => a.addEventListener('click', closePanels));
document.addEventListener('click', (e) => { if (!e.target.closest('.site-menu')) closePanels(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = menuButtons.find((b) => b.getAttribute('aria-expanded') === 'true');
  closePanels();
  open?.focus();
});

// Card trattamenti: comparsa allo scroll, sfalsata per colonna
const cards = document.querySelectorAll('.treatment');
const cols = () => (window.matchMedia('(max-width: 840px)').matches ? 2 : 4);

const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealer.unobserve(entry.target);
  });
}, { threshold: 0.15 });

cards.forEach((card, i) => {
  card.classList.add('reveal');
  card.style.setProperty('--delay', `${(i % cols()) * 80}ms`);
  revealer.observe(card);
});
