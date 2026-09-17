'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

test('Yajilin exposes clear and check controls',()=>{
  assert.match(library,/yajilin-tools/,'Yajilin tool group');
  assert.match(library,/yajilin-clear/,'Yajilin clear control');
  assert.match(library,/yajilin-check/,'Yajilin check control');
});

test('Yajilin loop-edge ARIA exposes localized three-state semantics',()=>{
  assert.match(library,/yajilinEdgeStateLabel/,'localized Yajilin edge state helper');
  assert.match(library,/vonal|line/,'line edge state semantics');
  assert.match(library,/kereszt|cross/,'cross edge state semantics');
  assert.match(library,/üres|empty/,'empty edge state semantics');
});

test('Yajilin mode buttons expose pressed state and language refresh rerenders state',()=>{
  assert.match(library,/loopBtn\.setAttribute\('aria-pressed'/,'loop mode pressed semantics');
  assert.match(library,/blackBtn\.setAttribute\('aria-pressed'/,'black mode pressed semantics');
  assert.match(library,/refreshLanguage:function\(\)\{render\(\);\}/,'in-place Yajilin language/state refresh');
});
