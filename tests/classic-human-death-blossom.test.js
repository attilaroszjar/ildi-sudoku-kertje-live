'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const D=require('../games/classic-human/death-blossom.js');

function blank(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}

test('Death Blossom contract is server-preferred ALS',()=>{
  const meta=C.TECHNIQUES['death-blossom'];
  assert.equal(meta.familyId,C.FAMILY_IDS.als);
  assert.equal(meta.serverPreferred,true);
});

test('Death Blossom finds a controlled two-petal common-Z elimination',()=>{
  const s=blank();
  s.restrictMask(0,mask(1,2));
  s.restrictMask(1,mask(1,9));
  s.restrictMask(9,mask(2,9));
  s.restrictMask(10,mask(3,9));
  const als=[
    {key:'p1',cells:[1],mask:mask(1,9),size:1},
    {key:'p2',cells:[9],mask:mask(2,9),size:1}
  ];
  const found=D.findDeathBlossom(s,{als,maxStemCandidates:2,maxPetalsPerDigit:4,combinationBudget:16});
  const hit=found.find(x=>x.eliminations.some(e=>e.cell===10&&e.digit===9));
  assert.ok(hit);
  assert.equal(hit.techniqueId,'death-blossom');
  assert.equal(hit.explanationData.stemCell,0);
  assert.equal(hit.explanationData.zDigit,9);
});

test('Death Blossom search budgets are hard bounded',()=>{
  const s=blank();
  assert.throws(()=>D.findDeathBlossom(s,{maxStemCandidates:4}),/2\.\.3/);
  assert.throws(()=>D.findDeathBlossom(s,{maxCells:5}),/1\.\.4/);
  assert.throws(()=>D.findDeathBlossom(s,{maxPetalsPerDigit:25}),/1\.\.24/);
  assert.throws(()=>D.findDeathBlossom(s,{combinationBudget:2049}),/1\.\.2048/);
});
