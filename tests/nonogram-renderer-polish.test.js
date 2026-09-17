'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
function source(){const start=lib.indexOf('function mountNonogram('),end=lib.indexOf('function mountNurikabe(',start);assert.ok(start>=0&&end>start,'mountNonogram source must exist');return lib.slice(start,end);}

test('Nonogram clear keeps the visible move counter synchronized',()=>{
  const src=source(),clear=src.match(/clear-nonogram-button[\s\S]*?onclick:function\(\)\{([\s\S]*?)\}\}\)\)/);
  assert.ok(clear,'Nonogram clear control must exist');
  assert.match(clear[1],/api\.setCounter\(/,'clearing Nonogram marks must refresh the visible move counter');
});

test('Nonogram language refresh updates board accessibility in place',()=>{
  const src=source(),refresh=src.slice(src.indexOf('refreshLanguage:function()'));
  assert.match(refresh,/board\.setAttribute\('aria-label'/,'language refresh must update Nonogram board ARIA label');
  assert.match(refresh,/render\(\)/,'language refresh must rerender localized cell semantics');
});

test('Nonogram cells expose localized three-state semantics',()=>{
  const src=source();
  assert.match(src,/kitöltött|filled/,'filled state must remain localized');
  assert.match(src,/empty/,'empty state must remain exposed');
  assert.match(src,/cross|X/,'cross state must remain exposed');
});

test('Nonogram cells retain native keyboard activation',()=>{
  const src=source();
  assert.match(src,/LR\.el\('button'/,'Nonogram cells must remain native buttons for Enter/Space activation');
});

test('Nonogram mobile board preserves 44px cell targets without shrinking the 8x8 grid',()=>{
  const mobile=css.match(/@media\(max-width:650px\)\{([^}]|\}(?!\s*\/\*))*?\.nonogram-shell[\s\S]*?\}/);
  assert.ok(mobile,'Nonogram mobile layout must exist');
  const nono=css.slice(css.indexOf('/* Iteration 37: Nonogram / Picross */'),css.indexOf('/* Iteration 38: Masyu */'));
  assert.match(nono,/overflow-x:\s*auto|overflow:\s*auto/,'small viewports must allow horizontal scrolling instead of shrinking touch targets');
  assert.match(nono,/\.nonogram-cell\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/,'Nonogram cells must guarantee 44px interaction dimensions');
});
