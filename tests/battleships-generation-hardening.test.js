'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..'),ctx={console};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['games/sudoku-bank.js','games/sudoku-bank-iteration52.js','games/sudoku-generator.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const base=ctx.SudokuBank.find(v=>v.id==='battleships');
const problemSeeds=[6673,6770,6867,6964,7061];

test('Battleships generated fleets contain exactly the declared ten distinct ship cells',()=>{
  for(const seed of problemSeeds.concat([7158]))for(const difficulty of ['gentle','focused','expert']){
    const g=ctx.SudokuGenerator.make(base,seed,difficulty);
    const occupied=g.solution.flat().reduce((sum,v)=>sum+(v?1:0),0);
    const declared=g.puzzle.fleet.reduce((sum,len)=>sum+len,0);
    assert.equal(declared,10,'fleet declaration '+seed+' '+difficulty);
    assert.equal(occupied,declared,'distinct occupied cells '+seed+' '+difficulty);
    assert.equal(g.puzzle.rowClues.reduce((a,b)=>a+b,0),declared,'row clues '+seed+' '+difficulty);
    assert.equal(g.puzzle.colClues.reduce((a,b)=>a+b,0),declared,'column clues '+seed+' '+difficulty);
  }
});

test('Battleships exact solver rejects a fleet that can only fit by overlapping ships',()=>{
  const impossible={
    size:3,
    fleet:[2,2],
    rowClues:[2,0,0],
    colClues:[1,1,0],
    givens:[]
  };
  assert.equal(ctx.SudokuGenerator.countBattleshipSolutions(impossible,2),0);
});

test('Battleships problem seeds remain editable and preserve difficulty ordering',()=>{
  for(const seed of problemSeeds){
    const gentle=ctx.SudokuGenerator.make(base,seed,'gentle');
    const focused=ctx.SudokuGenerator.make(base,seed,'focused');
    const expert=ctx.SudokuGenerator.make(base,seed,'expert');
    for(const g of [gentle,focused,expert]){
      assert.equal(g.generation.unique,true,'unique '+seed);
      assert.equal(ctx.SudokuGenerator.countBattleshipSolutions(g.puzzle,2),1,'exact uniqueness '+seed);
      assert.ok(g.puzzle.givens.length<36,'editable '+seed);
    }
    assert.ok(gentle.puzzle.givens.length>focused.puzzle.givens.length,'gentle > focused '+seed);
    assert.ok(focused.puzzle.givens.length>expert.puzzle.givens.length,'focused > expert '+seed);
  }
});

test('Iteration 52 sibling generators do not fully reveal all cells across an audit seed matrix',()=>{
  for(const id of ['lits','heyawake']){
    const variant=ctx.SudokuBank.find(v=>v.id===id);
    for(const seed of [3,7,19,23,6673,6770,6867,6964,7061,7158])for(const difficulty of ['gentle','focused','expert']){
      const g=ctx.SudokuGenerator.make(variant,seed,difficulty);
      const starters=g.puzzle.starters||[];
      assert.ok(starters.length<g.puzzle.size*g.puzzle.size,id+' editable '+seed+' '+difficulty);
      assert.equal(g.generation.unique,true,id+' unique '+seed+' '+difficulty);
    }
  }
});

test('Battleships renderer exposes complete controls, state semantics and 44px mobile targets',()=>{
  const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
  assert.match(library,/clear-battleships-button/,'clear control');
  assert.match(library,/check-battleships-button/,'check control');
  assert.match(library,/battleshipStateLabel/,'localized empty\/ship\/water state labels');
  assert.match(library,/aria-label/,'cell state is exposed to assistive technology');
  assert.match(library,/aria-disabled/,'given cells are exposed as immutable');
  assert.doesNotMatch(css,/\.iteration52-cell\{min-width:42px;min-height:42px/,'mobile cells must not shrink below 44px');
});
