'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

test('Ripple Effect renderer exposes direct number, clear and check controls',()=>{
  assert.match(library,/rippleeffect-tools/,'Ripple Effect tool group');
  assert.match(library,/clear-rippleeffect-button/,'Ripple Effect clear control');
  assert.match(library,/check-rippleeffect-button/,'Ripple Effect check control');
  assert.match(library,/rippleeffect-number-pad/,'Ripple Effect direct number pad');
});

test('Ripple Effect supports keyboard entry and immutable givens',()=>{
  assert.match(library,/tabindex:v\.kind==='rippleeffect'\?'0':null/,'keyboard-focusable Ripple board');
  assert.match(library,/board\.addEventListener\('keydown'/,'Ripple keyboard handler');
  assert.match(library,/if\(given\).*aria-disabled|aria-disabled.*given/,'given accessibility semantics');
});

test('Ripple Effect ARIA describes current value as well as room size and refreshes with language',()=>{
  assert.match(library,/rippleEffectStateLabel/,'localized Ripple state label helper');
  assert.match(library,/room size/,'English room-size semantics');
  assert.match(library,/szobaméret/,'Hungarian room-size semantics');
  assert.match(library,/refreshLanguage:function\(\)\{language\(\);render\(\);\}/,'in-place language refresh');
});
