'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../games/sudoku-bank.js');
require('../games/sudoku-bank-iteration2.js');
require('../games/sudoku-bank-iteration3.js');
require('../games/sudoku-bank-iteration4.js');
require('../games/sudoku-bank-iteration5.js');
require('../games/sudoku-generator.js');
require('../games/iteration5-generator-hardening.js');
const bank=global.SudokuBank,gen=global.SudokuGenerator;
const variant=id=>bank.find(v=>v.id===id);

function validGrid(g,bh,bw){
  const n=g.length,want=new Set(Array.from({length:n},(_,i)=>i+1));
  for(let r=0;r<n;r++)assert.deepEqual(new Set(g[r]),want,'row '+r);
  for(let c=0;c<n;c++)assert.deepEqual(new Set(g.map(row=>row[c])),want,'col '+c);
  for(let br=0;br<n;br+=bh)for(let bc=0;bc<n;bc+=bw){const vals=[];for(let r=br;r<br+bh;r++)for(let c=bc;c<bc+bw;c++)vals.push(g[r][c]);assert.deepEqual(new Set(vals),want,'box '+br+','+bc);}
}

test('12x12 and 16x16 generated boards are deterministic, seed-diverse and uniquely solvable',()=>{
  for(const [id,bh,bw] of [['sudoku-12x12',3,4],['sudoku-16x16',4,4]]){
    const v=variant(id),a=gen.make(v,101,'focused'),b=gen.make(v,101,'focused'),c=gen.make(v,102,'focused');
    assert.deepEqual(a.puzzle,b.puzzle,id+' deterministic puzzle');
    assert.deepEqual(a.solution,b.solution,id+' deterministic solution');
    assert.notDeepEqual(a.solution,c.solution,id+' seed-diverse solution');
    assert.equal(a.generation.unique,true,id+' unique metadata');
    assert.equal(gen.countSolutions(a.puzzle,2),1,id+' solver uniqueness');
    validGrid(a.solution,bh,bw);
  }
});

test('large Sudoku difficulty is ordered and exposes measured search effort',()=>{
  for(const id of ['sudoku-12x12','sudoku-16x16']){
    const v=variant(id),outs=['gentle','focused','expert'].map(d=>gen.make(v,303,d));
    assert.ok(outs[0].generation.clues>outs[1].generation.clues,id+' gentle/focused clues');
    assert.ok(outs[1].generation.clues>outs[2].generation.clues,id+' focused/expert clues');
    for(const out of outs)assert.ok(Number.isFinite(out.generation.difficultyScore)&&out.generation.difficultyScore>0,id+' measured difficulty');
  }
});

test('Sukaku candidate contract is deterministic, nontrivial and solution-compatible',()=>{
  const v=variant('sukaku'),a=gen.make(v,98765,'focused'),b=gen.make(v,98765,'focused'),c=gen.make(v,98766,'focused');
  assert.deepEqual(a.data.candidates,b.data.candidates,'deterministic candidates');
  assert.notDeepEqual(a.data.sourcePuzzle,c.data.sourcePuzzle,'seed-diverse source puzzle');
  assert.equal(a.puzzle.flat().filter(Boolean).length,0,'visible Sukaku puzzle is candidate-only');
  assert.equal(gen.countSolutions(a.data.sourcePuzzle,2),1,'source puzzle unique');
  let multi=0;
  for(let r=0;r<9;r++)for(let col=0;col<9;col++){
    const candidates=a.data.candidates[r][col];
    assert.ok(Array.isArray(candidates)&&candidates.length>=1,'candidate set '+r+','+col);
    assert.ok(candidates.includes(a.solution[r][col]),'solution candidate '+r+','+col);
    if(candidates.length>1)multi++;
  }
  assert.ok(multi>=10,'Sukaku must contain meaningful non-singleton candidate cells');
});

test('12x12 runtime conflict geometry uses 3x4 boxes',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../games/sudoku-library.js'),'utf8');
  const start=source.indexOf('function classicConflict');
  const end=source.indexOf('function ',start+20);
  const body=source.slice(start,end<0?start+2500:end);
  assert.match(body,/n===12\s*\?\s*\[3,4\]/,'classicConflict must use canonical 3x4 boxes for 12x12');
});
