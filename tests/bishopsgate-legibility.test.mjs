import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../assets/bishopsgate-legibility.css',import.meta.url),'utf8');
const imports=fs.readFileSync(new URL('../assets/p3-size-control.css',import.meta.url),'utf8');

test('Bishopsgate marked cells use a dedicated cool background distinct from garden entry colours',()=>{
  assert.match(css,/\.sudoku-cell\.bishopsgate-cell\s*\{/);
  assert.match(css,/#d9e7ff/i);
  assert.match(css,/background:[^;]+!important/);
});

test('Bishopsgate fixed marked cells keep the dedicated treatment instead of the generic fixed-cell palette',()=>{
  assert.match(css,/\.sudoku-cell\.bishopsgate-cell\.fixed\s*\{/);
  assert.match(css,/color:#3f5578!important/i);
});

test('Bishopsgate legibility override is included in standalone CSS import chain',()=>{
  assert.match(imports,/@import url\("\.\/bishopsgate-legibility\.css"\);/);
});
