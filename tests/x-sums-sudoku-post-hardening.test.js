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
const v=ctx.SudokuBank.find(x=>x.id==='x-sums');
assert.ok(v,'canonical X-Sums Sudoku must exist');

function orientedLine(grid,clue){
  const line=clue.axis==='row'?grid[clue.index].slice():grid.map(row=>row[clue.index]);
  if(clue.side==='right'||clue.side==='bottom')line.reverse();
  return line;
}
function xSumsValid(grid,clues){
  return clues.every(clue=>{
    const line=orientedLine(grid,clue),x=line[0];
    return Number.isInteger(x)&&x>=1&&x<=line.length&&line.slice(0,x).reduce((sum,z)=>sum+z,0)===clue.sum;
  });
}

test('canonical X-Sums contract, topology and solution are valid',()=>{
  assert.equal(v.kind,'xsums');
  assert.match(v.rule,/first X digits/i);
  assert.ok(Array.isArray(v.data.clues)&&v.data.clues.length>=9);
  assert.ok(v.data.clues.every(cl=>['row','col'].includes(cl.axis)&&['left','right','top','bottom'].includes(cl.side)&&Number.isInteger(cl.sum)&&cl.sum>0));
  assert.ok(xSumsValid(v.solution,v.data.clues));
});

test('X-Sums generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0x5A17,difficulty),b=ctx.SudokuGenerator.make(v,0x5A17,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);
    assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'X-Sums rule must be essential to uniqueness');
    assert.ok(xSumsValid(a.solution,a.data.clues));
  }
});

test('X-Sums measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[13,29,43,59,71,83,101];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator owns X-Sums partial-feasibility and essentiality',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='xsums'/);
  assert.match(src,/xsums:true/);
  assert.match(src,/xSumsValid/);
});

test('renderer exposes X-Sums clues and runtime conflict validation',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/v\.kind==='xsums'/);
  assert.match(src,/\['sandwich','littlekiller','xsums'/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
