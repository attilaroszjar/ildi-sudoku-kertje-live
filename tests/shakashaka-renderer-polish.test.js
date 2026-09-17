'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

test('Shakashaka exposes clear and check controls',()=>{
  assert.match(library,/shakashaka-tools/,'Shakashaka tool group');
  assert.match(library,/clear-shakashaka-button/,'Shakashaka clear control');
  assert.match(library,/check-shakashaka-button/,'Shakashaka check control');
});

test('Shakashaka keeps localized orientation state semantics',()=>{
  assert.match(library,/function orientationLabel/);
  assert.match(library,/Háromszögkert mező|Shakashaka cell/);
  assert.match(library,/aria-pressed/);
});

test('Shakashaka language refresh rerenders cell accessibility state in place',()=>{
  assert.match(library,/refreshLanguage:refresh/);
  assert.match(library,/function refresh\(\)\{\s*render\(\);/);
});
