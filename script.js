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

// Schede (aree dei trattamenti, linee di prodotti): un pannello visibile alla volta
function selectTab(tab) {
  tab.parentElement.querySelectorAll('[role="tab"]').forEach((t) => {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  });
}

document.querySelectorAll('[role="tablist"]').forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  selectTab(tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = tabs[(i + step + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });
});

// Prodotti: le frecce fanno scorrere la fila e si spengono agli estremi
document.querySelectorAll('.line').forEach((line) => {
  const shelf = line.querySelector('.shelf');
  const nav = line.querySelector('.shelf-nav');
  if (!shelf || !nav) return;
  const [prev, next] = nav.querySelectorAll('button');
  const update = () => {
    const max = shelf.scrollWidth - shelf.clientWidth;
    nav.hidden = max <= 1;
    prev.disabled = shelf.scrollLeft <= 1;
    next.disabled = shelf.scrollLeft >= max - 1;
  };
  [prev, next].forEach((btn) => btn.addEventListener('click', () => {
    shelf.scrollBy({ left: Number(btn.dataset.dir) * shelf.clientWidth * 0.8 });
  }));
  shelf.addEventListener('scroll', update, { passive: true });
  // scatta anche quando la linea viene mostrata (da nascosta ha larghezza zero)
  new ResizeObserver(update).observe(shelf);
});

// Prodotto a tutta pagina: si apre toccandolo, le frecce (o lo swipe) passano agli
// altri della stessa linea. La foto grande sta in img/prodotti/grandi/.
const viewer = document.getElementById('viewer');
const viewerImg = viewer.querySelector('.viewer__img');
let viewerItems = [];
let viewerIndex = 0;

function showProduct(i) {
  viewerIndex = (i + viewerItems.length) % viewerItems.length;
  const btn = viewerItems[viewerIndex];
  const small = btn.querySelector('img').src;
  viewerImg.src = small;
  const large = new Image();
  large.onload = () => { if (viewerItems[viewerIndex] === btn) viewerImg.src = large.src; };
  large.src = small.replace('/prodotti/', '/prodotti/grandi/');
  viewer.querySelector('.viewer__name').innerHTML = btn.querySelector('.product__name').innerHTML;
  viewer.querySelector('.viewer__line').textContent = btn.closest('.line').querySelector('.line__name').textContent;
  viewer.querySelectorAll('.viewer__nav').forEach((nav) => { nav.hidden = viewerItems.length < 2; });
}

document.querySelectorAll('.product__btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    viewerItems = [...btn.closest('.shelf').querySelectorAll('.product__btn')];
    showProduct(viewerItems.indexOf(btn));
    viewer.showModal();
  });
});
viewer.querySelector('.viewer__nav--prev').addEventListener('click', () => showProduct(viewerIndex - 1));
viewer.querySelector('.viewer__nav--next').addEventListener('click', () => showProduct(viewerIndex + 1));
viewer.querySelector('.viewer__close').addEventListener('click', () => viewer.close());
viewer.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') showProduct(viewerIndex + 1);
  if (e.key === 'ArrowLeft') showProduct(viewerIndex - 1);
});
let swipeX = null;
viewer.addEventListener('touchstart', (e) => { swipeX = e.touches[0].clientX; }, { passive: true });
viewer.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - swipeX;
  if (Math.abs(dx) > 50 && viewerItems.length > 1) showProduct(viewerIndex + (dx < 0 ? 1 : -1));
});
viewer.addEventListener('close', () => viewerItems[viewerIndex]?.focus());

// Mostra il pannello che contiene un elemento (es. la card aperta dalla tendina)
function revealPanel(el) {
  const panel = el.closest('[role="tabpanel"]');
  if (panel) selectTab(document.querySelector(`[aria-controls="${panel.id}"]`));
}

// Scheda del trattamento: la finestra prende foto, nome e testo dalla card
const sheet = document.getElementById('sheet');
const sheetImg = sheet.querySelector('.sheet__media img');
let sheetFrom = null;

function openTreatment(article) {
  revealPanel(article);
  sheetImg.src = article.querySelector('.card__thumb img').src;
  sheet.querySelector('.sheet__meta').textContent = `${article.dataset.area} · ${article.dataset.time}`;
  sheet.querySelector('.sheet__title').innerHTML = article.querySelector('.treatment__name').innerHTML;
  sheet.querySelector('.sheet__detail').innerHTML = article.querySelector('.treatment__detail').innerHTML;
  sheet.querySelector('.sheet__body').scrollTop = 0;
  sheetFrom = article;
  if (!sheet.open) sheet.showModal();
  history.replaceState(null, '', `#${article.id}`);
}

sheet.addEventListener('close', () => {
  history.replaceState(null, '', location.pathname + location.search);
  // si torna sulla card, anche se la scheda era stata aperta dalla tendina
  sheetFrom?.querySelector('.card').focus();
});
sheet.querySelector('.sheet__close').addEventListener('click', () => sheet.close());
// click sullo sfondo scuro fuori dalla finestra
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

document.querySelectorAll('.treatment .card').forEach((card) => {
  card.addEventListener('click', () => openTreatment(card.closest('.treatment')));
});

// I link a un trattamento (#t-…) aprono la sua scheda; quelli a una linea (#line-…) la mostrano
document.querySelectorAll('a[href^="#t-"], a[href^="#line-"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.getElementById(a.hash.slice(1));
    if (!target) return;
    e.preventDefault();
    closePanels();
    if (target.matches('.treatment')) {
      openTreatment(target);
    } else {
      revealPanel(target);
      document.getElementById('prodotti').scrollIntoView();
    }
  });
});

// Indirizzo condiviso con la scheda aperta (…/#t-hydra-glow) o con una linea (…/#line-renight)
const linked = document.getElementById(location.hash.slice(1));
if (linked?.matches('.treatment')) openTreatment(linked);
else if (linked?.matches('.line')) revealPanel(linked);

// Card trattamenti: comparsa allo scroll, sfalsata per colonna
const cols = () => (window.matchMedia('(max-width: 840px)').matches ? 2 : 4);

const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealer.unobserve(entry.target);
  });
}, { threshold: 0.15 });

document.querySelectorAll('.grid').forEach((grid) => {
  grid.querySelectorAll('.treatment').forEach((card, i) => {
    card.classList.add('reveal');
    card.style.setProperty('--delay', `${(i % cols()) * 80}ms`);
    revealer.observe(card);
  });
});
document.querySelectorAll('.tech .treatment').forEach((card, i) => {
  card.classList.add('reveal');
  card.style.setProperty('--delay', `${i * 80}ms`);
  revealer.observe(card);
});
