'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const FC=require('../games/classic-human/forcing-chain.js');

function stateFrom(rows){return new S.ClassicHumanState(rows);}
function blank(){return stateFrom(Array.from({length:9},()=>Array(9).fill(0)));}
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

test('forcing-chain seed scan is limited to bivalue cells and candidate budget',()=>{
  const s=blank();
  s.restrictMask(cell(0,0),mask(1,2));
  s.restrictMask(cell(0,1),mask(3,4));
  s.restrictMask(cell(0,2),mask(5,6,7));
  const seeds=FC.candidateSeeds(s,{candidateBudget:3});
  assert.deepEqual(seeds,[{cell:cell(0,0),digit:1},{cell:cell(0,0),digit:2},{cell:cell(0,1),digit:3}]);
});

test('forcing-chain candidate budget is hard bounded',()=>{
  const s=blank();
  assert.throws(()=>FC.candidateSeeds(s,{candidateBudget:0}),/1..24/);
  assert.throws(()=>FC.candidateSeeds(s,{candidateBudget:25}),/1..24/);
});

test('forcing-chain emits forced false from a contradictory true branch',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const d=FC.findForcingChain(s,{seeds:[{cell:seed,digit}],maxSteps:8})[0];
  assert.ok(d);
  assert.equal(d.techniqueId,'forcing-chain');
  assert.deepEqual(d.eliminations,[{cell:seed,digit}]);
  assert.equal(d.explanationData.result,'FORCED_FALSE');
});

test('forcing-chain emits forced true from a contradictory false branch',()=>{
  const {s,seed,digit}=forcedTrueFixture();
  const d=FC.findForcingChain(s,{seeds:[{cell:seed,digit}],maxSteps:8})[0];
  assert.ok(d);
  assert.deepEqual(d.placements,[{cell:seed,digit}]);
  assert.equal(d.explanationData.result,'FORCED_TRUE');
});

test('forcing-chain passes propagation bound to the branch engine',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  assert.throws(()=>FC.findForcingChain(s,{seeds:[{cell:seed,digit}],maxSteps:33}),/0..32/);
});

test('forcing-chain output is deterministic',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const project=()=>FC.findForcingChain(s,{seeds:[{cell:seed,digit}],maxSteps:8}).map(d=>({p:d.placements,e:d.eliminations,r:d.explanationData.result}));
  assert.deepEqual(project(),project());
});
