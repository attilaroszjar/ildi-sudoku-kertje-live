'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const N=require('../games/classic-human/nested-forcing.js');
const NF=require('../games/classic-human/nested-forcing-chain.js');

function blank(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}

function forcedFalseFixture(){
  const s=blank(),seed=cell(0,0),peer=cell(0,1);
  s.restrictMask(seed,mask(1,2));
  s.restrictMask(peer,mask(1));
  return {s,seed,digit:1};
}
function forcedTrueFixture(){
  const s=blank(),seed=cell(0,0),peer=cell(0,1);
  s.restrictMask(seed,mask(1,2));
  s.restrictMask(peer,mask(2));
  return {s,seed,digit:1};
}

test('nested forcing-chain seed scan is bounded to bivalue candidates',()=>{
  const s=blank();
  s.restrictMask(cell(0,0),mask(1,2));
  s.restrictMask(cell(0,1),mask(3,4));
  s.restrictMask(cell(0,2),mask(5,6,7));
  const seeds=NF.candidateSeeds(s,{candidateBudget:3});
  assert.deepEqual(seeds,[{cell:cell(0,0),digit:1},{cell:cell(0,0),digit:2},{cell:cell(0,1),digit:3}]);
  assert.throws(()=>NF.candidateSeeds(s,{candidateBudget:13}),/1..12/);
});

test('nested forcing branch shares a hard work budget across binary analysis',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const r=N.analyzeNestedBinary(s,seed,digit,{nestedSteps:2,workBudget:1,dynamicCandidateBudget:2,dynamicNestedSteps:1,dynamicInnerSteps:4,directSteps:2});
  assert.ok(r.workUsed<=1);
});

test('nested forcing-chain emits forced false from a contradictory true branch',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const d=NF.findNestedForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:0,workBudget:1})[0];
  assert.ok(d);
  assert.equal(d.techniqueId,'nested-forcing-chain');
  assert.deepEqual(d.eliminations,[{cell:seed,digit}]);
  assert.equal(d.explanationData.result,'FORCED_FALSE');
});

test('nested forcing-chain emits forced true from a contradictory false branch',()=>{
  const {s,seed,digit}=forcedTrueFixture();
  const d=NF.findNestedForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:0,workBudget:1})[0];
  assert.ok(d);
  assert.deepEqual(d.placements,[{cell:seed,digit}]);
  assert.equal(d.explanationData.result,'FORCED_TRUE');
});

test('nested forcing hard bounds nesting and global work',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  assert.throws(()=>NF.findNestedForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:3}),/0..2/);
  assert.throws(()=>NF.findNestedForcingChain(s,{seeds:[{cell:seed,digit}],workBudget:13}),/1..12/);
});

test('nested forcing-chain with nesting disabled preserves dynamic forcing result',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const d=NF.findNestedForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:0,workBudget:1})[0];
  assert.deepEqual(d.eliminations,[{cell:seed,digit}]);
});

test('nested forcing-chain output is deterministic',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const project=()=>NF.findNestedForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:0,workBudget:1}).map(d=>({p:d.placements,e:d.eliminations,r:d.explanationData.result,w:d.complexity.workUsed}));
  assert.deepEqual(project(),project());
});
