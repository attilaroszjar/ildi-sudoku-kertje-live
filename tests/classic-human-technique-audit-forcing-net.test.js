'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const FN=require('../games/classic-human/forcing-net.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function snapshot(s){return {grid:s.cloneGrid(),masks:Array.from(s.masks),valid:s.valid,steps:s.steps.map(C.deductionStateKey)};}

test('forcing-net seed enumeration is trivalue-only deterministic and budget bounded',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2,3));
  s.restrictMask(1,maskOf(4,5,6));
  s.restrictMask(2,maskOf(7,8));
  assert.deepEqual(FN.seedCells(s,{seedBudget:1}),[0]);
  assert.deepEqual(FN.seedCells(s,{seedBudget:2}),[0,1]);
  assert.deepEqual(FN.seedCells(s,{seedBudget:2}),[0,1]);
  assert.throws(()=>FN.seedCells(s,{seedBudget:0}),/1\.\.12/);
  assert.throws(()=>FN.seedCells(s,{seedBudget:13}),/1\.\.12/);
});

test('forcing-net analyzeSeed requires a trivalue seed and preserves source state',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  assert.throws(()=>FN.analyzeSeed(s,0,{maxSteps:0}),/trivalue/);
  const t=blankState();
  t.restrictMask(0,maskOf(1,2,3));
  const before=snapshot(t);
  FN.analyzeSeed(t,0,{maxSteps:0});
  assert.deepEqual(snapshot(t),before);
});

test('forcing-net with zero propagation reports no invented common consequence',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2,3));
  const a=FN.analyzeSeed(s,0,{maxSteps:0});
  assert.equal(a.status,'NONE');
  assert.deepEqual(a.placements,[]);
  assert.deepEqual(a.eliminations,[]);
});

test('forcing-net finder output mirrors analyzeSeed and does not mutate source',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2,3));
  const before=snapshot(s);
  const a=FN.analyzeSeed(s,0,{maxSteps:0});
  const out=FN.findForcingNet(s,{seeds:[0],maxSteps:0});
  if(a.status==='NONE'||a.status==='INCONSISTENT'||(!a.placements.length&&!a.eliminations.length))assert.deepEqual(out,[]);
  else {
    assert.equal(out.length,1);
    assert.equal(out[0].techniqueId,'forcing-net');
    assert.deepEqual(out[0].placements,a.placements);
    assert.deepEqual(out[0].eliminations,a.eliminations);
    assert.equal(out[0].explanationData.result,a.status);
  }
  assert.deepEqual(snapshot(s),before);
});

test('forcing-net is deterministic for identical explicit seeds',()=>{
  const a=blankState(),b=blankState();
  a.restrictMask(0,maskOf(1,2,3));
  b.restrictMask(0,maskOf(1,2,3));
  assert.deepEqual(
    FN.findForcingNet(a,{seeds:[0],maxSteps:0}).map(C.deductionStateKey),
    FN.findForcingNet(b,{seeds:[0],maxSteps:0}).map(C.deductionStateKey)
  );
});

test('forcing-net propagation budget inherits strict forcing ceiling',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2,3));
  assert.throws(()=>FN.analyzeSeed(s,0,{maxSteps:-1}),/0\.\.32/);
  assert.throws(()=>FN.analyzeSeed(s,0,{maxSteps:33}),/0\.\.32/);
});
