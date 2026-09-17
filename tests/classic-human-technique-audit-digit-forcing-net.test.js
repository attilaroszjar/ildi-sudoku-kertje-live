'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const D=require('../games/classic-human/digit-forcing.js');

function blank(){return new S.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function exactRowSeedFixture(digit=1,other=2){
  const s=blank();
  for(let c=3;c<9;c++)s.restrictMask(c,s.masks[c]&~C.bitForDigit(digit));
  s.restrictMask(0,maskOf(digit,other));
  s.restrictMask(1,maskOf(digit,other));
  s.restrictMask(2,maskOf(digit,other));
  return {s,seed:{houseType:'row',houseIndex:0,digit,positions:[0,1,2]},digit,other};
}
function forcedFixture(digit=1,other=2){
  const f=exactRowSeedFixture(digit,other);
  f.s.restrictMask(1,maskOf(digit));
  return f;
}
function partialFixture(){
  const f=exactRowSeedFixture();
  // External singleton r4c1 is seen by r1c1 via column 1, but not by r1c2/r1c3.
  f.s.restrictMask(27,maskOf(1));
  return f;
}
function inconsistentFixture(){
  const f=exactRowSeedFixture();
  // One external singleton per seed column makes each corresponding assumption contradictory.
  f.s.restrictMask(27,maskOf(1));
  f.s.restrictMask(28,maskOf(1));
  f.s.restrictMask(29,maskOf(1));
  return f;
}

test('digit forcing net enumerates an exact three-position house-digit seed deterministically',()=>{
  const f=exactRowSeedFixture();
  assert.deepEqual(D.candidatePositions(f.s,'row',0,1),[0,1,2]);
  const a=D.enumerateSeeds(f.s,3,{seedBudget:8});
  const b=D.enumerateSeeds(f.s,3,{seedBudget:8});
  assert.deepEqual(a,b);assert.ok(a.length<=8);
  assert.ok(a.some(x=>x.houseType==='row'&&x.houseIndex===0&&x.digit===1&&JSON.stringify(x.positions)==='[0,1,2]'));
});

test('digit forcing net finds a sound forced position when exactly one of three branches survives',()=>{
  const f=forcedFixture(),a=D.analyzeSeed(f.s,f.seed,{maxSteps:0});
  assert.equal(a.status,'FORCED_POSITION');
  assert.equal(a.branches.length,3);
  assert.equal(a.branches.filter(x=>x.status==='STABLE').length,1);
  assert.deepEqual(a.placements,[{cell:1,digit:1}]);
  assert.deepEqual(a.eliminations,[{cell:0,digit:1},{cell:2,digit:1}]);
});

test('digit forcing net finder emits the forced-position deduction with branch-count three',()=>{
  const f=forcedFixture(),d=D.findDigitForcingNet(f.s,{seeds:[f.seed],maxSteps:0})[0];
  assert.ok(d);assert.equal(d.techniqueId,'digit-forcing-net');assert.equal(d.complexity.branchCount,3);
  assert.equal(d.explanationData.result,'FORCED_POSITION');assert.deepEqual(d.explanationData.positions,[0,1,2]);
  assert.deepEqual(d.placements,[{cell:1,digit:1}]);
});

test('digit forcing net reports partial contradictions without leaking branch-local consequences',()=>{
  const f=partialFixture(),a=D.analyzeSeed(f.s,f.seed,{maxSteps:0});
  assert.equal(a.status,'PARTIAL');
  assert.equal(a.branches.filter(x=>x.status==='CONTRADICTION').length,1);
  assert.equal(a.branches.filter(x=>x.status==='STABLE').length,2);
  assert.deepEqual(a.placements,[]);
  assert.deepEqual(a.eliminations,[{cell:0,digit:1}]);
});

test('digit forcing net emits only the impossible seed position for a partial contradiction',()=>{
  const f=partialFixture(),d=D.findDigitForcingNet(f.s,{seeds:[f.seed],maxSteps:0})[0];
  assert.ok(d);assert.deepEqual(d.placements,[]);assert.deepEqual(d.eliminations,[{cell:0,digit:1}]);
  assert.equal(d.explanationData.result,'PARTIAL');
});

test('digit forcing net fails closed when all three branches contradict',()=>{
  const f=inconsistentFixture(),a=D.analyzeSeed(f.s,f.seed,{maxSteps:0});
  assert.equal(a.status,'INCONSISTENT');
  assert.equal(a.branches.filter(x=>x.status==='CONTRADICTION').length,3);
  assert.equal(D.findDigitForcingNet(f.s,{seeds:[f.seed],maxSteps:0}).length,0);
});

test('digit forcing net rejects invalid seed and propagation budgets',()=>{
  const f=exactRowSeedFixture();
  assert.throws(()=>D.findDigitForcingNet(f.s,{seedBudget:0}),RangeError);
  assert.throws(()=>D.findDigitForcingNet(f.s,{seedBudget:33}),RangeError);
  assert.throws(()=>D.findDigitForcingNet(f.s,{maxSteps:-1}),RangeError);
  assert.throws(()=>D.findDigitForcingNet(f.s,{maxSteps:33}),RangeError);
});

test('digit forcing net finder is deterministic for explicit three-way seeds',()=>{
  const f=partialFixture();
  const a=D.findDigitForcingNet(f.s,{seeds:[f.seed],maxSteps:0}).map(C.deductionStateKey);
  const b=D.findDigitForcingNet(f.s,{seeds:[f.seed],maxSteps:0}).map(C.deductionStateKey);
  assert.deepEqual(a,b);
});

test('digit forcing net is invariant under digit relabeling',()=>{
  const f=forcedFixture(7,4),d=D.findDigitForcingNet(f.s,{seeds:[f.seed],maxSteps:0})[0];
  assert.ok(d);assert.deepEqual(d.placements,[{cell:1,digit:7}]);
  assert.deepEqual(d.eliminations,[{cell:0,digit:7},{cell:2,digit:7}]);
});

test('digit forcing net finder does not mutate source state',()=>{
  const f=partialFixture(),before={grid:f.s.grid.map(r=>r.slice()),masks:Array.from(f.s.masks),valid:f.s.valid,steps:f.s.steps.slice()};
  D.findDigitForcingNet(f.s,{seeds:[f.seed],maxSteps:8});
  assert.deepEqual(f.s.grid,before.grid);assert.deepEqual(Array.from(f.s.masks),before.masks);
  assert.equal(f.s.valid,before.valid);assert.deepEqual(f.s.steps,before.steps);
});

test('digit forcing net remains fail-closed metadata-wise as an unwired server-preferred technique',()=>{
  const f=partialFixture(),d=D.findDigitForcingNet(f.s,{seeds:[f.seed],maxSteps:0})[0];
  assert.equal(C.TECHNIQUES['digit-forcing-net'].serverPreferred,true);
  assert.ok(d);assert.equal(d.complexity.branchCount,3);
  assert.equal(d.explanationData.houseType,'row');assert.equal(d.explanationData.houseIndex,0);
});
