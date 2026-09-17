'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
for(const file of ['games/sudoku-bank.js','games/sudoku-bank-iteration52.js','games/sudoku-generator.js'])(0,eval)(fs.readFileSync(path.join(root,file),'utf8'));
const generator=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank.find(v=>v.id==='lits');
const seed=100001;

test('LITS Expert exposes no prefilled solution-state cells',()=>{
  const made=generator.make(variant,seed,'expert');
  assert.deepEqual(made.puzzle.starters,[]);
  assert.equal(made.generation.clues,0);
  assert.equal(made.generation.startingAnswerCount,0);
});

test('LITS complete region partition is explicitly non-carvable',()=>{
  const meta=generator.make(variant,seed,'expert').generation;
  assert.equal(meta.policy,'complete-region-partition-topology');
  assert.equal(meta.removableAtomPolicy,'none-region-partition-is-puzzle-definition');
  assert.equal(meta.localIrreducibilityApplicability,'not-applicable-complete-region-definition');
  assert.equal(meta.playabilityMetric,'solution-state-exposure-and-region-choice-complexity');
});

test('LITS canonical Expert puzzle is exact unique',()=>{
  const made=generator.make(variant,seed,'expert'),stats={};
  assert.equal(generator.countLitsSolutions(made.puzzle,2,stats),1);
  assert.equal(stats.solutions,1);
  assert.equal(made.generation.unique,true);
});

test('LITS Expert region topology is a complete six-region definition',()=>{
  const made=generator.make(variant,seed,'expert'),flat=made.puzzle.regions.flat();
  assert.equal(flat.length,36);
  assert.equal(new Set(flat).size,6);
  for(const id of new Set(flat))assert.ok(flat.filter(x=>x===id).length>=4);
});

test('LITS Gentle and Focused starter behavior remains stable',()=>{
  assert.equal(generator.make(variant,seed,'gentle').puzzle.starters.length,4);
  assert.equal(generator.make(variant,seed,'focused').puzzle.starters.length,2);
});

test('LITS generation stays deterministic for the canonical seed',()=>{
  const a=generator.make(variant,seed,'expert'),b=generator.make(variant,seed,'expert');
  assert.deepEqual(a,b);
});
