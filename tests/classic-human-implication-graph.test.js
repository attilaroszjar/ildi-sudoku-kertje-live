'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const G=require('../games/classic-human/implication-graph.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function keepDigitOnlyAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,state.candidateMask(i)&without||state.candidateMask(i));
  return state;
}


test('candidate graph creates weak cell links and strong bivalue links',()=>{
  const s=blankState(),a=cell(0,0);
  s.restrictMask(a,maskOf(1,2));
  const g=G.buildGraph(s),n1=G.nodeKey(a,1),n2=G.nodeKey(a,2);
  const edges=g.adj[n1].filter(e=>(e.a===n2||e.b===n2));
  assert.ok(edges.some(e=>e.type==='weak'));
  assert.ok(edges.some(e=>e.type==='strong'));
});

test('candidate graph creates conjugate strong link for exactly two house positions',()=>{
  const s=blankState(),a=cell(0,0),b=cell(0,4),bit=C.bitForDigit(5),without=C.FULL_MASK&~bit;
  for(let c=0;c<9;c++)if(c!==0&&c!==4)s.restrictMask(cell(0,c),s.candidateMask(cell(0,c))&without);
  const g=G.buildGraph(s),na=G.nodeKey(a,5),nb=G.nodeKey(b,5);
  const edges=g.adj[na].filter(e=>(e.a===nb||e.b===nb));
  assert.ok(edges.some(e=>e.type==='strong'&&e.reason.kind==='conjugate'&&e.reason.houseType==='row'));
});

test('house pair with a third candidate remains weak only',()=>{
  const s=blankState(),cells=[cell(0,0),cell(0,4),cell(0,8)],bit=C.bitForDigit(5),without=C.FULL_MASK&~bit;
  for(let c=0;c<9;c++)if(![0,4,8].includes(c))s.restrictMask(cell(0,c),s.candidateMask(cell(0,c))&without);
  const g=G.buildGraph(s),a=G.nodeKey(cells[0],5),b=G.nodeKey(cells[1],5);
  const edges=g.adj[a].filter(e=>(e.a===b||e.b===b));
  assert.ok(edges.some(e=>e.type==='weak'));
  assert.equal(edges.some(e=>e.type==='strong'&&e.reason.kind==='conjugate'&&e.reason.houseType==='row'),false);
});

test('alternating path search respects strong weak alternation and depth bound',()=>{
  const s=blankState();
  const a=cell(0,0),b=cell(0,4),c=cell(3,4);
  s.restrictMask(a,maskOf(1,2));
  s.restrictMask(b,maskOf(1,2));
  s.restrictMask(c,maskOf(2,3));
  const g=G.buildGraph(s),start=G.nodeKey(a,1);
  const paths=G.alternatingPaths(g,start,{firstType:'strong',maxEdges:3});
  assert.ok(paths.length>0);
  for(const p of paths){
    assert.ok(p.length<=3);
    p.edges.forEach((e,i)=>assert.equal(e.type,i%2===0?'strong':'weak'));
  }
});

test('alternating path search prunes repeated nodes and is deterministic',()=>{
  const s=blankState();
  for(const [r,c,ds] of [[0,0,[1,2]],[0,4,[1,2]],[4,4,[2,3]],[4,0,[1,3]]])s.restrictMask(cell(r,c),maskOf(...ds));
  const g=G.buildGraph(s),start=G.nodeKey(cell(0,0),1);
  const a=G.alternatingPaths(g,start,{firstType:'strong',maxEdges:6}).map(p=>p.end+'|'+p.edges.map(e=>e.type+':'+e.a+'>'+e.b).join(','));
  const b=G.alternatingPaths(g,start,{firstType:'strong',maxEdges:6}).map(p=>p.end+'|'+p.edges.map(e=>e.type+':'+e.a+'>'+e.b).join(','));
  assert.deepEqual(a,b);
});

test('alternating path search rejects unsafe unbounded depth requests',()=>{
  const s=blankState(),g=G.buildGraph(s),start=g.keys[0];
  assert.throws(()=>G.alternatingPaths(g,start,{maxEdges:100}),/maxEdges/);
});
