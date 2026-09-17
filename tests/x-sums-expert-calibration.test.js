'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
function context(){
  const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank'))){
    vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  }
  vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx,{filename:'games/sudoku-generator.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'games/x-sums-runtime-hardening.js'),'utf8'),ctx,{filename:'games/x-sums-runtime-hardening.js'});
  return ctx;
}

const ctx=context();
const v=ctx.SudokuBank.find(x=>x.id==='x-sums');
assert.ok(v,'canonical X-Sums Sudoku must exist');

test('X-Sums expert calibration enforces measured score floor while preserving exact contract',()=>{
  const seeds=[13,29,43,59,71,83,101,127,149,173,197,239];
  for(const seed of seeds){
    const a=ctx.SudokuGenerator.make(v,seed,'expert');
    const b=ctx.SudokuGenerator.make(v,seed,'expert');
    assert.deepEqual(a.puzzle,b.puzzle,`seed ${seed} must replay exactly`);
    assert.deepEqual(a.solution,b.solution,`seed ${seed} solution must replay exactly`);
    assert.deepEqual(a.data,b.data,`seed ${seed} clue data must replay exactly`);
    assert.equal(a.generation.unique,true);
    assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.seed,seed>>>0);
    assert.ok(Number.isInteger(a.generation.candidateSeed));
    assert.ok(a.generation.difficultyScore>=80,`seed ${seed} expert score ${a.generation.difficultyScore} < 80`);
    assert.equal(a.generation.difficultyCalibration.metric,'variant-search-score');
    assert.equal(a.generation.difficultyCalibration.minimum,80);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'X-Sums rule must remain essential');
  }
});

test('X-Sums calibration wrapper leaves gentle and focused generation unchanged',()=>{
  for(const difficulty of ['gentle','focused']){
    const out=ctx.SudokuGenerator.make(v,0x5A17,difficulty);
    assert.equal(out.generation.unique,true);
    assert.equal(out.generation.variantEssential,true);
    assert.equal(out.generation.difficultyCalibration,undefined);
  }
});

test('production index wires X-Sums calibration before Sudoku library',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const hard=html.indexOf('games/x-sums-runtime-hardening.js');
  const lib=html.indexOf('games/sudoku-library.js');
  assert.ok(hard>=0,'X-Sums runtime hardening must be loaded by index.html');
  assert.ok(lib>hard,'X-Sums runtime hardening must load before sudoku-library.js');
});
