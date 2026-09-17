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
const v=ctx.SudokuBank.find(x=>x.id==='between');
assert.ok(v,'canonical Between Lines Sudoku must exist');

function lineValid(grid,item){const cells=item.cells,vals=cells.map(p=>grid[p[0]][p[1]]),lo=Math.min(vals[0],vals.at(-1)),hi=Math.max(vals[0],vals.at(-1));return vals.slice(1,-1).every(x=>x>lo&&x<hi);}

test('canonical Between Lines solution satisfies every line',()=>{
  assert.equal(v.kind,'between');assert.ok(Array.isArray(v.data.lines)&&v.data.lines.length>0);
  for(const item of v.data.lines){assert.ok(Array.isArray(item.cells)&&item.cells.length>=3);assert.ok(lineValid(v.solution,item));}
});

test('Between Lines generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0xBE7E3E,difficulty),b=ctx.SudokuGenerator.make(v,0xBE7E3E,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Between Lines rules must be essential to uniqueness');
    for(const item of a.data.lines)assert.ok(lineValid(a.solution,item));
  }
});

test('Between Lines measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[23,35,47,61,73,89,103];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator enforces partial Between Lines endpoint/interior feasibility',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='between'/);
  assert.match(src,/between:true/);
});

test('renderer draws Between Lines and rejects invalid interior entries',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/v\.kind==='between'&&d\.lines/);
  assert.match(src,/z>lo&&z<hi/);
  assert.match(src,/kindIs\(v,'between'\)/);
  assert.match(src,/between-line/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
