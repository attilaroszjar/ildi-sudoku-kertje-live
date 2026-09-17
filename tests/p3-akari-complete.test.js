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
    x==='games/p3-akari-complete.js'
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

function validateSolution(puzzle,solution){
  const n=puzzle.length;
  assert.equal(solution.length,n);
  assert.ok(solution.every(row=>row.length===n));

  const bulbs=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(solution[r][c]){
    assert.equal(puzzle[r][c],false,'bulb must be on white cell');
    bulbs.push([r,c]);
  }

  for(const [r,c] of bulbs){
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
      let rr=r+dr,cc=c+dc;
      while(rr>=0&&cc>=0&&rr<n&&cc<n&&puzzle[rr][cc]===false){
        assert.equal(solution[rr][cc],0,'bulbs may not see one another');
        rr+=dr;cc+=dc;
      }
    }
  }

  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(puzzle[r][c]===false){
    let lit=solution[r][c]===1;
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
      let rr=r+dr,cc=c+dc;
      while(!lit&&rr>=0&&cc>=0&&rr<n&&cc<n&&puzzle[rr][cc]===false){
        if(solution[rr][cc])lit=true;
        rr+=dr;cc+=dc;
      }
    }
    assert.ok(lit,'every white cell must be illuminated');
  }

  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(Number.isInteger(puzzle[r][c])){
    let count=0;
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const rr=r+dr,cc=c+dc;
      if(rr>=0&&cc>=0&&rr<n&&cc<n)count+=solution[rr][cc]?1:0;
    }
    assert.equal(count,puzzle[r][c],'numbered wall must match adjacent bulbs');
  }
}

test('Akari exposes solver-certified 5x5 through 9x9 sizes',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='akari');

  for(const n of [5,6,7,8,9]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x76000000+n)>>>0,'focused');
    assert.equal(g.puzzle.length,n);
    assert.ok(g.puzzle.every(row=>row.length===n));
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.variantEssential,true);
    assert.equal(g.generation.generatorFamily,'akari-multisize-procedural-wall-layout');
    validateSolution(g.puzzle,g.solution);
    assert.equal(G.countAkariSolutions(g.puzzle,2),1,`${n}x${n} exact uniqueness`);
  }
});

test('Akari multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='akari');
  variant.data.p3Size=9;

  const a=G.make(variant,0x76111111,'focused');
  const b=G.make(variant,0x76111111,'focused');
  const c=G.make(variant,0x76222222,'focused');

  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed must replay exact JSON content');
  assert.notEqual(JSON.stringify(a.puzzle),JSON.stringify(c.puzzle),'different seeds must vary wall topology/clues');
});

test('Akari difficulty is independent from board size and clue removal is ordered',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='akari');
  variant.data.p3Size=7;

  const gentle=G.make(variant,0x76333333,'gentle');
  const focused=G.make(variant,0x76333333,'focused');
  const expert=G.make(variant,0x76333333,'expert');

  for(const g of [gentle,focused,expert]){
    assert.equal(g.puzzle.length,7);
    assert.equal(G.countAkariSolutions(g.puzzle,2),1);
  }

  assert.ok(gentle.generation.clues>=focused.generation.clues);
  assert.ok(focused.generation.clues>=expert.generation.clues);
});

test('Akari registers with the shared P3 size selector only',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-akari-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.akari=supported.slice()'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
});
