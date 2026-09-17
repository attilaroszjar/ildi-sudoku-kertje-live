'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const DB=require('../games/classic-human/death-blossom.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function als(key,cells,...digits){return {key,cells,mask:maskOf(...digits),size:cells.length};}
function restrictExcept(s,keep,digit){const bit=C.bitForDigit(digit);for(let c=0;c<81;c++)if(!keep.includes(c))s.restrictMask(c,s.masks[c]&~bit);}
function twoStemFixture(relabel){
  const d=relabel||[1,2,3], [a,b,z]=d, s=blankState();
  // stem r1c1; A=r1c4, B=r4c1, target=r4c4. Each petal sees the stem;
  // target sees A by column and B by row.
  const stem=0,target=30;
  const petals=[als('A',[3],a,z),als('B',[27],b,z)];
  s.restrictMask(stem,maskOf(a,b));
  s.restrictMask(3,maskOf(a,z));
  s.restrictMask(27,maskOf(b,z));
  restrictExcept(s,[3,27,target],z);
  return {s,stem,target,petals,a,b,z};
}
function threeStemFixture(){
  const s=blankState(),stem=0,target=10;
  // stem and all three petals/target lie in the top-left box. Petals are disjoint singleton ALSes.
  const petals=[als('A',[1],1,4),als('B',[2],2,4),als('C',[9],3,4)];
  s.restrictMask(stem,maskOf(1,2,3));
  s.restrictMask(1,maskOf(1,4));
  s.restrictMask(2,maskOf(2,4));
  s.restrictMask(9,maskOf(3,4));
  restrictExcept(s,[1,2,9,target],4);
  return {s,stem,target,petals};
}
function commonZNegativeFixture(){
  const s=blankState(),stem=0,target=30;
  const petals=[als('A',[3],1,3),als('B',[27],2,4)];
  s.restrictMask(stem,maskOf(1,2));
  s.restrictMask(3,maskOf(1,3));
  s.restrictMask(27,maskOf(2,4));
  restrictExcept(s,[3,target],3);
  return {s,petals};
}
function visibilityNegativeFixture(){
  const s=blankState(),stem=0,target=30;
  const petals=[als('A',[3],1,3),als('B',[27,73],2,3,4)];
  s.restrictMask(stem,maskOf(1,2));
  s.restrictMask(3,maskOf(1,3));
  // Link digit 2 occurs only at r4c1, which sees the stem. z=3 also occurs at r9c2,
  // which the target r4c4 does not see.
  s.restrictMask(27,maskOf(2,3,4));
  s.restrictMask(73,maskOf(3,4));
  restrictExcept(s,[3,27,73,target],3);
  return {s,petals,target};
}
function budgetFixture(){
  const s=blankState(),stem=0,target=30;
  const extra=[
    als('A',[3],1,3),
    als('A2',[6],1,3),
    als('B',[27],2,3),
    als('B2',[54],2,3)
  ];
  s.restrictMask(stem,maskOf(1,2));
  s.restrictMask(3,maskOf(1,3));
  s.restrictMask(6,maskOf(1,3));
  s.restrictMask(27,maskOf(2,3));
  s.restrictMask(54,maskOf(2,3));
  restrictExcept(s,[3,6,27,54,target],3);
  return {s,extra};
}

test('Death Blossom canonical two-candidate stem eliminates common z only from an external target seeing every z occurrence',()=>{
  const f=twoStemFixture();
  const d=DB.findDeathBlossom(f.s,{als:f.petals}).find(x=>x.explanationData.stemCell===f.stem&&x.explanationData.zDigit===f.z);
  assert.ok(d);assert.deepEqual(d.eliminations,[{cell:f.target,digit:f.z}]);
  assert.deepEqual(d.explanationData.linkDigits,[f.a,f.b]);
  assert.equal(f.s.apply(d),true);assert.equal(f.s.valid,true);
});

test('Death Blossom supports a three-candidate stem when maxStemCandidates is 3',()=>{
  const f=threeStemFixture();
  const d=DB.findDeathBlossom(f.s,{als:f.petals,maxStemCandidates:3}).find(x=>x.explanationData.stemCell===f.stem&&x.explanationData.zDigit===4);
  assert.ok(d);assert.equal(d.complexity.stemCandidates,3);assert.deepEqual(d.eliminations,[{cell:f.target,digit:4}]);
  assert.equal(DB.findDeathBlossom(f.s,{als:f.petals,maxStemCandidates:2}).length,0);
});

test('Death Blossom rejects overlapping petals',()=>{
  const f=twoStemFixture();
  const overlapping=[als('A',[3,12],1,3,5),als('B',[12,27],2,3,6)];
  assert.equal(DB.findDeathBlossom(f.s,{als:overlapping}).length,0);
});

test('Death Blossom rejects a petal whose link digit does not occur in cells seen by the stem',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(3,maskOf(1,3));
  s.restrictMask(27,maskOf(3));
  const bad=[als('A',[3],1,3),als('B',[27],2,3)];
  assert.equal(DB.findDeathBlossom(s,{als:bad}).length,0);
});

test('Death Blossom requires z to be common to every selected petal after excluding each link digit',()=>{
  const f=commonZNegativeFixture();
  assert.equal(DB.findDeathBlossom(f.s,{als:f.petals}).some(d=>d.explanationData.zDigit===3),false);
});

test('Death Blossom target must see every z occurrence in every petal',()=>{
  const f=visibilityNegativeFixture();
  assert.equal(DB.findDeathBlossom(f.s,{als:f.petals}).some(d=>d.eliminations.some(e=>e.cell===f.target&&e.digit===3)),false);
});

test('Death Blossom never eliminates from the stem or selected petal cells',()=>{
  const f=twoStemFixture();
  const blocked=new Set([f.stem,...f.petals.flatMap(p=>p.cells)]);
  for(const d of DB.findDeathBlossom(f.s,{als:f.petals}))for(const e of d.eliminations)assert.equal(blocked.has(e.cell),false);
});

test('Death Blossom enumeration is deterministic and combinationBudget is a hard bound',()=>{
  const f=budgetFixture();
  const a=DB.findDeathBlossom(f.s,{als:f.extra,combinationBudget:1}).map(C.deductionStateKey);
  const b=DB.findDeathBlossom(f.s,{als:f.extra,combinationBudget:1}).map(C.deductionStateKey);
  assert.deepEqual(a,b);
  for(const d of DB.findDeathBlossom(f.s,{als:f.extra,combinationBudget:1}))assert.ok(d.complexity.combinationIndex<=1);
  assert.throws(()=>DB.findDeathBlossom(f.s,{als:f.extra,combinationBudget:0}),RangeError);
  assert.throws(()=>DB.findDeathBlossom(f.s,{als:f.extra,combinationBudget:2049}),RangeError);
});

test('Death Blossom is invariant under digit relabeling',()=>{
  const f=twoStemFixture([4,7,9]);
  const d=DB.findDeathBlossom(f.s,{als:f.petals}).find(x=>x.explanationData.zDigit===9);
  assert.ok(d);assert.deepEqual(d.eliminations,[{cell:f.target,digit:9}]);assert.deepEqual(d.explanationData.linkDigits,[4,7]);
});

test('Death Blossom finder does not mutate source state',()=>{
  const f=twoStemFixture(),before={grid:f.s.grid.map(r=>r.slice()),masks:f.s.masks.slice(),valid:f.s.valid};
  DB.findDeathBlossom(f.s,{als:f.petals});
  assert.deepEqual(f.s.grid,before.grid);assert.deepEqual(f.s.masks,before.masks);assert.equal(f.s.valid,before.valid);
});
