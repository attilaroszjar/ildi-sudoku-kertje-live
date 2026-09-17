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
vm.runInContext(fs.readFileSync(path.join(root,'games/quadruple-runtime-hardening.js'),'utf8'),ctx);
const v=ctx.SudokuBank.find(x=>x.id==='quadruple');
assert.ok(v,'canonical Quadruple Sudoku must exist');

function quadValid(grid,q){const vals=q.cells.map(p=>grid[p[0]][p[1]]).slice().sort((a,b)=>a-b);const need=q.digits.slice().sort((a,b)=>a-b);return vals.length===need.length&&vals.every((x,i)=>x===need[i]);}
function givensMatchSolution(out){for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(out.puzzle[r][c]&&out.puzzle[r][c]!==out.solution[r][c])return false;return true;}
function internalQuad(q){return q.at[0]>=1&&q.at[0]<=8&&q.at[1]>=1&&q.at[1]<=8&&q.cells.length===4;}

test('canonical Quadruple clues are real and match the solution',()=>{
  assert.equal(v.kind,'quadruple');
  assert.ok(Array.isArray(v.data.quads)&&v.data.quads.length>0);
  for(const q of v.data.quads){assert.equal(q.cells.length,4);assert.equal(q.digits.length,4);assert.ok(quadValid(v.solution,q));}
});

test('Quadruple runtime generation derives every marker from its generated solution',()=>{
  const seeds=[13,29,43,59,71,83,97,1074168735,3120445440,3116906753];
  for(const difficulty of ['gentle','focused','expert'])for(const seed of seeds){
    const out=ctx.SudokuGenerator.make(v,seed,difficulty);
    assert.equal(out.generation.unique,true,`${seed}/${difficulty}: variant must be unique`);
    assert.equal(out.generation.variantEssential,true,`${seed}/${difficulty}: Quadruple rule must be essential`);
    assert.equal(out.generation.generatorFamily,'quadruple-fresh-solution-derived-clues');
    assert.ok(givensMatchSolution(out),`${seed}/${difficulty}: every given must match the generated solution`);
    assert.ok(Array.isArray(out.data.quads)&&out.data.quads.length>=6);
    for(const q of out.data.quads){
      assert.equal(q.cells.length,4);
      assert.equal(q.digits.length,4);
      assert.ok(internalQuad(q),`${seed}/${difficulty}: generated marker must start on an internal intersection`);
      assert.ok(quadValid(out.solution,q),`${seed}/${difficulty}: marker ${q.at} contradicts generated solution`);
    }
    assert.equal(ctx.SudokuGenerator.countQuadrupleSolutions(out.puzzle,out.data.quads,2),1,`${seed}/${difficulty}: exact Quadruple uniqueness`);
    assert.ok(ctx.SudokuGenerator.countSolutions(out.puzzle,2)>1,`${seed}/${difficulty}: must not be Classic-unique`);
    assert.deepEqual(ctx.QuadrupleRuntimeHardening.lastGenerated.data.quads,out.data.quads,`${seed}/${difficulty}: renderer snapshot must match generated quads`);
  }
});

test('Quadruple generation is deterministic for puzzle, solution and markers',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0x51A7,difficulty),b=ctx.SudokuGenerator.make(v,0x51A7,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
  }
});

test('Quadruple difficulties use progressively lower given targets',()=>{
  const seed=0x51A7;
  const g=ctx.SudokuGenerator.make(v,seed,'gentle'),f=ctx.SudokuGenerator.make(v,seed,'focused'),e=ctx.SudokuGenerator.make(v,seed,'expert');
  assert.ok(g.generation.clues>=f.generation.clues,`expected Gentle clues >= Focused: ${g.generation.clues} vs ${f.generation.clues}`);
  assert.ok(f.generation.clues>=e.generation.clues,`expected Focused clues >= Expert: ${f.generation.clues} vs ${e.generation.clues}`);
});

test('Quadruple runtime hardening is wired before the library',()=>{
  assert.match(html,/games\/quadruple-runtime-hardening\.js/);
  assert.ok(html.indexOf('games/quadruple-runtime-hardening.js')<html.indexOf('games/sudoku-library.js'));
  const src=fs.readFileSync(path.join(root,'games/quadruple-runtime-hardening.js'),'utf8');
  assert.match(src,/countQuadrupleSolutions/);
  assert.match(src,/quadruple-fresh-solution-derived-clues/);
  assert.match(src,/lastGenerated/);
});

test('renderer displays Quadruple clues and rejects completed mismatches',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/v\.kind==='quadruple'/);
  assert.match(src,/d\.quads/);
  assert.match(src,/vals\.every\(Boolean\)/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
});
