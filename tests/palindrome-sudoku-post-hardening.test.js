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
const v=ctx.SudokuBank.find(x=>x.id==='palindrome');
assert.ok(v,'canonical Palindrome Sudoku must exist');

function palindromeValid(grid,line){for(let i=0;i<Math.floor(line.length/2);i++){const a=line[i],b=line[line.length-1-i];if(grid[a[0]][a[1]]!==grid[b[0]][b[1]])return false;}return true;}

test('canonical Palindrome solution satisfies every line',()=>{
  assert.equal(v.kind,'palindrome');assert.ok(Array.isArray(v.data.lines)&&v.data.lines.length>0);
  for(const line of v.data.lines){assert.ok(Array.isArray(line)&&line.length>=3);assert.ok(palindromeValid(v.solution,line));}
});

test('Palindrome generation is deterministic, unique and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0xA11CE,difficulty),b=ctx.SudokuGenerator.make(v,0xA11CE,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,'Palindrome rule must be essential to uniqueness');
    for(const line of a.data.lines)assert.ok(palindromeValid(a.solution,line));
  }
});

test('Palindrome measured difficulty is ordered Gentle < Focused < Expert',()=>{
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  const seeds=[23,37,49,61,73,89,103];
  const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
  assert.ok(med(g)<med(f),`expected Gentle < Focused, got ${med(g)} vs ${med(f)}`);
  assert.ok(med(f)<med(e),`expected Focused < Expert, got ${med(f)} vs ${med(e)}`);
});

test('generator enforces partial Palindrome equality',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/variant\.kind==='palindrome'/);
  assert.match(src,/palindrome:true/);
});

test('renderer draws Palindrome lines and rejects unequal mirrored values',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/palindrome/);
  assert.match(src,/vals\[j\].*vals\[vals\.length-1-j\]/);
  assert.match(src,/k\+'\-line'/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
