'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');

function masyuSource(){
  const start=lib.indexOf('function mountMasyu('),end=lib.indexOf('function mountNonogram(',start);
  assert.ok(start>=0&&end>start,'mountMasyu source must exist');
  return lib.slice(start,end);
}

test('Masyu exposes black and white circle clues to assistive technology',()=>{
  const src=masyuSource();
  assert.doesNotMatch(src,/masyu-node[^\n]*'aria-hidden':'true'/,'Masyu clue circles must not be hidden from assistive technology');
  assert.match(src,/masyuClueLabel/,'Masyu must provide localized clue labels');
});

test('Masyu clear keeps the visible move counter synchronized',()=>{
  const src=masyuSource();
  const clear=src.match(/clear-masyu-button[\s\S]*?onclick:function\(\)\{([\s\S]*?)\}\}\)\)/);
  assert.ok(clear,'Masyu clear control must exist');
  assert.match(clear[1],/api\.setCounter\(/,'clearing marks must refresh the visible move counter');
});

test('Masyu language refresh updates board and clue accessibility in place',()=>{
  const src=masyuSource();
  const refresh=src.slice(src.indexOf('refreshLanguage:function()'));
  assert.match(refresh,/board\.setAttribute\('aria-label'/,'language refresh must update the board ARIA label');
  assert.match(refresh,/render\(\)/,'language refresh must rerender localized edge/clue semantics');
});

test('Masyu keeps 44px mobile edge interaction lanes',()=>{
  assert.match(css,/\.masyu-edge\.horizontal\{height:44px\}/);
  assert.match(css,/\.masyu-edge\.vertical\{width:44px\}/);
});
