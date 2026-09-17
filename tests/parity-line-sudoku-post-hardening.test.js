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
const v=ctx.SudokuBank.find(x=>x.id==='parity-line');
assert.ok(v,'canonical Parity Line must exist');

function parityLineValid(grid,line){for(let i=0;i<line.length-1;i++){const a=grid[line[i][0]][line[i][1]],b=grid[line[i+1][0]][line[i+1][1]];if((a%2)===(b%2))return false;}return true;}

test('canonical Parity Line solution satisfies every line',()=>{
  assert.equal(v.kind,'parityline');assert.ok(Array.isArray(v.data.lines)&&v.data.lines.length>0);
  for(const line of v.data.lines){assert.ok(Array.isArray(line)&&line.length>=2);assert.ok(parityLineValid(v.solution,line));}
});

test('Parity Line generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0x0A8171,difficulty),b=ctx.SudokuGenerator.make(v,0x0A8171,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Parity Line rule must be essential to uniqueness');
    for(const line of a.data.lines)assert.ok(parityLineValid(a.solution,line));
  }
});

test('Parity Line measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[17,33,47,59,71,85,99];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator enforces partial Parity Line alternation',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='parityline'/);
  assert.match(src,/parityline:true/);
});

test('renderer draws Parity Line and rejects equal-parity neighbours',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/parityline/);
  assert.match(src,/vals\[j\]%2\)===\(vals\[j\+1\]%2/);
  assert.match(src,/k\+'-line'/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
