'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');

test('Killer solver prunes impossible partial cage sums with distinct remaining digits',()=>{
  assert.match(source,/function killerCageRemainingBounds\(n,used,count\)|function killerCageCombinationMasks\(n,size,sum\)/);
  assert.match(source,/need<bounds\.min\|\|need>bounds\.max|\(combos\[ci\]&usedMask\)===usedMask/);
});

test('Killer partial cage pruning preserves non-repetition',()=>{
  assert.match(source,/usedMask/);
  assert.match(source,/if\(usedMask&bit\)return false|if\(usedMask & bit\)return false|if\(usedMask\s*&\s*bit\)return false/);
});
