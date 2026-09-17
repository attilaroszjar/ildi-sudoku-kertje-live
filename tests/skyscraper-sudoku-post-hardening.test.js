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
const v=ctx.SudokuBank.find(x=>x.id==='skyscraper');
assert.ok(v,'canonical Skyscraper Sudoku must exist');

function visible(line){let max=0,count=0;for(const x of line)if(x>max){max=x;count++;}return count;}
function oriented(grid,cl){let line=cl.axis==='row'?grid[cl.index].slice():grid.map(row=>row[cl.index]);if(cl.side==='right'||cl.side==='bottom')line.reverse();return line;}
function latinAndBoxes(grid){const n=grid.length;for(let i=0;i<n;i++){assert.equal(new Set(grid[i]).size,n);assert.equal(new Set(grid.map(r=>r[i])).size,n);}for(let br=0;br<n;br+=3)for(let bc=0;bc<n;bc+=3){const z=[];for(let r=br;r<br+3;r++)for(let c=bc;c<bc+3;c++)z.push(grid[r][c]);assert.equal(new Set(z).size,9);}}

test('canonical Skyscraper solution and every outside clue are valid',()=>{
  assert.equal(v.kind,'skyscraper');
  assert.ok(Array.isArray(v.data.clues)&&v.data.clues.length>0);
  latinAndBoxes(v.solution);
  for(const cl of v.data.clues){assert.ok(['row','col'].includes(cl.axis));assert.ok(['left','right','top','bottom'].includes(cl.side));assert.equal(visible(oriented(v.solution,cl)),cl.count);}
});

test('Skyscraper generation is deterministic, unique, variant-essential and regenerates clues',()=>{
  const seen=new Set();
  for(const seed of [101,202,303,404]){
    const a=ctx.SudokuGenerator.make(v,seed,'focused'),b=ctx.SudokuGenerator.make(v,seed,'focused');
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Skyscraper clues must be essential to uniqueness');
    latinAndBoxes(a.solution);for(const cl of a.data.clues)assert.equal(visible(oriented(a.solution,cl)),cl.count);
    seen.add(JSON.stringify(a.solution));
  }
  assert.ok(seen.size>=3,'seeded Skyscraper solutions should be diverse');
});

test('Skyscraper measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[11,22,33,44,55,66,77];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('renderer keeps perimeter clues on the board and enforces Skyscraper conflicts',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/var perimeterKinds=\[[^\]]*'skyscraper'[^\]]*\]/);
  assert.match(src,/function skyscraperFamilyConflict\(/);
  assert.match(src,/skyscraperVisibleCount\(line\)!==cl\.count/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
  assert.match(src,/function changed\(\)\{[^}]*classList\.remove\('checked-wrong'\)/);
});

test('shared Skyscraper lifecycle retains notes, language refresh and mobile Sudoku geometry',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'assets/sudoku-mobile.css'),'utf8');
  assert.match(src,/notes/);assert.match(src,/keydown/);assert.match(src,/if\(solved\(\)\)\{cells\.forEach/);
  assert.match(src,/languagechange|language/i);
  assert.match(css,/410px/);
});
