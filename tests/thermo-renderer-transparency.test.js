'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const mobileCss=fs.readFileSync(path.join(root,'assets/sudoku-mobile.css'),'utf8');
const baseCss=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

function numberFor(selector,property){
  const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(escaped+'\\s*\\{[^}]*'+property+'\\s*:\\s*([0-9.]+)','m');
  const match=mobileCss.match(re);
  assert.ok(match,`${selector} must define ${property}`);
  return Number(match[1]);
}

test('Thermo and Slow Thermo overlays are explicitly translucent',()=>{
  assert.match(mobileCss,/\.thermo-line,\.slowthermo-line\{stroke-opacity:\.32\}/);
  assert.match(mobileCss,/\.thermo-line-bulb,\.slowthermo-line-bulb\{fill-opacity:\.16;stroke-opacity:\.42\}/);
  assert.ok(numberFor('.thermo-line,.slowthermo-line','stroke-opacity')<0.5);
  assert.ok(numberFor('.thermo-line-bulb,.slowthermo-line-bulb','fill-opacity')<0.25);
});

test('renderer keeps thermometer graphics in the SVG overlay, not on digit cells',()=>{
  assert.match(library,/d\.thermos/);
  assert.match(library,/svgLine\(overlay,line,'thermo-line',true\)/);
  assert.match(baseCss,/\.sudoku-overlay\{[^}]*z-index:4[^}]*pointer-events:none/);
  assert.doesNotMatch(baseCss+mobileCss,/\.sudoku-cell[^}]*opacity\s*:/);
});
