'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const F=require('../games/classic-human/forcing.js');
const FC=require('../games/classic-human/forcing-chain.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function snapshot(s){return {grid:s.cloneGrid(),masks:Array.from(s.masks),valid:s.valid,steps:s.steps.map(C.deductionStateKey)};}

test('forcing branch runs on an isolated clone and never mutates the base state',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const before=snapshot(s);
  const result=F.runBranch(s,{cell:0,digit:1,value:true},{maxSteps:0});
  assert.equal(result.status,'STABLE');
  assert.equal(result.state.grid[0][0],1);
  assert.deepEqual(snapshot(s),before);
  assert.notEqual(result.state,s);
});

test('forcing branch reports contradiction for absent candidate without touching base state',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const before=snapshot(s);
  const result=F.runBranch(s,{cell:0,digit:3,value:true},{maxSteps:4});
  assert.equal(result.status,'CONTRADICTION');
  assert.equal(result.reason,'candidate-absent');
  assert.deepEqual(snapshot(s),before);
});

test('forcing branch validates assumptions and strict propagation budget',()=>{
  const s=blankState();
  assert.throws(()=>F.runBranch(s,{cell:0,digit:1,value:true},{maxSteps:-1}),/0\.\.32/);
  assert.throws(()=>F.runBranch(s,{cell:0,digit:1,value:true},{maxSteps:33}),/0\.\.32/);
  assert.throws(()=>F.runBranch(s,{cell:81,digit:1,value:true},{maxSteps:0}),/assumption requires/);
  assert.throws(()=>F.runBranch(s,{cell:0,digit:0,value:true},{maxSteps:0}),/assumption requires/);
  assert.throws(()=>F.runBranch(s,{cell:0,digit:1,value:'yes'},{maxSteps:0}),/assumption requires/);
});

test('binary assumption analysis is deterministic and base-state safe',()=>{
  const a=blankState();
  a.restrictMask(0,maskOf(1,2));
  const before=snapshot(a);
  const x=F.analyzeBinaryAssumption(a,0,1,{maxSteps:0});
  const y=F.analyzeBinaryAssumption(a,0,1,{maxSteps:0});
  assert.equal(x.status,'NONE');
  assert.equal(y.status,'NONE');
  assert.deepEqual(x.placements,y.placements);
  assert.deepEqual(x.eliminations,y.eliminations);
  assert.deepEqual(snapshot(a),before);
});

test('forcing-chain seed enumeration is deterministic, bivalue-only and budget bounded',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(3,4));
  s.restrictMask(2,maskOf(5,6,7));
  const seeds=FC.candidateSeeds(s,{candidateBudget:3});
  assert.deepEqual(seeds,[{cell:0,digit:1},{cell:0,digit:2},{cell:1,digit:3}]);
  assert.deepEqual(FC.candidateSeeds(s,{candidateBudget:3}),seeds);
  assert.throws(()=>FC.candidateSeeds(s,{candidateBudget:0}),/1\.\.24/);
  assert.throws(()=>FC.candidateSeeds(s,{candidateBudget:25}),/1\.\.24/);
});

test('forcing-chain finder does not mutate the source state even when given explicit seeds',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const before=snapshot(s);
  const a=FC.findForcingChain(s,{seeds:[{cell:0,digit:1}],maxSteps:0});
  const b=FC.findForcingChain(s,{seeds:[{cell:0,digit:1}],maxSteps:0});
  assert.deepEqual(a.map(C.deductionStateKey),b.map(C.deductionStateKey));
  assert.deepEqual(snapshot(s),before);
});
