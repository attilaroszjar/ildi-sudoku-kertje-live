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
    x==='games/p3-fillomino-complete.js'
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

function validateSolution(solution){
  const n=solution.length;
  const seen=new Set();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];

  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const key=r+','+c;
    if(seen.has(key))continue;
    const value=solution[r][c];
    assert.ok(Number.isInteger(value)&&value>=1&&value<=6);
    const q=[[r,c]];
    seen.add(key);
    let count=0;
    while(q.length){
      const [rr,cc]=q.pop();count++;
      for(const [dr,dc] of dirs){
        const nr=rr+dr,nc=cc+dc,k=nr+','+nc;
        if(nr>=0&&nc>=0&&nr<n&&nc<n&&!seen.has(k)&&solution[nr][nc]===value){
          seen.add(k);q.push([nr,nc]);
        }
      }
    }
    assert.equal(count,value,'each connected region size must equal its label');
  }
}

test('Fillomino exposes solver-certified 5x5 through 8x8 sizes',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='fillomino');

  for(const n of [5,6,7,8]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x74000000+n)>>>0,'focused');
    assert.equal(g.puzzle.length,n);
    assert.ok(g.puzzle.every(row=>row.length===n));
    assert.equal(g.solution.length,n);
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.variantEssential,true);
    assert.equal(g.generation.generatorFamily,'fillomino-multisize-procedural-partition');
    validateSolution(g.solution);
    assert.equal(G.countFillominoSolutions(g.puzzle,2),1,`${n}x${n} exact uniqueness`);
  }
});

test('Fillomino multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='fillomino');
  variant.data.p3Size=8;

  const a=G.make(variant,0x74111111,'focused');
  const b=G.make(variant,0x74111111,'focused');
  const c=G.make(variant,0x74222222,'focused');

  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed must replay exact JSON content');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds must produce a different partition');
});

test('Fillomino difficulty is independent from board size and ordered by clue removal',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='fillomino');
  variant.data.p3Size=7;

  const gentle=G.make(variant,0x74333333,'gentle');
  const focused=G.make(variant,0x74333333,'focused');
  const expert=G.make(variant,0x74333333,'expert');

  for(const g of [gentle,focused,expert]){
    assert.equal(g.puzzle.length,7);
    assert.equal(G.countFillominoSolutions(g.puzzle,2),1);
  }

  assert.ok(gentle.generation.clues>=focused.generation.clues);
  assert.ok(focused.generation.clues>=expert.generation.clues);
});

test('Fillomino registers with the shared P3 size selector only',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-fillomino-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.fillomino=supported.slice()'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
});
