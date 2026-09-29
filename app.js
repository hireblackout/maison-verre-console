/* ═══════════════════════════════════════════════════════════
   MAISON VERRE, SERVICE CONSOLE
   Vanilla ES2020. No dependencies, no build step: this file is
   loaded directly by index.html and everything below runs at
   parse time on a DOM that is already fully written out.

   Motion note: this file assigns the existing CSS primitives
   (.anim-rise / .anim-fade / .anim-grow, .just-changed,
   .is-press, .is-holding, .count-pulse, .is-out) but never
   invents timings of its own. Every duration and curve lives in
   styles.css so motion can be retuned from one place.
   ═══════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* ── DOM helpers ────────────────────────────────────────── */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const NS = 'http://www.w3.org/2000/svg';

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const frag = (...kids) => {
    const f = document.createDocumentFragment();
    kids.forEach(k => k && f.appendChild(k));
    return f;
  };

  /* ── icon family ─────────────────────────────────────────────
     The usual rule is to install an icon library. This console is
     deliberately zero-dependency and loads straight off the filesystem
     with no build step, so a package would break the thing the project
     is actually for. The exception buys one constraint in exchange:
     a single 20-unit grid, a single stroke weight, one path table for
     every glyph in the runtime. Nothing here hand-draws an icon that
     already exists in ICONS, and nothing adds a second stroke width.
     The two glyphs on a 24-unit grid (the brand mark, the empty-state
     tray) are documented as such in index.html. */
  const ICONS = {
    chevron: ['M7.5 4.5 12 10l-4.5 5.5'],
    warn:    ['M10 3 18 16.5H2z', 'M10 7.8v3.3', 'M10 13.6v.2'],
    clock:   ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M10 6.2V10l2.5 1.6'],
    info:    ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M10 9.2v4.1', 'M10 6.6v.2'],
    note:    ['M4 3.5h12v8.5H9.2l-3.3 2.6V12H4z'],
    user:    ['M10 4.6a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z', 'M4.4 16.3c0-2.6 2.4-4.1 5.6-4.1s5.6 1.5 5.6 4.1'],
    check:   ['M4.6 10.4 8.2 14 15.4 6.4'],
    play:    ['M7 4.4 15 10l-8 5.6z'],
    flag:    ['M5 16.6V3.4h7.3l-1.7 3h4.5v4.9h-4.5L8.8 14.3H5'],
    ban:     ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M5.4 5.4l9.2 9.2'],
    print:   ['M6 7.6V3.4h8v4.2', 'M6 13.4H4V7.6h12v5.8h-2', 'M6 11.4h8v5.2H6z'],
    seat:    ['M6.6 3.6h6.8v4.8H6.6z', 'M4.4 16.8v-3.6h11.2v3.6'],
    broom:   ['M13.2 3.4 8.6 8l-2.9-1 1 3 4.4 4.4 5.9-5.9-3-1.1', 'M8 8 3.6 12.4'],
    link:    ['M8.4 11.6a3 3 0 0 0 4.3 0l2.4-2.4a3 3 0 1 0-4.3-4.3l-1 1', 'M11.6 8.4a3 3 0 0 0-4.3 0l-2.4 2.4a3 3 0 1 0 4.3 4.3l1-1'],
    chevL:   ['M12.5 4.5 8 10l4.5 5.5'],
    arrowUp: ['M10 15.6V4.6', 'M5.4 9.2 10 4.6l4.6 4.6'],
    arrowDn: ['M10 4.4v11', 'M5.4 10.8 10 15.4l4.6-4.6'],
    flat:    ['M4.4 10h11.2'],
  };

  function icon(name, attrs) {
    const svg = svgEl('svg', {
      viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    for (const d of (ICONS[name] || [])) svg.appendChild(svgEl('path', Object.assign({ d }, attrs)));
    return svg;
  }

  /* ── formatting ─────────────────────────────────────────── */
  const money = (n, dp = 0) => '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: dp, maximumFractionDigits: dp,
  });
  const compact = n => n >= 1000 ? '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + n;

  function fmtElapsed(mins) {
    if (mins < 1)    return 'just now';
    if (mins < 60)   return Math.floor(mins) + 'm';
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const urgencyTone = mins => mins >= 20 ? 'late' : mins >= 15 ? 'due' : mins >= 10 ? 'due-soon' : 'on-time';

  function relTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const t = new Date(); t.setHours(h, m, 0, 0);
    const diff = (t - Date.now()) / 60000;
    if (diff < -4)  return 'now';
    if (diff <= 1)  return 'now';
    if (diff < 60)  return `in ${Math.round(diff)}m`;
    return `in ${Math.floor(diff / 60)}h ${Math.round(diff % 60)}m`;
  }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const noMotion = () => reduceMotion.matches;
  const wait = (ms) => new Promise(r => setTimeout(r, noMotion() ? 0 : ms));

  /* ── seed data ────────────────────────────────────────────── */
  /* Everything below is MOCK data for the prototype: the figures are
     illustrative, not measured. Anything derived from it (forecast,
     covers, ticket times) inherits that status. */
  const BOOT = Date.now();
  const ago = m => BOOT - m * 60000;

  const TABLES = [
    { id: 'T1',  seats: 2, shape: 'r2',    zone: 'Window',   status: 'occupied',  orderId: 'A-1038', since: 34, flag: false },
    { id: 'T2',  seats: 2, shape: 'r2',    zone: 'Window',   status: 'available', orderId: 'A-1035', since: 41, flag: false },
    { id: 'T3',  seats: 4, shape: 'r4',    zone: 'Main',     status: 'reserved',  orderId: null,      resId: 'R-03', since: 0,  flag: false },
    { id: 'T4',  seats: 4, shape: 'r4',    zone: 'Main',     status: 'occupied',  orderId: 'A-1041', since: 24, flag: true  },
    { id: 'T5',  seats: 4, shape: 'r4',    zone: 'Main',     status: 'cleaning',  orderId: 'A-1032', since: 58, flag: false },
    { id: 'T6',  seats: 6, shape: 'r6',    zone: 'Banquette',status: 'occupied',  orderId: 'A-1039', since: 11, flag: false },
    { id: 'T7',  seats: 6, shape: 'r6',    zone: 'Banquette',status: 'reserved',  orderId: null,      resId: 'R-06', since: 0,  flag: false },
    { id: 'T8',  seats: 8, shape: 'r8',    zone: 'Private',  status: 'occupied',  orderId: 'A-1040', since: 8,  flag: false },
    { id: 'T9',  seats: 2, shape: 'r2',    zone: 'Main',     status: 'available', orderId: 'A-1034', since: 52, flag: false },
    { id: 'T10', seats: 2, shape: 'r2',    zone: 'Main',     status: 'occupied',  orderId: 'A-1043', since: 2,  flag: false },
    { id: 'B1',  seats: 2, shape: 'booth', zone: 'Window',   status: 'occupied',  orderId: 'A-1042', since: 19, flag: false },
    { id: 'B2',  seats: 2, shape: 'booth', zone: 'Window',   status: 'available', orderId: 'A-1033', since: 38, flag: false },
    { id: 'B3',  seats: 4, shape: 'booth', zone: 'Main',     status: 'reserved',  orderId: null,      resId: 'R-05', since: 0,  flag: false },
    { id: 'B4',  seats: 4, shape: 'r4',    zone: 'Bar rail', status: 'available', orderId: 'A-1029', since: 84, flag: false },
  ];

  const M = {
    tartare:   ['Beef tartare, bone-marrow crumb', 18],
    leek:      ['Charred leek, hazelnut romesco',  12],
    cauli:     ['Turmeric roast cauliflower',     14],
    burrata:   ['Burrata, blood orange, fennel',  15],
    scallops:  ['Seared scallops, brown butter',  22],
    duck:      ['Duck confit, cherry gastrique',  29],
    agnolotti: ['Wild mushroom agnolotti',         24],
    ribeye:    ['Dry-aged ribeye, marrow onion',  46],
    seabass:   ['Seabass, fennel vichyssoise',     31],
    bread:     ['Sourdough, cultured butter',      7],
    gem:       ['Little gem, anchovy dressing',    11],
    spuds:     ['Crispy potatoes, rosemary',       8],
    cake:      ['Olive oil cake, crème fraîche',  12],
    basque:    ['Burnt basque cheesecake',         11],
    affogato:  ['Espresso affogato',               8],
    smduck:    ['Smoked duck, quince',            27],
    tagliat:   ['Tagliatelle, egg yolk',          23],
    chicory:   ['Chicory, blood orange',           12],
  };
  const line = (key, qty, mod) => {
    const [name, price] = M[key];
    return { name, price, qty, mod: mod || null };
  };
  const subtotalOf = o => o.items.reduce((s, i) => s + i.price * i.qty, 0);

  const SERVERS = ['Ivo Marchetti', 'Sena Adeyemi', 'Rosa Vidal', 'Kit Barlow', 'Devin Oyelaran'];

  const ORDERS = [
    { id: 'A-1029', tableId: 'B4',  server: SERVERS[1], status: 'served', placed: 84, source: 'Dine-in',
      items: [line('gem', 1), line('seabass', 1), line('affogato', 1)] },
    { id: 'A-1030', tableId: 'T3',  server: SERVERS[0], status: 'served', placed: 71, source: 'Dine-in',
      items: [line('tartare', 2), line('duck', 1), line('bread', 1), line('cake', 1)] },
    { id: 'A-1031', tableId: null, server: SERVERS[2], status: 'served', placed: 63, source: 'Bar',
      items: [line('bread', 1), line('chicory', 1), line('smduck', 1)] },
    { id: 'A-1032', tableId: 'T5',  server: SERVERS[3], status: 'served', placed: 58, source: 'Dine-in',
      items: [line('burrata', 1), line('ribeye', 2), line('spuds', 2), line('basque', 2)] },
    { id: 'A-1033', tableId: 'B2',  server: SERVERS[4], status: 'served', placed: 38, source: 'Dine-in',
      items: [line('leek', 1), line('agnolotti', 1), line('duck', 1)] },
    { id: 'A-1034', tableId: 'T9',  server: SERVERS[0], status: 'served', placed: 52, source: 'Dine-in',
      items: [line('tartare', 1), line('tagliat', 1), line('seabass', 1), line('affogato', 1)] },
    { id: 'A-1035', tableId: 'T2',  server: SERVERS[2], status: 'served', placed: 41, source: 'Dine-in',
      items: [line('cauli', 1), line('scallops', 1), line('chicory', 1), line('cake', 1)] },
    { id: 'A-1036', tableId: null, server: SERVERS[1], status: 'served', placed: 27, source: 'Bar',
      items: [line('bread', 2), line('chicory', 1), line('smduck', 1), line('affogato', 1)] },
    { id: 'A-1037', tableId: null, server: SERVERS[3], status: 'ready',  placed: 6,  source: 'Bar',
      items: [line('burrata', 1), line('agnolotti', 2)] },
    { id: 'A-1038', tableId: 'T1',  server: SERVERS[4], status: 'served', placed: 34, source: 'Dine-in',
      items: [line('tartare', 1), line('scallops', 1), line('spuds', 1), line('basque', 1)] },
    { id: 'A-1039', tableId: 'T6',  server: SERVERS[0], status: 'prep',   placed: 11, source: 'Dine-in',
      items: [line('leek', 2), line('duck', 2), line('tagliat', 1)] },
    { id: 'A-1040', tableId: 'T8',  server: SERVERS[2], status: 'ready',  placed: 8,  source: 'Dine-in',
      items: [line('burrata', 2), line('ribeye', 2), line('seabass', 2), line('chicory', 1), line('spuds', 2)] },
    { id: 'A-1041', tableId: 'T4',  server: SERVERS[3], status: 'prep',   placed: 24, source: 'Dine-in', flag: true,
      note: 'Fire the ribeye second. Guest has a 21:00 theatre slot.',
      items: [line('cauli', 1), line('ribeye', 1), line('seabass', 1)] },
    { id: 'A-1042', tableId: 'B1',  server: SERVERS[1], status: 'prep',   placed: 19, source: 'Dine-in',
      note: 'Nut allergy on cover 2, kitchen notified.',
      items: [line('burrata', 1), line('tartare', 1), line('spuds', 1)] },
    { id: 'A-1043', tableId: 'T10', server: SERVERS[4], status: 'new',    placed: 2,  source: 'Dine-in',
      items: [line('bread', 1), line('scallops', 1), line('gem', 1)] },
    { id: 'A-1044', tableId: null, server: SERVERS[0], status: 'new',    placed: 1,  source: 'Bar',
      items: [line('bread', 1), line('chicory', 1)] },
    { id: 'A-1045', tableId: null, server: SERVERS[2], status: 'hold',   placed: 16, source: 'Bar', flag: true,
      note: 'Holding on a shellfish substitution, chef at the pass.',
      items: [line('burrata', 1), line('smduck', 1), line('affogato', 1)] },
    { id: 'A-1046', tableId: null, server: SERVERS[1], status: 'new',    placed: 0,  source: 'Bar',
      items: [line('bread', 1), line('duck', 1)] },
  ].map(o => ({ ...o, placed: ago(o.placed), mins: o.placed, flag: !!o.flag }));

  const RESERVATIONS = [
    { id: 'R-01', time: '18:45', name: 'Kwan',         party: 2, status: 'confirmed', tableId: null,  note: 'Anniversary, quiet corner if possible' },
    { id: 'R-02', time: '19:00', name: 'Aldridge',     party: 4, status: 'confirmed', tableId: 'T3',  note: null },
    { id: 'R-03', time: '19:15', name: 'Oyelaran',     party: 5, status: 'pending',   tableId: 'T7',  note: 'Waiting on a confirmation call' },
    { id: 'R-04', time: '19:30', name: 'Ferreira',     party: 2, status: 'confirmed', tableId: null,  note: 'Regulars, no seating preference' },
    { id: 'R-05', time: '20:00', name: 'Nakamura',     party: 4, status: 'confirmed', tableId: 'B3',  note: null },
    { id: 'R-06', time: '20:30', name: 'Delacroix',    party: 6, status: 'confirmed', tableId: 'T7',  note: 'Prix fixe menu, pre-ordered' },
    { id: 'R-07', time: '21:00', name: 'Bhatt',        party: 2, status: 'no-show',   tableId: null,  note: 'Left a voicemail at 21:12' },
    { id: 'R-08', time: '21:15', name: 'Lindqvist',    party: 8, status: 'confirmed', tableId: null,  note: 'Birthday, candle with the dessert' },
    { id: 'R-09', time: '21:45', name: 'Amari',        party: 3, status: 'confirmed', tableId: null,  note: null },
  ];

  const RANGES = {
    today: {
      label: 'Peak 7 PM',
      bars: [
        { x: '5 PM',  v: 1620, n: 22 }, { x: '6 PM',  v: 4980, n: 68 },
        { x: '7 PM',  v: 5640, n: 79 }, { x: '8 PM',  v: 3160, n: 45 },
        { x: '9 PM',  v: 1840, n: 30 }, { x: '10 PM', v:  860, n: 14 },
        { x: '11 PM', v:  300, n:  5 },
      ],
      now: '8 PM',
    },
    '7d': {
      label: 'Best Mon',
      bars: [
        { x: 'Mon', v: 16800, n: 241 }, { x: 'Tue', v: 15200, n: 219 },
        { x: 'Wed', v: 19100, n: 268 }, { x: 'Thu', v: 21400, n: 302 },
        { x: 'Fri', v: 27900, n: 388 }, { x: 'Sat', v: 31600, n: 431 },
        { x: 'Sun', v: 18200, n: 254 },
      ],
      now: 'Sat',
    },
    '30d': {
      label: 'Best wk 4',
      bars: [
        { x: 'Wk 1', v: 108400, n: 1512 }, { x: 'Wk 2', v: 112900, n: 1588 },
        { x: 'Wk 3', v: 119600, n: 1661 }, { x: 'Wk 4', v: 131200, n: 1810 },
        { x: 'Wk 5', v: 104700, n: 1462 },
      ],
      now: 'Wk 4',
    },
  };

  const TOP_ITEMS = [
    { name: 'Dry-aged ribeye',       sub: '$46, mains',        units: 46 },
    { name: 'Sourdough, butter',    sub: '$7, bread',         units: 44 },
    { name: 'Espresso affogato',    sub: '$8, dessert',       units: 41 },
    { name: 'Burrata, blood orange',sub: '$15, starter',      units: 33 },
    { name: 'Seared scallops',      sub: '$22, starter',      units: 28 },
    { name: 'Burnt basque cheesecake', sub: '$11, dessert',  units: 26 },
  ];

  const GAUGES = [
    { name: 'Kitchen ticket time', value: '14.2m', pct: 0.71, tone: 'sage',     mark: 0.80, l: 'target 16m',  r: 'best 11.4m' },
    { name: 'Table turn time',     value: '68m',   pct: 0.86, tone: 'copper',   mark: 0.69, l: 'target 55m',  r: 'worst 81m' },
    { name: 'Server pacing',       value: '3.1/hr',pct: 0.62, tone: 'brass',    mark: 0.75, l: 'floor 3.4',   r: 'peak 4.1' },
    { name: 'Waste & 86s',         value: '4.2%',  pct: 0.28, tone: 'sage',     mark: 0.40, l: 'target 3%',   r: 'best 1.8%' },
  ];

  const ALERTS = [
    { tone: 'critical', ico: 'warn',  title: 'Ticket #A-1041 past SLA',
      sub: '24 min in prep against a 16 min target', n: 2,
      act: { type: 'filter', value: 'flagged', label: 'Show flagged' } },
    { tone: 'warn', ico: 'clock', title: 'Table T5 not cleared',
      sub: 'Guests departed 9 min ago, still dirty', n: 1,
      act: { type: 'table', value: 'T5', label: 'Open table' } },
    { tone: 'info', ico: 'info',  title: 'Burrata pacing short',
      sub: '33 units against a 52-cover forecast', n: 1,
      act: { type: 'menu', label: 'Open menu' } },
  ];

  const COVERS = 47;
  const CAPACITY = 96;

  const KPIS = [
    { label: 'Net sales',      value: money(15400),  dp: 0, delta: '+12.8%', dir: 'up',   note: '84% of $18.4k forecast', tone: 'brass',
      spark: [820, 1040, 1310, 1490, 1780, 2140, 2620, 2980, 3310, 3760, 4180, 4620] },
    { label: 'Orders',         value: '214',        delta: '+9.1%',  dir: 'up',   note: '79 tickets in the peak hour', tone: 'brass',
      spark: [11, 14, 19, 21, 26, 31, 38, 42, 48, 55, 61, 66] },
    { label: 'Avg ticket',     value: '$71.96',     delta: '+2.6%',  dir: 'up',   note: '2.4 covers per ticket', tone: 'sage',
      spark: [66.2, 68.4, 67.1, 69.8, 70.4, 69.1, 71.2, 70.8, 72.0, 71.4, 72.6, 71.96] },
    { label: 'Covers',         value: String(COVERS), delta: '+11.2%', dir: 'up', note: `of ${CAPACITY} seated tonight`, tone: 'peri',
      spark: [4, 7, 11, 14, 19, 23, 28, 33, 38, 42, 45, 47] },
    { label: 'Table occupancy',value: '46%',        delta: '-4.1%',  dir: 'down', note: '6 of 14 tables', tone: 'copper',
      spark: [70, 74, 78, 81, 69, 64, 58, 52, 49, 47, 46, 46] },
  ];

  /* ── state ──────────────────────────────────────────────── */
  /* Entrance animations are a one-time first-paint event. Every
     renderer here is a full rebuild, so without this gate a
     re-render (a search keystroke, opening the drawer) would
     re-play every stagger and the whole panel would flicker. */
  let firstPaint = true;

  const state = {
    filter: 'all',
    query: '',
    range: 'today',
    drawer: null,      // { mode, id }
    lastFocus: null,
  };

  const STATUS_LABEL = { new: 'New', prep: 'In prep', ready: 'Ready', served: 'Served', hold: 'On hold' };
  const STATUS_TONE  = { new: 'new', prep: 'prep', ready: 'ready', served: 'served', hold: 'hold' };
  const NEXT_STATUS  = { new: 'prep', prep: 'ready', ready: 'served', hold: 'prep' };
  const NEXT_LABEL   = { new: 'Start prep', prep: 'Mark ready', ready: 'Serve', hold: 'Release hold' };
  const FILTERS = [
    { id: 'all', label: 'All' }, { id: 'new', label: 'New' }, { id: 'prep', label: 'In prep' },
    { id: 'ready', label: 'Ready' }, { id: 'served', label: 'Served' }, { id: 'flagged', label: 'Flagged' },
  ];

  /* ── selectors ──────────────────────────────────────────── */
  const LEGEND_TONE = { available: 'sage', occupied: 'brass', reserved: 'peri', cleaning: 'slate' };
  const orderById   = id => ORDERS.find(o => o.id === id) || null;
  const tableById   = id => TABLES.find(t => t.id === id) || null;
  const resById     = id => RESERVATIONS.find(r => r.id === id) || null;
  const orderOn     = t => orderById(t.orderId);
  const minsSince   = o => (Date.now() - o.placed) / 60000;
  /* The 20-minute threshold only judges a ticket that is still in
     play. A ticket that was served an hour ago is not "late", it is
     finished, and counting it would paint the whole served history
     vermilion and make the Flagged filter meaningless. */
  const isFlagged   = o => o.flag || (o.status !== 'served' && minsSince(o) >= 20);
  const orderTone   = o => isFlagged(o) ? 'flagged' : (STATUS_TONE[o.status] || 'waiting');
  const isLate      = o => isFlagged(o) || o.status === 'hold';

  const openOrders  = () => ORDERS.filter(o => o.status !== 'served');
  const upcomingRes = () => RESERVATIONS.filter(r => r.status === 'confirmed' || r.status === 'pending');

  function matches(o) {
    if (state.filter === 'flagged' && !isFlagged(o)) return false;
    if (state.filter !== 'all' && state.filter !== 'flagged' && o.status !== state.filter) return false;
    const q = state.query.trim().toLowerCase();
    if (!q) return true;
    const t = o.tableId ? tableById(o.tableId) : null;
    return [o.id, o.server, o.source, t ? t.id : 'bar', t ? t.zone : '']
      .concat(o.items.map(i => i.name))
      .join(' ')
      .toLowerCase()
      .includes(q);
  }
  const visibleOrders = () => ORDERS.filter(matches);

  /* ── shell chrome: clock, date, live counters ───────────── */
  function paintClock() {
    const n = new Date();
    $('[data-clock]').textContent = n.toTimeString().slice(0, 8);
  }
  function paintDate() {
    $('[data-today]').textContent = new Date()
      .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  const lastCounts = {};
  function paintCount(name, value) {
    const node = document.querySelector(`[data-live="${name}"]`);
    if (!node) return;
    const text = String(value);
    if (node.textContent !== text && lastCounts[name] !== undefined && !noMotion()) {
      node.classList.remove('count-pulse');
      void node.offsetWidth;
      node.classList.add('count-pulse');
    }
    lastCounts[name] = value;
    node.textContent = text;
  }

  function paintLive() {
    const flagged = ORDERS.filter(isFlagged).length;
    paintCount('orders',     openOrders().length);
    paintCount('ordersTotal', openOrders().length);
    paintCount('flagged',    flagged);
    paintCount('res',        upcomingRes().length);
    paintCount('resTotal',   upcomingRes().length);
    paintCount('covers',     COVERS);

    const dot = $('[data-live="alerts"]');
    if (dot) {
      const n = ALERTS.length;
      dot.textContent = String(n);
      if (n === 0) dot.removeAttribute('data-n'); else dot.dataset.n = String(n);
    }
    const alertBadge = $('.nav-badge--alert');
    if (alertBadge) {
      alertBadge.dataset.count = String(flagged);
    }
    const meter = $('[data-meter]');
    if (meter) meter.style.transform = `scaleX(${COVERS / CAPACITY})`;
  }

  /* ── alerts ─────────────────────────────────────────────── */
  function renderAlerts() {
    const host = $('#alerts');
    host.textContent = '';
    ALERTS.forEach((a, i) => {
      const b = el('button', `alert alert--${a.tone} anim-rise`);
      b.style.setProperty('--tone', `var(--${a.tone})`);
      b.style.setProperty('--i', i);
      b.appendChild(el('span', 'alert-ico')).appendChild(icon(a.ico));
      const text = el('span', 'alert-text');
      text.appendChild(el('span', 'alert-title', a.title));
      text.appendChild(el('span', 'alert-sub', a.sub));
      b.appendChild(text);
      b.appendChild(el('span', 'alert-n', String(a.n)));
      b.title = a.act.label;
      b.addEventListener('click', () => runAlertAction(a));
      host.appendChild(b);
    });
  }

  function runAlertAction(a) {
    if (a.act.type === 'filter') {
      setFilter(a.act.value);
      $('#ordersList').scrollIntoView({ block: 'nearest', behavior: noMotion() ? 'auto' : 'smooth' });
    } else if (a.act.type === 'table') {
      openDrawer('table', a.act.value);
    } else {
      toast('Menu board opened, 3 items flagged 86', { tone: 'peri', ico: 'info' });
    }
  }

  /* ── KPI strip ──────────────────────────────────────────── */
  function sparkPath(values) {
    const W = 100, H = 26, P = 2.5;
    const min = Math.min(...values), max = Math.max(...values);
    const span = (max - min) || 1;
    const pts = values.map((v, i) => [
      P + (i / (values.length - 1)) * (W - P * 2),
      H - P - ((v - min) / span) * (H - P * 2),
    ]);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    return { line, area: `${line} L${(W - P).toFixed(2)} ${H} L${P} ${H} Z`, head: pts[pts.length - 1] };
  }

  function renderKPIs() {
    const host = $('#kpiRow');
    host.textContent = '';
    KPIS.forEach((k, i) => {
      const card = el('div', 'kpi anim-rise');
      card.style.setProperty('--kpi-tone', `var(--${k.tone})`);
      card.style.setProperty('--i', i + 3);

      const label = el('div', 'kpi-label');
      label.appendChild(document.createTextNode(k.label));
      card.appendChild(label);

      const val = el('div', 'kpi-value');
      val.appendChild(el('span', null, k.value));
      card.appendChild(val);

      const foot = el('div', 'kpi-foot');
      const d = el('span', `kpi-delta kpi-delta--${k.dir}`);
      d.appendChild(icon(k.dir === 'up' ? 'arrowUp' : k.dir === 'down' ? 'arrowDn' : 'flat'));
      d.appendChild(document.createTextNode(k.delta));
      foot.appendChild(d);
      foot.appendChild(el('span', 'kpi-note', k.note));
      card.appendChild(foot);

      const s = sparkPath(k.spark);
      const svg = svgEl('svg', { class: 'kpi-spark', viewBox: '0 0 100 26', preserveAspectRatio: 'none' });
      svg.appendChild(svgEl('path', { class: 'area', d: s.area }));
      svg.appendChild(svgEl('path', { class: 'line', d: s.line, 'vector-effect': 'non-scaling-stroke' }));
      const dot = svgEl('circle', { class: 'head', cx: s.head[0], cy: s.head[1], r: 1.6, 'vector-effect': 'non-scaling-stroke' });
      svg.appendChild(dot);
      card.appendChild(svg);

      host.appendChild(card);
    });
  }

  /* Line drawing: measure the real path length, park the dash there,
     then release it. Dash length must be the actual geometry or the
     stroke overshoots (or stops short) at the ends. */
  function drawSparks() {
    if (noMotion()) {
      $$('.kpi-spark').forEach(s => s.classList.add('is-drawn'));
      return;
    }
    const sparks = $$('.kpi-spark');
    sparks.forEach(s => {
      const p = $('.line', s);
      if (!p) return;
      try { s.style.setProperty('--len', Math.ceil(p.getTotalLength())); }
      catch (_) { s.style.setProperty('--len', 300); }
    });
    setTimeout(() => {
      sparks.forEach((s, i) => setTimeout(() => s.classList.add('is-drawn'), i * 60));
    }, 420);
  }

  /* ── filter chips (Shared element transition) ───────────── */
  let pill;
  function renderFilters() {
    const rail = $('#filters');
    rail.textContent = '';
    pill = el('span', 'chip-pill');
    rail.appendChild(pill);

    FILTERS.forEach(f => {
      const n = f.id === 'all' ? ORDERS.length
        : f.id === 'flagged' ? ORDERS.filter(isFlagged).length
        : ORDERS.filter(o => o.status === f.id).length;
      const c = el('button', 'chip');
      c.type = 'button';
      c.setAttribute('role', 'tab');
      c.setAttribute('aria-controls', 'ordersList');
      c.dataset.filter = f.id;
      if (f.id === state.filter) {
        c.classList.add('is-active');
        c.setAttribute('aria-selected', 'true');
        c.tabIndex = 0;
      } else {
        c.setAttribute('aria-selected', 'false');
        c.tabIndex = -1;
      }
      c.appendChild(document.createTextNode(f.label));
      c.appendChild(el('span', 'chip-count', String(n)));
      c.addEventListener('click', () => setFilter(f.id));
      c.addEventListener('keydown', e => onChipKey(e, f.id));
      rail.appendChild(c);
    });
    requestAnimationFrame(syncPill);
  }

  function syncPill() {
    if (!pill) return;
    const active = $('#filters .chip.is-active');
    if (!active) return;
    pill.style.width = active.offsetWidth + 'px';
    pill.style.transform = `translateX(${active.offsetLeft - 3}px)`;
  }

  function onChipKey(e, id) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = FILTERS.findIndex(f => f.id === id);
    const next = FILTERS[(i + step + FILTERS.length) % FILTERS.length];
    setFilter(next.id);
    const node = $(`#filters .chip[data-filter="${next.id}"]`);
    if (node) node.focus();
  }

  function setFilter(id) {
    if (state.filter === id) return;
    state.filter = id;
    $$('#filters .chip').forEach(c => {
      const on = c.dataset.filter === id;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', String(on));
      c.tabIndex = on ? 0 : -1;
    });
    syncPill();
    renderOrders();
  }

  /* ── order queue ────────────────────────────────────────── */
  /* Every renderer is a full rebuild, but the exit animation defers the
     rebuild by 170ms. A fast second interaction (typing in the search
     box, clicking two chips in a row) can land inside that window, so
     each call takes a generation number and a deferred paint stands
     down if a newer render has superseded it. Without this the last
     scheduled paint wins and the list shows a stale filter. */
  let renderGen = 0;

  function renderOrders(flashId) {
    const gen = ++renderGen;
    const list = $('#ordersList');
    const rows = visibleOrders();
    const keep = new Set(rows.map(o => o.id));
    const already = new Set($$('.order-row', list).map(r => r.dataset.id));
    const exiting = $$('.order-row', list).filter(r => !keep.has(r.dataset.id));

    const paint = () => {
      if (gen !== renderGen) return;
      const scroll = list.scrollTop;
      list.textContent = '';
      $('#ordersEmpty').hidden = rows.length > 0;
      $('.orders-head').style.display = rows.length ? '' : 'none';

      rows.forEach((o, i) => list.appendChild(orderRow(o, i, flashId, already.has(o.id))));
      list.scrollTop = scroll;
      if (state.drawer && state.drawer.mode === 'order') markOpenRow(state.drawer.id);
    };

    if (exiting.length && !noMotion()) {
      exiting.forEach(r => r.classList.add('is-out'));
      setTimeout(paint, 170);
    } else {
      paint();
    }
  }

  function orderRow(o, i, flashId, wasOnScreen) {
    const t = o.tableId ? tableById(o.tableId) : null;
    const mins = minsSince(o);
    const row = el('button', 'order-row');
    row.type = 'button';
    row.dataset.id = o.id;
    row.dataset.tone = orderTone(o);
    row.setAttribute('aria-label',
      `Ticket ${o.id}, ${t ? 'table ' + t.id : 'bar'}, ${STATUS_LABEL[o.status]}, ${fmtElapsed(mins)} elapsed`);
    if (flashId === o.id) {
      row.classList.add('just-changed');
    } else if (!wasOnScreen && !noMotion()) {
      // Enter only: a row that was already on screen keeps its identity
      // and must not re-animate just because the list re-rendered.
      row.classList.add('anim-fade');
      row.style.setProperty('--i', Math.min(i, 5));
    }
    if (o.id === 'A-1041' && firstPaint) row.classList.add('alarm-wiggle');

    row.appendChild(el('span', 'ticket-no', '#' + o.id));

    const seat = el('span', 'order-table', t ? t.id : 'BAR');
    row.appendChild(seat);

    const items = el('span', 'order-items');
    const top = el('span', 'order-items-top');
    top.appendChild(el('span', 'order-items-name', o.items[0].name));
    const rest = o.items.length - 1;
    if (rest > 0) top.appendChild(el('span', 'order-items-more', `+${rest}`));
    items.appendChild(top);
    if (o.note) {
      const note = el('span', 'order-items-note');
      note.appendChild(icon('note'));
      note.appendChild(el('span', null, o.note));
      items.appendChild(note);
    }
    row.appendChild(items);

    row.appendChild(el('span', 'order-server', o.server.split(' ')[0]));

    const el2 = el('span', 'elapsed');
    el2.dataset.since = String(o.placed);
    el2.dataset.tone = urgencyTone(mins);
    el2.appendChild(el('span', 'elapsed-dot'));
    el2.appendChild(el('span', 'elapsed-txt', fmtElapsed(mins)));
    row.appendChild(el2);

    const pillEl = el('span', 'pill', STATUS_LABEL[o.status]);
    pillEl.dataset.tone = o.flag ? 'flagged' : (STATUS_TONE[o.status] || 'waiting');
    row.appendChild(pillEl);

    const ch = el('span', 'row-chevron');
    ch.appendChild(icon('chevron'));
    row.appendChild(ch);

    row.addEventListener('click', () => openDrawer('order', o.id));
    return row;
  }

  function markOpenRow(id) {
    $$('.order-row').forEach(r => r.classList.toggle('is-selected', r.dataset.id === id));
  }

  function tickElapsed() {
    const now = Date.now();
    $$('.elapsed').forEach(n => {
      const mins = (now - Number(n.dataset.since)) / 60000;
      const txt = $('.elapsed-txt', n);
      if (txt) txt.textContent = fmtElapsed(mins);
      n.dataset.tone = urgencyTone(mins);
    });
    // the row rail and the flag threshold both follow elapsed time
    ORDERS.forEach(o => {
      if (o.status === 'served' || o.flag) return;
      const row = $(`.order-row[data-id="${o.id}"]`);
      if (!row) return;
      const tone = orderTone(o);
      if (row.dataset.tone !== tone) row.dataset.tone = tone;
    });
  }

  /* ── floor plan ─────────────────────────────────────────── */
  function renderFloor() {
    const host = $('#floor');
    $$('.tbl', host).forEach(n => n.remove());

    const linkedId = state.drawer && state.drawer.mode === 'order'
      ? (orderById(state.drawer.id) || {}).tableId
      : null;

    TABLES.forEach((t, i) => {
      const b = el('button', `tbl tbl--${t.shape}${firstPaint ? ' anim-rise' : ''}`);
      b.type = 'button';
      b.dataset.tone = t.status;
      b.dataset.table = t.id;
      b.style.setProperty('--i', i + 2);
      b.appendChild(el('span', 'tbl-id', t.id));
      b.appendChild(el('span', 'tbl-seats', t.seats + ' seats'));
      b.appendChild(el('span', 'tbl-meta', t.zone));
      if (t.flag) b.appendChild(el('span', 'tbl-flag'));
      if (linkedId === t.id) b.classList.add('is-linked');
      b.setAttribute('aria-label', `Table ${t.id}, ${t.seats} seats, ${t.status}${t.flag ? ', needs attention' : ''}`);
      b.addEventListener('click', () => openDrawer('table', t.id));
      host.appendChild(b);
    });

    const counts = TABLES.reduce((m, t) => (m[t.status] = (m[t.status] || 0) + 1, m), {});
    $('[data-floor-summary]').textContent =
      `${counts.occupied || 0} seated, ${counts.available || 0} open, ${counts.reserved || 0} held`;
  }

  function renderLegend() {
    const host = $('#legend');
    host.textContent = '';
    [
      ['available', 'Open'], ['occupied', 'Seated'],
      ['reserved', 'Held'], ['cleaning', 'Clearing'],
    ].forEach(([tone, label]) => {
      const item = el('span', 'legend-item');
      const sw = el('span', 'legend-swatch');
      sw.style.setProperty('--tone', `var(--${LEGEND_TONE[tone]})`);
      item.appendChild(sw);
      item.appendChild(document.createTextNode(label));
      host.appendChild(item);
    });
  }

  /* ── reservations ───────────────────────────────────────── */
  function renderReservations() {
    const host = $('#resList');
    host.textContent = '';
    RESERVATIONS.slice().sort((a, b) => a.time.localeCompare(b.time)).forEach((r, i) => {
      const b = el('button', `res-row${firstPaint ? ' anim-slide' : ''}`);
      b.type = 'button';
      b.style.setProperty('--i', Math.min(i, 5));
      b.setAttribute('aria-label', `${r.time}, ${r.name}, party of ${r.party}, ${r.status}`);

      const time = el('span', 'res-time', r.time);
      time.appendChild(el('small', null, relTime(r.time)));
      b.appendChild(time);

      const mid = el('span', 'res-name', r.name);
      const sub = el('span', 'res-sub');
      const party = el('span', 'res-party');
      party.appendChild(icon('user'));
      party.appendChild(el('span', null, String(r.party)));
      sub.appendChild(party);
      if (r.tableId) sub.appendChild(el('span', null, r.tableId));
      if (r.note) sub.appendChild(el('span', 'res-note', r.note));
      const wrap = el('span');
      wrap.appendChild(mid);
      wrap.appendChild(sub);
      b.appendChild(wrap);

      const p = el('span', 'pill', r.status === 'no-show' ? 'No-show' : r.status === 'pending' ? 'Pending' : r.status === 'seated' ? 'Seated' : 'Confirmed');
      p.dataset.tone = r.status;
      b.appendChild(p);

      b.addEventListener('click', () => openDrawer('reservation', r.id));
      host.appendChild(b);
    });
  }

  /* ── chart band ─────────────────────────────────────────── */
  function renderChart(animate) {
    const host = $('#chart');
    const data = RANGES[state.range];
    host.textContent = '';

    const peak = data.bars.reduce((a, b) => (b.v > a.v ? b : a));
    $('#peakLabel').textContent = `${data.label}, ${money(peak.v)}, ${peak.n} tickets`;

    const max = Math.max(...data.bars.map(b => b.v)) * 1.08;
    data.bars.forEach((b, i) => {
      const col = el('div', `bar-col${animate && !noMotion() ? ' anim-grow' : ''}`);
      col.style.setProperty('--i', i);
      const pct = (b.v / max) * 100;

      const track = el('div', 'bar-track');
      const bar = el('div', 'bar');
      bar.style.height = pct.toFixed(1) + '%';
      track.appendChild(bar);
      col.appendChild(track);
      col.appendChild(el('span', 'bar-label', b.x));

      const tip = el('span', 'bar-tip', `${money(b.v)}, ${b.n} tickets`);
      tip.style.left = '50%';
      tip.style.bottom = `calc(${pct.toFixed(1)}% + 14px)`;
      col.appendChild(tip);

      if (b === peak) col.classList.add('is-peak');
      if (b.x === data.now) col.classList.add('is-now');
      host.appendChild(col);
    });
  }

  function renderItems() {
    const host = $('#items');
    host.textContent = '';
    const max = Math.max(...TOP_ITEMS.map(i => i.units));
    TOP_ITEMS.forEach((it, i) => {
      const row = el('li', 'item-row anim-fade');
      row.style.setProperty('--i', i);
      row.appendChild(el('span', 'item-rank', String(i + 1).padStart(2, '0')));
      const mid = el('span');
      mid.appendChild(el('span', 'item-name', it.name));
      mid.appendChild(el('span', 'item-sub', it.sub));
      row.appendChild(mid);
      row.appendChild(el('span', 'item-units', String(it.units)));
      const bar = el('span', 'item-bar');
      const fill = el('span');
      fill.style.transform = `scaleX(${(it.units / max).toFixed(3)})`;
      bar.appendChild(fill);
      row.appendChild(bar);
      host.appendChild(row);
    });
  }

  function renderGauges() {
    const host = $('#gauges');
    host.textContent = '';
    GAUGES.forEach((g, i) => {
      const row = el('div', 'gauge anim-fade');
      row.style.setProperty('--i', i);
      const top = el('div', 'gauge-top');
      top.appendChild(el('span', 'gauge-name', g.name));
      top.appendChild(el('span', 'gauge-val', g.value));
      row.appendChild(top);

      const track = el('div', 'gauge-track');
      track.style.setProperty('--tone', `var(--${g.tone})`);
      const fill = el('div', 'gauge-fill');
      fill.style.transform = `scaleX(${g.pct})`;
      track.appendChild(fill);
      const mark = el('div', 'gauge-mark');
      mark.style.left = (g.mark * 100).toFixed(1) + '%';
      track.appendChild(mark);
      row.appendChild(track);

      const foot = el('div', 'gauge-foot');
      foot.appendChild(el('span', null, g.l));
      foot.appendChild(el('span', null, g.r));
      row.appendChild(foot);
      host.appendChild(row);
    });
  }

  /* ── drawer ─────────────────────────────────────────────── */
  const drawer  = $('#drawer');
  const scrim   = $('#scrim');
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),'
    + ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  /* Only rendered controls belong in the cycle: focusing a display:none
     button is a silent no-op in some engines, which would break the trap. */
  const focusables = () => $$(FOCUSABLE, drawer).filter(n =>
    !n.hidden && !n.closest('[hidden]') && getComputedStyle(n).display !== 'none');

  function openDrawer(mode, id) {
    if (state.drawer && state.drawer.mode === mode && state.drawer.id === id) return closeDrawer();
    state.lastFocus = document.activeElement;
    state.drawer = { mode, id };
    renderDrawer();
    drawer.hidden = false;
    scrim.hidden = false;
    void drawer.offsetWidth;          // force layout so the Slide in actually transitions
    drawer.classList.add('is-in');
    scrim.classList.add('is-in');
    const close = $('#drawerClose');
    if (close) close.focus();
    document.addEventListener('keydown', onDrawerKey, true);
    if (mode === 'order') markOpenRow(id);
    renderFloor();
  }

  function closeDrawer() {
    if (!state.drawer) return;
    state.drawer = null;
    drawer.classList.remove('is-in');
    scrim.classList.remove('is-in');
    document.removeEventListener('keydown', onDrawerKey, true);
    setTimeout(() => {
      if (state.drawer) return;
      drawer.hidden = true;
      scrim.hidden = true;
    }, noMotion() ? 0 : 320);
    if (state.lastFocus && state.lastFocus.isConnected) state.lastFocus.focus();
    state.lastFocus = null;
    renderFloor();
    markOpenRow(null);
  }

  function onDrawerKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    const active = document.activeElement;
    /* focus escaped the dialog, or landed on a control that is no longer
       rendered: pull it back in rather than letting Tab walk the page behind */
    if (!drawer.contains(active)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }

  scrim.addEventListener('click', closeDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);

  function renderDrawer() {
    if (!state.drawer) return;
    const { mode, id } = state.drawer;
    if (mode === 'order')     renderOrderDrawer(id);
    if (mode === 'table')     renderTableDrawer(id);
    if (mode === 'reservation') renderResDrawer(id);
  }

  function sectionHead(text) { return el('div', 'dr-label', text); }
  function metaGrid(pairs) {
    const g = el('div', 'dr-meta');
    pairs.forEach(([k, v]) => {
      const cell = el('div');
      cell.appendChild(el('div', 'dr-cell-label', k));
      cell.appendChild(el('div', 'dr-cell-value', v));
      g.appendChild(cell);
    });
    return g;
  }
  function noteBlock(text) {
    const n = el('div', 'dr-note');
    n.appendChild(icon('note'));
    n.appendChild(el('span', null, text));
    return n;
  }

  function renderOrderDrawer(id) {
    const o = orderById(id);
    if (!o) return closeDrawer();
    const t = o.tableId ? tableById(o.tableId) : null;
    const mins = minsSince(o);
    const sub = subtotalOf(o);
    const service = sub * 0.125;
    const covers = Math.max(1, Math.round(sub / 72));

    $('#drawerTicket').textContent = '#' + o.id;
    const pill = $('#drawerStatus');
    pill.textContent = o.flag ? 'Flagged' : STATUS_LABEL[o.status];
    pill.dataset.tone = orderTone(o);

    const body = $('#drawerBody');
    body.textContent = '';
    body.scrollTop = 0;

    const s1 = el('div', 'dr-section');
    s1.appendChild(sectionHead('Ticket'));
    s1.appendChild(metaGrid([
      ['Table', t ? `${t.id}, ${t.zone}` : 'Bar'],
      ['Server', o.server],
      ['Placed', new Date(o.placed).toTimeString().slice(0, 5)],
      ['Elapsed', fmtElapsed(mins)],
      ['Covers', String(covers)],
      ['Source', o.source],
    ]));
    if (o.note) s1.appendChild(noteBlock(o.note));
    body.appendChild(s1);

    const s2 = el('div', 'dr-section');
    s2.appendChild(sectionHead('Items'));
    const receipt = el('div', 'receipt');
    o.items.forEach(it => {
      const r = el('div', 'receipt-row');
      r.appendChild(el('span', 'receipt-qty', String(it.qty)));
      const mid = el('span');
      mid.appendChild(document.createTextNode(it.name));
      if (it.mod) mid.appendChild(el('span', 'receipt-mod', it.mod));
      r.appendChild(mid);
      r.appendChild(el('span', 'receipt-price', money(it.price * it.qty)));
      receipt.appendChild(r);
    });
    const totals = el('div', 'receipt-totals');
    [['Subtotal', money(sub)], ['Service 12.5%', money(service, 2)]].forEach(([k, v]) => {
      const r = el('div', 'tot-row');
      r.appendChild(el('span', null, k));
      r.appendChild(el('span', null, v));
      totals.appendChild(r);
    });
    const grand = el('div', 'tot-row tot-row--grand');
    grand.appendChild(el('span', null, 'Total'));
    grand.appendChild(el('span', null, money(sub + service, 2)));
    totals.appendChild(grand);
    receipt.appendChild(totals);
    s2.appendChild(receipt);
    body.appendChild(s2);

    const s3 = el('div', 'dr-section');
    s3.appendChild(sectionHead('Progress'));
    s3.appendChild(timeline(o));
    body.appendChild(s3);

    const foot = $('#drawerFoot');
    foot.textContent = '';
    const next = NEXT_STATUS[o.status];
    if (next) {
      const b = el('button', 'btn btn--primary btn--flex');
      b.type = 'button';
      b.appendChild(icon(o.status === 'ready' ? 'check' : 'play'));
      b.appendChild(el('span', null, NEXT_LABEL[o.status]));
      b.addEventListener('click', () => advanceOrder(o, next));
      foot.appendChild(b);
    } else {
      const b = el('button', 'btn btn--secondary btn--flex');
      b.type = 'button';
      b.appendChild(icon('print'));
      b.appendChild(el('span', null, 'Print ticket'));
      b.addEventListener('click', () => toast(`Ticket #${o.id} sent to the pass printer`, { tone: 'brass', ico: 'print' }));
      foot.appendChild(b);
    }

    if (o.flag) {
      const b = el('button', 'btn btn--secondary');
      b.type = 'button';
      b.appendChild(icon('check'));
      b.appendChild(el('span', null, 'Clear flag'));
      b.addEventListener('click', () => { o.flag = false; afterMutation(o.id); toast(`Flag cleared on #${o.id}`, { tone: 'sage', ico: 'check' }); });
      foot.appendChild(b);
    } else if (o.status !== 'served') {
      const b = el('button', 'btn btn--ghost');
      b.type = 'button';
      b.appendChild(icon('flag'));
      b.appendChild(el('span', null, 'Flag'));
      b.addEventListener('click', () => { o.flag = true; afterMutation(o.id); toast(`#${o.id} flagged for the pass`, { tone: 'vermilion', ico: 'flag' }); });
      foot.appendChild(b);
    }

    if (o.status !== 'served') {
      const b = el('button', 'btn btn--danger btn--hold');
      b.type = 'button';
      b.appendChild(icon('ban'));
      b.appendChild(el('span', null, 'Void'));
      bindHold(b, () => voidOrder(o));
      foot.appendChild(b);
    }
  }

  function timeline(o) {
    const steps = [
      ['Placed',    o.placed],
      ['In prep',   o.status !== 'new' ? o.placed + 2 * 60000 : null],
      ['Ready',     ['ready', 'served'].includes(o.status) ? o.placed + 11 * 60000 : null],
      ['Served',    o.status === 'served' ? o.placed + 17 * 60000 : null],
    ];
    const currentIdx = o.status === 'new' ? 0 : o.status === 'prep' || o.status === 'hold' ? 1 : o.status === 'ready' ? 2 : 3;
    const t = el('div', 'timeline');
    steps.forEach(([name, when], i) => {
      const s = el('div', 'tl-step' + (i < currentIdx ? ' is-done' : i === currentIdx ? ' is-current' : ''));
      const rail = el('span', 'tl-rail');
      rail.appendChild(el('span', 'tl-dot'));
      s.appendChild(rail);
      s.appendChild(el('span', 'tl-name', name));
      s.appendChild(el('span', 'tl-time', when ? new Date(when).toTimeString().slice(0, 5) : 'Not yet'));
      t.appendChild(s);
    });
    return t;
  }

  function renderTableDrawer(id) {
    const t = tableById(id);
    if (!t) return closeDrawer();
    const o = orderOn(t);
    const mins = t.since;

    $('#drawerTicket').textContent = 'TABLE ' + t.id;
    const pill = $('#drawerStatus');
    pill.textContent = { available: 'Open', occupied: 'Seated', reserved: 'Held', cleaning: 'Clearing' }[t.status];
    pill.dataset.tone = t.status;

    const body = $('#drawerBody');
    body.textContent = '';
    body.scrollTop = 0;

    const s1 = el('div', 'dr-section');
    s1.appendChild(sectionHead('Table'));
    s1.appendChild(metaGrid([
      ['Seats', String(t.seats)],
      ['Zone', t.zone],
      ['Seated for', t.status === 'occupied' ? fmtElapsed(mins) : 'Not seated'],
      ['Linked ticket', o ? '#' + o.id : (t.resId && resById(t.resId) ? 'Held for ' + resById(t.resId).name : 'None')],
    ]));
    if (t.status === 'cleaning') s1.appendChild(noteBlock('Dirty since the last party left. Mark clean to release the table to the book.'));
    if (t.resId) {
      const r = resById(t.resId);
      if (r) s1.appendChild(noteBlock(`${r.time}, ${r.name}, party of ${r.party}${r.note ? '. ' + r.note : ''}`));
    }    body.appendChild(s1);

    if (o) {
      const s2 = el('div', 'dr-section');
      s2.appendChild(sectionHead('Open ticket'));
      const receipt = el('div', 'receipt');
      o.items.forEach(it => {
        const r = el('div', 'receipt-row');
        r.appendChild(el('span', 'receipt-qty', String(it.qty)));
        r.appendChild(el('span', 'receipt-name', it.name));
        r.appendChild(el('span', 'receipt-price', money(it.price * it.qty)));
        receipt.appendChild(r);
      });
      s2.appendChild(receipt);
      body.appendChild(s2);
    }

    const foot = $('#drawerFoot');
    foot.textContent = '';

    if (o) {
      const b = el('button', 'btn btn--primary btn--flex');
      b.type = 'button';
      b.appendChild(icon('link'));
      b.appendChild(el('span', null, 'Open #' + o.id));
      b.addEventListener('click', () => { openDrawer('order', o.id); });
      foot.appendChild(b);
    }

    if (t.status === 'cleaning') {
      const b = el('button', 'btn btn--primary btn--flex');
      b.type = 'button';
      b.appendChild(icon('check'));
      b.appendChild(el('span', null, 'Mark clean'));
      b.addEventListener('click', () => setTableStatus(t, 'available', 'Table ' + t.id + ' released'));
      foot.appendChild(b);
    } else if (t.status === 'available') {
      const b = el('button', 'btn btn--primary btn--flex');
      b.type = 'button';
      b.appendChild(icon('seat'));
      b.appendChild(el('span', null, 'Seat walk-in'));
      b.addEventListener('click', () => {
        t.status = 'occupied';
        t.since = 0;
        t.flag = false;
        afterMutation(null);
        flashTable(t);
        toast(`Table ${t.id} seated, walk-in cover`, { tone: 'brass', ico: 'seat' });
        renderDrawer();
      });
      foot.appendChild(b);
    } else if (t.status === 'occupied') {
      const b = el('button', 'btn btn--secondary');
      b.type = 'button';
      b.appendChild(icon('broom'));
      b.appendChild(el('span', null, 'Send to clear'));
      b.addEventListener('click', () => setTableStatus(t, 'cleaning', `Table ${t.id} sent for clearing`));
      foot.appendChild(b);
    }

    if (t.status !== 'cleaning') {
      const b = el('button', 'btn btn--ghost');
      b.type = 'button';
      b.appendChild(icon('clock'));
      b.appendChild(el('span', null, 'Flag'));
      b.addEventListener('click', () => {
        t.flag = !t.flag;
        flashTable(t);
        afterMutation(null);
        toast(t.flag ? `Table ${t.id} flagged` : `Flag cleared on table ${t.id}`,
          { tone: t.flag ? 'vermilion' : 'sage', ico: t.flag ? 'flag' : 'check' });
        renderDrawer();
      });
      foot.appendChild(b);
    }
  }

  function renderResDrawer(id) {
    const r = resById(id);
    if (!r) return closeDrawer();
    const t = r.tableId ? tableById(r.tableId) : null;

    $('#drawerTicket').textContent = r.time;
    const pill = $('#drawerStatus');
    pill.textContent = r.status === 'no-show' ? 'No-show' : r.status === 'pending' ? 'Pending' : r.status === 'seated' ? 'Seated' : 'Confirmed';
    pill.dataset.tone = r.status;

    const body = $('#drawerBody');
    body.textContent = '';
    body.scrollTop = 0;

    const s1 = el('div', 'dr-section');
    s1.appendChild(sectionHead('Booking'));
    s1.appendChild(metaGrid([
      ['Guest', r.name],
      ['Party', String(r.party)],
      ['Table', r.tableId || 'Unassigned'],
      ['Arrives', relTime(r.time)],
      ['Zone', t ? t.zone : 'Unassigned'],
      ['Status', r.status],
    ]));
    if (r.note) s1.appendChild(noteBlock(r.note));
    if (r.status === 'no-show') s1.appendChild(noteBlock('Marked as a no-show. The table is still held by the book, release it if nobody arrives.'));
    body.appendChild(s1);

    const foot = $('#drawerFoot');
    foot.textContent = '';

    if (r.status !== 'seated' && r.status !== 'no-show') {
      const b = el('button', 'btn btn--primary btn--flex');
      b.type = 'button';
      b.appendChild(icon('seat'));
      b.appendChild(el('span', null, 'Seat party'));
      b.addEventListener('click', () => seatReservation(r));
      foot.appendChild(b);
    }
    if (r.status === 'pending') {
      const b = el('button', 'btn btn--secondary');
      b.type = 'button';
      b.appendChild(icon('check'));
      b.appendChild(el('span', null, 'Confirm'));
      b.addEventListener('click', () => {
        r.status = 'confirmed';
        afterMutation(null);
        toast(`${r.name} confirmed for ${r.time}`, { tone: 'sage', ico: 'check' });
        renderReservations();
        renderDrawer();
      });
      foot.appendChild(b);
    }
    if (r.status !== 'seated') {
      const b = el('button', 'btn btn--ghost');
      b.type = 'button';
      b.appendChild(icon('ban'));
      b.appendChild(el('span', null, 'No-show'));
      b.addEventListener('click', () => {
        r.status = 'no-show';
        afterMutation(null);
        toast(`${r.name} marked as a no-show`, { tone: 'vermilion', ico: 'ban' });
        renderReservations();
        renderDrawer();
      });
      foot.appendChild(b);
    }
  }

  /* ── actions ────────────────────────────────────────────── */
  function advanceOrder(o, next) {
    o.status = next;
    if (next === 'served' && o.tableId) {
      const t = tableById(o.tableId);
      if (t) t.status = 'cleaning';
    }
    afterMutation(o.id);
    toast(`#${o.id} → ${STATUS_LABEL[next]}`, { tone: next === 'served' ? 'sage' : 'brass', ico: 'check' });
  }

  function voidOrder(o) {
    const i = ORDERS.indexOf(o);
    if (i > -1) ORDERS.splice(i, 1);
    TABLES.forEach(t => { if (t.orderId === o.id) { t.orderId = null; t.status = 'cleaning'; } });
    if (state.drawer && state.drawer.id === o.id) closeDrawer();
    afterMutation(null);
    toast(`#${o.id} voided, table sent for clearing`, { tone: 'vermilion', ico: 'ban' });
  }

  function setTableStatus(t, status, message) {
    t.status = status;
    t.since = 0;
    if (status !== 'occupied') t.flag = false;
    afterMutation(null);
    flashTable(t);   // after the re-render: renderFloor() replaces every tile,
                     // so flashing first would flash a node that no longer exists
    toast(message, { tone: 'brass', ico: 'broom' });
    renderDrawer();
  }

  function seatReservation(r) {
    r.status = 'seated';
    const t = r.tableId ? tableById(r.tableId) : TABLES.find(x => x.status === 'available' && x.seats >= r.party);
    if (t) {
      t.status = 'occupied';
      t.since = 0;
      t.flag = false;
      t.resId = null;
      r.tableId = t.id;
    }
    afterMutation(null);
    if (t) flashTable(t);
    toast(`${r.name} seated${t ? ' at ' + t.id : ', no table free'}`, { tone: 'sage', ico: 'seat' });
    renderReservations();
    renderDrawer();
  }

  function flashTable(t) {
    const node = $(`.tbl[data-table="${t.id}"]`);
    if (!node || noMotion()) return;
    node.classList.remove('just-changed');
    void node.offsetWidth;
    node.classList.add('just-changed');
  }

  /* one consistent re-render path after any state mutation */
  function afterMutation(flashId) {
    paintLive();
    renderFilters();
    renderOrders(flashId);
    renderReservations();
    renderFloor();
    renderLegend();
    if (state.drawer) renderDrawer();
  }

  /* Hold to confirm: the fill only commits if the pointer stays down
     for the full duration. Releasing early springs the fill back. */
  function bindHold(node, onComplete) {
    let timer = null;
    let done = false;
    const HOLD = 600;

    const release = (commit) => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (done) return;
      if (commit) {
        done = true;
        node.classList.add('is-done');
        node.classList.remove('is-holding');
        onComplete();
        setTimeout(() => { if (node.isConnected) node.classList.remove('is-done'); }, 400);
      } else {
        node.classList.remove('is-holding');
      }
    };

    node.addEventListener('pointerdown', e => {
      if (e.button != null && e.button !== 0) return;
      // Reduced motion removes the 600ms fill, so fall back to a plain
      // deliberate click: the hold is a motion affordance, not the
      // confirmation itself, and it must not become unreachable.
      if (noMotion()) { onComplete(); done = true; return; }
      node.classList.add('is-holding');
      timer = setTimeout(() => release(true), HOLD);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
      node.addEventListener(ev, () => release(false)));
    node.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !done) { e.preventDefault(); onComplete(); done = true; }
    });
  }

  /* ── toasts ─────────────────────────────────────────────── */
  function toast(text, opts = {}) {
    const { tone = 'brass', ico = 'check', action } = opts;
    const host = $('#toasts');
    while (host.children.length >= 3) host.firstElementChild.remove();

    const t = el('div', 'toast');
    t.style.setProperty('--tone', `var(--${tone})`);
    const icoBox = el('span', 'toast-ico');
    icoBox.appendChild(icon(ico));
    t.appendChild(icoBox);
    const msg = el('span', 'toast-text');
    const strong = text.split('||');
    strong.forEach((part, i) => msg.appendChild(i ? el('b', null, part) : document.createTextNode(part)));
    t.appendChild(msg);
    if (action) {
      const a = el('button', 'toast-act', action.label);
      a.type = 'button';
      a.addEventListener('click', () => { action.run(); dismiss(); });
      t.appendChild(a);
    }
    host.appendChild(t);

    const dismiss = () => {
      if (t.classList.contains('is-out')) return;
      t.classList.add('is-out');
      setTimeout(() => t.remove(), noMotion() ? 0 : 210);
    };
    t.addEventListener('click', e => { if (!e.target.closest('.toast-act')) dismiss(); });
    setTimeout(dismiss, 4200);
    return t;
  }

  /* ── global interactions ─────────────────────────────────── */
  const search = $('#globalSearch');

  function bindPress() {
    document.addEventListener('pointerdown', e => {
      const node = e.target.closest('[data-press]');
      if (!node || noMotion()) return;
      node.classList.add('is-press');
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
      document.addEventListener(ev, e => {
        const node = e.target.closest('[data-press]');
        if (node) node.classList.remove('is-press');
      }, true));
  }

  function bindGlobalKeys() {
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        search.focus();
        search.select();
      } else if (e.key === 'Escape' && document.activeElement === search) {
        if (search.value) { search.value = ''; state.query = ''; renderOrders(); }
        else search.blur();
      } else if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        search.focus();
        search.select();
      }
    });
  }

  function bindGlobalWiring() {
    search.addEventListener('input', () => {
      state.query = search.value;
      renderOrders();
    });
    search.addEventListener('search', () => {
      state.query = search.value;
      renderOrders();
    });

    $('[data-clear-filters]').addEventListener('click', () => {
      search.value = '';
      state.query = '';
      state.filter = 'all';
      renderFilters();
      renderOrders();
    });

    $$('[data-nav]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        $$('[data-nav]').forEach(x => x.classList.remove('is-active'));
        a.classList.add('is-active');
        const label = a.querySelector('span:not(.nav-badge)');
        toast(`${label ? label.textContent : 'Section'} view is not part of this prototype`, { tone: 'brass', ico: 'info' });
      });
    });

    $('.icon-btn[aria-label="Notifications"]').addEventListener('click', () => {
      const first = ALERTS[0];
      runAlertAction(first);
    });

    $$('#chartSeg .seg-btn').forEach((b, i) => {
      b.addEventListener('click', () => {
        const key = ['today', '7d', '30d'][i];
        if (state.range === key) return;
        state.range = key;
        $$('#chartSeg .seg-btn').forEach(x => x.classList.toggle('is-active', x === b));
        renderChart(true);
      });
    });

    window.addEventListener('resize', syncPill);
    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches) $$('.kpi-spark').forEach(s => s.classList.add('is-drawn'));
    });
  }

  /* ── boot ───────────────────────────────────────────────── */
  function init() {
    paintDate();
    paintClock();
    setInterval(paintClock, 1000);

    renderAlerts();
    renderKPIs();
    renderFilters();
    renderOrders();
    renderFloor();
    renderLegend();
    renderReservations();
    renderChart(true);
    renderItems();
    renderGauges();

    paintLive();
    bindPress();
    bindGlobalKeys();
    bindGlobalWiring();
    setInterval(tickElapsed, 1000);
    firstPaint = false;

    // let the entrance stagger begin to settle before the Line drawing
    requestAnimationFrame(() => { requestAnimationFrame(drawSparks); });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(syncPill).catch(() => {});
    }
    requestAnimationFrame(syncPill);

    const boot = $('#boot');
    setTimeout(() => {
      boot.classList.add('is-gone');
      setTimeout(() => boot.remove(), 600);
    }, 620);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
