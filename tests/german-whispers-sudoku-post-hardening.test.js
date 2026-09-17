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
const v=ctx.SudokuBank.find(x=>x.id==='whispers');
assert.ok(v,'canonical German Whispers must exist');

function lineValid(grid,line){for(let i=0;i<line.length-1;i++){const a=grid[line[i][0]][line[i][1]],b=grid[line[i+1][0]][line[i+1][1]];if(Math.abs(a-b)<5)return false;}return true;}

test('canonical German Whispers has real non-empty valid line topology',()=>{
  assert.equal(v.kind,'whispers');
  assert.ok(Array.isArray(v.data.lines)&&v.data.lines.length>=3,'German Whispers needs actual green lines');
  for(const line of v.data.lines){assert.ok(Array.isArray(line)&&line.length>=2);assert.ok(lineValid(v.solution,line));}
});

test('German Whispers generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0x57A15E,difficulty),b=ctx.SudokuGenerator.make(v,0x57A15E,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Whispers lines must be essential to uniqueness');
    assert.ok(a.data.lines.length>=3);
    for(const line of a.data.lines)assert.ok(lineValid(a.solution,line));
  }
});

test('German Whispers measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[19,31,43,59,71,83,101];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator enforces German Whispers adjacency feasibility',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='whispers'/);
  assert.match(src,/whispers:true/);
});

test('renderer draws Whispers lines and rejects adjacent differences below five',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/v\.kind==='whispers'&&d\.lines/);
  assert.match(src,/Math\.abs\(x-y\)<5/);
  assert.match(src,/kindIs\(v,'whispers'\)/);
  assert.match(src,/whisper-line/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
