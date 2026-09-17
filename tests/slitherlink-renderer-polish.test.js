'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
function source(){const start=lib.indexOf('function mountSlitherlink('),end=lib.indexOf('function mountHitori(',start);assert.ok(start>=0&&end>start,'mountSlitherlink source must exist');return lib.slice(start,end);}
test('Slitherlink exposes numbered clues with localized positional accessibility',()=>{const src=source();assert.match(src,/slitherClueLabel/,'Slitherlink must provide localized clue labels');assert.match(src,/clue\.setAttribute\('aria-label'/,'numbered clues must expose an accessible label');});
test('Slitherlink language refresh updates board accessibility in place',()=>{const src=source(),refresh=src.slice(src.indexOf('refreshLanguage:function()'));assert.match(refresh,/board\.setAttribute\('aria-label'/,'language refresh must update board ARIA label');assert.match(refresh,/render\(\)/,'language refresh must rerender localized edge semantics');});
test('Slitherlink keeps synchronized Clear and 44px mobile edge interaction lanes',()=>{const src=source(),clear=src.match(/clear-slither-button[\s\S]*?onclick:function\(\)\{([\s\S]*?)\}\}\)\)/);assert.ok(clear);assert.match(clear[1],/api\.setCounter\(/);assert.match(css,/\.slither-edge\.horizontal\{height:44px\}/);assert.match(css,/\.slither-edge\.vertical\{width:44px\}/);});
