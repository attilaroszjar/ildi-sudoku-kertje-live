'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
function source(){const start=lib.indexOf('function mountFutoshiki('),end=lib.indexOf('function mountFillomino(',start);assert.ok(start>=0&&end>start,'mountFutoshiki source must exist');return lib.slice(start,end);}

test('Futoshiki clear keeps the visible move counter synchronized',()=>{
  const src=source(),setCell=src.match(/function setCell\([^)]*\)\{([\s\S]*?)\}/);
  assert.ok(setCell,'Futoshiki setCell must exist');
  assert.match(setCell[1],/api\.setCounter\(/,'clearing/editing Futoshiki must refresh the visible move counter');
});

test('Futoshiki language refresh updates board accessibility in place',()=>{
  const src=source(),refresh=src.slice(src.indexOf('refreshLanguage:function()'));
  assert.match(refresh,/board\.setAttribute\('aria-label'/,'language refresh must update Futoshiki board ARIA label');
  assert.match(refresh,/render\(\)/,'language refresh must rerender localized cell semantics');
});

test('Futoshiki editable cells expose localized empty state semantics',()=>{
  const src=source(),render=src.slice(src.indexOf('function idx('),src.indexOf('function solvedGrid('));
  assert.match(render,/üres|empty/,'empty editable cells must expose localized empty state');
  assert.match(render,/adott|given/,'given cells must retain localized given semantics');
});

test('Futoshiki size-aware keyboard entry and clearing remain available',()=>{
  const src=source();
  assert.match(src,/\^\[1-9\]\$/,'keyboard digit parsing must cover the supported digit keys');
  assert.match(src,/value>=1&&value<=n/,'keyboard entry must be bounded by the generated board size');
  assert.match(src,/Backspace.*Delete.*0/,'keyboard clearing must remain available');
});

test('Futoshiki mobile grid retains at least 44px cell interaction targets at 320px viewport',()=>{
  const mobile=css.match(/@media\(max-width:650px\)\{\.futoshiki-shell\{width:min\(92vw,500px\)\}\.futoshiki-board\{gap:(\d+)px\}/);
  assert.ok(mobile,'Futoshiki mobile geometry must remain explicit');
  const viewport=320,width=.92*viewport,gap=+mobile[1],cell=(width-gap*5)/6;
  assert.ok(cell>=44,'minimum Futoshiki cell target is '+cell.toFixed(2)+'px');
});
