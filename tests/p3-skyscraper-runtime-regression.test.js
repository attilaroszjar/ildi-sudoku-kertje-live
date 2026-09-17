'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

function loadClassicConflict(){
  const match=source.match(/function classicConflict\(grid,r,c,vdef\)\{[\s\S]*?\n  \}\n\n  function doubleSkyscraperConflict/);
  assert.ok(match,'classicConflict source must remain discoverable');
  const fnSource=match[0].replace(/\n\n  function doubleSkyscraperConflict[\s\S]*$/,'');
  const ctx={};
  vm.createContext(ctx);
  vm.runInContext(
    "function kindIs(v,kind){return v.kind===kind||(Array.isArray(v.kinds)&&v.kinds.indexOf(kind)!==-1);}\n"+
    fnSource+"\nthis.classicConflict=classicConflict;",
    ctx
  );
  return ctx.classicConflict;
}

test('latin-only Skyscraper runtime does not apply synthetic Sudoku boxes',()=>{
  const conflict=loadClassicConflict();
  const n=8;
  const grid=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>(r+c)%n+1));
  const variant={kind:'skyscraper',data:{latinOnly:true}};

  // r1c2=2 and r2c1=2 share the synthetic 2x2 box that the old runtime
  // incorrectly imposed on an 8x8 Latin-only Skyscraper board.
  assert.equal(conflict(grid,0,1,variant),false);
  assert.equal(conflict(grid,1,0,variant),false);
});

test('latin-only Skyscraper rendering does not draw synthetic Sudoku box separators',()=>{
  assert.match(
    source,
    /if\(!\(v\.data&&v\.data\.latinOnly\)&&!kindIs\(v,'jigsaw'\)/,
    'cell construction must skip box separators for latinOnly variants'
  );
});
