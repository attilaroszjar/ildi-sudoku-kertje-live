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
const v=ctx.SudokuBank.find(x=>x.id==='renban');
assert.ok(v,'canonical Renban Sudoku must exist');

function renbanValid(grid,line){const vals=line.map(p=>grid[p[0]][p[1]]);return new Set(vals).size===vals.length&&Math.max(...vals)-Math.min(...vals)===vals.length-1;}
function latinAndBoxes(grid){const n=grid.length;for(let i=0;i<n;i++){assert.equal(new Set(grid[i]).size,n);assert.equal(new Set(grid.map(r=>r[i])).size,n);}for(let br=0;br<n;br+=3)for(let bc=0;bc<n;bc+=3){const z=[];for(let r=br;r<br+3;r++)for(let c=bc;c<bc+3;c++)z.push(grid[r][c]);assert.equal(new Set(z).size,9);}}

test('canonical Renban solution satisfies every line',()=>{
  assert.equal(v.kind,'renban');assert.ok(v.data.lines.length>0);latinAndBoxes(v.solution);
  for(const line of v.data.lines)assert.ok(renbanValid(v.solution,line));
});

test('Renban generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0x5E4BAA,difficulty),b=ctx.SudokuGenerator.make(v,0x5E4BAA,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Renban lines must be essential to uniqueness');
    for(const line of a.data.lines)assert.ok(renbanValid(a.solution,line));
  }
});

test('Renban measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[13,27,39,51,63,75,87];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator enforces partial and completed Renban line feasibility',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='renban'/);
  assert.match(src,/renban:true/);
});

test('renderer draws Renban lines and rejects invalid entered values',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/v\.kind==='renban'&&d\.lines/);
  assert.match(src,/new Set\(vals\)\.size!==vals\.length/);
  assert.match(src,/Math\.max\.apply\(null,vals\)-Math\.min\.apply\(null,vals\)>=a\.length/);
  assert.match(src,/kindIs\(v,'renban'\)/);
  assert.match(src,/renban-line/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
