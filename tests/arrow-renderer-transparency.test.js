'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const mobileCss=fs.readFileSync(path.join(root,'assets/sudoku-mobile.css'),'utf8');
const baseCss=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

test('Arrow bulbs are transparent outlines so cell digits remain visible',()=>{
  const sharedRule=mobileCss.match(/[^{}]*\.arrow-line-bulb[^{}]*\{([^}]*)\}/);
  assert.ok(sharedRule,'shared arrow bulb rule');
  assert.match(sharedRule[1],/fill:none/);
  assert.match(sharedRule[1],/fill-opacity:0/);
  assert.match(mobileCss,/\.sudoku-overlay \.arrow-line-bulb\{[^}]*stroke:/);
  assert.match(baseCss,/\.arrow-line-bulb\{[^}]*stroke:/);
});

test('Arrow renderer keeps bulb graphics in the SVG overlay',()=>{
  assert.match(library,/d\.arrows/);
  assert.match(library,/svgLine\(overlay,\[a\.circle\]\.concat\(a\.path\),'arrow-line',true\)/);
  assert.match(baseCss,/\.sudoku-overlay\{[^}]*pointer-events:none/);
  assert.doesNotMatch(baseCss+mobileCss,/\.sudoku-cell[^}]*opacity\s*:/);
});
