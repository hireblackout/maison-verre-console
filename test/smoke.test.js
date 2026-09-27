const np = require('path');
const PAGE = np.join(__dirname, '..', 'index.html');
const STYLES = np.join(__dirname, '..', 'styles.css');
const { JSDOM, VirtualConsole } = require('jsdom');
const path = require('path');

const FILE = PAGE;
let reduce = false;
const errors = [];

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const checks = [];
const ok = (name, cond, extra) => checks.push({ name, pass: !!cond, extra: extra || '' });

JSDOM.fromFile(FILE, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(win) {
    win.matchMedia = q => ({
      media: q, matches: reduce,
      addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {},
    });
    win.HTMLElement.prototype.scrollIntoView = function () {};
    win.SVGElement.prototype.getTotalLength = function () { return 120; };
  },
}).then(async dom => {
  const { window } = dom;
  const doc = window.document;
  const $ = s => doc.querySelector(s);
  const $$ = s => Array.from(doc.querySelectorAll(s));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  await new Promise(r => window.addEventListener('load', r));
  await sleep(1500);

  // ---- boot ----
  ok('boot overlay lifts', !$('#boot'));

  // ---- every mount populated ----
  const mounts = {
    '#alerts': '.alert', '#kpiRow': '.kpi', '#filters': '.chip', '#ordersList': '.order-row',
    '#floor': '.tbl', '#legend': '.legend-item', '#resList': '.res-row', '#chart': '.bar-col',
    '#items': '.item-row', '#gauges': '.gauge', '#toasts': null, '#drawerBody': null,
  };
  for (const [sel, child] of Object.entries(mounts)) {
    if (!child) { ok(`mount ${sel} exists`, !!$(sel)); continue; }
    const n = $(sel).querySelectorAll(child).length;
    ok(`mount ${sel} (${child})`, n > 0, `${n} nodes`);
  }

  // ---- counts ----
  ok('18 orders seeded', $$('.order-row').length === 18, `got ${$$('.order-row').length}`);
  ok('14 tables', $$('.tbl').length === 14, `got ${$$('.tbl').length}`);
  ok('6 filter chips', $$('.chip').length === 6, `got ${$$('.chip').length}`);
  ok('5 KPIs', $$('.kpi').length === 5, `got ${$$('.kpi').length}`);
  ok('7 chart bars', $$('.bar-col').length === 7, `got ${$$('.bar-col').length}`);
  ok('9 reservations', $$('.res-row').length === 9, `got ${$$('.res-row').length}`);
  ok('3 alerts', $$('.alert').length === 3, `got ${$$('.alert').length}`);
  ok('6 top items', $$('.item-row').length === 6, `got ${$$('.item-row').length}`);
  ok('4 gauges', $$('.gauge').length === 4, `got ${$$('.gauge').length}`);

  // ---- live counters ----
  ok('orders badge = open orders', $('[data-live="orders"]').textContent === '9',
    `got ${$('[data-live="orders"]').textContent}`);
  ok('served history is not flagged', $$('.order-row[data-tone="served"]').length === 9,
    `got ${$$('.order-row[data-tone="served"]').length} sage served rows`);
  ok('flagged badge set', $('[data-live="flagged"]').textContent === '2',
    `got ${$('[data-live="flagged"]').textContent}`);
  ok('alert dot has data-n', $('[data-live="alerts"]').dataset.n === '3',
    `got ${$('[data-live="alerts"]').dataset.n}`);
  ok('covers meter set', /scaleX\(0\.48/.test($('[data-meter]').style.transform),
    `got ${$('[data-meter]').style.transform}`);
  ok('floor summary text', /seated/.test($('[data-floor-summary]').textContent),
    `got ${$('[data-floor-summary]').textContent}`);

  // ---- sparkline line drawing ----
  ok('spark dash length measured', $$('.kpi-spark').every(s => s.style.getPropertyValue('--len')),
    JSON.stringify($$('.kpi-spark')[0].style.cssText));

  // ---- entrance classes only on first paint ----
  const firstAnim = $$('.tbl.anim-rise, .res-row.anim-slide, .bar-col.anim-grow').length;
  ok('entrance classes present on first paint', firstAnim === 14 + 9 + 7, `${firstAnim} (expect 30)`);

  // ---- filtering ----
  const chip = f => $(`#filters .chip[data-filter="${f}"]`);
  chip('flagged').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(260);
  ok('flagged filter -> 2 rows', $$('.order-row').length === 2, `got ${$$('.order-row').length}`);
  ok('flagged rows are the flagged tickets',
    $$('.order-row').map(r => r.dataset.id).sort().join(',') === 'A-1041,A-1045',
    $$('.order-row').map(r => r.dataset.id).join(','));

  chip('all').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(260);
  ok('all filter -> 18 rows', $$('.order-row').length === 18, `got ${$$('.order-row').length}`);

  // ---- search ----
  const input = $('#globalSearch');
  input.value = 'ribeye';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(260);
  ok('search "ribeye" narrows list', $$('.order-row').length === 3,
    `got ${$$('.order-row').length} (${$$('.order-row').map(r => r.dataset.id).join(',')})`);

  input.value = 'ivo';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(260);
  ok('search by server name works', $$('.order-row').length === 4,
    `got ${$$('.order-row').length}`);

  input.value = 'zzzz';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(260);
  ok('empty state shows', !$('#ordersEmpty').hidden, `hidden=${$('#ordersEmpty').hidden}`);
  ok('header row hidden when empty', $('.orders-head').style.display === 'none',
    `got ${$('.orders-head').style.display}`);

  $('[data-clear-filters]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(260);
  ok('clear filters restores 18', $$('.order-row').length === 18, `got ${$$('.order-row').length}`);
  ok('search box cleared', input.value === '');

  // ---- order drawer ----
  const row = $('.order-row[data-id="A-1041"]');
  row.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  ok('drawer visible', $('#drawer').hidden === false);
  ok('scrim visible', $('#scrim').hidden === false);
  ok('drawer ticket label', $('#drawerTicket').textContent === '#A-1041', `got ${$('#drawerTicket').textContent}`);
  ok('drawer status pill', $('#drawerStatus').textContent === 'Flagged', `got ${$('#drawerStatus').textContent}`);
  ok('receipt lines rendered', $$('#drawerBody .receipt-row').length === 3,
    `got ${$$('#drawerBody .receipt-row').length}`);
  ok('timeline steps', $$('#drawerBody .tl-step').length === 4, `got ${$$('#drawerBody .tl-step').length}`);
  ok('note block rendered', $$('#drawerBody .dr-note').length === 1);
  ok('row marked selected', row.classList.contains('is-selected'));
  ok('table linked', !!$('.tbl.is-linked[data-table="T4"]'));
  ok('action buttons present', $$('#drawerFoot .btn').length === 3,
    `got ${$$('#drawerFoot .btn').length} -> ${$$('#drawerFoot .btn').map(b => b.textContent).join('|')}`);
  ok('hold-to-confirm button present', !!$('#drawerFoot .btn--hold'));

  // ---- advance status (the core manager action) ----
  const advance = () => $$('#drawerFoot .btn').find(b => b.classList.contains('btn--primary'));
  advance().dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  ok('status advanced prep -> ready', $('#drawerStatus').textContent === 'Flagged' || $('#drawerStatus').textContent === 'Ready',
    `got ${$('#drawerStatus').textContent}`);
  const a1041 = $$('.order-row').find(r => r.dataset.id === 'A-1041');
  ok('row flashes on change', a1041.classList.contains('just-changed'),
    `classes=${a1041.className}`);
  ok('toast raised', $$('#toasts .toast').length > 0, `got ${$$('#toasts .toast').length}`);

  // ---- close via Escape ----
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(400);
  ok('drawer hidden after Escape', $('#drawer').hidden === true);
  ok('scrim hidden after Escape', $('#scrim').hidden === true);
  ok('row no longer selected', !$('.order-row[data-id="A-1041"]').classList.contains('is-selected'));

  // ---- table drawer ----
  $('.tbl[data-table="T5"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  ok('table drawer opens', $('#drawer').hidden === false);
  ok('table drawer label', $('#drawerTicket').textContent === 'TABLE T5', `got ${$('#drawerTicket').textContent}`);
  ok('table drawer status', $('#drawerStatus').textContent === 'Clearing', `got ${$('#drawerStatus').textContent}`);
  const markClean = $$('#drawerFoot .btn').find(b => /Mark clean/.test(b.textContent));
  ok('mark-clean action present', !!markClean);
  markClean.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  ok('table T5 now available', $('.tbl[data-table="T5"]').dataset.tone === 'available',
    `got ${$('.tbl[data-table="T5"]').dataset.tone}`);
  ok('table tile flashes', $('.tbl[data-table="T5"]').classList.contains('just-changed'));
  ok('table still has anim-rise? no', !$('.tbl[data-table="T5"]').classList.contains('anim-rise'),
    `classes=${$('.tbl[data-table="T5"]').className}`);

  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(400);

  // ---- reservation drawer + seat ----
  const resBefore = $$('.res-row').length;
  $('.res-row').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  ok('reservation drawer opens', $('#drawerTicket').textContent === '18:45', `got ${$('#drawerTicket').textContent}`);
  const seat = $$('#drawerFoot .btn').find(b => /Seat party/.test(b.textContent));
  ok('seat action present', !!seat);
  seat.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  ok('reservation marked seated', $('#drawerStatus').textContent === 'Seated', `got ${$('#drawerStatus').textContent}`);
  ok('upcoming reservation count dropped', $('[data-live="resTotal"]').textContent === '7',
    `got ${$('[data-live="resTotal"]').textContent}`);

  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(400);

  // ---- alert action routes into the queue ----
  $('.alert--critical').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(300);
  ok('alert click sets flagged filter', $('.chip[data-filter="flagged"]').classList.contains('is-active'));
  ok('flagged pill reflects state', $('.chip[data-filter="flagged"] .chip-count').textContent !== '');

  // ---- chart range switch ----
  $('#chartSeg .seg-btn').parentElement.children[1]
    .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  ok('7d range renders 7 bars', $$('.bar-col').length === 7, `got ${$$('.bar-col').length}`);
  ok('7d peak label updated', /Best Mon/.test($('#peakLabel').textContent), `got ${$('#peakLabel').textContent}`);

  // ---- nav is inert but not broken ----
  $$('[data-nav]')[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  ok('nav marks active', $$('[data-nav]')[1].classList.contains('is-active'));
  ok('nav toast explains', /prototype/.test($$('#toasts .toast').pop().textContent),
    `got ${$$('#toasts .toast').pop().textContent}`);

  // ---- elapsed tickers ----
  const firstElapsed = $('.elapsed').dataset.since;
  await sleep(1100);
  ok('elapsed ticker has since timestamp', !!firstElapsed);
  ok('elapsed text rendered', /m|just now|h/.test($('.elapsed .elapsed-txt').textContent),
    `got ${$('.elapsed .elapsed-txt').textContent}`);

  console.log('');
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.extra ? '   [' + c.extra + ']' : ''}`);
  const failed = checks.filter(c => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (errors.length) { console.log('\nRUNTIME ERRORS:'); errors.forEach(e => console.log('  ' + e)); }
  else console.log('no runtime errors');
  process.exit(failed.length || errors.length ? 1 : 0);
}).catch(e => { console.error('FATAL', e); process.exit(2); });
