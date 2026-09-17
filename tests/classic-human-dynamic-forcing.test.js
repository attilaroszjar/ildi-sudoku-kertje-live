'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const D=require('../games/classic-human/dynamic-forcing.js');

function blank(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}

function forcedFalseFixture(){
  const s=blank(),seed=cell(0,0),peer=cell(0,1);
  s.restrictMask(seed,mask(1,2));
  s.restrictMask(peer,mask(1));
  return {s,seed,digit:1};
}

test('dynamic forcing branch preserves source state isolation',()=>{
  const s=blank(),a=cell(8,8);
  s.restrictMask(a,mask(8,9));
  const before=s.masks[a];
  const r=D.runDynamicBranch(s,{cell:a,digit:8,value:true},{directSteps:0,nestedSteps:0});
  assert.equal(r.status,'STABLE');
  assert.equal(s.grid[8][8],0);
  assert.equal(s.masks[a],before);
  assert.equal(r.state.grid[8][8],8);
});

test('dynamic forcing can apply one bounded inner forcing deduction',()=>{
  const {s,seed}=forcedFalseFixture();
  const outer=cell(8,8);
  s.restrictMask(outer,mask(8,9));
  const r=D.runDynamicBranch(s,{cell:outer,digit:8,value:true},{directSteps:0,nestedSteps:1,candidateBudget:4,seedBudget:1,innerSteps:0});
  assert.equal(r.status,'STABLE');
  assert.equal(r.nestedUsed,1);
  assert.equal((r.state.masks[seed]&C.bitForDigit(1))!==0,false);
  assert.ok(r.steps.some(d=>d.techniqueId==='forcing-chain'));
});

test('dynamic forcing nested step count is hard bounded',()=>{
  const s=blank(),a=cell(0,0);
  s.restrictMask(a,mask(1,2));
  assert.throws(()=>D.runDynamicBranch(s,{cell:a,digit:1,value:true},{nestedSteps:7}),/0..6/);
  assert.throws(()=>D.runDynamicBranch(s,{cell:a,digit:1,value:true},{nestedSteps:-1}),/0..6/);
});

test('dynamic forcing inner budgets are hard bounded',()=>{
  const s=blank(),a=cell(0,0);
  s.restrictMask(a,mask(1,2));
  assert.throws(()=>D.runDynamicBranch(s,{cell:a,digit:1,value:true},{candidateBudget:13}),/1..12/);
  assert.throws(()=>D.runDynamicBranch(s,{cell:a,digit:1,value:true},{seedBudget:7}),/1..6/);
  assert.throws(()=>D.runDynamicBranch(s,{cell:a,digit:1,value:true},{innerSteps:25}),/0..24/);
});

test('dynamic binary analysis retains contradiction forcing when nesting is disabled',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const r=D.analyzeDynamicBinary(s,seed,digit,{directSteps:0,nestedSteps:0});
  assert.equal(r.status,'FORCED_FALSE');
  assert.deepEqual(r.eliminations,[{cell:seed,digit}]);
});

test('dynamic forcing analysis is deterministic',()=>{
  const {s,seed,digit}=forcedFalseFixture();
  const project=()=>{const r=D.analyzeDynamicBinary(s,seed,digit,{directSteps:2,nestedSteps:1,candidateBudget:4,seedBudget:2,innerSteps:2});return {status:r.status,p:r.placements,e:r.eliminations,on:[r.on.status,r.on.directUsed,r.on.nestedUsed],off:[r.off.status,r.off.directUsed,r.off.nestedUsed]};};
  assert.deepEqual(project(),project());
});
