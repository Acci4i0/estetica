# Estetica Skin Care — website

A one-page site for Estetica Skin Care snc di Ferronato Paola & C., a beauty
studio in San Giuseppe di Cassola (VI) since 1990, where Paola Ferronato works on
her own. The treatments come from the studio's Comfort Zone menu (September 2026),
grouped by area: face, body and massages, hair removal and pedicure, plus two
technologies (Starvac and Wave pressotherapy). Every treatment opens a card with a
short description and the products used. There is no online booking: people book
on WhatsApp or by phone. Prices will be added later.

Built in the visual language of [thefacespaceco.com](https://thefacespaceco.com)
(cream and wine palette, a hero with a single centred statement) and [yuriroga.com](https://yuriroga.com)
(a pill bar with two dropdowns, Trattamenti and Chi siamo, rounded 4:5 tiles alternating a person and a
texture), with a footer in the style of the Vibrolux site. The short text in
*Chi siamo* takes its tone from [esteticatiare.com](https://www.esteticatiare.com).

## Stack

- Plain HTML, CSS and a little JavaScript, no build step
- [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) and
  [Belleza](https://fonts.google.com/specimen/Belleza), self-hosted in `fonts/`
  (SIL Open Font License): the site makes no requests to third parties, so it
  needs no cookie banner

## Running it

```bash
python3 -m http.server 5173   # http://localhost:5173
```

Any static server works, and so does opening `index.html` directly.

## Structure

```
index.html              the whole page: top bar and dropdowns, hero, treatments
                        by area, Tecnologia, Prodotti, footer, and the <dialog>
                        that shows a treatment
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

- **Treatments:** each `article.treatment` in [`index.html`](index.html) holds the
  tile (photo and name; the duration is in `data-time` and shows in the dialog,
  not on the tile; on phones the name sits in the pill on the photo) and, in
  `.treatment__detail`, what the dialog shows:
  description, products used, the WhatsApp link with "Vorrei prenotare: …" already
  written. Without JavaScript the same text simply sits under the tile. The
  *Trattamenti* dropdown lists every treatment with a `#t-…` link that opens its
  dialog, so a new treatment needs a row there too. A link like
  `…/estetica/#t-hydra-glow` opens that treatment directly.
- **Prices:** not shown for now. When they arrive, they fit next to the duration
  in the dialog (`data-time`) and in the dropdown rows.
- **Products:** the *Prodotti* section lists the lines on the left; each line
  shows its products in a row on a sand panel (the white of the photos disappears
  with `mix-blend-mode: multiply`), with arrows when they don't fit. A product used
  in a treatment is listed in that treatment's `.product-chips` with the same
  photo. Tapping a product opens it full page, with arrows (or a swipe) to the
  others of the same line. `…/estetica/#line-renight` opens a line directly.
- **Cache:** `styles.css` and `script.js` are linked as `?v=…`; raise the number
  after changing them, so browsers don't keep the old copy.
- **Contacts:** phone `0424 512529`, WhatsApp `348 1515097` (`393481515097` in
  the links), email `skincareglp@gmail.com`; they appear in the *Chi siamo*
  dropdown, in the footer and in the privacy and cookie pages.
- **Photos:** 880×1100 JPEG (4:5). In each area the grid alternates a person and a
  texture, row by row like a chessboard, so a new photo keeps the kind of the one
  it replaces. The order is written for four columns; on phones (two columns) the
  CSS swaps the 3rd/4th and 5th/6th card of every eight to keep the chessboard.

## Still to confirm with the studio

- prices
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
