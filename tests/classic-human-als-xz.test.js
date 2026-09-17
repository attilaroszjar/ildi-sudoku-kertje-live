'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const X=require('../games/classic-human/als-xz.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function stripDigitExcept(state,digit,keep){
  const allowed=new Set(keep),without=C.FULL_MASK&~C.bitForDigit(digit);
  for(let i=0;i<81;i++)if(!allowed.has(i)){
    const current=state.candidateMask(i),next=current&without;
    if(next&&next!==current)state.restrictMask(i,next);
  }
}
function fixture(targetCell=cell(1,0)){
  const s=blankState();
  const a0=cell(0,0),b0=cell(0,4),b1=cell(1,4);
  stripDigitExcept(s,1,[a0,b0]);
  stripDigitExcept(s,2,[a0,b1,targetCell]);
  s.restrictMask(a0,C.bitForDigit(1)|C.bitForDigit(2));
  s.restrictMask(b0,C.bitForDigit(1)|C.bitForDigit(3));
  s.restrictMask(b1,C.bitForDigit(2)|C.bitForDigit(3));
  s.restrictMask(targetCell,C.bitForDigit(2)|C.bitForDigit(4));
  const a={key:'A',cells:[a0],mask:C.bitForDigit(1)|C.bitForDigit(2),digits:[1,2],size:1,houseId:'r1'};
  const b={key:'B',cells:[b0,b1],mask:C.bitForDigit(1)|C.bitForDigit(2)|C.bitForDigit(3),digits:[1,2,3],size:2,houseId:'c5'};
  const pair={a,b,rcc:[{digit:1,aCells:[a0],bCells:[b0]}]};
  return {s,pair,targetCell};
}

test('ALS-XZ eliminates Z from a cell seeing every Z occurrence in both ALSs',()=>{
  const {s,pair,targetCell}=fixture();
  const d=X.findAlsXz(s,{rccPairs:[pair]}).find(x=>x.eliminations.some(e=>e.cell===targetCell&&e.digit===2));
  assert.ok(d);
  assert.equal(d.techniqueId,'als-xz');
  assert.equal(d.explanationData.xDigit,1);
  assert.equal(d.explanationData.zDigit,2);
});

test('ALS-XZ does not eliminate when target cannot see every Z occurrence',()=>{
  const {s,pair}=fixture(cell(8,8));
  assert.equal(X.findAlsXz(s,{rccPairs:[pair]}).length,0);
});

test('ALS-XZ needs a second common candidate besides the RCC',()=>{
  const {s,pair}=fixture();
  pair.b.mask=C.bitForDigit(1)|C.bitForDigit(3)|C.bitForDigit(4);
  assert.equal(X.findAlsXz(s,{rccPairs:[pair]}).length,0);
});

test('ALS-XZ does not eliminate from cells belonging to either ALS',()=>{
  const {s,pair}=fixture();
  const blocked=new Set(pair.a.cells.concat(pair.b.cells));
  for(const d of X.findAlsXz(s,{rccPairs:[pair]}))for(const e of d.eliminations)assert.equal(blocked.has(e.cell),false);
});

test('ALS-XZ output is deterministic',()=>{
  const {s,pair}=fixture();
  const a=X.findAlsXz(s,{rccPairs:[pair]}).map(d=>({e:d.eliminations,x:d.explanationData.xDigit,z:d.explanationData.zDigit}));
  const b=X.findAlsXz(s,{rccPairs:[pair]}).map(d=>({e:d.eliminations,x:d.explanationData.xDigit,z:d.explanationData.zDigit}));
  assert.deepEqual(a,b);
});
