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

function nestedPositiveFixture(){
  const s=blankState();
  const innerSeed=0;
  const innerPeer=1;
  const outerSeed=80;
  s.restrictMask(innerSeed,maskOf(1,2));
  s.restrictMask(innerPeer,maskOf(1));
  s.restrictMask(outerSeed,maskOf(8,9));
  return {s,innerSeed,outerSeed};
}

const OPTIONS={
  directSteps:0,
  nestedSteps:1,
  dynamicCandidateBudget:4,
  dynamicNestedSteps:0,
  dynamicInnerSteps:0,
  workBudget:4
};

test('nested forcing derives only a consequence present in both outer branches',()=>{
  const {s,innerSeed,outerSeed}=nestedPositiveFixture();
  const before=snapshot(s);
  const a=N.analyzeNestedBinary(s,outerSeed,8,OPTIONS);
  assert.equal(a.status,'COMMON_CONSEQUENCE');
  assert.ok(a.eliminations.some(e=>e.cell===innerSeed&&e.digit===1));
  assert.equal(a.on.status,'STABLE');
  assert.equal(a.off.status,'STABLE');
  assert.ok(a.on.steps.some(d=>d.techniqueId==='dynamic-forcing-chain'));
  assert.ok(a.off.steps.some(d=>d.techniqueId==='dynamic-forcing-chain'));
  assert.equal((a.on.state.masks[innerSeed]&C.bitForDigit(1))!==0,false);
  assert.equal((a.off.state.masks[innerSeed]&C.bitForDigit(1))!==0,false);
  assert.ok(a.workUsed<=OPTIONS.workBudget);
  assert.deepEqual(snapshot(s),before);
});

test('nested forcing finder mirrors analyzer common consequence exactly',()=>{
  const {s,innerSeed,outerSeed}=nestedPositiveFixture();
  const before=snapshot(s);
  const analysis=N.analyzeNestedBinary(s,outerSeed,8,OPTIONS);
  const finderOptions={
    seeds:[{cell:outerSeed,digit:8}],
    directSteps:OPTIONS.directSteps,
    nestedSteps:OPTIONS.nestedSteps,
    dynamicCandidateBudget:OPTIONS.dynamicCandidateBudget,
    dynamicNestedSteps:OPTIONS.dynamicNestedSteps,
    dynamicInnerSteps:OPTIONS.dynamicInnerSteps,
    workBudget:OPTIONS.workBudget
  };
  const out=NFC.findNestedForcingChain(s,finderOptions);
  assert.equal(out.length,1);
  const d=out[0];
  assert.equal(d.techniqueId,'nested-forcing-chain');
  assert.deepEqual(d.placements,analysis.placements);
  assert.deepEqual(d.eliminations,analysis.eliminations);
  assert.ok(d.eliminations.some(e=>e.cell===innerSeed&&e.digit===1));
  assert.equal(d.complexity.workUsed,analysis.workUsed);
  assert.equal(d.complexity.workBudget,OPTIONS.workBudget);
  assert.deepEqual(snapshot(s),before);
});

test('nested positive result is deterministic under the shared work budget',()=>{
  const {s,outerSeed}=nestedPositiveFixture();
  const project=()=>{
    const a=N.analyzeNestedBinary(s,outerSeed,8,OPTIONS);
    return {
      status:a.status,
      placements:a.placements,
      eliminations:a.eliminations,
      workUsed:a.workUsed,
      on:{status:a.on.status,nestedUsed:a.on.nestedUsed,workUsed:a.on.workUsed},
      off:{status:a.off.status,nestedUsed:a.off.nestedUsed,workUsed:a.off.workUsed}
    };
  };
  assert.deepEqual(project(),project());
});
