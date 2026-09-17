'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const A=require('../games/classic-human/als.js');
const APE=require('../games/classic-human/aligned-pair-exclusion.js');
const H=require('../games/classic-human/index.js');
const I=require('../games/classic-human/audit-inventory.js');

function mask(ds){return ds.reduce((m,d)=>m|C.bitForDigit(d),0);}
function blank(){const s=new S.ClassicHumanState('.'.repeat(81));for(let i=0;i<81;i++)s.masks[i]=mask([9]);return s;}
function set(s,r,c,ds){s.masks[C.cellIndex(r,c)]=mask(ds);return C.cellIndex(r,c);}
function key(x){return x.cell+':'+x.digit;}

function type1Fixture(){
  const s=blank();
  const a=set(s,6,1,[2,4]);
  const b=set(s,6,2,[2,5,8]);
  set(s,6,8,[2,8]);
  set(s,7,0,[4,8]);
  return {s,a,b};
}
function type2Fixture(){
  const s=blank();
  const a=set(s,0,3,[1,9]);
  const b=set(s,1,0,[1,6,8]);
  set(s,0,0,[1,8]);
  set(s,1,5,[8,9]);
  return {s,a,b};
}
function sameBase(d,a,b){
  const base=d.explanationData.baseCells;
  return base.length===2&&base[0]===Math.min(a,b)&&base[1]===Math.max(a,b);
}

test('APE Type 1 reproduces the documented aligned-pair elimination with strict ALS witnesses',()=>{
  const {s,a,b}=type1Fixture();
  const als=A.enumerateAls(s,{maxCells:4});
  const analysis=APE.pairAnalysis(s,a,b,als);
  assert.deepEqual(analysis.eliminations.map(key),[key({cell:b,digit:8})]);
  assert.equal(analysis.survivors.some(([p,q])=>p===2&&q===2),false,'equal digit must conflict for aligned bases');
  const ds=APE.findAlignedPairExclusion(s,{als,pairBudget:32,maxFindings:16});
  assert.ok(ds.some(d=>d.eliminations.some(e=>e.cell===b&&e.digit===8)));
});

test('APE Type 2 preserves equal-digit pairing and still proves the documented non-aligned elimination',()=>{
  const {s,a,b}=type2Fixture();
  const als=A.enumerateAls(s,{maxCells:4});
  const analysis=APE.pairAnalysis(s,a,b,als);
  assert.equal(analysis.survivors.some(([p,q])=>p===1&&q===1),true,'equal digit must remain possible for non-aligned bases');
  assert.deepEqual(analysis.eliminations.map(key),[key({cell:b,digit:8})]);
  const ds=APE.findAlignedPairExclusion(s,{als,pairBudget:32,maxFindings:16});
  const pairDs=ds.filter(d=>sameBase(d,a,b));
  assert.ok(pairDs.some(d=>d.eliminations.some(e=>e.cell===b&&e.digit===8)));
  assert.equal(pairDs.some(d=>d.eliminations.some(e=>e.cell===a&&e.digit===1)),false);
  assert.equal(pairDs.some(d=>d.eliminations.some(e=>e.cell===b&&e.digit===1)),false);
});

test('APE ordered pair proof never swaps base assignments',()=>{
  const s=blank();
  const a=set(s,0,7,[6,8]);
  const b=set(s,8,1,[2,7]);
  set(s,4,1,[6,9]);
  set(s,4,7,[2,9]);
  const als=A.enumerateAls(s,{maxCells:2}).find(x=>x.cells.length===2&&x.cells.includes(C.cellIndex(4,1))&&x.cells.includes(C.cellIndex(4,7)));
  assert.ok(als);
  assert.equal(APE.rejectionWitness(s,a,b,6,2,[als]),null,'A=6,B=2 cannot be rejected merely because A sees the ALS 2 and B sees the ALS 6');
});

test('APE proofs are complete for every partner candidate of the eliminated base candidate',()=>{
  const {s}=type1Fixture();
  const ds=APE.findAlignedPairExclusion(s,{pairBudget:32,maxFindings:16});
  assert.ok(ds.length>0);
  for(const d of ds){
    const x=d.explanationData;
    const partner=x.side==='a'?C.digitsFromMask(s.masks[x.baseCells[1]]):C.digitsFromMask(s.masks[x.baseCells[0]]);
    assert.equal(x.pairProofs.length,partner.length);
    for(const row of x.pairProofs){
      assert.ok(row.witness&&['als','aligned-equal-digit'].includes(row.witness.kind));
      if(row.witness.kind==='als')assert.equal(row.witness.orientation,'ab');
    }
  }
});

test('APE enumeration is deterministic, bounded, and validates hard limits',()=>{
  const {s}=type1Fixture();
  const a=APE.findAlignedPairExclusion(s,{pairBudget:32,maxFindings:8});
  const b=APE.findAlignedPairExclusion(s,{pairBudget:32,maxFindings:8});
  assert.deepEqual(a,b);
  assert.ok(a.length<=8);
  assert.throws(()=>APE.findAlignedPairExclusion(s,{pairBudget:0}),/pairBudget/);
  assert.throws(()=>APE.findAlignedPairExclusion(s,{maxAlsCells:5}),/maxAlsCells/);
  assert.throws(()=>APE.findAlignedPairExclusion(s,{maxFindings:129}),/maxFindings/);
});

test('APE remains quarantined after AI Escargot soundness failure',()=>{
  const row=I.buildInventory().find(x=>x.id==='aligned-pair-exclusion');
  assert.ok(row);
  assert.equal(row.implementationState,I.IMPLEMENTATION_STATES.IMPLEMENTED_UNWIRED);
  assert.equal(row.auditState,I.AUDIT_STATES.NEEDS_FIX);
  assert.equal(row.productionTrusted,false);
  assert.equal(H.FINDERS.some(x=>x.id==='aligned-pair-exclusion'),false);
  assert.equal(typeof H.findAlignedPairExclusion,'function');
  assert.equal(C.TECHNIQUES['aligned-pair-exclusion'].serverPreferred,true);
});
