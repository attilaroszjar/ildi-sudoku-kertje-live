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
  for(const ref of wanted){
    vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  }
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

function validateClues(g){
  const n=g.solution.length;
  assert.equal(g.puzzle.rows.length,n);
  assert.equal(g.puzzle.cols.length,n);
  for(let r=0;r<n;r++)assert.deepEqual(Array.from(g.puzzle.rows[r]),clue(Array.from(g.solution[r])));
  for(let c=0;c<n;c++){
    const col=[];
    for(let r=0;r<n;r++)col.push(g.solution[r][c]);
    assert.deepEqual(Array.from(g.puzzle.cols[c]),clue(col));
  }
}

test('Nonogram exposes exact-unique 5x5, 6x6, 8x8 and 10x10 boards',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nonogram');
  for(const n of [5,6,8,10]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x75000000+n)>>>0,'focused');
    assert.equal(g.solution.length,n);
    assert.ok(g.solution.every(row=>row.length===n));
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.variantEssential,true);
    assert.equal(g.generation.generatorFamily,'nonogram-multisize-seeded-bitmap');
    validateClues(g);
    assert.equal(G.countNonogramSolutions(g.puzzle,2),1,`${n}x${n} exact uniqueness`);
  }
});

test('Nonogram replay is deterministic and seed-diverse at 10x10',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nonogram');
  variant.data.p3Size=10;
  const a=G.make(variant,0x75111111,'focused');
  const b=G.make(variant,0x75111111,'focused');
  const c=G.make(variant,0x75222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution));
});

test('Nonogram size remains independent from difficulty',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nonogram');
  variant.data.p3Size=8;
  const gentle=G.make(variant,0x75333333,'gentle');
  const focused=G.make(variant,0x75333333,'focused');
  const expert=G.make(variant,0x75333333,'expert');
  for(const g of [gentle,focused,expert]){
    assert.equal(g.solution.length,8);
    assert.equal(G.countNonogramSolutions(g.puzzle,2),1);
  }
  assert.ok(gentle.generation.difficultyScore<=focused.generation.difficultyScore);
  assert.ok(focused.generation.difficultyScore<=expert.generation.difficultyScore);
});

test('Nonogram registers only with the shared P3 size selector',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-nonogram-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.nonogram=supported.slice()'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
});
