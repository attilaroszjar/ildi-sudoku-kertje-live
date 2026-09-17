'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');

function load(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
  const wanted=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||x==='games/sudoku-generator.js'||x==='games/p3-galaxies-complete.js');
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted){vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});}
  return ctx;
}

function validate(g,G,n){
  assert.equal(g.puzzle.size,n);
  assert.equal(g.solution.length,n);
  assert.ok(g.solution.every(row=>row.length===n));
  assert.equal(g.generation.boardSize,n);
  assert.equal(g.generation.unique,true);
  assert.equal(g.generation.variantEssential,true);
  assert.equal(g.generation.verification,'solver-verified');
  assert.equal(g.generation.generatorFamily,'galaxies-multisize-rectangular-tiling');
  assert.equal(G.countGalaxiesSolutions(g.puzzle,2,{}),1,`${n}x${n} exact uniqueness`);
  for(const c of g.puzzle.centers){assert.ok(c.r>=0&&c.r<=n);assert.ok(c.c>=0&&c.c<=n);}
}

test('Galaxies exposes solver-certified 4x4 through 8x8 sizes',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='tentai-show');
  for(const n of [4,5,6,7,8]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x74000000+n)>>>0,'focused');
    validate(g,G,n);
  }
});

test('Galaxies multi-size generation is deterministic and topology-diverse',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='tentai-show');
  variant.data.p3Size=8;
  const a=G.make(variant,0x74111111,'focused');
  const b=G.make(variant,0x74111111,'focused');
  const c=G.make(variant,0x74222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed must replay identical JSON content');
  assert.notEqual(JSON.stringify(a.puzzle.centers),JSON.stringify(c.puzzle.centers),'different seeds must change galaxy topology');
});

test('Galaxies difficulty is independent of selected board size',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='tentai-show');
  variant.data.p3Size=6;
  const gentle=G.make(variant,0x74333333,'gentle');
  const focused=G.make(variant,0x74333333,'focused');
  const expert=G.make(variant,0x74333333,'expert');
  for(const g of [gentle,focused,expert])validate(g,G,6);
  assert.ok(gentle.generation.difficultyScore<=focused.generation.difficultyScore);
  assert.ok(focused.generation.difficultyScore<=expert.generation.difficultyScore);
});

test('Galaxies 8x8 expert uses the expanded calibrated candidate search',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='tentai-show');
  variant.data.p3Size=8;
  const expert=G.make(variant,0x74444444,'expert');
  validate(expert,G,8);
  assert.equal(expert.generation.expertCalibration,'expanded-candidate-search-plus-region-complexity');
  assert.equal(expert.generation.expertCandidateTarget,32);
  assert.ok(expert.generation.candidatePool>=9,'8x8 expert must evaluate a materially broader candidate pool');
  assert.ok(Number.isFinite(expert.generation.solverDifficultyScore));
  assert.ok(Number.isFinite(expert.generation.regionGeometryScore));
});

test('Galaxies runtime consumes puzzle.size and a dedicated size selector is wired',()=>{
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  const hardening=fs.readFileSync(path.join(root,'games/p3-galaxies-complete.js'),'utf8');
  assert.ok(index.includes('games/p3-galaxies-complete.js'));
  assert.ok(library.includes('function mountGalaxies(host,v,api){\n    var n=v.puzzle.size'));
  assert.ok(hardening.includes('var supported=[4,5,6,7,8]'));
  assert.ok(hardening.includes("select.id='galaxies-size-select'"));
  assert.ok(hardening.includes('variant.data.p3Size=size'));
});
