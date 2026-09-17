'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

test('Sudoku variant switch clears app-level solved lifecycle without resetting on same-id language refresh',()=>{
  const handler=app.match(/document\.addEventListener\('sudoku:variantchange',function\(e\)\{([^}]*(?:\}[^}]*)*)\}\);/);
  assert.ok(handler,'app must own sudoku:variantchange lifecycle');
  assert.match(handler[1],/state\.currentId\s*!==\s*e\.detail\.id/,'variant lifecycle reset must only run when the actual game id changes');
  assert.match(handler[1],/state\.completed\s*=\s*false/,'switching to another game must clear the app completion guard');
  assert.match(handler[1],/classList\.remove\(['"]is-solved['"]\)/,'switching to another game must clear the stale green solved border');
  assert.match(handler[1],/state\.startedAt\s*=\s*Date\.now\(\)/,'switching to another game must start a fresh statistics timer');
});

test('Sudoku library variant rendering still resets visible status to Ready',()=>{
  const start=lib.indexOf('function renderVariant(){'),end=lib.indexOf('renderVariant();',start);
  assert.ok(start>=0&&end>start,'renderVariant source must exist');
  const src=lib.slice(start,end);
  assert.match(src,/api\.setStatus\(['"]Ready['"]\)/,'newly rendered variant must reset visible status');
});
