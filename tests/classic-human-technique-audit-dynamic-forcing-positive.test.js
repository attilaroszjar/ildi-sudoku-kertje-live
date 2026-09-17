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

function nestedCommonFixture(){
  const s=blankState();
  const innerSeed=0;
  const forcingPeer=1;
  const outerSeed=80;
  s.restrictMask(innerSeed,maskOf(1,2));
  s.restrictMask(forcingPeer,maskOf(1));
  s.restrictMask(outerSeed,maskOf(8,9));
  return {s,innerSeed,outerSeed};
}

const analyzerOptions={directSteps:0,nestedSteps:1,candidateBudget:4,seedBudget:1,innerSteps:0};
const finderOptions={directSteps:0,nestedSteps:1,innerCandidateBudget:4,innerSeedBudget:1,innerSteps:0};

test('dynamic forcing preserves a nested consequence only when it is present in both outer branches',()=>{
  const {s,innerSeed,outerSeed}=nestedCommonFixture();
  const before=snapshot(s);
  const a=D.analyzeDynamicBinary(s,outerSeed,8,analyzerOptions);
  assert.equal(a.on.status,'STABLE');
  assert.equal(a.off.status,'STABLE');
  assert.equal(a.on.nestedUsed,1);
  assert.equal(a.off.nestedUsed,1);
  assert.ok(a.on.steps.some(d=>d.techniqueId==='forcing-chain'));
  assert.ok(a.off.steps.some(d=>d.techniqueId==='forcing-chain'));
  assert.equal(a.status,'COMMON_CONSEQUENCE');
  assert.ok(a.eliminations.some(e=>e.cell===innerSeed&&e.digit===1));
  assert.equal(a.eliminations.some(e=>e.cell===outerSeed&&e.digit===8),false);
  assert.deepEqual(snapshot(s),before);
});

test('dynamic forcing finder materializes exactly the analyzer common consequence for an explicit outer seed',()=>{
  const {s,innerSeed,outerSeed}=nestedCommonFixture();
  const before=snapshot(s);
  const analysis=D.analyzeDynamicBinary(s,outerSeed,8,analyzerOptions);
  const deductions=DFC.findDynamicForcingChain(s,Object.assign({seeds:[{cell:outerSeed,digit:8}]},finderOptions));
  assert.equal(deductions.length,1);
  const d=deductions[0];
  assert.equal(d.techniqueId,'dynamic-forcing-chain');
  assert.deepEqual(d.placements,analysis.placements);
  assert.deepEqual(d.eliminations,analysis.eliminations);
  assert.equal(d.explanationData.result,'COMMON_CONSEQUENCE');
  assert.ok(d.eliminations.some(e=>e.cell===innerSeed&&e.digit===1));
  assert.deepEqual(snapshot(s),before);
});

test('dynamic nested common-consequence audit is deterministic',()=>{
  const project=()=>{
    const {s,outerSeed}=nestedCommonFixture();
    const a=D.analyzeDynamicBinary(s,outerSeed,8,analyzerOptions);
    return {status:a.status,placements:a.placements,eliminations:a.eliminations,on:a.on.steps.map(C.deductionStateKey),off:a.off.steps.map(C.deductionStateKey)};
  };
  assert.deepEqual(project(),project());
});
