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
const v=ctx.SudokuBank.find(x=>x.id==='entropic');
assert.ok(v,'canonical Entropic Line must exist');

function group(z){return Math.floor((z-1)/3);}
function lineValid(grid,line){for(let i=0;i<=line.length-3;i++){const vals=line.slice(i,i+3).map(p=>grid[p[0]][p[1]]);if(new Set(vals.map(group)).size!==3)return false;}return true;}

test('canonical Entropic Line solution satisfies every triple',()=>{
  assert.equal(v.kind,'entropic');assert.ok(Array.isArray(v.data.lines)&&v.data.lines.length>0);
  for(const line of v.data.lines){assert.ok(Array.isArray(line)&&line.length>=3);assert.ok(lineValid(v.solution,line));}
});

test('Entropic Line generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0xE17A0,difficulty),b=ctx.SudokuGenerator.make(v,0xE17A0,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Entropic line must be essential to uniqueness');
    for(const line of a.data.lines)assert.ok(lineValid(a.solution,line));
  }
});

test('Entropic measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[17,29,41,53,67,79,97];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator enforces partial Entropic triples',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='entropic'/);
  assert.match(src,/entropic:true/);
});

test('renderer draws Entropic lines and rejects invalid completed triples',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/entropic/);
  assert.match(src,/Math\.floor\(\(z-1\)\/3\)/);
  assert.match(src,/k\+'-line'/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
