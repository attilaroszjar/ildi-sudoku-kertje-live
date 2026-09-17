'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const AlsXz=require('../games/classic-human/als-xz.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function validPair(){
  return {
    a:{key:'A',cells:[0,1],mask:maskOf(1,2,3),size:2},
    b:{key:'B',cells:[18],mask:maskOf(1,2),size:1},
    rcc:[{digit:1,aCells:[0],bCells:[18]}]
  };
}
function positiveState(){
  const s=blankState();
  const bit2=C.bitForDigit(2);
  for(let cell=0;cell<81;cell++){
    if(cell===0||cell===1||cell===18||cell===9)continue;
    s.restrictMask(cell,s.masks[cell]&~bit2);
  }
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(2,3));
  s.restrictMask(18,maskOf(1,2));
  return s;
}

test('ALS-XZ eliminates shared z only from cells that see every z occurrence in both ALSes',()=>{
  const s=positiveState();
  const d=AlsXz.findAlsXz(s,{rccPairs:[validPair()]}).find(x=>x.explanationData.xDigit===1&&x.explanationData.zDigit===2);
  assert.ok(d);
  assert.deepEqual(d.eliminations,[{cell:9,digit:2}]);
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('ALS-XZ does not eliminate the RCC digit itself',()=>{
  const s=positiveState();
  const list=AlsXz.findAlsXz(s,{rccPairs:[validPair()]});
  assert.equal(list.some(d=>d.eliminations.some(e=>e.digit===1)),false);
});

test('ALS-XZ returns no deduction when no external z target sees both ALS z sets',()=>{
  const s=positiveState();
  s.restrictMask(9,s.masks[9]&~C.bitForDigit(2));
  assert.equal(AlsXz.findAlsXz(s,{rccPairs:[validPair()]}).length,0);
});

test('ALS-XZ blocks eliminations inside either ALS',()=>{
  const s=positiveState();
  const list=AlsXz.findAlsXz(s,{rccPairs:[validPair()]});
  for(const d of list)for(const e of d.eliminations)assert.equal([0,1,18].includes(e.cell),false);
});

test('ALS-XZ is deterministic for identical RCC input and candidate state',()=>{
  const a=AlsXz.findAlsXz(positiveState(),{rccPairs:[validPair()]}).map(C.deductionStateKey);
  const b=AlsXz.findAlsXz(positiveState(),{rccPairs:[validPair()]}).map(C.deductionStateKey);
  assert.deepEqual(a,b);
});

test('ALS-XZ logic is invariant under digit relabeling',()=>{
  const s=blankState(),bit5=C.bitForDigit(5);
  for(let cell=0;cell<81;cell++){
    if(cell===0||cell===1||cell===18||cell===9)continue;
    s.restrictMask(cell,s.masks[cell]&~bit5);
  }
  s.restrictMask(0,maskOf(4,5));
  s.restrictMask(1,maskOf(5,6));
  s.restrictMask(18,maskOf(4,5));
  const pair={a:{key:'A',cells:[0,1],mask:maskOf(4,5,6),size:2},b:{key:'B',cells:[18],mask:maskOf(4,5),size:1},rcc:[{digit:4,aCells:[0],bCells:[18]}]};
  const d=AlsXz.findAlsXz(s,{rccPairs:[pair]}).find(x=>x.explanationData.zDigit===5);
  assert.ok(d);
  assert.deepEqual(d.eliminations,[{cell:9,digit:5}]);
});

test('full solver integration can select ALS-XZ on a real candidate state',()=>{
  const s=positiveState();
  const d=H.findNext(s,{techniques:['als-xz']});
  assert.ok(d);
  assert.equal(d.techniqueId,'als-xz');
  assert.ok(d.eliminations.length>0);
});
