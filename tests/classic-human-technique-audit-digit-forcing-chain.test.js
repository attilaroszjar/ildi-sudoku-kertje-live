'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const D=require('../games/classic-human/digit-forcing.js');

function blank(){return new S.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function forcedFixture(digit=1,other=2){
  const s=blank();
  // Bilocation seed in r1: r1c1/r1c2 for digit. r1c2 is already a singleton,
  // so assuming r1c1=digit contradicts it and the only stable seed position is r1c2.
  for(let c=2;c<9;c++)s.restrictMask(c,s.masks[c]&~C.bitForDigit(digit));
  s.restrictMask(0,maskOf(digit,other));
  s.restrictMask(1,maskOf(digit));
  const seed={houseType:'row',houseIndex:0,digit,positions:[0,1]};
  return {s,seed,digit,other};
}

test('digit forcing chain finds a sound forced position from a bilocation seed',()=>{
  const f=forcedFixture();
  const ds=D.findDigitForcingChain(f.s,{seeds:[f.seed],maxSteps:0});
  assert.equal(ds.length,1);
  assert.deepEqual(ds[0].placements,[{cell:1,digit:1}]);
  assert.deepEqual(ds[0].eliminations,[{cell:0,digit:1}]);
  assert.equal(ds[0].explanationData.result,'FORCED_POSITION');
});

test('digit forcing chain deduction applies without invalidating the state',()=>{
  const f=forcedFixture(),d=D.findDigitForcingChain(f.s,{seeds:[f.seed],maxSteps:0})[0];
  assert.ok(d);assert.equal(f.s.apply(d),true);assert.equal(f.s.valid,true);
  assert.equal(f.s.grid[0][1],1);assert.equal(Boolean(f.s.masks[0]&C.bitForDigit(1)),false);
});

test('digit forcing chain analysis exposes exactly one contradictory branch in forced-position fixture',()=>{
  const f=forcedFixture(),a=D.analyzeSeed(f.s,f.seed,{maxSteps:0});
  assert.equal(a.status,'FORCED_POSITION');
  assert.equal(a.branches.length,2);
  assert.equal(a.branches.filter(x=>x.status==='CONTRADICTION').length,1);
  assert.equal(a.branches.filter(x=>x.status==='STABLE').length,1);
});

test('digit forcing chain bilocation enumeration is deterministic and bounded',()=>{
  const f=forcedFixture();
  const a=D.enumerateSeeds(f.s,2,{seedBudget:4});
  const b=D.enumerateSeeds(f.s,2,{seedBudget:4});
  assert.deepEqual(a,b);assert.ok(a.length<=4);
  assert.ok(a.some(x=>x.houseType==='row'&&x.houseIndex===0&&x.digit===1&&x.positions[0]===0&&x.positions[1]===1));
});

test('digit forcing chain rejects invalid seed and propagation budgets',()=>{
  const f=forcedFixture();
  assert.throws(()=>D.findDigitForcingChain(f.s,{seedBudget:0}),RangeError);
  assert.throws(()=>D.findDigitForcingChain(f.s,{seedBudget:33}),RangeError);
  assert.throws(()=>D.findDigitForcingChain(f.s,{maxSteps:-1}),RangeError);
  assert.throws(()=>D.findDigitForcingChain(f.s,{maxSteps:33}),RangeError);
});

test('digit forcing chain finder is deterministic for explicit seeds',()=>{
  const f=forcedFixture();
  const a=D.findDigitForcingChain(f.s,{seeds:[f.seed],maxSteps:0}).map(C.deductionStateKey);
  const b=D.findDigitForcingChain(f.s,{seeds:[f.seed],maxSteps:0}).map(C.deductionStateKey);
  assert.deepEqual(a,b);
});

test('digit forcing chain is invariant under digit relabeling',()=>{
  const f=forcedFixture(7,4),d=D.findDigitForcingChain(f.s,{seeds:[f.seed],maxSteps:0})[0];
  assert.ok(d);assert.deepEqual(d.placements,[{cell:1,digit:7}]);assert.deepEqual(d.eliminations,[{cell:0,digit:7}]);
});

test('digit forcing chain finder does not mutate source state',()=>{
  const f=forcedFixture(),before={grid:f.s.grid.map(r=>r.slice()),masks:Array.from(f.s.masks),valid:f.s.valid,steps:f.s.steps.slice()};
  D.findDigitForcingChain(f.s,{seeds:[f.seed],maxSteps:0});
  assert.deepEqual(f.s.grid,before.grid);assert.deepEqual(Array.from(f.s.masks),before.masks);assert.equal(f.s.valid,before.valid);assert.deepEqual(f.s.steps,before.steps);
});

test('digit forcing chain does not emit a deduction when both seed branches are inconsistent',()=>{
  const s=blank();
  s.restrictMask(0,maskOf(1));s.restrictMask(1,maskOf(1));
  const seed={houseType:'row',houseIndex:0,digit:1,positions:[0,1]};
  const a=D.analyzeSeed(s,seed,{maxSteps:0});
  assert.equal(a.status,'INCONSISTENT');
  assert.equal(D.findDigitForcingChain(s,{seeds:[seed],maxSteps:0}).length,0);
});

test('digit forcing chain metadata remains fail-closed as server-preferred and branch-count two',()=>{
  const f=forcedFixture(),d=D.findDigitForcingChain(f.s,{seeds:[f.seed],maxSteps:0})[0];
  assert.equal(C.TECHNIQUES['digit-forcing-chain'].serverPreferred,true);
  assert.ok(d);assert.equal(d.techniqueId,'digit-forcing-chain');assert.equal(d.complexity.branchCount,2);
  assert.equal(d.explanationData.houseType,'row');assert.equal(d.explanationData.houseIndex,0);assert.deepEqual(d.explanationData.positions,[0,1]);
});
