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
    x==='games/p3-masyu-complete.js'
  );
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  return ctx;
}

function edgesFor(n){
  const out=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    if(c+1<n)out.push({a:[r,c],b:[r,c+1]});
    if(r+1<n)out.push({a:[r,c],b:[r+1,c]});
  }
  return out;
}

function independentSolutionCheck(g){
  const n=g.puzzle.length,edges=edgesFor(n),vals=g.solution,adj=new Map();
  assert.equal(vals.length,edges.length);
  const add=(a,b)=>{const ka=a.join(','),kb=b.join(',');if(!adj.has(ka))adj.set(ka,[]);if(!adj.has(kb))adj.set(kb,[]);adj.get(ka).push(kb);adj.get(kb).push(ka);};
  edges.forEach((e,i)=>{if(vals[i]===1)add(e.a,e.b);});
  assert.ok(adj.size>0);
  for(const ns of adj.values())assert.equal(ns.length,2,'loop degree');
  const start=adj.keys().next().value,seen=new Set([start]),stack=[start];
  while(stack.length){const x=stack.pop();for(const y of adj.get(x)||[])if(!seen.has(y)){seen.add(y);stack.push(y);}}
  assert.equal(seen.size,adj.size,'single connected loop');

  const type=(r,c)=>{
    const ns=(adj.get(r+','+c)||[]).map(s=>s.split(',').map(Number));
    if(ns.length!==2)return null;
    if(ns[0][0]===ns[1][0])return 'h';
    if(ns[0][1]===ns[1][1])return 'v';
    return 'turn';
  };
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const clue=g.puzzle[r][c];if(!clue)continue;
    const t=type(r,c);
    if(clue==='w'){
      assert.ok(t==='h'||t==='v');
      const ok=t==='h'?((c>0&&type(r,c-1)==='turn')||(c+1<n&&type(r,c+1)==='turn')):((r>0&&type(r-1,c)==='turn')||(r+1<n&&type(r+1,c)==='turn'));
      assert.ok(ok,'white circle adjacent turn');
    }else{
      assert.equal(clue,'b');assert.equal(t,'turn');
      for(const s of adj.get(r+','+c)){
        const [rr,cc]=s.split(',').map(Number),dr=rr-r,dc=cc-c;
        assert.equal(type(rr,cc),dr===0?'h':'v','black circle straight continuation');
      }
    }
  }
}

test('Masyu exposes solver-certified 4x4 through 8x8 sizes',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='masyu');
  for(const n of [4,5,6,7,8]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x79000000+n)>>>0,'focused');
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.generatorFamily,'masyu-multisize-coarse-polyomino-cycle');
    independentSolutionCheck(g);
    assert.equal(G.countMasyuSolutions(g.puzzle,2,{}),1,`${n}x${n} exact uniqueness`);
  }
});

test('Masyu multi-size generation is deterministic and topology-diverse',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='masyu');
  variant.data.p3Size=8;
  const a=G.make(variant,0x79111111,'focused');
  const b=G.make(variant,0x79111111,'focused');
  const c=G.make(variant,0x79222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed exact replay');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds vary loop topology');
});

test('Masyu difficulty remains independent from board size',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='masyu');
  variant.data.p3Size=7;
  const clues=[];
  for(const difficulty of ['gentle','focused','expert']){
    const g=G.make(variant,0x79333333,difficulty);
    assert.equal(g.generation.boardSize,7);
    assert.equal(G.countMasyuSolutions(g.puzzle,2,{}),1);
    clues.push(g.generation.clues);
  }
  assert.ok(clues[0]>=clues[1]&&clues[1]>=clues[2],'easier bands expose at least as many circles');
});

test('Masyu registers only with the shared P3 size selector and optimized solver',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-masyu-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.masyu=supported.slice()'));
  assert.ok(source.includes('generator.countMasyuSolutions=countMasyuFast'));
  assert.ok(source.includes('function propagate(trail)'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
});
