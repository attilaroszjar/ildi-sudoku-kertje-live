'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const W=require('../games/classic-human/als-xy-wing.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function stripDigitExcept(state,digit,keep){
  const allowed=new Set(keep),without=C.FULL_MASK&~C.bitForDigit(digit);
  for(let i=0;i<81;i++)if(!allowed.has(i))state.restrictMask(i,state.masks[i]&without);
}
function fixture(targetCell=cell(2,0)){
  const s=blankState();
  const a0=cell(0,0),a1=cell(0,1),b0=cell(1,0),c0=cell(1,1);
  stripDigitExcept(s,3,[b0,c0,targetCell]);
  s.restrictMask(a0,mask(1,4));
  s.restrictMask(a1,mask(2,4));
  s.restrictMask(b0,mask(1,3));
  s.restrictMask(c0,mask(2,3));
  s.restrictMask(targetCell,mask(3,5));
  const a={key:'A',cells:[a0,a1],mask:mask(1,2,4),digits:[1,2,4],size:2,houseId:'r1'};
  const b={key:'B',cells:[b0],mask:mask(1,3),digits:[1,3],size:1,houseId:'c1'};
  const c={key:'C',cells:[c0],mask:mask(2,3),digits:[2,3],size:1,houseId:'c2'};
  const pairs=[
    {a,b,rcc:[{digit:1,aCells:[a0],bCells:[b0]}]},
    {a,b:c,rcc:[{digit:2,aCells:[a1],bCells:[c0]}]}
  ];
  return {s,a,b,c,pairs,targetCell};
}

test('ALS-XY-Wing eliminates Z seen from both wing ALSs',()=>{
  const {s,pairs,targetCell}=fixture();
  const d=W.findAlsXyWing(s,{rccPairs:pairs}).find(x=>x.eliminations.some(e=>e.cell===targetCell&&e.digit===3));
  assert.ok(d);
  assert.equal(d.techniqueId,'als-xy-wing');
  assert.equal(d.explanationData.xDigit,1);
  assert.equal(d.explanationData.yDigit,2);
  assert.equal(d.explanationData.zDigit,3);
});

test('ALS-XY-Wing requires two different RCC digits at the pivot',()=>{
  const {s,pairs}=fixture();
  pairs[1].rcc=[{digit:1,aCells:[pairs[1].a.cells[0]],bCells:[pairs[1].b.cells[0]]}];
  assert.equal(W.findAlsXyWing(s,{rccPairs:pairs}).length,0);
});

test('ALS-XY-Wing does not eliminate when no external Z sees both wings',()=>{
  const {s,pairs}=fixture(cell(8,8));
  assert.equal(W.findAlsXyWing(s,{rccPairs:pairs}).length,0);
});

test('ALS-XY-Wing never eliminates inside any participating ALS',()=>{
  const {s,a,b,c,pairs}=fixture();
  const blocked=new Set(a.cells.concat(b.cells,c.cells));
  for(const d of W.findAlsXyWing(s,{rccPairs:pairs}))for(const e of d.eliminations)assert.equal(blocked.has(e.cell),false);
});

test('ALS-XY-Wing output is deterministic',()=>{
  const {s,pairs}=fixture();
  const project=()=>W.findAlsXyWing(s,{rccPairs:pairs}).map(d=>({e:d.eliminations,x:d.explanationData.xDigit,y:d.explanationData.yDigit,z:d.explanationData.zDigit,p:d.explanationData.pivotAls}));
  assert.deepEqual(project(),project());
});
