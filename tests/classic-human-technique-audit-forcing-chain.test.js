'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const F=require('../games/classic-human/forcing.js');
const FC=require('../games/classic-human/forcing-chain.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function snap(s){return {grid:s.cloneGrid(),masks:Array.from(s.masks),valid:s.valid,steps:s.steps.map(C.deductionStateKey)};}

function forcedTrueFixture(){
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(2,3));
  s.restrictMask(2,maskOf(1,3));
  return s;
}

test('forcing analysis maps a single contradictory branch to forced truth without branch-local leakage',()=>{
  const s=forcedTrueFixture();
  const before=snap(s);
  const a=F.analyzeBinaryAssumption(s,0,1,{maxSteps:8});
  assert.ok(['FORCED_TRUE','FORCED_FALSE','COMMON_CONSEQUENCE','NONE'].includes(a.status));
  if(a.status==='FORCED_TRUE'){
    assert.deepEqual(a.placements,[{cell:0,digit:1}]);
    assert.deepEqual(a.eliminations,[]);
  }
  if(a.status==='FORCED_FALSE'){
    assert.deepEqual(a.placements,[]);
    assert.deepEqual(a.eliminations,[{cell:0,digit:1}]);
  }
  if(a.status==='COMMON_CONSEQUENCE'){
    for(const p of a.placements)assert.notDeepEqual(p,{cell:0,digit:1});
    for(const e of a.eliminations)assert.notDeepEqual(e,{cell:0,digit:1});
  }
  assert.deepEqual(snap(s),before);
});

test('common consequences are strict intersections of both stable branches',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const a=F.runBranch(s,{cell:0,digit:1,value:true},{maxSteps:0});
  const b=F.runBranch(s,{cell:0,digit:1,value:false},{maxSteps:0});
  assert.equal(a.status,'STABLE');
  assert.equal(b.status,'STABLE');
  const out=F.analyzeBinaryAssumption(s,0,1,{maxSteps:0});
  assert.equal(out.status,'NONE');
  assert.deepEqual(out.placements,[]);
  assert.deepEqual(out.eliminations,[]);
});

test('forcing-chain deduction mirrors analyzeBinaryAssumption and applies safely',()=>{
  const s=forcedTrueFixture();
  const before=snap(s);
  const analysis=F.analyzeBinaryAssumption(s,0,1,{maxSteps:8});
  const found=FC.findForcingChain(s,{seeds:[{cell:0,digit:1}],maxSteps:8});
  if(analysis.status==='NONE'||analysis.status==='INCONSISTENT')assert.equal(found.length,0);
  else {
    assert.equal(found.length,1);
    const d=found[0];
    assert.equal(d.techniqueId,'forcing-chain');
    assert.deepEqual(d.placements,analysis.placements);
    assert.deepEqual(d.eliminations,analysis.eliminations);
    const clone=new H.ClassicHumanState('0'.repeat(81));
    clone.restrictMask(0,maskOf(1,2));
    clone.restrictMask(1,maskOf(2,3));
    clone.restrictMask(2,maskOf(1,3));
    assert.equal(clone.apply(d),true);
    assert.equal(clone.valid,true);
  }
  assert.deepEqual(snap(s),before);
});

test('forcing-chain explicit seed order is deterministic and metadata preserves seed identity',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(3,4));
  const seeds=[{cell:0,digit:1},{cell:1,digit:3}];
  const a=FC.findForcingChain(s,{seeds,maxSteps:0});
  const b=FC.findForcingChain(s,{seeds,maxSteps:0});
  assert.deepEqual(a.map(C.deductionStateKey),b.map(C.deductionStateKey));
  for(const d of a){
    assert.equal(d.techniqueId,'forcing-chain');
    assert.ok(seeds.some(x=>x.cell===d.explanationData.seedCell&&x.digit===d.explanationData.seedDigit));
  }
});

test('forcing-chain remains bounded at its hard propagation ceiling',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  assert.doesNotThrow(()=>FC.findForcingChain(s,{seeds:[{cell:0,digit:1}],maxSteps:32}));
  assert.throws(()=>FC.findForcingChain(s,{seeds:[{cell:0,digit:1}],maxSteps:33}),/0\.\.32/);
});
