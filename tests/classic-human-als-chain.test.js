'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const Ch=require('../games/classic-human/als-chain.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function als(key,cellIndex,digits){return {key,cells:[cellIndex],mask:mask(...digits),digits:digits.slice(),size:1,houseId:'synthetic'};}
function stripDigitExcept(state,digit,keep){
  const allowed=new Set(keep),without=C.FULL_MASK&~C.bitForDigit(digit);
  for(let i=0;i<81;i++)if(!allowed.has(i))state.restrictMask(i,state.masks[i]&without);
}
function fixture(target=cell(2,2)){
  const s=blankState();
  const A=als('A',cell(0,0),[1,4]);
  const B=als('B',cell(0,4),[1,2]);
  const Cc=als('C',cell(4,4),[2,3]);
  const D=als('D',cell(1,1),[3,4]);
  stripDigitExcept(s,4,[A.cells[0],D.cells[0],target]);
  s.restrictMask(A.cells[0],A.mask);
  s.restrictMask(B.cells[0],B.mask);
  s.restrictMask(Cc.cells[0],Cc.mask);
  s.restrictMask(D.cells[0],D.mask);
  s.restrictMask(target,mask(4,5));
  const pairs=[
    {a:A,b:B,rcc:[{digit:1,aCells:A.cells,bCells:B.cells}]},
    {a:B,b:Cc,rcc:[{digit:2,aCells:B.cells,bCells:Cc.cells}]},
    {a:Cc,b:D,rcc:[{digit:3,aCells:Cc.cells,bCells:D.cells}]}
  ];
  return {s,A,B,C:Cc,D,pairs,target};
}

test('ALS chain graph creates one edge per RCC digit',()=>{
  const {pairs}=fixture();
  const g=Ch.buildGraph(pairs);
  assert.equal(Object.keys(g.nodes).length,4);
  assert.equal(g.adj.B.length,2);
  assert.deepEqual(g.adj.B.map(e=>e.digit).sort((a,b)=>a-b),[1,2]);
});

test('ALS chain bounded search requires at least four ALS nodes',()=>{
  const {pairs}=fixture();
  const g=Ch.buildGraph(pairs.slice(0,2));
  assert.equal(Ch.boundedPaths(g,'A',{maxAls:4}).length,0);
});

test('ALS chain bounded search rejects repeated RCC digits on adjacent links',()=>{
  const {A,B,C,D}=fixture();
  const pairs=[
    {a:A,b:B,rcc:[{digit:1}]},
    {a:B,b:C,rcc:[{digit:1}]},
    {a:C,b:D,rcc:[{digit:3}]}
  ];
  assert.equal(Ch.boundedPaths(Ch.buildGraph(pairs),'A',{maxAls:4}).length,0);
});

test('ALS-Chain eliminates endpoint common Z through a four-ALS RCC chain',()=>{
  const {s,pairs,target}=fixture();
  const d=Ch.findAlsChain(s,{rccPairs:pairs,maxAls:4}).find(x=>x.eliminations.some(e=>e.cell===target&&e.digit===4));
  assert.ok(d);
  assert.equal(d.techniqueId,'als-chain');
  assert.deepEqual(d.explanationData.rccDigits,[1,2,3]);
  assert.equal(d.explanationData.zDigit,4);
  assert.equal(d.complexity.alsCount,4);
});

test('ALS-Chain emits no deduction when endpoint Z has no common external peer',()=>{
  const {s,pairs}=fixture(cell(8,8));
  assert.equal(Ch.findAlsChain(s,{rccPairs:pairs,maxAls:4}).length,0);
});

test('ALS-Chain hard-bounds ALS count',()=>{
  const {pairs}=fixture();
  const g=Ch.buildGraph(pairs);
  assert.throws(()=>Ch.boundedPaths(g,'A',{maxAls:7}),/4..6/);
  assert.throws(()=>Ch.boundedPaths(g,'A',{maxAls:3}),/4..6/);
});

test('ALS-Chain output is deterministic',()=>{
  const {s,pairs}=fixture();
  const project=()=>Ch.findAlsChain(s,{rccPairs:pairs,maxAls:4}).map(d=>({e:d.eliminations,p:d.explanationData.alsPath,r:d.explanationData.rccDigits,z:d.explanationData.zDigit}));
  assert.deepEqual(project(),project());
});
