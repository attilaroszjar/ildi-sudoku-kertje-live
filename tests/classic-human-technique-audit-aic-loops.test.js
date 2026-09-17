'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('../games/classic-human/index.js');
const AIC=require('../games/classic-human/aic.js');

function edge(a,b,type,reason){return Object.freeze({a,b,type,reason:reason||null});}
function graph(nodes,edges){
  const nodeMap={},adj={};
  for(const key of nodes){nodeMap[key]=Object.freeze({key});adj[key]=[];}
  for(const e of edges){adj[e.a].push(e);adj[e.b].push(e);}
  return Object.freeze({nodes:Object.freeze(nodeMap),keys:Object.freeze(nodes.slice().sort()),edges:Object.freeze(edges.slice()),adj});
}
function blankState(){return new H.ClassicHumanState('0'.repeat(81));}

function strongDiscontinuityGraph(){
  return graph(['0:1','0:2','1:2'],[
    edge('0:1','0:2','strong',{kind:'bivalue'}),
    edge('0:2','1:2','weak',{kind:'house'}),
    edge('1:2','0:1','strong',{kind:'conjugate'})
  ]);
}
function weakDiscontinuityGraph(){
  return graph(['0:1','1:1','1:2'],[
    edge('0:1','1:1','weak',{kind:'house'}),
    edge('1:1','1:2','strong',{kind:'bivalue'}),
    edge('1:2','0:1','weak',{kind:'house'})
  ]);
}
function evenLoopGraph(){
  return graph(['0:1','0:2','1:2','1:1'],[
    edge('0:1','0:2','strong',{kind:'bivalue'}),
    edge('0:2','1:2','weak',{kind:'house'}),
    edge('1:2','1:1','strong',{kind:'bivalue'}),
    edge('1:1','0:1','strong',{kind:'conjugate'})
  ]);
}

test('AIC strong-discontinuity nice loop yields a placement and applies safely',()=>{
  const g=strongDiscontinuityGraph();
  const loops=AIC.niceLoops(g,'0:1','strong',9);
  assert.ok(loops.some(x=>x.length===3&&x.discontinuity==='strong'));
  const s=blankState();
  const d=AIC.findAIC(s,{graph:g,maxEdges:9}).find(x=>x.explanationData.shape==='nice-loop'&&x.explanationData.discontinuity==='strong'&&x.placements.some(p=>p.cell===0&&p.digit===1));
  assert.ok(d);
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
  assert.equal(s.grid[0][0],1);
});

test('AIC weak-discontinuity nice loop yields an elimination and applies safely',()=>{
  const g=weakDiscontinuityGraph();
  const loops=AIC.niceLoops(g,'0:1','weak',9);
  assert.ok(loops.some(x=>x.length===3&&x.discontinuity==='weak'));
  const s=blankState();
  const d=AIC.findAIC(s,{graph:g,maxEdges:9}).find(x=>x.explanationData.shape==='nice-loop'&&x.explanationData.discontinuity==='weak'&&x.eliminations.some(e=>e.cell===0&&e.digit===1));
  assert.ok(d);
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
  assert.equal(Boolean(s.masks[0]&1),false);
});

test('AIC rejects even-cycle pseudo single-discontinuity loops',()=>{
  const g=evenLoopGraph();
  assert.equal(AIC.niceLoops(g,'0:1','strong',9).some(x=>x.length===4),false);
});

test('AIC nice-loop enumeration is deterministic and bounded',()=>{
  const g=strongDiscontinuityGraph();
  assert.deepEqual(AIC.niceLoops(g,'0:1','strong',9),AIC.niceLoops(g,'0:1','strong',9));
  assert.throws(()=>AIC.niceLoops(g,'0:1','strong',16),/3\.\.15/);
});
