import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const core=fs.readFileSync(new URL('../assets/core.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/sukaku-legibility.css',import.meta.url),'utf8');
const imports=fs.readFileSync(new URL('../assets/p3-size-control.css',import.meta.url),'utf8');

test('Sukaku starting candidates use a fixed 3x3 pencil-mark grid',()=>{
  assert.match(core,/for \(var value = 1; value <= 9; value \+= 1\)/);
  assert.match(core,/sukaku-start-candidates/);
  assert.match(core,/sukaku-start-candidate/);
  assert.match(css,/grid-template-columns:repeat\(3,1fr\)/);
  assert.match(css,/grid-template-rows:repeat\(3,1fr\)/);
  assert.match(css,/font:650 clamp\(9px,1\.15vw,11px\)/);
});

test('legacy tiny inline Sukaku pseudo text is suppressed and styling is loaded',()=>{
  assert.match(css,/\.sukaku-cell:empty::before\{content:none!important\}/);
  assert.match(imports,/@import url\("\.\/sukaku-legibility\.css"\);/);
});

test('Sukaku candidate hydrator is scoped to Sukaku cells and coalesces mutation work',()=>{
  assert.match(core,/\.sukaku-cell\[data-candidates\]/);
  assert.match(core,/if \(scheduled\) return;/);
  assert.match(core,/Promise\.resolve\(\)\.then/);
  assert.match(core,/observer\.observe\(stage, \{ childList: true, subtree: true \}\)/);
});
