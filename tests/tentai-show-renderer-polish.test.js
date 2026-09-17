'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

test('Tentai Show exposes clear and check controls',()=>{
  assert.match(library,/galaxies-tools/,'Tentai Show tool group');
  assert.match(library,/clear-galaxies-button/,'Tentai Show clear control');
  assert.match(library,/check-galaxies-button/,'Tentai Show check control');
});

test('Tentai Show boundary ARIA includes localized current state',()=>{
  assert.match(library,/galaxyBoundaryStateLabel/,'localized Tentai boundary state helper');
  assert.match(library,/határ|boundary/,'boundary semantics');
  assert.match(library,/bejelölve|marked/,'marked boundary state semantics');
  assert.match(library,/nincs bejelölve|not marked/,'unmarked boundary state semantics');
});

test('Tentai Show language refresh rerenders boundary accessibility state in place',()=>{
  assert.match(library,/refreshLanguage:function\(\)\{language\(\);render\(\);\}/,'in-place Tentai language refresh');
});
