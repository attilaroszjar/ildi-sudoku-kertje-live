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
const v=ctx.SudokuBank.find(x=>x.id==='mini-6');
assert.ok(v,'canonical Mini Sudoku 6×6 must exist');

function valid6(grid){
  const want='123456';
  if(grid.length!==6||grid.some(row=>row.length!==6))return false;
  for(const row of grid)if(row.slice().sort().join('')!==want)return false;
  for(let c=0;c<6;c++)if(grid.map(row=>row[c]).sort().join('')!==want)return false;
  for(let br=0;br<6;br+=2)for(let bc=0;bc<6;bc+=3){const z=[];for(let r=br;r<br+2;r++)for(let c=bc;c<bc+3;c++)z.push(grid[r][c]);if(z.sort().join('')!==want)return false;}
  return true;
}

test('Mini Sudoku 6×6 canonical contract and 2×3-box solution are valid',()=>{
  assert.equal(v.kind,'mini6');
  assert.match(v.rule,/1–6 once in every row, column, and 2×3 box/);
  assert.ok(valid6(v.solution));
  assert.ok(v.puzzle.every((row,r)=>row.every((x,c)=>!x||x===v.solution[r][c])));
});

test('Mini Sudoku 6×6 generation is deterministic, solver-certified and seed-diverse',()=>{
  const seen=new Set();
  for(const difficulty of ['gentle','focused','expert'])for(const seed of [1,17,101,2026,20260831]){
    const a=ctx.SudokuGenerator.make(v,seed,difficulty),b=ctx.SudokuGenerator.make(v,seed,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle,`${difficulty} ${seed} determinism`);
    assert.equal(a.generation.unique,true);
    assert.equal(a.generation.verification,'solver-verified');
    assert.equal(a.generation.mode,'seeded-unique');
    assert.equal(a.generation.variantEssential,false);
    assert.equal(ctx.SudokuGenerator.countSolutions(a.puzzle,2),1);
    assert.ok(valid6(a.solution));
    seen.add(JSON.stringify(a.puzzle));
  }
  assert.ok(seen.size>=9,`expected material seed/difficulty diversity, got ${seen.size}`);
});

test('Mini Sudoku 6×6 difficulty has ordered clue targets and measured medians',()=>{
  const expected={gentle:24,focused:18,expert:14},seeds=[13,29,43,59,71,83,101],scores={gentle:[],focused:[],expert:[]};
  const med=x=>{const a=x.slice().sort((p,q)=>p-q),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  for(const difficulty of Object.keys(scores))for(const seed of seeds){
    const out=ctx.SudokuGenerator.make(v,seed,difficulty);
    assert.equal(out.generation.clues,expected[difficulty]);
    assert.ok(Number.isFinite(out.generation.difficultyScore));
    scores[difficulty].push(out.generation.difficultyScore);
  }
  assert.ok(med(scores.gentle)<med(scores.focused),`Gentle < Focused: ${med(scores.gentle)} vs ${med(scores.focused)}`);
  assert.ok(med(scores.focused)<med(scores.expert),`Focused < Expert: ${med(scores.focused)} vs ${med(scores.expert)}`);
});

test('shared renderer scales the board, digits, notes and keyboard range to six',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/var n=v\.solution\.length, inputMax=\(v\.data&&v\.data\.inputMax\)\|\|n/);
  assert.match(src,/board\.style\.setProperty\('--sudoku-size',n\)/);
  assert.match(src,/notes=Array\.from\(\{length:n\}/);
  assert.match(src,/valueForKey\(v,e\.key,inputMax\)>0/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});

test('Mini Sudoku 6×6 retains the shared HU/EN and completion lifecycle',()=>{
  const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
  const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(app,/language-button/);assert.match(app,/function mountActive/);assert.match(app,/complete:finishSolve/);
  assert.match(lib,/sudoku:languagechange/);assert.match(lib,/api\.complete/);assert.match(lib,/noteMode/);assert.match(lib,/check/);
});
