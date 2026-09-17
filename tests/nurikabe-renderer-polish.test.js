'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
function source(){const start=lib.indexOf('function mountNurikabe('),end=lib.indexOf('function mountAkari(',start);assert.ok(start>=0&&end>start,'mountNurikabe source must exist');return lib.slice(start,end);}

test('Nurikabe clear keeps the visible move counter synchronized',()=>{const src=source(),clear=src.match(/clear-nurikabe-button[\s\S]*?onclick:function\(\)\{([\s\S]*?)\}\}\)\)/);assert.ok(clear,'Nurikabe clear control must exist');assert.match(clear[1],/api\.setCounter\(/,'clearing Nurikabe marks must refresh the visible move counter');});

test('Nurikabe language refresh updates board accessibility in place',()=>{const src=source(),refresh=src.slice(src.indexOf('refreshLanguage:function()'));assert.match(refresh,/board\.setAttribute\('aria-label'/,'language refresh must update Nurikabe board ARIA label');assert.match(refresh,/render\(\)/,'language refresh must rerender localized cell semantics');});

test('Nurikabe exposes localized per-cell state semantics',()=>{const src=source();assert.match(src,/tenger|sea/,'Nurikabe ARIA must describe sea state');assert.match(src,/biztos fehér|confirmed white/,'Nurikabe ARIA must describe confirmed-white state');assert.match(src,/üres|empty/,'Nurikabe ARIA must describe empty state');});

test('Nurikabe keeps 44px mobile cell interaction targets',()=>{assert.match(css,/\.nurikabe-cell[^}]*min-height:44px|\.nurikabe-cell[^}]*height:44px|\.nurikabe-cell[^}]*min-width:44px/,'Nurikabe cells must retain at least one explicit 44px mobile interaction dimension');});
