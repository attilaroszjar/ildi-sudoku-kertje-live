'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const G=require('../games/classic-human/grouped-aic.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function keepDigitAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
  return state;
}

test('grouped node builder creates box-line candidate groups',()=>{
  const s=blankState();
  keepDigitAt(s,5,[cell(0,0),cell(0,1),cell(0,4),cell(3,4)]);
  const groups=G.groupedNodes(s).filter(x=>x.digit===5);
  assert.ok(groups.some(x=>x.houseType==='row'&&x.houseIndex===0&&x.boxIndex===0&&x.cells.join(',')===[cell(0,0),cell(0,1)].join(',')));
});

test('grouped graph creates a strong group conjugate when only one line candidate remains outside the group',()=>{
  const s=blankState();
  keepDigitAt(s,5,[cell(0,0),cell(0,1),cell(0,4)]);
  const graph=G.buildGraph(s);
  const group=Object.values(graph.nodes).find(x=>x.type==='group'&&x.digit===5&&x.houseType==='row'&&x.houseIndex===0&&x.boxIndex===0);
  assert.ok(group);
  const target='s:5:'+cell(0,4);
  assert.ok((graph.adj[group.key]||[]).some(e=>e.type==='strong'&&(e.a===target||e.b===target)));
});

test('grouped alternating path search is bounded and deterministic',()=>{
  const graph={nodes:{g:{key:'g',type:'group',digit:1,cells:[0,1]},a:{key:'a',type:'single',digit:1,cells:[2]},b:{key:'b',type:'single',digit:1,cells:[3]},c:{key:'c',type:'single',digit:1,cells:[4]}},adj:{g:[],a:[],b:[],c:[]}};
  function edge(a,b,type){const e={a,b,type};graph.adj[a].push(e);graph.adj[b].push(e);}
  edge('g','a','strong');edge('a','b','weak');edge('b','c','strong');
  const a=G.boundedPaths(graph,'g',3);
  const b=G.boundedPaths(graph,'g',3);
  assert.equal(a.length,1);
  assert.equal(a[0].end,'c');
  assert.deepEqual(a,b);
  assert.throws(()=>G.boundedPaths(graph,'g',13),/1..12|3..12/);
});

test('grouped AIC eliminates a candidate seeing both endpoint groups',()=>{
  const s=blankState();
  // Controlled graph: grouped endpoint {r1c1,r1c2} -> single -> single -> grouped endpoint {r3c1,r3c2}.
  // Target r2c1 sees every cell in both endpoint groups through column/box geometry.
  keepDigitAt(s,5,[cell(0,0),cell(0,1),cell(1,0),cell(2,0),cell(2,1)]);
  const graph={nodes:{
    g1:{key:'g1',type:'group',digit:5,cells:[cell(0,0),cell(0,1)]},
    a:{key:'a',type:'single',digit:5,cells:[cell(0,4)]},
    b:{key:'b',type:'single',digit:5,cells:[cell(3,4)]},
    g2:{key:'g2',type:'group',digit:5,cells:[cell(2,0),cell(2,1)]}
  },adj:{g1:[],a:[],b:[],g2:[]}};
  function edge(a,b,type){const e={a,b,type};graph.adj[a].push(e);graph.adj[b].push(e);}
  edge('g1','a','strong');edge('a','b','weak');edge('b','g2','strong');
  const d=G.findGroupedAic(s,{graph,maxEdges:3}).find(x=>x.eliminations.some(e=>e.cell===cell(1,0)&&e.digit===5));
  assert.ok(d);
  assert.equal(d.techniqueId,'grouped-aic');
  assert.equal(d.complexity.groupNodes,2);
});

test('grouped AIC emits no deduction without a common endpoint peer',()=>{
  const s=blankState();
  keepDigitAt(s,5,[cell(0,0),cell(0,1),cell(8,7),cell(8,8)]);
  const graph={nodes:{g1:{key:'g1',type:'group',digit:5,cells:[cell(0,0),cell(0,1)]},a:{key:'a',type:'single',digit:5,cells:[cell(4,4)]},b:{key:'b',type:'single',digit:5,cells:[cell(5,5)]},g2:{key:'g2',type:'group',digit:5,cells:[cell(8,7),cell(8,8)]}},adj:{g1:[],a:[],b:[],g2:[]}};
  function edge(a,b,type){const e={a,b,type};graph.adj[a].push(e);graph.adj[b].push(e);}
  edge('g1','a','strong');edge('a','b','weak');edge('b','g2','strong');
  assert.equal(G.findGroupedAic(s,{graph,maxEdges:3}).length,0);
});
