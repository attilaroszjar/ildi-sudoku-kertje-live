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

const baseIds=['dutch-whispers','nabner','lockout','frame'];
const comboIds=['killer-thermo','killer-arrow','killer-palindrome','killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout'];
const allIds=baseIds.concat(comboIds);
const variants=allIds.map(id=>{const v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,`canonical ${id} must exist`);return v;});
function value(grid,p){return grid[p[0]][p[1]];}
function lineCells(item){return Array.isArray(item)?item:item.cells;}
function dutchValid(grid,v){return v.data.lines.every(item=>{const z=lineCells(item).map(p=>value(grid,p));return z.every((x,i)=>!i||Math.abs(x-z[i-1])>=4);});}
function nabnerValid(grid,v){return v.data.lines.every(item=>{const z=lineCells(item).map(p=>value(grid,p));return new Set(z).size===z.length&&z.every((x,i)=>z.every((y,j)=>i===j||Math.abs(x-y)>1));});}
function lockoutValid(grid,v){return v.data.lines.every(item=>{const z=lineCells(item).map(p=>value(grid,p)),lo=Math.min(z[0],z[z.length-1]),hi=Math.max(z[0],z[z.length-1]);return z[0]!==z[z.length-1]&&z.slice(1,-1).every(x=>x<lo||x>hi);});}
function frameValid(grid,v){return v.data.clues.every(cl=>{let z=cl.axis==='row'?grid[cl.index].slice():grid.map(row=>row[cl.index]);if(cl.side==='right'||cl.side==='bottom')z.reverse();return z.slice(0,3).reduce((a,b)=>a+b,0)===cl.sum;});}
function newRuleValid(grid,v){if(v.kinds&&v.kinds.includes('dutchwhispers'))return dutchValid(grid,v);if(v.kinds&&v.kinds.includes('lockout'))return lockoutValid(grid,v);if(v.kind==='dutchwhispers')return dutchValid(grid,v);if(v.kind==='nabner')return nabnerValid(grid,v);if(v.kind==='lockout')return lockoutValid(grid,v);if(v.kind==='frame')return frameValid(grid,v);return true;}

test('Iteration 3 base contracts, topology and canonical solutions are valid',()=>{
  const [dutch,nabner,lockout,frame]=variants;
  assert.equal(dutch.kind,'dutchwhispers');assert.match(dutch.rule,/differ by at least 4/);assert.ok(dutch.data.lines.length&&dutchValid(dutch.solution,dutch));
  assert.equal(nabner.kind,'nabner');assert.match(nabner.rule,/do not repeat/);assert.ok(nabner.data.lines.length&&nabnerValid(nabner.solution,nabner));
  assert.equal(lockout.kind,'lockout');assert.match(lockout.rule,/strictly outside/);assert.ok(lockout.data.lines.length&&lockoutValid(lockout.solution,lockout));
  assert.equal(frame.kind,'frame');assert.match(frame.rule,/nearest three digits/);assert.equal(frame.data.clues.length,36);assert.ok(frameValid(frame.solution,frame));
  for(const v of variants.slice(4)){assert.equal(v.kind,'combined');assert.equal(v.kinds.length,2);assert.ok(newRuleValid(v.solution,v),v.id);}
});

test('Iteration 3 base and combination generation is deterministic, unique and variant-essential',()=>{
  for(const v of variants)for(const difficulty of ['gentle','focused','expert']){
    const seed=0x173000+allIds.indexOf(v.id),a=ctx.SudokuGenerator.make(v,seed,difficulty),b=ctx.SudokuGenerator.make(v,seed,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle,`${v.id} puzzle determinism`);
    assert.deepEqual(a.solution,b.solution,`${v.id} solution determinism`);
    assert.deepEqual(a.data,b.data,`${v.id} data determinism`);
    assert.equal(a.generation.unique,true,`${v.id} uniqueness`);
    assert.equal(a.generation.variantEssential,true,`${v.id} essentiality`);
    assert.equal(a.generation.mode,'seeded-variant-essential',`${v.id} mode`);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1,`${v.id} solver uniqueness`);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,`${v.id} rules must be essential`);
    assert.ok(newRuleValid(a.solution,a),`${v.id} generated solution validity`);
  }
});

test('Iteration 3 measured difficulty is ordered across base and combinations',()=>{
  const seeds=[13,29,43,71,101],med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a[m];};
  const score=o=>o.generation.search&&Number.isFinite(o.generation.search.nodes)?o.generation.search.nodes:o.generation.clues*-1;
  for(const v of variants){
    const g=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'gentle'))),f=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'focused'))),e=seeds.map(s=>score(ctx.SudokuGenerator.make(v,s,'expert')));
    assert.ok(med(g)<med(f),`${v.id}: Gentle < Focused, ${med(g)} vs ${med(f)}`);
    assert.ok(med(f)<med(e),`${v.id}: Focused < Expert, ${med(f)} vs ${med(e)}`);
  }
});

test('generator owns all new Iteration 3 partial-feasibility constraints and essentiality',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  for(const kind of ['dutchwhispers','nabner','lockout','frame']){
    assert.match(src,new RegExp(`variant\\.kind==='${kind}'`),kind);
    assert.match(src,new RegExp(`${kind}:true`),kind);
  }
  for(const helper of ['dutchWhispersValid','nabnerValid','lockoutValid','frameValid'])assert.match(src,new RegExp(helper),helper);
});

test('renderer and runtime expose all new Iteration 3 mechanics',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/v\.kind==='dutchwhispers'/);assert.match(src,/dutchwhispers-line/);
  assert.match(src,/v\.kind==='nabner'/);assert.match(src,/nabner-line/);
  assert.match(src,/v\.kind==='lockout'/);assert.match(src,/lockout-line/);
  assert.match(src,/v\.kind==='frame'/);assert.match(src,/kindIs\(v,'frame'\)/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
