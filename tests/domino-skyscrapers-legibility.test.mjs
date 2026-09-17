import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../assets/domino-skyscraper.css',import.meta.url),'utf8');
const imports=fs.readFileSync(new URL('../assets/p3-size-control.css',import.meta.url),'utf8');
const library=fs.readFileSync(new URL('../games/sudoku-library.js',import.meta.url),'utf8');

test('Domino Skyscrapers renderer marks both cells of each domino region',()=>{
  assert.match(library,/kindIs\(v,'dominoskyscrapers'\)[\s\S]*classList\.add\('domino-cell'\)/);
  assert.match(library,/classList\.add\('domino-top'\)/);
  assert.match(library,/classList\.add\('domino-bottom'\)/);
  assert.match(library,/classList\.add\('domino-left'\)/);
  assert.match(library,/classList\.add\('domino-right'\)/);
});

test('Domino cells use a strong cool palette distinct from ordinary Garden filled cells',()=>{
  assert.match(css,/--domino-sky-fill:#bfe7ec/i);
  assert.match(css,/\.sudoku-cell\.domino-cell\s*\{[\s\S]*background:[^;]+!important/);
  assert.match(css,/\.sudoku-cell\.domino-cell\.fixed\s*\{[\s\S]*color:var\(--domino-sky-ink\)!important/);
});

test('Domino perimeter survives shared Sudoku important grid borders',()=>{
  for(const side of ['top','bottom','left','right']){
    assert.match(css,new RegExp(`\\.sudoku-cell\\.domino-${side}\\{border-${side}:3px solid var\\(--domino-sky-border\\)!important\\}`));
  }
});

test('Domino styling remains in the standalone CSS import chain',()=>{
  assert.match(imports,/@import url\("\.\/domino-skyscraper\.css"\);/);
});
