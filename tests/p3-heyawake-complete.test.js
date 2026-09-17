'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');

const root=path.resolve(__dirname,'..');

function load(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
  const wanted=refs.filter(x=>
    /^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||
    x==='games/sudoku-generator.js'||
    x==='games/p3-heyawake-complete.js'
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

function validSolution(puzzle,solution){
  const n=puzzle.size;
  assert.equal(solution.length,n);
  assert.ok(solution.every(row=>row.length===n));

  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(solution[r][c]){
    if(r+1<n)assert.notEqual(solution[r+1][c],1,'black cells cannot touch vertically');
    if(c+1<n)assert.notEqual(solution[r][c+1],1,'black cells cannot touch horizontally');
  }

  const white=[];
  const set=new Set();
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!solution[r][c]){
    white.push([r,c]);set.add(r+','+c);
  }
  assert.ok(white.length>0);
  const q=[white[0]],seen=new Set([white[0].join(',')]);
  while(q.length){
    const [r,c]=q.pop();
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const rr=r+dr,cc=c+dc,k=rr+','+cc;
      if(set.has(k)&&!seen.has(k)){seen.add(k);q.push([rr,cc]);}
    }
  }
  assert.equal(seen.size,white.length,'white cells must be connected');

  for(const [id,target] of Object.entries(puzzle.roomClues)){
    let count=0;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(String(puzzle.regions[r][c])===id&&solution[r][c])count++;
    assert.equal(count,target,'room clue must equal black count');
  }

  for(let r=0;r<n;r++){
    let rooms=[];
    for(let c=0;c<n;c++){
      if(solution[r][c])rooms=[];
      else{
        const id=puzzle.regions[r][c];
        if(!rooms.length||rooms[rooms.length-1]!==id)rooms.push(id);
        assert.ok(rooms.length<=2,'white run may not cross three rooms');
      }
    }
  }
  for(let c=0;c<n;c++){
    let rooms=[];
    for(let r=0;r<n;r++){
      if(solution[r][c])rooms=[];
      else{
        const id=puzzle.regions[r][c];
        if(!rooms.length||rooms[rooms.length-1]!==id)rooms.push(id);
        assert.ok(rooms.length<=2,'white run may not cross three rooms');
      }
    }
  }
}

test('Heyawake exposes solver-certified 5x5 through 9x9 sizes',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='heyawake');
  for(const n of [5,6,7,8,9]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x75000000+n)>>>0,'focused');
    assert.equal(g.puzzle.size,n);
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.variantEssential,true);
    assert.equal(g.generation.generatorFamily,'heyawake-multisize-room-partition');
    validSolution(g.puzzle,g.solution);
    assert.equal(G.countHeyawakeSolutions(g.puzzle,2,{}),1,`${n}x${n} exact uniqueness`);
  }
});

test('Heyawake multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='heyawake');
  variant.data.p3Size=9;
  const a=G.make(variant,0x75111111,'focused');
  const b=G.make(variant,0x75111111,'focused');
  const c=G.make(variant,0x75222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed must replay exact JSON content');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds must vary solution topology');
});

test('Heyawake difficulty is independent from board size',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='heyawake');
  variant.data.p3Size=7;
  for(const difficulty of ['gentle','focused','expert']){
    const g=G.make(variant,0x75333333,difficulty);
    assert.equal(g.puzzle.size,7);
    assert.equal(G.countHeyawakeSolutions(g.puzzle,2,{}),1);
  }
});

test('Heyawake registers with the shared P3 size selector only',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-heyawake-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.heyawake=supported.slice()'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
});

test('Heyawake canonical Expert is locally irreducible across starters and room clues',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='heyawake');
  variant.data.p3Size=6;
  const g=G.make(variant,98001,'expert');
  assert.equal(G.countHeyawakeSolutions(g.puzzle,2,{}),1);
  for(let i=0;i<g.puzzle.starters.length;i++){
    const puzzle=JSON.parse(JSON.stringify(g.puzzle));puzzle.starters.splice(i,1);
    assert.notEqual(G.countHeyawakeSolutions(puzzle,2,{}),1,`starter ${i} must be necessary`);
  }
  for(const id of Object.keys(g.puzzle.roomClues))if(g.puzzle.roomClues[id]!=null){
    const puzzle=JSON.parse(JSON.stringify(g.puzzle));puzzle.roomClues[id]=null;
    assert.notEqual(G.countHeyawakeSolutions(puzzle,2,{}),1,`room clue ${id} must be necessary`);
  }
  assert.equal(g.generation.policy,'contract-driven-local-irreducibility');
  assert.equal(g.generation.locallyIrreducibleUnderProductionContract,true);
  assert.equal(g.generation.starterCount,11);
  assert.equal(g.generation.roomClueCount,4);
});

test('Heyawake Gentle and Focused canonical candidates remain byte-stable',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='heyawake');
  variant.data.p3Size=6;
  const expected={
    gentle:'b2a4e51b35b2b7293613f273db903d6e94fd4fb2a616ce4e2192a7ca70da19d3',
    focused:'8fb65d6d1d6959d0fee24ed4e97add19e9f70e392818ccb91ec6a40385a48813'
  };
  for(const difficulty of Object.keys(expected)){
    const g=G.make(variant,98001,difficulty);
    const payload=JSON.stringify({puzzle:g.puzzle,solution:g.solution,generation:g.generation});
    assert.equal(crypto.createHash('sha256').update(payload).digest('hex'),expected[difficulty]);
  }
});

test('Heyawake renderer omits absent room clues instead of printing null',()=>{
  const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.ok(library.includes('if(roomClue==null)continue'));
});
