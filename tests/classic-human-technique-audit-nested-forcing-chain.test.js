'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const N=require('../games/classic-human/nested-forcing.js');
const NFC=require('../games/classic-human/nested-forcing-chain.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function snapshot(s){return {grid:s.cloneGrid(),masks:Array.from(s.masks),valid:s.valid,steps:s.steps.map(C.deductionStateKey)};}

test('nested forcing seeds are deterministic, bivalue-only and budget bounded',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(3,4));
  s.restrictMask(2,maskOf(5,6,7));
  const seeds=NFC.candidateSeeds(s,{candidateBudget:3});
  assert.deepEqual(seeds,[{cell:0,digit:1},{cell:0,digit:2},{cell:1,digit:3}]);
  assert.deepEqual(NFC.candidateSeeds(s,{candidateBudget:3}),seeds);
  assert.throws(()=>NFC.candidateSeeds(s,{candidateBudget:0}),/1\.\.12/);
  assert.throws(()=>NFC.candidateSeeds(s,{candidateBudget:13}),/1\.\.12/);
});

test('nested branch runs on a clone and zero nesting preserves source state',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const before=snapshot(s);
  const r=N.runNestedBranch(s,{cell:0,digit:1,value:true},{directSteps:0,nestedSteps:0,dynamicCandidateBudget:1,dynamicNestedSteps:0,dynamicInnerSteps:0,workBudget:1});
  assert.equal(r.status,'STABLE');
  assert.equal(r.state.grid[0][0],1);
  assert.equal(r.directUsed,0);
  assert.equal(r.nestedUsed,0);
  assert.equal(r.workUsed,0);
  assert.deepEqual(snapshot(s),before);
  assert.notEqual(r.state,s);
});

test('nested forcing validates every hard search budget',()=>{
  const s=blankState(),a={cell:0,digit:1,value:true};
  assert.throws(()=>N.runNestedBranch(s,a,{directSteps:-1}),/directSteps must be 0\.\.32/);
  assert.throws(()=>N.runNestedBranch(s,a,{directSteps:33}),/directSteps must be 0\.\.32/);
  assert.throws(()=>N.runNestedBranch(s,a,{nestedSteps:-1}),/nestedSteps must be 0\.\.2/);
  assert.throws(()=>N.runNestedBranch(s,a,{nestedSteps:3}),/nestedSteps must be 0\.\.2/);
  assert.throws(()=>N.runNestedBranch(s,a,{dynamicCandidateBudget:0}),/dynamicCandidateBudget must be 1\.\.8/);
  assert.throws(()=>N.runNestedBranch(s,a,{dynamicCandidateBudget:9}),/dynamicCandidateBudget must be 1\.\.8/);
  assert.throws(()=>N.runNestedBranch(s,a,{dynamicNestedSteps:-1}),/dynamicNestedSteps must be 0\.\.4/);
  assert.throws(()=>N.runNestedBranch(s,a,{dynamicNestedSteps:5}),/dynamicNestedSteps must be 0\.\.4/);
  assert.throws(()=>N.runNestedBranch(s,a,{dynamicInnerSteps:-1}),/dynamicInnerSteps must be 0\.\.16/);
  assert.throws(()=>N.runNestedBranch(s,a,{dynamicInnerSteps:17}),/dynamicInnerSteps must be 0\.\.16/);
  assert.throws(()=>N.runNestedBranch(s,a,{workBudget:0}),/workBudget must be 1\.\.12/);
  assert.throws(()=>N.runNestedBranch(s,a,{workBudget:13}),/workBudget must be 1\.\.12/);
});

test('nested binary analysis shares one global work budget across both outer branches',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const options={directSteps:0,nestedSteps:2,dynamicCandidateBudget:1,dynamicNestedSteps:0,dynamicInnerSteps:0,workBudget:1};
  const r=N.analyzeNestedBinary(s,0,1,options);
  assert.ok(r.workUsed<=1);
  assert.equal(r.workUsed,Math.max(r.on.workUsed,r.off.workUsed));
});

test('nested binary analysis is deterministic and source-state safe with bounded work',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const before=snapshot(s);
  const options={directSteps:0,nestedSteps:1,dynamicCandidateBudget:1,dynamicNestedSteps:0,dynamicInnerSteps:0,workBudget:2};
  const a=N.analyzeNestedBinary(s,0,1,options);
  const b=N.analyzeNestedBinary(s,0,1,options);
  assert.equal(a.status,b.status);
  assert.deepEqual(a.placements,b.placements);
  assert.deepEqual(a.eliminations,b.eliminations);
  assert.equal(a.workUsed,b.workUsed);
  assert.deepEqual(snapshot(s),before);
});

test('nested forcing finder mirrors analyzer output for explicit seeds and preserves source state',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const before=snapshot(s);
  const analyzerOptions={directSteps:0,nestedSteps:0,dynamicCandidateBudget:1,dynamicNestedSteps:0,dynamicInnerSteps:0,workBudget:1};
  const analysis=N.analyzeNestedBinary(s,0,1,analyzerOptions);
  assert.equal(analysis.status,'NONE');
  const finderOptions={seeds:[{cell:0,digit:1}],directSteps:0,nestedSteps:0,dynamicCandidateBudget:1,dynamicNestedSteps:0,dynamicInnerSteps:0,workBudget:1};
  assert.deepEqual(NFC.findNestedForcingChain(s,finderOptions),[]);
  assert.deepEqual(NFC.findNestedForcingChain(s,finderOptions),[]);
  assert.deepEqual(snapshot(s),before);
});

test('nested forcing rejects malformed assumptions before nested search',()=>{
  const s=blankState();
  assert.throws(()=>N.runNestedBranch(s,{cell:81,digit:1,value:true},{nestedSteps:0}),/nested forcing assumption requires/);
  assert.throws(()=>N.runNestedBranch(s,{cell:0,digit:0,value:true},{nestedSteps:0}),/nested forcing assumption requires/);
  assert.throws(()=>N.runNestedBranch(s,{cell:0,digit:1,value:'yes'},{nestedSteps:0}),/nested forcing assumption requires/);
});
