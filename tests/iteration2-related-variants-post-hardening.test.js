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
const ids=['slow-thermo','zipper','center-dot','disjoint-groups'];
const variants=ids.map(id=>{const v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,`canonical ${id} must exist`);return v;});

function value(grid,p){return grid[p[0]][p[1]];}
function slowValid(grid,v){return v.data.lines.every(line=>line.every((p,i)=>!i||(value(grid,p)>=value(grid,line[i-1])&&value(grid,p)-value(grid,line[i-1])<=1)));}
function zipperValid(grid,v){return v.data.lines.every(item=>{const z=item.cells.map(p=>value(grid,p)),m=(z.length-1)/2;return Array.from({length:m},(_,i)=>z[i]+z[z.length-1-i]===z[m]).every(Boolean);});}
function extraCellsValid(grid,v){const z=v.data.cells.map(p=>value(grid,p));return new Set(z).size===z.length;}
function disjointValid(grid){for(let pr=0;pr<3;pr++)for(let pc=0;pc<3;pc++){const z=[];for(let br=0;br<3;br++)for(let bc=0;bc<3;bc++)z.push(grid[br*3+pr][bc*3+pc]);if(new Set(z).size!==9)return false;}return true;}
function valid(v,grid){if(v.kind==='slowthermo')return slowValid(grid,v);if(v.kind==='zipper')return zipperValid(grid,v);if(v.kind==='extracells')return extraCellsValid(grid,v);return disjointValid(grid);}

test('related iteration-2 contracts, topology and solutions are valid',()=>{
  const [slow,zip,center,disjoint]=variants;
  assert.equal(slow.kind,'slowthermo');assert.match(slow.rule,/do not decrease/);assert.ok(slow.data.lines.length&&slowValid(slow.solution,slow));
  assert.equal(zip.kind,'zipper');assert.match(zip.rule,/equally distant from the centre/);assert.ok(zip.data.lines.length&&zipperValid(zip.solution,zip));
  assert.equal(center.kind,'extracells');assert.match(center.rule,/centre cells/);assert.equal(center.data.cells.length,9);assert.ok(extraCellsValid(center.solution,center));
  assert.equal(disjoint.kind,'disjoint');assert.match(disjoint.rule,/same relative position/);assert.ok(disjointValid(disjoint.solution));
});

test('related iteration-2 generation is deterministic, unique and variant-essential',()=>{
  for(const v of variants)for(const difficulty of ['gentle','focused','expert']){
    const seed=0x172B47^ids.indexOf(v.id),a=ctx.SudokuGenerator.make(v,seed,difficulty),b=ctx.SudokuGenerator.make(v,seed,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle,`${v.id} puzzle determinism`);
    assert.deepEqual(a.solution,b.solution,`${v.id} solution determinism`);
    assert.deepEqual(a.data,b.data,`${v.id} data determinism`);
    assert.equal(a.generation.unique,true,`${v.id} variant uniqueness`);
    assert.equal(a.generation.variantEssential,true,`${v.id} essentiality`);
    assert.equal(a.generation.mode,'seeded-variant-essential',`${v.id} generation mode`);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1,`${v.id} solver uniqueness`);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,`${v.id} rule must be essential`);
    assert.ok(valid(a,a.solution),`${v.id} generated solution validity`);
  }
});

test('related iteration-2 measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[13,29,43,59,71,83,101];
  for(const v of variants){
    const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
    assert.ok(med(g)<med(f),`${v.id}: expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
    assert.ok(med(f)<med(e),`${v.id}: expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
  }
});

test('generator owns all related partial-feasibility constraints and essentiality',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  for(const kind of ['slowthermo','zipper','extracells','disjoint']){
    assert.match(src,new RegExp(`variant\\.kind==='${kind}'`),kind);
    assert.match(src,new RegExp(`${kind}:true`),kind);
  }
  for(const helper of ['slowThermoValid','zipperValid','extraCellsValid','disjointValid'])assert.match(src,new RegExp(helper),helper);
});

test('renderer and runtime expose all related rule mechanics',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/v\.kind==='slowthermo'/);assert.match(src,/\['palindrome','parityline','entropic','modular','regionsum','slowthermo'\]/);assert.match(src,/k\+'-line'/);
  assert.match(src,/v\.kind==='zipper'/);assert.match(src,/zipper-line/);
  assert.match(src,/kindIs\(v,'extracells'\)/);assert.match(src,/extra-region-cell/);
  assert.match(src,/v\.kind==='disjoint'/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
