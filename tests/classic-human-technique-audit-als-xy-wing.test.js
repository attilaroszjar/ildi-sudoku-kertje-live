'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const W=require('../games/classic-human/als-xy-wing.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function als(key,cells,digits){return Object.freeze({key,cells:Object.freeze(cells.slice()),mask:maskOf(...digits),digits:Object.freeze(digits.slice()),size:cells.length,houseId:'fixture'});}
function pair(a,b,digit){return Object.freeze({a,b,rcc:Object.freeze([Object.freeze({digit,aCells:Object.freeze(a.cells.slice()),bCells:Object.freeze(b.cells.slice())})])});}

function fixture(digits={x:1,y:2,z:3}){
  const s=blankState();
  const pivot=als('P',[40],[digits.x,digits.y]);
  const left=als('L',[1],[digits.x,digits.z]);
  const right=als('R',[9],[digits.y,digits.z]);
  s.restrictMask(40,pivot.mask);
  s.restrictMask(1,left.mask);
  s.restrictMask(9,right.mask);
  s.restrictMask(10,maskOf(digits.z,9));
  return {s,pivot,left,right,pairs:[pair(pivot,left,digits.x),pair(pivot,right,digits.y)]};
}

test('ALS-XY-Wing uses two distinct RCCs from one pivot and eliminates only shared wing z',()=>{
  const {s,pivot,left,right,pairs}=fixture();
  const d=W.findAlsXyWing(s,{rccPairs:pairs}).find(x=>x.explanationData.pivotAls===pivot.key&&x.explanationData.leftAls===left.key&&x.explanationData.rightAls===right.key);
  assert.ok(d);
  assert.equal(d.techniqueId,'als-xy-wing');
  assert.equal(d.explanationData.xDigit===d.explanationData.yDigit,false);
  assert.equal(d.explanationData.zDigit,3);
  assert.ok(d.eliminations.some(e=>e.cell===10&&e.digit===3));
  assert.ok(d.eliminations.every(e=>e.digit===3));
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('ALS-XY-Wing rejects same-RCC near miss',()=>{
  const {s,pivot,left,right}=fixture();
  const bad=[pair(pivot,left,1),pair(pivot,right,1)];
  assert.equal(W.findAlsXyWing(s,{rccPairs:bad}).length,0);
});

test('ALS-XY-Wing rejects overlapping ALS triples',()=>{
  const {s,pivot,left}=fixture();
  const overlap=als('R2',[1],[2,3]);
  const bad=[pair(pivot,left,1),pair(pivot,overlap,2)];
  assert.equal(W.findAlsXyWing(s,{rccPairs:bad}).length,0);
});

test('ALS-XY-Wing only eliminates targets seeing every z occurrence in both wings',()=>{
  const s=blankState();
  const pivot=als('P',[40],[1,2]);
  // Both left-wing cells really contain z=3. They share row 1, so this is a
  // valid two-cell / three-candidate ALS. Cell 10 sees cell 1 and right cell 9,
  // but it does not see cell 7; therefore z=3 must not be eliminated at cell 10.
  const left=als('L',[1,7],[1,3,4]);
  const right=als('R',[9],[2,3]);
  for(const [cell,mask] of [[40,pivot.mask],[1,maskOf(1,3)],[7,maskOf(1,3,4)],[9,right.mask],[10,maskOf(3,9)]])s.restrictMask(cell,mask);
  const out=W.findAlsXyWing(s,{rccPairs:[pair(pivot,left,1),pair(pivot,right,2)]});
  assert.equal(out.some(d=>d.eliminations.some(e=>e.cell===10&&e.digit===3)),false);
});

test('ALS-XY-Wing deductions are deterministic',()=>{
  const a=fixture(),b=fixture();
  assert.deepEqual(W.findAlsXyWing(a.s,{rccPairs:a.pairs}).map(C.deductionStateKey),W.findAlsXyWing(b.s,{rccPairs:b.pairs}).map(C.deductionStateKey));
});

test('ALS-XY-Wing is preserved under digit relabeling',()=>{
  const {s,pairs}=fixture({x:4,y:5,z:6});
  const d=W.findAlsXyWing(s,{rccPairs:pairs}).find(x=>x.explanationData.zDigit===6);
  assert.ok(d);
  assert.ok(d.eliminations.some(e=>e.cell===10&&e.digit===6));
});
