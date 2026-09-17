'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');

test('Killer solver uses exact distinct-digit cage combination masks',()=>{
  assert.match(src,/function killerCageCombinationMasks\(n,size,sum\)/);
  assert.match(src,/mask\|\(1<<\(d-1\)\)/);
  assert.match(src,/\(combos\[ci\]&usedMask\)===usedMask/);
});

test('Killer solver indexes cages by touched cell',()=>{
  assert.match(src,/killerCageIndexCache/);
  assert.match(src,/function killerCageIndex\(variant,n\)/);
  assert.match(src,/killerCageIndex\(variant,n\)\[r\]\[c\]/);
});
