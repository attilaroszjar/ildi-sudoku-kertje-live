'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const mobileCss=fs.readFileSync(path.join(root,'assets/sudoku-mobile.css'),'utf8');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

test('Odd/even cell clues render as large centered outline markers',()=>{
  assert.match(mobileCss,/\.sudoku-cell\.parity-odd::after,\.sudoku-cell\.parity-even::after\{[^}]*left:50%;[^}]*top:50%;[^}]*width:clamp\(16px,3vw,22px\);[^}]*height:clamp\(16px,3vw,22px\);[^}]*border:2px solid var\(--muted\)/s);
  assert.match(mobileCss,/\.sudoku-cell\.parity-odd::after\{border-radius:50%\}/);
  assert.match(mobileCss,/\.sudoku-cell\.parity-even::after\{border-radius:2px\}/);
});

test('Parity renderer still assigns odd/even marker classes from puzzle data',()=>{
  assert.match(library,/kindIs\(v,'parity'\).*parity-odd.*parity-even/);
});

test('Boards with parity clues show an explicit odd/even symbol legend',()=>{
  assert.match(mobileCss,/\.sudoku-board-host:has\(\.sudoku-cell\.parity-odd,\.sudoku-cell\.parity-even\)::after\{/);
  assert.match(mobileCss,/content:'○ = páratlan \/ odd   ·   □ = páros \/ even'/);
});
