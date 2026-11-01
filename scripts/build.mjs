// Scrive in index.html le parti che vengono dai dati: la tendina Trattamenti, le aree con le
// loro card, la Tecnologia e i Prodotti. I trattamenti stanno in data/trattamenti/ (li modifica
// Paola dal pannello, vedi .pages.yml), i prodotti in data/prodotti.json.
//
//   node scripts/build.mjs          rigenera index.html e l'elenco dei prodotti in .pages.yml
//   node scripts/build.mjs --foto   in più riduce le foto caricate dal pannello (lo fa GitHub
//                                   prima di pubblicare; serve sharp, vedi .github/workflows)
//
// Ogni parte generata sta tra <!-- dati:nome --> e <!-- /dati:nome -->: quello che c'è in mezzo
// viene riscritto, il resto della pagina no. Un trattamento senza nome viene saltato, una foto
// che non c'è diventa la crema: il sito si pubblica comunque.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOTO_SENZA = 'img/crema.jpg';
const WHATSAPP = '393481515097';
const TELEFONO = { href: 'tel:+390424512529', testo: '0424 512529' };

// Le aree, nell'ordine della pagina; col è la colonna della tendina
const AREE = [
  { file: 'viso', nome: 'Viso', tab: 'viso', col: 0 },
  { file: 'corpo', nome: 'Corpo e massaggi', tab: 'corpo', col: 1 },
  { file: 'epilazione', nome: 'Epilazione', tab: 'epilazione', col: 2 },
  {
    file: 'pedicure', nome: 'Pedicure', tab: 'pedicure', col: 2,
    // accanto alla card, la nota sui prodotti Dermalena
    dopo: `<aside class="note-card">
  <p class="panel-label">I prodotti per i piedi</p>
  <p class="note-card__title">Dermalena</p>
  <p class="note-card__text">Nella pedicure uso Dermalena, una linea professionale pensata per la pelle secca, le callosità e le unghie.</p>
  <a class="note-card__link" href="#line-dermalena">I prodotti →</a>
</aside>`,
  },
  { file: 'tecnologia', nome: 'Tecnologia', col: 2, tech: true },
];

const avvisi = [];
const avvisa = (msg) => avvisi.push(msg);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// come nei link scritti a mano: anche ! ' ( ) * diventano %XX
const url = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const indent = (text, n) => text.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');
const leggi = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

// ---------- Dati ----------

const linee = leggi('data/prodotti.json').linee;
const prodotti = new Map();
for (const linea of linee) {
  for (const p of linea.prodotti) {
    prodotti.set(p.id, { ...p, linea: linea.nome, foto: `img/prodotti/${p.id}.jpg` });
    if (!existsSync(join(ROOT, `img/prodotti/${p.id}.jpg`))) avvisa(`manca la foto del prodotto ${p.id}`);
  }
  // una linea senza foto si sceglie tutta intera (Dermalena)
  if (linea.scheda) prodotti.set(linea.id, { id: linea.id, nome: linea.scheda.nome, linea: linea.scheda.sottotitolo, marchio: linea.nome });
}

