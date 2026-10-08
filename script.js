// Hero: crema liquida animata in WebGL
// Una superficie setosa (rumore deformato su se stesso) illuminata dall'alto a sinistra,
// nei colori del sito. Il cursore (o il dito) la preme e la increspa come acqua, con un velo
// di schiuma sulle creste delle onde. Si ferma fuori schermo; con "riduci movimento" resta ferma.
const MAX_DROPS = 16;

const CREAM_SHADER = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec4 uDrops[${MAX_DROPS}]; // onde: xy = punto, z = istante, w = forza
uniform vec3 uPointer;             // cursore: xy = punto, z = pressione (0..1)

// hash con numeri piccoli: stabile su ogni scheda video (niente "cuciture" tra le celle)
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// rumore con interpolazione quintica: niente spigoli nelle normali
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

// altezza della crema: nastri con creste tonde e pieghe strette (|sin|), piegati da un rumore lento
float field(vec2 p, float t) {
  float w1 = fbm(p * 0.45 + vec2(t * 0.04, -t * 0.03));
  float w2 = fbm(p * 0.35 + vec2(-t * 0.03, t * 0.04) + 7.3);
  float a = abs(sin(p.x * 1.15 + p.y * 0.55 + w1 * 3.2 + t * 0.12));
  float b = abs(sin(p.y * 0.95 - p.x * 0.35 + w2 * 2.6 - t * 0.09));
  return 0.68 * a + 0.32 * b;
}

// anelli d'onda che partono dal cursore, si allargano e si spengono
// (x = altezza dell'onda, y = quanta "schiuma" c'è sulla cresta)
vec2 ripples(vec2 p, float t) {
  vec2 r = vec2(0.0);
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    vec4 d = uDrops[i];
    float age = t - d.z;
    if (age < 0.0 || age > 3.5) continue;
    float dist = length(p - d.xy);
    float x = dist - age * 1.6;                      // fronte dell'onda
    float env = exp(-x * x * 5.0) * exp(-age * 1.1) * d.w;
    float wave = sin(dist * 16.0 - age * 14.0);
    r += vec2(wave * env, max(wave, 0.0) * env);
  }
  return r;
}

// superficie finale: crema + onde - l'incavo morbido sotto il cursore
float surface(vec2 p, float t) {
  vec2 d = p - uPointer.xy;
  return field(p, t) + ripples(p, t).x * 0.06 - uPointer.z * 0.12 * exp(-dot(d, d) * 9.0);
}

