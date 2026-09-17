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
    x==='games/p3-hashiwokakero-complete.js'
  );
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  return ctx;
}

function edges(islands){
  const out=[];
  for(let i=0;i<islands.length;i++){
    const a=islands[i];let right=null,down=null;
    for(let j=0;j<islands.length;j++)if(i!==j){
      const b=islands[j];
      if(a.r===b.r&&b.c>a.c&&(!right||b.c<right.c))right={idx:j,c:b.c};
      if(a.c===b.c&&b.r>a.r&&(!down||b.r<down.r))down={idx:j,r:b.r};
    }
    if(right)out.push([i,right.idx]);
    if(down)out.push([i,down.idx]);
  }
  return out;
}

function validate(g){
  const islands=g.puzzle.islands,e=edges(islands),vals=g.solution;
  assert.equal(e.length,islands.length-1,'visibility graph is a tree');
  assert.equal(vals.length,e.length,'solution matches candidate edges');
  const sums=Array(islands.length).fill(0);
  for(let i=0;i<e.length;i++){
    assert.ok(vals[i]===1||vals[i]===2,'bridge multiplicity is legal');
    sums[e[i][0]]+=vals[i];sums[e[i][1]]+=vals[i];
  }
  const clues=Array.from(islands,x=>Number(x.clue));
  assert.equal(JSON.stringify(sums),JSON.stringify(clues),'island clues equal incident bridge counts');
}

test('Hashiwokakero exposes solver-certified 6x6 through 10x10 sizes',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='hashiwokakero');
  for(const n of [6,7,8,9,10]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x79000000+n)>>>0,'focused');
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.generatorFamily,'hashiwokakero-multisize-tree-staircase');
    validate(g);
    assert.equal(G.countBridgesSolutions(g.puzzle,2,{}),1,`${n}x${n} exact uniqueness`);
  }
});

test('Hashiwokakero generation is deterministic and structurally diverse',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='hashiwokakero');
  variant.data.p3Size=10;
  const sig=new Set(),sol=new Set();
  for(const seed of [0x79111111,0x79222222,0x79333333,0x79444444]){
    const a=G.make(variant,seed,'focused'),b=G.make(variant,seed,'focused');
    assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed replays exact JSON content');
    sig.add(JSON.stringify(a.puzzle.islands.map(x=>[x.r,x.c])));
    sol.add(JSON.stringify(a.solution));
  }
  assert.ok(sig.size>=2,'seed changes island topology/orientation');
  assert.ok(sol.size>=2,'seed changes bridge multiplicities');
});

test('Hashiwokakero difficulty is independent from size',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='hashiwokakero');
  variant.data.p3Size=9;
  for(const difficulty of ['gentle','focused','expert']){
    const g=G.make(variant,0x79555555,difficulty);
    assert.equal(g.generation.boardSize,9);
    assert.equal(G.countBridgesSolutions(g.puzzle,2,{}),1);
    validate(g);
  }
});

test('Hashiwokakero registers with the shared P3 size selector only',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-hashiwokakero-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.hashiwokakero=supported.slice()'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
});