function prezzo(t) {
  const n = Number(String(t.prezzo ?? '').replace(',', '.').trim() || NaN);
  if (!(n > 0)) return '';
  const cifra = new Intl.NumberFormat('it-IT', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
  return `${t.prezzo_da ? 'da ' : ''}${cifra}\u00a0€`;
}

const usati = new Set();
function trattamento(t, area, i) {
  const nome = String(t.nome ?? '').replace(/\s+/g, ' ').trim();
  if (!nome) {
    avvisa(`${area.file}.json: il trattamento n. ${i + 1} non ha un nome, lo salto`);
    return null;
  }
  // l'id resta quello di prima anche se il nome cambia, così i link #t-… continuano a funzionare
  const base = slug(t.id || nome) || 'trattamento';
  let id = base;
  for (let n = 2; usati.has(id); n++) id = `${base}-${n}`;
  usati.add(id);

  let foto = String(t.foto ?? '').trim().replace(/^\/+/, '');
  if (foto && !existsSync(join(ROOT, foto))) {
    avvisa(`${nome}: la foto ${foto} non c'è, uso la crema`);
    foto = '';
  }

  const scelti = Array.isArray(t.prodotti) ? t.prodotti : t.prodotti ? [t.prodotti] : [];
  const video = (Array.isArray(t.video) ? t.video : [])
    .map((v) => ({ titolo: String(v?.titolo ?? '').trim() || 'Video', link: String(v?.link ?? '').trim() }))
    .filter((v) => /^https?:\/\/\S+$/.test(v.link));

  return {
    id,
    nome,
    area: area.nome,
    durata: String(t.durata ?? '').trim(),
    prezzo: prezzo(t),
    paragrafi: String(t.descrizione ?? '').trim().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    foto: foto || FOTO_SENZA,
    prodotti: scelti.filter((p) => {
      if (prodotti.has(p)) return true;
      if (p) avvisa(`${nome}: il prodotto ${p} non è in data/prodotti.json`);
      return false;
    }).map((p) => prodotti.get(p)),
    video,
  };
}

const aree = AREE.map((area) => {
  let lista = [];
  try {
    lista = leggi(`data/trattamenti/${area.file}.json`).trattamenti ?? [];
  } catch (e) {
    avvisa(`data/trattamenti/${area.file}.json non si legge (${e.message}): l'area resta vuota`);
  }
  return { ...area, trattamenti: lista.map((t, i) => trattamento(t, area, i)).filter(Boolean) };
});
const piene = aree.filter((a) => a.trattamenti.length);

// ---------- HTML ----------

const chip = (p) => (p.marchio
  ? `<li class="product-chip"><span class="product-chip__img product-chip__img--text">${esc(p.marchio)}</span><span><span class="product-chip__name">${esc(p.nome)}</span><span class="product-chip__line">${esc(p.linea)}</span></span></li>`
  : `<li class="product-chip"><span class="product-chip__img"><img src="${p.foto}" alt="" width="450" height="600" loading="lazy"></span><span><span class="product-chip__name">${esc(p.nome)}</span><span class="product-chip__line">${esc(p.linea)}</span></span></li>`);

const videoLink = (v) => `<a href="${esc(v.link)}" target="_blank" rel="noopener">${esc(v.titolo)} ↗</a>`;

function card(t, { titolo = 'h4', lazy = true } = {}) {
  const parti = [];
  if (t.prezzo) parti.push(`<p class="treatment__price">${t.prezzo}</p>`);
  for (const p of t.paragrafi) parti.push(`<p class="treatment__desc">${esc(p).replace(/\n/g, '<br>')}</p>`);
  if (t.prodotti.length) {
    parti.push('<p class="panel-label">Prodotti usati</p>');
    parti.push(`<ul class="product-chips">\n${indent(t.prodotti.map(chip).join('\n'), 2)}\n</ul>`);
  }
  if (t.video.length) parti.push(`<ul class="treatment__links">\n${indent(t.video.map((v) => `<li>${videoLink(v)}</li>`).join('\n'), 2)}\n</ul>`);
  parti.push(`<p class="treatment__book">
  <a class="pill pill--wine" href="https://wa.me/${WHATSAPP}?text=${url(`Ciao! Vorrei prenotare: ${t.nome}`)}" target="_blank" rel="noopener">Prenota su WhatsApp</a>
  <a class="pill pill--line" href="${TELEFONO.href}">Chiama ${TELEFONO.testo}</a>
</p>`);

  const info = [`<${titolo} class="treatment__name">${esc(t.nome)}</${titolo}>`];
  if (t.video.length) info.push(`<p class="treatment__videos">${t.video.map(videoLink).join(' · ')}</p>`);

  return `<article class="treatment" id="t-${t.id}" data-area="${esc(t.area)}"${t.durata ? ` data-time="${esc(t.durata)}"` : ''}>
  <button class="card" type="button" aria-label="${esc(t.nome)}: scopri il trattamento">
    <span class="card__thumb"><img src="${esc(t.foto)}" alt="" width="880" height="1100"${lazy ? ' loading="lazy"' : ''}></span>
    <span class="card__label"><span class="card__cta">Scopri il trattamento</span><span class="card__name" aria-hidden="true">${esc(t.nome)}</span></span>
  </button>
  <div class="treatment__info">
${indent(info.join('\n'), 4)}
  </div>
  <div class="treatment__detail">
${indent(parti.join('\n'), 4)}
  </div>
</article>`;
}

// Tendina: una colonna per Viso, una per Corpo, e la terza con le aree più corte
function menu() {
  const colonne = [0, 1, 2].map((c) => piene.filter((a) => a.col === c)).filter((c) => c.length);
  return colonne.map((col) => `<div class="menu-cats__col">
${indent(col.map((a) => `<section>
  <h2 class="panel-label">${esc(a.nome)}</h2>
  <ul>
${indent(a.trattamenti.map((t) => {
    const nota = [t.durata, t.prezzo].filter(Boolean).map(esc).join(' · ');
    return `<li><a href="#t-${t.id}"><span>${esc(t.nome)}</span>${nota ? `<span class="menu-cats__time">${nota}</span>` : ''}</a></li>`;
  }).join('\n'), 4)}
  </ul>
</section>`).join('\n'), 2)}
</div>`).join('\n');
}

// Le schede delle aree e, per ognuna, la griglia delle card
function areeHtml() {
  const tabs = piene.filter((a) => !a.tech);
  const tablist = `<div class="tabs" role="tablist" aria-label="Aree di trattamento">
${indent(tabs.map((a, i) => `<button class="tab" type="button" role="tab" id="tab-${a.tab}" aria-controls="cat-${a.tab}" aria-selected="${i === 0}">${esc(a.nome)}<span class="tab__count">${a.trattamenti.length}</span></button>`).join('\n'), 2)}
</div>`;
  // le prime card della prima area si caricano subito, le altre quando ci si arriva
  const pannelli = tabs.map((a, i) => `<div class="category" id="cat-${a.tab}" role="tabpanel" aria-labelledby="tab-${a.tab}">
  <h3 class="category__title">${esc(a.nome)}</h3>
  <div class="grid">
${indent([...a.trattamenti.map((t, j) => card(t, { lazy: i > 0 || j >= 4 })), ...(a.dopo ? [a.dopo] : [])].join('\n'), 4)}
  </div>
</div>`);
  return [tablist, ...pannelli].join('\n\n');
}

const tecnologia = () => aree.find((a) => a.tech).trattamenti.map((t) => card(t, { titolo: 'h3' })).join('\n');

const freccia = '<svg viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5h14M11 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';

// Prodotti: le linee a sinistra; per ognuna i trattamenti che la usano, ricavati dalle card
function prodottiHtml() {
  const tutti = piene.flatMap((a) => a.trattamenti);
  const tabs = `<div class="brands__list" role="tablist" aria-label="Linee di prodotti" aria-orientation="vertical">
${indent(linee.map((l, i) => `<button class="brand-tab" type="button" role="tab" id="tab-line-${l.id}" aria-controls="line-${l.id}" aria-selected="${i === 0}"><span>${esc(l.nome)}</span></button>`).join('\n'), 2)}
</div>`;
  const pannelli = linee.map((l) => {
    const ids = new Set([l.id, ...l.prodotti.map((p) => p.id)]);
    const usi = tutti.filter((t) => t.prodotti.some((p) => ids.has(p.id)));
    const testo = [`<h3 class="line__name">${esc(l.nome)}</h3>`];
    if (l.nei_trattamenti && usi.length) testo.push(`<p class="line__uses">${esc(l.nei_trattamenti)}</p>`);
    else if (usi.length) testo.push(`<p class="line__uses">Nei trattamenti: ${usi.map((t) => `<a href="#t-${t.id}">${esc(t.nome)}</a>`).join(', ')}</p>`);
    const top = [`<div class="line__text">\n${indent(testo.join('\n'), 2)}\n</div>`];
    if (l.prodotti.length > 1) top.push(`<div class="shelf-nav">
  <button class="shelf-nav__btn shelf-nav__btn--prev" type="button" data-dir="-1" aria-label="Prodotti precedenti">${freccia}</button>
  <button class="shelf-nav__btn" type="button" data-dir="1" aria-label="Prodotti successivi">${freccia}</button>
</div>`);
    const scaffale = l.prodotti.length
      ? `<ul class="shelf">
${indent(l.prodotti.map((p) => `<li class="product"><button class="product__btn" type="button" aria-label="${esc(p.nome)}: guarda il prodotto"><img src="img/prodotti/${p.id}.jpg" alt="" width="450" height="600" loading="lazy"><span class="product__name">${esc(p.nome)}</span></button></li>`).join('\n'), 2)}
</ul>`
      : `<p class="line__mark" aria-hidden="true">${esc(l.nome)}</p>`;
    return `<div class="line" id="line-${l.id}" role="tabpanel" aria-labelledby="tab-line-${l.id}">
  <div class="line__top">
${indent(top.join('\n'), 4)}
  </div>
${indent(scaffale, 2)}
</div>`;
  });
  return [tabs, ...pannelli].join('\n\n');
}

// Le opzioni di «Prodotti usati» nel pannello, dalla stessa lista
const opzioni = () => linee.flatMap((l) => (l.scheda ? [{ id: l.id, label: `${l.nome} · ${l.scheda.nome}` }] : l.prodotti.map((p) => ({ id: p.id, label: `${l.nome} · ${p.nome}` }))))
  .map((o) => `- { name: ${o.id}, label: ${JSON.stringify(o.label)} }`).join('\n');

// ---------- Scrittura ----------

function sostituisci(testo, nome, contenuto, [apri, chiudi]) {
  const re = new RegExp(`^([ \\t]*)${apri}dati:${nome}${chiudi}\\n[\\s\\S]*?^[ \\t]*${apri}/dati:${nome}${chiudi}$`, 'm');
  const m = testo.match(re);
  if (!m) throw new Error(`non trovo i segni ${apri}dati:${nome}${chiudi} … ${apri}/dati:${nome}${chiudi}`);
  const pad = m[1].length;
  return testo.replace(re, () => `${m[1]}${apri}dati:${nome}${chiudi}\n${indent(contenuto, pad)}\n${m[1]}${apri}/dati:${nome}${chiudi}`);
}

function aggiorna(path, parti, segni) {
  const prima = readFileSync(join(ROOT, path), 'utf8');
  const dopo = Object.entries(parti).reduce((t, [nome, f]) => sostituisci(t, nome, f(), segni), prima);
  if (dopo !== prima) writeFileSync(join(ROOT, path), dopo);
  console.log(`${path}: ${dopo === prima ? 'già aggiornato' : 'aggiornato'}`);
}

aggiorna('index.html', { menu, aree: areeHtml, tecnologia, prodotti: prodottiHtml }, ['<!-- ', ' -->']);
aggiorna('.pages.yml', { prodotti: opzioni }, ['# ', '']);

// Foto caricate dal pannello: al massimo 880×1100 (4:5) e leggere. Si lavora sulla copia che
// GitHub pubblica, gli originali restano nel repository. Toglie anche i dati EXIF (posizione GPS).
if (process.argv.includes('--foto')) {
  let sharp;
  try {
    sharp = createRequire(join(process.env.SHARP_DIR || ROOT, 'noop.js'))('sharp');
  } catch {
    avvisa('sharp non c\'è: le foto restano come sono');
  }
  const dir = join(ROOT, 'img/trattamenti');
  for (const file of sharp ? readdirSync(dir) : []) {
    const ext = file.match(/\.(jpe?g|png|webp)$/i)?.[1].toLowerCase();
    if (!ext) continue;
    const path = join(dir, file);
    try {
      const meta = await sharp(path).metadata();
      if (meta.width <= 880 && meta.height <= 1100 && statSync(path).size <= 400_000 && !meta.exif) continue;
      const img = sharp(path).rotate().resize(880, 1100, { fit: 'cover', withoutEnlargement: true });
      const out = ext === 'png' ? img.png({ compressionLevel: 9 }) : ext === 'webp' ? img.webp({ quality: 82 }) : img.jpeg({ quality: 82, mozjpeg: true });
      writeFileSync(path, await out.toBuffer());
      console.log(`img/trattamenti/${file}: ridotta`);
    } catch (e) {
      avvisa(`img/trattamenti/${file}: non riesco a ridurla (${e.message})`);
    }
  }
}

for (const a of avvisi) console.warn(`attenzione: ${a}`);
