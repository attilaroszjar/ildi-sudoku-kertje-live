'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');
const L=require('../games/classic-human/links.js');

function mask(ds){return ds.reduce((m,d)=>m|C.bitForDigit(d),0);}
function blank(){const s=new S.ClassicHumanState('.'.repeat(81));for(let i=0;i<81;i++)s.masks[i]=mask([9]);return s;}
function set(s,cell,ds){s.masks[cell]=mask(ds);}
function rc(r,c){return C.cellIndex(r,c);}
function seesAll(cell,cells){return cells.every(x=>L.sees(cell,x));}
function digitCells(s,cells,digit){const bit=C.bitForDigit(digit);return cells.filter(x=>s.masks[x]&bit);}
function unionDigits(s,cells){let m=0;for(const c of cells)m|=s.masks[c];return C.digitsFromMask(m);}
function orderedPairRejected(s,a,b,p,q,alsList){
  if(L.sees(a,b)&&p===q)return true;
  if(p===q)return false;
  for(const als of alsList){
    const digits=unionDigits(s,als);
    if(!digits.includes(p)||!digits.includes(q))continue;
    const pc=digitCells(s,als,p),qc=digitCells(s,als,q);
    if(pc.length&&qc.length&&seesAll(a,pc)&&seesAll(b,qc))return true;
    if(pc.length&&qc.length&&seesAll(a,qc)&&seesAll(b,pc))return true;
  }
  return false;
}
function apeOracle(s,base,alsList){
  const [a,b]=base,ad=C.digitsFromMask(s.masks[a]),bd=C.digitsFromMask(s.masks[b]),survivors=[];
  for(const p of ad)for(const q of bd)if(!orderedPairRejected(s,a,b,p,q,alsList))survivors.push([p,q]);
  const elims=[];
  for(const p of ad)if(!survivors.some(x=>x[0]===p))elims.push({cell:a,digit:p});
  for(const q of bd)if(!survivors.some(x=>x[1]===q))elims.push({cell:b,digit:q});
  return {survivors,eliminations:elims};
}
function key(x){return x.cell+':'+x.digit;}
const STACK=['xy-wing','xyz-wing','w-wing','aic','grouped-aic','als-xz','als-xy-wing','als-chain','sue-de-coq'];
const FINDER_OPTIONS={
  'xy-wing':{},'xyz-wing':{},'w-wing':{},
  'aic':{maxDepth:8,maxNodes:1200,maxFindings:64},
  'grouped-aic':{maxDepth:8,maxNodes:1200,maxFindings:64},
  'als-xz':{maxCells:4},
  'als-xy-wing':{maxCells:4,maxFindings:64},
  'als-chain':{maxAls:6,maxDepth:6,maxChains:256,maxFindings:64},
  'sue-de-coq':{maxIntersectionCells:3,maxRemainderCells:3,maxFindings:64}
};
function existingEliminations(s){
  const out=new Map();
  for(const id of STACK){
    const entry=H.FINDERS.find(x=>x.id===id);assert.ok(entry,id);
    const ds=entry.fn(s,FINDER_OPTIONS[id]);
    for(const d of ds)for(const e of d.eliminations){const k=key(e);if(!out.has(k))out.set(k,new Set());out.get(k).add(id);}
  }
  return out;
}
function build(cfg){const s=blank();for(const [cell,ds] of cfg.cells)set(s,cell,ds);return s;}
const CORPUS=[
  {
    id:'ape-bivalue-blockers',source:'SudokuWiki APE Example 1 archetype',
    base:[rc(6,1),rc(6,2)],
    cells:[[rc(6,1),[2,4]],[rc(6,2),[2,5,8]],[rc(6,8),[2,8]],[rc(7,0),[4,8]]],
    als:[[rc(6,8)],[rc(7,0)]],expected:[rc(6,2)+':8']
  },
  {
    id:'ape-two-cell-als',source:'SudokuWiki APE Example 2 archetype',
    base:[rc(2,1),rc(2,2)],
    cells:[[rc(2,1),[1,3,8]],[rc(2,2),[3,4,9]],[rc(0,0),[1,3]],[rc(1,2),[1,7]],[rc(2,0),[1,4,9]],[rc(2,4),[1,4,9]],[rc(2,8),[3,8]]],
    als:[[rc(0,0),rc(1,2)],[rc(2,0),rc(2,4)],[rc(2,8)]],expected:[rc(2,1)+':1',rc(2,2)+':3']
  },
  {
    id:'ape-nonaligned-mixed-als',source:'SudokuWiki APE Example 5 archetype',
    base:[rc(1,0),rc(2,6)],
    cells:[[rc(1,0),[1,2,7]],[rc(2,6),[4,5,7]],[rc(1,8),[1,4]],[rc(1,7),[1,5]],[rc(2,0),[1,7]],[rc(2,2),[1,7]]],
    als:[[rc(1,8)],[rc(1,7)],[rc(2,0),rc(2,2)]],expected:[rc(1,0)+':1']
  }
];

test('H5 APE corpus oracle reproduces documented exclusion archetypes',()=>{
  for(const f of CORPUS){const s=build(f),o=apeOracle(s,f.base,f.als);assert.deepEqual(o.eliminations.map(key).sort(),f.expected.slice().sort(),f.id);}
});

test('H5 differential probe reports whether current wings AIC ALS stack covers APE deductions',()=>{
  const report=[];
  for(const f of CORPUS){const s=build(f),o=apeOracle(s,f.base,f.als),existing=existingEliminations(s);const rows=o.eliminations.map(e=>({elimination:key(e),coveredBy:[...(existing.get(key(e))||[])].sort()}));report.push({id:f.id,source:f.source,rows,fullyCovered:rows.every(x=>x.coveredBy.length>0)});}
  console.log('H5_APE_DIFFERENTIAL '+JSON.stringify(report));
  assert.equal(report.length,CORPUS.length);
});
