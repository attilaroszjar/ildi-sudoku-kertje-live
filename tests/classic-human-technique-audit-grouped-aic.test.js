'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const G=require('../games/classic-human/grouped-aic.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function edge(a,b,type,reason){return {a,b,type,reason:reason||null};}
function syntheticGraph(){
  const nodes={
    'g:1:0.1':{key:'g:1:0.1',type:'group',digit:1,cells:[0,1]},
    's:1:9':{key:'s:1:9',type:'single',digit:1,cells:[9],cell:9},
    's:1:10':{key:'s:1:10',type:'single',digit:1,cells:[10],cell:10},
    's:1:2':{key:'s:1:2',type:'single',digit:1,cells:[2],cell:2}
  };
  const edges=[
    edge('g:1:0.1','s:1:9','strong',{kind:'group-conjugate'}),
    edge('s:1:9','s:1:10','weak',{kind:'house'}),
    edge('s:1:10','s:1:2','strong',{kind:'group-conjugate'})
  ];
  const adj={};for(const k of Object.keys(nodes))adj[k]=[];
  for(const e of edges){adj[e.a].push(e);adj[e.b].push(e);}
  return {nodes,edges,adj};
}

test('Grouped AIC constructs row/box grouped nodes and a valid group-conjugate edge',()=>{
  const s=blankState(),bit=C.bitForDigit(1);
  for(const cell of [2,9,10,11,18,19,20])s.restrictMask(cell,s.masks[cell]&~bit);
  for(let cell=4;cell<9;cell++)s.restrictMask(cell,s.masks[cell]&~bit);
  const groups=G.groupedNodes(s);
  const g=groups.find(x=>x.digit===1&&x.cells.join(',')==='0,1'&&x.houseType==='row');
  assert.ok(g);
  const graph=G.buildGraph(s);
  const strong=(graph.adj[g.key]||[]).filter(e=>e.type==='strong');
  assert.ok(strong.some(e=>[e.a,e.b].includes('s:1:3')));
});

test('Grouped AIC bounded paths alternate strong/weak/strong and are deterministic',()=>{
  const g=syntheticGraph();
  const a=G.boundedPaths(g,'g:1:0.1',7);
  const b=G.boundedPaths(g,'g:1:0.1',7);
  assert.deepEqual(a,b);
  assert.ok(a.some(p=>p.end==='s:1:2'&&p.length===3&&p.edges.map(e=>e.type).join(',')==='strong,weak,strong'));
});

test('Grouped AIC rejects broken alternation and enforces bounded search contract',()=>{
  const g=syntheticGraph();
  g.edges[1].type='strong';
  g.adj['s:1:9'][1].type='strong';
  assert.equal(G.boundedPaths(g,'g:1:0.1',7).some(p=>p.end==='s:1:2'),false);
  assert.throws(()=>G.boundedPaths(syntheticGraph(),'g:1:0.1',2),/3\.\.12/);
  assert.throws(()=>G.boundedPaths(syntheticGraph(),'g:1:0.1',13),/3\.\.12/);
});

test('Grouped AIC endpoint elimination requires target to see every cell of both endpoints',()=>{
  const s=blankState(),g=syntheticGraph();
  const d=G.findGroupedAic(s,{graph:g,maxEdges:7}).find(x=>x.explanationData.path[0]==='g:1:0.1'&&x.explanationData.path.at(-1)==='s:1:2');
  assert.ok(d);
  assert.ok(d.eliminations.some(e=>e.cell===3&&e.digit===1));
  assert.ok(d.eliminations.every(e=>e.digit===1));
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('Grouped AIC finder is deterministic with identical explicit graph input',()=>{
  const a=G.findGroupedAic(blankState(),{graph:syntheticGraph(),maxEdges:7}).map(C.deductionStateKey);
  const b=G.findGroupedAic(blankState(),{graph:syntheticGraph(),maxEdges:7}).map(C.deductionStateKey);
  assert.deepEqual(a,b);
});
