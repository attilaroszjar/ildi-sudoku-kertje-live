'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function uniqueRectangleState(){
  const s=blankState();
  const rect=[cell(0,0),cell(0,3),cell(1,0),cell(1,3)],keep=new Set(rect),without=C.FULL_MASK&~(C.bitForDigit(1)|C.bitForDigit(2));
  for(let i=0;i<81;i++)if(!keep.has(i))s.restrictMask(i,without);
  s.restrictMask(rect[0],maskOf(1,2));s.restrictMask(rect[1],maskOf(1,2));s.restrictMask(rect[2],maskOf(1,2));s.restrictMask(rect[3],maskOf(1,2,3));
  return s;
}

test('canonical classic entry exports uniqueness recognizers',()=>{
  assert.equal(typeof H.findUniqueRectangle,'function');
  assert.equal(typeof H.findUniqueLoop,'function');
  assert.equal(typeof H.findBugPlusOne,'function');
});

test('uniqueness techniques are blocked by default even when explicitly filtered',()=>{
  const d=H.findNext(uniqueRectangleState(),{techniques:['unique-rectangle']});
  assert.equal(d,null);
});

test('allowUniqueness explicitly enables uniqueness deductions',()=>{
  const d=H.findNext(uniqueRectangleState(),{techniques:['unique-rectangle'],allowUniqueness:true});
  assert.ok(d);
  assert.equal(d.techniqueId,'unique-rectangle');
});

test('uniqueness finder metadata is policy gated and registry ids remain unique',()=>{
  const ids=H.FINDERS.map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ['unique-rectangle','unique-loop','bug-plus-one']){
    const entry=H.FINDERS.find(x=>x.id===id);
    assert.ok(entry);
    assert.equal(entry.requiresUniqueness,true);
    assert.equal(C.TECHNIQUES[id].requiresUniqueness,true);
  }
});

test('solver reports uniqueness usage only when such a step is actually applied',()=>{
  const off=H.solve(uniqueRectangleState(),{techniques:['unique-rectangle'],maxSteps:1});
  assert.equal(off.status,'STALLED');
  assert.equal(off.usesUniquenessAssumption,false);
  const on=H.solve(uniqueRectangleState(),{techniques:['unique-rectangle'],allowUniqueness:true,maxSteps:1});
  assert.equal(on.steps.length,1);
  assert.equal(on.steps[0].techniqueId,'unique-rectangle');
  assert.equal(on.usesUniquenessAssumption,true);
  assert.equal(on.guessRequired,false);
});
