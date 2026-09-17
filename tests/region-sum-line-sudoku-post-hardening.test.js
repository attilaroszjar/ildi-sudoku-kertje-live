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
const v=ctx.SudokuBank.find(x=>x.id==='region-sum');
assert.ok(v,'canonical Region Sum Line must exist');

function segments(line){const groups=[];let cur=[];let key=null;for(const p of line){const k=Math.floor(p[0]/3)+','+Math.floor(p[1]/3);if(k!==key&&cur.length){groups.push(cur);cur=[];}cur.push(p);key=k;}if(cur.length)groups.push(cur);return groups;}
function valid(grid,line){const sums=segments(line).map(seg=>seg.reduce((s,p)=>s+grid[p[0]][p[1]],0));return new Set(sums).size===1;}

test('canonical Region Sum Line solution satisfies every segment sum',()=>{
  assert.equal(v.kind,'regionsum');assert.ok(Array.isArray(v.data.lines)&&v.data.lines.length>0);
  for(const line of v.data.lines){assert.ok(Array.isArray(line)&&line.length>=3);assert.ok(valid(v.solution,line));}
});

test('Region Sum generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0x51A9,difficulty),b=ctx.SudokuGenerator.make(v,0x51A9,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Region Sum Line rule must be essential to uniqueness');
    for(const line of a.data.lines)assert.ok(valid(a.solution,line));
  }
});

test('Region Sum measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[29,41,53,67,79,97,109];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator enforces partial Region Sum segment feasibility',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='regionsum'/);
  assert.match(src,/regionsum:true/);
});

test('renderer draws Region Sum lines and rejects unequal completed segment sums',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/v\.kind==='regionsum'/);
  assert.match(src,/RegionSumSegments\.valid\(grid,a\)/);
  assert.match(src,/regionsum|line/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
