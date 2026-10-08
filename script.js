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
