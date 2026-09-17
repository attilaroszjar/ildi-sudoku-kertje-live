'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');

function load(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
  const wanted=refs.filter(x=>
    /^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||
    x==='games/sudoku-generator.js'||
    x==='games/p3-nonogram-complete.js'
  );
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;
  ctx.window=ctx;
  ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  return ctx;
}

function clue(line){
  const out=[];
  let run=0;
  for(const v of line){
    if(v)run++;
    else if(run){out.push(run);run=0;}
  }
  if(run)out.push(run);
  return out.length?out:[0];
}

test('Nonogram Expert declares the mandatory full-line clue contract',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nonogram');
  variant.data.p3Size=10;
  const g=G.make(variant,101001,'expert');
  assert.equal(g.generation.playabilityPolicy,'full-line-clue-contract');
  assert.equal(g.generation.localIrreducibility,'not-applicable-mandatory-line-clues');
  assert.equal(g.generation.removableClueAtoms,0);
  assert.equal(g.generation.expertSelection,'highest-exact-unique-line-ambiguity');
  assert.equal(G.countNonogramSolutions(g.puzzle,2),1);
});

test('Nonogram Expert retains every canonical row and column clue sequence',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nonogram');
  variant.data.p3Size=10;
  const g=G.make(variant,101001,'expert');
  for(let r=0;r<10;r++)assert.deepEqual(Array.from(g.puzzle.rows[r]),clue(Array.from(g.solution[r])));
  for(let c=0;c<10;c++){
    const col=[];
    for(let r=0;r<10;r++)col.push(g.solution[r][c]);
    assert.deepEqual(Array.from(g.puzzle.cols[c]),clue(col));
  }
  assert.equal(g.generation.clues,20);
});

test('Nonogram Expert contract is deterministic and does not alter lower difficulties',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nonogram');
  variant.data.p3Size=10;
  const a=G.make(variant,101001,'expert');
  const b=G.make(variant,101001,'expert');
  const focused=G.make(variant,101001,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(focused.generation.playabilityPolicy,undefined);
  assert.equal(focused.generation.localIrreducibility,undefined);
  assert.equal(G.countNonogramSolutions(focused.puzzle,2),1);
});
