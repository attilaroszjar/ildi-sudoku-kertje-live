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
const v=ctx.SudokuBank.find(x=>x.id==='fortress');
assert.ok(v,'canonical Fortress Sudoku must exist');

function fortressValid(grid,cells){
  const n=grid.length,marked=new Set(cells.map(p=>p.join(',')));
  return cells.every(([r,c])=>[[1,0],[-1,0],[0,1],[0,-1]].every(([dr,dc])=>{
    const rr=r+dr,cc=c+dc;
    return rr<0||cc<0||rr>=n||cc>=n||marked.has(rr+','+cc)||grid[r][c]>grid[rr][cc];
  }));
}

test('canonical Fortress contract, topology and solution are valid',()=>{
  assert.equal(v.kind,'fortress');
  assert.match(v.rule,/larger than every orthogonally adjacent unshaded cell/i);
  assert.ok(Array.isArray(v.data.cells)&&v.data.cells.length>=4);
  assert.equal(new Set(v.data.cells.map(p=>p.join(','))).size,v.data.cells.length);
  assert.ok(v.data.cells.every(p=>Array.isArray(p)&&p.length===2&&p.every(x=>Number.isInteger(x)&&x>=0&&x<9)));
  assert.ok(fortressValid(v.solution,v.data.cells));
});

test('Fortress generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0xF047E55,difficulty),b=ctx.SudokuGenerator.make(v,0xF047E55,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);
    assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Fortress shading must be essential to uniqueness');
    assert.ok(fortressValid(a.solution,a.data.cells));
  }
});

test('Fortress measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[13,29,43,59,71,83,101];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator owns Fortress partial-feasibility and essentiality',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='fortress'/);
  assert.match(src,/fortress:true/);
  assert.match(src,/fortressValid/);
});

test('renderer exposes Fortress shading and runtime conflict validation',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/kindIs\(v,'fortress'\)/);
  assert.match(src,/classList\.add\('fortress-cell'\)/);
  assert.match(src,/x<=grid\[rr\]\[cc\]/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
