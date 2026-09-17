import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const runtimeSource=fs.readFileSync(
  new URL('../games/ildi-feedback-runtime-hardening.js',import.meta.url),
  'utf8'
);
const librarySource=fs.readFileSync(
  new URL('../games/sudoku-library.js',import.meta.url),
  'utf8'
);
const css=fs.readFileSync(
  new URL('../assets/sudoku-mobile.css',import.meta.url),
  'utf8'
);
const i18n=fs.readFileSync(
  new URL('../assets/i18n.js',import.meta.url),
  'utf8'
);
const index=fs.readFileSync(
  new URL('../index.html',import.meta.url),
  'utf8'
);

function load(){
  const root={};
  root.globalThis=root;
  vm.runInNewContext(
    runtimeSource,
    root,
    {filename:'ildi-feedback-runtime-hardening.js'}
  );
  return root.IldiFeedbackHardening;
}

test('two-park note pruning uses the actual note state and the two-park quota',()=>{
  assert.match(
    librarySource,
    /kindIs\(v,'skyscraperparks2'\).*parkQuota=v\.data\.parksPerLine\|\|2/
  );
  assert.match(
    librarySource,
    /if\(rowParks>=parkQuota\).*notes\[r\]\[pi\]\.delete\(val\)/
  );
  assert.match(
    librarySource,
    /if\(colParks>=parkQuota\).*notes\[pi\]\[c\]\.delete\(val\)/
  );
});

test('diagonal clue spacing is deterministic and collision-safe',()=>{
  const h=load();
  assert.ok(h);
  const out=Array.from(h.spreadPositions([20,31,37,120],34,-26,626));
  assert.equal(out.length,4);
  for(let i=1;i<out.length;i++){
    assert.ok(out[i]-out[i-1]>=34);
  }
  assert.deepEqual(
    Array.from(h.spreadPositions([20,31,37,120],34,-26,626)),
    out
  );
});

test('mixed-information Hungarian copy uses neutral jelölés wording',()=>{
  assert.match(
    i18n,
    /Minden külső jelölés vagy a látható házak számát/
  );
  assert.match(
    i18n,
    /az adott jelölésnél/
  );
});

test('feedback hardening contains zoom-safe and readability rules',()=>{
  assert.match(css,/\.sudoku-board\{\s*gap:0!important/);
  assert.match(css,/ildi-no-box-grid/);
  assert.match(css,/sudoku-inside-sky-marker/);
  assert.match(css,/sudoku-diagonal-sky-marker/);
  assert.match(css,/sudoku-cell\.parity-odd::after/);
});

test('double skyscrapers is tagged for removal of decorative box dividers',()=>{
  assert.match(
    runtimeSource,
    /variant\.id==='double-skyscrapers'/
  );
});

test('dedicated feedback runtime is wired after the normal Sudoku renderer',()=>{
  const normal=index.indexOf(
    'games/quadruple-render-final-hardening.js'
  );
  const feedback=index.indexOf(
    'games/ildi-feedback-runtime-hardening.js'
  );
  const app=index.indexOf('assets/app.js');

  assert.ok(normal>=0);
  assert.ok(feedback>normal);
  assert.ok(app>feedback);
});

test('corrected final Sudoku entry still invokes solved state immediately',()=>{
  assert.match(
    librarySource,
    /if\(solved\(\)\)\{cells\.forEach\(function\(x\)\{x\.disabled=true;\}\);api\.solved\(\);\}/
  );
});

test('Quadruple renderer remains isolated from feedback hardening',()=>{
  const quad=fs.readFileSync(
    new URL('../games/quadruple-render-final-hardening.js',import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(quad,/IldiFeedbackHardening/);
  assert.doesNotMatch(quad,/MutationObserver/);
});
