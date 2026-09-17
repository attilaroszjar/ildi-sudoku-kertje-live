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
    x==='games/p3-ripple-effect-complete.js'
  );
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  return ctx;
}

function validate(g){
  const n=g.puzzle.size,rooms=g.puzzle.rooms,sol=g.solution;
  assert.equal(rooms.length,n);
  assert.ok(rooms.every(row=>row.length===n));
  assert.equal(sol.length,n);
  assert.ok(sol.every(row=>row.length===n));
  const by={};
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)(by[rooms[r][c]]??=[]).push([r,c]);
  for(const cells of Object.values(by)){
    const vals=cells.map(([r,c])=>sol[r][c]).sort((a,b)=>a-b);
    assert.deepEqual(vals,Array.from({length:cells.length},(_,i)=>i+1),'room must contain 1..room-size');
  }
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const v=sol[r][c];
    for(let d=1;d<=v;d++){
      if(r+d<n)assert.notEqual(sol[r+d][c],v,'equal values must respect vertical ripple distance');
      if(c+d<n)assert.notEqual(sol[r][c+d],v,'equal values must respect horizontal ripple distance');
    }
  }
}

test('Ripple Effect exposes solver-certified 5x5 through 8x8 sizes',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='ripple-effect');
  for(const n of [5,6,7,8]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x77000000+n)>>>0,'focused');
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.generatorFamily,'ripple-effect-multisize-certified-stripes');
    validate(g);
    assert.equal(G.countRippleEffectSolutions(g.puzzle,2,{}),1,`${n}x${n} exact uniqueness`);
  }
});

test('Ripple Effect multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='ripple-effect');
  variant.data.p3Size=8;
  const a=G.make(variant,0x77111111,'focused');
  const b=G.make(variant,0x77111111,'focused');
  const c=G.make(variant,0x77222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed must replay exact JSON content');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds must vary the certified solution');
  assert.notEqual(a.generation.topologyFamily,c.generation.topologyFamily,'seed corpus must cover both stripe orientations');
});

test('Ripple Effect difficulty stays independent from size',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='ripple-effect');
  variant.data.p3Size=7;
  const clues=[];
  for(const difficulty of ['gentle','focused','expert']){
    const g=G.make(variant,0x77333333,difficulty);
    assert.equal(g.generation.boardSize,7);
    assert.equal(G.countRippleEffectSolutions(g.puzzle,2,{}),1);
    clues.push(g.generation.clues);
  }
  assert.ok(clues[0]>=clues[1]&&clues[1]>=clues[2],'easier bands expose at least as many givens');
});

test('Ripple Effect registers with the shared P3 size selector only',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-ripple-effect-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes("root.IldiP3SizeSupport['ripple-effect']=supported.slice()"));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
  assert.ok(source.includes('function makeCertifiedBase(seed,n)'));
  assert.ok(source.includes('targetHoleFraction(difficulty,n)'));
});
