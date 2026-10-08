# Estetica Skin Care — website

A one-page site for Estetica Skin Care snc di Ferronato Paola & C., a beauty
studio in San Giuseppe di Cassola (VI) since 1990: face and body treatments with
Comfort Zone products, Starvac, Renata França massages, Skin's Brazilian Wax and
pedicure. Every treatment shows its price, and there is no online booking: people
book on WhatsApp or by phone.

Built in the visual language of [thefacespaceco.com](https://thefacespaceco.com)
(cream and wine palette, a hero with a single centred statement) and [yuriroga.com](https://yuriroga.com)
(a pill bar with two dropdowns, rounded 4:5 tiles alternating a person and a
texture), with a footer in the style of the Vibrolux site.

## Stack

- Plain HTML, CSS and a little JavaScript, no build step
- [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans),
  [Belleza](https://fonts.google.com/specimen/Belleza) and
  [Chivo Mono](https://fonts.google.com/specimen/Chivo+Mono) from Google Fonts

## Running it

```bash
python3 -m http.server 5173   # http://localhost:5173
```

Any static server works, and so does opening `index.html` directly.

## Structure

```
index.html              the whole page: top bar and dropdowns, hero, treatments, footer
styles.css              design tokens in :root, then one block per section
script.js               the hero's animated cream (WebGL) that ripples under the cursor,
                        the hero rounding its corners on scroll, dropdowns, tiles fading in
img/trattamenti/        one photo per treatment, named after it
img/CREDITS.md          where the images come from
```

## Editing

- **Treatments:** each tile in `#trattamenti` in [`index.html`](index.html) has a
  matching row in the *Lavorazioni* dropdown: keep name, price and duration the
  same in both. The tile opens WhatsApp with "Vorrei prenotare: …" already
  written.
- **Contacts:** phone `0424 512529`, WhatsApp `348 1515097` (`393481515097` in
  the links), address and email appear in the *Chi siamo* dropdown and in the
  footer.
- **Photos:** 880×1100 JPEG (4:5). The grid alternates a person and a texture,
  row by row like a chessboard, so a new photo keeps the kind of the one it
  replaces.

## Still to confirm with the studio

- prices and durations: placeholders, only the 45 minutes of the Tranquillity
  Massage are known
- the email address: `info@esteticaskincare.it` is a placeholder (the domain
  was still free)
- the street number: 48 in the listings, 50 in the business register
- privacy and cookie pages: the links are placeholders
