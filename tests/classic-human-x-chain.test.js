'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const G=require('../games/classic-human/implication-graph.js');
const X=require('../games/classic-human/chains.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function keepDigitOnlyAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
  return state;
}
function xFixture(){
  const s=blankState();
  const A=cell(0,0),B=cell(0,4),C1=cell(3,4),D=cell(3,1),T=cell(1,1);
  // Fillers prevent accidental strong links through box 1 and column 2.
  const F1=cell(2,2),F2=cell(6,1);
  keepDigitOnlyAt(s,5,[A,B,C1,D,T,F1,F2]);
  return {s,A,B,C:C1,D,T};
}

test('X-Chain finds strong-weak-strong path for one digit',()=>{
  const {s,A,B,C:C1,D}=xFixture();
  const graph=G.buildGraph(s);
  const start=G.nodeKey(A,5),end=G.nodeKey(D,5);
  const paths=X.xChainPaths(graph,start,5,7);
  const p=paths.find(x=>x.end===end&&x.length===3);
  assert.ok(p);
  assert.deepEqual(p.edges.map(e=>e.type),['strong','weak','strong']);
  const nodes=[start];let cur=start;
  for(const e of p.edges){cur=e.a===cur?e.b:e.a;nodes.push(cur);}
  assert.deepEqual(nodes,[G.nodeKey(A,5),G.nodeKey(B,5),G.nodeKey(C1,5),G.nodeKey(D,5)]);
});

test('X-Chain eliminates the digit from a cell seeing both endpoints',()=>{
  const {s,A,D,T}=xFixture();
  const d=X.findXChain(s,{maxEdges:7}).find(x=>
    x.explanationData.digit===5&&
    x.explanationData.startCell===A&&
    x.explanationData.endCell===D&&
    x.eliminations.some(e=>e.cell===T&&e.digit===5)
  );
  assert.ok(d);
  assert.equal(d.techniqueId,'x-chain');
  assert.equal(d.complexity.chainLength,3);
});

test('X-Chain near miss has no elimination when no candidate sees both endpoints',()=>{
  const {s,T}=xFixture();
  s.eliminate(T,5);
  const matches=X.findXChain(s,{maxEdges:3}).filter(x=>x.explanationData.digit===5);
  assert.equal(matches.some(x=>x.eliminations.some(e=>e.cell===T&&e.digit===5)),false);
});

test('X-Chain path search enforces a bounded depth',()=>{
  const {s,A}=xFixture(),graph=G.buildGraph(s),start=G.nodeKey(A,5);
  assert.throws(()=>X.xChainPaths(graph,start,5,16),/3\.\.15/);
});

test('X-Chain output is deterministic',()=>{
  const {s}=xFixture();
  const a=X.findXChain(s,{maxEdges:7}).map(C.deductionStateKey);
  const b=X.findXChain(s,{maxEdges:7}).map(C.deductionStateKey);
  assert.deepEqual(a,b);
});
