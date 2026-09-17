'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
function source(){const start=lib.indexOf('function mountBridges('),end=lib.indexOf('function mountShadePuzzle(',start);assert.ok(start>=0&&end>start,'mountBridges source must exist');return lib.slice(start,end);}

test('Bridges clear keeps the visible move counter synchronized',()=>{
  const src=source(),clear=src.match(/clear-bridges-button[\s\S]*?onclick:function\(\)\{([\s\S]*?)\}\}\)\)/);
  assert.ok(clear,'Bridges clear control must exist');
  assert.match(clear[1],/api\.setCounter\(/,'clearing bridges must refresh the visible move counter');
});

test('Bridges language refresh updates board accessibility in place',()=>{
  const src=source(),refresh=src.slice(src.indexOf('refreshLanguage:function()'));
  assert.match(refresh,/board\.setAttribute\('aria-label'/,'language refresh must update Bridges board ARIA label');
  assert.match(refresh,/render\(\)/,'language refresh must rerender localized island semantics');
});

test('Bridges islands expose localized progress semantics',()=>{
  const src=source();
  assert.match(src,/Sziget|Island/,'island accessibility must remain localized');
  assert.match(src,/incidentCount\(idx\).*islands\[idx\]\.clue/,'island accessibility must expose current bridge progress');
});

test('Bridges mobile islands retain at least 44px interaction targets',()=>{
  const rule=css.match(/\.bridge-island\{([^}]*)\}/);
  assert.ok(rule,'bridge-island CSS rule must exist');
  const body=rule[1];
  const explicit44=/min-width:\s*44px|min-height:\s*44px|width:\s*(?:clamp\(44px|44px)|height:\s*(?:clamp\(44px|44px)/.test(body);
  assert.ok(explicit44,'bridge islands must guarantee at least one explicit 44px interaction dimension');
});
