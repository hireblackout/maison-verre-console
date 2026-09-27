const np = require('path');
const PAGE = np.join(__dirname, '..', 'index.html');
const STYLES = np.join(__dirname, '..', 'styles.css');
const { JSDOM, VirtualConsole } = require('jsdom');

const checks = [];
const ok = (n, c, e) => checks.push({ name: n, pass: !!c, extra: e || '' });
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => {
  if (/fonts\.googleapis/.test(e.message)) return;   // no network in this sandbox
  errors.push(e.stack || e.message);
});

JSDOM.fromFile(PAGE, {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(win) {
    win.matchMedia = q => ({ media: q, matches: /reduce/.test(q),
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    win.HTMLElement.prototype.scrollIntoView = function () {};
    win.SVGElement.prototype.getTotalLength = function () { return 120; };
    win.PointerEvent = win.MouseEvent;
  },
}).then(async dom => {
  const { window } = dom, doc = window.document;
  const $ = s => doc.querySelector(s), $$ = s => Array.from(doc.querySelectorAll(s));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await new Promise(r => window.addEventListener('load', r));
  await sleep(300);

  ok('matchMedia reduce is active',
    window.matchMedia('(prefers-reduced-motion: reduce)').matches === true);

  // Line drawing must resolve instantly, never stay invisible
  const sparks = $$('.kpi-spark');
  ok('all 5 sparks resolved without waiting', sparks.every(s => s.classList.contains('is-drawn')),
    `${sparks.filter(s => s.classList.contains('is-drawn')).length}/5`);

  ok('no entrance stagger classes on chart', $$('.bar-col.anim-grow').length === 0);
  ok('chart still renders bars', $$('.bar-col').length === 7, `got ${$$('.bar-col').length}`);

  // Filtering must repaint synchronously (no 170ms exit wait)
  chipClick('flagged');
  const t0 = Date.now();
  ok('flagged filter paints synchronously', $$('.order-row').length === 2,
    `got ${$$('.order-row').length} after ${Date.now() - t0}ms`);
  ok('no exit nodes left behind', $$('.order-row.is-out').length === 0);
  ok('entering rows skip the fade', $$('.order-row.anim-fade').length === 0,
    `got ${$$('.order-row.anim-fade').length}`);

  function chipClick(f) {
    $(`#filters .chip[data-filter="${f}"]`)
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  }
  chipClick('all');
  ok('all filter restores 18', $$('.order-row').length === 18, `got ${$$('.order-row').length}`);

  // Void must still be reachable with a plain click (no 600ms hold)
  ok('Void button present', !!$('#drawerFoot, .order-row'));
  $('.order-row[data-id="A-1045"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  const voidBtn = $$('#drawerFoot .btn').find(b => /Void/.test(b.textContent));
  ok('void button rendered', !!voidBtn);
  voidBtn.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
  await sleep(60);
  ok('void commits on plain pointerdown', $$('.order-row[data-id="A-1045"]').length === 0,
    `row still present: ${$$('.order-row[data-id="A-1045"]').length > 0}`);
  ok('order count dropped to 17', $$('.order-row').length === 17, `got ${$$('.order-row').length}`);
  ok('toast still announced the void', /voided/i.test($$('#toasts .toast').pop().textContent),
    `got ${$$('#toasts .toast').pop().textContent}`);

  // Table status change still works, just without the flash
  $('.tbl[data-table="T2"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  const seatBtn = $$('#drawerFoot .btn').find(b => /Seat walk-in/.test(b.textContent));
  ok('seat walk-in present', !!seatBtn);
  seatBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  ok('table T2 now occupied', $('.tbl[data-table="T2"]').dataset.tone === 'occupied',
    `got ${$('.tbl[data-table="T2"]').dataset.tone}`);
  ok('no flash class under reduced motion',
    !$('.tbl[data-table="T2"]').classList.contains('just-changed'),
    `classes=${$('.tbl[data-table="T2"]').className}`);

  // Search must not flicker the list
  const input = $('#globalSearch');
  input.value = 'seabass';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(50);
  // seabass appears on 4 tickets
  ok('search works under reduced motion', $$('.order-row').length === 4,
    `got ${$$('.order-row').length} (${$$('.order-row').map(r => r.dataset.id).join(',')})`);

  console.log('');
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.extra ? '   [' + c.extra + ']' : ''}`);
  const failed = checks.filter(c => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  console.log(errors.length ? '\nRUNTIME ERRORS:\n  ' + errors.join('\n  ') : 'no runtime errors');
  process.exit(failed.length || errors.length ? 1 : 0);
}).catch(e => { console.error('FATAL', e); process.exit(2); });
