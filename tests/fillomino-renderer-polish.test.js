'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
function source(){const start=lib.indexOf('function mountFillomino('),end=lib.indexOf('function mountBridges(',start);assert.ok(start>=0&&end>start,'mountFillomino source must exist');return lib.slice(start,end);}

test('Fillomino clear and check controls remain wired',()=>{
  const src=source();
  assert.match(src,/clear-fillomino-button[\s\S]*?setCell\(selected\[0\],selected\[1\],0\)/,'Fillomino clear control must clear the selected cell through the canonical setter');
  assert.match(src,/check-button[\s\S]*?v\.solution/,'Fillomino check control must validate against the generated solution');
  assert.match(src,/function setCell[\s\S]*?api\.setCounter\(/,'Fillomino edits must keep the visible move counter synchronized');
});

test('Fillomino language refresh updates board accessibility in place',()=>{
  const src=source(),refresh=src.slice(src.indexOf('refreshLanguage:function()'));
  assert.match(refresh,/board\.setAttribute\('aria-label'/,'language refresh must update Fillomino board ARIA label');
  assert.match(refresh,/render\(\)/,'language refresh must rerender localized cell semantics');
});

test('Fillomino exposes localized empty and given cell semantics',()=>{
  const src=source();
  assert.match(src,/üres|empty/,'empty Fillomino cells must be explicitly exposed to assistive technology');
  assert.match(src,/adott|given/,'given Fillomino cells must remain explicitly identified');
});

test('Fillomino mobile cells remain at least 44px at the supported 320px viewport',()=>{
  assert.match(css,/body\s*\{[^}]*min-width:\s*320px/,'supported minimum viewport must remain 320px');
  assert.match(css,/@media\(max-width:650px\)\{\.fillomino-board\{width:min\(92vw,500px\)/,'Fillomino mobile board geometry must remain explicit');
  const viewport=320,board=.92*viewport,borders=6,cell=(board-borders)/6;
  assert.ok(cell>=44,'minimum Fillomino cell target is '+cell.toFixed(2)+'px');
});

test('Fillomino mobile number pad retains 44px interaction targets',()=>{
  const mobile=css.match(/@media\(max-width:650px\)\{\.fillomino-board[^}]*\}\.fillomino-number-pad \.tool-button\{([^}]*)\}\}/);
  assert.ok(mobile,'Fillomino mobile number-pad rule must exist');
  assert.match(mobile[1],/min-width:\s*44px|min-height:\s*44px/,'mobile Fillomino number-pad buttons must guarantee at least one explicit 44px interaction dimension');
});
