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
    x==='games/p3-skyscraper-complete.js'
  );
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  return ctx;
}

function visible(line){let hi=0,count=0;for(const v of line)if(v>hi){hi=v;count++;}return count;}
function validateLatin(g){
  const n=g.puzzle.length,sol=g.solution,target=Array.from({length:n},(_,i)=>i+1).join(',');
  assert.equal(sol.length,n);
  for(let r=0;r<n;r++)assert.equal([...sol[r]].sort((a,b)=>a-b).join(','),target,'row is 1..n');
  for(let c=0;c<n;c++)assert.equal(sol.map(row=>row[c]).sort((a,b)=>a-b).join(','),target,'column is 1..n');
  for(const cl of g.data.clues){
    let line=cl.axis==='row'?[...sol[cl.index]]:sol.map(row=>row[cl.index]);
    if(cl.side==='right'||cl.side==='bottom')line.reverse();
    assert.equal(visible(line),cl.count,'outside visibility clue matches solution');
  }
}

function validateDistributedPuzzle(g){
  const n=g.puzzle.length;
  const rowBlankCounts=g.puzzle.map(row=>row.filter(v=>!v).length);
  const colBlankCounts=Array.from({length:n},(_,c)=>g.puzzle.reduce((sum,row)=>sum+(row[c]?0:1),0));
  assert.ok(rowBlankCounts.every(count=>count>=1&&count<n),'every row has both givens and empty cells');
  assert.ok(colBlankCounts.every(count=>count>=1&&count<n),'every column has both givens and empty cells');
  assert.deepEqual(Array.from(g.generation.rowBlankCounts),rowBlankCounts,'row carving metadata matches puzzle');
  assert.deepEqual(Array.from(g.generation.colBlankCounts),colBlankCounts,'column carving metadata matches puzzle');
  assert.equal(g.generation.blankCells.length,rowBlankCounts.reduce((a,b)=>a+b,0));
  assert.ok(g.generation.blankCells.length>=g.generation.targetBlanks,'carving reaches requested density before variant-essential stop');
  assert.equal('blankLines' in g.generation,false,'legacy whole-line carving metadata is gone');
  assert.equal('blanksPerLine' in g.generation,false,'rigid per-line carving metadata is gone');
}

test('Classic Skyscraper exposes solver-certified 7x7 and 8x8 sizes',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='skyscraper');
  assert.ok(variant);
  for(const n of [7,8]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x7a000000+n)>>>0,'focused');
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.variantEssential,true);
    assert.equal(g.generation.generatorFamily,'skyscraper-p3-latin-visibility');
    assert.equal(g.data.latinOnly,true);
    validateLatin(g);
    validateDistributedPuzzle(g);
    assert.equal(G.countP3SkyscraperSolutions(g.puzzle,g.data.clues,2,{},false),1,`${n}x${n} exact variant uniqueness`);
    assert.ok(G.countP3SkyscraperSolutions(g.puzzle,g.data.clues,2,{},true)>1,`${n}x${n} outside clues are essential`);
  }
});

test('Classic Skyscraper 9x9 keeps the established P2 production path',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='skyscraper');
  variant.data.p3Size=9;
  const g=G.make(variant,0x7a999999,'expert');
  assert.equal(g.puzzle.length,9);
  assert.equal(g.solution.length,9);
  assert.notEqual(g.generation&&g.generation.generatorFamily,'skyscraper-p3-latin-visibility');
});

test('Classic Skyscraper multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='skyscraper');
  variant.data.p3Size=8;
  const a=G.make(variant,0x7a111111,'focused');
  const b=G.make(variant,0x7a111111,'focused');
  const c=G.make(variant,0x7a222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed replays exact content');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds vary Latin solution structure');
  validateDistributedPuzzle(a);
  validateDistributedPuzzle(c);
});

test('Classic Skyscraper size remains independent from difficulty',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='skyscraper');
  variant.data.p3Size=7;
  for(const difficulty of ['gentle','focused','expert']){
    const g=G.make(variant,0x7a333333,difficulty);
    assert.equal(g.generation.boardSize,7);
    validateDistributedPuzzle(g);
    assert.equal(G.countP3SkyscraperSolutions(g.puzzle,g.data.clues,2,{},false),1);
    assert.ok(G.countP3SkyscraperSolutions(g.puzzle,g.data.clues,2,{},true)>1);
  }
});

test('Classic Skyscraper registers with the shared P3 size selector only',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-skyscraper-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.skyscraper=supported.slice()'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
});

test('shared P3 size control reserves action width and keeps action labels unbroken',()=>{
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'assets/p3-size-control.css'),'utf8');
  assert.ok(control.includes("classList.toggle('has-p3-size',!!active)"));
  assert.match(css,/\.control-deck\.has-p3-size\s+\.deck-actions\s+\.button\{[^}]*white-space:nowrap/);
  assert.match(css,/@media\(min-width:1281px\)\{\s*\.control-deck\.has-p3-size\{[^}]*minmax\(520px,1\.35fr\)/);
});
