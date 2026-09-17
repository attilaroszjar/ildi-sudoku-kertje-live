'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const DF=require('../games/classic-human/dynamic-forcing-chain.js');
const FC=require('../games/classic-human/forcing-chain.js');

function blank(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}

function forcedFalseFixture(){
  const s=blank(),seed=cell(0,0);
  s.restrictMask(seed,mask(1,2));
  s.restrictMask(cell(0,1),mask(1));
  return {s,seed,digit:1};
}

function forcedTrueFixture(){
  const s=blank(),seed=cell(0,0);
  s.restrictMask(seed,mask(1,2));
  s.restrictMask(cell(0,1),mask(2));
  return {s,seed,digit:1};
}

test('dynamic forcing-chain seed scan is bounded to bivalue candidates',()=>{
  const s=blank();
  s.restrictMask(cell(0,0),mask(1,2));
  s.restrictMask(cell(0,1),mask(3,4));
  s.restrictMask(cell(0,2),mask(5,6,7));
  assert.deepEqual(DF.candidateSeeds(s,{candidateBudget:3}),[
    {cell:cell(0,0),digit:1},{cell:cell(0,0),digit:2},{cell:cell(0,1),digit:3}
  ]);
  assert.throws(()=>DF.candidateSeeds(s,{candidateBudget:0}),/1..16/);
  assert.throws(()=>DF.candidateSeeds(s,{candidateBudget:17}),/1..16/);
});

test('dynamic forcing-chain emits forced false from a contradictory true branch',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const d=DF.findDynamicForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:0,directSteps:4})[0];
  assert.ok(d);
  assert.equal(d.techniqueId,'dynamic-forcing-chain');
  assert.deepEqual(d.eliminations,[{cell:seed,digit}]);
  assert.equal(d.explanationData.result,'FORCED_FALSE');
});

test('dynamic forcing-chain emits forced true from a contradictory false branch',()=>{
  const {s,seed,digit}=forcedTrueFixture();
  const d=DF.findDynamicForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:0,directSteps:4})[0];
  assert.ok(d);
  assert.deepEqual(d.placements,[{cell:seed,digit}]);
  assert.equal(d.explanationData.result,'FORCED_TRUE');
});

test('dynamic forcing-chain passes nested hard bounds to the dynamic engine',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  assert.throws(()=>DF.findDynamicForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:7}),/0..6/);
  assert.throws(()=>DF.findDynamicForcingChain(s,{seeds:[{cell:seed,digit}],innerCandidateBudget:13}),/1..12/);
  assert.throws(()=>DF.findDynamicForcingChain(s,{seeds:[{cell:seed,digit}],innerSeedBudget:7}),/1..6/);
  assert.throws(()=>DF.findDynamicForcingChain(s,{seeds:[{cell:seed,digit}],innerSteps:25}),/0..24/);
});

test('dynamic forcing-chain with nesting disabled preserves simple forcing result',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const a=DF.findDynamicForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:0,directSteps:4})[0];
  const b=FC.findForcingChain(s,{seeds:[{cell:seed,digit}],maxSteps:4})[0];
  assert.deepEqual({p:a.placements,e:a.eliminations},{p:b.placements,e:b.eliminations});
});

test('dynamic forcing-chain output is deterministic',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const project=()=>DF.findDynamicForcingChain(s,{seeds:[{cell:seed,digit}],nestedSteps:1,directSteps:4,innerSteps:4}).map(d=>({p:d.placements,e:d.eliminations,r:d.explanationData.result}));
  assert.deepEqual(project(),project());
});
