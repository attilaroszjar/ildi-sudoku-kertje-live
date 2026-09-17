'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function keepDigitOnlyAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
  return state;
}

test('canonical classic entry exports simple coloring',()=>{
  assert.equal(typeof H.findSimpleColoring,'function');
  assert.ok(H.FINDERS.some(x=>x.id==='simple-coloring'));
});

test('findNext selects simple coloring when explicitly enabled',()=>{
  const s=blankState();
  const a=cell(0,0),b=cell(0,1),c=cell(1,1),guard=cell(2,2);
  keepDigitOnlyAt(s,6,[a,b,c,guard]);
  const d=H.findNext(s,{techniques:['simple-coloring']});
  assert.ok(d);
  assert.equal(d.techniqueId,'simple-coloring');
});

test('simple coloring priority remains contract driven',()=>{
  const entry=H.FINDERS.find(x=>x.id==='simple-coloring');
  assert.ok(entry);
  assert.equal(C.TECHNIQUES['simple-coloring'].priority,210);
  assert.ok(C.TECHNIQUES['simple-coloring'].priority>C.TECHNIQUES['naked-quad'].priority);
  assert.ok(C.TECHNIQUES['simple-coloring'].priority<C.TECHNIQUES['multi-coloring'].priority);
});

test('coloring integration does not introduce guessing',()=>{
  const empty=Array.from({length:9},()=>Array(9).fill(0));
  const r=H.solve(empty,{techniques:['simple-coloring'],maxSteps:4});
  assert.equal(r.guessRequired,false);
  assert.equal(r.status,'STALLED');
});
