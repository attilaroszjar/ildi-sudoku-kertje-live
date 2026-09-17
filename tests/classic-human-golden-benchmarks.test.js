'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../games/classic-human/contracts.js');

const MIGRATION=path.resolve(__dirname,'../server/brutal-search/migrations/005_classic_human_golden_benchmarks.sql');
const GOLDENS=Object.freeze([
  Object.freeze({
    key:'ai-escargot-2006',
    puzzle:'100007090030020008009600500005300900010080002600004000300000010040000007007000300',
    clues:23,
  }),
  Object.freeze({
    key:'inkala-2012',
    puzzle:'800000000003600000070090200050007000000045700000100030001000068008500010090000400',
    clues:21,
  }),
]);

function clueCount(puzzle){return puzzle.replace(/0/g,'').length;}

test('golden benchmark migration contains the two immutable external reference grids',()=>{
  const sql=fs.readFileSync(MIGRATION,'utf8');
  for(const golden of GOLDENS){
    assert.match(sql,new RegExp(golden.key));
    assert.match(sql,new RegExp(golden.puzzle));
    assert.equal(golden.puzzle.length,81);
    assert.equal(clueCount(golden.puzzle),golden.clues);
  }
  assert.match(sql,/calibration\.classic_human_golden_benchmarks/);
  assert.match(sql,/audit\.classic_human_golden_runs/);
});

test('golden external reference grids are valid and exactly unique',()=>{
  for(const golden of GOLDENS){
    const state=new C.ClassicCandidateState(golden.puzzle);
    assert.equal(state.valid,true,golden.key);
    assert.equal(C.countSolutions(golden.puzzle,2),1,golden.key);
  }
});
