// Hero: crema liquida animata in WebGL
// Una superficie setosa (rumore deformato su se stesso) illuminata dall'alto a sinistra,
// nei colori del sito. Si ferma fuori schermo; con "riduci movimento" resta un fotogramma fisso.
const CREAM_SHADER = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;

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

void main() {
  vec2 p = gl_FragCoord.xy / uRes.y * 3.2;
  float t = uTime;
  float e = 0.012;
  float h = field(p, t);
  float dx = (field(p + vec2(e, 0.0), t) - h) / e;
  float dy = (field(p + vec2(0.0, e), t) - h) / e;
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

  // colore quasi uniforme, con una lenta sfumatura cipria / celeste sulla superficie
  float drift = 0.5 + 0.5 * sin(p.x * 0.22 - p.y * 0.15 + t * 0.05);
  vec3 col = mix(cream, blush, 0.35 + 0.35 * drift);
  col = mix(col, sky, smoothstep(0.65, 1.0, 1.0 - drift) * 0.30);
  col = mix(col, peach, (1.0 - h) * 0.22);

  col *= 0.58 + 0.50 * dif;                       // forma
  col *= mix(0.80, 1.0, smoothstep(0.0, 0.30, h)); // ombra nelle pieghe
  col += spec;                                     // lucido della crema

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
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now() - 20000; // parte già "in movimento"
  let visible = false;
  let ready = false;
  let raf = 0;

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
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - t0) / 1000 * 0.6);
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

  if (still) window.addEventListener('resize', () => requestAnimationFrame(draw));
}

const creamCanvas = document.querySelector('.hero__canvas');
if (creamCanvas) initCream(creamCanvas);

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
