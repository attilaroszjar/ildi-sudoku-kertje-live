'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

test('Star Battle exposes clear and check controls',()=>{
  assert.match(library,/type==='aquarium'\|\|type==='starbattle'/,'Star Battle tool branch');
  assert.match(library,/className:'sudoku-tools '\+type\+'-tools'/,'typed Star Battle tool group');
  assert.match(library,/className:'tool-button clear-'\+type\+'-button'/,'typed Star Battle clear control');
  assert.match(library,/className:'tool-button check-button check-'\+type\+'-button'/,'typed Star Battle check control');
});

test('Star Battle renderer exposes localized current cell state semantics',()=>{
  assert.match(library,/starBattleStateLabel/,'localized Star Battle cell state helper');
  assert.match(library,/csillag|star/,'star state semantics');
  assert.match(library,/üres|empty/,'empty state semantics');
  assert.match(library,/aria-pressed/,'pressed state semantics');
});

test('Star Battle language refresh rerenders accessibility state in place',()=>{
  assert.match(library,/refreshLanguage:function\(\)\{language\(\);render\(\);\}/,'in-place Star Battle language refresh');
});
