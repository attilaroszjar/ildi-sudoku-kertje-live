'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const mobileCss=fs.readFileSync(path.join(root,'assets/sudoku-mobile.css'),'utf8');

const perimeterKinds=['sandwich','xsums','frame','runningcells','ascendingsequences','numberedrooms','nexttonine','evensandwich','rossini'];

test('All row/column outside-clue Sudoku families use board perimeter rails',()=>{
  const m=library.match(/var perimeterKinds=\[([^\]]+)\]/);
  assert.ok(m,'perimeterKinds declaration missing');
  for(const kind of perimeterKinds)assert.match(m[1],new RegExp("'"+kind+"'"),kind+' missing from perimeterKinds');
  assert.match(library,/kindIs\(v,'sandwich'\)\|\|kindIs\(v,'xsums'\)\|\|kindIs\(v,'frame'\)/);
  assert.match(library,/kindIs\(v,'rossini'\).*cl\.dir==='inc'\?'↗':'↘'/);
});

test('Little Killer clues render beside their diagonal starts instead of in the bottom strip',()=>{
  assert.match(library,/function mountLittleKillerClues\(\)/);
  assert.match(library,/className:'sudoku-littlekiller-clue'/);
  assert.match(library,/var hasLittleKillerClues=mountLittleKillerClues\(\)/);
  assert.match(library,/if\(!hasPerimeterClues&&!hasLittleKillerClues&&v\.data\.clues/);
  assert.match(mobileCss,/\.sudoku-board-shell\.has-littlekiller-clues\{[^}]*overflow:visible/);
  assert.match(mobileCss,/\.sudoku-littlekiller-clue\{[^}]*position:absolute/);
});
