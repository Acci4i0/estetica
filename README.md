# Estetica Skin Care — website

A one-page site for Estetica Skin Care snc di Ferronato Paola & C., a beauty
studio in San Giuseppe di Cassola (VI) since 1990, where Paola Ferronato works on
her own. The treatments come from the studio's Comfort Zone menu (September 2026),
grouped by area: face, body and massages, hair removal and pedicure, plus two
technologies (Starvac and Wave pressotherapy). Every treatment opens a card with a
short description, the price and the products used. There is no online booking: people book
on WhatsApp or by phone.

Paola edits the treatments herself (names, prices, descriptions, photos; adding and removing
them) from a panel, [Pages CMS](https://pagescms.org), and the site republishes on its own.
Layout and design stay in the code: the panel only writes data files.

Built in the visual language of [thefacespaceco.com](https://thefacespaceco.com)
(cream and wine palette, a hero with a single centred statement) and [yuriroga.com](https://yuriroga.com)
(a pill bar with two dropdowns, Trattamenti and Chi siamo, rounded 4:5 tiles alternating a person and a
texture), with a footer in the style of the Vibrolux site. The short text in
*Chi siamo* takes its tone from [esteticatiare.com](https://www.esteticatiare.com).

## Stack

- Plain HTML, CSS and a little JavaScript
- The treatments and products live in `data/` as JSON; `scripts/build.mjs` (Node, no
  dependencies) writes them into `index.html`. GitHub runs it before every deploy
- [Pages CMS](https://pagescms.org) as the editing panel, configured in `.pages.yml`
- [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) and
  [Belleza](https://fonts.google.com/specimen/Belleza), self-hosted in `fonts/`
  (SIL Open Font License): the site makes no requests to third parties, so it
  needs no cookie banner

## Running it

```bash
python3 -m http.server 5173   # http://localhost:5173
```

Any static server works, and so does opening `index.html` directly. After changing
anything in `data/` (or pulling Paola's edits), regenerate the page:

```bash
node scripts/build.mjs
```

## Structure

```
index.html              the whole page: top bar and dropdowns, hero, treatments
                        by area, Tecnologia, Prodotti, footer, and the <dialog>
                        that shows a treatment. The parts between <!-- dati:… -->
                        and <!-- /dati:… --> are generated: don't edit them by hand
data/trattamenti/       one JSON file per area (viso, corpo, epilazione, pedicure,
                        tecnologia): what Paola edits from the panel
data/prodotti.json      the Comfort Zone lines and their products (edited by hand)
scripts/build.mjs       writes data/ into index.html and the product list into
                        .pages.yml; with --foto it also shrinks the uploaded photos
.pages.yml              the panel: which files Paola can edit and with which fields
GUIDA-PANNELLO.md       the guide for Paola, in Italian
privacy.html            privacy notice (GDPR)
cookie.html             cookie policy: the site sets no cookies
fonts/                  Belleza and Instrument Sans (woff2, Latin) with their licences
styles.css              design tokens in :root, then one block per section
script.js               dropdowns, area and product-line tabs, the treatment dialog,
                        the product shelf arrows, tiles fading in
video/crema.avif        flowing cream, the background of the hero and the footer: an
                        animated AVIF image (9 s, cross-faded so the loop has no
                        jump). As an image it always plays on its own, also on
                        iPhones in Low Power Mode, and never shows a play button
img/crema.jpg           its first frame, shown while it loads and where AVIF is missing
img/trattamenti/        one photo per treatment, named after it (t-<name> in the page)
img/prodotti/           Comfort Zone product photos on white, named line-product;
                        grandi/ holds the same photos at 900×1200 for the full-page view
img/CREDITS.md          where the images come from
```

## Editing

- **Treatments:** they come from `data/trattamenti/*.json`, normally edited by Paola
  from the panel. `scripts/build.mjs` turns each one into an `article.treatment`: the
  tile (photo and name; on phones the name sits in the pill on the photo) and, in
  `.treatment__detail`, what the dialog shows: price, description, products used, the
  WhatsApp link with "Vorrei prenotare: …" already written. The duration goes in
  `data-time` and shows in the dialog, next to the area. Without JavaScript the same
  text simply sits under the tile. The script also writes the *Trattamenti* dropdown
  (every treatment with its `#t-…` link, duration and price), the area tabs with their
  counts, and the "Nei trattamenti" links of each product line, so nothing points to a
  treatment that is gone. An area left empty disappears. A link like
  `…/estetica/#t-hydra-glow` opens that treatment directly; the hidden `id` keeps the
  link the same when Paola renames a treatment (new ones get it from their name).
- **What the script forgives:** text is escaped, so whatever is typed in the panel can't
  break the page; a treatment without a name is skipped; a missing photo becomes
  `img/crema.jpg`; an unknown product is dropped. It prints a warning for each (in the
  Actions log on GitHub) and the site is published anyway. Only missing `dati:` markers
  stop it, and then the previous version stays online.
- **Prices:** a number in euro, shown as "60 €" (or "da 15 €" with *Prezzo di
  partenza*) in the dialog under the name and in the dropdown rows. Empty means no price.
- **Products:** listed in `data/prodotti.json`, by line; the photo of each product is
  `img/prodotti/<id>.jpg` (and `grandi/<id>.jpg`). The script builds the *Prodotti*
  section from it and the choices of *Prodotti usati* in `.pages.yml`, so after adding a
  product run it and commit both files. A line without photos (Dermalena) can be chosen
  as a whole, through its `scheda`. On the site, the lines are on the left; each line
  shows its products in a row on a sand panel (the white of the photos disappears with
  `mix-blend-mode: multiply`), with arrows when they don't fit. Tapping a product opens
  it full page, with arrows (or a swipe) to the others of the same line.
  `…/estetica/#line-renight` opens a line directly.
- **Layout of the generated parts:** the HTML templates are in `scripts/build.mjs`
  (the card, the dropdown, the product shelf, the Dermalena note next to the pedicure);
  change them there and run the script.
- **Cache:** `styles.css` and `script.js` are linked as `?v=…`; raise the number
  after changing them, so browsers don't keep the old copy.
- **Contacts:** phone `0424 512529`, WhatsApp `348 1515097` (`393481515097` in
  the links), email `skincareglp@gmail.com`; they appear in the *Chi siamo*
  dropdown, in the footer and in the privacy and cookie pages.
- **Photos:** 880×1100 JPEG (4:5). In each area the grid alternates a person and a
  texture, row by row like a chessboard, so a new photo keeps the kind of the one
  it replaces. The order is written for four columns; on phones (two columns) the
  CSS swaps the 3rd/4th and 5th/6th card of every eight to keep the chessboard.
  Photos uploaded from the panel land in `img/trattamenti/` as they are; before
  publishing, GitHub crops them to 880×1100, compresses them and drops their EXIF data
  (location included). The originals stay in the repository. Treatments added or moved
  by Paola can break the chessboard: that's hers to judge.

## The panel

Paola works at [app.pagescms.org](https://app.pagescms.org): the sidebar shows
*Trattamenti* with the five areas; each area is a list she can open, edit, reorder by
dragging, add to and remove from. Fields: name, price, *Prezzo di partenza*, duration,
description, photo, products used, videos. Saving makes a commit on `main` ("Pannello:
aggiornato data/trattamenti/…"), which runs the deploy workflow: the change is online
in a minute or two. Her guide, in Italian, is [`GUIDA-PANNELLO.md`](GUIDA-PANNELLO.md).

Setting it up, once (it needs the GitHub account that owns the repository):

1. Push this repository to `main`.
2. Open [app.pagescms.org](https://app.pagescms.org), sign in with GitHub and install the
   Pages CMS GitHub App on `Acci4i0/estetica` only.
3. Open the repository in Pages CMS, go to *Collaborators*, press *Invite* and enter
   Paola's email. She gets an invitation; after that she signs in with her email and a
   6-digit code that arrives by mail (no password, no GitHub account).
4. Check that her first save shows up on the site (Actions tab on GitHub).

Pages CMS only reads and writes files in the repository, so nothing is locked in: if
the service ever goes away, the data and the site stay as they are. The panel's own
interface is in English; labels and hints of the fields are in Italian. After Paola's
edits, `git pull` and run `node scripts/build.mjs` before changing `index.html` by hand,
so the committed page matches the data (GitHub regenerates it anyway when deploying).

## Still to confirm with the studio

- durations of the Bamboo Massage and the pedicure (50 minutes are placeholders),
  and how long Starvac and the pressotherapy last
- photos for the Dermalena line
- the background video: it comes from a Pinterest pin of rawpixel.com
  ("Smooth flowing abstract, 4k video"); check that rawpixel's licence covers
  use on the studio's site, or buy/download it from rawpixel directly
- the street number: 48 in the listings, 50 in the business register
- privacy and cookie pages: written for this site as it is (no forms, no cookies,
  hosted on GitHub Pages); worth a quick check by whoever handles the studio's
  privacy, and to update if forms, maps or analytics are ever added
