'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');

function blank(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}

function forcedFalseFixture(){
  const s=blank(),seed=cell(0,0);
  s.restrictMask(seed,mask(1,2));
  s.restrictMask(cell(0,1),mask(1));
  return {s,seed};
}

function forcedTrueFixture(){
  const s=blank(),seed=cell(0,0);
  s.restrictMask(seed,mask(1,2));
  s.restrictMask(cell(0,1),mask(2));
  return {s,seed};
}

test('canonical classic entry exports Phase G server-only recognizers',()=>{
  assert.equal(typeof H.findDynamicForcingChain,'function');
  assert.equal(typeof H.findNestedForcingChain,'function');
});

test('Phase G finder registry contains each server-only technique exactly once',()=>{
  for(const id of ['dynamic-forcing-chain','nested-forcing-chain']){
    assert.equal(H.FINDERS.filter(x=>x.id===id).length,1);
    assert.equal(H.FINDERS.find(x=>x.id===id).serverOnly,true);
  }
});

test('Phase G priorities remain contract driven',()=>{
  assert.equal(C.TECHNIQUES['dynamic-forcing-chain'].priority,500);
  assert.equal(C.TECHNIQUES['nested-forcing-chain'].priority,510);
  assert.equal(C.TECHNIQUES['dynamic-forcing-chain'].serverOnly,true);
  assert.equal(C.TECHNIQUES['nested-forcing-chain'].serverOnly,true);
});

test('server-only techniques stay disabled by default even with explicit filters',()=>{
  const {s}=forcedFalseFixture();
  assert.equal(H.findNext(s,{techniques:['dynamic-forcing-chain']}),null);
  assert.equal(H.findNext(s,{techniques:['nested-forcing-chain']}),null);
});

test('allowServerPreferred does not unlock server-only techniques',()=>{
  const {s}=forcedFalseFixture();
  assert.equal(H.findNext(s,{techniques:['dynamic-forcing-chain'],allowServerPreferred:true}),null);
  assert.equal(H.findNext(s,{techniques:['nested-forcing-chain'],allowServerPreferred:true}),null);
});

test('explicit server-only opt-in enables dynamic forcing without guessing',()=>{
  const {s,seed}=forcedFalseFixture();
  const d=H.findNext(s,{techniques:['dynamic-forcing-chain'],allowServerOnly:true,seeds:[{cell:seed,digit:1}],nestedSteps:0,directSteps:0});
  assert.ok(d);
  assert.equal(d.techniqueId,'dynamic-forcing-chain');
  assert.deepEqual(d.eliminations,[{cell:seed,digit:1}]);
});

test('explicit server-only opt-in enables nested forcing without guessing',()=>{
  const {s,seed}=forcedTrueFixture();
  const d=H.findNext(s,{techniques:['nested-forcing-chain'],allowServerOnly:true,seeds:[{cell:seed,digit:1}],workBudget:1,nestedSteps:0,directSteps:2});
  assert.ok(d);
  assert.equal(d.techniqueId,'nested-forcing-chain');
  assert.deepEqual(d.placements,[{cell:seed,digit:1}]);
});

test('server-only policy remains independent from uniqueness and server-preferred policies',()=>{
  const {s}=forcedFalseFixture();
  assert.equal(H.findNext(s,{techniques:['dynamic-forcing-chain'],allowUniqueness:true,allowServerPreferred:true}),null);
});
