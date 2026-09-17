'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
function source(){const start=lib.indexOf('function mountAkari('),end=lib.indexOf('function mountSlitherlink(',start);assert.ok(start>=0&&end>start,'mountAkari source must exist');return lib.slice(start,end);}
test('Akari clear keeps the visible move counter synchronized',()=>{const src=source(),clear=src.match(/clear-akari-button[\s\S]*?onclick:function\(\)\{([\s\S]*?)\}\}\)\)/);assert.ok(clear,'Akari clear control must exist');assert.match(clear[1],/api\.setCounter\(/,'clearing Akari marks must refresh the visible move counter');});
test('Akari language refresh updates board accessibility in place',()=>{const src=source(),refresh=src.slice(src.indexOf('refreshLanguage:function()'));assert.match(refresh,/board\.setAttribute\('aria-label'/,'language refresh must update Akari board ARIA label');assert.match(refresh,/render\(\)/,'language refresh must rerender localized cell/wall semantics');});
test('Akari retains localized wall/cell semantics and mobile-sized cells',()=>{const src=source();assert.match(src,/Wall, required bulbs/);assert.match(src,/Fal, előírt lámpák/);assert.match(src,/aria-invalid/);assert.match(css,/\.akari-cell[^}]*min-height:44px|\.akari-cell[^}]*height:44px|\.akari-cell[^}]*min-width:44px/,'Akari cells must retain at least one explicit 44px mobile interaction dimension');});
