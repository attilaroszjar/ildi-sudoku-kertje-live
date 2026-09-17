'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');

test('Heyawake renderer exposes clear/check controls and localized cell state semantics',()=>{
  assert.match(library,/clear-'\+v\.kind\+'-button/,'Heyawake dynamic clear control');
  assert.match(library,/check-'\+v\.kind\+'-button/,'Heyawake dynamic check control');
  assert.match(library,/shadeStateLabel/,'shared localized state labels');
  assert.match(library,/heyawake.*black|black.*heyawake/s,'Heyawake black state copy');
  assert.match(library,/heyawake.*white|white.*heyawake/s,'Heyawake white state copy');
});

test('LITS renderer exposes clear/check controls and localized cell state semantics',()=>{
  assert.match(library,/clear-'\+v\.kind\+'-button/,'LITS dynamic clear control');
  assert.match(library,/check-'\+v\.kind\+'-button/,'LITS dynamic check control');
  assert.match(library,/shadeStateLabel/,'shared localized state labels');
});

test('Iteration 52 renderer keeps 44px mobile targets and immutable starter semantics',()=>{
  assert.match(library,/aria-disabled/,'starter cells are exposed as immutable');
  assert.doesNotMatch(css,/\.iteration52-cell\{min-width:(?:4[0-3]|[0-3]?\d)px;min-height:(?:4[0-3]|[0-3]?\d)px/,'Iteration 52 mobile cells stay at least 44px');
});
