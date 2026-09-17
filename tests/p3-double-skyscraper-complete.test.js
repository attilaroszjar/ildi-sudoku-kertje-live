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
    x==='games/sudoku-generator.js'
  );
  wanted.push('games/p3-double-skyscraper-complete.js');
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  return ctx;
}

function lineFor(grid,cl){
  let line=cl.axis==='row'?grid[cl.index].slice():grid.map(r=>r[cl.index]);
  if(cl.side==='right'||cl.side==='bottom')line.reverse();
  return line;
}
function visible(line){
  let max=0,count=0;
  for(const v of line)if(v>max){max=v;count++;}
  return count;
}
function validateEight(g){
  assert.equal(g.solution.length,8);
  assert.ok(g.solution.every(r=>r.length===8));
  assert.equal(g.data.maxDigit,4);
  assert.equal(g.data.inputMax,4);
  assert.equal(g.data.copiesPerLine,2);
  for(let r=0;r<8;r++)for(let d=1;d<=4;d++){
    assert.equal(g.solution[r].filter(v=>v===d).length,2,`row ${r} digit ${d} appears twice`);
  }
  for(let c=0;c<8;c++)for(let d=1;d<=4;d++){
    assert.equal(g.solution.map(r=>r[c]).filter(v=>v===d).length,2,`column ${c} digit ${d} appears twice`);
  }
  for(const cl of g.data.clues)assert.equal(visible(lineFor(g.solution,cl)),cl.count,'outside clue matches solution');
}

test('Double Skyscraper exposes solver-certified 8x8 support',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='double-skyscrapers');
  assert.ok(variant,'canonical Double Skyscraper exists');
  variant.data.p3Size=8;
  for(const seed of [0xD0800001,0xD0800002,0xD0800003]){
    const g=G.make(variant,seed,'focused');
    validateEight(g);
    assert.equal(g.generation.boardSize,8);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.variantEssential,true);
    assert.equal(G.countDoubleSkyscraperSolutions(g.puzzle,g,2,false),1,'8x8 exact variant uniqueness');
    assert.notEqual(G.countDoubleSkyscraperSolutions(g.puzzle,g,2,true),1,'outside clues remain essential');
  }
});

test('Double Skyscraper preserves the established 6x6 production path',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='double-skyscrapers');
  variant.data.p3Size=6;
  const g=G.make(variant,0xD0600001,'focused');
  assert.equal(g.solution.length,6);
  assert.notEqual(g.generation.generatorFamily,'double-skyscraper-8x8-repeated-latin');
  assert.equal(g.generation.unique,true);
  assert.equal(g.generation.variantEssential,true);
});

test('Double Skyscraper 8x8 is deterministic, seed-diverse and difficulty-independent from size',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='double-skyscrapers');
  variant.data.p3Size=8;
  const a=G.make(variant,0xD0811111,'focused');
  const b=G.make(variant,0xD0811111,'focused');
  const c=G.make(variant,0xD0822222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed replays exact JSON content');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds vary the solution');
  const givens=[];
  for(const difficulty of ['gentle','focused','expert']){
    const g=G.make(variant,0xD0833333,difficulty);
    assert.equal(g.solution.length,8);
    assert.equal(G.countDoubleSkyscraperSolutions(g.puzzle,g,2,false),1);
    givens.push(g.puzzle.flat().filter(Boolean).length);
  }
  assert.ok(givens[0]>=givens[1]&&givens[1]>=givens[2],'easier bands expose at least as many givens');
});

test('Double Skyscraper registers with the shared P3 size selector only',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-double-skyscraper-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes("root.IldiP3SizeSupport['double-skyscrapers']=supported.slice()"));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
  assert.ok(source.includes('for(var attempt=0;attempt<16;attempt++)'));
});
