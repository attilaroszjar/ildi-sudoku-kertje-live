'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const Chains=require('../games/classic-human/chains.js');
const AIC=require('../games/classic-human/aic.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function edge(a,b,type,reason){return Object.freeze({a,b,type,reason:reason||null});}
function graph(nodes,edges){
  const nodeMap={},adj={};
  for(const key of nodes){nodeMap[key]=Object.freeze({key});adj[key]=[];}
  for(const e of edges){adj[e.a].push(e);adj[e.b].push(e);}
  for(const key of nodes)adj[key].sort((x,y)=>x.type.localeCompare(y.type)||String(x.a+x.b).localeCompare(String(y.a+y.b)));
  return Object.freeze({nodes:Object.freeze(nodeMap),keys:Object.freeze(nodes.slice().sort()),edges:Object.freeze(edges.slice()),adj});
}

function xGraph(){
  return graph(['0:1','9:1','10:1','1:1'],[
    edge('0:1','9:1','strong',{kind:'conjugate'}),
    edge('9:1','10:1','weak',{kind:'house'}),
    edge('10:1','1:1','strong',{kind:'conjugate'})
  ]);
}

function aicGraph(){
  return graph(['0:1','0:2','1:2','10:2','10:1','19:1'],[
    edge('0:1','0:2','strong',{kind:'bivalue'}),
    edge('0:2','1:2','weak',{kind:'house'}),
    edge('1:2','10:2','strong',{kind:'conjugate'}),
    edge('10:2','10:1','weak',{kind:'cell'}),
    edge('10:1','19:1','strong',{kind:'conjugate'})
  ]);
}

test('X-Chain follows strict strong/weak alternation and produces a sound common-endpoint elimination',()=>{
  const s=blankState(),g=xGraph();
  const paths=Chains.xChainPaths(g,'0:1',1,7);
  assert.equal(paths.length,1);
  assert.equal(paths[0].length,3);
  assert.deepEqual(paths[0].edges.map(e=>e.type),['strong','weak','strong']);
  const d=H.findXChain(s,{graph:g,maxEdges:7}).find(x=>x.eliminations.some(e=>e.cell===2&&e.digit===1));
  assert.ok(d);
  assert.equal(d.techniqueId,'x-chain');
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('X-Chain rejects non-alternating and over-budget paths',()=>{
  const bad=graph(['0:1','9:1','10:1','1:1'],[
    edge('0:1','9:1','strong'),edge('9:1','10:1','strong'),edge('10:1','1:1','strong')
  ]);
  assert.equal(Chains.xChainPaths(bad,'0:1',1,7).length,0);
  assert.throws(()=>Chains.xChainPaths(xGraph(),'0:1',1,2),/3\.\.15/);
});

test('X-Chain pruning is deterministic and keeps the shortest state-equivalent path',()=>{
  const g=xGraph();
  const a=Chains.xChainPaths(g,'0:1',1,7);
  const b=Chains.xChainPaths(g,'0:1',1,7);
  assert.deepEqual(a,b);
  assert.equal(a[0].end,'1:1');
});

function xyChainFixture(){
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(9,maskOf(2,3));
  s.restrictMask(10,maskOf(3,1));
  return s;
}

test('XY-Chain requires a bivalue chain with propagated linking digits and sound endpoint elimination',()=>{
  const s=xyChainFixture();
  const paths=Chains.xyChainPaths(s,0,1,8);
  assert.ok(paths.some(p=>p.cells.join(',')==='0,9,10'&&p.digit===1));
  const d=H.findXYChain(s,{maxCells:8}).find(x=>x.explanationData.cells.join(',')==='0,9,10'&&x.eliminations.some(e=>e.cell===1&&e.digit===1));
  assert.ok(d);
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('XY-Chain rejects a broken visibility link and enforces its bounded search contract',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(40,maskOf(2,3));
  s.restrictMask(41,maskOf(3,1));
  assert.equal(Chains.xyChainPaths(s,0,1,8).some(p=>p.cells.includes(40)),false);
  assert.throws(()=>Chains.xyChainPaths(xyChainFixture(),0,1,13),/3\.\.12/);
});

test('XY-Chain detection is deterministic and digit-label invariant',()=>{
  const a=H.findXYChain(xyChainFixture(),{maxCells:8}).map(C.deductionStateKey);
  const b=H.findXYChain(xyChainFixture(),{maxCells:8}).map(C.deductionStateKey);
  assert.deepEqual(a,b);
  const s=blankState();
  s.restrictMask(0,maskOf(4,5));
  s.restrictMask(9,maskOf(5,6));
  s.restrictMask(10,maskOf(6,4));
  assert.ok(H.findXYChain(s,{maxCells:8}).some(d=>d.eliminations.some(e=>e.cell===1&&e.digit===4)));
});

test('AIC open path requires alternating links, mixed implication structure, and same-digit endpoints',()=>{
  const g=aicGraph();
  const paths=AIC.aicPaths(g,'0:1',9);
  assert.equal(paths.length,1);
  assert.equal(paths[0].end,'19:1');
  assert.deepEqual(paths[0].edges.map(e=>e.type),['strong','weak','strong','weak','strong']);
  assert.equal(paths[0].shape,'open');
});

test('AIC excludes pure X/XY paths from the generic AIC classifier and respects budgets',()=>{
  assert.equal(AIC.aicPaths(xGraph(),'0:1',9).length,0);
  const pureXY=graph(['0:1','0:2','1:2','1:1'],[
    edge('0:1','0:2','strong',{kind:'bivalue'}),
    edge('0:2','1:2','weak',{kind:'house'}),
    edge('1:2','1:1','strong',{kind:'bivalue'})
  ]);
  assert.equal(AIC.aicPaths(pureXY,'0:1',9).length,0);
  assert.throws(()=>AIC.aicPaths(aicGraph(),'0:1',16),/3\.\.15/);
});

test('AIC path enumeration is deterministic under identical graph input',()=>{
  assert.deepEqual(AIC.aicPaths(aicGraph(),'0:1',9),AIC.aicPaths(aicGraph(),'0:1',9));
});
