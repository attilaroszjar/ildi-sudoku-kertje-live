'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
const bank=fs.readFileSync(path.join(root,'games/sudoku-bank-iteration30.js'),'utf8');
function source(){const start=lib.indexOf('function mountHitori('),end=lib.indexOf('function mountFutoshiki(',start);assert.ok(start>=0&&end>start,'mountHitori source must exist');return lib.slice(start,end);}

test('Hitori language refresh updates board accessibility in place',()=>{
  const src=source();
  const direct=/refreshLanguage:function\(\)[\s\S]*?board\.setAttribute\('aria-label'/.test(src);
  const delegated=/sudoku:languagechange/.test(bank)&&/hitori-board/.test(bank)&&/aria-label/.test(bank);
  assert.ok(direct||delegated,'language refresh must update Hitori board ARIA label');
});

test('Hitori exposes localized three-state cell semantics',()=>{
  const src=source();
  assert.match(src,/fekete|black/,'black state must be exposed');
  assert.match(src,/biztos fehér|confirmed white/,'confirmed-white state must be exposed');
  assert.match(src,/jelöletlen|unmarked/,'unmarked state must be exposed');
  assert.match(src,/aria-pressed/,'cell state must have pressed semantics');
});

test('Hitori keyboard interaction covers navigation and all mark states',()=>{
  const src=source();
  for(const token of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Backspace'])assert.ok(src.includes(token),token+' keyboard handling must remain present');
  assert.match(src,/e\.key==='b'\|\|e\.key==='B'/,'black keyboard shortcut must remain present');
  assert.match(src,/e\.key==='w'\|\|e\.key==='W'/,'confirmed-white keyboard shortcut must remain present');
});

test('Hitori mobile layout retains at least 44px cell targets at the supported 320px viewport',()=>{
  assert.match(css,/body\s*\{[^}]*min-width:\s*320px/,'supported minimum viewport must remain 320px');
  assert.match(css,/@media\(max-width:650px\)\{\.hitori-board\{width:min\(92vw,500px\);padding:5px;gap:1px;/,'Hitori mobile geometry must remain explicit');
  const viewport=320,board=.92*viewport,padding=10,borders=6,gaps=5,cell=(board-padding-borders-gaps)/6;
  assert.ok(cell>=44,'minimum Hitori cell target is '+cell.toFixed(2)+'px');
});
