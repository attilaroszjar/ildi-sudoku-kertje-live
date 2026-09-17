'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const D=require('../games/classic-human/digit-forcing.js');

function blank(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}

test('digit forcing techniques are server-preferred contracts',()=>{
  assert.equal(C.TECHNIQUES['digit-forcing-chain'].serverPreferred,true);
  assert.equal(C.TECHNIQUES['digit-forcing-net'].serverPreferred,true);
  assert.ok(C.TECHNIQUES['digit-forcing-net'].priority>C.TECHNIQUES['digit-forcing-chain'].priority);
});

test('bilocation seed enumeration is bounded and deterministic',()=>{
  const s=blank(),bit=C.bitForDigit(1);
  for(let cell=0;cell<81;cell++)if(cell!==0&&cell!==1)s.restrictMask(cell,s.masks[cell]&~bit||s.masks[cell]);
  const a=D.enumerateSeeds(s,2,{seedBudget:4});
  const b=D.enumerateSeeds(s,2,{seedBudget:4});
  assert.deepEqual(a,b);
  assert.ok(a.length<=4);
});

test('digit forcing budgets are hard bounded',()=>{
  const s=blank();
  assert.throws(()=>D.enumerateSeeds(s,2,{seedBudget:33}),/1\.\.32/);
  assert.throws(()=>D.findDigitForcingChain(s,{maxSteps:33}),/0\.\.32/);
});
