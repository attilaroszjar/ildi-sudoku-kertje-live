'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');

test('global UI removes redundant objective and generic tip sections',()=>{
  assert.match(app,/function pruneRedundantInfo\(\)/);
  assert.match(app,/byId\('game-objective'\)/);
  assert.match(app,/document\.querySelector\('\.tip-card'\)/);
  assert.match(app,/\.remove\(\)/);
  assert.doesNotMatch(app,/refs\['game-objective'\]\.textContent/);
  assert.doesNotMatch(app,/tipText:/);
});

test('inline variant rule is removed so the inspector remains the single rule surface',()=>{
  assert.match(app,/function pruneInlineVariantRule\(\)/);
  assert.match(app,/querySelector\('\.sudoku-variant-rule'\)/);
  assert.match(app,/state\.instance=state\.active\.mount\(gameApi\(\)\);pruneInlineVariantRule\(\)/);
  assert.match(app,/refs\['game-rules'\]\.replaceChildren/);
});
