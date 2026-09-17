'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');

test('Ildi backlog stays independent from historical readiness',()=>{
  const backlog=JSON.parse(
    fs.readFileSync(
      path.join(root,'data/ildi-development-backlog.json'),
      'utf8'
    )
  );

  assert.ok(backlog.items.length>=30);

  for(const [gameId,type] of [
    ['masyu','CORRECTNESS'],
    ['aquarium','CORRECTNESS'],
    ['yajilin','CORRECTNESS'],
    ['skyscraper','DIFFICULTY'],
    ['odd-even','DIFFICULTY']
  ]){
    assert.ok(
      backlog.items.some(x=>x.gameId===gameId&&x.type===type),
      `missing backlog item ${gameId}/${type}`
    );
  }

  for(const id of [
    'JP-CORRECT-MASYU',
    'JP-CORRECT-AQUARIUM-LOCK',
    'JP-CORRECT-YAJILIN',
    'GLOBAL-SOLVED-IMMUTABILITY',
    'JP-UX-NONOGRAM-ROW',
    'JP-UX-MASYU-CIRCLE',
    'JP-UX-STARBATTLE-ROW',
    'JP-UX-HEYAWAKE-X',
    'JP-RULE-SHAKASHAKA',
    'JP-RULE-LITS',
    'SUD-VERIFY-DOUBLE-SKY-SOLVED',
    'SUD-DIFF-SKY',
    'SUD-DIFF-DOUBLE-SKY',
    'SUD-DIFF-TOROIDAL-SKY',
    'SUD-DIFF-ODD-EVEN',
    'JP-SIZE-STARBATTLE',
    'JP-SIZE-GALAXIES',
    'JP-SIZE-HITORI',
    'JP-SIZE-FUTOSHIKI',
    'JP-SIZE-FILLOMINO',
    'JP-SIZE-NONOGRAM',
    'JP-SIZE-HEYAWAKE',
    'JP-SIZE-AKARI',
    'JP-SIZE-NURIKABE',
    'JP-SIZE-RIPPLE',
    'JP-SIZE-BATTLESHIPS',
    'JP-SIZE-SLITHERLINK',
    'JP-SIZE-MASYU',
    'JP-SIZE-HASHI',
    'SUD-SIZE-SKY-7-8',
    'SUD-SIZE-DOUBLE-SKY-8'
  ]){
    const item=backlog.items.find(x=>x.id===id);
    assert.ok(item,`missing closed item ${id}`);
    assert.equal(item.status,'CLOSED',id);
    assert.ok(item.closedAt,id+' closedAt');
    assert.ok(item.evidence,id+' evidence');
  }

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ildi-backlog-'));
  const out=path.join(dir,'status.html');

  const run=spawnSync(
    process.execPath,
    ['scripts/build-development-status.mjs',out],
    {cwd:root,encoding:'utf8'}
  );

  assert.equal(run.status,0,run.stderr||run.stdout);

  const html=fs.readFileSync(out,'utf8');

  assert.match(html,/<th>Aktuális teendő<\/th>/);
  assert.match(html,/<th>Részletek<\/th>/);
  assert.match(html,/id="work-status"/);
  assert.match(html,/data-filter-work="OPEN"/);

  // Historical generator programme remains complete.
  assert.match(html,/77 \/ 77<\/strong>Teljesen kész/);

  // P0-P3 programme is completely closed.
  assert.doesNotMatch(html,/7×7 és 8×8 méret támogatása/);
  assert.doesNotMatch(html,/8×8 méret támogatása/);

  // Closed items remain in backlog history, not presented as active work.
  assert.doesNotMatch(html,/Megoldás után a játék ne maradjon szerkeszthető/);
  assert.doesNotMatch(html,/Az X jelölés ne változtassa meg a sormagasságot/);
  assert.doesNotMatch(html,/Explicit X jelölés támogatása/);
  assert.doesNotMatch(html,/A számozott mező melletti háromszögek szabályának pontosítása/);
  assert.doesNotMatch(html,/A Tetrominókert szabályleírásának és játéklogikájának auditja/);
  assert.doesNotMatch(html,/A korábban jelzett Folyamatban → Megoldva problémát újra kell reprodukálni/);
  assert.doesNotMatch(html,/A nehéz 6×6 szint túl könnyű/);
  assert.doesNotMatch(html,/A nehéz szint túl könnyű; újrakalibrálás/);
  assert.doesNotMatch(html,/A nehéz szint tényleges nehezítése/);
});

test('status page exposes the completed Ildi development programme after P3 closure',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ildi-programme-status-'));
  const out=path.join(dir,'status.html');

  const run=spawnSync(
    process.execPath,
    ['scripts/build-development-status.mjs',out],
    {cwd:root,encoding:'utf8'}
  );

  assert.equal(run.status,0,run.stderr||run.stdout);

  const html=fs.readFileSync(out,'utf8');

  assert.match(html,/<h2>Aktuális fejlesztési program<\/h2>/);
  assert.match(html,/<strong>0<\/strong>Aktív teendő/);

  assert.match(html,/<strong>0<\/strong>P0 · helyesség/);
  assert.match(html,/<strong>0<\/strong>P1 · UX \/ szabály/);
  assert.match(html,/<strong>0<\/strong>P2 · nehézség/);
  assert.match(html,/<strong>0<\/strong>P3 · méretbővítés/);

  assert.doesNotMatch(html,/Globális teendő:/);
});

test('every non-global backlog gameId belongs to the canonical catalogue',()=>{
  const backlog=JSON.parse(
    fs.readFileSync(
      path.join(root,'data/ildi-development-backlog.json'),
      'utf8'
    )
  );

  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...index.matchAll(/<script src="([^"]+)"/g)]
    .map(m=>m[1])
    .filter(x=>x.startsWith('games/sudoku-bank'));

  const vm=require('node:vm');
  const ctx={console};
  ctx.globalThis=ctx;
  ctx.window=ctx;
  ctx.localStorage={getItem:()=>null,setItem:()=>{}};
  vm.createContext(ctx);

  vm.runInContext(
    fs.readFileSync(path.join(root,'assets/i18n.js'),'utf8'),
    ctx
  );

  for(const ref of refs){
    vm.runInContext(
      fs.readFileSync(path.join(root,ref),'utf8'),
      ctx,
      {filename:ref}
    );
  }

  const ids=new Set((ctx.SudokuBank||[]).map(v=>v.id));

  const unknown=backlog.items
    .filter(x=>x.gameId!=='*'&&!ids.has(x.gameId))
    .map(x=>x.gameId);

  assert.deepEqual(unknown,[]);
});
