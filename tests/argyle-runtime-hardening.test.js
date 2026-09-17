'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const ctx={console,SudokuGenerator:{countVariantSolutions(){return 77;}}};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/argyle-runtime-hardening.js'),'utf8'),ctx);
const classic=[[1,2,3,4,5,6,7,8,9],[4,5,6,7,8,9,1,2,3],[7,8,9,1,2,3,4,5,6],[2,3,4,5,6,7,8,9,1],[5,6,7,8,9,1,2,3,4],[8,9,1,2,3,4,5,6,7],[3,4,5,6,7,8,9,1,2],[6,7,8,9,1,2,3,4,5],[9,1,2,3,4,5,6,7,8]];

test('Argyle uniqueline rejects a repeated digit on a marked diagonal line',()=>{
  const variant={kind:'uniqueline',data:{lines:[[[0,0],[1,1],[2,2]]]}};
  const grid=classic.map(r=>r.slice());grid[2][2]=1;
  assert.equal(ctx.ArgyleRuntimeHardening.uniqueLinesValid(variant,grid,2,2),false);
});

test('Argyle uniqueline accepts distinct digits and routes through exact solver',()=>{
  const variant={kind:'uniqueline',data:{lines:[[[0,0],[1,1],[2,2]]]}};
  assert.equal(ctx.ArgyleRuntimeHardening.uniqueLinesValid(variant,classic,2,2),true);
  const count=ctx.SudokuGenerator.countVariantSolutions(classic,variant,2,{});
  assert.equal(count,1);assert.notEqual(count,77);
});
