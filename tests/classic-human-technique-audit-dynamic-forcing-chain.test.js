'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const D=require('../games/classic-human/dynamic-forcing.js');
const DFC=require('../games/classic-human/dynamic-forcing-chain.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function snapshot(s){return {grid:s.cloneGrid(),masks:Array.from(s.masks),valid:s.valid,steps:s.steps.map(C.deductionStateKey)};}

test('dynamic forcing seeds are deterministic, bivalue-only and budget bounded',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(3,4));
  s.restrictMask(2,maskOf(5,6,7));
  const seeds=DFC.candidateSeeds(s,{candidateBudget:3});
  assert.deepEqual(seeds,[{cell:0,digit:1},{cell:0,digit:2},{cell:1,digit:3}]);
  assert.deepEqual(DFC.candidateSeeds(s,{candidateBudget:3}),seeds);
  assert.throws(()=>DFC.candidateSeeds(s,{candidateBudget:0}),/1\.\.16/);
  assert.throws(()=>DFC.candidateSeeds(s,{candidateBudget:17}),/1\.\.16/);
});

test('dynamic branch runs on a clone and zero budgets cannot mutate the source state',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const before=snapshot(s);
  const r=D.runDynamicBranch(s,{cell:0,digit:1,value:true},{directSteps:0,nestedSteps:0,candidateBudget:1,seedBudget:1,innerSteps:0});
  assert.equal(r.status,'STABLE');
  assert.equal(r.state.grid[0][0],1);
  assert.equal(r.directUsed,0);
  assert.equal(r.nestedUsed,0);
  assert.deepEqual(snapshot(s),before);
  assert.notEqual(r.state,s);
});

test('dynamic forcing validates all hard search budgets',()=>{
  const s=blankState();
  const a={cell:0,digit:1,value:true};
  assert.throws(()=>D.runDynamicBranch(s,a,{directSteps:-1}),/directSteps must be 0\.\.32/);
  assert.throws(()=>D.runDynamicBranch(s,a,{directSteps:33}),/directSteps must be 0\.\.32/);
  assert.throws(()=>D.runDynamicBranch(s,a,{nestedSteps:-1}),/nestedSteps must be 0\.\.6/);
  assert.throws(()=>D.runDynamicBranch(s,a,{nestedSteps:7}),/nestedSteps must be 0\.\.6/);
  assert.throws(()=>D.runDynamicBranch(s,a,{candidateBudget:0}),/candidateBudget must be 1\.\.12/);
  assert.throws(()=>D.runDynamicBranch(s,a,{candidateBudget:13}),/candidateBudget must be 1\.\.12/);
  assert.throws(()=>D.runDynamicBranch(s,a,{seedBudget:0}),/seedBudget must be 1\.\.6/);
  assert.throws(()=>D.runDynamicBranch(s,a,{seedBudget:7}),/seedBudget must be 1\.\.6/);
  assert.throws(()=>D.runDynamicBranch(s,a,{innerSteps:-1}),/innerSteps must be 0\.\.24/);
  assert.throws(()=>D.runDynamicBranch(s,a,{innerSteps:25}),/innerSteps must be 0\.\.24/);
});

test('dynamic binary analysis is deterministic and base-state safe at zero propagation',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const before=snapshot(s);
  const options={directSteps:0,nestedSteps:0,candidateBudget:1,seedBudget:1,innerSteps:0};
  const a=D.analyzeDynamicBinary(s,0,1,options);
  const b=D.analyzeDynamicBinary(s,0,1,options);
  assert.equal(a.status,'NONE');
  assert.equal(b.status,'NONE');
  assert.deepEqual(a.placements,b.placements);
  assert.deepEqual(a.eliminations,b.eliminations);
  assert.deepEqual(snapshot(s),before);
});

test('dynamic forcing finder mirrors analyzer output for explicit seeds and preserves source state',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const before=snapshot(s);
  const options={seeds:[{cell:0,digit:1}],directSteps:0,nestedSteps:0,innerCandidateBudget:1,innerSeedBudget:1,innerSteps:0};
  const analysis=D.analyzeDynamicBinary(s,0,1,{directSteps:0,nestedSteps:0,candidateBudget:1,seedBudget:1,innerSteps:0});
  assert.equal(analysis.status,'NONE');
  assert.deepEqual(DFC.findDynamicForcingChain(s,options),[]);
  assert.deepEqual(DFC.findDynamicForcingChain(s,options),[]);
  assert.deepEqual(snapshot(s),before);
});

test('dynamic forcing rejects malformed assumptions before search',()=>{
  const s=blankState();
  assert.throws(()=>D.runDynamicBranch(s,{cell:81,digit:1,value:true},{directSteps:0,nestedSteps:0}),/dynamic forcing assumption requires/);
  assert.throws(()=>D.runDynamicBranch(s,{cell:0,digit:0,value:true},{directSteps:0,nestedSteps:0}),/dynamic forcing assumption requires/);
  assert.throws(()=>D.runDynamicBranch(s,{cell:0,digit:1,value:'yes'},{directSteps:0,nestedSteps:0}),/dynamic forcing assumption requires/);
});
