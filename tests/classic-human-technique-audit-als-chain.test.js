'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const Chain=require('../games/classic-human/als-chain.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function als(key,cells,digits){return Object.freeze({key,cells:Object.freeze(cells.slice()),mask:maskOf(...digits),digits:Object.freeze(digits.slice()),size:cells.length,houseId:'fixture'});}
function rcc(a,b,digit){return Object.freeze({a,b,rcc:Object.freeze([Object.freeze({digit,aCells:Object.freeze(a.cells.slice()),bCells:Object.freeze(b.cells.slice())})])});}

function fixture(d={a:1,b:2,c:3,z:4}){
  const s=blankState();
  const A=als('A',[0],[d.a,d.z]);
  const B=als('B',[9],[d.a,d.b]);
  const Cc=als('C',[18],[d.b,d.c]);
  const D=als('D',[2],[d.c,d.z]);
  for(const x of [A,B,Cc,D])s.restrictMask(x.cells[0],x.mask);
  s.restrictMask(1,maskOf(d.z,9));
  const pairs=[rcc(A,B,d.a),rcc(B,Cc,d.b),rcc(Cc,D,d.c)];
  return {s,A,B,C:Cc,D,pairs};
}

test('ALS-Chain builds a four-ALS path with distinct consecutive RCC digits and eliminates endpoint z',()=>{
  const {s,pairs}=fixture();
  const graph=Chain.buildGraph(pairs);
  const paths=Chain.boundedPaths(graph,'A',{maxAls:6});
  const p=paths.find(x=>x.nodes.join('>')==='A>B>C>D');
  assert.ok(p);
  assert.deepEqual(p.edges.map(e=>e.digit),[1,2,3]);
  const d=Chain.findAlsChain(s,{rccPairs:pairs,maxAls:6}).find(x=>x.explanationData.alsPath.join('>')==='A>B>C>D');
  assert.ok(d);
  assert.equal(d.explanationData.zDigit,4);
  assert.ok(d.eliminations.some(e=>e.cell===1&&e.digit===4));
  assert.ok(d.eliminations.every(e=>e.digit===4));
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('ALS-Chain rejects consecutive reuse of the same RCC digit',()=>{
  const {A,B,C,D}=fixture();
  const bad=Chain.buildGraph([rcc(A,B,1),rcc(B,C,1),rcc(C,D,3)]);
  assert.equal(Chain.boundedPaths(bad,'A',{maxAls:6}).some(p=>p.nodes.join('>')==='A>B>C>D'),false);
});

test('ALS-Chain rejects paths containing overlapping ALS nodes',()=>{
  const {A,B,C}=fixture();
  const overlap=als('D2',[0],[3,4]);
  const g=Chain.buildGraph([rcc(A,B,1),rcc(B,C,2),rcc(C,overlap,3)]);
  assert.equal(Chain.boundedPaths(g,'A',{maxAls:6}).some(p=>p.nodes.includes('D2')),false);
});

test('ALS-Chain only eliminates cells seeing every z occurrence in both endpoint ALSs',()=>{
  const s=blankState();
  const A=als('A',[0,40],[1,4,5]);
  const B=als('B',[18],[1,2]);
  const Cc=als('C',[27],[2,3]);
  const D=als('D',[2],[3,4]);
  s.restrictMask(0,maskOf(1,4));
  s.restrictMask(40,maskOf(1,4,5));
  s.restrictMask(18,B.mask);
  s.restrictMask(27,Cc.mask);
  s.restrictMask(2,D.mask);
  s.restrictMask(1,maskOf(4,9));
  const out=Chain.findAlsChain(s,{rccPairs:[rcc(A,B,1),rcc(B,Cc,2),rcc(Cc,D,3)],maxAls:6});
  assert.equal(out.some(d=>d.eliminations.some(e=>e.cell===1&&e.digit===4)),false);
});

test('ALS-Chain bounded path contract is strict and deterministic',()=>{
  const {pairs}=fixture();
  const g=Chain.buildGraph(pairs);
  assert.throws(()=>Chain.boundedPaths(g,'A',{maxAls:3}),/4\.\.6/);
  assert.throws(()=>Chain.boundedPaths(g,'A',{maxAls:7}),/4\.\.6/);
  assert.deepEqual(Chain.boundedPaths(g,'A',{maxAls:6}),Chain.boundedPaths(g,'A',{maxAls:6}));
});

test('ALS-Chain is invariant under digit relabeling',()=>{
  const {s,pairs}=fixture({a:5,b:6,c:7,z:8});
  const d=Chain.findAlsChain(s,{rccPairs:pairs,maxAls:6}).find(x=>x.explanationData.zDigit===8);
  assert.ok(d);
  assert.ok(d.eliminations.some(e=>e.cell===1&&e.digit===8));
});
