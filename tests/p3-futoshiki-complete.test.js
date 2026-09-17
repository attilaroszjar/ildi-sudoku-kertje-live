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
  const wanted=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||x==='games/sudoku-generator.js'||x==='games/p3-futoshiki-complete.js');
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted){vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});}
  return ctx;
}

function validate(g){
  const n=g.puzzle.length;
  assert.equal(g.solution.length,n);
  const want=Array.from({length:n},(_,i)=>i+1).join(',');
  for(const row of g.solution)assert.equal([...row].sort((a,b)=>a-b).join(','),want,'row Latin');
  for(let c=0;c<n;c++)assert.equal(g.solution.map(r=>r[c]).sort((a,b)=>a-b).join(','),want,'column Latin');
  for(const q of g.data.inequalities){
    const a=g.solution[q.a[0]][q.a[1]],b=g.solution[q.b[0]][q.b[1]];
    assert.equal(q.op==='<'?a<b:a>b,true,'inequality must match solution');
  }
}

test('Futoshiki exposes solver-certified 4x4 through 8x8 sizes',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='futoshiki');
  for(const n of [4,5,6,7,8]){
    v.data.p3Size=n;
    const g=G.make(v,(0x75000000+n)>>>0,'focused');
    assert.equal(g.puzzle.length,n);
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.variantEssential,true);
    assert.equal(g.generation.generatorFamily,'futoshiki-multisize-latin-inequality-removal');
    validate(g);
    assert.equal(G.countFutoshikiSolutions(g.puzzle,g.data.inequalities,2,{}),1,`${n}x${n} exact uniqueness`);
  }
});

test('Futoshiki multi-size generation replays exactly and is seed-diverse',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='futoshiki');
  v.data.p3Size=8;
  const a=G.make(v,0x75111111,'focused');
  const b=G.make(v,0x75111111,'focused');
  const c=G.make(v,0x75222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed must replay exactly');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds must change the Latin solution');
  assert.notEqual(JSON.stringify(a.data.inequalities),JSON.stringify(c.data.inequalities),'different seeds must change inequality topology');
});

test('Futoshiki difficulty is independent from board size',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='futoshiki');
  v.data.p3Size=7;
  const gentle=G.make(v,0x75333333,'gentle');
  const focused=G.make(v,0x75333333,'focused');
  const expert=G.make(v,0x75333333,'expert');
  for(const g of [gentle,focused,expert]){
    assert.equal(g.puzzle.length,7);
    assert.equal(G.countFutoshikiSolutions(g.puzzle,g.data.inequalities,2,{}),1);
  }
  assert.ok(gentle.generation.clues>=focused.generation.clues);
  assert.ok(focused.generation.clues>=expert.generation.clues);
  assert.ok(gentle.generation.inequalityCount>=focused.generation.inequalityCount);
  assert.ok(focused.generation.inequalityCount>=expert.generation.inequalityCount);
});

test('Futoshiki runtime is dimension-driven and has a dedicated size selector',()=>{
  const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  const hardening=fs.readFileSync(path.join(root,'games/p3-futoshiki-complete.js'),'utf8');
  assert.ok(library.includes('var n=v.puzzle.length'));
  assert.ok(hardening.includes('var supported=[4,5,6,7,8]'));
  assert.ok(hardening.includes("select.id='futoshiki-size-select'"));
  assert.ok(hardening.includes('inputMax:size'));
});

test('Futoshiki canonical Expert is locally irreducible across givens and inequalities',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='futoshiki');
  v.data.p3Size=6;
  const g=G.make(v,97001,'expert');
  assert.equal(G.countFutoshikiSolutions(g.puzzle,g.data.inequalities,2,{}),1);
  for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(g.puzzle[r][c]){
    const puzzle=JSON.parse(JSON.stringify(g.puzzle));puzzle[r][c]=0;
    assert.notEqual(G.countFutoshikiSolutions(puzzle,g.data.inequalities,2,{}),1,`given ${r},${c} must be necessary`);
  }
  for(let i=0;i<g.data.inequalities.length;i++){
    const inequalities=JSON.parse(JSON.stringify(g.data.inequalities));inequalities.splice(i,1);
    assert.notEqual(G.countFutoshikiSolutions(g.puzzle,inequalities,2,{}),1,`inequality ${i} must be necessary`);
  }
  assert.equal(g.generation.policy,'contract-driven-local-irreducibility');
  assert.equal(g.generation.locallyIrreducibleUnderProductionContract,true);
  assert.equal(g.generation.clues,5);
  assert.equal(g.generation.inequalityCount,10);
});

test('Futoshiki Gentle and Focused canonical candidates remain byte-stable',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='futoshiki');
  v.data.p3Size=6;
  const expected={
    gentle:'7176afd62a17255287b1d902f0266b173814e5b7fc9ef1144d960d4b30a6ac27',
    focused:'75c5d4168ada6689a44311bbfcc90bb5b82e77830a466eff6d9c3966b76bfd41'
  };
  for(const difficulty of Object.keys(expected)){
    const g=G.make(v,97001,difficulty);
    const payload=JSON.stringify({puzzle:g.puzzle,solution:g.solution,inequalities:g.data.inequalities,generation:g.generation});
    assert.equal(crypto.createHash('sha256').update(payload).digest('hex'),expected[difficulty]);
  }
});
