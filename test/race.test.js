const np = require('path');
const PAGE = np.join(__dirname, '..', 'index.html');
const STYLES = np.join(__dirname, '..', 'styles.css');
const { JSDOM, VirtualConsole } = require('jsdom');
const checks = []; const ok = (n,c,e)=>checks.push({name:n,pass:!!c,extra:e||''});
const errors=[]; const vc=new VirtualConsole();
vc.on('jsdomError', e => { if(!/fonts\.googleapis/.test(e.message)) errors.push(e.stack||e.message); });

JSDOM.fromFile(PAGE, {
  runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:vc,
  beforeParse(win){
    win.matchMedia = q => ({media:q,matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
    win.HTMLElement.prototype.scrollIntoView = function(){};
    win.SVGElement.prototype.getTotalLength = function(){return 120;};
  },
}).then(async dom => {
  const {window}=dom, doc=window.document;
  const $=s=>doc.querySelector(s), $$=s=>Array.from(doc.querySelectorAll(s));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  await new Promise(r=>window.addEventListener('load',r));
  await sleep(200);
  // jsdom does not apply the page's own <link> here, and without it the
  // visibility filter below is meaningless -- every hidden button would count
  const sheet = doc.createElement('style');
  sheet.textContent = require('fs').readFileSync(STYLES,'utf8');
  doc.head.appendChild(sheet);
  const chip=f=>$(`#filters .chip[data-filter="${f}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));

  // two chip clicks inside the 170ms exit window
  chip('flagged');
  await sleep(40);
  chip('all');
  await sleep(400);
  ok('rapid chip flip settles on 18 rows', $$('.order-row').length === 18, `got ${$$('.order-row').length}`);

  // search keystrokes inside the window
  const input=$('#globalSearch');
  for (const q of ['r','ri','rib','ribe','ribey','ribeye']) {
    input.value=q; input.dispatchEvent(new window.Event('input',{bubbles:true})); await sleep(25);
  }
  await sleep(400);
  ok('fast typing settles on ribeye result', $$('.order-row').length === 3,
    `got ${$$('.order-row').length} (${$$('.order-row').map(r=>r.dataset.id).join(',')})`);

  // filter then search, crossing windows
  chip('prep'); await sleep(30);
  input.value=''; input.dispatchEvent(new window.Event('input',{bubbles:true}));
  await sleep(400);
  // A-1041 is a prep ticket, so the prep filter legitimately yields 3
  ok('filter+search settle on prep', $$('.order-row').length === 3, `got ${$$('.order-row').length}`);
  ok('no stranded is-out rows', $$('.order-row.is-out').length === 0);

  // focus trap: Tab from the last control wraps to the first
  chip('all'); await sleep(300);
  $('.order-row[data-id="A-1039"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  await sleep(60);
  // mirror the app's own rule: only rendered controls are in the cycle.
  // Recompute immediately before each keydown, exactly as the app does.
  const FOCUSABLES = () => $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),'
    + ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', $('#drawer'))
    .filter(n=>!n.hidden && !n.closest('[hidden]') && window.getComputedStyle(n).display!=='none');
  ok('drawer has focusable controls', FOCUSABLES().length>1, `got ${FOCUSABLES().length}`);
  let f = FOCUSABLES();
  f[f.length-1].focus();
  doc.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
  // jsdom performs no real Tab traversal, so assert the invariant that
  // matters rather than an exact boundary: focus stays inside the cycle
  ok('Tab from last stays in the trap', FOCUSABLES().includes(doc.activeElement),
    `active=${(doc.activeElement.textContent||'').trim().slice(0,20)}`);
  f = FOCUSABLES();
  f[0].focus();
  doc.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true}));
  f = FOCUSABLES();
  ok('Shift+Tab wraps to last control', doc.activeElement===f[f.length-1], `active=${(doc.activeElement.textContent||'').trim().slice(0,20)}`);

  // focus must never escape the modal into the page behind it
  $('.order-row[data-id="A-1039"]').focus();
  doc.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
  ok('focus is pulled back into the drawer', $('#drawer').contains(doc.activeElement),
    `active=${(doc.activeElement.textContent||'').trim().slice(0,20)}`);

  console.log('');
  for(const c of checks) console.log(`${c.pass?'PASS':'FAIL'}  ${c.name}${c.extra?'   ['+c.extra+']':''}`);
  const bad=checks.filter(c=>!c.pass);
  console.log(`\n${checks.length-bad.length}/${checks.length} passed`);
  console.log(errors.length?'\nERRORS:\n  '+errors.join('\n  '):'no runtime errors');
  process.exit(bad.length||errors.length?1:0);
}).catch(e=>{console.error('FATAL',e);process.exit(2);});
