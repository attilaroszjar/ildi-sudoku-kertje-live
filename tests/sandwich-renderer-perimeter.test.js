'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

test('Sandwich Sudoku uses board perimeter clues instead of the bottom clue strip',()=>{
  assert.match(library,/var perimeterKinds=\[[^\]]*'sandwich'[^\]]*\]/);
  assert.match(library,/function perimeterClueText\(cl\)\{\s*if\(kindIs\(v,'sandwich'\)\|\|kindIs\(v,'xsums'\)\|\|kindIs\(v,'frame'\)\)return String\(cl\.sum\);/);
  assert.match(library,/var side=cl\.side\|\|\(cl\.axis==='row'\?'left':'top'\)/);
});
