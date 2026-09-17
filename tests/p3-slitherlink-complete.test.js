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
    x==='games/p3-slitherlink-complete.js'
  );
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  return ctx;
}

function edgeCount(n){return 2*n*(n+1);}

function validateLoop(solution,n){
  assert.equal(solution.length,edgeCount(n));
  const degree=new Map();
  let pos=0;
  function add(a,b){
    const ka=a.join(','),kb=b.join(',');
    degree.set(ka,(degree.get(ka)||0)+1);
    degree.set(kb,(degree.get(kb)||0)+1);
  }
  for(let r=0;r<=n;r++)for(let c=0;c<n;c++,pos++)if(solution[pos])add([r,c],[r,c+1]);
  for(let r=0;r<n;r++)for(let c=0;c<=n;c++,pos++)if(solution[pos])add([r,c],[r+1,c]);
  assert.ok(degree.size>0,'loop must contain edges');
  for(const d of degree.values())assert.equal(d,2,'all used vertices must have degree two');
}

test('Slitherlink exposes solver-certified 4x4 through 8x8 sizes',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='slitherlink');
  for(const n of [4,5,6,7,8]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x78000000+n)>>>0,'focused');
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.generatorFamily,'slitherlink-multisize-bounded-polyomino-boundary');
    assert.equal(g.puzzle.length,n);
    assert.ok(g.puzzle.every(row=>row.length===n));
    validateLoop(g.solution,n);
    assert.equal(G.countSlitherlinkSolutions(g.puzzle,2,{}),1,`${n}x${n} exact uniqueness`);
  }
});

test('Slitherlink multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='slitherlink');
  variant.data.p3Size=8;
  const a=G.make(variant,0x78111111,'focused');
  const b=G.make(variant,0x78111111,'focused');
  const c=G.make(variant,0x78222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed must replay exact JSON content');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds must vary loop topology');
});

test('Slitherlink difficulty stays independent from size',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='slitherlink');
  variant.data.p3Size=7;
  const clues=[];
  for(const difficulty of ['gentle','focused','expert']){
    const g=G.make(variant,0x78333333,difficulty);
    assert.equal(g.generation.boardSize,7);
    assert.equal(G.countSlitherlinkSolutions(g.puzzle,2,{}),1);
    clues.push(g.generation.clues);
  }
  assert.ok(clues[0]>=clues[1]&&clues[1]>=clues[2],'easier bands expose at least as many clues');
});

test('Slitherlink registers with the shared P3 size selector and optimized exact solver',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-slitherlink-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.slitherlink=supported.slice()'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
  assert.ok(source.includes('for(var attempt=0;attempt<8;attempt++)'));
  assert.ok(source.includes('function countSlitherlinkFast'));
  assert.ok(source.includes('generator.countSlitherlinkSolutions=countSlitherlinkFast'));
  assert.ok(source.includes('function propagate(vals)'));
});
