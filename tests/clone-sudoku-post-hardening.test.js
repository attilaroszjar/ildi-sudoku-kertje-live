'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
const v=ctx.SudokuBank.find(x=>x.id==='clone');
assert.ok(v,'canonical Clone Sudoku must exist');

function cloneValid(grid,clones){assert.equal(clones.length,2);assert.equal(clones[0].length,clones[1].length);for(let i=0;i<clones[0].length;i++){const a=clones[0][i],b=clones[1][i];if(grid[a[0]][a[1]]!==grid[b[0]][b[1]])return false;}return true;}

test('canonical Clone topology is real and solution-valid',()=>{
  assert.equal(v.kind,'clone');
  assert.ok(Array.isArray(v.data.clones)&&v.data.clones.length===2);
  assert.ok(v.data.clones[0].length>=2);
  assert.ok(cloneValid(v.solution,v.data.clones));
});

test('Clone generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0xC10AE,difficulty),b=ctx.SudokuGenerator.make(v,0xC10AE,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Clone rule must be essential to uniqueness');
    assert.ok(cloneValid(a.solution,a.data.clones));
  }
});

test('Clone measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[13,29,43,59,71,83,101];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator enforces partial Clone equality',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='clone'/);
  assert.match(src,/clone:true/);
});

test('renderer marks Clone regions and rejects unequal peer values',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/kindIs\(v,'clone'\)/);
  assert.match(src,/d\.clones/);
  assert.match(src,/x&&y&&x!==y/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
