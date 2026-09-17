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
  const wanted=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||x==='games/sudoku-generator.js'||x==='games/p3-hitori-complete.js');
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted){vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});}
  return ctx;
}

function connectedWhite(mask){
  const n=mask.length;let start=null,total=0;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!mask[r][c]){total++;if(!start)start=[r,c];}
  if(!start)return false;
  const seen=new Set([start.join(',')]),q=[start];
  while(q.length){const [r,c]=q.shift();for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc,k=rr+','+cc;if(rr>=0&&cc>=0&&rr<n&&cc<n&&!mask[rr][cc]&&!seen.has(k)){seen.add(k);q.push([rr,cc]);}}}
  return seen.size===total;
}

function validate(g){
  const p=g.puzzle,s=g.solution,n=p.length;
  assert.equal(n,g.generation.boardSize);
  assert.equal(s.length,n);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(s[r][c]){
    if(r+1<n)assert.notEqual(s[r+1][c],1,'black cells may not touch vertically');
    if(c+1<n)assert.notEqual(s[r][c+1],1,'black cells may not touch horizontally');
  }
  for(let r=0;r<n;r++){const seen=new Set();for(let c=0;c<n;c++)if(!s[r][c]){assert.ok(!seen.has(p[r][c]),'white row values must be unique');seen.add(p[r][c]);}}
  for(let c=0;c<n;c++){const seen=new Set();for(let r=0;r<n;r++)if(!s[r][c]){assert.ok(!seen.has(p[r][c]),'white column values must be unique');seen.add(p[r][c]);}}
  assert.equal(connectedWhite(s.map(row=>row.map(Boolean))),true,'white cells connected');
}

test('Hitori exposes solver-certified 5x5 through 9x9 sizes',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='hitori');
  for(const n of [5,6,7,8,9]){
    v.data.p3Size=n;
    const g=G.make(v,(0x74000000+n)>>>0,'focused');
    assert.equal(g.puzzle.length,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.variantEssential,true);
    assert.equal(g.generation.generatorFamily,'hitori-multisize-latin-duplicate-mask');
    validate(g);
    assert.equal(G.countHitoriSolutions(g.puzzle,2,{}),1,`${n}x${n} exact uniqueness`);
  }
});

test('Hitori multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='hitori');
  v.data.p3Size=9;
  const a=G.make(v,0x74111111,'focused');
  const b=G.make(v,0x74111111,'focused');
  const c=G.make(v,0x74222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed must replay exactly');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds must change Hitori mask topology');
});

test('Hitori difficulty is independent of size and ordered by measured solver effort',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='hitori');
  v.data.p3Size=8;
  const gentle=G.make(v,0x74333333,'gentle');
  const focused=G.make(v,0x74333333,'focused');
  const expert=G.make(v,0x74333333,'expert');
  for(const g of [gentle,focused,expert]){assert.equal(g.puzzle.length,8);assert.equal(G.countHitoriSolutions(g.puzzle,2,{}),1);}
  assert.ok(gentle.generation.difficultyScore<=focused.generation.difficultyScore);
  assert.ok(focused.generation.difficultyScore<=expert.generation.difficultyScore);
});

test('Hitori runtime is dimension-driven and has a dedicated size selector',()=>{
  const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  const hardening=fs.readFileSync(path.join(root,'games/p3-hitori-complete.js'),'utf8');
  assert.ok(library.includes('var n=v.puzzle.length'));
  assert.ok(hardening.includes('var supported=[5,6,7,8,9]'));
  assert.ok(hardening.includes("select.id='hitori-size-select'"));
  assert.ok(hardening.includes("variant.data.p3Size=size"));
});

test('Hitori Expert declares its complete-grid non-carvable playability contract',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='hitori');
  v.data.p3Size=6;
  const g=G.make(v,99001,'expert');
  assert.equal(G.countHitoriSolutions(g.puzzle,2,{}),1);
  assert.equal(g.puzzle.flat().length,36);
  assert.ok(g.puzzle.flat().every(value=>Number.isInteger(value)&&value>=1&&value<=6));
  assert.equal(g.generation.startingAnswerCount,0);
  assert.equal(g.generation.policy,'complete-grid-symbol-topology');
  assert.equal(g.generation.removableAtomPolicy,'none-complete-grid-is-puzzle-definition');
  assert.equal(g.generation.localIrreducibilityApplicability,'not-applicable-complete-grid-definition');
});

test('Hitori Gentle and Focused canonical candidates remain byte-stable',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='hitori');
  v.data.p3Size=6;
  const expected={
    gentle:'fb5e208070f1482e6082449c3ad9f6be389dbca2dcfa37d3db142ecbc911a0fe',
    focused:'f5328693c94110c5787ebcd410f8e56f9ef7ba2f0bcb0766a25b230b5faf2c17'
  };
  for(const difficulty of Object.keys(expected)){
    const g=G.make(v,99001,difficulty);
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(g)).digest('hex'),expected[difficulty]);
  }
});