void main() {
  vec2 p = gl_FragCoord.xy / uRes.y * 3.2;
  float t = uTime;
  float e = 0.012;
  float h = surface(p, t);
  float dx = (surface(p + vec2(e, 0.0), t) - h) / e;
  float dy = (surface(p + vec2(0.0, e), t) - h) / e;
  vec3 n = normalize(vec3(-dx * 0.30, -dy * 0.30, 1.0));

  vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float dif = clamp(dot(n, L), 0.0, 1.0);
  float nh = clamp(dot(n, H), 0.0, 1.0);
  float spec = pow(nh, 36.0) * 0.22 + pow(nh, 220.0) * 0.55;

  vec3 cream = vec3(1.000, 0.972, 0.935);
  vec3 blush = vec3(0.975, 0.835, 0.790);
  vec3 peach = vec3(0.985, 0.760, 0.660);
  vec3 sky   = vec3(0.800, 0.905, 0.910);
  vec3 foam  = vec3(1.000, 0.992, 0.975);

  // colore quasi uniforme, con una lenta sfumatura cipria / celeste sulla superficie
  float drift = 0.5 + 0.5 * sin(p.x * 0.22 - p.y * 0.15 + t * 0.05);
  vec3 col = mix(cream, blush, 0.35 + 0.35 * drift);
  col = mix(col, sky, smoothstep(0.65, 1.0, 1.0 - drift) * 0.30);
  col = mix(col, peach, (1.0 - clamp(h, 0.0, 1.0)) * 0.22);

  col *= 0.58 + 0.50 * dif;                                       // forma
  col *= mix(0.80, 1.0, smoothstep(0.0, 0.30, h));                 // ombra nelle pieghe
  col = mix(col, foam, clamp(ripples(p, t).y, 0.0, 1.0) * 0.45);  // schiuma sulle creste
  col += spec;                                                     // lucido della crema

  vec2 c = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - dot(c, c) * 0.18;
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.015;
  gl_FragColor = vec4(col, 1.0);
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
  const uDrops = gl.getUniformLocation(prog, 'uDrops');
  const uPointer = gl.getUniformLocation(prog, 'uPointer');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now() - 20000; // parte già "in movimento"
  const clock = (now) => (now - t0) / 1000 * 0.6;
  let visible = false;
  let ready = false;
  let raf = 0;

  // onde e cursore, nelle stesse coordinate dello shader
  const drops = new Float32Array(MAX_DROPS * 4).fill(-1000);
  let nextDrop = 0;
  const pointer = { x: 0, y: 0, press: 0, target: 0, lastX: 0, lastY: 0 };

  function addDrop(x, y, strength) {
    drops.set([x, y, clock(performance.now()), strength], nextDrop * 4);
    nextDrop = (nextDrop + 1) % MAX_DROPS;
  }

  function toField(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.height * 3.2, (r.bottom - e.clientY) / r.height * 3.2];
  }

  // la crema è morbida: basta disegnarla a metà risoluzione, il browser la ingrandisce
  function resize() {
    const w = Math.max(1, Math.round(canvas.clientWidth * 0.5));
    const h = Math.max(1, Math.round(canvas.clientHeight * 0.5));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw(now) {
    resize();
    pointer.press += (pointer.target - pointer.press) * 0.08;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, clock(now));
    gl.uniform4fv(uDrops, drops);
    gl.uniform3f(uPointer, pointer.x, pointer.y, pointer.press);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!ready) {
      ready = true;
      canvas.classList.add('is-ready');
    }
    if (!still && visible) raf = requestAnimationFrame(draw);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    cancelAnimationFrame(raf);
    if ((visible && !still) || !ready) raf = requestAnimationFrame(draw);
  }).observe(canvas);

  if (still) {
    window.addEventListener('resize', () => requestAnimationFrame(draw));
    return;
  }

  // il cursore preme la crema; muovendolo lascia una scia di onde, un tocco ne fa partire una più forte
  const hero = canvas.parentElement;
  hero.addEventListener('pointermove', (e) => {
    const [x, y] = toField(e);
    pointer.x = x;
    pointer.y = y;
    pointer.target = e.pointerType === 'mouse' ? 1 : 0;
    const moved = Math.hypot(x - pointer.lastX, y - pointer.lastY);
    if (moved > 0.22) {
      addDrop(x, y, Math.min(1, 0.35 + moved));
      pointer.lastX = x;
      pointer.lastY = y;
    }
  });
  hero.addEventListener('pointerdown', (e) => {
    const [x, y] = toField(e);
    pointer.x = pointer.lastX = x;
    pointer.y = pointer.lastY = y;
    addDrop(x, y, 1.5);
  });
  hero.addEventListener('pointerleave', () => { pointer.target = 0; });
}

const creamCanvas = document.querySelector('.hero__canvas');
if (creamCanvas) initCream(creamCanvas);

// Hero: scorrendo si stacca dai bordi e arrotonda gli angoli (come la home di Vibrolux)
// Dal fondo della hero al 67% della finestra, per un terzo di finestra di scroll:
// perde 16px di larghezza e gli angoli passano da 0 a 80px. Solo da 1081px in su.
const heroEl = document.querySelector('.hero');
const roundMedia = window.matchMedia('(min-width: 1081px) and (prefers-reduced-motion: no-preference)');
let roundTicking = false;

function roundHero() {
  roundTicking = false;
  if (!roundMedia.matches) {
    heroEl.style.transform = '';
    heroEl.style.borderRadius = '';
    return;
  }
  const vh = window.innerHeight;
  const bottom = heroEl.offsetTop + heroEl.offsetHeight - window.scrollY; // senza la trasformazione
  const progress = Math.min(1, Math.max(0, (vh * 0.67 - bottom) / (vh * 0.33)));
  heroEl.style.transform = `scale(${1 - progress * 16 / window.innerWidth})`;
  heroEl.style.borderRadius = `${progress * 80}px`;
}

if (heroEl) {
  const requestRound = () => {
    if (!roundTicking) {
      roundTicking = true;
      requestAnimationFrame(roundHero);
    }
  };
  window.addEventListener('scroll', requestRound, { passive: true });
  window.addEventListener('resize', requestRound);
  roundMedia.addEventListener('change', requestRound);
  roundHero();
}

// Tendine del menu (Lavorazioni / Chi siamo): una aperta alla volta
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

// Anno nel footer
document.querySelectorAll('.js-year').forEach((el) => { el.textContent = new Date().getFullYear(); });
