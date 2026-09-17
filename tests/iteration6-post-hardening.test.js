'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
require('../games/sudoku-bank.js');
require('../games/sudoku-bank-iteration2.js');
require('../games/sudoku-bank-iteration3.js');
require('../games/sudoku-bank-iteration4.js');
require('../games/sudoku-bank-iteration5.js');
require('../games/sudoku-bank-iteration6.js');
require('../games/sudoku-generator.js');
require('../games/extra-house-generator-core.js');
require('../games/diagonal-generator-hardening.js');
require('../games/iteration4-generator-hardening.js');
require('../games/iteration5-generator-hardening.js');
require('../games/iteration6-generator-hardening.js');
const bank=global.SudokuBank,gen=global.SudokuGenerator;
const variant=id=>bank.find(v=>v.id===id);

function antiQueenValid(grid,digit){
  const cells=[];
  for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(grid[r][c]===digit)cells.push([r,c]);
  for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++){
    assert.notEqual(Math.abs(cells[i][0]-cells[j][0]),Math.abs(cells[i][1]-cells[j][1]),'queen diagonal');
  }
}
function quadSumsValid(v,grid){
  for(const q of v.data.quadSums){
    const vals=[[q[0]-1,q[1]-1],[q[0]-1,q[1]],[q[0],q[1]-1],[q[0],q[1]]].map(([r,c])=>grid[r][c]);
    const total=vals.reduce((a,b)=>a+b,0);
    assert.ok(vals.some(x=>2*x===total),'quad sum '+q.join(','));
  }
}

test('Iteration 6 solutions satisfy their full variant rules',()=>{
  const aq=variant('anti-queen-9'),qs=variant('quad-sums');
  antiQueenValid(aq.solution,aq.data.digit||9);
  quadSumsValid(qs,qs.solution);
});

test('Iteration 6 generation is deterministic, seed-diverse, unique and variant-essential',()=>{
  for(const id of ['anti-queen-9','quad-sums']){
    const v=variant(id),a=gen.make(v,601,'focused'),b=gen.make(v,601,'focused'),c=gen.make(v,602,'focused');
    assert.deepEqual(a.puzzle,b.puzzle,id+' deterministic');
    assert.notDeepEqual(a.puzzle,c.puzzle,id+' seed-diverse');
    assert.equal(a.generation.unique,true,id+' unique');
    assert.equal(a.generation.variantEssential,true,id+' essential metadata');
    assert.equal(gen.countVariantSolutions(a.puzzle,a,2),1,id+' variant uniqueness');
    assert.ok(gen.countSolutions(a.puzzle,2)>1,id+' classic baseline must be ambiguous');
  }
});

test('Iteration 6 difficulty is clue-ordered and carries measured search evidence',()=>{
  for(const id of ['anti-queen-9','quad-sums']){
    const v=variant(id),outs=['gentle','focused','expert'].map(d=>gen.make(v,606,d));
    assert.ok(outs[0].generation.clues>=outs[1].generation.clues,id+' gentle/focused clues');
    assert.ok(outs[1].generation.clues>=outs[2].generation.clues,id+' focused/expert clues');
    for(const out of outs){
      assert.ok(Number.isFinite(out.generation.difficultyScore)&&out.generation.difficultyScore>0,id+' measured difficulty');
      assert.ok(out.generation.searchStats&&Number.isFinite(out.generation.searchStats.nodes),id+' search stats');
    }
  }
});

test('Anti-Queen and Quad Sums runtime enforcement and visual clue hooks are present',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../games/sudoku-library.js'),'utf8');
  assert.match(source,/v\.kind==='anti-queen'.*Math\.abs\(i-r\)===Math\.abs\(j-c\)/s,'anti-queen runtime conflict');
  assert.match(source,/v\.kind==='quadsums'.*z\*2===total/s,'quad-sums runtime conflict');
  assert.match(source,/sudoku-quad-sum-marker/,'quad-sums visual markers');
});
