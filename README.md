# Maison Verre — Service Console

A floor console for a restaurant during service. Order queue, table map,
reservations, and service health in one screen, built to be read at a glance
from two metres away in a dim dining room.

No framework, no build step, no runtime dependencies. Three files ship to the
browser: `index.html`, `styles.css`, `app.js`.

## Run it

```sh
npm start          # python3 -m http.server 8781
```

Then open <http://localhost:8781>. Opening `index.html` directly also works —
there is nothing to compile.

## The design direction

The subject is a glass house on a wharf, so the surfaces are tinted like bottle
glass rather than the usual neutral dark. Brass is the only bright accent, the
way brass fittings are the only bright thing in a dark dining room.

| Token | Value | Role |
| --- | --- | --- |
| `--ink-850` | `#161d1a` | panel surface, bottle-glass cast |
| `--ink-1000` | `#040706` | deepest surface, dark text on accent fills |
| `--brass` | `#d9a441` | brand accent, the "occupied" state |
| `--vermilion` | `#f55e47` | critical — late tickets, flagged tables |
| `--paper` | `#f4f0e8` | primary text |

Type is **Fraunces** for display, **Barlow** for the interface, and
**IBM Plex Mono** for anything numeric. The mono is not a default choice — it
is kept because table metadata renders at 8.5px, where legibility of tabular
figures matters more than novelty.

Every text colour in the scale clears WCAG AA (4.5:1) against the panel it
actually sits on, not just against the base surface. `ink-3` is the tertiary
step and is deliberately restricted to panel backgrounds: row hover, selection
and table tiles all lighten or tint the surface underneath, so text on those
uses `ink-2` instead. Selecting a row makes it *recessed* rather than lighter,
so contrast rises when a row is selected instead of falling.

## Data

All data is seeded in `app.js` — 18 orders, 14 tables, 9 reservations, plus
metrics and alerts. Nothing is fetched and nothing is persisted; edits reset on
reload. There are no network calls except the Google Fonts stylesheet.

## Accessibility

- Semantic landmarks, labelled controls, and a real focus trap on the drawer
  that pulls focus back in if it ever escapes.
- `prefers-reduced-motion` is respected: transitions, the row flash, the boot
  sequence, and the sliding chip indicator are all suppressed.
- Keyboard: `/` focuses search, `Esc` closes the drawer, arrow keys move
  through filter chips, Enter activates the focused control.
- Live counters use `tabular-nums` so ticking clocks never reflow the layout.

## Tests

Behaviour is covered by jsdom suites (dev-only dependency, the app itself ships
nothing):

```sh
npm install
npm test
```

- `test/smoke.test.js` — 75 checks across render, filters, search, drawer
  actions, and toasts
- `test/reduced-motion.test.js` — 17 checks that motion is suppressed
- `test/race.test.js` — 8 checks on rapid filter/search input settling, and the
  focus trap

## Layout

```
index.html   markup and mount points
styles.css   design tokens, then components
app.js       seed data, renderers, and interaction
test/        jsdom suites
```

## Licence

MIT
