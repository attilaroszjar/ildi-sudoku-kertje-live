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
const v=ctx.SudokuBank.find(x=>x.id==='rossini');
assert.ok(v,'canonical Rossini Sudoku must exist');

function orientedTriple(grid,clue){
  const line=clue.axis==='row'?grid[clue.index].slice():grid.map(row=>row[clue.index]);
  if(clue.side==='right'||clue.side==='bottom')line.reverse();
  return line.slice(0,3);
}
function rossiniValid(grid,clues){
  return clues.every(clue=>{
    const [a,b,c]=orientedTriple(grid,clue);
    return clue.dir==='inc'?a<b&&b<c:a>b&&b>c;
  });
}

test('canonical Rossini contract, topology and solution are valid',()=>{
  assert.equal(v.kind,'rossini');
  assert.match(v.rule,/border triples/i);
  assert.ok(Array.isArray(v.data.clues)&&v.data.clues.length>0);
  assert.ok(v.data.clues.every(cl=>['row','col'].includes(cl.axis)&&['left','right','top','bottom'].includes(cl.side)&&['inc','dec'].includes(cl.dir)));
  assert.ok(rossiniValid(v.solution,v.data.clues));
});

test('Rossini generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0x70551A1,difficulty),b=ctx.SudokuGenerator.make(v,0x70551A1,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);
    assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Rossini arrows must be essential to uniqueness');
    assert.ok(rossiniValid(a.solution,a.data.clues));
  }
});

test('Rossini measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[13,29,43,59,71,83,101];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator owns Rossini partial-feasibility and essentiality',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='rossini'/);
  assert.match(src,/rossini:true/);
  assert.match(src,/rossiniValid/);
});

test('renderer exposes Rossini arrows and runtime conflict validation',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/v\.kind==='rossini'/);
  assert.match(src,/kindIs\(v,'rossini'\)/);
  assert.match(src,/cl\.dir==='inc'\?'↗':'↘'/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
