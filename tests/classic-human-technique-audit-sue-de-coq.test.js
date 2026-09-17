'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const D=require('../games/classic-human/sue-de-coq.js');

function m(ds){return ds.reduce((x,d)=>x|C.bitForDigit(d),0);}
function state(overrides){const s=new S.ClassicHumanState('.'.repeat(81));for(let i=0;i<81;i++)s.masks[i]=m([9]);for(const [r,c,ds] of overrides)s.masks[C.cellIndex(r,c)]=m(ds);return s;}
function key(d){return d.eliminations.map(x=>x.cell+':'+x.digit);}
function rowFixture(){return state([[0,0,[1,2,3]],[0,1,[2,3,4]],[0,4,[1,2]],[1,0,[3,4]],[0,5,[1,5]],[0,6,[2,6]],[1,1,[3,7]],[2,2,[4,8]]]);}
function rowHit(s){return D.findSueDeCoq(s).find(d=>d.explanationData.orientation==='row'&&d.explanationData.lineHouse==='r1'&&d.explanationData.boxHouse==='b1'&&d.explanationData.intersectionCells.length===2&&d.explanationData.lineCells.length===1&&d.explanationData.boxCells.length===1);}
function transposeOverrides(list){return list.map(([r,c,ds])=>[c,r,ds]);}
function candidates(mask){return C.digitsFromMask(mask);}
function assignmentExists(s,cells,forcedCell,forcedDigit){const assigned=new Map();function ok(cell,d){const [r,c]=C.rowCol(cell);for(const [other,od] of assigned){if(od!==d)continue;const [or,oc]=C.rowCol(other);if(or===r||oc===c||C.boxIndex(or,oc)===C.boxIndex(r,c))return false;}return true;}function rec(i){if(i===cells.length)return true;const cell=cells[i],ds=cell===forcedCell?[forcedDigit]:candidates(s.masks[cell]);for(const d of ds){if(!(s.masks[cell]&C.bitForDigit(d))||!ok(cell,d))continue;assigned.set(cell,d);if(rec(i+1))return true;assigned.delete(cell);}return false;}return rec(0);}

test('Sue de Coq row-box exact eliminations and immutable source',()=>{const s=rowFixture(),before=Array.from(s.masks),d=rowHit(s);assert.ok(d);assert.deepEqual(key(d),[C.cellIndex(0,5)+':1',C.cellIndex(0,6)+':2',C.cellIndex(1,1)+':3',C.cellIndex(2,2)+':4']);assert.deepEqual(Array.from(s.masks),before);assert.deepEqual(d.explanationData.lineDigits,[1,2]);assert.deepEqual(d.explanationData.boxDigits,[3,4]);});

test('Sue de Coq column-box transpose has transposed eliminations',()=>{const base=[[0,0,[1,2,3]],[0,1,[2,3,4]],[0,4,[1,2]],[1,0,[3,4]],[0,5,[1,5]],[0,6,[2,6]],[1,1,[3,7]],[2,2,[4,8]]],a=rowHit(state(base)),b=D.findSueDeCoq(state(transposeOverrides(base))).find(d=>d.explanationData.orientation==='column'&&d.explanationData.lineHouse==='c1'&&d.explanationData.boxHouse==='b1');assert.ok(a&&b);const tx=a.eliminations.map(x=>{const [r,c]=C.rowCol(x.cell);return C.cellIndex(c,r)+':'+x.digit;}).sort();assert.deepEqual(key(b).sort(),tx);});

test('Sue de Coq rejects intersection digit-count mismatch',()=>{const s=state([[0,0,[1,2,3,5]],[0,1,[2,3,4]],[0,4,[1,2]],[1,0,[3,4]],[0,5,[1,5]],[1,1,[3,7]]]);assert.equal(D.findSueDeCoq(s).some(d=>d.explanationData.lineHouse==='r1'&&d.explanationData.boxHouse==='b1'),false);});

test('Sue de Coq rejects overlapping line and box remainder digits',()=>{const s=state([[0,0,[1,2,3]],[0,1,[2,3,4]],[0,4,[1,2]],[1,0,[2,3]],[0,5,[1,5]],[1,1,[3,7]]]);assert.equal(D.findSueDeCoq(s).some(d=>d.explanationData.lineHouse==='r1'&&d.explanationData.boxHouse==='b1'),false);});

test('Sue de Coq rejects extra candidate escape from a remainder ALS',()=>{const s=state([[0,0,[1,2,3]],[0,1,[2,3,4]],[0,4,[1,2,5]],[1,0,[3,4]],[0,5,[1,6]],[1,1,[3,7]]]);assert.equal(D.findSueDeCoq(s).some(d=>d.explanationData.lineHouse==='r1'&&d.explanationData.boxHouse==='b1'),false);});

test('Sue de Coq supports bounded generalized three-cell intersection',()=>{const s=state([[0,0,[1,3]],[0,1,[2,4]],[0,2,[3,5]],[0,4,[1,2]],[1,0,[3,4]],[2,0,[4,5]],[0,5,[1,6]],[1,1,[3,7]],[2,1,[5,8]]]);const d=D.findSueDeCoq(s).find(x=>x.explanationData.orientation==='row'&&x.explanationData.intersectionCells.length===3&&x.explanationData.lineCells.length===1&&x.explanationData.boxCells.length===2);assert.ok(d);assert.ok(key(d).includes(C.cellIndex(0,5)+':1'));assert.ok(key(d).includes(C.cellIndex(1,1)+':3'));assert.ok(key(d).includes(C.cellIndex(2,1)+':5'));assert.equal(d.complexity.totalCells,6);});

test('Sue de Coq never eliminates from intersection or component cells',()=>{const d=rowHit(rowFixture());assert.ok(d);const blocked=new Set(d.anchors);assert.equal(d.eliminations.some(x=>blocked.has(x.cell)),false);});

test('Sue de Coq elimination agrees with direct assignment oracle',()=>{const s=rowFixture(),d=rowHit(s);assert.ok(d);const structure=d.anchors.slice();for(const e of d.eliminations){const cells=structure.concat([e.cell]);assert.equal(assignmentExists(s,cells,e.cell,e.digit),false,e.cell+':'+e.digit);}const target=C.cellIndex(0,5);assert.equal(assignmentExists(s,structure.concat([target]),target,5),true);});

test('Sue de Coq digit relabeling preserves geometry',()=>{const a=rowHit(rowFixture()),m2={1:5,2:6,3:7,4:8,5:1,6:2,7:3,8:4,9:9},base=[[0,0,[1,2,3]],[0,1,[2,3,4]],[0,4,[1,2]],[1,0,[3,4]],[0,5,[1,5]],[0,6,[2,6]],[1,1,[3,7]],[2,2,[4,8]]],s=state(base.map(([r,c,ds])=>[r,c,ds.map(d=>m2[d])])),b=D.findSueDeCoq(s).find(d=>d.explanationData.orientation==='row'&&d.explanationData.lineHouse==='r1'&&d.explanationData.boxHouse==='b1');assert.ok(a&&b);assert.deepEqual(a.eliminations.map(x=>x.cell),b.eliminations.map(x=>x.cell));});

test('Sue de Coq enumeration is deterministic',()=>{const s=rowFixture();assert.deepEqual(D.findSueDeCoq(s),D.findSueDeCoq(s));});

test('Sue de Coq enforces hard option budgets',()=>{const s=rowFixture();assert.throws(()=>D.findSueDeCoq(s,{maxIntersectionCells:4}),/2\.\.3/);assert.throws(()=>D.findSueDeCoq(s,{maxComponentCells:4}),/1\.\.3/);});
