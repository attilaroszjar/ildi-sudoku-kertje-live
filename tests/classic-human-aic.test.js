'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const A=require('../games/classic-human/aic.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function node(cellIndex,digit){return cellIndex+':'+digit;}
function edge(a,b,type,kind){return {a,b,type,reason:{kind}};}
function graph(nodes,edges){
  const map={},adj={};
  for(const key of nodes){map[key]={key,cell:Number(key.split(':')[0]),digit:Number(key.split(':')[1])};adj[key]=[];}
  for(const e of edges){adj[e.a].push(e);adj[e.b].push(e);}
  return {nodes:map,keys:nodes.slice().sort(),edges:edges.slice(),adj};
}
function restrictDigitTargets(state,digit,keepCells){
  const keep=new Set(keepCells),without=C.FULL_MASK&~C.bitForDigit(digit);
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
}

test('open AIC finds a mixed strong-weak-strong path and eliminates from a common peer',()=>{
  const s=blankState();
  const a=cell(0,0),b=cell(0,3),c=cell(3,3),d=cell(3,6),target=cell(0,6);
  restrictDigitTargets(s,1,[a,b,d,target]);
  const n1=node(a,1),n2=node(b,2),n3=node(c,2),n4=node(d,1);
  const g=graph([n1,n2,n3,n4],[
    edge(n1,n2,'strong','bivalue'),
    edge(n2,n3,'weak','house'),
    edge(n3,n4,'strong','conjugate')
  ]);
  const paths=A.aicPaths(g,n1,5);
  assert.equal(paths.length,1);
  assert.equal(paths[0].end,n4);
  const deds=A.findAIC(s,{graph:g,maxEdges:5});
  const d0=deds.find(x=>x.explanationData.shape==='open');
  assert.ok(d0);
  assert.deepEqual(d0.eliminations,[{cell:target,digit:1}]);
  assert.equal(d0.techniqueId,'aic');
});

test('open AIC does not relabel a pure X-Chain',()=>{
  const a=node(cell(0,0),4),b=node(cell(0,3),4),c=node(cell(3,3),4),d=node(cell(3,6),4);
  const g=graph([a,b,c,d],[
    edge(a,b,'strong','conjugate'),edge(b,c,'weak','house'),edge(c,d,'strong','conjugate')
  ]);
  assert.equal(A.aicPaths(g,a,5).length,0);
});

test('open AIC does not relabel a pure XY-Chain',()=>{
  const a=node(cell(0,0),1),b=node(cell(0,0),2),c=node(cell(0,3),2),d=node(cell(0,3),1);
  const g=graph([a,b,c,d],[
    edge(a,b,'strong','bivalue'),edge(b,c,'weak','house'),edge(c,d,'strong','bivalue')
  ]);
  assert.equal(A.aicPaths(g,a,5).length,0);
});

test('Nice Loop strong discontinuity places the discontinuity candidate',()=>{
  const s=blankState();
  const a=node(cell(0,0),1),b=node(cell(0,0),2),c=node(cell(0,3),2);
  const g=graph([a,b,c],[
    edge(a,b,'strong','bivalue'),edge(b,c,'weak','house'),edge(c,a,'strong','conjugate')
  ]);
  const loops=A.niceLoops(g,a,'strong',5);
  assert.ok(loops.length>0);
  const d=A.findAIC(s,{graph:g,maxEdges:5}).find(x=>x.explanationData.shape==='nice-loop'&&x.explanationData.discontinuity==='strong');
  assert.ok(d);
  assert.deepEqual(d.placements,[{cell:cell(0,0),digit:1}]);
  assert.deepEqual(d.eliminations,[]);
});

test('Nice Loop weak discontinuity eliminates the discontinuity candidate',()=>{
  const s=blankState();
  const a=node(cell(0,0),1),b=node(cell(0,3),1),c=node(cell(0,3),2);
  const g=graph([a,b,c],[
    edge(a,b,'weak','house'),edge(b,c,'strong','bivalue'),edge(c,a,'weak','house')
  ]);
  const loops=A.niceLoops(g,a,'weak',5);
  assert.ok(loops.length>0);
  const d=A.findAIC(s,{graph:g,maxEdges:5}).find(x=>x.explanationData.shape==='nice-loop'&&x.explanationData.discontinuity==='weak');
  assert.ok(d);
  assert.deepEqual(d.eliminations,[{cell:cell(0,0),digit:1}]);
  assert.deepEqual(d.placements,[]);
});

test('Nice Loop rejects even cycles that create a second discontinuity',()=>{
  const a=node(cell(0,0),1),b=node(cell(0,0),2),c=node(cell(0,3),2),d=node(cell(3,3),2);
  const g=graph([a,b,c,d],[
    edge(a,b,'strong','bivalue'),
    edge(b,c,'weak','house'),
    edge(c,d,'strong','conjugate'),
    edge(d,a,'strong','conjugate')
  ]);
  assert.deepEqual(A.niceLoops(g,a,'strong',6),[]);
});

test('AIC search enforces a bounded depth',()=>{
  const s=blankState();
  assert.throws(()=>A.findAIC(s,{maxEdges:16}),/3\.\.15/);
  assert.throws(()=>A.aicPaths({nodes:{},keys:[],adj:{}},'0:1',2),/3\.\.15/);
});

test('AIC output is deterministic on a controlled graph',()=>{
  const s=blankState();
  const a=cell(0,0),b=cell(0,3),c=cell(3,3),d=cell(3,6),target=cell(0,6);
  restrictDigitTargets(s,1,[a,b,d,target]);
  const n1=node(a,1),n2=node(b,2),n3=node(c,2),n4=node(d,1);
  const g=graph([n1,n2,n3,n4],[edge(n1,n2,'strong','bivalue'),edge(n2,n3,'weak','house'),edge(n3,n4,'strong','conjugate')]);
  const x=A.findAIC(s,{graph:g,maxEdges:5}).map(C.deductionStateKey);
  const y=A.findAIC(s,{graph:g,maxEdges:5}).map(C.deductionStateKey);
  assert.deepEqual(x,y);
});
